import { Global, Module } from '@nestjs/common';
import { emptyContact } from '../domain/talent-documents.js';
import { toUserView } from '../domain/user.js';
import type { TalentDataPurger } from '../ports/talent-data.js';
import type { UserErasureStep, UserExportSection } from '../ports/personal-data.js';
import type { DocumentRepository } from '../ports/document-repository.js';
import type { AttachmentStore } from '../ports/attachment-store.js';
import type { CandidacyRepository } from '../ports/candidacy-repository.js';
import type { ApiKeyStore } from '../ports/api-key-store.js';
import type { UserRepository } from '../ports/user-repository.js';
import type { AuthEngine } from '../ports/auth-engine.js';
import type { PasswordResetTokenStore } from '../ports/password-reset-token-store.js';
import type { EmailVerificationTokenStore } from '../ports/email-verification-token-store.js';
import type { UsageMeter } from '../ports/usage-meter.js';
import type { MandateRepository } from '../ports/mandate-repository.js';
import type { TalentRepository } from '../ports/talent-repository.js';
import type { PlacementRepository } from '../ports/placement-repository.js';
import type { ApplicationRepository } from '../ports/application-repository.js';
import type { InterviewObservationRepository } from '../ports/interview-observation-repository.js';
import type { ArtifactLogRepository } from '../ports/artifact-log-repository.js';
import type { Clock } from '../ports/clock.js';
import {
  TALENT_DATA_PURGERS,
  USER_ERASURE_STEPS,
  USER_EXPORT_SECTIONS,
  DOCUMENT_REPOSITORY,
  ATTACHMENT_STORE,
  CANDIDACY_REPOSITORY,
  API_KEY_STORE,
  USER_REPOSITORY,
  AUTH_ENGINE,
  PASSWORD_RESET_TOKEN_STORE,
  EMAIL_VERIFICATION_TOKEN_STORE,
  USAGE_METER,
  MANDATE_REPOSITORY,
  TALENT_REPOSITORY,
  PLACEMENT_REPOSITORY,
  APPLICATION_REPOSITORY,
  INTERVIEW_OBSERVATION_REPOSITORY,
  ARTIFACT_LOG_REPOSITORY,
  CLOCK,
} from './tokens.js';

/**
 * DSGVO registries (ADR-0051) — the cross-container arrays assembled in
 * container.ts. Every store holding a candidate's satellite data contributes one
 * purger that handles both the hard-delete (erase) and the soft anonymize, so the
 * erase/anonymize divergence lives here once. Shared by TalentService.remove and
 * RetentionService.anonymize. The user-level erase/export registries feed the
 * DSGVO account endpoints the same way.
 */
@Global()
@Module({
  providers: [
    {
      provide: TALENT_DATA_PURGERS,
      useFactory: (
        documentRepository: DocumentRepository,
        attachmentStore: AttachmentStore,
        candidacyRepository: CandidacyRepository,
        clock: Clock,
      ): TalentDataPurger[] => [
        {
          label: 'documents',
          purge: async (scope, talentId, mode) => {
            if (mode === 'erase') {
              await documentRepository.removeForTalent(scope, talentId);
              return;
            }
            // anonymize: keep the résumé body, clear the identifying contact block.
            const documents = await documentRepository.get(scope, talentId);
            if (documents) {
              await documentRepository.save({
                ...documents,
                contact: { ...emptyContact },
                updatedAt: clock.isoNow(),
              });
            }
          },
        },
        {
          // Raw CVs are the heaviest personal data — removed on erase and anonymize.
          label: 'attachments',
          purge: (scope, talentId) => attachmentStore.removeForTalent(scope, talentId),
        },
        {
          label: 'candidacies',
          purge: async (scope, talentId, mode) => {
            // erase deletes the pipeline rows; anonymize keeps them as
            // non-identifying history (stats, forecast) — the intended divergence.
            if (mode === 'erase') {
              await candidacyRepository.removeForTalent(scope, talentId);
            }
          },
        },
      ],
      inject: [DOCUMENT_REPOSITORY, ATTACHMENT_STORE, CANDIDACY_REPOSITORY, CLOCK],
    },
    {
      // Every store holding a user's personal rows registers an erasure step, so
      // AccountService.erase iterates the registry instead of hand-listing stores
      // and a forgotten one (as email-verification tokens once were) can't recur.
      provide: USER_ERASURE_STEPS,
      useFactory: (
        apiKeyStore: ApiKeyStore,
        userRepository: UserRepository,
        authEngine: AuthEngine,
        passwordResetTokenStore: PasswordResetTokenStore,
        emailVerificationTokenStore: EmailVerificationTokenStore,
        usageMeter: UsageMeter,
      ): UserErasureStep[] => [
        {
          label: 'api-keys',
          erase: async (userId) => {
            for (const provider of await apiKeyStore.providersFor(userId)) {
              await apiKeyStore.remove(userId, provider);
            }
          },
        },
        {
          // Better-Auth owns credentials + sessions (ADR-0043): erase the account
          // there (removes the credential and every session) by email.
          label: 'auth-credentials',
          erase: async (userId) => {
            const user = await userRepository.findById(userId);
            if (user) await authEngine.erase(user.email);
          },
        },
        {
          label: 'password-reset-tokens',
          erase: (userId) => passwordResetTokenStore.destroyForUser(userId),
        },
        {
          label: 'email-verification-tokens',
          erase: (userId) => emailVerificationTokenStore.destroyForUser(userId),
        },
        { label: 'usage', erase: (userId) => usageMeter.removeForUser(userId) },
      ],
      inject: [
        API_KEY_STORE,
        USER_REPOSITORY,
        AUTH_ENGINE,
        PASSWORD_RESET_TOKEN_STORE,
        EMAIL_VERIFICATION_TOKEN_STORE,
        USAGE_METER,
      ],
    },
    {
      // The DSGVO export mirrors ownership: the caller's account + the team data.
      provide: USER_EXPORT_SECTIONS,
      useFactory: (
        userRepository: UserRepository,
        mandateRepository: MandateRepository,
        talentRepository: TalentRepository,
        placementRepository: PlacementRepository,
        applicationRepository: ApplicationRepository,
        interviewObservationRepository: InterviewObservationRepository,
        artifactLogRepository: ArtifactLogRepository,
      ): UserExportSection[] => [
        {
          key: 'account',
          collect: async (userId) => {
            const user = await userRepository.findById(userId);
            return user ? toUserView(user) : null;
          },
        },
        { key: 'mandates', collect: (_userId, scope) => mandateRepository.list(scope) },
        { key: 'talents', collect: (_userId, scope) => talentRepository.list(scope) },
        { key: 'placements', collect: (_userId, scope) => placementRepository.list(scope) },
        { key: 'applications', collect: (_userId, scope) => applicationRepository.list(scope) },
        {
          key: 'observations',
          collect: (_userId, scope) => interviewObservationRepository.list(scope),
        },
        {
          key: 'artifactLogs',
          collect: (_userId, scope) => artifactLogRepository.list(scope),
        },
      ],
      inject: [
        USER_REPOSITORY,
        MANDATE_REPOSITORY,
        TALENT_REPOSITORY,
        PLACEMENT_REPOSITORY,
        APPLICATION_REPOSITORY,
        INTERVIEW_OBSERVATION_REPOSITORY,
        ARTIFACT_LOG_REPOSITORY,
      ],
    },
  ],
  exports: [TALENT_DATA_PURGERS, USER_ERASURE_STEPS, USER_EXPORT_SECTIONS],
})
export class RegistriesModule {}
