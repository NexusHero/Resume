import type { Mandate } from '../domain/mandate';

/** Persistence of client search mandates, scoped to an owner (the recruiter). */
export interface MandateRepository {
  list(ownerId: string): Promise<Mandate[]>;
  findById(ownerId: string, id: string): Promise<Mandate | null>;
  add(mandate: Mandate): Promise<void>;
  update(mandate: Mandate): Promise<void>;
  remove(ownerId: string, id: string): Promise<boolean>;
}
