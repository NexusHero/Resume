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
import type { LlmProvider } from '../../src/ports/llm-provider.js';
import type { PageFetcher } from '../../src/ports/page-fetcher.js';
import type { JobSource } from '../../src/ports/job-source.js';
import type { PdfRenderer } from '../../src/ports/pdf-renderer.js';
import type { AgentLlmProvider } from '../../src/ports/agent-llm-provider.js';
import type { AssistantSettings } from '../../src/domain/assistant.js';
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
  JOB_POSTING_REPOSITORY,
  JOB_APPLICATION_REPOSITORY,
  PAGE_FETCHER,
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
  WORKSPACE_SETTINGS_STORE,
  WORKSPACE_SETTINGS_SERVICE,
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
  AGENT_LLM_PROVIDER,
  CHAT_SESSION_REPOSITORY,
} from '../../src/nest/tokens.js';
import {
  InMemoryApplicationRepository,
  InMemoryJobPostingRepository,
  InMemoryJobApplicationRepository,
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
  InMemoryUsageMeter,
  InMemoryInterviewObservationRepository,
  InMemoryPasswordResetTokenStore,
  InMemoryEmailVerificationTokenStore,
  RecordingMailer,
  FakeInboxSource,
  FakeJobSource,
  FakePageFetcher,
  InMemoryStageTransitionRepository,
  InMemoryRetentionPolicyStore,
  InMemoryChatSessionRepository,
  FakeAgentLlmProvider,
  FakeAuthEngine,
  FakePdfRenderer,
  FakePdfMerger,
  FakePdfTextExtractor,
  FakeVersioner,
  fakeWorkspaceSettings,
  FixedClock,
  SequenceIdGenerator,
  noopLogger,
} from './fakes.js';

export interface NestTestAppOptions {
  mailer?: RecordingMailer;
  passwordResetTokenStore?: InMemoryPasswordResetTokenStore;
  emailVerificationTokenStore?: InMemoryEmailVerificationTokenStore;
  inboxSource?: FakeInboxSource;
  /** Override the LLM registry (e.g. a fake provider that reports configured). */
  llmService?: LlmService;
  /**
   * Providers with a "server key" for the test. Default none — i.e. the server
   * behaves like a fresh install without ANTHROPIC_API_KEY (503 AI routes).
   */
  llmProviders?: LlmProvider[];
  /** Seed the assistant store (needed to put autopilot into an existing state). */
  assistantSettings?: Partial<AssistantSettings>;
  /** Text the fake PDF extractor returns (or an error it throws). */
  pdfText?: string | Error;
  /** Override the PDF renderer (e.g. to inspect the rendered HTML). */
  pdfRenderer?: PdfRenderer;
  /** Override the job-application repository (e.g. to pre-seed a foreign selection). */
  jobApplicationRepository?: InMemoryJobApplicationRepository;
  /** Override the attachment store (e.g. to pre-seed attachments). */
  attachmentStore?: InMemoryAttachmentStore;
  /**
   * Seed the workspace's `vermittlung` switch. Defaults to **false** (production
   * default). Agency-slice tests opt in with `{ vermittlung: true }`.
   */
  vermittlung?: boolean;
  /**
   * Seed the workspace's AI consent (ADR-0063). Defaults to **true** (granted)
   * so the existing AI-route tests keep testing key/provider behaviour rather
   * than consent; consent-specific tests pass `false` and grant via PATCH.
   */
  aiConsent?: boolean;
  /** Override the PageFetcher (default: a fake that returns empty text). */
  pageFetcher?: PageFetcher;
  /** Override the job source (default: FakeJobSource). */
  jobSource?: JobSource;
  /** Override the agent LLM provider (default: none — 503 unless a key is set). */
  agentLlmProvider?: AgentLlmProvider;
  /** Override the chat-session repository (e.g. to pre-seed a running session). */
  chatSessionRepository?: InMemoryChatSessionRepository;
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
  const llmService =
    opts.llmService ??
    new LlmService({
      providers:
        opts.llmProviders ??
        (config.llm.anthropic.apiKey || config.llm.gemini.apiKey
          ? [
              new AnthropicLlmProvider({ httpFetch: nodeFetch, config: config.llm.anthropic }),
              new GeminiLlmProvider({ httpFetch: nodeFetch, config: config.llm.gemini }),
            ]
          : []),
      defaultProvider: config.llm.provider,
      logger: noopLogger,
    });

