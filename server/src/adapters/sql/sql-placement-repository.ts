import { and, eq } from 'drizzle-orm';
import type { Placement } from '../../domain/placement';
import type { PlacementRepository } from '../../ports/placement-repository';
import type { Db } from './db';
import { placements } from './schema';
import { rowToPlacement, placementToRow } from './mappers';

/** Postgres-backed repository for booked placements, scoped to an owner. */
export class SqlPlacementRepository implements PlacementRepository {
  private readonly db: Db;

  constructor(deps: { db: Db }) {
    this.db = deps.db;
  }

  async list(ownerId: string): Promise<Placement[]> {
    const rows = await this.db.select().from(placements).where(eq(placements.ownerId, ownerId));
    return rows.map(rowToPlacement);
  }

  async findById(ownerId: string, id: string): Promise<Placement | null> {
    const rows = await this.db
      .select()
      .from(placements)
      .where(and(eq(placements.ownerId, ownerId), eq(placements.id, id)));
    return rows[0] ? rowToPlacement(rows[0]) : null;
  }

  async add(placement: Placement): Promise<void> {
    await this.db.insert(placements).values(placementToRow(placement));
  }

  async update(placement: Placement): Promise<void> {
    const row = placementToRow(placement);
    // Mirror the file store: persist by id, inserting if the row is absent.
    await this.db
      .insert(placements)
      .values(row)
      .onConflictDoUpdate({ target: placements.id, set: row });
  }

  async remove(ownerId: string, id: string): Promise<boolean> {
    const removed = await this.db
      .delete(placements)
      .where(and(eq(placements.ownerId, ownerId), eq(placements.id, id)))
      .returning({ id: placements.id });
    return removed.length > 0;
  }
}
