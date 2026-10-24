import { and, eq } from 'drizzle-orm';
import type { JobApplication, JobApplicationStatus } from '../../domain/job-application.js';
import type { JobApplicationRepository } from '../../ports/job-application-repository.js';
import type { Db } from './db.js';
import { jobApplications } from './schema.js';
import { jobApplicationToRow, rowToJobApplication } from './mappers.js';

/** A Postgres unique-constraint violation (the dedup race backstop, ADR-0059). */
function isUniqueViolation(err: unknown): boolean {
  const anyErr = err as { code?: string; cause?: { code?: string } } | null;
  return anyErr?.code === '23505' || anyErr?.cause?.code === '23505';
}

/** Postgres-backed job-application repository. */
export class SqlJobApplicationRepository implements JobApplicationRepository {
  private readonly db: Db;

  constructor(deps: { db: Db }) {
    this.db = deps.db;
  }

  async list(
    ownerId: string,
    talentId?: string,
    status?: JobApplicationStatus,
  ): Promise<JobApplication[]> {
    const conds = [eq(jobApplications.ownerId, ownerId)];
    if (talentId !== undefined) conds.push(eq(jobApplications.talentId, talentId));
    if (status !== undefined) conds.push(eq(jobApplications.status, status));
    const rows = await this.db
      .select()
      .from(jobApplications)
      .where(and(...conds));
    return rows.map(rowToJobApplication);
  }

  async findById(ownerId: string, id: string): Promise<JobApplication | null> {
    const rows = await this.db
      .select()
      .from(jobApplications)
      .where(and(eq(jobApplications.id, id), eq(jobApplications.ownerId, ownerId)));
    return rows[0] ? rowToJobApplication(rows[0]) : null;
  }

  async findByPostingAndTalent(
    ownerId: string,
    jobPostingId: string,
    talentId: string,
  ): Promise<JobApplication | null> {
    const rows = await this.db
      .select()
      .from(jobApplications)
      .where(
        and(
          eq(jobApplications.ownerId, ownerId),
          eq(jobApplications.jobPostingId, jobPostingId),
          eq(jobApplications.talentId, talentId),
        ),
      );
    return rows[0] ? rowToJobApplication(rows[0]) : null;
  }

  async add(application: JobApplication): Promise<void> {
    try {
      await this.db.insert(jobApplications).values(jobApplicationToRow(application));
    } catch (err) {
      // The unique index on (owner_id, job_posting_id, talent_id) fired: a
      // concurrent insert of the same (posting, talent) won. Re-query to confirm
      // it is that duplicate (not some other constraint), then treat the add as a
      // no-op — the service re-checks and reports "already existing" (ADR-0059).
      if (!isUniqueViolation(err)) throw err;
      const existing = await this.findByPostingAndTalent(
        application.ownerId,
        application.jobPostingId,
        application.talentId,
      );
      if (!existing) throw err;
    }
  }

  async update(application: JobApplication): Promise<void> {
    const row = jobApplicationToRow(application);
    const updated = await this.db
      .update(jobApplications)
      .set(row)
      .where(
        and(
          eq(jobApplications.id, application.id),
          eq(jobApplications.ownerId, application.ownerId),
        ),
      )
      .returning({ id: jobApplications.id });
    // Match the file repository: an update to an unknown id inserts it.
    if (updated.length === 0) await this.db.insert(jobApplications).values(row);
  }

  async delete(ownerId: string, id: string): Promise<boolean> {
    const deleted = await this.db
      .delete(jobApplications)
      .where(and(eq(jobApplications.id, id), eq(jobApplications.ownerId, ownerId)))
      .returning({ id: jobApplications.id });
    return deleted.length > 0;
  }
}
