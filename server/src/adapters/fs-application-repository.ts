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

  async list(): Promise<Application[]> {
    try {
      const raw = await fs.readFile(this.file, 'utf8');
      const data = JSON.parse(raw);
      return Array.isArray(data) ? (data as Application[]) : [];
    } catch {
      return [];
    }
  }

  async findById(id: string): Promise<Application | null> {
    const all = await this.list();
    return all.find((a) => a.id === id) ?? null;
  }

  async add(application: Application): Promise<void> {
    const all = await this.list();
    all.push(application);
    await this.write(all);
  }

  async update(application: Application): Promise<void> {
    const all = await this.list();
    const index = all.findIndex((a) => a.id === application.id);
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
