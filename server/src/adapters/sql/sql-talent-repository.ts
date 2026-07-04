import { and, eq } from 'drizzle-orm';
import type { Talent } from '../../domain/talent.js';
import type { TalentRepository } from '../../ports/talent-repository.js';
import type { Db } from './db.js';
import { talents } from './schema.js';
import { rowToTalent, talentToRow } from './mappers.js';

/** Postgres-backed repository for represented talents, scoped to an owner. */
export class SqlTalentRepository implements TalentRepository {
  private readonly db: Db;

  constructor(deps: { db: Db }) {
    this.db = deps.db;
  }

  async list(ownerId: string): Promise<Talent[]> {
    const rows = await this.db.select().from(talents).where(eq(talents.ownerId, ownerId));
    return rows.map(rowToTalent);
  }

  async findById(ownerId: string, id: string): Promise<Talent | null> {
    const rows = await this.db
      .select()
      .from(talents)
      .where(and(eq(talents.ownerId, ownerId), eq(talents.id, id)));
    return rows[0] ? rowToTalent(rows[0]) : null;
  }

  async add(talent: Talent): Promise<void> {
    await this.db.insert(talents).values(talentToRow(talent));
  }

  async update(talent: Talent): Promise<void> {
    const row = talentToRow(talent);
    // Mirror the file store: persist by id, inserting if the row is absent.
    await this.db.insert(talents).values(row).onConflictDoUpdate({ target: talents.id, set: row });
  }

  async remove(ownerId: string, id: string): Promise<boolean> {
    const removed = await this.db
      .delete(talents)
      .where(and(eq(talents.ownerId, ownerId), eq(talents.id, id)))
      .returning({ id: talents.id });
    return removed.length > 0;
  }
}
