import { asc } from 'drizzle-orm';
import type { AuditEvent } from '../../domain/application.js';
import type { AuditLog } from '../../ports/audit-log.js';
import type { Db } from './db.js';
import { auditEvents } from './schema.js';
import { auditEventToRow, rowToAuditEvent } from './mappers.js';

/** Postgres-backed append-only audit log, ordered by insertion. */
export class SqlAuditLog implements AuditLog {
  private readonly db: Db;

  constructor(deps: { db: Db }) {
    this.db = deps.db;
  }

  async append(event: AuditEvent): Promise<void> {
    await this.db.insert(auditEvents).values(auditEventToRow(event));
  }

  async list(): Promise<AuditEvent[]> {
    const rows = await this.db.select().from(auditEvents).orderBy(asc(auditEvents.seq));
    return rows.map(rowToAuditEvent);
  }
}
