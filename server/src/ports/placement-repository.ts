import type { Placement } from '../domain/placement';

/** Persistence of booked placements. */
export interface PlacementRepository {
  list(): Promise<Placement[]>;
  findById(id: string): Promise<Placement | null>;
  add(placement: Placement): Promise<void>;
  update(placement: Placement): Promise<void>;
  remove(id: string): Promise<boolean>;
}
