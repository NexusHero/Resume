import { z } from 'zod';
import type { Candidacy } from './candidacy';
import { APPLICATION_SOURCES, type ApplicationSource } from './application-target';

/**
 * The assistant: one in-process agent that prepares the desk, with a single
 * autonomy scale (ADR-0013, extended by ADR-0019). At `suggest`/`act` it is
 * the token-free co-pilot — it ranks the pool against active mandates, spots
 * stalled candidacies and data gaps, and (in `act`) applies internal,
 * reversible actions itself. At `autopilot` it shifts up a gear and becomes
 * the auto-applier: for a strong match it builds the whole application packet
 * (tailored CV + cover letter in the ad's language + Bewerbungsmappe) and
 * stages it for one-click approval. It never sends anything outward — the
 * recruiter still triggers the actual submission.
 */

export const ASSISTANT_MODES = ['suggest', 'act', 'autopilot'] as const;
export type AssistantMode = (typeof ASSISTANT_MODES)[number];

export interface AssistantSettings {
  /** Master switch — off means the scheduler never runs for this team. */
  enabled: boolean;
  /**
   * The autonomy gear:
   * - `suggest` — stages everything for review;
   * - `act` — additionally applies internal, reversible actions itself (e.g.
   *   add a match to the pipeline), visibly marked as auto-applied;
   * - `autopilot` — additionally builds complete application packets for strong
   *   matches and stages them for approval (spends AI tokens; ADR-0019).
   * Nothing outward-facing or destructive is ever done in any gear.
   */
  mode: AssistantMode;
  /** Where autopilot draws openings from: received job postings, or own mandates. */
  applySource: ApplicationSource;
  /** Minimum match score (0–100) before autopilot builds an application. */
  minApplyScore: number;
  /** Scheduler cadence; the manual "Run now" ignores it. */
  intervalMinutes: number;
  lastRunAt?: string; // ISO 8601
}

export const DEFAULT_ASSISTANT_SETTINGS: AssistantSettings = {
  enabled: false,
  mode: 'suggest',
  applySource: 'jobs',
  minApplyScore: 60,
  intervalMinutes: 60,
};

/** PUT /api/v1/assistant — partial settings update. */
export const updateAssistantSettingsSchema = z.object({
  enabled: z.boolean().optional(),
  mode: z.enum(ASSISTANT_MODES).optional(),
  applySource: z.enum(APPLICATION_SOURCES).optional(),
  minApplyScore: z.number().int().min(0).max(100).optional(),
  intervalMinutes: z
    .number()
    .int()
    .min(15, 'minimum interval is 15 minutes')
    .max(24 * 60)
    .optional(),
});
export type UpdateAssistantSettingsInput = z.infer<typeof updateAssistantSettingsSchema>;

export const SUGGESTION_KINDS = ['shortlist-add', 'follow-up', 'data-gap', 'application'] as const;
export type SuggestionKind = (typeof SUGGESTION_KINDS)[number];

/**
 * The snapshot behind an `application` suggestion — a tailored packet staged
 * for approval. It is a copy on the suggestion (payload jsonb), never written
 * over the candidate's canonical documents (ADR-0019).
 */
export interface ApplicationPayload {
  source: ApplicationSource;
  /** The opening's ref within its source (a mandate id, or a job posting id). */
  targetRef: string;
  role: string;
  company: string;
  location: string;
  /** For the `mandates` source, the existing mandate id; empty for job targets. */
  mandateId: string;
  jobText: string;
  lang: string;
  score: number;
  /** The tuned résumé summary (snapshot). */
  summary: string;
  /** The cover-letter body paragraphs (snapshot). */
  paragraphs: string[];
  /** PDF Zeugnisse to merge into the Mappe. */
  attachmentIds: string[];
  provider: string;
  /** Count of claims the CV + ad did not support (grounding self-check). */
  ungroundedCount: number;
}

/** Dedup key for an application: one per (opening ref, talent). */
export function applicationDedupKey(targetRef: string, talentId: string): string {
  return `application|${targetRef}|${talentId}`;
}

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
