import express, { type Express } from 'express';
import { rateLimit } from 'express-rate-limit';
import type { AppConfig } from '../config';
import type { Logger } from '../ports/logger';
import type { ApplicationController } from './application-controller';
import type { JobController } from './job-controller';
import type { AtsController } from './ats-controller';
import type { SavedSearchController } from './saved-search-controller';
import type { LlmController } from './llm-controller';
import type { MandateController } from './mandate-controller';
import type { TalentController } from './talent-controller';
import type { PlacementController } from './placement-controller';
import type { CandidacyController } from './candidacy-controller';
import type { RetentionController } from './retention-controller';
import type { DocumentController } from './document-controller';
import type { AttachmentController } from './attachment-controller';
import type { AuthController } from './auth-controller';
import type { MembersController } from './members-controller';
import type { AccountController } from './account-controller';
import type { PasswordResetController } from './password-reset-controller';
import { asyncHandler } from './async-handler';
import { errorHandler, notFound } from './problem';
import { corsMiddleware, securityHeaders, recruitingCsp, RECRUITING_KIT_PREFIX } from './security';

export interface AppDeps {
  applicationController: ApplicationController;
  jobController: JobController;
  atsController: AtsController;
  savedSearchController: SavedSearchController;
  llmController: LlmController;
  mandateController: MandateController;
  talentController: TalentController;
  placementController: PlacementController;
  candidacyController: CandidacyController;
  retentionController: RetentionController;
  documentController: DocumentController;
  attachmentController: AttachmentController;
  authController: AuthController;
  membersController: MembersController;
  accountController: AccountController;
  passwordResetController: PasswordResetController;
  config: AppConfig;
  logger: Logger;
}

