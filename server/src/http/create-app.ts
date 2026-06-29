import express, { type Express, type Request, type Response, type NextFunction } from 'express';
import type { AppConfig } from '../config';
import type { Logger } from '../ports/logger';
import type { ApplicationController } from './application-controller';
import type { JobController } from './job-controller';
import type { AtsController } from './ats-controller';
import type { SavedSearchController } from './saved-search-controller';
import type { LlmController } from './llm-controller';
import { asyncHandler } from './async-handler';
import { errorHandler, notFound } from './problem';

export interface AppDeps {
  applicationController: ApplicationController;
  jobController: JobController;
  atsController: AtsController;
  savedSearchController: SavedSearchController;
  llmController: LlmController;
  config: AppConfig;
  logger: Logger;
}

function cors(_req: Request, res: Response, next: NextFunction): void {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (_req.method === 'OPTIONS') {
    res.sendStatus(204);
    return;
  }
  next();
}

/** Builds the Express application (no port binding — supertest can drive it directly). */
export function createApp(deps: AppDeps): Express {
  const {
    applicationController: c,
    jobController: j,
    atsController: ats,
    savedSearchController: s,
    llmController: llm,
  } = deps;
  const app = express();

  app.use(cors);
  app.use(express.json({ limit: '80mb' }));

  const api = express.Router();
  api.get('/health', (_req, res) => res.json({ status: 'ok' }));
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
  api.get('/settings/llm', asyncHandler(llm.settings));
  api.put('/settings/llm', asyncHandler(llm.setProvider));
  api.post('/cover-letter', asyncHandler(llm.generateCoverLetter));
  api.use((_req, res) => notFound(res));

  app.use('/api/v1', api);

  // Static web UIs (CV, cover letter, myJob). Served after the API routes.
  // No-cache so the browser always re-validates — the in-browser Babel apps have
  // no content hashes, so caching would otherwise serve stale JS after a change.
  app.use(
    express.static(deps.config.staticDir, {
      index: 'index.html',
      etag: true,
      lastModified: true,
      setHeaders: (res) => res.setHeader('Cache-Control', 'no-cache'),
    }),
  );

  app.use(errorHandler(deps.logger));
  return app;
}
