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
import { FsPdfArchive } from './adapters/fs-pdf-archive';
import { FsMandateRepository } from './adapters/fs-mandate-repository';
import { createPersistence } from './adapters/persistence-factory';
import type { Db } from './adapters/sql/db';
import { GitVersioner } from './adapters/git-versioner';
import { NoopVersioner } from './adapters/noop-versioner';
import { PuppeteerPdfRenderer } from './adapters/puppeteer-pdf-renderer';
import { PdfLibMerger } from './adapters/pdf-lib-merger';
import { createJobSource } from './adapters/job-source-factory';
import { nodeFetch } from './adapters/node-fetch';
import { KeywordSkillExtractor } from './adapters/keyword-skill-extractor';
import { AnthropicLlmProvider } from './adapters/anthropic-llm-provider';
import { GeminiLlmProvider } from './adapters/gemini-llm-provider';
import { ApplicationService } from './services/application-service';
import { JobSearchService } from './services/job-search-service';
import { AtsService } from './services/ats-service';
import { SavedSearchService } from './services/saved-search-service';
import { LlmService } from './services/llm-service';
import { CoverLetterService } from './services/cover-letter-service';
import { MandateService } from './services/mandate-service';
import { ApplicationController } from './http/application-controller';
import { JobController } from './http/job-controller';
import { AtsController } from './http/ats-controller';
import { SavedSearchController } from './http/saved-search-controller';
import { LlmController } from './http/llm-controller';
import { MandateController } from './http/mandate-controller';

/** Composition root: wires every port to its production adapter (no decorators). */
export function buildContainer(config: AppConfig = loadConfig(), db?: Db): AwilixContainer {
  const container = createContainer({ injectionMode: InjectionMode.PROXY });
  const persistence = createPersistence({ config, db });
  container.register({
    config: asValue(config),
    candidateProfile: asValue(config.candidateProfile),
    candidate: asValue(config.candidate),
    logger: asFunction(() => createLogger()).singleton(),
    clock: asClass(SystemClock).singleton(),
    idGenerator: asClass(RandomIdGenerator).singleton(),
    applicationRepository: asValue(persistence.applicationRepository),
    auditLog: asValue(persistence.auditLog),
    savedSearchRepository: asValue(persistence.savedSearchRepository),
    // Recruiting persistence is file-backed for now; a SQL adapter is a tracked
    // follow-up (the default 'fs' store powers the offline app and CI).
    mandateRepository: asClass(FsMandateRepository).singleton(),
    pdfArchive: asClass(FsPdfArchive).singleton(),
    // Git versioning only makes sense for the file store; with Postgres there are
    // no JSON files to commit (and committing would needlessly fire git hooks).
    versioner:
      config.store === 'sql'
        ? asClass(NoopVersioner).singleton()
        : asClass(GitVersioner).singleton(),
    pdfRenderer: asClass(PuppeteerPdfRenderer).singleton(),
    pdfMerger: asClass(PdfLibMerger).singleton(),
    jobSource: asFunction(({ config: c, logger }) =>
      createJobSource({ config: c, logger, httpFetch: nodeFetch }),
    ).singleton(),
    skillExtractor: asFunction(() => new KeywordSkillExtractor()).singleton(),
    llmService: asFunction(
      ({ config: c, logger }) =>
        new LlmService({
          providers: [
            new AnthropicLlmProvider({ httpFetch: nodeFetch, config: c.llm.anthropic }),
            new GeminiLlmProvider({ httpFetch: nodeFetch, config: c.llm.gemini }),
          ],
          defaultProvider: c.llm.provider,
          logger,
        }),
    ).singleton(),
    applicationService: asClass(ApplicationService).singleton(),
    jobSearchService: asClass(JobSearchService).singleton(),
    atsService: asClass(AtsService).singleton(),
    savedSearchService: asClass(SavedSearchService).singleton(),
    coverLetterService: asClass(CoverLetterService).singleton(),
    mandateService: asClass(MandateService).singleton(),
    applicationController: asClass(ApplicationController).singleton(),
    jobController: asClass(JobController).singleton(),
    atsController: asClass(AtsController).singleton(),
    savedSearchController: asClass(SavedSearchController).singleton(),
    llmController: asClass(LlmController).singleton(),
    mandateController: asClass(MandateController).singleton(),
  });
  return container;
}
