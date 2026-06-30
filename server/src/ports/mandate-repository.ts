import type { Mandate } from '../domain/mandate';

/** Persistence of client search mandates. */
export interface MandateRepository {
  list(): Promise<Mandate[]>;
  findById(id: string): Promise<Mandate | null>;
  add(mandate: Mandate): Promise<void>;
  update(mandate: Mandate): Promise<void>;
  remove(id: string): Promise<boolean>;
}
