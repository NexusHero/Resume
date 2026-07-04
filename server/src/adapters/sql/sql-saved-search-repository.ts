import { eq } from 'drizzle-orm';
import type { SavedSearch } from '../../domain/saved-search.js';
import type { SavedSearchRepository } from '../../ports/saved-search-repository.js';
import type { Db } from './db.js';
import { savedSearches } from './schema.js';
import { rowToSavedSearch, savedSearchToRow } from './mappers.js';

/** Postgres-backed repository for named searches. */
export class SqlSavedSearchRepository implements SavedSearchRepository {
  private readonly db: Db;

  constructor(deps: { db: Db }) {
    this.db = deps.db;
  }

  async list(): Promise<SavedSearch[]> {
    const rows = await this.db.select().from(savedSearches);
    return rows.map(rowToSavedSearch);
  }

  async findById(id: string): Promise<SavedSearch | null> {
    const rows = await this.db.select().from(savedSearches).where(eq(savedSearches.id, id));
    return rows[0] ? rowToSavedSearch(rows[0]) : null;
  }

  async add(search: SavedSearch): Promise<void> {
    await this.db.insert(savedSearches).values(savedSearchToRow(search));
  }

  async remove(id: string): Promise<boolean> {
    const removed = await this.db
      .delete(savedSearches)
      .where(eq(savedSearches.id, id))
      .returning({ id: savedSearches.id });
    return removed.length > 0;
  }
}
