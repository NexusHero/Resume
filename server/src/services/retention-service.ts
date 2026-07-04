import { type Talent, anonymizeTalent } from '../domain/talent';
import {
  type RetentionReviewItem,
  type RetentionPolicy,
  type UpdateRetentionPolicyInput,
  DEFAULT_RETENTION_POLICY,
  buildRetentionReport,
} from '../domain/retention';
import { NotFoundError } from '../domain/errors';
import type { TalentRepository } from '../ports/talent-repository';
import type { CandidacyRepository } from '../ports/candidacy-repository';
import type { TalentDataPurger } from '../ports/talent-data';
import type { RetentionPolicyStore } from '../ports/retention-policy-store';
import type { Clock } from '../ports/clock';
import type { Logger } from '../ports/logger';

export interface RetentionServiceDeps {
  talentRepository: TalentRepository;
  candidacyRepository: CandidacyRepository;
  talentDataPurgers: TalentDataPurger[];
  retentionPolicyStore: RetentionPolicyStore;
  clock: Clock;
  logger: Logger;
}

/** What one auto/bulk anonymization pass did. */
export interface AnonymizeSweepResult {
  /** Overdue candidates considered. */
  overdue: number;
  /** …of which were anonymized this pass (idempotent — already-clean are skipped). */
  anonymized: number;
  talentIds: string[];
}

/**
 * DSGVO retention (ADR-0018). The report surfaces candidates due for review
 * and, past the deletion deadline (Löschfrist), overdue for anonymization.
 * Anonymization never hard-deletes: it strips identifying fields and raw CVs
 * but keeps non-identifying stats (role, skills, pipeline history). A
 * persisted policy can enable a background sweep so overdue data clears
 * itself; without it, an admin anonymizes on review (single or in bulk).
 */
export class RetentionService {
  private readonly talents: TalentRepository;
  private readonly candidacies: CandidacyRepository;
  private readonly purgers: TalentDataPurger[];
  private readonly policies: RetentionPolicyStore;
  private readonly clock: Clock;
  private readonly logger: Logger;

  constructor(deps: RetentionServiceDeps) {
    this.talents = deps.talentRepository;
    this.candidacies = deps.candidacyRepository;
    this.purgers = deps.talentDataPurgers;
    this.policies = deps.retentionPolicyStore;
    this.clock = deps.clock;
    this.logger = deps.logger;
  }

  /** The team's policy, falling back to the defaults until one is stored. */
  async getPolicy(scope: string): Promise<RetentionPolicy> {
    return (await this.policies.get(scope)) ?? { ...DEFAULT_RETENTION_POLICY };
  }

  /**
   * Update the policy. The review flag must never fire after the deletion
   * deadline, so a review window longer than the deadline is clamped down.
   */
  async updatePolicy(scope: string, patch: UpdateRetentionPolicyInput): Promise<RetentionPolicy> {
    const current = await this.getPolicy(scope);
    const next: RetentionPolicy = { ...current, ...patch };
    next.reviewDays = Math.min(next.reviewDays, next.deletionDays);
    await this.policies.set(scope, next);
    return next;
  }

  /**
   * Candidates due for a retention review (no active pipeline, past the review
   * window), each flagged `overdue` past the deletion deadline. `reviewDays`
   * overrides the policy for an ad-hoc report; the deletion deadline always
   * comes from the policy.
   */
  async report(scope: string, reviewDays?: number): Promise<RetentionReviewItem[]> {
    const policy = await this.getPolicy(scope);
    const talents = await this.talents.list(scope);
    const byTalent = new Map<string, Awaited<ReturnType<CandidacyRepository['listForTalent']>>>();
    for (const t of talents) {
      byTalent.set(t.id, await this.candidacies.listForTalent(scope, t.id));
    }
    return buildRetentionReport(
      talents,
      byTalent,
      this.clock.isoNow(),
      reviewDays ?? policy.reviewDays,
      policy.deletionDays,
    );
  }

  /**
   * Anonymize a candidate (idempotent): clear the talent's identifying fields,
   * then run every registered talent-data purger in `anonymize` mode — which
   * clears the document contact block and deletes the raw attachments (the
   * heaviest personal data) while keeping the résumé body and the pipeline
   * history. Role, skills and non-identifying stats are kept.
   */
  async anonymize(scope: string, talentId: string): Promise<Talent> {
    const talent = await this.talents.findById(scope, talentId);
    if (!talent) throw new NotFoundError(`Talent ${talentId} not found`);
    if (talent.anonymizedAt) return talent; // already anonymized

    const anonymized = anonymizeTalent(talent, this.clock.isoNow());
    await this.talents.update(anonymized);
    for (const purger of this.purgers) {
      await purger.purge(scope, talentId, 'anonymize');
    }
    return anonymized;
  }

  /**
   * Anonymize every candidate past the deletion deadline in one pass — the
   * one-click "clear overdue" for an admin, and the engine behind the
   * scheduled sweep.
   */
  async anonymizeOverdue(scope: string): Promise<AnonymizeSweepResult> {
    const overdue = (await this.report(scope)).filter((i) => i.overdue);
    const talentIds: string[] = [];
    for (const item of overdue) {
      await this.anonymize(scope, item.talentId);
      talentIds.push(item.talentId);
    }
    if (talentIds.length > 0) {
      this.logger.info({ count: talentIds.length }, 'retention: anonymized overdue candidates');
    }
    return { overdue: overdue.length, anonymized: talentIds.length, talentIds };
  }

  /** Scheduler entry point: runs the sweep only when the policy opts in; never throws. */
  async runAutoAnonymizeIfDue(scope: string): Promise<void> {
    try {
      const policy = await this.getPolicy(scope);
      if (!policy.autoAnonymize) return;
      await this.anonymizeOverdue(scope);
    } catch (err) {
      this.logger.warn(
        { err: err instanceof Error ? err.message : String(err) },
        'retention auto-anonymize sweep failed',
      );
    }
  }
}