/** Builds the Express application (no port binding — supertest can drive it directly). */
export function createApp(deps: AppDeps): Express {
  const {
    applicationController: c,
    jobController: j,
    atsController: ats,
    savedSearchController: s,
    llmController: llm,
    mandateController: m,
    talentController: t,
    placementController: p,
    candidacyController: cand,
    retentionController: retention,
    documentController: docs,
    attachmentController: att,
    authController: auth,
    membersController: members,
    accountController: account,
    passwordResetController: passwordReset,
  } = deps;
  const app = express();

  app.use(securityHeaders);
  app.use(corsMiddleware(deps.config.security.corsOrigins));
  app.use(express.json({ limit: '80mb' }));

  const api = express.Router();
  api.get('/health', (_req, res) => res.json({ status: 'ok' }));

  // Throttle the credential endpoints against brute-force / account-creation abuse.
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    standardHeaders: true,
    legacyHeaders: false,
    validate: false,
  });
  api.post('/auth/register', authLimiter, asyncHandler(auth.register));
  api.post('/auth/login', authLimiter, asyncHandler(auth.login));
  // Password reset: request a link, then set a new password with the token.
  // Rate-limited like the other credential endpoints.
  api.post('/auth/password-reset/request', authLimiter, asyncHandler(passwordReset.request));
  api.post('/auth/password-reset/confirm', authLimiter, asyncHandler(passwordReset.confirm));
  api.post('/auth/logout', asyncHandler(auth.logout));
  api.get('/auth/me', asyncHandler(auth.me));
  api.get('/auth/providers', asyncHandler(auth.providersInfo));
  api.get('/applications', asyncHandler(c.list));
  api.post('/applications', asyncHandler(c.create));
  api.post('/applications/build', asyncHandler(c.build));
  api.patch('/applications/:id', asyncHandler(c.update));
  api.get('/history', asyncHandler(c.history));
  api.get('/jobs', asyncHandler(j.search));
  api.post('/ats', asyncHandler(ats.analyze));
  api.get('/searches', asyncHandler(s.list));
  api.post('/searches', asyncHandler(s.create));
  api.delete('/searches/:id', asyncHandler(s.remove));
  api.get('/searches/:id/run', asyncHandler(s.run));
  // Recruiting endpoints are owner-scoped: every request must carry a valid
  // session, and the resolved user id scopes the data it can see and mutate.
  const requireAuth = asyncHandler(auth.requireAuth);
  api.get('/mandates', requireAuth, asyncHandler(m.list));
  api.post('/mandates', requireAuth, asyncHandler(m.create));
  api.patch('/mandates/:id', requireAuth, asyncHandler(m.update));
  api.delete('/mandates/:id', requireAuth, asyncHandler(m.remove));
  api.get('/talents', requireAuth, asyncHandler(t.list));
  api.post('/talents', requireAuth, asyncHandler(t.create));
  api.patch('/talents/:id', requireAuth, asyncHandler(t.update));
  api.delete('/talents/:id', requireAuth, asyncHandler(t.remove));
  // Recruiting pipeline: talents in a mandate's stages (owner-scoped).
  api.get('/mandates/:id/candidacies', requireAuth, asyncHandler(cand.board));
  api.post('/mandates/:id/candidacies', requireAuth, asyncHandler(cand.add));
  api.get('/talents/:id/candidacies', requireAuth, asyncHandler(cand.forTalent));
  api.patch('/candidacies/:id', requireAuth, asyncHandler(cand.update));
  api.delete('/candidacies/:id', requireAuth, asyncHandler(cand.remove));
  // DSGVO retention (admin-only, enforced in the controller via Authorizer).
  api.get('/retention/report', requireAuth, asyncHandler(retention.report));
  api.post('/talents/:id/anonymize', requireAuth, asyncHandler(retention.anonymize));
  // A talent's resume + cover-letter documents (owner-scoped).
  api.get('/talents/:id/documents', requireAuth, asyncHandler(docs.get));
  api.put('/talents/:id/documents', requireAuth, asyncHandler(docs.save));
  api.get('/talents/:id/documents/pdf', requireAuth, asyncHandler(docs.pdf));
  api.post('/talents/:id/documents/ai', requireAuth, asyncHandler(docs.aiSuggest));
  api.post('/talents/:id/documents/parse', requireAuth, asyncHandler(docs.parse));
  api.post('/talents/:id/documents/parse-pdf', requireAuth, asyncHandler(docs.parsePdf));
  api.post('/talents/:id/documents/ats', requireAuth, asyncHandler(docs.ats));
  api.post('/talents/:id/documents/pitch', requireAuth, asyncHandler(docs.pitch));
  api.post('/talents/:id/documents/outreach', requireAuth, asyncHandler(docs.outreach));
  api.get('/talents/:id/dossier/pdf', requireAuth, asyncHandler(docs.dossier));
  // Talent attachments (files uploaded base64; owner-scoped).
  api.get('/talents/:id/attachments', requireAuth, asyncHandler(att.list));
  api.post('/talents/:id/attachments', requireAuth, asyncHandler(att.upload));
  api.get('/attachments/:id', requireAuth, asyncHandler(att.download));
  api.delete('/attachments/:id', requireAuth, asyncHandler(att.remove));
  api.get('/placements', requireAuth, asyncHandler(p.list));
  api.post('/placements', requireAuth, asyncHandler(p.create));
  api.patch('/placements/:id', requireAuth, asyncHandler(p.update));
  api.delete('/placements/:id', requireAuth, asyncHandler(p.remove));
  // DSGVO: export everything the recruiter owns, or erase the account entirely.
  // Team members (admin-only mutations enforced in the controller via Authorizer).
  api.get('/members', requireAuth, asyncHandler(members.list));
  api.patch('/members/:id/roles', requireAuth, asyncHandler(members.setRoles));
  api.get('/account/export', requireAuth, asyncHandler(account.export));
  api.delete('/account', requireAuth, asyncHandler(account.remove));
  api.get('/settings/llm', asyncHandler(llm.settings));
  api.put('/settings/llm', asyncHandler(llm.setProvider));
  // Per-user API keys are owner-scoped (encrypted server-side).
  api.get('/settings/keys', requireAuth, asyncHandler(llm.keysStatus));
  api.put('/settings/keys/:provider', requireAuth, asyncHandler(llm.setKey));
  api.delete('/settings/keys/:provider', requireAuth, asyncHandler(llm.removeKey));
  // Open route, but a signed-in user's own key is used when present.
  api.post('/cover-letter', asyncHandler(auth.attachUser), asyncHandler(llm.generateCoverLetter));
  api.use((_req, res) => notFound(res));

  app.use('/api/v1', api);

  // The app opens directly on the recruiting Workspace — there is no launcher.
  app.get('/', (_req, res) => res.redirect(302, `${RECRUITING_KIT_PREFIX}/index.html`));

  // Static web UIs (the recruiting Workspace + the CV / cover-letter print
  // templates behind PDF export). Served after the API routes. The Vite-built
  // recruiting kit gets a strict CSP; the CDN-loading print templates are left
  // untouched (a global CSP would break them).
  app.use(RECRUITING_KIT_PREFIX, recruitingCsp);
  app.use(express.static(deps.config.staticDir, { index: false }));

  app.use(errorHandler(deps.logger));
  return app;
}
