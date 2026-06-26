import express, { type Express, type Request, type Response, type NextFunction } from 'express';
import type { AppConfig } from '../config';
import type { Logger } from '../ports/logger';
import type { ApplicationController } from './application-controller';
import { asyncHandler } from './async-handler';
import { errorHandler, notFound } from './problem';

export interface AppDeps {
  applicationController: ApplicationController;
  config: AppConfig;
  logger: Logger;
}

function cors(_req: Request, res: Response, next: NextFunction): void {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (_req.method === 'OPTIONS') {
    res.sendStatus(204);
    return;
  }
  next();
}

/** Builds the Express application (no port binding — supertest can drive it directly). */
export function createApp(deps: AppDeps): Express {
  const { applicationController: c } = deps;
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
  api.use((_req, res) => notFound(res));

  app.use('/api/v1', api);

  // Static web UIs (CV, cover letter, myJob). Served after the API routes.
  app.use(express.static(deps.config.staticDir, { index: 'index.html' }));

  app.use(errorHandler(deps.logger));
  return app;
}
