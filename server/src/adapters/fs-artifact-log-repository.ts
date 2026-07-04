import { promises as fs } from 'node:fs';
import path from 'node:path';
import type { AppConfig } from '../config.js';
import type { ArtifactLog } from '../domain/artifact.js';
import type { ArtifactLogRepository } from '../ports/artifact-log-repository.js';

/** File-backed repository: the JSON array in artifact-log.json. */
export class FsArtifactLogRepository implements ArtifactLogRepository {
  private readonly file: string;
  private readonly dir: string;

  constructor(deps: { config: AppConfig }) {
    this.file = deps.config.artifactLogFile;
    this.dir = path.dirname(this.file);
  }

  private async readAll(): Promise<ArtifactLog[]> {
    try {
      const raw = await fs.readFile(this.file, 'utf8');
      const data = JSON.parse(raw);
      return Array.isArray(data) ? (data as ArtifactLog[]) : [];
    } catch {
      return [];
    }
  }

  async list(ownerId: string): Promise<ArtifactLog[]> {
    return (await this.readAll())
      .filter((l) => l.ownerId === ownerId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async listForTalent(ownerId: string, talentId: string): Promise<ArtifactLog[]> {
    return (await this.list(ownerId)).filter((l) => l.talentId === talentId);
  }

  async findById(ownerId: string, id: string): Promise<ArtifactLog | null> {
    return (await this.readAll()).find((l) => l.ownerId === ownerId && l.id === id) ?? null;
  }

  async add(log: ArtifactLog): Promise<void> {
    const all = await this.readAll();
    all.push(log);
    await this.write(all);
  }

  async update(log: ArtifactLog): Promise<void> {
    const all = await this.readAll();
    await this.write(all.map((l) => (l.ownerId === log.ownerId && l.id === log.id ? log : l)));
  }

  private async write(rows: ArtifactLog[]): Promise<void> {
    await fs.mkdir(this.dir, { recursive: true });
    await fs.writeFile(this.file, JSON.stringify(rows, null, 2) + '\n');
  }
}
