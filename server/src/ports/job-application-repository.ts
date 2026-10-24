import type { JobApplication } from '../domain/job-application.js';

/**
 * Persistence of job applications ("Bewerbungen"), scoped by owning workspace
 * (ADR-0010/0033): every read is filtered to a single `ownerId`, so one
 * workspace never sees another's applications. `add`/`update` carry the owner on
 * the record itself.
 */
export interface JobApplicationRepository {
  list(ownerId: string, talentId?: string): Promise<JobApplication[]>;
  findById(ownerId: string, id: string): Promise<JobApplication | null>;
  /**
   * The single application for `(posting, talent)` within `ownerId` — `null`
   * when there is none. The service checks this before inserting (ADR-0059); the
   * sql adapter backs it with a unique index as the race backstop.
   */
  findByPostingAndTalent(
    ownerId: string,
    jobPostingId: string,
    talentId: string,
  ): Promise<JobApplication | null>;
  add(application: JobApplication): Promise<void>;
  update(application: JobApplication): Promise<void>;
  /** Remove an owned application. Returns false when no such record exists. */
  delete(ownerId: string, id: string): Promise<boolean>;
}