  const workspaceSettings = fakeWorkspaceSettings({
    vermittlung: opts.vermittlung ?? false,
    aiConsent: opts.aiConsent ?? true,
  });
  const assistantSettingsStore = new InMemoryAssistantSettingsStore();
  if (opts.assistantSettings) {
    await assistantSettingsStore.set('team', {
      enabled: false,
      mode: 'suggest',
      intervalMinutes: 60,
      applySource: 'mandates',
      minApplyScore: 70,
      ...opts.assistantSettings,
    });
  }

  const fakes: Provider[] = [
    { provide: APPLICATION_REPOSITORY, useValue: new InMemoryApplicationRepository() },
    { provide: JOB_POSTING_REPOSITORY, useValue: new InMemoryJobPostingRepository() },
    {
      provide: JOB_APPLICATION_REPOSITORY,
      useValue: opts.jobApplicationRepository ?? new InMemoryJobApplicationRepository(),
    },
    { provide: PAGE_FETCHER, useValue: opts.pageFetcher ?? new FakePageFetcher() },
    { provide: AUDIT_LOG, useValue: new InMemoryAuditLog() },
    { provide: PDF_ARCHIVE, useValue: new InMemoryPdfArchive() },
    { provide: SAVED_SEARCH_REPOSITORY, useValue: new InMemorySavedSearchRepository() },
    { provide: MANDATE_REPOSITORY, useValue: new InMemoryMandateRepository() },
    { provide: TALENT_REPOSITORY, useValue: new InMemoryTalentRepository() },
    { provide: PLACEMENT_REPOSITORY, useValue: new InMemoryPlacementRepository() },
    { provide: CANDIDACY_REPOSITORY, useValue: new InMemoryCandidacyRepository() },
    { provide: DOCUMENT_REPOSITORY, useValue: new InMemoryDocumentRepository() },
    { provide: ATTACHMENT_STORE, useValue: opts.attachmentStore ?? new InMemoryAttachmentStore() },
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
    { provide: WORKSPACE_SETTINGS_STORE, useValue: workspaceSettings.store },
    { provide: WORKSPACE_SETTINGS_SERVICE, useValue: workspaceSettings.service },
    { provide: USAGE_METER, useValue: new InMemoryUsageMeter() },
    {
      provide: INTERVIEW_OBSERVATION_REPOSITORY,
      useValue: new InMemoryInterviewObservationRepository(),
    },
    { provide: ASSISTANT_SETTINGS_STORE, useValue: assistantSettingsStore },
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
    { provide: PDF_RENDERER, useValue: opts.pdfRenderer ?? new FakePdfRenderer() },
    { provide: PDF_MERGER, useValue: new FakePdfMerger() },
    {
      provide: PDF_TEXT_EXTRACTOR,
      useValue: new FakePdfTextExtractor(opts.pdfText ?? 'Extracted CV text from PDF.'),
    },
    { provide: VERSIONER, useValue: new FakeVersioner(null) },
    { provide: PLAN_PROVIDER, useValue: new EnvPlanProvider(config.plan) },
    { provide: AUTHORIZER, useValue: new RoleAuthorizer() },
    { provide: EMBEDDING_PROVIDER, useValue: new HashedEmbeddingProvider() },
    { provide: LLM_SERVICE, useValue: llmService },
    { provide: RATE_LIMITER, useValue: new InMemoryRateLimiter() },
    {
      provide: CHAT_SESSION_REPOSITORY,
      useValue: opts.chatSessionRepository ?? new InMemoryChatSessionRepository(),
    },
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
    .useValue(opts.jobSource ?? new FakeJobSource())
    // The agent module binds its own AGENT_LLM_PROVIDER factory (real providers);
    // tests override it with a scripted fake (or a no-op default that the
    // `@RequiresAi` guard blocks anyway when no key is configured).
    .overrideProvider(AGENT_LLM_PROVIDER)
    .useValue(opts.agentLlmProvider ?? new FakeAgentLlmProvider([]))
    .compile();

  const app = moduleRef.createNestApplication<NestExpressApplication>({
    bodyParser: false,
    logger: false,
  });
  configureHttpEdge(app, config);
  app.useGlobalFilters(new ProblemJsonFilter(noopLogger));
  await app.init();
  openApps.push(app);
  // Bind explicitly to IPv4: Node may resolve the ephemeral test host to ::1 or
  // 127.0.0.1 between requests, and supertest's agent then drops the session
  // cookie (different host) — an intermittent 401 under load.
  const server = app.getHttpServer() as Server;
  if (!server.listening) {
    await new Promise<void>((resolve, reject) => {
      server.once('error', reject);
      server.listen(0, '127.0.0.1', () => resolve());
    });
  }
  return server;
}

/** Close every app the current test created (call from afterEach). */
export async function closeNestApps(): Promise<void> {
  await Promise.all(openApps.splice(0).map((app) => app.close()));
}
