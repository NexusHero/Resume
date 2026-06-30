import { promises as fs } from 'node:fs';
import path from 'node:path';
import type { AppConfig } from '../config';
import type { Placement } from '../domain/placement';
import type { PlacementRepository } from '../ports/placement-repository';

/** File-backed repository: the JSON array in bewerbungen/placements.json. */
export class FsPlacementRepository implements PlacementRepository {
  private readonly file: string;
  private readonly dir: string;

  constructor(deps: { config: AppConfig }) {
    this.file = deps.config.placementsFile;
    this.dir = path.dirname(this.file);
  }

  private async readAll(): Promise<Placement[]> {
    try {
      const raw = await fs.readFile(this.file, 'utf8');
      const data = JSON.parse(raw);
      return Array.isArray(data) ? (data as Placement[]) : [];
    } catch {
      return [];
    }
  }

  async list(ownerId: string): Promise<Placement[]> {
    return (await this.readAll()).filter((p) => p.ownerId === ownerId);
  }

  async findById(ownerId: string, id: string): Promise<Placement | null> {
    return (await this.readAll()).find((p) => p.ownerId === ownerId && p.id === id) ?? null;
  }

  async add(placement: Placement): Promise<void> {
    const all = await this.readAll();
    all.push(placement);
    await this.write(all);
  }

  async update(placement: Placement): Promise<void> {
    const all = await this.readAll();
    const i = all.findIndex((p) => p.id === placement.id);
    if (i < 0) all.push(placement);
    else all[i] = placement;
    await this.write(all);
  }

  async remove(ownerId: string, id: string): Promise<boolean> {
    const all = await this.readAll();
    const next = all.filter((p) => !(p.ownerId === ownerId && p.id === id));
    if (next.length === all.length) return false;
    await this.write(next);
    return true;
  }

  private async write(placements: Placement[]): Promise<void> {
    await fs.mkdir(this.dir, { recursive: true });
    await fs.writeFile(this.file, JSON.stringify(placements, null, 2) + '\n');
  }
}
