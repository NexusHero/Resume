import { z } from 'zod';
import type { Candidacy } from './candidacy';

/**
 * The assistant: an in-process agent that prepares the desk — it ranks the
 * pool against active mandates, spots stalled candidacies and data gaps, and
 * stages everything as reviewable suggestions. It is a second driver of the
 * same application services the HTTP layer uses (ADR-0013); its autonomy is
 * bounded by design: internal + reversible actions at most, nothing
 * outward-facing, nothing destructive.
 */

export const ASSISTANT_MODES = ['suggest', 'act'] as const;
export type AssistantMode = (typeof ASSISTANT_MODES)[number];

export interface AssistantSettings {
  /** Master switch — off means the scheduler never runs for this team. */
  enabled: boolean;
  /**
   * 'suggest' stages everything for review; 'act' lets the assistant apply
   * internal, reversible actions itself (e.g. add a match to the pipeline),
   * visibly marked as auto-applied. Outward-facing or destructive actions are
   * never taken in either mode.
   */
  mode: AssistantMode;
  /** Scheduler cadence; the manual "Run now" ignores it. */
  intervalMinutes: number;
  lastRunAt?: string; // ISO 8601
}

export const DEFAULT_ASSISTANT_SETTINGS: AssistantSettings = {
  enabled: false,
  mode: 'suggest',
  intervalMinutes: 60,
};

/** PUT /api/v1/assistant — partial settings update. */
export const updateAssistantSettingsSchema = z.object({
  enabled: z.boolean().optional(),
  mode: z.enum(ASSISTANT_MODES).optional(),
  intervalMinutes: z
    .number()
    .int()
    .min(15, 'minimum interval is 15 minutes')
    .max(24 * 60)
    .optional(),
});
export type UpdateAssistantSettingsInput = z.infer<typeof updateAssistantSettingsSchema>;

export const SUGGESTION_KINDS = ['shortlist-add', 'follow-up', 'data-gap'] as const;
export type SuggestionKind = (typeof SUGGESTION_KINDS)[number];

export const SUGGESTION_STATUSES = ['proposed', 'accepted', 'dismissed', 'auto-applied'] as const;
export type SuggestionStatus = (typeof SUGGESTION_STATUSES)[number];

/** One reviewable unit of assistant work — the queue the recruiter approves. */
export interface AssistantSuggestion {
  id: string;
  ownerId: string; // team scope
  kind: SuggestionKind;
  title: string;
  /** Why the assistant proposes this — shown verbatim in the queue. */
  rationale: string;
  mandateId?: string;
  talentId?: string;
  /** Kind-specific extras (e.g. match score + matched skills). */
  payload: Record<string, unknown>;
  status: SuggestionStatus;
  createdAt: string; // ISO 8601
  resolvedAt?: string;
  runId: string;
}

/**
 * Dedup key: one open/answered suggestion per (kind, mandate, talent). A
 * dismissed suggestion also blocks re-proposing — the assistant must not nag.
 */
export function suggestionKey(s: Pick<AssistantSuggestion, 'kind' | 'mandateId' | 'talentId'>) {
  return `${s.kind}|${s.mandateId ?? ''}|${s.talentId ?? ''}`;
}

const STALE_EXEMPT_STAGES: Candidacy['stage'][] = ['placed', 'rejected'];

/** Full days a candidacy has sat untouched in a non-terminal stage; -1 if terminal. */
export function daysStale(candidacy: Candidacy, nowIso: string): number {
  if (STALE_EXEMPT_STAGES.includes(candidacy.stage)) return -1;
  const ms = Date.parse(nowIso) - Date.parse(candidacy.updatedAt);
  return Math.floor(ms / 86_400_000);
}

/** A candidacy the recruiter probably lost track of. */
export function isStale(candidacy: Candidacy, nowIso: string, staleAfterDays = 7): boolean {
  return daysStale(candidacy, nowIso) >= staleAfterDays;
}

/** Is the assistant due for a scheduled run? (Manual runs bypass this.) */
export function isDue(settings: AssistantSettings, nowIso: string): boolean {
  if (!settings.enabled) return false;
  if (!settings.lastRunAt) return true;
  const elapsedMinutes = (Date.parse(nowIso) - Date.parse(settings.lastRunAt)) / 60_000;
  return elapsedMinutes >= settings.intervalMinutes;
}
