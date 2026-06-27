/**
 * Skill matching domain.
 *
 * A candidate carries a weighted skill set. A job posting advertises the skills
 * it asks for. The match is the share of the job's required skills the candidate
 * already covers — so a job is "strong" when it fits what you can do today, and a
 * lower score is not a bad job but a *stretch*: it brings skills you do not have
 * yet (new domains / technologies worth growing into).
 */

/** A single skill on a candidate profile. `weight` lets core skills count more. */
export interface Skill {
  name: string;
  weight?: number; // default 1
}

/** The searching candidate: identity is irrelevant here, only the skills matter. */
export interface CandidateProfile {
  skills: Skill[];
}

/** Outcome of scoring one job against a profile. */
export interface MatchResult {
  /** 0–100, weighted share of the job's skills the candidate already has. */
  score: number;
  /** Job skills the candidate already has. */
  matched: string[];
  /** Job skills the candidate is missing — the growth opportunity. */
  missing: string[];
}

/** Lowercase + trim so "Node.js" and "node.js " compare equal. */
export function normalizeSkill(name: string): string {
  return name.trim().toLowerCase();
}

/**
 * Score a job's required skills against a candidate profile.
 *
 * Weighting is applied to the *job* skills using the candidate's weight for the
 * skills they have (missing skills count as weight 1). A job that asks for
 * nothing is treated as a neutral full match (score 100) — there is nothing to
 * be missing.
 */
export function scoreJob(profile: CandidateProfile, jobSkills: string[]): MatchResult {
  const have = new Map<string, number>();
  for (const s of profile.skills) {
    have.set(normalizeSkill(s.name), s.weight ?? 1);
  }

  const matched: string[] = [];
  const missing: string[] = [];
  let total = 0;
  let covered = 0;

  // De-duplicate job skills while preserving their original display form.
  const seen = new Set<string>();
  for (const raw of jobSkills) {
    const key = normalizeSkill(raw);
    if (!key || seen.has(key)) continue;
    seen.add(key);

    const weight = have.get(key) ?? 1;
    total += weight;
    if (have.has(key)) {
      covered += weight;
      matched.push(raw);
    } else {
      missing.push(raw);
    }
  }

  const score = total === 0 ? 100 : Math.round((covered / total) * 100);
  return { score, matched, missing };
}
