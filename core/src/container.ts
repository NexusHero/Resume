import {
  createContainer,
  InjectionMode,
  asClass,
  asFunction,
  asValue,
  type AwilixContainer,
} from 'awilix';
import { loadConfig, type AppConfig } from './config';
import { createLogger } from './adapters/pino-logger';
import { SystemClock } from './adapters/system-clock';
import { RandomIdGenerator } from './adapters/random-id-generator';
import { FsApplicationRepository } from './adapters/fs-application-repository';
import { FsAuditLog } from './adapters/fs-audit-log';
import { FsPdfArchive } from './adapters/fs-pdf-archive';
import { GitVersioner } from './adapters/git-versioner';
import { PuppeteerPdfRenderer } from './adapters/puppeteer-pdf-renderer';
import { ApplicationService } from './services/application-service';
import { ApplicationController } from './http/application-controller';

/** Composition root: wires every port to its production adapter (no decorators). */
export function buildContainer(config: AppConfig = loadConfig()): AwilixContainer {
  const container = createContainer({ injectionMode: InjectionMode.PROXY });
  container.register({
    config: asValue(config),
    logger: asFunction(() => createLogger()).singleton(),
    clock: asClass(SystemClock).singleton(),
    idGenerator: asClass(RandomIdGenerator).singleton(),
    applicationRepository: asClass(FsApplicationRepository).singleton(),
    auditLog: asClass(FsAuditLog).singleton(),
    pdfArchive: asClass(FsPdfArchive).singleton(),
    versioner: asClass(GitVersioner).singleton(),
    pdfRenderer: asClass(PuppeteerPdfRenderer).singleton(),
    applicationService: asClass(ApplicationService).singleton(),
    applicationController: asClass(ApplicationController).singleton(),
  });
  return container;
}
