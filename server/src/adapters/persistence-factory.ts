import type { AppConfig } from '../config';
import type { ApplicationRepository } from '../ports/application-repository';
import type { AuditLog } from '../ports/audit-log';
import type { SavedSearchRepository } from '../ports/saved-search-repository';
import type { MandateRepository } from '../ports/mandate-repository';
import type { TalentRepository } from '../ports/talent-repository';
import type { PlacementRepository } from '../ports/placement-repository';
import type { CandidacyRepository } from '../ports/candidacy-repository';
import type { DocumentRepository } from '../ports/document-repository';
import type { AttachmentStore } from '../ports/attachment-store';
import type { UserRepository } from '../ports/user-repository';
import type { SessionStore } from '../ports/session-store';
import type { PasswordResetTokenStore } from '../ports/password-reset-token-store';
import type { EmailVerificationTokenStore } from '../ports/email-verification-token-store';
import type { ApiKeyStore } from '../ports/api-key-store';
import type { UsageMeter } from '../ports/usage-meter';
import type { InterviewObservationRepository } from '../ports/interview-observation-repository';
import type {
  AssistantSettingsStore,
  AssistantSuggestionRepository,
} from '../ports/assistant-store';
import type { ArtifactLogRepository } from '../ports/artifact-log-repository';
import type { StageTransitionRepository } from '../ports/stage-transition-repository';
import type { Clock } from '../ports/clock';
import { FsApplicationRepository } from './fs-application-repository';
import { FsAuditLog } from './fs-audit-log';
import { FsSavedSearchRepository } from './fs-saved-search-repository';
import { FsMandateRepository } from './fs-mandate-repository';
import { FsTalentRepository } from './fs-talent-repository';
import { FsPlacementRepository } from './fs-placement-repository';
import { FsCandidacyRepository } from './fs-candidacy-repository';
import { FsDocumentRepository } from './fs-document-repository';
import { FsAttachmentStore } from './fs-attachment-store';
import { FsUserRepository } from './fs-user-repository';
import { FsSessionStore } from './fs-session-store';
import { FsPasswordResetTokenStore } from './fs-password-reset-token-store';
import { FsEmailVerificationTokenStore } from './fs-email-verification-token-store';
import { FsApiKeyStore } from './fs-api-key-store';
import { FsUsageMeter } from './fs-usage-meter';
import { FsInterviewObservationRepository } from './fs-interview-observation-repository';
import { FsAssistantSettingsStore, FsAssistantSuggestionRepository } from './fs-assistant-store';
import { FsArtifactLogRepository } from './fs-artifact-log-repository';
import { FsStageTransitionRepository } from './fs-stage-transition-repository';
import { SecretCipher } from './secret-cipher';
import { SqlApplicationRepository } from './sql/sql-application-repository';
import { SqlAuditLog } from './sql/sql-audit-log';
import { SqlSavedSearchRepository } from './sql/sql-saved-search-repository';
import { SqlMandateRepository } from './sql/sql-mandate-repository';
import { SqlTalentRepository } from './sql/sql-talent-repository';
import { SqlPlacementRepository } from './sql/sql-placement-repository';
import { SqlCandidacyRepository } from './sql/sql-candidacy-repository';
import { SqlDocumentRepository } from './sql/sql-document-repository';
import { SqlAttachmentStore } from './sql/sql-attachment-store';
import { SqlUserRepository } from './sql/sql-user-repository';
import { SqlSessionStore } from './sql/sql-session-store';
import { SqlPasswordResetTokenStore } from './sql/sql-password-reset-token-store';
import { SqlEmailVerificationTokenStore } from './sql/sql-email-verification-token-store';
import { SqlApiKeyStore } from './sql/sql-api-key-store';
import { SqlUsageMeter } from './sql/sql-usage-meter';
import { SqlInterviewObservationRepository } from './sql/sql-interview-observation-repository';
import {
  SqlAssistantSettingsStore,
  SqlAssistantSuggestionRepository,
} from './sql/sql-assistant-store';
import { SqlArtifactLogRepository } from './sql/sql-artifact-log-repository';
import { SqlStageTransitionRepository } from './sql/sql-stage-transition-repository';
import type { Db } from './sql/db';

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
  apiKeyStore: ApiKeyStore;
  usageMeter: UsageMeter;
  interviewObservationRepository: InterviewObservationRepository;
  assistantSettingsStore: AssistantSettingsStore;
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
      apiKeyStore: new SqlApiKeyStore({ db, secretCipher }),
      usageMeter: new SqlUsageMeter({ db }),
      interviewObservationRepository: new SqlInterviewObservationRepository({ db }),
      assistantSettingsStore: new SqlAssistantSettingsStore({ db }),
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
    apiKeyStore: new FsApiKeyStore({ config, secretCipher }),
    usageMeter: new FsUsageMeter({ config }),
    interviewObservationRepository: new FsInterviewObservationRepository({ config }),
    assistantSettingsStore: new FsAssistantSettingsStore({ config }),
    assistantSuggestionRepository: new FsAssistantSuggestionRepository({ config }),
    artifactLogRepository: new FsArtifactLogRepository({ config }),
    stageTransitionRepository: new FsStageTransitionRepository({ config }),
  };
}
