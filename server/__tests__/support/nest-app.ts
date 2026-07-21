import 'reflect-metadata';
import { Test } from '@nestjs/testing';
import { Global, Module, type INestApplication, type Provider } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import type { Server } from 'http';
import { loadConfig, type AppConfig } from '../../src/config.js';
import { CoreModule } from '../../src/nest/core.module.js';
import { AuthModule } from '../../src/nest/auth/auth.module.js';
import { FEATURE_MODULES, HealthController } from '../../src/nest/app.module.js';
import { configureHttpEdge } from '../../src/nest/http-edge.js';
import { ProblemJsonFilter } from '../../src/nest/problem-json.filter.js';
import { LlmService } from '../../src/services/llm-service.js';
import { AnthropicLlmProvider } from '../../src/adapters/anthropic-llm-provider.js';
import { GeminiLlmProvider } from '../../src/adapters/gemini-llm-provider.js';
import { nodeFetch } from '../../src/adapters/node-fetch.js';
import { EnvPlanProvider } from '../../src/adapters/env-plan-provider.js';
import { RoleAuthorizer } from '../../src/adapters/role-authorizer.js';
import { HashedEmbeddingProvider } from '../../src/adapters/hashed-embedding-provider.js';
import { InMemoryRateLimiter } from '../../src/adapters/in-memory-rate-limiter.js';
import {
  CONFIG,
  LOGGER,
  CLOCK,
  ID_GENERATOR,
  JOB_SOURCE,
  APPLICATION_REPOSITORY,
  AUDIT_LOG,
  PDF_ARCHIVE,
  SAVED_SEARCH_REPOSITORY,
  MANDATE_REPOSITORY,
  TALENT_REPOSITORY,
  PLACEMENT_REPOSITORY,
  CANDIDACY_REPOSITORY,
  DOCUMENT_REPOSITORY,
  ATTACHMENT_STORE,
  USER_REPOSITORY,
  PASSWORD_RESET_TOKEN_STORE,
  EMAIL_VERIFICATION_TOKEN_STORE,
  INVITE_REPOSITORY,
  TENANT_REPOSITORY,
  API_KEY_STORE,
  USAGE_METER,
  INTERVIEW_OBSERVATION_REPOSITORY,
  ASSISTANT_SETTINGS_STORE,
  RETENTION_POLICY_STORE,
  ASSISTANT_SUGGESTION_REPOSITORY,
  ARTIFACT_LOG_REPOSITORY,
  STAGE_TRANSITION_REPOSITORY,
  AUTH_ENGINE,
  MAILER,
  INBOX_SOURCE,
  PDF_RENDERER,
  PDF_MERGER,
  PDF_TEXT_EXTRACTOR,
  VERSIONER,
  PLAN_PROVIDER,
  AUTHORIZER,
  EMBEDDING_PROVIDER,
  LLM_SERVICE,
  RATE_LIMITER,
} from '../../src/nest/tokens.js';
import {
  InMemoryApplicationRepository,
  InMemoryArtifactLogRepository,
  InMemoryAssistantSettingsStore,
  InMemoryAssistantSuggestionRepository,
  InMemoryAuditLog,
  InMemoryPdfArchive,
  InMemorySavedSearchRepository,
  InMemoryMandateRepository,
  InMemoryTalentRepository,
  InMemoryPlacementRepository,
  InMemoryCandidacyRepository,
  InMemoryDocumentRepository,
  InMemoryAttachmentStore,
  InMemoryUserRepository,
  InMemoryInviteRepository,
  InMemoryTenantRepository,
  InMemoryApiKeyStore,
  InMemoryUsageMeter,
  InMemoryInterviewObservationRepository,
  InMemoryPasswordResetTokenStore,
  InMemoryEmailVerificationTokenStore,
  RecordingMailer,
  FakeInboxSource,
  FakeJobSource,
  InMemoryStageTransitionRepository,
  InMemoryRetentionPolicyStore,
  FakeAuthEngine,
  FakePdfRenderer,
  FakePdfMerger,
  FakePdfTextExtractor,
  FakeVersioner,
  FixedClock,
  SequenceIdGenerator,
  noopLogger,
} from './fakes.js';

export interface NestTestAppOptions {
  mailer?: RecordingMailer;
  passwordResetTokenStore?: InMemoryPasswordResetTokenStore;
  emailVerificationTokenStore?: InMemoryEmailVerificationTokenStore;
  inboxSource?: FakeInboxSource;
}

const openApps: INestApplication[] = [];

/**
 * The full application over in-memory fakes — the NestJS successor of the
 * retired `createApp(deps)` harness (ADR-0051). Every leaf port is a fake in a
 * `@Global` module; the real feature modules then assemble the same services
 * production runs, so requests exercise controller → guard → service → port end
 * to end (real auth via FakeAuthEngine cookies included). Returns the HTTP
 * server for supertest; `closeNestApps()` tears down whatever a test created.
 */
