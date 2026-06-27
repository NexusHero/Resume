import type { Job, JobQuery } from '../domain/job';
import type { JobSource } from '../ports/job-source';
import type { Logger } from '../ports/logger';

/**
 * Fans a search out across several job sources in parallel and merges the
 * results. A single failing source (down API, bad key, rate limit) is logged
 * and skipped — the search still returns whatever the healthy sources gave.
 * Duplicates are removed by source + id.
 */
export class CompositeJobSource implements JobSource {
  readonly name = 'composite';
  private readonly sources: JobSource[];
  private readonly logger: Logger;

  constructor(sources: JobSource[], logger: Logger) {
    this.sources = sources;
    this.logger = logger;
  }

  async search(query: JobQuery): Promise<Job[]> {
    const batches = await Promise.all(
      this.sources.map(async (source) => {
        try {
          return await source.search(query);
        } catch (err) {
          this.logger.warn({ source: source.name, err: String(err) }, 'job source failed');
          return [] as Job[];
        }
      }),
    );

    const seen = new Set<string>();
    const merged: Job[] = [];
    for (const job of batches.flat()) {
      const key = `${job.source}:${job.id}`;
      if (seen.has(key)) continue;
      seen.add(key);
      merged.push(job);
    }
    return merged;
  }
}
