import { z } from 'zod';
import type { Talent } from './talent';
import type { TalentDocuments } from './talent-documents';
import { tokenize } from './ats-ai';
import { jobClusters, skillMatchesJob } from './skill-semantics';
import { canonicalizeSkills } from './skill-taxonomy';

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
  score: number; // 0–100 hybrid fit (skills + text similarity)
  skillScore: number; // 0–100, the skill/ontology component
  semanticScore: number; // 0–100, embedding similarity of ad ↔ profile text
  matched: string[]; // candidate skills the job mentions
  inPipeline: boolean; // already a candidacy for this mandate
}

/** How the hybrid blends: skills stay the primary signal, text breaks ties. */
export const HYBRID_WEIGHTS = { skills: 0.7, semantic: 0.3 } as const;

/**
 * Matching v2 (ADR-0017): blend the skill/ontology score with embedding
 * similarity between the ad and the candidate's profile text. The semantic
 * side catches what skill lists miss (domain vocabulary in bullets, German
 * compounds, typos); the 70/30 split keeps demonstrated skills decisive.
 */
export function hybridScore(skillScore: number, semanticScore: number): number {
  return Math.min(
    100,
    Math.round(HYBRID_WEIGHTS.skills * skillScore + HYBRID_WEIGHTS.semantic * semanticScore),
  );
}

/** The candidate's profile as one text — what the ad's embedding is compared to. */
export function matchText(talent: Talent, documents: TalentDocuments | null): string {
  const resume = documents?.resume;
  return [
    talent.role,
    talent.headline,
    talent.skills.join(' '),
    resume?.summary ?? '',
    ...(resume?.experience.flatMap((e) => [e.role, e.company, ...e.bullets, ...e.skills]) ?? []),
    ...(resume?.skillGroups.flatMap((g) => g.items) ?? []),
  ]
    .filter(Boolean)
    .join('\n');
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
  // Canonicalize (React.js → React) and drop skills that collapse to the same form.
  return canonicalizeSkills(all);
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
  const clusters = jobClusters(jobTokens);
  // Semantic match: exact, ontology-cluster (React ↔ Vue), or fuzzy (Node.js ↔ NodeJS).
  const matched = skills.filter((s) => skillMatchesJob(s, jobTokens, clusters));
  const base = skills.length ? matched.length / skills.length : 0;
  const roleHit = skillMatchesJob(talent.role, jobTokens, clusters) ? 0.15 : 0;
  const score = Math.min(100, Math.round((base + roleHit) * 100));
  return { score, matched: [...new Set(matched)] };
}
