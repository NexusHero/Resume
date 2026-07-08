import type { Job } from '../domain/job.js';
import type { JobSource } from '../ports/job-source.js';

/**
 * A job source that returns nothing. Used only when no live board is configured
 * (JOB_SOURCES=""): the search then honestly shows no postings rather than any
 * fabricated sample data. It never throws, so it is not treated as a failed live
 * source — an empty result is a real, if empty, answer.
 */
export class EmptyJobSource implements JobSource {
  readonly name = 'none';

  async search(): Promise<Job[]> {
    return [];
  }
}
