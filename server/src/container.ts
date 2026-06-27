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
import { PdfLibMerger } from './adapters/pdf-lib-merger';
import { createJobSource } from './adapters/job-source-factory';
import { nodeFetch } from './adapters/node-fetch';
import { ApplicationService } from './services/application-service';
import { JobSearchService } from './services/job-search-service';
import { ApplicationController } from './http/application-controller';
import { JobController } from './http/job-controller';

/** Composition root: wires every port to its production adapter (no decorators). */
export function buildContainer(config: AppConfig = loadConfig()): AwilixContainer {
  const container = createContainer({ injectionMode: InjectionMode.PROXY });
  container.register({
    config: asValue(config),
    candidateProfile: asValue(config.candidateProfile),
    logger: asFunction(() => createLogger()).singleton(),
    clock: asClass(SystemClock).singleton(),
    idGenerator: asClass(RandomIdGenerator).singleton(),
    applicationRepository: asClass(FsApplicationRepository).singleton(),
    auditLog: asClass(FsAuditLog).singleton(),
    pdfArchive: asClass(FsPdfArchive).singleton(),
    versioner: asClass(GitVersioner).singleton(),
    pdfRenderer: asClass(PuppeteerPdfRenderer).singleton(),
    pdfMerger: asClass(PdfLibMerger).singleton(),
    jobSource: asFunction(({ config: c, logger }) =>
      createJobSource({ config: c, logger, httpFetch: nodeFetch }),
    ).singleton(),
    applicationService: asClass(ApplicationService).singleton(),
    jobSearchService: asClass(JobSearchService).singleton(),
    applicationController: asClass(ApplicationController).singleton(),
    jobController: asClass(JobController).singleton(),
  });
  return container;
}
