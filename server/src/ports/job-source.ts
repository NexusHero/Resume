import type { Job, JobQuery } from '../domain/job';

/**
 * A source of job postings (a board / aggregator). Production adapters wrap
 * Adzuna, Arbeitnow, the Bundesagentur API, StepStone, etc.; the sample adapter
 * serves a curated offline list so the feature works with no API keys.
 */
export interface JobSource {
  /** Stable identifier shown to the user (e.g. "Adzuna"). */
  readonly name: string;
  search(query: JobQuery): Promise<Job[]>;
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
