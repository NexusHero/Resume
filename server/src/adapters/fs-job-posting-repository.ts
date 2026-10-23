import { promises as fs } from 'node:fs';
import path from 'node:path';
import type { AppConfig } from '../config.js';
import type { JobPosting } from '../domain/job-posting.js';
import type { JobPostingRepository } from '../ports/job-posting-repository.js';

/**
 * File-backed repository: the JSON array in `archive/bewerbungen/job-postings.json`
 * (pattern `fs-application-repository.ts`). Reads are unfiltered-by-design (the
 * service filters/sorts); the dedup comparison is **raw** — the normalised URL
 * comes from the service. Writes are serialised through an in-process mutex so a
 * concurrent adopt/insert read-modify-write cannot lose an update (ADR-0058).
 */
export class FsJobPostingRepository implements JobPostingRepository {
  private readonly file: string;
  private readonly dir: string;
  private writeLock: Promise<void> = Promise.resolve();

  constructor(deps: { config: AppConfig }) {
    this.file = deps.config.jobPostingsFile;
    this.dir = path.dirname(this.file);
  }

  /** Every record on disk (all owners) — the file is a single JSON array. */
  private async readAll(): Promise<JobPosting[]> {
    try {
      const raw = await fs.readFile(this.file, 'utf8');
      const data = JSON.parse(raw);
      return Array.isArray(data) ? (data as JobPosting[]) : [];
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

  async list(ownerId: string): Promise<JobPosting[]> {
    return (await this.readAll()).filter((p) => p.ownerId === ownerId);
  }

  async findById(ownerId: string, id: string): Promise<JobPosting | null> {
    const all = await this.readAll();
    return all.find((p) => p.id === id && p.ownerId === ownerId) ?? null;
  }

  async findDuplicate(
    ownerId: string,
    source: string,
    sourceId: string | undefined,
    url: string | undefined,
  ): Promise<JobPosting | null> {
    const all = await this.readAll();
    return (
      all.find((p) => {
        if (p.ownerId !== ownerId) return false;
        if (sourceId && p.source === source && p.sourceId === sourceId) return true;
        if (url && p.url === url) return true;
        return false;
      }) ?? null
    );
  }

  async add(posting: JobPosting): Promise<void> {
    await this.withLock(async () => {
      const all = await this.readAll();
      all.push(posting);
      await this.write(all);
    });
  }

  async update(posting: JobPosting): Promise<void> {
    await this.withLock(async () => {
      const all = await this.readAll();
      const index = all.findIndex((p) => p.id === posting.id && p.ownerId === posting.ownerId);
      if (index < 0) all.push(posting);
      else all[index] = posting;
      await this.write(all);
    });
  }

  async delete(ownerId: string, id: string): Promise<boolean> {
    return this.withLock(async () => {
      const all = await this.readAll();
      const remaining = all.filter((p) => !(p.id === id && p.ownerId === ownerId));
      if (remaining.length === all.length) return false;
      await this.write(remaining);
      return true;
    });
  }

  private async write(postings: JobPosting[]): Promise<void> {
    await fs.mkdir(this.dir, { recursive: true });
    await fs.writeFile(this.file, JSON.stringify(postings, null, 2) + '\n');
  }
}
