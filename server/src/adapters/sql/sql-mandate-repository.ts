import { and, eq } from 'drizzle-orm';
import type { Mandate } from '../../domain/mandate';
import type { MandateRepository } from '../../ports/mandate-repository';
import type { Db } from './db';
import { mandates } from './schema';
import { rowToMandate, mandateToRow } from './mappers';

/** Postgres-backed repository for client mandates, scoped to an owner. */
export class SqlMandateRepository implements MandateRepository {
  private readonly db: Db;

  constructor(deps: { db: Db }) {
    this.db = deps.db;
  }

  async list(ownerId: string): Promise<Mandate[]> {
    const rows = await this.db.select().from(mandates).where(eq(mandates.ownerId, ownerId));
    return rows.map(rowToMandate);
  }

  async findById(ownerId: string, id: string): Promise<Mandate | null> {
    const rows = await this.db
      .select()
      .from(mandates)
      .where(and(eq(mandates.ownerId, ownerId), eq(mandates.id, id)));
    return rows[0] ? rowToMandate(rows[0]) : null;
  }

  async add(mandate: Mandate): Promise<void> {
    await this.db.insert(mandates).values(mandateToRow(mandate));
  }

  async update(mandate: Mandate): Promise<void> {
    const row = mandateToRow(mandate);
    // Mirror the file store: persist by id, inserting if the row is absent.
    await this.db
      .insert(mandates)
      .values(row)
      .onConflictDoUpdate({ target: mandates.id, set: row });
  }

  async remove(ownerId: string, id: string): Promise<boolean> {
    const removed = await this.db
      .delete(mandates)
      .where(and(eq(mandates.ownerId, ownerId), eq(mandates.id, id)))
      .returning({ id: mandates.id });
    return removed.length > 0;
  }
}
