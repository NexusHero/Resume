import { z } from 'zod';
import type { CompanyProfile } from './company-archetype.js';

/**
 * The recruiter-observation flywheel: after a candidate goes through a real
 * interview, the recruiter records what actually happened at that company. Many
 * observations aggregate into an "observed profile" that raises confidence
 * above the archetype guess — a first-party, legally-clean data moat that gets
 * better with every placement, without scraping anyone.
 */
export const INTERVIEW_FORMATS = [
  'coding',
  'system_design',
  'case',
  'fachgespraech',
  'assessment_center',
  'behavioral',
  'take_home',
  'presentation',
] as const;
export type InterviewFormat = (typeof INTERVIEW_FORMATS)[number];

export const INTERVIEW_FORMAT_LABELS: Record<InterviewFormat, string> = {
  coding: 'Coding-Challenge',
  system_design: 'System-Design',
  case: 'Case-Interview',
  fachgespraech: 'Fachgespräch',
  assessment_center: 'Assessment-Center',
  behavioral: 'Verhaltensfragen',
  take_home: 'Take-Home-Aufgabe',
  presentation: 'Fachpräsentation',
};

export const DIFFICULTIES = ['low', 'medium', 'high'] as const;
export type Difficulty = (typeof DIFFICULTIES)[number];

/** One recorded interview experience at a company (team-owned). */
export interface InterviewObservation {
  id: string;
  ownerId: string; // team scope
  companyKey: string; // normalized company name
  company: string; // display name as entered
  mandateId: string;
  talentId: string; // optional link to the candidate ('' if none)
  rounds: number;
  formats: InterviewFormat[];
  difficulty: Difficulty;
  notes: string;
  at: string; // ISO 8601
}

/** POST /mandates/:id/observations — record an interview experience. */
export const createObservationSchema = z.object({
  talentId: z.string().default(''),
  rounds: z.number().int().min(0).max(20).default(1),
  formats: z.array(z.enum(INTERVIEW_FORMATS)).default([]),
  difficulty: z.enum(DIFFICULTIES).default('medium'),
  notes: z.string().max(2000).default(''),
});
export type CreateObservationInput = z.infer<typeof createObservationSchema>;

/** Normalize a company name to a stable key for aggregation. */
export function companyKeyOf(company: string): string {
  return (company || '')
    .toLowerCase()
    .replace(/\b(gmbh|ag|se|kg|co|kgaa|inc|ltd|llc|company|group)\b/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export interface FormatCount {
  format: InterviewFormat;
  label: string;
  count: number;
}

/** The aggregate a company's observations distil into. */
export interface ObservedProfile {
  companyKey: string;
  sampleSize: number;
  formats: FormatCount[]; // most-seen first
  typicalRounds: number; // median
  difficulty: Difficulty; // most common
  confidence: 'low' | 'medium' | 'high';
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? (sorted[mid] as number)
    : Math.round(((sorted[mid - 1] as number) + (sorted[mid] as number)) / 2);
}

function mode<T>(values: T[], fallback: T): T {
  const counts = new Map<T, number>();
  let best = fallback;
  let bestN = 0;
  for (const v of values) {
    const n = (counts.get(v) ?? 0) + 1;
    counts.set(v, n);
    if (n > bestN) {
      bestN = n;
      best = v;
    }
  }
  return best;
}

/** Confidence grows with the number of observations. */
export function observedConfidence(sampleSize: number): ObservedProfile['confidence'] {
  if (sampleSize >= 6) return 'high';
  if (sampleSize >= 3) return 'medium';
  return 'low';
}

/** Distil a company's observations into an aggregate profile (null when none). */
export function aggregateObservations(
  observations: InterviewObservation[],
): ObservedProfile | null {
  if (observations.length === 0) return null;

  const counts = new Map<InterviewFormat, number>();
  for (const o of observations) {
    for (const f of o.formats) counts.set(f, (counts.get(f) ?? 0) + 1);
  }
  const formats: FormatCount[] = [...counts.entries()]
    .map(([format, count]) => ({ format, label: INTERVIEW_FORMAT_LABELS[format], count }))
    .sort((a, b) => b.count - a.count || a.format.localeCompare(b.format));

  return {
    companyKey: observations[0]!.companyKey,
    sampleSize: observations.length,
    formats,
    typicalRounds: median(observations.map((o) => o.rounds)),
    difficulty: mode(
      observations.map((o) => o.difficulty),
      'medium',
    ),
    confidence: observedConfidence(observations.length),
  };
}

/**
 * Blend observed reality over the archetype guess: when we have real
 * observations, they win — source becomes 'observed', confidence rises with the
 * sample size, and the seen formats lead the style. The archetype's tips and
 * emphasis are kept (they still apply).
 */
export function applyObserved(
  base: CompanyProfile,
  observed: ObservedProfile | null,
): CompanyProfile {
  if (!observed) return base;
  const observedLabels = observed.formats.map((f) => f.label);
  const mergedFormats = [...new Set([...observedLabels, ...base.style.formats])];
  return {
    ...base,
    source: 'observed',
    confidence: observed.confidence,
    style: {
      ...base.style,
      formats: mergedFormats,
      rounds: `~${observed.typicalRounds} Runden (aus ${observed.sampleSize} Beobachtung${
        observed.sampleSize === 1 ? '' : 'en'
      })`,
    },
  };
}
