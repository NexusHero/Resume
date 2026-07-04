import type { AppConfig } from '../config.js';
import type { ApplicationRepository } from '../ports/application-repository.js';
import type { AuditLog } from '../ports/audit-log.js';
import type { SavedSearchRepository } from '../ports/saved-search-repository.js';
import type { MandateRepository } from '../ports/mandate-repository.js';
import type { TalentRepository } from '../ports/talent-repository.js';
import type { PlacementRepository } from '../ports/placement-repository.js';
import type { CandidacyRepository } from '../ports/candidacy-repository.js';
import type { DocumentRepository } from '../ports/document-repository.js';
import type { AttachmentStore } from '../ports/attachment-store.js';
import type { UserRepository } from '../ports/user-repository.js';
import type { SessionStore } from '../ports/session-store.js';
import type { PasswordResetTokenStore } from '../ports/password-reset-token-store.js';
import type { EmailVerificationTokenStore } from '../ports/email-verification-token-store.js';
import type { InviteRepository } from '../ports/invite-repository.js';
import type { TenantRepository } from '../ports/tenant-repository.js';
import type { ApiKeyStore } from '../ports/api-key-store.js';
import type { UsageMeter } from '../ports/usage-meter.js';
import type { InterviewObservationRepository } from '../ports/interview-observation-repository.js';
import type {
  AssistantSettingsStore,
  AssistantSuggestionRepository,
} from '../ports/assistant-store.js';
import type { ArtifactLogRepository } from '../ports/artifact-log-repository.js';
import type { StageTransitionRepository } from '../ports/stage-transition-repository.js';
import type { Clock } from '../ports/clock.js';
import { FsApplicationRepository } from './fs-application-repository.js';
import { FsAuditLog } from './fs-audit-log.js';
import { FsSavedSearchRepository } from './fs-saved-search-repository.js';
import { FsMandateRepository } from './fs-mandate-repository.js';
import { FsTalentRepository } from './fs-talent-repository.js';
import { FsPlacementRepository } from './fs-placement-repository.js';
import { FsCandidacyRepository } from './fs-candidacy-repository.js';
import { FsDocumentRepository } from './fs-document-repository.js';
import { FsAttachmentStore } from './fs-attachment-store.js';
import { FsUserRepository } from './fs-user-repository.js';
import { FsSessionStore } from './fs-session-store.js';
import { FsPasswordResetTokenStore } from './fs-password-reset-token-store.js';
import { FsEmailVerificationTokenStore } from './fs-email-verification-token-store.js';
import { FsInviteRepository } from './fs-invite-repository.js';
import { FsTenantRepository } from './fs-tenant-repository.js';
import { FsApiKeyStore } from './fs-api-key-store.js';
import { FsUsageMeter } from './fs-usage-meter.js';
import { FsInterviewObservationRepository } from './fs-interview-observation-repository.js';
import { FsAssistantSettingsStore, FsAssistantSuggestionRepository } from './fs-assistant-store.js';
import { FsRetentionPolicyStore } from './fs-retention-policy-store.js';
import type { RetentionPolicyStore } from '../ports/retention-policy-store.js';
import { FsArtifactLogRepository } from './fs-artifact-log-repository.js';
import { FsStageTransitionRepository } from './fs-stage-transition-repository.js';
import { SecretCipher } from './secret-cipher.js';
import { SqlApplicationRepository } from './sql/sql-application-repository.js';
import { SqlAuditLog } from './sql/sql-audit-log.js';
import { SqlSavedSearchRepository } from './sql/sql-saved-search-repository.js';
import { SqlMandateRepository } from './sql/sql-mandate-repository.js';
import { SqlTalentRepository } from './sql/sql-talent-repository.js';
import { SqlPlacementRepository } from './sql/sql-placement-repository.js';
import { SqlCandidacyRepository } from './sql/sql-candidacy-repository.js';
import { SqlDocumentRepository } from './sql/sql-document-repository.js';
import { SqlAttachmentStore } from './sql/sql-attachment-store.js';
import { SqlUserRepository } from './sql/sql-user-repository.js';
import { SqlSessionStore } from './sql/sql-session-store.js';
import { SqlPasswordResetTokenStore } from './sql/sql-password-reset-token-store.js';
import { SqlEmailVerificationTokenStore } from './sql/sql-email-verification-token-store.js';
import { SqlInviteRepository } from './sql/sql-invite-repository.js';
import { SqlTenantRepository } from './sql/sql-tenant-repository.js';
import { SqlApiKeyStore } from './sql/sql-api-key-store.js';
import { SqlUsageMeter } from './sql/sql-usage-meter.js';
import { SqlInterviewObservationRepository } from './sql/sql-interview-observation-repository.js';
import {
  SqlAssistantSettingsStore,
  SqlAssistantSuggestionRepository,
} from './sql/sql-assistant-store.js';
import { SqlRetentionPolicyStore } from './sql/sql-retention-policy-store.js';
import { SqlArtifactLogRepository } from './sql/sql-artifact-log-repository.js';
import { SqlStageTransitionRepository } from './sql/sql-stage-transition-repository.js';
import type { Db } from './sql/db.js';

