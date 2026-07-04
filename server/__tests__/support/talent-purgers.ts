import { emptyContact } from '../../src/domain/talent-documents';
import type { TalentDataPurger } from '../../src/ports/talent-data';
import type { DocumentRepository } from '../../src/ports/document-repository';
import type { AttachmentStore } from '../../src/ports/attachment-store';
import type { CandidacyRepository } from '../../src/ports/candidacy-repository';
import type { Clock } from '../../src/ports/clock';

/**
 * The talent-data purge registry as `container.ts` wires it, for tests. Building
 * it from the same shape here keeps the test wiring honest: a purger the app
 * ships is a purger the tests exercise.
 */
export function buildTalentDataPurgers(deps: {
  documentRepository: DocumentRepository;
  attachmentStore: AttachmentStore;
  candidacyRepository: CandidacyRepository;
  clock: Clock;
}): TalentDataPurger[] {
  return [
    {
      label: 'documents',
      purge: async (scope, talentId, mode) => {
        if (mode === 'erase') {
          await deps.documentRepository.removeForTalent(scope, talentId);
          return;
        }
        const documents = await deps.documentRepository.get(scope, talentId);
        if (documents) {
          await deps.documentRepository.save({
            ...documents,
            contact: { ...emptyContact },
            updatedAt: deps.clock.isoNow(),
          });
        }
      },
    },
    {
      label: 'attachments',
      purge: (scope, talentId) => deps.attachmentStore.removeForTalent(scope, talentId),
    },
    {
      label: 'candidacies',
      purge: async (scope, talentId, mode) => {
        if (mode === 'erase') {
          await deps.candidacyRepository.removeForTalent(scope, talentId);
        }
      },
    },
  ];
}
