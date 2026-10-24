import { promises as fs } from 'node:fs';
import path from 'node:path';
import type { AppConfig } from '../config.js';
import type { JobApplication } from '../domain/job-application.js';
import type { JobApplicationRepository } from '../ports/job-application-repository.js';

/**
 * File-backed repository: the JSON array in `archive/bewerbungen/job-applications.json`
 * (pattern `fs-job-posting-repository.ts`). Reads are unfiltered-by-design (the
 * service filters/sorts); `findByPostingAndTalent` compares raw. Writes are
 * serialised through an in-process mutex so a concurrent create/status/delete
 * read-modify-write cannot lose an update (ADR-0059).
 */
export class FsJobApplicationRepository implements JobApplicationRepository {
  private readonly file: string;
  private readonly dir: string;
  private writeLock: Promise<void> = Promise.resolve();

  constructor(deps: { config: AppConfig }) {
    this.file = deps.config.jobApplicationsFile;
    this.dir = path.dirname(this.file);
  }

  /** Every record on disk (all owners) — the file is a single JSON array. */
  private async readAll(): Promise<JobApplication[]> {
    try {
      const raw = await fs.readFile(this.file, 'utf8');
      const data = JSON.parse(raw);
      if (!Array.isArray(data)) return [];
      // Backward-compatible (ADR-0061): records written before the attachment
      // selection existed read as `selectedAttachmentIds: []`.
      return (data as JobApplication[]).map((a) => ({
        ...a,
        selectedAttachmentIds: Array.isArray(a.selectedAttachmentIds)
          ? a.selectedAttachmentIds
          : [],
      }));
    } catch {
      return [];
    }
  }

  /** Serialise a read-modify-write so concurrent writes cannot interleave. */
  private withLock<T>(fn: () => Promise<T>): Promise<T> {
    const run = this.writeLock.then(fn);
    this.writeLock = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  }

  async list(
    ownerId: string,
    talentId?: string,
    status?: JobApplication['status'],
  ): Promise<JobApplication[]> {
    const all = await this.readAll();
    return all.filter(
      (a) =>
        a.ownerId === ownerId &&
        (talentId === undefined || a.talentId === talentId) &&
        (status === undefined || a.status === status),
    );
  }

  async findById(ownerId: string, id: string): Promise<JobApplication | null> {
    const all = await this.readAll();
    return all.find((a) => a.id === id && a.ownerId === ownerId) ?? null;
  }

  async findByPostingAndTalent(
    ownerId: string,
    jobPostingId: string,
    talentId: string,
  ): Promise<JobApplication | null> {
    const all = await this.readAll();
    return (
      all.find(
        (a) => a.ownerId === ownerId && a.jobPostingId === jobPostingId && a.talentId === talentId,
      ) ?? null
    );
  }

  async add(application: JobApplication): Promise<void> {
    await this.withLock(async () => {
      const all = await this.readAll();
      all.push(application);
      await this.write(all);
    });
  }

  async update(application: JobApplication): Promise<void> {
    await this.withLock(async () => {
      const all = await this.readAll();
      const index = all.findIndex(
        (a) => a.id === application.id && a.ownerId === application.ownerId,
      );
      if (index < 0) all.push(application);
      else all[index] = application;
      await this.write(all);
    });
  }

  async delete(ownerId: string, id: string): Promise<boolean> {
    return this.withLock(async () => {
      const all = await this.readAll();
      const remaining = all.filter((a) => !(a.id === id && a.ownerId === ownerId));
      if (remaining.length === all.length) return false;
      await this.write(remaining);
      return true;
    });
  }

  private async write(applications: JobApplication[]): Promise<void> {
    await fs.mkdir(this.dir, { recursive: true });
    await fs.writeFile(this.file, JSON.stringify(applications, null, 2) + '\n');
  }
}
