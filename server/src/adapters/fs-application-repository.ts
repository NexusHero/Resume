import { promises as fs } from 'node:fs';
import path from 'node:path';
import type { AppConfig } from '../config.js';
import type { Application } from '../domain/application.js';
import type { ApplicationRepository } from '../ports/application-repository.js';

/** File-backed repository: the JSON array in bewerbungen/log.json. */
export class FsApplicationRepository implements ApplicationRepository {
  private readonly file: string;
  private readonly dir: string;

  constructor(deps: { config: AppConfig }) {
    this.file = deps.config.logFile;
    this.dir = path.dirname(this.file);
  }

  /** Every record on disk (all owners) — the file is a single JSON array. */
  private async readAll(): Promise<Application[]> {
    try {
      const raw = await fs.readFile(this.file, 'utf8');
      const data = JSON.parse(raw);
      return Array.isArray(data) ? (data as Application[]) : [];
    } catch {
      return [];
    }
  }

  async list(ownerId: string): Promise<Application[]> {
    return (await this.readAll()).filter((a) => a.ownerId === ownerId);
  }

  async findById(ownerId: string, id: string): Promise<Application | null> {
    const all = await this.readAll();
    return all.find((a) => a.id === id && a.ownerId === ownerId) ?? null;
  }

  async add(application: Application): Promise<void> {
    const all = await this.readAll();
    all.push(application);
    await this.write(all);
  }

  async update(application: Application): Promise<void> {
    const all = await this.readAll();
    const index = all.findIndex(
      (a) => a.id === application.id && a.ownerId === application.ownerId,
    );
    if (index < 0) {
      all.push(application);
    } else {
      all[index] = application;
    }
    await this.write(all);
  }

  private async write(applications: Application[]): Promise<void> {
    await fs.mkdir(this.dir, { recursive: true });
    await fs.writeFile(this.file, JSON.stringify(applications, null, 2) + '\n');
  }
}
