import {
  createContainer,
  InjectionMode,
  asClass,
  asFunction,
  asValue,
  type AwilixContainer,
} from 'awilix';
import { loadConfig, type AppConfig } from './config.js';
import { toUserView } from './domain/user.js';
import { emptyContact } from './domain/talent-documents.js';
import type { UserErasureStep, UserExportSection } from './ports/personal-data.js';
import type { TalentDataPurger } from './ports/talent-data.js';
import { createLogger } from './adapters/pino-logger.js';
import { SystemClock } from './adapters/system-clock.js';
import { RandomIdGenerator } from './adapters/random-id-generator.js';
import { createPdfArchive } from './adapters/create-pdf-archive.js';
import { ScryptPasswordHasher } from './adapters/scrypt-password-hasher.js';
import { BetterAuthEngine } from './adapters/better-auth/better-auth-engine.js';
import { createMailer } from './adapters/mailer-factory.js';
import { createInboxSource } from './adapters/inbox-source-factory.js';
import { createPersistence } from './adapters/persistence-factory.js';
import type { Db } from './adapters/sql/db.js';
import { GitVersioner } from './adapters/git-versioner.js';
import { NoopVersioner } from './adapters/noop-versioner.js';
import { PuppeteerPdfRenderer } from './adapters/puppeteer-pdf-renderer.js';
import { PdfLibMerger } from './adapters/pdf-lib-merger.js';
import { PdfjsTextExtractor } from './adapters/pdfjs-text-extractor.js';
import { createJobSource } from './adapters/job-source-factory.js';
import { SampleJobSource } from './adapters/sample-job-source.js';
import { nodeFetch } from './adapters/node-fetch.js';
import { KeywordSkillExtractor } from './adapters/keyword-skill-extractor.js';
import { createEmbeddingProvider } from './adapters/create-embedding-provider.js';
import { EnvPlanProvider } from './adapters/env-plan-provider.js';
import { AnthropicLlmProvider } from './adapters/anthropic-llm-provider.js';
import { GeminiLlmProvider } from './adapters/gemini-llm-provider.js';
import { RoleAuthorizer } from './adapters/role-authorizer.js';
import { ApplicationService } from './services/application-service.js';
import { JobSearchService } from './services/job-search-service.js';
import { AtsService } from './services/ats-service.js';
import { SavedSearchService } from './services/saved-search-service.js';
import { LlmService } from './services/llm-service.js';
import { CoverLetterService } from './services/cover-letter-service.js';
import { MandateService } from './services/mandate-service.js';
import { TalentService } from './services/talent-service.js';
import { TalentImportService } from './services/talent-import-service.js';
import { PlacementService } from './services/placement-service.js';
import { CandidacyService } from './services/candidacy-service.js';
import { RetentionService } from './services/retention-service.js';
import { MatchService } from './services/match-service.js';
import { UsageService } from './services/usage-service.js';
import { ForecastService } from './services/forecast-service.js';
import { InterviewObservationService } from './services/interview-observation-service.js';
import { AssistantService } from './services/assistant-service.js';
import { AutopilotService } from './services/autopilot-service.js';
import { ApplicationBuilder } from './services/application-builder.js';
import { DocumentService } from './services/document-service.js';
import { DocumentAiService } from './services/document-ai-service.js';
import { LlmFeatureRunner } from './services/llm-feature-runner.js';
import { DocumentAssistService } from './services/document-assist-service.js';
import { CvParseService } from './services/cv-parse-service.js';
import { AtsAiService } from './services/ats-ai-service.js';
import { OutreachAiService } from './services/outreach-ai-service.js';
import { MatchAiService } from './services/match-ai-service.js';
import { AttachmentService } from './services/attachment-service.js';
import { AuthService } from './services/auth-service.js';
import { MembersService } from './services/members-service.js';
import { InviteService } from './services/invite-service.js';
import { TenantService } from './services/tenant-service.js';
import { AccountService } from './services/account-service.js';
import { PasswordResetService } from './services/password-reset-service.js';
import { EmailVerificationService } from './services/email-verification-service.js';
import { MailService } from './services/mail-service.js';
import { ApplicationController } from './http/application-controller.js';
import { JobController } from './http/job-controller.js';
import { AtsController } from './http/ats-controller.js';
import { SavedSearchController } from './http/saved-search-controller.js';
import { LlmController } from './http/llm-controller.js';
import { MandateController } from './http/mandate-controller.js';
import { TalentController } from './http/talent-controller.js';
import { PlacementController } from './http/placement-controller.js';
import { CandidacyController } from './http/candidacy-controller.js';
import { RetentionController } from './http/retention-controller.js';
import { MatchController } from './http/match-controller.js';
import { MatchAiController } from './http/match-ai-controller.js';
import { UsageController } from './http/usage-controller.js';
import { ComplianceController } from './http/compliance-controller.js';
import { ForecastController } from './http/forecast-controller.js';
import { ObservationController } from './http/observation-controller.js';
import { AssistantController } from './http/assistant-controller.js';
import { ArtifactController } from './http/artifact-controller.js';
import { DocumentController } from './http/document-controller.js';
import { AttachmentController } from './http/attachment-controller.js';
import { AuthController } from './http/auth-controller.js';
import { MembersController } from './http/members-controller.js';
import { InviteController } from './http/invite-controller.js';
import { TenantAdminController } from './http/tenant-admin-controller.js';
import { AccountController } from './http/account-controller.js';
import { PasswordResetController } from './http/password-reset-controller.js';
import { MailController } from './http/mail-controller.js';

