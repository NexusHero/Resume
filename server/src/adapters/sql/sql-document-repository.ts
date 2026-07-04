import { and, eq } from 'drizzle-orm';
import type { TalentDocuments } from '../../domain/talent-documents.js';
import type { DocumentRepository } from '../../ports/document-repository.js';
import type { Db } from './db.js';
import { talentDocuments } from './schema.js';
import { rowToTalentDocuments, talentDocumentsToRow } from './mappers.js';

/** Postgres-backed document store, scoped to an owner; one row per (owner, talent). */
export class SqlDocumentRepository implements DocumentRepository {
  private readonly db: Db;

  constructor(deps: { db: Db }) {
    this.db = deps.db;
  }

  async get(ownerId: string, talentId: string): Promise<TalentDocuments | null> {
    const rows = await this.db
      .select()
      .from(talentDocuments)
      .where(and(eq(talentDocuments.ownerId, ownerId), eq(talentDocuments.talentId, talentId)));
    return rows[0] ? rowToTalentDocuments(rows[0]) : null;
  }

  async save(documents: TalentDocuments): Promise<void> {
    const row = talentDocumentsToRow(documents);
    await this.db
      .insert(talentDocuments)
      .values(row)
      .onConflictDoUpdate({
        target: [talentDocuments.ownerId, talentDocuments.talentId],
        set: row,
      });
  }

  async removeForTalent(ownerId: string, talentId: string): Promise<void> {
    await this.db
      .delete(talentDocuments)
      .where(and(eq(talentDocuments.ownerId, ownerId), eq(talentDocuments.talentId, talentId)));
  }

  async removeForOwner(ownerId: string): Promise<void> {
    await this.db.delete(talentDocuments).where(eq(talentDocuments.ownerId, ownerId));
  }
}
