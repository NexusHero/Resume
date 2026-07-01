import { type Talent, anonymizeTalent } from '../domain/talent';
import { emptyContact } from '../domain/talent-documents';
import {
  type RetentionReviewItem,
  RETENTION_REVIEW_DAYS,
  buildRetentionReport,
} from '../domain/retention';
import { NotFoundError } from '../domain/errors';
import type { TalentRepository } from '../ports/talent-repository';
import type { CandidacyRepository } from '../ports/candidacy-repository';
import type { DocumentRepository } from '../ports/document-repository';
import type { AttachmentStore } from '../ports/attachment-store';
import type { Clock } from '../ports/clock';

export interface RetentionServiceDeps {
  talentRepository: TalentRepository;
  candidacyRepository: CandidacyRepository;
  documentRepository: DocumentRepository;
  attachmentStore: AttachmentStore;
  clock: Clock;
}

/**
 * DSGVO retention. We never auto-delete: instead `report` surfaces candidates
 * whose data is due for review, and `anonymize` strips a candidate's personal
 * data on the admin's decision — keeping non-identifying stats (role, skills,
 * pipeline history) so reporting stays intact.
 */
export class RetentionService {
  private readonly talents: TalentRepository;
  private readonly candidacies: CandidacyRepository;
  private readonly documents: DocumentRepository;
  private readonly attachments: AttachmentStore;
  private readonly clock: Clock;

  constructor(deps: RetentionServiceDeps) {
    this.talents = deps.talentRepository;
    this.candidacies = deps.candidacyRepository;
    this.documents = deps.documentRepository;
    this.attachments = deps.attachmentStore;
    this.clock = deps.clock;
  }

  /** Candidates due for a retention review (no active pipeline, past the window). */
  async report(
    scope: string,
    reviewDays: number = RETENTION_REVIEW_DAYS,
  ): Promise<RetentionReviewItem[]> {
    const talents = await this.talents.list(scope);
    const byTalent = new Map<string, Awaited<ReturnType<CandidacyRepository['listForTalent']>>>();
    for (const t of talents) {
      byTalent.set(t.id, await this.candidacies.listForTalent(scope, t.id));
    }
    return buildRetentionReport(talents, byTalent, this.clock.isoNow(), reviewDays);
  }

  /**
   * Anonymize a candidate (idempotent): clear the talent's identifying fields
   * and its document contact block, and delete the raw attachments (CVs) — the
   * heaviest personal data. Role, skills and pipeline history are kept.
   */
  async anonymize(scope: string, talentId: string): Promise<Talent> {
    const talent = await this.talents.findById(scope, talentId);
    if (!talent) throw new NotFoundError(`Talent ${talentId} not found`);
    if (talent.anonymizedAt) return talent; // already anonymized

    const now = this.clock.isoNow();
    const anonymized = anonymizeTalent(talent, now);
    await this.talents.update(anonymized);

    const documents = await this.documents.get(scope, talentId);
    if (documents) {
      await this.documents.save({ ...documents, contact: { ...emptyContact }, updatedAt: now });
    }
    await this.attachments.removeForTalent(scope, talentId);

    return anonymized;
  }
}
