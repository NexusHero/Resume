import type { Application } from '../domain/application.js';

/**
 * Persistence of application records, scoped by owning team (ADR-0010/0033):
 * every read is filtered to a single `ownerId`, so one team never sees another's
 * applications. `add`/`update` carry the owner on the record itself.
 */
export interface ApplicationRepository {
  list(ownerId: string): Promise<Application[]>;
  findById(ownerId: string, id: string): Promise<Application | null>;
  add(application: Application): Promise<void>;
  update(application: Application): Promise<void>;
}
