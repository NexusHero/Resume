import type { Talent } from '../domain/talent';

/** Persistence of the talent pool. */
export interface TalentRepository {
  list(): Promise<Talent[]>;
  findById(id: string): Promise<Talent | null>;
  add(talent: Talent): Promise<void>;
  update(talent: Talent): Promise<void>;
  remove(id: string): Promise<boolean>;
}
