import { promises as fs } from 'node:fs';
import path from 'node:path';
import type { AppConfig } from '../config.js';
import type { StageTransition } from '../domain/stage-history.js';
import type { StageTransitionRepository } from '../ports/stage-transition-repository.js';

/** File-backed repository: the JSON array in stage-transitions.json. */
export class FsStageTransitionRepository implements StageTransitionRepository {
  private readonly file: string;
  private readonly dir: string;

  constructor(deps: { config: AppConfig }) {
    this.file = deps.config.stageTransitionsFile;
    this.dir = path.dirname(this.file);
  }

  private async readAll(): Promise<StageTransition[]> {
    try {
      const raw = await fs.readFile(this.file, 'utf8');
      const data = JSON.parse(raw);
      return Array.isArray(data) ? (data as StageTransition[]) : [];
    } catch {
      return [];
    }
  }

  async list(ownerId: string): Promise<StageTransition[]> {
    return (await this.readAll())
      .filter((t) => t.ownerId === ownerId)
      .sort((a, b) => a.at.localeCompare(b.at));
  }

  async add(transition: StageTransition): Promise<void> {
    const all = await this.readAll();
    all.push(transition);
    await fs.mkdir(this.dir, { recursive: true });
    await fs.writeFile(this.file, JSON.stringify(all, null, 2) + '\n');
  }
}
