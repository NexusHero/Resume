import { loadConfig } from './config';
import { buildContainer } from './container';
import { createApp } from './http/create-app';
import type { Logger } from './ports/logger';
import type { ApplicationController } from './http/application-controller';

function main(): void {
  const config = loadConfig();
  const container = buildContainer(config);
  const logger = container.resolve<Logger>('logger');

  const app = createApp({
    applicationController: container.resolve<ApplicationController>('applicationController'),
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

main();
