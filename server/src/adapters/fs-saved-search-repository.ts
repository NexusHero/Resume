import { promises as fs } from 'node:fs';
import path from 'node:path';
import type { AppConfig } from '../config.js';
import type { SavedSearch } from '../domain/saved-search.js';
import type { SavedSearchRepository } from '../ports/saved-search-repository.js';

/** File-backed repository: the JSON array in bewerbungen/saved-searches.json. */
export class FsSavedSearchRepository implements SavedSearchRepository {
  private readonly file: string;
  private readonly dir: string;

  constructor(deps: { config: AppConfig }) {
    this.file = deps.config.savedSearchesFile;
    this.dir = path.dirname(this.file);
  }

  async list(): Promise<SavedSearch[]> {
    try {
      const raw = await fs.readFile(this.file, 'utf8');
      const data = JSON.parse(raw);
      return Array.isArray(data) ? (data as SavedSearch[]) : [];
    } catch {
      return [];
    }
  }

  async findById(id: string): Promise<SavedSearch | null> {
    const all = await this.list();
    return all.find((s) => s.id === id) ?? null;
  }

  async add(search: SavedSearch): Promise<void> {
    const all = await this.list();
    all.push(search);
    await this.write(all);
  }

  async remove(id: string): Promise<boolean> {
    const all = await this.list();
    const next = all.filter((s) => s.id !== id);
    if (next.length === all.length) return false;
    await this.write(next);
    return true;
  }

  private async write(searches: SavedSearch[]): Promise<void> {
    await fs.mkdir(this.dir, { recursive: true });
    await fs.writeFile(this.file, JSON.stringify(searches, null, 2) + '\n');
  }
}
