import type { Application, AuditEvent } from '../../domain/application';
import type { SavedSearch } from '../../domain/saved-search';
import { applications, auditEvents, savedSearches } from './schema';

type ApplicationRow = typeof applications.$inferSelect;
type ApplicationInsert = typeof applications.$inferInsert;
type AuditRow = typeof auditEvents.$inferSelect;
type AuditInsert = typeof auditEvents.$inferInsert;
type SavedSearchRow = typeof savedSearches.$inferSelect;
type SavedSearchInsert = typeof savedSearches.$inferInsert;

// Postgres stores absent optional values as NULL; the domain uses `undefined`.
const orUndef = <T>(v: T | null): T | undefined => v ?? undefined;

export function rowToApplication(row: ApplicationRow): Application {
  return {
    id: row.id,
    date: row.date,
    company: row.company,
    position: row.position,
    address: row.address,
    reference: row.reference,
    status: row.status as Application['status'],
    pdfPath: row.pdfPath,
    source: row.source,
    createdAt: row.createdAt,
    updatedAt: orUndef(row.updatedAt),
    commit: orUndef(row.commit),
  };
}

export function applicationToRow(app: Application): ApplicationInsert {
  return {
    id: app.id,
    date: app.date,
    company: app.company,
    position: app.position,
    address: app.address,
    reference: app.reference,
    status: app.status,
    pdfPath: app.pdfPath,
    source: app.source,
    createdAt: app.createdAt,
    updatedAt: app.updatedAt ?? null,
    commit: app.commit ?? null,
  };
}

export function rowToAuditEvent(row: AuditRow): AuditEvent {
  return {
    ts: row.ts,
    action: row.action as AuditEvent['action'],
    id: row.appId,
    by: orUndef(row.by),
    data: orUndef(row.data),
    changed: orUndef(row.changed),
    commit: orUndef(row.commit),
  };
}

export function auditEventToRow(event: AuditEvent): AuditInsert {
  return {
    ts: event.ts,
    action: event.action,
    appId: event.id,
    by: event.by ?? null,
    data: event.data ?? null,
    changed: event.changed ?? null,
    commit: event.commit ?? null,
  };
}

export function rowToSavedSearch(row: SavedSearchRow): SavedSearch {
  return {
    id: row.id,
    name: row.name,
    query: row.query,
    createdAt: row.createdAt,
  };
}

export function savedSearchToRow(search: SavedSearch): SavedSearchInsert {
  return {
    id: search.id,
    name: search.name,
    query: search.query,
    createdAt: search.createdAt,
  };
}
