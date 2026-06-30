import type { Placement } from '../domain/placement';

/** Persistence of booked placements, scoped to an owner (the recruiter). */
export interface PlacementRepository {
  list(ownerId: string): Promise<Placement[]>;
  findById(ownerId: string, id: string): Promise<Placement | null>;
  add(placement: Placement): Promise<void>;
  update(placement: Placement): Promise<void>;
  remove(ownerId: string, id: string): Promise<boolean>;
}
