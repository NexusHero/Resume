import type { Talent } from './talent';
import type { Candidacy } from './candidacy';

/**
 * Default review window: a candidate with no active pipeline for longer than
 * this is flagged in the retention report. Nothing is deleted automatically —
 * the report is a to-do list for an admin, who anonymizes on review.
 */
export const RETENTION_REVIEW_DAYS = 180;

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
}

/**
 * Build the list of candidates due for a retention review: not yet anonymized,
 * with no active candidacy, inactive for at least `reviewDays`. Oldest first.
 * Pure — the service supplies the data and the clock.
 */
export function buildRetentionReport(
  talents: Talent[],
  candidaciesByTalent: Map<string, Candidacy[]>,
  now: string,
  reviewDays: number = RETENTION_REVIEW_DAYS,
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
    });
  }
  return items.sort((a, b) => a.lastActivity.localeCompare(b.lastActivity));
}
