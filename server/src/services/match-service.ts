import { type TalentMatch, scoreTalent } from '../domain/match';
import { NotFoundError } from '../domain/errors';
import type { MandateRepository } from '../ports/mandate-repository';
import type { TalentRepository } from '../ports/talent-repository';
import type { DocumentRepository } from '../ports/document-repository';
import type { CandidacyRepository } from '../ports/candidacy-repository';

export interface MatchServiceDeps {
  mandateRepository: MandateRepository;
  talentRepository: TalentRepository;
  documentRepository: DocumentRepository;
  candidacyRepository: CandidacyRepository;
}

/**
 * Mandate → shortlist: rank the shared talent pool against a mandate so the
 * recruiter turns a search into a ranked candidate list in one step. Scoring is
 * deterministic (always works); the caller can then add the top picks to the
 * pipeline and generate dossier/pitch/outreach from them.
 */
export class MatchService {
  private readonly mandates: MandateRepository;
  private readonly talents: TalentRepository;
  private readonly documents: DocumentRepository;
  private readonly candidacies: CandidacyRepository;

  constructor(deps: MatchServiceDeps) {
    this.mandates = deps.mandateRepository;
    this.talents = deps.talentRepository;
    this.documents = deps.documentRepository;
    this.candidacies = deps.candidacyRepository;
  }

  async rankForMandate(
    scope: string,
    mandateId: string,
    jobText: string,
    limit: number,
  ): Promise<TalentMatch[]> {
    const mandate = await this.mandates.findById(scope, mandateId);
    if (!mandate) throw new NotFoundError(`Mandate ${mandateId} not found`);

    // Fall back to matching on the mandate itself when no ad text is given.
    const query = jobText.trim() || `${mandate.role} ${mandate.location}`;

    const [talents, pipeline] = await Promise.all([
      this.talents.list(scope),
      this.candidacies.listForMandate(scope, mandateId),
    ]);
    const inPipeline = new Set(pipeline.map((c) => c.talentId));

    const matches = await Promise.all(
      talents
        .filter((t) => !t.anonymizedAt) // no identifiable data to present
        .map(async (t) => {
          const documents = await this.documents.get(scope, t.id);
          const { score, matched } = scoreTalent(t, documents, query);
          return {
            talentId: t.id,
            name: t.name,
            role: t.role,
            location: t.location,
            score,
            matched,
            inPipeline: inPipeline.has(t.id),
          };
        }),
    );

    return matches
      .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name))
      .slice(0, limit);
  }
}
