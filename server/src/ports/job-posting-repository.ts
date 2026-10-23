import type { JobPosting } from '../domain/job-posting.js';

/**
 * Persistence of saved job postings, scoped by owning workspace (ADR-0010/0033):
 * every read is filtered to a single `ownerId`, so one workspace never sees
 * another's postings. `add`/`update` carry the owner on the record itself.
 * Both adapters compare the dedup key **raw** — the normalised URL comes from
 * the service (§3.4).
 */
export interface JobPostingRepository {
  list(ownerId: string): Promise<JobPosting[]>;
  findById(ownerId: string, id: string): Promise<JobPosting | null>;
  /**
   * Return an existing posting sharing `(source, sourceId)` (when `sourceId` is
   * set) or `url` (when `url` is set), within the same `ownerId`. `null` when
   * there is none.
   */
  findDuplicate(
    ownerId: string,
    source: string,
    sourceId: string | undefined,
    url: string | undefined,
  ): Promise<JobPosting | null>;
  add(posting: JobPosting): Promise<void>;
  update(posting: JobPosting): Promise<void>;
  /** Remove an owned posting. Returns false when no such record exists. */
  delete(ownerId: string, id: string): Promise<boolean>;
}
