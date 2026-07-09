import { Global, Module } from '@nestjs/common';
import { emptyContact } from '../domain/talent-documents.js';
import type { TalentDataPurger } from '../ports/talent-data.js';
import type { DocumentRepository } from '../ports/document-repository.js';
import type { AttachmentStore } from '../ports/attachment-store.js';
import type { CandidacyRepository } from '../ports/candidacy-repository.js';
import type { Clock } from '../ports/clock.js';
import {
  TALENT_DATA_PURGERS,
  DOCUMENT_REPOSITORY,
  ATTACHMENT_STORE,
  CANDIDACY_REPOSITORY,
  CLOCK,
} from './tokens.js';

/**
 * DSGVO registries (ADR-0051) — the cross-container arrays assembled in
 * container.ts. Every store holding a candidate's satellite data contributes one
 * purger that handles both the hard-delete (erase) and the soft anonymize, so the
 * erase/anonymize divergence lives here once. Shared by TalentService.remove and
 * RetentionService.anonymize. (The user-level erase/export registries are added
 * here when the account slice migrates.)
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
  ],
  exports: [TALENT_DATA_PURGERS],
})
export class RegistriesModule {}
