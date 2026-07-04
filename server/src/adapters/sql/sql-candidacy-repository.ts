import { and, eq } from 'drizzle-orm';
import type { Candidacy } from '../../domain/candidacy.js';
import type { CandidacyRepository } from '../../ports/candidacy-repository.js';
import type { Db } from './db.js';
import { candidacies } from './schema.js';
import { rowToCandidacy, candidacyToRow } from './mappers.js';

/** Postgres-backed pipeline candidacies, scoped to an owner. */
export class SqlCandidacyRepository implements CandidacyRepository {
  private readonly db: Db;

  constructor(deps: { db: Db }) {
    this.db = deps.db;
  }

  async listForMandate(ownerId: string, mandateId: string): Promise<Candidacy[]> {
    const rows = await this.db
      .select()
      .from(candidacies)
      .where(and(eq(candidacies.ownerId, ownerId), eq(candidacies.mandateId, mandateId)));
    return rows.map(rowToCandidacy);
  }

  async listForTalent(ownerId: string, talentId: string): Promise<Candidacy[]> {
    const rows = await this.db
      .select()
      .from(candidacies)
      .where(and(eq(candidacies.ownerId, ownerId), eq(candidacies.talentId, talentId)));
    return rows.map(rowToCandidacy);
  }

  async findById(ownerId: string, id: string): Promise<Candidacy | null> {
    const rows = await this.db
      .select()
      .from(candidacies)
      .where(and(eq(candidacies.ownerId, ownerId), eq(candidacies.id, id)));
    const row = rows[0];
    return row ? rowToCandidacy(row) : null;
  }

  async findByMandateAndTalent(
    ownerId: string,
    mandateId: string,
    talentId: string,
  ): Promise<Candidacy | null> {
    const rows = await this.db
      .select()
      .from(candidacies)
      .where(
        and(
          eq(candidacies.ownerId, ownerId),
          eq(candidacies.mandateId, mandateId),
          eq(candidacies.talentId, talentId),
        ),
      );
    const row = rows[0];
    return row ? rowToCandidacy(row) : null;
  }

  async add(candidacy: Candidacy): Promise<void> {
    await this.db.insert(candidacies).values(candidacyToRow(candidacy));
  }

  async update(candidacy: Candidacy): Promise<void> {
    await this.db
      .update(candidacies)
      .set(candidacyToRow(candidacy))
      .where(and(eq(candidacies.ownerId, candidacy.ownerId), eq(candidacies.id, candidacy.id)));
  }

  async remove(ownerId: string, id: string): Promise<boolean> {
    const removed = await this.db
      .delete(candidacies)
      .where(and(eq(candidacies.ownerId, ownerId), eq(candidacies.id, id)))
      .returning({ id: candidacies.id });
    return removed.length > 0;
  }

  async removeForTalent(ownerId: string, talentId: string): Promise<void> {
    await this.db
      .delete(candidacies)
      .where(and(eq(candidacies.ownerId, ownerId), eq(candidacies.talentId, talentId)));
  }

  async removeForMandate(ownerId: string, mandateId: string): Promise<void> {
    await this.db
      .delete(candidacies)
      .where(and(eq(candidacies.ownerId, ownerId), eq(candidacies.mandateId, mandateId)));
  }

  async removeForOwner(ownerId: string): Promise<void> {
    await this.db.delete(candidacies).where(eq(candidacies.ownerId, ownerId));
  }
}
