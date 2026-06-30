import { loadConfig } from './config';
import { buildContainer } from './container';
import { createApp } from './http/create-app';
import { createDb, migrate, type Db } from './adapters/sql/db';
import type { Logger } from './ports/logger';
import type { ApplicationController } from './http/application-controller';
import type { JobController } from './http/job-controller';
import type { AtsController } from './http/ats-controller';
import type { SavedSearchController } from './http/saved-search-controller';
import type { LlmController } from './http/llm-controller';
import type { MandateController } from './http/mandate-controller';
import type { TalentController } from './http/talent-controller';
import type { PlacementController } from './http/placement-controller';
import type { AuthController } from './http/auth-controller';

async function main(): Promise<void> {
  const config = loadConfig();

  let db: Db | undefined;
  if (config.store === 'sql') {
    const conn = createDb(config.databaseUrl);
    await migrate(conn.pool);
    db = conn.db;
  }

  const container = buildContainer(config, db);
  const logger = container.resolve<Logger>('logger');

  const app = createApp({
    applicationController: container.resolve<ApplicationController>('applicationController'),
    jobController: container.resolve<JobController>('jobController'),
    atsController: container.resolve<AtsController>('atsController'),
    savedSearchController: container.resolve<SavedSearchController>('savedSearchController'),
    llmController: container.resolve<LlmController>('llmController'),
    mandateController: container.resolve<MandateController>('mandateController'),
    talentController: container.resolve<TalentController>('talentController'),
    placementController: container.resolve<PlacementController>('placementController'),
    authController: container.resolve<AuthController>('authController'),
    config,
    logger,
  });

  const server = app.listen(config.port, () => {
    logger.info(
      { port: config.port },
      `Application suite running on http://localhost:${config.port}`,
    );
  });

  const shutdown = (signal: string) => {
    logger.info({ signal }, 'shutting down');
    server.close(() => process.exit(0));
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
