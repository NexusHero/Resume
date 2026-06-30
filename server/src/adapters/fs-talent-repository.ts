import { promises as fs } from 'node:fs';
import path from 'node:path';
import type { AppConfig } from '../config';
import type { Talent } from '../domain/talent';
import type { TalentRepository } from '../ports/talent-repository';

/** File-backed repository: the JSON array in bewerbungen/talents.json. */
export class FsTalentRepository implements TalentRepository {
  private readonly file: string;
  private readonly dir: string;

  constructor(deps: { config: AppConfig }) {
    this.file = deps.config.talentsFile;
    this.dir = path.dirname(this.file);
  }

  async list(): Promise<Talent[]> {
    try {
      const raw = await fs.readFile(this.file, 'utf8');
      const data = JSON.parse(raw);
      return Array.isArray(data) ? (data as Talent[]) : [];
    } catch {
      return [];
    }
  }

  async findById(id: string): Promise<Talent | null> {
    const all = await this.list();
    return all.find((t) => t.id === id) ?? null;
  }

  async add(talent: Talent): Promise<void> {
    const all = await this.list();
    all.push(talent);
    await this.write(all);
  }

  async update(talent: Talent): Promise<void> {
    const all = await this.list();
    const i = all.findIndex((t) => t.id === talent.id);
    if (i < 0) all.push(talent);
    else all[i] = talent;
    await this.write(all);
  }

  async remove(id: string): Promise<boolean> {
    const all = await this.list();
    const next = all.filter((t) => t.id !== id);
    if (next.length === all.length) return false;
    await this.write(next);
    return true;
  }

  private async write(talents: Talent[]): Promise<void> {
    await fs.mkdir(this.dir, { recursive: true });
    await fs.writeFile(this.file, JSON.stringify(talents, null, 2) + '\n');
  }
}
