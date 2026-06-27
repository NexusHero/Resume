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
