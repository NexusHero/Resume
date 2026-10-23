import type { SavedSearch } from '../domain/saved-search.js';

/**
 * Persistence of the candidate's named searches. Workspace-scoped (RI15/Q6,
 * ADR-0010/0033): every read/remove is filtered to one `ownerId`, and `add`
 * carries the owner on the record itself.
 */
export interface SavedSearchRepository {
  list(ownerId: string): Promise<SavedSearch[]>;
  findById(ownerId: string, id: string): Promise<SavedSearch | null>;
  add(search: SavedSearch): Promise<void>;
  remove(ownerId: string, id: string): Promise<boolean>;
}
