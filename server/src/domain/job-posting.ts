import { z } from 'zod';

/**
 * A saved job posting ("Stelle"). Workspace-scoped via `ownerId` (= the
 * Workspace-Scope, ADR-0010/0033). Code name `JobPosting`; the UI speaks
 * "Stelle". Three entry paths produce one: adopting a live search result,
 * pasting text, or fetching a URL (each normalised by the service).
 */
export interface JobPosting {
  id: string;
  /** The owning workspace scope (never from the request body). */
  ownerId: string;
  /** Which source supplied the posting (e.g. "Bundesagentur", "text", "url"). */
  source: string;
  /** The source's id (BA refnr, Arbeitnow slug). Absent for pasted/URL postings. */
  sourceId?: string;
  /** The posting's URL (normalised once by the service, §3.4). */
  url?: string;
  company: string;
  title: string;
  location: string;
  country: string;
  /** The full ad text. Empty + `descriptionIncomplete` when the source lacks it. */
  description: string;
  /** Requirements/skills. From `Job.skills` on adopt, else AI-extracted. */
  requirements: string[];
  /** AK-1.2: the source delivered no full text → the UI offers "Text ergänzen". */
  descriptionIncomplete: boolean;
  createdAt: string; // ISO 8601
}

/** POST /api/v1/job-postings — persist an edited extract draft (or a full posting). */
export const createJobPostingSchema = z
  .object({
    source: z.string().min(1),
    sourceId: z.string().min(1).optional(),
    url: z.string().url().max(2000).optional(),
    company: z.string().min(1, 'company is required'),
    title: z.string().min(1, 'title is required'),
    location: z.string().default(''),
    country: z.string().default(''),
    description: z.string().max(200_000).default(''),
    requirements: z.array(z.string()).default([]),
  })
  .strict();
export type CreateJobPostingInput = z.infer<typeof createJobPostingSchema>;

/** POST /api/v1/job-postings/adopt — save a live search result (no AI). */
export const adoptJobPostingSchema = z
  .object({
    source: z.string().min(1),
    sourceId: z.string().min(1).optional(),
    url: z.string().url().max(2000).optional(),
    // Fields the client already knows from the search (Job.company, role→title,
    // city→location, country, skills→requirements).
    company: z.string().min(1, 'company is required'),
    title: z.string().min(1, 'title is required'),
    location: z.string().default(''),
    country: z.string().default(''),
    requirements: z.array(z.string()).default([]),
  })
  .strict()
  .refine((v) => v.sourceId || v.url, 'sourceId or url is required');
export type AdoptJobPostingInput = z.infer<typeof adoptJobPostingSchema>;

/** POST /api/v1/job-postings/extract — exactly one of `text` or `url`. */
export const extractJobPostingSchema = z.union([
  z.object({ text: z.string().min(1).max(50_000) }).strict(),
  z.object({ url: z.string().url().max(2000) }).strict(),
]);
export type ExtractJobPostingInput = z.infer<typeof extractJobPostingSchema>;

/** PATCH /api/v1/job-postings/:id — partial update of the editable fields. */
export const updateJobPostingSchema = z
  .object({
    company: z.string().min(1),
    title: z.string().min(1),
    location: z.string(),
    country: z.string(),
    description: z.string().max(200_000),
    requirements: z.array(z.string()),
    descriptionIncomplete: z.boolean(),
  })
  .partial()
  .strict();
export type UpdateJobPostingInput = z.infer<typeof updateJobPostingSchema>;

/** GET /api/v1/job-postings query parameters. */
export const jobPostingQuerySchema = z.object({ q: z.string().optional() });
export type JobPostingQuery = z.infer<typeof jobPostingQuerySchema>;

/**
 * The edit draft the extract endpoints return (never persisted). `url` is the
 * `fromUrl` input or its `finalUrl`; for `fromText` it is **omitted**
 * (undefined, never '') — otherwise `createJobPostingSchema`'s `z.string().url()`
 * would reject the draft when pasted text is saved.
 */
export interface JobPostingDraft {
  company: string;
  title: string;
  location: string;
  country: string;
  requirements: string[];
  description: string;
  source: string; // 'text' | 'url'
  url?: string;
}

/**
 * Normalise a URL once, before dedup and before persisting (ADR-0058, §3.4).
 * Flat: strip the fragment, a trailing slash and lower-case the host. The query
 * is deliberately left untouched. Both adapters compare raw — the normalised
 * URL comes from the service — so normalisation-identical URLs share a key.
 */
export function normalizeUrl(url: string): string {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    // Not parseable as a URL; the zod schema already rejected it, but keep this
    // helper total so callers can trust it to never throw.
    return url;
  }
  parsed.hash = '';
  parsed.hostname = parsed.hostname.toLowerCase();
  let pathname = parsed.pathname;
  if (pathname.length > 1 && pathname.endsWith('/')) pathname = pathname.slice(0, -1);
  parsed.pathname = pathname;
  return parsed.toString();
}

/** The dedup key of a posting: (source, sourceId) when set, else (url) when set. */
export type DedupKey = { source: string; sourceId: string } | { source: string; url: string };

/**
 * Compute the dedup key. An empty `sourceId` (`''`, e.g. BA `refnr ?? ''`) is
 * coerced to `undefined` so it never acts as a key; otherwise `url` is used when
 * present.
 */
export function dedupKeyFor(
  posting: Pick<JobPosting, 'source' | 'sourceId' | 'url'>,
): DedupKey | null {
  const sourceId = posting.sourceId?.trim() || undefined;
  if (sourceId) return { source: posting.source, sourceId };
  const url = posting.url?.trim() || undefined;
  if (url) return { source: posting.source, url };
  return null;
}

/**
 * Case-insensitive contains match over the fields a recruiter scans for in the
 * Stellen-Liste. The search filter lives in the service (business rule, ADR-0001)
 * so both stores behave identically.
 */
export function matchesJobPostingQuery(posting: JobPosting, q: string): boolean {
  const needle = q.trim().toLowerCase();
  if (!needle) return true;
  return [posting.company, posting.title, posting.location, posting.description].some((f) =>
    String(f ?? '')
      .toLowerCase()
      .includes(needle),
  );
}
