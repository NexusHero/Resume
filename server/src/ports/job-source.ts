import type { Job, JobQuery, JobPostingDetail } from '../domain/job.js';

/**
 * A source of job postings (a board / aggregator). Production adapters wrap
 * Adzuna, Arbeitnow, the Bundesagentur API, StepStone, etc.; the sample adapter
 * serves a curated offline list so the feature works with no API keys.
 */
export interface JobSource {
  /** Stable identifier shown to the user (e.g. "Adzuna"). */
  readonly name: string;
  search(query: JobQuery): Promise<Job[]>;
  /**
   * Optional: the full ad text for a single posting, keyed by the source's own
   * id (`Job.id`). Returns `null` when the source cannot supply a full text
   * (e.g. it sits behind a JS/login page) — the posting is then stored
   * `descriptionIncomplete`. The `company`/`title`/`location`/`requirements`
   * fields come from the client's search result, not from this lookup.
   */
  getPosting?(sourceId: string): Promise<JobPostingDetail | null>;
}

/**
 * Every configured live source failed on one search (network blocked, APIs
 * down, bad keys). Distinct from "no hits": the caller can fall back to the
 * offline sample and say so, instead of showing an empty list that looks
 * like a working search with no results.
 */
export class AllJobSourcesFailedError extends Error {
  constructor(readonly sources: string[]) {
    super(`All job sources failed: ${sources.join(', ')}`);
    this.name = 'AllJobSourcesFailedError';
  }
}
