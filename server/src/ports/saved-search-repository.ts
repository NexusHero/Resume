import type { SavedSearch } from '../domain/saved-search';

/** Persistence of the candidate's named searches. */
export interface SavedSearchRepository {
  list(): Promise<SavedSearch[]>;
  findById(id: string): Promise<SavedSearch | null>;
  add(search: SavedSearch): Promise<void>;
  remove(id: string): Promise<boolean>;
}
