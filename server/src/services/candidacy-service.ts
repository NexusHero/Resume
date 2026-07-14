import {
  type Candidacy,
  type AddCandidacyInput,
  type UpdateCandidacyInput,
  SUBMITTED_STAGES,
  INTERVIEW_STAGES,
} from '../domain/candidacy.js';
import { NotFoundError, ConflictError } from '../domain/errors.js';
import type { StageTransition } from '../domain/stage-history.js';
import type { CandidacyRepository } from '../ports/candidacy-repository.js';
import type { StageTransitionRepository } from '../ports/stage-transition-repository.js';
import type { Logger } from '../ports/logger.js';
import type { MandateRepository } from '../ports/mandate-repository.js';
import type { TalentRepository } from '../ports/talent-repository.js';
import type { PlacementService } from './placement-service.js';
import type { Clock } from '../ports/clock.js';
import type { IdGenerator } from '../ports/id-generator.js';

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
  stageTransitionRepository: StageTransitionRepository;
  clock: Clock;
  idGenerator: IdGenerator;
  logger: Logger;
}

/**
 * The recruiting pipeline: which talents are in a mandate's pipeline and at
 * which stage. Team-scoped: the `ownerId` parameter carries the caller's scope
 * (`currentScope(req)` — the shared team). Enforces that scope + referential
 * integrity (the mandate and talent must exist in the team's data) and blocks
 * duplicate entries.
 */
export class CandidacyService {
  private readonly repo: CandidacyRepository;
  private readonly mandates: MandateRepository;
  private readonly talents: TalentRepository;
  private readonly placements: PlacementService;
  private readonly transitions: StageTransitionRepository;
  private readonly clock: Clock;
  private readonly ids: IdGenerator;
  private readonly logger: Logger;

  constructor(deps: CandidacyServiceDeps) {
    this.repo = deps.candidacyRepository;
    this.mandates = deps.mandateRepository;
    this.talents = deps.talentRepository;
    this.placements = deps.placementService;
    this.transitions = deps.stageTransitionRepository;
    this.clock = deps.clock;
    this.ids = deps.idGenerator;
    this.logger = deps.logger;
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
    await this.logTransition(candidacy, null);
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

  /**
   * Add a talent to a mandate's pipeline, tolerating a concurrent duplicate as
   * a no-op. The autopilot and the assistant both propose/auto-add a talent
   * that a recruiter (or the other automation) may have already added by the
   * time the suggestion is accepted — that race is benign, not an error.
   */
  async addIfAbsent(ownerId: string, mandateId: string, input: AddCandidacyInput): Promise<void> {
    try {
      await this.add(ownerId, mandateId, input);
    } catch (err) {
      if (!(err instanceof ConflictError)) throw err;
    }
  }

  /** Move to a stage / reorder / annotate a candidacy. */
  async update(ownerId: string, id: string, patch: UpdateCandidacyInput): Promise<Candidacy> {
    const existing = await this.repo.findById(ownerId, id);
    if (!existing) throw new NotFoundError(`Candidacy ${id} not found`);
    const updated: Candidacy = { ...existing, ...patch, updatedAt: this.clock.isoNow() };
    await this.repo.update(updated);
    if (updated.stage !== existing.stage) await this.logTransition(updated, existing.stage);
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
   * Feed the prediction flywheel (ADR-0016): every stage change is logged so
   * the forecast can learn the desk's real conversion rates. Logging must
   * never break the pipeline action it observes — failures are swallowed.
   */
  private async logTransition(candidacy: Candidacy, from: StageTransition['from']): Promise<void> {
    try {
      await this.transitions.add({
        id: this.ids.next(),
        ownerId: candidacy.ownerId,
        candidacyId: candidacy.id,
        mandateId: candidacy.mandateId,
        talentId: candidacy.talentId,
        from,
        to: candidacy.stage,
        at: this.clock.isoNow(),
      });
    } catch (err) {
      this.logger.warn(
        { err: err instanceof Error ? err.message : String(err) },
        'stage-transition logging failed',
      );
    }
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
