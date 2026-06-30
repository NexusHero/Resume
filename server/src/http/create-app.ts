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
import type { AuthController } from './auth-controller';
import type { AccountController } from './account-controller';
import { asyncHandler } from './async-handler';
import { errorHandler, notFound } from './problem';
import { corsMiddleware, securityHeaders } from './security';

export interface AppDeps {
  applicationController: ApplicationController;
  jobController: JobController;
  atsController: AtsController;
  savedSearchController: SavedSearchController;
  llmController: LlmController;
  mandateController: MandateController;
  talentController: TalentController;
  placementController: PlacementController;
  authController: AuthController;
  accountController: AccountController;
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
    authController: auth,
    accountController: account,
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
  api.get('/placements', requireAuth, asyncHandler(p.list));
  api.post('/placements', requireAuth, asyncHandler(p.create));
  api.patch('/placements/:id', requireAuth, asyncHandler(p.update));
  api.delete('/placements/:id', requireAuth, asyncHandler(p.remove));
  // DSGVO: export everything the recruiter owns, or erase the account entirely.
  api.get('/account/export', requireAuth, asyncHandler(account.export));
  api.delete('/account', requireAuth, asyncHandler(account.remove));
  api.get('/settings/llm', asyncHandler(llm.settings));
  api.put('/settings/llm', asyncHandler(llm.setProvider));
  api.post('/cover-letter', asyncHandler(llm.generateCoverLetter));
  api.use((_req, res) => notFound(res));

  app.use('/api/v1', api);

  // Static web UIs (CV, cover letter, myJob). Served after the API routes.
  app.use(express.static(deps.config.staticDir, { index: 'index.html' }));

  app.use(errorHandler(deps.logger));
  return app;
}
