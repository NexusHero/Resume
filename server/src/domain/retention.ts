import { z } from 'zod';
import type { Talent } from './talent.js';
import type { Candidacy } from './candidacy.js';

/**
 * Default review window: a candidate with no active pipeline for longer than
 * this is flagged in the retention report. Nothing is deleted at this point —
 * the report is a to-do list for an admin, who anonymizes on review.
 */
export const RETENTION_REVIEW_DAYS = 180;

/**
 * Default deletion deadline (Löschfrist): once a candidate has been inactive
 * this long, keeping their personal data is no longer defensible under DSGVO
 * storage limitation (Art. 5(1)(e)). Past it, an item is `overdue` — and the
 * auto-anonymize policy, if enabled, clears it in the background (ADR-0018).
 */
export const RETENTION_DELETION_DAYS = 365;

/** Auto-anonymize is off until an admin turns it on — automation is opt-in. */
export interface RetentionPolicy {
  /** Inactivity (days) after which a candidate is flagged for review. */
  reviewDays: number;
  /** Inactivity (days) after which a candidate is overdue for anonymization. */
  deletionDays: number;
  /** When true, the server anonymizes overdue candidates on a schedule. */
  autoAnonymize: boolean;
}

export const DEFAULT_RETENTION_POLICY: RetentionPolicy = {
  reviewDays: RETENTION_REVIEW_DAYS,
  deletionDays: RETENTION_DELETION_DAYS,
  autoAnonymize: false,
};

/** PUT /api/v1/retention/policy — every field optional. */
export const updateRetentionPolicySchema = z
  .object({
    // The review flag must never fire later than the deletion deadline; the
    // service clamps the pair, so bounds here are only sanity limits.
    reviewDays: z.number().int().min(1).max(3650),
    deletionDays: z.number().int().min(1).max(3650),
    autoAnonymize: z.boolean(),
  })
  .partial();
export type UpdateRetentionPolicyInput = z.infer<typeof updateRetentionPolicySchema>;

/** Candidacy stages that still count as an active pipeline (not terminal). */
const ACTIVE_STAGES = new Set(['sourced', 'screening', 'interview', 'offer']);

const MS_PER_DAY = 86_400_000;

/** One candidate due for a retention review (no active pipeline, past the window). */
export interface RetentionReviewItem {
  talentId: string;
  name: string;
  role: string;
  createdAt: string;
  lastActivity: string; // most recent talent/candidacy update
  inactiveDays: number;
  /** Past the deletion deadline — keeping the data is no longer defensible. */
  overdue: boolean;
}

/**
 * Build the list of candidates due for a retention review: not yet anonymized,
 * with no active candidacy, inactive for at least `reviewDays`. Each item is
 * flagged `overdue` once it passes `deletionDays`. Oldest first. Pure — the
 * service supplies the data and the clock.
 */
export function buildRetentionReport(
  talents: Talent[],
  candidaciesByTalent: Map<string, Candidacy[]>,
  now: string,
  reviewDays: number = RETENTION_REVIEW_DAYS,
  deletionDays: number = RETENTION_DELETION_DAYS,
): RetentionReviewItem[] {
  const nowMs = Date.parse(now);
  const items: RetentionReviewItem[] = [];
  for (const t of talents) {
    if (t.anonymizedAt) continue; // already handled
    const cands = candidaciesByTalent.get(t.id) ?? [];
    if (cands.some((c) => ACTIVE_STAGES.has(c.stage))) continue; // still in play
    const lastActivity =
      [t.updatedAt, ...cands.map((c) => c.updatedAt)].sort().at(-1) ?? t.updatedAt;
    const inactiveDays = Math.max(0, Math.floor((nowMs - Date.parse(lastActivity)) / MS_PER_DAY));
    if (inactiveDays < reviewDays) continue;
    items.push({
      talentId: t.id,
      name: t.name,
      role: t.role,
      createdAt: t.createdAt,
      lastActivity,
      inactiveDays,
      overdue: inactiveDays >= deletionDays,
    });
  }
  return items.sort((a, b) => a.lastActivity.localeCompare(b.lastActivity));
}
