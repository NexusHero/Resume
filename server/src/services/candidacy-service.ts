import {
  type Candidacy,
  type AddCandidacyInput,
  type UpdateCandidacyInput,
  SUBMITTED_STAGES,
  INTERVIEW_STAGES,
} from '../domain/candidacy';
import { NotFoundError, ConflictError } from '../domain/errors';
import type { CandidacyRepository } from '../ports/candidacy-repository';
import type { MandateRepository } from '../ports/mandate-repository';
import type { TalentRepository } from '../ports/talent-repository';
import type { PlacementService } from './placement-service';
import type { Clock } from '../ports/clock';
import type { IdGenerator } from '../ports/id-generator';

/** A candidacy plus the talent summary the board needs to render a card. */
export interface CandidacyCard extends Candidacy {
  talent: { id: string; name: string; role: string; headline: string; location: string } | null;
}

/** A candidacy plus the mandate summary, for the talent's "in these mandates" view. */
export interface CandidacyForTalent extends Candidacy {
  mandate: { id: string; client: string; role: string; status: string } | null;
}

export interface CandidacyServiceDeps {
  candidacyRepository: CandidacyRepository;
  mandateRepository: MandateRepository;
  talentRepository: TalentRepository;
  placementService: PlacementService;
  clock: Clock;
  idGenerator: IdGenerator;
}

/**
 * The recruiting pipeline: which talents are in a mandate's pipeline and at
 * which stage. Enforces owner scope + referential integrity (the mandate and
 * talent must exist and be owned by the caller) and blocks duplicate entries.
 */
export class CandidacyService {
  private readonly repo: CandidacyRepository;
  private readonly mandates: MandateRepository;
  private readonly talents: TalentRepository;
  private readonly placements: PlacementService;
  private readonly clock: Clock;
  private readonly ids: IdGenerator;

  constructor(deps: CandidacyServiceDeps) {
    this.repo = deps.candidacyRepository;
    this.mandates = deps.mandateRepository;
    this.talents = deps.talentRepository;
    this.placements = deps.placementService;
    this.clock = deps.clock;
    this.ids = deps.idGenerator;
  }

  /** The board for a mandate: every candidacy enriched with its talent summary. */
  async board(ownerId: string, mandateId: string): Promise<CandidacyCard[]> {
    await this.requireMandate(ownerId, mandateId);
    const rows = await this.repo.listForMandate(ownerId, mandateId);
    const cards = await Promise.all(
      rows.map(async (c) => {
        const talent = await this.talents.findById(ownerId, c.talentId);
        return {
          ...c,
          talent: talent
            ? {
                id: talent.id,
                name: talent.name,
                role: talent.role,
                headline: talent.headline,
                location: talent.location,
              }
            : null,
        };
      }),
    );
    return cards.sort((a, b) => a.order - b.order);
  }

  /** The mandates a talent is currently a candidate for. */
  async forTalent(ownerId: string, talentId: string): Promise<CandidacyForTalent[]> {
    await this.requireTalent(ownerId, talentId);
    const rows = await this.repo.listForTalent(ownerId, talentId);
    return Promise.all(
      rows.map(async (c) => {
        const mandate = await this.mandates.findById(ownerId, c.mandateId);
        return {
          ...c,
          mandate: mandate
            ? { id: mandate.id, client: mandate.client, role: mandate.role, status: mandate.status }
            : null,
        };
      }),
    );
  }

