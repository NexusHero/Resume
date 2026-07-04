import express, { type Express } from 'express';
import { rateLimit } from 'express-rate-limit';
import type { AppConfig } from '../config.js';
import type { Logger } from '../ports/logger.js';
import type { ApplicationController } from './application-controller.js';
import type { JobController } from './job-controller.js';
import type { AtsController } from './ats-controller.js';
import type { SavedSearchController } from './saved-search-controller.js';
import type { LlmController } from './llm-controller.js';
import type { MandateController } from './mandate-controller.js';
import type { TalentController } from './talent-controller.js';
import type { PlacementController } from './placement-controller.js';
import type { CandidacyController } from './candidacy-controller.js';
import type { RetentionController } from './retention-controller.js';
import type { MatchController } from './match-controller.js';
import type { MatchAiController } from './match-ai-controller.js';
import type { UsageController } from './usage-controller.js';
import type { ComplianceController } from './compliance-controller.js';
import type { ForecastController } from './forecast-controller.js';
import type { ObservationController } from './observation-controller.js';
import type { DocumentController } from './document-controller.js';
import type { AttachmentController } from './attachment-controller.js';
import type { AuthController } from './auth-controller.js';
import type { MembersController } from './members-controller.js';
import type { InviteController } from './invite-controller.js';
import type { TenantAdminController } from './tenant-admin-controller.js';
import type { AccountController } from './account-controller.js';
import type { PasswordResetController } from './password-reset-controller.js';
import { asyncHandler } from './async-handler.js';
import { makeRequirePlan } from './require-plan.js';
import { makeRequireCan } from './require-can.js';
import type { PlanProvider } from '../ports/plan-provider.js';
import type { Authorizer } from '../ports/authorizer.js';
import { errorHandler, notFound, sendProblem } from './problem.js';
import {
  corsMiddleware,
  securityHeaders,
  recruitingCsp,
  RECRUITING_KIT_PREFIX,
} from './security.js';
import { registerApiDocs } from './api-docs.js';
import type { AssistantController } from './assistant-controller.js';
import type { ArtifactController } from './artifact-controller.js';
import type { MailController } from './mail-controller.js';

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
  matchController: MatchController;
  matchAiController: MatchAiController;
  usageController: UsageController;
  complianceController: ComplianceController;
  forecastController: ForecastController;
  observationController: ObservationController;
  assistantController: AssistantController;
  artifactController: ArtifactController;
  mailController: MailController;
  documentController: DocumentController;
  attachmentController: AttachmentController;
  authController: AuthController;
  membersController: MembersController;
  inviteController: InviteController;
  tenantAdminController: TenantAdminController;
  accountController: AccountController;
  passwordResetController: PasswordResetController;
  planProvider: PlanProvider;
  authorizer: Authorizer;
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
    matchController: match,
    matchAiController: matchAi,
    usageController: usage,
    complianceController: compliance,
    forecastController: forecast,
    observationController: observations,
    assistantController: assistant,
    artifactController: artifacts,
    mailController: mail,
    documentController: docs,
    attachmentController: att,
    authController: auth,
    membersController: members,
    inviteController: invites,
    tenantAdminController: tenantAdmin,
    accountController: account,
    passwordResetController: passwordReset,
    authorizer,
  } = deps;
  const app = express();

  app.use(securityHeaders);
  app.use(corsMiddleware(deps.config.security.corsOrigins));
  app.use(express.json({ limit: '80mb' }));

  const api = express.Router();
  api.get('/health', (_req, res) => res.json({ status: 'ok' }));
  // API reference: the OpenAPI contract + a self-hosted Swagger UI (no CDN).
  registerApiDocs(api, deps.config.rootDir);

  // Throttle the credential endpoints against brute-force / account-creation abuse.
  // The handler sends problem+json so the login form can show the real reason
  // ("too many attempts") instead of a generic "Login failed".
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    standardHeaders: true,
    legacyHeaders: false,
    validate: false,
    handler: (_req, res) =>
      sendProblem(res, {
        type: 'about:blank',
        title: 'Too Many Requests',
        status: 429,
        detail: 'Too many attempts. Please wait a few minutes and try again.',
      }),
  });
  api.post('/auth/register', authLimiter, asyncHandler(auth.register));
  api.post('/auth/login', authLimiter, asyncHandler(auth.login));
  // Accept a tenant invitation: the token IS the credential, so it's open but
  // throttled like the other auth routes (ADR-0035).
  api.post('/auth/accept-invite', authLimiter, asyncHandler(invites.accept));
  // Password reset: request a link, then set a new password with the token.
  // Rate-limited like the other credential endpoints.
  api.post('/auth/password-reset/request', authLimiter, asyncHandler(passwordReset.request));
  api.post('/auth/password-reset/confirm', authLimiter, asyncHandler(passwordReset.confirm));
  // Soft email verification: resend for the signed-in user; confirm is open
  // (the token IS the credential) but throttled like the other auth routes.
  api.post('/auth/verify-email/request', asyncHandler(auth.requestVerification));
  api.post('/auth/verify-email/confirm', authLimiter, asyncHandler(auth.confirmVerification));
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
  // Recruiting endpoints require a valid session; the data behind them is
  // team-scoped (currentScope) — every member works on the shared team pool.
  const requireAuth = asyncHandler(auth.requireAuth);
  // The single Pro-gate seam (ADR-0021): every generative/AI route below is
  // marked with requirePlan('pro'); no feature branches on the plan itself.
  const requirePlan = makeRequirePlan(deps.planProvider);
  const requirePro = requirePlan('pro');
  // The single RBAC seam (like requireAuth/requirePlan): admin-only routes are
  // declared here, not re-checked inside each controller.
  const requireCan = makeRequireCan(authorizer);
  api.get('/mandates', requireAuth, asyncHandler(m.list));
  api.post('/mandates', requireAuth, asyncHandler(m.create));
  api.patch('/mandates/:id', requireAuth, asyncHandler(m.update));
  api.delete('/mandates/:id', requireAuth, asyncHandler(m.remove));
  api.get('/talents', requireAuth, asyncHandler(t.list));
  api.post('/talents', requireAuth, asyncHandler(t.create));
  api.post('/talents/import', requireAuth, requirePro, asyncHandler(t.importPdfs));
  api.patch('/talents/:id', requireAuth, asyncHandler(t.update));
  api.delete('/talents/:id', requireAuth, asyncHandler(t.remove));
  // Recruiting pipeline: talents in a mandate's stages (team-scoped).
  api.post('/mandates/:id/match', requireAuth, asyncHandler(match.match));
  // AI on top of matching (Pro): explain a candidate's fit for the mandate.
  api.post(
    '/mandates/:id/candidates/:talentId/explain',
    requireAuth,
    requirePro,
    asyncHandler(matchAi.explain),
  );
  api.post(
    '/mandates/:id/candidates/:talentId/interview-kit',
    requireAuth,
    requirePro,
    asyncHandler(matchAi.interviewKit),
  );
  api.post(
    '/mandates/:id/candidates/:talentId/prep',
    requireAuth,
    requirePro,
    asyncHandler(matchAi.prep),
  );
  // Observation flywheel: record & read real interview experiences per company.
  api.get('/mandates/:id/observations', requireAuth, asyncHandler(observations.forMandate));
  api.post('/mandates/:id/observations', requireAuth, asyncHandler(observations.record));
  api.get('/mandates/:id/candidacies', requireAuth, asyncHandler(cand.board));
  api.post('/mandates/:id/candidacies', requireAuth, asyncHandler(cand.add));
  api.get('/talents/:id/candidacies', requireAuth, asyncHandler(cand.forTalent));
  api.patch('/candidacies/:id', requireAuth, asyncHandler(cand.update));
  api.delete('/candidacies/:id', requireAuth, asyncHandler(cand.remove));
  // DSGVO retention (admin-only, enforced at the route via requireCan).
  api.get(
    '/retention/report',
    requireAuth,
    requireCan('retention', 'read'),
    asyncHandler(retention.report),
  );
  api.get(
    '/retention/policy',
    requireAuth,
    requireCan('retention', 'read'),
    asyncHandler(retention.getPolicy),
  );
  api.put(
    '/retention/policy',
    requireAuth,
    requireCan('retention', 'anonymize'),
    asyncHandler(retention.updatePolicy),
  );
  api.post(
    '/retention/anonymize-overdue',
    requireAuth,
    requireCan('retention', 'anonymize'),
    asyncHandler(retention.anonymizeOverdue),
  );
  api.post(
    '/talents/:id/anonymize',
    requireAuth,
    requireCan('retention', 'anonymize'),
    asyncHandler(retention.anonymize),
  );
  // A talent's resume + cover-letter documents (team-scoped).
  api.get('/talents/:id/documents', requireAuth, asyncHandler(docs.get));
  api.put('/talents/:id/documents', requireAuth, asyncHandler(docs.save));
  api.get('/talents/:id/documents/pdf', requireAuth, asyncHandler(docs.pdf));
  // Generative document AI (Pro).
  api.post('/talents/:id/documents/ai', requireAuth, requirePro, asyncHandler(docs.aiSuggest));
  api.post('/talents/:id/documents/parse', requireAuth, requirePro, asyncHandler(docs.parse));
  api.post(
    '/talents/:id/documents/parse-pdf',
    requireAuth,
    requirePro,
    asyncHandler(docs.parsePdf),
  );
  api.post('/talents/:id/documents/ats', requireAuth, requirePro, asyncHandler(docs.ats));
  api.post('/talents/:id/documents/pitch', requireAuth, requirePro, asyncHandler(docs.pitch));
  api.post('/talents/:id/documents/outreach', requireAuth, requirePro, asyncHandler(docs.outreach));
  api.post(
    '/talents/:id/documents/translate',
    requireAuth,
    requirePro,
    asyncHandler(docs.translate),
  );
  api.get('/talents/:id/dossier/pdf', requireAuth, asyncHandler(docs.dossier));
  // Talent attachments (files uploaded base64; team-scoped).
  api.get('/talents/:id/attachments', requireAuth, asyncHandler(att.list));
  api.post('/talents/:id/attachments', requireAuth, asyncHandler(att.upload));
  api.get('/attachments/:id', requireAuth, asyncHandler(att.download));
  api.delete('/attachments/:id', requireAuth, asyncHandler(att.remove));
  api.get('/placements', requireAuth, asyncHandler(p.list));
  api.post('/placements', requireAuth, asyncHandler(p.create));
  api.patch('/placements/:id', requireAuth, asyncHandler(p.update));
  api.delete('/placements/:id', requireAuth, asyncHandler(p.remove));
  // DSGVO: export everything the recruiter owns, or erase the account entirely.
  // Team members (admin-only, enforced at the route via requireCan).
  api.get('/members', requireAuth, requireCan('member', 'list'), asyncHandler(members.list));
  api.patch(
    '/members/:id/roles',
    requireAuth,
    requireCan('member', 'setRoles'),
    asyncHandler(members.setRoles),
  );
  // Tenant invitations (admin-only; ADR-0035): create + list pending for the tenant.
  api.post(
    '/members/invites',
    requireAuth,
    requireCan('member', 'invite'),
    asyncHandler(invites.create),
  );
  api.get(
    '/members/invites',
    requireAuth,
    requireCan('member', 'listInvites'),
    asyncHandler(invites.list),
  );
  // Super-admin console (ADR-0037): cross-tenant, gated in the controller on the
  // instance-level super-admin capability (a tenant admin has no access).
  api.get('/admin/tenants', requireAuth, asyncHandler(tenantAdmin.listTenants));
  api.patch('/admin/tenants/:id', requireAuth, asyncHandler(tenantAdmin.setStatus));
  api.get('/admin/tenants/:id/members', requireAuth, asyncHandler(tenantAdmin.listMembers));
  api.patch(
    '/admin/tenants/:id/members/:userId/roles',
    requireAuth,
    asyncHandler(tenantAdmin.setMemberRoles),
  );
  api.get('/account/export', requireAuth, asyncHandler(account.export));
  api.delete('/account', requireAuth, asyncHandler(account.remove));
  // Per-user AI usage (requests, tokens, rough cost) for the settings card.
  api.get('/settings/usage', requireAuth, asyncHandler(usage.summary));
  // KI-Audit-Trail: the caller's per-call AI processing record (JSON + CSV export).
  api.get('/settings/usage/audit', requireAuth, asyncHandler(usage.audit));
  api.get('/settings/usage/audit.csv', requireAuth, asyncHandler(usage.auditCsv));
  // AGG (anti-discrimination) language check + neutral rewrite for job ads / outreach.
  api.post('/compliance/agg-check', requireAuth, asyncHandler(compliance.aggCheck));
  // The neutral rewrite is LLM-generated (Pro); the check itself is deterministic (Free).
  api.post('/compliance/agg-rewrite', requireAuth, requirePro, asyncHandler(compliance.aggRewrite));
  // Weighted pipeline revenue forecast across the team's live mandates.
  api.get('/forecast', requireAuth, asyncHandler(forecast.get));
  // The assistant: the deterministic suggest/act modes are Free; only switching
  // to the token-spending autopilot gear (and its generated dossier) is Pro.
  api.get('/assistant', requireAuth, asyncHandler(assistant.overview));
  api.put(
    '/assistant',
    requireAuth,
    requirePlan('pro', (req) => (req.body as { mode?: string } | undefined)?.mode === 'autopilot'),
    asyncHandler(assistant.updateSettings),
  );
  api.post('/assistant/run', requireAuth, asyncHandler(assistant.run));
  api.get('/assistant/suggestions', requireAuth, asyncHandler(assistant.list));
  api.post('/assistant/suggestions/:id/accept', requireAuth, asyncHandler(assistant.accept));
  api.post('/assistant/suggestions/:id/dismiss', requireAuth, asyncHandler(assistant.dismiss));
  // The staged application's Bewerbungsmappe (tailored CV + cover letter + Zeugnisse).
  api.get(
    '/assistant/suggestions/:id/dossier.pdf',
    requireAuth,
    requirePro,
    asyncHandler(assistant.applicationDossier),
  );
  // The outcome loop: generated artifacts and what became of them.
  api.get('/artifacts', requireAuth, asyncHandler(artifacts.list));
  api.get('/artifacts/stats', requireAuth, asyncHandler(artifacts.stats));
  api.post('/artifacts/:id/outcome', requireAuth, asyncHandler(artifacts.setOutcome));
  // Email integration: send drafted outreach + reply detection for the loop.
  api.post('/talents/:id/outreach/send', requireAuth, asyncHandler(mail.sendOutreach));
  api.post('/mail/sync-replies', requireAuth, asyncHandler(mail.syncReplies));
  api.get('/mail/status', requireAuth, asyncHandler(mail.status));
  // The provider choice is per user (persisted); signed-out callers see the default.
  api.get('/settings/llm', asyncHandler(auth.attachUser), asyncHandler(llm.settings));
  api.put('/settings/llm', requireAuth, asyncHandler(llm.setProvider));
  // API keys are per-user, not team-shared (encrypted server-side).
  api.get('/settings/keys', requireAuth, asyncHandler(llm.keysStatus));
  api.put('/settings/keys/:provider', requireAuth, asyncHandler(llm.setKey));
  api.delete('/settings/keys/:provider', requireAuth, asyncHandler(llm.removeKey));
  // Open route, but a signed-in user's own key is used when present.
  api.post(
    '/cover-letter',
    asyncHandler(auth.attachUser),
    requirePro,
    asyncHandler(llm.generateCoverLetter),
  );
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
