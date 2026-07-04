import { z } from 'zod';
import { type CandidateProfile, scoreJob } from './skill.js';

/**
 * ATS-style gap analysis (JobScan-style): how well the candidate's profile covers
 * the skills a posting asks for, which keywords are missing, and what to add.
 */
export interface AtsReport {
  /** 0–100 share of the posting's skills the candidate already has. */
  score: number;
  /** All skills required by the posting (declared + detected, de-duplicated). */
  requiredSkills: string[];
  /** Posting skills the candidate already has. */
  matched: string[];
  /** Posting skills the candidate is missing — the keyword gap. */
  missing: string[];
  /** Human-readable suggestions, one per missing skill. */
  recommendations: string[];
}

/** Compare a posting's required skills against the candidate; build the report. */
export function analyzeGap(profile: CandidateProfile, requiredSkills: string[]): AtsReport {
  const { score, matched, missing } = scoreJob(profile, requiredSkills);
  return {
    score,
    requiredSkills: matched.concat(missing),
    matched,
    missing,
    recommendations: missing.map(
      (skill) =>
        `"${skill}" appears in the posting but not in your profile — add it if you have it.`,
    ),
  };
}

/** POST /api/v1/ats — analyse a posting against the candidate profile. */
export const atsRequestSchema = z
  .object({
    role: z.string().optional(),
    text: z.string().optional(),
    skills: z.array(z.string()).optional(),
  })
  .refine(
    (d) => Boolean(d.text?.trim() || d.role?.trim() || (d.skills && d.skills.length > 0)),
    'provide at least one of: text, role, skills',
  );
export type AtsRequest = z.infer<typeof atsRequestSchema>;