/** The storage ports, resolved to one backend. */
export interface Persistence {
  applicationRepository: ApplicationRepository;
  auditLog: AuditLog;
  savedSearchRepository: SavedSearchRepository;
  mandateRepository: MandateRepository;
  talentRepository: TalentRepository;
  placementRepository: PlacementRepository;
  candidacyRepository: CandidacyRepository;
  documentRepository: DocumentRepository;
  attachmentStore: AttachmentStore;
  userRepository: UserRepository;
  sessionStore: SessionStore;
  passwordResetTokenStore: PasswordResetTokenStore;
  emailVerificationTokenStore: EmailVerificationTokenStore;
  inviteRepository: InviteRepository;
  tenantRepository: TenantRepository;
  apiKeyStore: ApiKeyStore;
  usageMeter: UsageMeter;
  interviewObservationRepository: InterviewObservationRepository;
  assistantSettingsStore: AssistantSettingsStore;
  retentionPolicyStore: RetentionPolicyStore;
  assistantSuggestionRepository: AssistantSuggestionRepository;
  artifactLogRepository: ArtifactLogRepository;
  stageTransitionRepository: StageTransitionRepository;
}

/**
 * Chooses the storage backend from `config.store`. `sql` uses Postgres (requires
 * an open Db handle); anything else falls back to the file-backed adapters — the
 * default, so dev/CI and the offline app keep working with no database.
 */
export function createPersistence(deps: { config: AppConfig; clock: Clock; db?: Db }): Persistence {
  const { config, clock, db } = deps;
  const secretCipher = new SecretCipher({ config });
  if (config.store === 'sql') {
    if (!db) throw new Error('STORE=sql requires a database connection (DATABASE_URL)');
    return {
      applicationRepository: new SqlApplicationRepository({ db }),
      auditLog: new SqlAuditLog({ db }),
      savedSearchRepository: new SqlSavedSearchRepository({ db }),
      mandateRepository: new SqlMandateRepository({ db }),
      talentRepository: new SqlTalentRepository({ db }),
      placementRepository: new SqlPlacementRepository({ db }),
      candidacyRepository: new SqlCandidacyRepository({ db }),
      documentRepository: new SqlDocumentRepository({ db }),
      attachmentStore: new SqlAttachmentStore({ db }),
      userRepository: new SqlUserRepository({ db }),
      sessionStore: new SqlSessionStore({ db, clock, config }),
      passwordResetTokenStore: new SqlPasswordResetTokenStore({ db, clock, config }),
      emailVerificationTokenStore: new SqlEmailVerificationTokenStore({ db, clock, config }),
      inviteRepository: new SqlInviteRepository({ db }),
      tenantRepository: new SqlTenantRepository({ db }),
      apiKeyStore: new SqlApiKeyStore({ db, secretCipher }),
      usageMeter: new SqlUsageMeter({ db }),
      interviewObservationRepository: new SqlInterviewObservationRepository({ db }),
      assistantSettingsStore: new SqlAssistantSettingsStore({ db }),
      retentionPolicyStore: new SqlRetentionPolicyStore({ db }),
      assistantSuggestionRepository: new SqlAssistantSuggestionRepository({ db }),
      artifactLogRepository: new SqlArtifactLogRepository({ db }),
      stageTransitionRepository: new SqlStageTransitionRepository({ db }),
    };
  }
  return {
    applicationRepository: new FsApplicationRepository({ config }),
    auditLog: new FsAuditLog({ config }),
    savedSearchRepository: new FsSavedSearchRepository({ config }),
    mandateRepository: new FsMandateRepository({ config }),
    talentRepository: new FsTalentRepository({ config }),
    placementRepository: new FsPlacementRepository({ config }),
    candidacyRepository: new FsCandidacyRepository({ config }),
    documentRepository: new FsDocumentRepository({ config }),
    attachmentStore: new FsAttachmentStore({ config }),
    userRepository: new FsUserRepository({ config }),
    sessionStore: new FsSessionStore({ config, clock }),
    passwordResetTokenStore: new FsPasswordResetTokenStore({ config, clock }),
    emailVerificationTokenStore: new FsEmailVerificationTokenStore({ config, clock }),
    inviteRepository: new FsInviteRepository({ config }),
    tenantRepository: new FsTenantRepository({ config }),
    apiKeyStore: new FsApiKeyStore({ config, secretCipher }),
    usageMeter: new FsUsageMeter({ config }),
    interviewObservationRepository: new FsInterviewObservationRepository({ config }),
    assistantSettingsStore: new FsAssistantSettingsStore({ config }),
    retentionPolicyStore: new FsRetentionPolicyStore({ config }),
    assistantSuggestionRepository: new FsAssistantSuggestionRepository({ config }),
    artifactLogRepository: new FsArtifactLogRepository({ config }),
    stageTransitionRepository: new FsStageTransitionRepository({ config }),
  };
}
