import { and, eq } from 'drizzle-orm';
import type { ArtifactLog } from '../../domain/artifact';
import type { ArtifactLogRepository } from '../../ports/artifact-log-repository';
import type { Db } from './db';
import { artifactLogs } from './schema';
import { rowToArtifactLog, artifactLogToRow } from './mappers';

/** Postgres-backed AI-artifact outcome log. */
export class SqlArtifactLogRepository implements ArtifactLogRepository {
  private readonly db: Db;

  constructor(deps: { db: Db }) {
    this.db = deps.db;
  }

  async list(ownerId: string): Promise<ArtifactLog[]> {
    const rows = await this.db.select().from(artifactLogs).where(eq(artifactLogs.ownerId, ownerId));
    return rows.map(rowToArtifactLog).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async listForTalent(ownerId: string, talentId: string): Promise<ArtifactLog[]> {
    const rows = await this.db
      .select()
      .from(artifactLogs)
      .where(and(eq(artifactLogs.ownerId, ownerId), eq(artifactLogs.talentId, talentId)));
    return rows.map(rowToArtifactLog).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async findById(ownerId: string, id: string): Promise<ArtifactLog | null> {
    const rows = await this.db
      .select()
      .from(artifactLogs)
      .where(and(eq(artifactLogs.ownerId, ownerId), eq(artifactLogs.id, id)));
    return rows[0] ? rowToArtifactLog(rows[0]) : null;
  }

  async add(log: ArtifactLog): Promise<void> {
    await this.db.insert(artifactLogs).values(artifactLogToRow(log));
  }

  async update(log: ArtifactLog): Promise<void> {
    await this.db
      .update(artifactLogs)
      .set(artifactLogToRow(log))
      .where(and(eq(artifactLogs.ownerId, log.ownerId), eq(artifactLogs.id, log.id)));
  }
}
