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
export const ASSISTANT_STORE = Symbol('AssistantStore');
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

// --- Composition values (not ports, but injected) ---
export const CONFIG = Symbol('AppConfig');
export const CANDIDATE_PROFILE = Symbol('CandidateProfile');
export const SKILL_EXTRACTOR_ONTOLOGY = Symbol('SkillExtractorOntology');
/** Registry arrays assembled in the composition root (ports/personal-data). */
export const USER_ERASURE_STEPS = Symbol('UserErasureSteps');
export const USER_EXPORT_SECTIONS = Symbol('UserExportSections');
