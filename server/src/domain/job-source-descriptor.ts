import { z } from 'zod';

/**
 * A declarative description of a REST job board. It lets the app add a new
 * source without a bespoke adapter class: the generic RestJobSource
 * (adapters/rest-job-source.ts) interprets the descriptor at runtime. Built-in
 * boards ship as descriptors (adapters/builtin-job-sources.ts); operators add
 * more via a JSON file (JOB_SOURCES_FILE) — and, later, a runtime admin UI.
 *
 * The mapping fields are dot-paths into each posting object returned by the
 * board (e.g. "company.display_name", "locations.0.name"). Only GET is
 * supported; boards that need POST or bespoke auth keep a hand-written adapter.
 */
export const jobFieldMapSchema = z.object({
  id: z.string(),
  role: z.string(),
  company: z.string(),
  city: z.string().optional(),
  /** Path to the country value in the posting; falls back to countryDefault. */
  country: z.string().optional(),
  /** remote | hybrid | on-site — free text per board. */
  mode: z.string().optional(),
  /** A ready-made salary string, if the board provides one. */
  salary: z.string().optional(),
  /** Numeric salary bounds — formatted into a range when present. */
  salaryMin: z.string().optional(),
  salaryMax: z.string().optional(),
  /** Publication date; ISO strings are sliced to yyyy-mm-dd, unix seconds converted. */
  posted: z.string().optional(),
  url: z.string().optional(),
  snippet: z.string().optional(),
  /** Path to an array of skill/tag strings. */
  skills: z.string().optional(),
});

export const jobSourceDescriptorSchema = z.object({
  /** Stable, human-readable identifier shown to the user (e.g. "Remotive"). */
  name: z.string().min(1),
  /** Explicit opt-out for a single descriptor; every source is on by default. */
  enabled: z.boolean().optional(),
  /** Base endpoint, without query string. */
  url: z.string().url(),
  /** Static request headers (e.g. a User-Agent some boards require). */
  headers: z.record(z.string(), z.string()).optional(),
  /** A single auth credential injected as a header or query parameter. */
  auth: z
    .object({
      in: z.enum(['header', 'query']),
      name: z.string().min(1),
      value: z.string(),
    })
    .optional(),
  /** Maps the search query onto this board's parameter names. */
  params: z
    .object({
      /** Provider param name for the keyword (e.g. "what", "search", "tag"). */
      q: z.string().optional(),
      /** Provider param name for the location (e.g. "where", "wo"). */
      city: z.string().optional(),
      /** Constant params always sent (e.g. results_per_page=25). */
      static: z.record(z.string(), z.string()).optional(),
    })
    .optional(),
  /** Dot-path to the array of postings in the JSON body ("" = body is the array). */
  itemsPath: z.string(),
  /**
   * When the board offers no server-side search (it returns a full feed), filter
   * the mapped postings by the query's keyword/city on our side.
   */
  clientFilter: z.boolean().optional(),
  /** Country to stamp when the posting carries none. */
  countryDefault: z.string().optional(),
  /** Currency symbol for formatted salary ranges (default "€"). */
  currency: z.string().optional(),
  /** Strip HTML from the snippet field (job descriptions often arrive as markup). */
  snippetIsHtml: z.boolean().optional(),
  map: jobFieldMapSchema,
});

export type JobSourceDescriptor = z.infer<typeof jobSourceDescriptorSchema>;

/** Parse and validate an array of descriptors (e.g. from JOB_SOURCES_FILE). */
export const jobSourceDescriptorsSchema = z.array(jobSourceDescriptorSchema);
