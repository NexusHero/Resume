import type { Talent } from '../domain/talent';

/** Persistence of the talent pool, scoped to an owner (the recruiter). */
export interface TalentRepository {
  list(ownerId: string): Promise<Talent[]>;
  findById(ownerId: string, id: string): Promise<Talent | null>;
  add(talent: Talent): Promise<void>;
  update(talent: Talent): Promise<void>;
  remove(ownerId: string, id: string): Promise<boolean>;
}
