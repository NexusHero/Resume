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
import { ScryptPasswordHasher } from './adapters/scrypt-password-hasher';
import { createMailer } from './adapters/mailer-factory';
import { createPersistence } from './adapters/persistence-factory';
import type { Db } from './adapters/sql/db';
import { GitVersioner } from './adapters/git-versioner';
import { NoopVersioner } from './adapters/noop-versioner';
import { PuppeteerPdfRenderer } from './adapters/puppeteer-pdf-renderer';
import { PdfLibMerger } from './adapters/pdf-lib-merger';
import { PdfjsTextExtractor } from './adapters/pdfjs-text-extractor';
import { createJobSource } from './adapters/job-source-factory';
import { nodeFetch } from './adapters/node-fetch';
import { KeywordSkillExtractor } from './adapters/keyword-skill-extractor';
import { AnthropicLlmProvider } from './adapters/anthropic-llm-provider';
import { GeminiLlmProvider } from './adapters/gemini-llm-provider';
import { RoleAuthorizer } from './adapters/role-authorizer';
import { ApplicationService } from './services/application-service';
import { JobSearchService } from './services/job-search-service';
import { AtsService } from './services/ats-service';
import { SavedSearchService } from './services/saved-search-service';
import { LlmService } from './services/llm-service';
import { CoverLetterService } from './services/cover-letter-service';
import { MandateService } from './services/mandate-service';
import { TalentService } from './services/talent-service';
import { PlacementService } from './services/placement-service';
import { CandidacyService } from './services/candidacy-service';
import { RetentionService } from './services/retention-service';
import { MatchService } from './services/match-service';
import { UsageService } from './services/usage-service';
import { ForecastService } from './services/forecast-service';
import { InterviewObservationService } from './services/interview-observation-service';
import { DocumentService } from './services/document-service';
import { DocumentAiService } from './services/document-ai-service';
import { AttachmentService } from './services/attachment-service';
import { AuthService } from './services/auth-service';
import { MembersService } from './services/members-service';
import { AccountService } from './services/account-service';
import { PasswordResetService } from './services/password-reset-service';
import { EmailVerificationService } from './services/email-verification-service';
import { ApplicationController } from './http/application-controller';
import { JobController } from './http/job-controller';
import { AtsController } from './http/ats-controller';
import { SavedSearchController } from './http/saved-search-controller';
import { LlmController } from './http/llm-controller';
import { MandateController } from './http/mandate-controller';
import { TalentController } from './http/talent-controller';
import { PlacementController } from './http/placement-controller';
import { CandidacyController } from './http/candidacy-controller';
import { RetentionController } from './http/retention-controller';
import { MatchController } from './http/match-controller';
import { MatchAiController } from './http/match-ai-controller';
import { UsageController } from './http/usage-controller';
import { ComplianceController } from './http/compliance-controller';
import { ForecastController } from './http/forecast-controller';
import { ObservationController } from './http/observation-controller';
import { DocumentController } from './http/document-controller';
import { AttachmentController } from './http/attachment-controller';
import { AuthController } from './http/auth-controller';
import { MembersController } from './http/members-controller';
import { AccountController } from './http/account-controller';
import { PasswordResetController } from './http/password-reset-controller';

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
    apiKeyStore: asValue(persistence.apiKeyStore),
    usageMeter: asValue(persistence.usageMeter),
    interviewObservationRepository: asValue(persistence.interviewObservationRepository),
    passwordHasher: asClass(ScryptPasswordHasher).singleton(),
    // Transactional email: console by default, SMTP (nodemailer) when configured.
    mailer: asFunction(({ config: c, logger }) => createMailer({ config: c, logger })).singleton(),
    pdfArchive: asClass(FsPdfArchive).singleton(),
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
    talentService: asClass(TalentService).singleton(),
    placementService: asClass(PlacementService).singleton(),
    candidacyService: asClass(CandidacyService).singleton(),
    retentionService: asClass(RetentionService).singleton(),
    matchService: asClass(MatchService).singleton(),
    usageService: asClass(UsageService).singleton(),
    forecastService: asClass(ForecastService).singleton(),
    interviewObservationService: asClass(InterviewObservationService).singleton(),
    documentService: asClass(DocumentService).singleton(),
    documentAiService: asClass(DocumentAiService).singleton(),
    attachmentService: asClass(AttachmentService).singleton(),
    authService: asClass(AuthService).singleton(),
    membersService: asClass(MembersService).singleton(),
    accountService: asClass(AccountService).singleton(),
    passwordResetService: asClass(PasswordResetService).singleton(),
    emailVerificationService: asClass(EmailVerificationService).singleton(),
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
    documentController: asClass(DocumentController).singleton(),
    attachmentController: asClass(AttachmentController).singleton(),
    authController: asClass(AuthController).singleton(),
    membersController: asClass(MembersController).singleton(),
    accountController: asClass(AccountController).singleton(),
    passwordResetController: asClass(PasswordResetController).singleton(),
  });
  return container;
}