  /** Add a talent to a mandate's pipeline (idempotency guarded — no duplicates). */
  async add(ownerId: string, mandateId: string, input: AddCandidacyInput): Promise<CandidacyCard> {
    await this.requireMandate(ownerId, mandateId);
    const talent = await this.talents.findById(ownerId, input.talentId);
    if (!talent) throw new NotFoundError(`Talent ${input.talentId} not found`);

    const existing = await this.repo.findByMandateAndTalent(ownerId, mandateId, input.talentId);
    if (existing) throw new ConflictError('Talent is already in this mandate pipeline');

    const inStage = (await this.repo.listForMandate(ownerId, mandateId)).filter(
      (c) => c.stage === input.stage,
    ).length;
    const now = this.clock.isoNow();
    const candidacy: Candidacy = {
      id: this.ids.next(),
      ownerId,
      mandateId,
      talentId: input.talentId,
      stage: input.stage,
      note: input.note,
      order: inStage,
      createdAt: now,
      updatedAt: now,
    };
    await this.repo.add(candidacy);
    await this.syncMandateCounts(ownerId, mandateId);
    return {
      ...candidacy,
      talent: {
        id: talent.id,
        name: talent.name,
        role: talent.role,
        headline: talent.headline,
        location: talent.location,
      },
    };
  }

  /** Move to a stage / reorder / annotate a candidacy. */
  async update(ownerId: string, id: string, patch: UpdateCandidacyInput): Promise<Candidacy> {
    const existing = await this.repo.findById(ownerId, id);
    if (!existing) throw new NotFoundError(`Candidacy ${id} not found`);
    const updated: Candidacy = { ...existing, ...patch, updatedAt: this.clock.isoNow() };
    await this.repo.update(updated);
    // Reaching 'placed' for the first time books a placement from the facts.
    if (updated.stage === 'placed' && existing.stage !== 'placed') {
      await this.bookPlacement(ownerId, updated);
    }
    await this.syncMandateCounts(ownerId, updated.mandateId);
    return updated;
  }

  async remove(ownerId: string, id: string): Promise<void> {
    const existing = await this.repo.findById(ownerId, id);
    const removed = await this.repo.remove(ownerId, id);
    if (!removed) throw new NotFoundError(`Candidacy ${id} not found`);
    if (existing) await this.syncMandateCounts(ownerId, existing.mandateId);
  }

  /**
   * Book a placement when a candidate is marked placed — assembled from the
   * talent and mandate so the recruiter doesn't re-key it. Skips silently if
   * either has since been removed (nothing meaningful to record).
   */
  private async bookPlacement(ownerId: string, candidacy: Candidacy): Promise<void> {
    const [talent, mandate] = await Promise.all([
      this.talents.findById(ownerId, candidacy.talentId),
      this.mandates.findById(ownerId, candidacy.mandateId),
    ]);
    if (!talent || !mandate) return;
    await this.placements.create(ownerId, {
      candidateName: talent.name,
      candidateRole: talent.role || mandate.role,
      client: mandate.client,
      start: '',
      fee: mandate.fee,
      status: 'probation',
    });
  }

  /**
   * Keep the mandate's submitted/interview counters in sync with its board:
   * submitted = candidacies past the longlist, interviews = those at interview+.
   * The board is the source of truth for these numbers.
   */
  private async syncMandateCounts(ownerId: string, mandateId: string): Promise<void> {
    const mandate = await this.mandates.findById(ownerId, mandateId);
    if (!mandate) return;
    const rows = await this.repo.listForMandate(ownerId, mandateId);
    const submitted = rows.filter((c) => SUBMITTED_STAGES.includes(c.stage)).length;
    const interviews = rows.filter((c) => INTERVIEW_STAGES.includes(c.stage)).length;
    if (mandate.submitted !== submitted || mandate.interviews !== interviews) {
      await this.mandates.update({
        ...mandate,
        submitted,
        interviews,
        updatedAt: this.clock.isoNow(),
      });
    }
  }

  private async requireMandate(ownerId: string, mandateId: string): Promise<void> {
    if (!(await this.mandates.findById(ownerId, mandateId)))
      throw new NotFoundError(`Mandate ${mandateId} not found`);
  }

  private async requireTalent(ownerId: string, talentId: string): Promise<void> {
    if (!(await this.talents.findById(ownerId, talentId)))
      throw new NotFoundError(`Talent ${talentId} not found`);
  }
}
