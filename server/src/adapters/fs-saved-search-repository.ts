import { promises as fs } from 'node:fs';
import path from 'node:path';
import type { AppConfig } from '../config.js';
import type { SavedSearch } from '../domain/saved-search.js';
import type { SavedSearchRepository } from '../ports/saved-search-repository.js';

/**
 * File-backed repository: the JSON array in bewerbungen/saved-searches.json.
 * Workspace-scoped (RI15/Q6): every read/remove filters on `ownerId`. Unlike
 * the sql DDL (which has a `DEFAULT 'team'` backfill), the file has no column
 * defaults — so a legacy row without `ownerId` is assigned the default team at
 * read time and stays deletable.
 */
export class FsSavedSearchRepository implements SavedSearchRepository {
  private readonly file: string;
  private readonly dir: string;

  constructor(deps: { config: AppConfig }) {
    this.file = deps.config.savedSearchesFile;
    this.dir = path.dirname(this.file);
  }

  private async readAll(): Promise<SavedSearch[]> {
    try {
      const raw = await fs.readFile(this.file, 'utf8');
      const data = JSON.parse(raw);
      if (!Array.isArray(data)) return [];
      return (data as Array<Partial<SavedSearch>>).map((s) => ({
        ...s,
        ownerId: typeof s.ownerId === 'string' ? s.ownerId : 'team',
      })) as SavedSearch[];
    } catch {
      return [];
    }
  }

  async list(ownerId: string): Promise<SavedSearch[]> {
    return (await this.readAll()).filter((s) => s.ownerId === ownerId);
  }

  async findById(ownerId: string, id: string): Promise<SavedSearch | null> {
    const all = await this.readAll();
    return all.find((s) => s.id === id && s.ownerId === ownerId) ?? null;
  }

  async add(search: SavedSearch): Promise<void> {
    const all = await this.readAll();
    all.push(search);
    await this.write(all);
  }

  async remove(ownerId: string, id: string): Promise<boolean> {
    const all = await this.readAll();
    const next = all.filter((s) => !(s.id === id && s.ownerId === ownerId));
    if (next.length === all.length) return false;
    await this.write(next);
    return true;
  }

  private async write(searches: SavedSearch[]): Promise<void> {
    await fs.mkdir(this.dir, { recursive: true });
    await fs.writeFile(this.file, JSON.stringify(searches, null, 2) + '\n');
  }
}
