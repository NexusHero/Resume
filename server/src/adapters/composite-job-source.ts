import type { Job, JobPostingDetail, JobQuery, JobSourceOutcome } from '../domain/job.js';
import { NotFoundError } from '../domain/errors.js';
import { AllJobSourcesFailedError, type JobSource } from '../ports/job-source.js';
import type { Logger } from '../ports/logger.js';

/** Merged postings plus the per-source breakdown behind them. */
export interface CompositeSearchOutcome {
  jobs: Job[];
  sources: JobSourceOutcome[];
}

/**
 * Fans a search out across several job sources in parallel and merges the
 * results. A single failing source (down API, bad key, rate limit) is logged
 * and skipped — the search still returns whatever the healthy sources gave.
 * When EVERY source fails it throws AllJobSourcesFailedError instead of
 * returning an empty list, so the caller can fall back honestly rather than
 * present "no hits" for a search that never happened. Duplicates are removed
 * by source + id.
 *
 * `searchDetailed` additionally reports how many postings each board
 * contributed (and whether it errored), which drives the accumulated
 * per-source counts shown in the UI.
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
    return (await this.searchDetailed(query)).jobs;
  }

  /**
   * The full ad text for a single posting, resolved through the source that
   * produced it. Looks the source up by `name` and delegates to its optional
   * port-level `getPosting(sourceId)`. Throws `NotFoundError` when the source is
   * unknown (the caller maps it to 404 "Quelle unbekannt"); returns `null` when
   * the source exists but supplies no full text (→ `descriptionIncomplete`).
   *
   * Named `getPostingBySource` (not the port's `getPosting(sourceId)`) so the
   * composite's own two-argument signature does not collide with the single-
   * argument port method it also delegates to.
   */
  async getPostingBySource(source: string, sourceId: string): Promise<JobPostingDetail | null> {
    const found = this.sources.find((s) => s.name === source);
    if (!found) throw new NotFoundError(`Unknown job source ${source}`);
    return found.getPosting ? found.getPosting(sourceId) : null;
  }

  async searchDetailed(query: JobQuery): Promise<CompositeSearchOutcome> {
    const results = await Promise.all(
      this.sources.map(async (source) => {
        try {
          return { name: source.name, jobs: await source.search(query), ok: true };
        } catch (err) {
          this.logger.warn({ source: source.name, err: String(err) }, 'job source failed');
          return { name: source.name, jobs: [] as Job[], ok: false };
        }
      }),
    );

    const failed = results.filter((r) => !r.ok);
    if (this.sources.length > 0 && failed.length === this.sources.length) {
      throw new AllJobSourcesFailedError(failed.map((r) => r.name));
    }

    const seen = new Set<string>();
    const merged: Job[] = [];
    for (const job of results.flatMap((r) => r.jobs)) {
      const key = `${job.source}:${job.id}`;
      if (seen.has(key)) continue;
      seen.add(key);
      merged.push(job);
    }
    const sources: JobSourceOutcome[] = results.map((r) => ({
      name: r.name,
      count: r.jobs.length,
      ok: r.ok,
    }));
    return { jobs: merged, sources };
  }
}
