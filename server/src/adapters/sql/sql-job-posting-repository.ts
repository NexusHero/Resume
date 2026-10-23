import { and, eq, or } from 'drizzle-orm';
import type { JobPosting } from '../../domain/job-posting.js';
import type { JobPostingRepository } from '../../ports/job-posting-repository.js';
import type { Db } from './db.js';
import { jobPostings } from './schema.js';
import { jobPostingToRow, rowToJobPosting } from './mappers.js';

/** A Postgres unique-constraint violation (the dedup race backstop, ADR-0058). */
function isUniqueViolation(err: unknown): boolean {
  // Drizzle wraps the driver error in a `DrizzleQueryError` whose `cause` is the
  // node-postgres `DatabaseError` (code 23505); tolerate both nesting levels.
  const anyErr = err as { code?: string; cause?: { code?: string } } | null;
  return anyErr?.code === '23505' || anyErr?.cause?.code === '23505';
}

/** Postgres-backed job-posting repository. */
export class SqlJobPostingRepository implements JobPostingRepository {
  private readonly db: Db;

  constructor(deps: { db: Db }) {
    this.db = deps.db;
  }

  async list(ownerId: string): Promise<JobPosting[]> {
    const rows = await this.db.select().from(jobPostings).where(eq(jobPostings.ownerId, ownerId));
    return rows.map(rowToJobPosting);
  }

  async findById(ownerId: string, id: string): Promise<JobPosting | null> {
    const rows = await this.db
      .select()
      .from(jobPostings)
      .where(and(eq(jobPostings.id, id), eq(jobPostings.ownerId, ownerId)));
    return rows[0] ? rowToJobPosting(rows[0]) : null;
  }

  async findDuplicate(
    ownerId: string,
    source: string,
    sourceId: string | undefined,
    url: string | undefined,
  ): Promise<JobPosting | null> {
    // Raw comparison (the normalised URL comes from the service). Dedup key:
    // (source, sourceId) when sourceId is set, or (url) when url is set.
    const keyConds = [];
    if (sourceId)
      keyConds.push(and(eq(jobPostings.source, source), eq(jobPostings.sourceId, sourceId)));
    if (url) keyConds.push(eq(jobPostings.url, url));
    if (keyConds.length === 0) return null;
    const rows = await this.db
      .select()
      .from(jobPostings)
      .where(and(eq(jobPostings.ownerId, ownerId), or(...keyConds)));
    return rows[0] ? rowToJobPosting(rows[0]) : null;
  }

  async add(posting: JobPosting): Promise<void> {
    try {
      await this.db.insert(jobPostings).values(jobPostingToRow(posting));
    } catch (err) {
      // A partial unique index ((owner, source, source_id) / (owner, url)) fired:
      // a concurrent insert of the same dedup key won. Re-query to confirm it is
      // a duplicate (not some other constraint), then treat the add as a no-op —
      // the service re-checks findDuplicate and reports "already saved" so the
      // caller observes exactly one row (ADR-0058 race backstop).
      if (!isUniqueViolation(err)) throw err;
      const existing = await this.findDuplicate(
        posting.ownerId,
        posting.source,
        posting.sourceId,
        posting.url,
      );
      if (!existing) throw err;
    }
  }

  async update(posting: JobPosting): Promise<void> {
    const row = jobPostingToRow(posting);
    const updated = await this.db
      .update(jobPostings)
      .set(row)
      .where(and(eq(jobPostings.id, posting.id), eq(jobPostings.ownerId, posting.ownerId)))
      .returning({ id: jobPostings.id });
    // Match the file repository: an update to an unknown id inserts it.
    if (updated.length === 0) await this.db.insert(jobPostings).values(row);
  }

  async delete(ownerId: string, id: string): Promise<boolean> {
    const deleted = await this.db
      .delete(jobPostings)
      .where(and(eq(jobPostings.id, id), eq(jobPostings.ownerId, ownerId)))
      .returning({ id: jobPostings.id });
    return deleted.length > 0;
  }
}
