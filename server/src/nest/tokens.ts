/**
 * NestJS injection tokens (ADR-0051). Our ports are TypeScript interfaces, which
 * are erased at runtime, so Nest cannot resolve them by type. Each port gets a
 * `Symbol` token here; a module binds it with `{ provide: TOKEN, useClass: … }`
 * and a consumer reads it with `@Inject(TOKEN)`. A handful of non-port
 * composition values (config, the candidate profile, the personal-data registry
 * arrays) get tokens too, since they are `useValue`/`useFactory` providers.
 *
 * Keep this list in sync with `server/src/ports/*`.
 */

// --- Ports ---
export const API_KEY_STORE = Symbol('ApiKeyStore');
export const APPLICATION_REPOSITORY = Symbol('ApplicationRepository');
export const ARTIFACT_LOG_REPOSITORY = Symbol('ArtifactLogRepository');
export const ASSISTANT_SETTINGS_STORE = Symbol('AssistantSettingsStore');
export const ASSISTANT_SUGGESTION_REPOSITORY = Symbol('AssistantSuggestionRepository');
export const ATTACHMENT_STORE = Symbol('AttachmentStore');
export const AUDIT_LOG = Symbol('AuditLog');
export const AUTH_ENGINE = Symbol('AuthEngine');
export const AUTHORIZER = Symbol('Authorizer');
export const CANDIDACY_REPOSITORY = Symbol('CandidacyRepository');
export const CLOCK = Symbol('Clock');
export const DOCUMENT_REPOSITORY = Symbol('DocumentRepository');
export const EMAIL_VERIFICATION_TOKEN_STORE = Symbol('EmailVerificationTokenStore');
export const EMBEDDING_PROVIDER = Symbol('EmbeddingProvider');
export const HTTP_FETCH = Symbol('HttpFetch');
export const ID_GENERATOR = Symbol('IdGenerator');
export const INBOX_SOURCE = Symbol('InboxSource');
export const INTERVIEW_OBSERVATION_REPOSITORY = Symbol('InterviewObservationRepository');
export const INVITE_REPOSITORY = Symbol('InviteRepository');
export const JOB_SOURCE = Symbol('JobSource');
export const LLM_PROVIDER = Symbol('LlmProvider');
export const LOGGER = Symbol('Logger');
export const MAILER = Symbol('Mailer');
export const MANDATE_REPOSITORY = Symbol('MandateRepository');
export const PASSWORD_RESET_TOKEN_STORE = Symbol('PasswordResetTokenStore');
export const PDF_ARCHIVE = Symbol('PdfArchive');
export const PDF_MERGER = Symbol('PdfMerger');
export const PDF_RENDERER = Symbol('PdfRenderer');
export const PDF_TEXT_EXTRACTOR = Symbol('PdfTextExtractor');
export const PLACEMENT_REPOSITORY = Symbol('PlacementRepository');
export const PLAN_PROVIDER = Symbol('PlanProvider');
export const RETENTION_POLICY_STORE = Symbol('RetentionPolicyStore');
export const SAVED_SEARCH_REPOSITORY = Symbol('SavedSearchRepository');
export const SCHEDULER_LOCK = Symbol('SchedulerLock');
export const SKILL_EXTRACTOR = Symbol('SkillExtractor');
export const STAGE_TRANSITION_REPOSITORY = Symbol('StageTransitionRepository');
export const TALENT_REPOSITORY = Symbol('TalentRepository');
export const TENANT_REPOSITORY = Symbol('TenantRepository');
export const USAGE_METER = Symbol('UsageMeter');
export const USER_REPOSITORY = Symbol('UserRepository');
export const VERSIONER = Symbol('Versioner');

// --- Composed services (built via useFactory, referenced by controllers) ---
export const AUTH_SERVICE = Symbol('AuthService');
export const EMAIL_VERIFICATION_SERVICE = Symbol('EmailVerificationService');
export const JOB_SEARCH_SERVICE = Symbol('JobSearchService');
export const LLM_SERVICE = Symbol('LlmService');
export const MANDATE_SERVICE = Symbol('MandateService');
export const PLACEMENT_SERVICE = Symbol('PlacementService');
export const CANDIDACY_SERVICE = Symbol('CandidacyService');
export const ATS_SERVICE = Symbol('AtsService');
export const SAVED_SEARCH_SERVICE = Symbol('SavedSearchService');
export const FORECAST_SERVICE = Symbol('ForecastService');
export const INTERVIEW_OBSERVATION_SERVICE = Symbol('InterviewObservationService');
export const USAGE_SERVICE = Symbol('UsageService');

// --- Composition values (not ports, but injected) ---
export const CONFIG = Symbol('AppConfig');
/** The assembled persistence bundle (fs or sql); repos are re-exported per token. */
export const PERSISTENCE = Symbol('Persistence');
/** The Drizzle DB handle, present only when STORE=sql. */
export const DB = Symbol('Db');
export const CANDIDATE_PROFILE = Symbol('CandidateProfile');
export const CANDIDATE = Symbol('CandidateIdentity');
export const SKILL_EXTRACTOR_ONTOLOGY = Symbol('SkillExtractorOntology');
/** Registry arrays assembled in the composition root (ports/personal-data, talent-data). */
export const USER_ERASURE_STEPS = Symbol('UserErasureSteps');
export const USER_EXPORT_SECTIONS = Symbol('UserExportSections');
export const TALENT_DATA_PURGERS = Symbol('TalentDataPurgers');

// --- More composed services ---
export const TALENT_SERVICE = Symbol('TalentService');
export const TALENT_IMPORT_SERVICE = Symbol('TalentImportService');
export const APPLICATION_SERVICE = Symbol('ApplicationService');
export const MEMBERS_SERVICE = Symbol('MembersService');
export const INVITE_SERVICE = Symbol('InviteService');
export const TENANT_SERVICE = Symbol('TenantService');
export const DOCUMENT_SERVICE = Symbol('DocumentService');
export const ATTACHMENT_SERVICE = Symbol('AttachmentService');
export const PASSWORD_RESET_SERVICE = Symbol('PasswordResetService');
export const MAIL_SERVICE = Symbol('MailService');
export const MATCH_SERVICE = Symbol('MatchService');
export const RETENTION_SERVICE = Symbol('RetentionService');
export const ACCOUNT_SERVICE = Symbol('AccountService');
export const APPLICATION_BUILDER = Symbol('ApplicationBuilder');
export const AUTOPILOT_SERVICE = Symbol('AutopilotService');
export const ASSISTANT_SERVICE = Symbol('AssistantService');
// AI feature services (behind the shared LlmFeatureRunner, ADR-0022)
export const LLM_FEATURE_RUNNER = Symbol('LlmFeatureRunner');
export const DOCUMENT_ASSIST_SERVICE = Symbol('DocumentAssistService');
export const CV_PARSE_SERVICE = Symbol('CvParseService');
export const ATS_AI_SERVICE = Symbol('AtsAiService');
export const OUTREACH_AI_SERVICE = Symbol('OutreachAiService');
export const MATCH_AI_SERVICE = Symbol('MatchAiService');
export const DOCUMENT_AI_SERVICE = Symbol('DocumentAiService');
export const COVER_LETTER_SERVICE = Symbol('CoverLetterService');
