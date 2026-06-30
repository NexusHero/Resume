import { promises as fs } from 'node:fs';
import path from 'node:path';
import type { AppConfig } from '../config';
import type { Mandate } from '../domain/mandate';
import type { MandateRepository } from '../ports/mandate-repository';

/** File-backed repository: the JSON array in bewerbungen/mandates.json. */
export class FsMandateRepository implements MandateRepository {
  private readonly file: string;
  private readonly dir: string;

  constructor(deps: { config: AppConfig }) {
    this.file = deps.config.mandatesFile;
    this.dir = path.dirname(this.file);
  }

  async list(): Promise<Mandate[]> {
    try {
      const raw = await fs.readFile(this.file, 'utf8');
      const data = JSON.parse(raw);
      return Array.isArray(data) ? (data as Mandate[]) : [];
    } catch {
      return [];
    }
  }

  async findById(id: string): Promise<Mandate | null> {
    const all = await this.list();
    return all.find((m) => m.id === id) ?? null;
  }

  async add(mandate: Mandate): Promise<void> {
    const all = await this.list();
    all.push(mandate);
    await this.write(all);
  }

  async update(mandate: Mandate): Promise<void> {
    const all = await this.list();
    const i = all.findIndex((m) => m.id === mandate.id);
    if (i < 0) all.push(mandate);
    else all[i] = mandate;
    await this.write(all);
  }

  async remove(id: string): Promise<boolean> {
    const all = await this.list();
    const next = all.filter((m) => m.id !== id);
    if (next.length === all.length) return false;
    await this.write(next);
    return true;
  }

  private async write(mandates: Mandate[]): Promise<void> {
    await fs.mkdir(this.dir, { recursive: true });
    await fs.writeFile(this.file, JSON.stringify(mandates, null, 2) + '\n');
  }
}
