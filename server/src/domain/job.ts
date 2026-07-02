import { z } from 'zod';

/** A normalized job posting, independent of the board it came from. */
export interface Job {
  id: string;
  company: string;
  role: string;
  city: string;
  country: string;
  mode: string; // remote | hybrid | on-site (free text per board)
  salary?: string;
  posted?: string;
  /** Skills the posting asks for (drives matching). */
  skills: string[];
  snippet?: string;
  source: string; // which JobSource produced it
  url?: string;
}

/** A job enriched with its match against the searching candidate. */
export interface ScoredJob extends Job {
  match: number; // 0–100
  matchedSkills: string[];
  missingSkills: string[];
}

/** Two-tier result: strong fits first, then everything else (kept, not dropped). */
export interface JobSearchResult {
  query: JobQuery;
  threshold: number;
  /** Which backing source produced the postings ('Sample' = offline fallback). */
  source: string;
  /** match >= threshold, best first. */
  top: ScoredJob[];
  /** below threshold — stretch / new-domain opportunities, best first. */
  more: ScoredJob[];
  counts: { total: number; top: number; more: number };
}

/** GET /api/v1/jobs query parameters. */
export const jobQuerySchema = z.object({
  q: z.string().optional(),
  country: z.string().optional(),
  city: z.string().optional(),
  sources: z.array(z.string()).optional(),
  /** Tier boundary in percent; defaults to 80. */
  threshold: z.coerce.number().int().min(0).max(100).default(80),
});
export type JobQuery = z.infer<typeof jobQuerySchema>;