export async function makeNestApp(
  config: AppConfig = loadConfig({}),
  opts: NestTestAppOptions = {},
): Promise<Server> {
  const llmService = new LlmService({
    providers: [
      new AnthropicLlmProvider({ httpFetch: nodeFetch, config: config.llm.anthropic }),
      new GeminiLlmProvider({ httpFetch: nodeFetch, config: config.llm.gemini }),
    ],
    defaultProvider: config.llm.provider,
    logger: noopLogger,
  });

  const fakes: Provider[] = [
    { provide: APPLICATION_REPOSITORY, useValue: new InMemoryApplicationRepository() },
    { provide: AUDIT_LOG, useValue: new InMemoryAuditLog() },
    { provide: PDF_ARCHIVE, useValue: new InMemoryPdfArchive() },
    { provide: SAVED_SEARCH_REPOSITORY, useValue: new InMemorySavedSearchRepository() },
    { provide: MANDATE_REPOSITORY, useValue: new InMemoryMandateRepository() },
    { provide: TALENT_REPOSITORY, useValue: new InMemoryTalentRepository() },
    { provide: PLACEMENT_REPOSITORY, useValue: new InMemoryPlacementRepository() },
    { provide: CANDIDACY_REPOSITORY, useValue: new InMemoryCandidacyRepository() },
    { provide: DOCUMENT_REPOSITORY, useValue: new InMemoryDocumentRepository() },
    { provide: ATTACHMENT_STORE, useValue: new InMemoryAttachmentStore() },
    { provide: USER_REPOSITORY, useValue: new InMemoryUserRepository() },
    {
      provide: PASSWORD_RESET_TOKEN_STORE,
      useValue: opts.passwordResetTokenStore ?? new InMemoryPasswordResetTokenStore(),
    },
    {
      provide: EMAIL_VERIFICATION_TOKEN_STORE,
      useValue: opts.emailVerificationTokenStore ?? new InMemoryEmailVerificationTokenStore(),
    },
    { provide: INVITE_REPOSITORY, useValue: new InMemoryInviteRepository() },
    { provide: TENANT_REPOSITORY, useValue: new InMemoryTenantRepository() },
    { provide: API_KEY_STORE, useValue: new InMemoryApiKeyStore() },
    { provide: USAGE_METER, useValue: new InMemoryUsageMeter() },
    {
      provide: INTERVIEW_OBSERVATION_REPOSITORY,
      useValue: new InMemoryInterviewObservationRepository(),
    },
    { provide: ASSISTANT_SETTINGS_STORE, useValue: new InMemoryAssistantSettingsStore() },
    { provide: RETENTION_POLICY_STORE, useValue: new InMemoryRetentionPolicyStore() },
    {
      provide: ASSISTANT_SUGGESTION_REPOSITORY,
      useValue: new InMemoryAssistantSuggestionRepository(),
    },
    { provide: ARTIFACT_LOG_REPOSITORY, useValue: new InMemoryArtifactLogRepository() },
    { provide: STAGE_TRANSITION_REPOSITORY, useValue: new InMemoryStageTransitionRepository() },
    { provide: AUTH_ENGINE, useValue: new FakeAuthEngine() },
    { provide: MAILER, useValue: opts.mailer ?? new RecordingMailer() },
    { provide: INBOX_SOURCE, useValue: opts.inboxSource ?? new FakeInboxSource() },
    { provide: PDF_RENDERER, useValue: new FakePdfRenderer() },
    { provide: PDF_MERGER, useValue: new FakePdfMerger() },
    {
      provide: PDF_TEXT_EXTRACTOR,
      useValue: new FakePdfTextExtractor('Extracted CV text from PDF.'),
    },
    { provide: VERSIONER, useValue: new FakeVersioner(null) },
    { provide: PLAN_PROVIDER, useValue: new EnvPlanProvider(config.plan) },
    { provide: AUTHORIZER, useValue: new RoleAuthorizer() },
    { provide: EMBEDDING_PROVIDER, useValue: new HashedEmbeddingProvider() },
    { provide: LLM_SERVICE, useValue: llmService },
    { provide: RATE_LIMITER, useValue: new InMemoryRateLimiter() },
  ];

  @Global()
  @Module({ providers: fakes, exports: fakes.map((p) => (p as { provide: symbol }).provide) })
  class FakePortsModule {}

  const moduleRef = await Test.createTestingModule({
    imports: [CoreModule, FakePortsModule, AuthModule, ...FEATURE_MODULES],
    controllers: [HealthController],
  })
    .overrideProvider(CONFIG)
    .useValue(config)
    .overrideProvider(LOGGER)
    .useValue(noopLogger)
    .overrideProvider(CLOCK)
    .useValue(new FixedClock())
    .overrideProvider(ID_GENERATOR)
    .useValue(new SequenceIdGenerator())
    // Replace JobsModule's own JOB_SOURCE (createJobSource → live boards).
    .overrideProvider(JOB_SOURCE)
    .useValue(new FakeJobSource())
    .compile();

  const app = moduleRef.createNestApplication<NestExpressApplication>({
    bodyParser: false,
    logger: false,
  });
  configureHttpEdge(app, config);
  app.useGlobalFilters(new ProblemJsonFilter(noopLogger));
  await app.init();
  openApps.push(app);
  return app.getHttpServer() as Server;
}

/** Close every app the current test created (call from afterEach). */
export async function closeNestApps(): Promise<void> {
  await Promise.all(openApps.splice(0).map((app) => app.close()));
}
