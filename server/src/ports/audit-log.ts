import type { AuditEvent } from '../domain/application.js';

/** Append-only audit trail of every change. */
export interface AuditLog {
  append(event: AuditEvent): Promise<void>;
  list(): Promise<AuditEvent[]>;
}