/** Composition root: wires every port to its production adapter (no decorators). */
export function buildContainer(config: AppConfig = loadConfig(), db?: Db): AwilixContainer {
  const container = createContainer({ injectionMode: InjectionMode.PROXY });
  const persistence = createPersistence({ config, clock: new SystemClock(), db });
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
    // Recruiting persistence follows the same store switch as the rest: file-backed
    // by default (offline app, dev, CI), Postgres when STORE=sql.
    mandateRepository: asValue(persistence.mandateRepository),
    talentRepository: asValue(persistence.talentRepository),
    placementRepository: asValue(persistence.placementRepository),
    candidacyRepository: asValue(persistence.candidacyRepository),
    documentRepository: asValue(persistence.documentRepository),
    attachmentStore: asValue(persistence.attachmentStore),
    // Auth persistence follows the same store switch: file-backed by default,
    // Postgres when STORE=sql (so sessions/users survive a multi-instance deploy).
    userRepository: asValue(persistence.userRepository),
    sessionStore: asValue(persistence.sessionStore),
    passwordResetTokenStore: asValue(persistence.passwordResetTokenStore),
    emailVerificationTokenStore: asValue(persistence.emailVerificationTokenStore),
    inviteRepository: asValue(persistence.inviteRepository),
    tenantRepository: asValue(persistence.tenantRepository),
    apiKeyStore: asValue(persistence.apiKeyStore),
    usageMeter: asValue(persistence.usageMeter),
    interviewObservationRepository: asValue(persistence.interviewObservationRepository),
    assistantSettingsStore: asValue(persistence.assistantSettingsStore),
    retentionPolicyStore: asValue(persistence.retentionPolicyStore),
    assistantSuggestionRepository: asValue(persistence.assistantSuggestionRepository),
    artifactLogRepository: asValue(persistence.artifactLogRepository),
    stageTransitionRepository: asValue(persistence.stageTransitionRepository),
    passwordHasher: asClass(ScryptPasswordHasher).singleton(),
    // Credential + session authority (ADR-0043): Better-Auth on embedded SQLite.
    // Constructed synchronously; its schema migrates lazily on first use.
    authEngine: asFunction(({ config: c }) =>
      BetterAuthEngine.create({
        dbPath: c.auth.betterAuthDbPath,
        secret: c.security.encryptionSecret,
      }),
    ).singleton(),
    // Transactional email: console by default, SMTP (nodemailer) when configured.
    mailer: asFunction(({ config: c, logger }) => createMailer({ config: c, logger })).singleton(),
    // Inbox reading for reply detection: IMAP when configured, else disabled.
    inboxSource: asFunction(({ config: c }) => createInboxSource({ config: c })).singleton(),
    pdfArchive: asFunction(({ config: c }) => createPdfArchive({ config: c })).singleton(),
    // Git versioning only makes sense for the file store; with Postgres there are
    // no JSON files to commit (and committing would needlessly fire git hooks).
    versioner:
      config.store === 'sql'
        ? asClass(NoopVersioner).singleton()
        : asClass(GitVersioner).singleton(),
    pdfRenderer: asClass(PuppeteerPdfRenderer).singleton(),
    pdfMerger: asClass(PdfLibMerger).singleton(),
    authorizer: asClass(RoleAuthorizer).singleton(),
    pdfTextExtractor: asClass(PdfjsTextExtractor).singleton(),
    jobSource: asFunction(({ config: c, logger }) =>
      createJobSource({ config: c, logger, httpFetch: nodeFetch }),
    ).singleton(),
    // The offline sample doubles as the honest fallback when live sources fail.
    fallbackJobSource: asFunction(() => new SampleJobSource()).singleton(),
    skillExtractor: asFunction(() => new KeywordSkillExtractor()).singleton(),
    // Subscription plan source: an instance-wide config default now, a license/
    // billing adapter later behind the same port (ADR-0021).
    planProvider: asFunction(({ config: c }) => new EnvPlanProvider(c.plan)).singleton(),
    // Semantic similarity for hybrid matching: hashed vectors by default
    // (ADR-0017), optionally Ollama (local neural) or OpenAI (ADR-0020).
    embeddingProvider: asFunction(({ config: c, logger }) =>
      createEmbeddingProvider({ config: c.embedding, logger, httpFetch: nodeFetch }),
    ).singleton(),
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
    // DSGVO talent-data purge registry (ports/talent-data.ts): every container
    // holding a candidate's satellite data registers one purger that handles both
    // the hard-delete (erase) and the soft DSGVO strip (anonymize). Shared by
    // TalentService.remove and RetentionService.anonymize, so the erase/anonymize
    // divergence lives here once instead of drifting across two method bodies.
    talentDataPurgers: asFunction((cradle): TalentDataPurger[] => [
      {
        label: 'documents',
        purge: async (scope, talentId, mode) => {
          if (mode === 'erase') {
            await cradle.documentRepository.removeForTalent(scope, talentId);
            return;
          }
          // anonymize: keep the résumé body, clear the identifying contact block.
          const documents = await cradle.documentRepository.get(scope, talentId);
          if (documents) {
            await cradle.documentRepository.save({
              ...documents,
              contact: { ...emptyContact },
              updatedAt: cradle.clock.isoNow(),
            });
          }
        },
      },
      {
        // Raw CVs are the heaviest personal data — removed on both erase and anonymize.
        label: 'attachments',
        purge: (scope, talentId) => cradle.attachmentStore.removeForTalent(scope, talentId),
      },
      {
        label: 'candidacies',
        purge: async (scope, talentId, mode) => {
          // erase deletes the pipeline rows; anonymize keeps them as
          // non-identifying history (stats, forecast) — the intended divergence.
          if (mode === 'erase') {
            await cradle.candidacyRepository.removeForTalent(scope, talentId);
          }
        },
      },
    ]).singleton(),
    talentService: asClass(TalentService).singleton(),
    talentImportService: asClass(TalentImportService).singleton(),
    placementService: asClass(PlacementService).singleton(),
    candidacyService: asClass(CandidacyService).singleton(),
    retentionService: asClass(RetentionService).singleton(),
    matchService: asClass(MatchService).singleton(),
    usageService: asClass(UsageService).singleton(),
    forecastService: asClass(ForecastService).singleton(),
    interviewObservationService: asClass(InterviewObservationService).singleton(),
    applicationBuilder: asClass(ApplicationBuilder).singleton(),
    autopilotService: asClass(AutopilotService).singleton(),
    assistantService: asClass(AssistantService).singleton(),
    documentService: asClass(DocumentService).singleton(),
    // AI feature services behind the shared runner (ADR-0022); documentAiService
    // is a thin facade over them for the existing callers.
    llmFeatureRunner: asClass(LlmFeatureRunner).singleton(),
    documentAssistService: asClass(DocumentAssistService).singleton(),
    cvParseService: asClass(CvParseService).singleton(),
    atsAiService: asClass(AtsAiService).singleton(),
    outreachAiService: asClass(OutreachAiService).singleton(),
    matchAiService: asClass(MatchAiService).singleton(),
    documentAiService: asClass(DocumentAiService).singleton(),
    attachmentService: asClass(AttachmentService).singleton(),
    authService: asClass(AuthService).singleton(),
    membersService: asClass(MembersService).singleton(),
    inviteService: asClass(InviteService).singleton(),
    tenantService: asClass(TenantService).singleton(),
    // DSGVO personal-data registry (ports/personal-data.ts): every container that
    // holds a user's own footprint registers one erase step and, where the data
    // belongs in a data export, one export section — here, once, next to all the
    // others. AccountService iterates these instead of hand-listing stores, so a
    // forgotten container (as email-verification tokens once were) can't recur.
    userErasureSteps: asFunction((cradle): UserErasureStep[] => [
      {
        label: 'api-keys',
        erase: async (userId) => {
          for (const provider of await cradle.apiKeyStore.providersFor(userId)) {
            await cradle.apiKeyStore.remove(userId, provider);
          }
        },
      },
      {
        // Better-Auth owns credentials + sessions (ADR-0043): erase the account
        // there (removes the credential and every session) by email.
        label: 'auth-credentials',
        erase: async (userId) => {
          const user = await cradle.userRepository.findById(userId);
          if (user) await cradle.authEngine.erase(user.email);
        },
      },
      {
        label: 'password-reset-tokens',
        erase: (userId) => cradle.passwordResetTokenStore.destroyForUser(userId),
      },
      {
        label: 'email-verification-tokens',
        erase: (userId) => cradle.emailVerificationTokenStore.destroyForUser(userId),
      },
      { label: 'usage', erase: (userId) => cradle.usageMeter.removeForUser(userId) },
    ]).singleton(),
    userExportSections: asFunction((cradle): UserExportSection[] => [
      {
        key: 'account',
        collect: async (userId) => {
          const user = await cradle.userRepository.findById(userId);
          return user ? toUserView(user) : null;
        },
      },
      { key: 'mandates', collect: (_userId, scope) => cradle.mandateRepository.list(scope) },
      { key: 'talents', collect: (_userId, scope) => cradle.talentRepository.list(scope) },
      { key: 'placements', collect: (_userId, scope) => cradle.placementRepository.list(scope) },
      {
        key: 'observations',
        collect: (_userId, scope) => cradle.interviewObservationRepository.list(scope),
      },
      {
        key: 'artifactLogs',
        collect: (_userId, scope) => cradle.artifactLogRepository.list(scope),
      },
    ]).singleton(),
    accountService: asClass(AccountService).singleton(),
    passwordResetService: asClass(PasswordResetService).singleton(),
    emailVerificationService: asClass(EmailVerificationService).singleton(),
    mailService: asClass(MailService).singleton(),
    applicationController: asClass(ApplicationController).singleton(),
    jobController: asClass(JobController).singleton(),
    atsController: asClass(AtsController).singleton(),
    savedSearchController: asClass(SavedSearchController).singleton(),
    llmController: asClass(LlmController).singleton(),
    mandateController: asClass(MandateController).singleton(),
    talentController: asClass(TalentController).singleton(),
    placementController: asClass(PlacementController).singleton(),
    candidacyController: asClass(CandidacyController).singleton(),
    retentionController: asClass(RetentionController).singleton(),
    matchController: asClass(MatchController).singleton(),
    matchAiController: asClass(MatchAiController).singleton(),
    usageController: asClass(UsageController).singleton(),
    complianceController: asClass(ComplianceController).singleton(),
    forecastController: asClass(ForecastController).singleton(),
    observationController: asClass(ObservationController).singleton(),
    assistantController: asClass(AssistantController).singleton(),
    artifactController: asClass(ArtifactController).singleton(),
    documentController: asClass(DocumentController).singleton(),
    attachmentController: asClass(AttachmentController).singleton(),
    authController: asClass(AuthController).singleton(),
    membersController: asClass(MembersController).singleton(),
    inviteController: asClass(InviteController).singleton(),
    tenantAdminController: asClass(TenantAdminController).singleton(),
    accountController: asClass(AccountController).singleton(),
    passwordResetController: asClass(PasswordResetController).singleton(),
    mailController: asClass(MailController).singleton(),
  });
  return container;
}
