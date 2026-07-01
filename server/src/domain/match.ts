import { z } from 'zod';
import type { Talent } from './talent';
import type { TalentDocuments } from './talent-documents';
import { tokenize } from './ats-ai';

/** POST /api/v1/mandates/:id/match — rank the pool against a mandate. */
export const matchRequestSchema = z.object({
  // Optional: the job ad text. Empty → the service matches on the mandate itself.
  jobText: z.string().max(50_000).default(''),
  limit: z.number().int().min(1).max(50).default(10),
});
export type MatchRequestInput = z.infer<typeof matchRequestSchema>;

/** One ranked candidate for a mandate. */
export interface TalentMatch {
  talentId: string;
  name: string;
  role: string;
  location: string;
  score: number; // 0–100 fit
  matched: string[]; // candidate skills the job mentions
  inPipeline: boolean; // already a candidacy for this mandate
}

/** Gather a candidate's skills from the talent record plus their documents. */
export function candidateSkills(talent: Talent, documents: TalentDocuments | null): string[] {
  const fromDocs = documents
    ? [
        ...documents.resume.skillGroups.flatMap((g) => g.items),
        ...documents.resume.experience.flatMap((e) => e.skills),
      ]
    : [];
  const all = [...talent.skills, ...fromDocs].map((s) => s.trim()).filter(Boolean);
  // unique, keeping the first-seen casing for display
  const byKey = new Map<string, string>();
  for (const s of all) {
    const key = s.toLowerCase();
    if (!byKey.has(key)) byKey.set(key, s);
  }
  return [...byKey.values()];
}

/**
 * Deterministic fit score (no LLM needed, always available): the share of the
 * candidate's skills the job mentions, plus a small bonus when the candidate's
 * role words appear in the ad. A coarse proxy that ranks the pool sensibly.
 */
export function scoreTalent(
  talent: Talent,
  documents: TalentDocuments | null,
  jobText: string,
): { score: number; matched: string[] } {
  const skills = candidateSkills(talent, documents);
  const jobTokens = tokenize(jobText);
  const matched = skills.filter((s) => {
    const t = s.toLowerCase();
    return jobTokens.has(t) || [...jobTokens].some((jt) => t.includes(jt));
  });
  const base = skills.length ? matched.length / skills.length : 0;
  const roleHit = [...tokenize(talent.role)].some((rt) => jobTokens.has(rt)) ? 0.15 : 0;
  const score = Math.min(100, Math.round((base + roleHit) * 100));
  return { score, matched: [...new Set(matched)] };
}
