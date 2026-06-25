import { promises as fs } from 'node:fs';
import path from 'node:path';
import type { AppConfig } from '../config';
import type { AuditEvent } from '../domain/application';
import type { AuditLog } from '../ports/audit-log';

/** Append-only JSONL audit trail: bewerbungen/history.jsonl. */
export class FsAuditLog implements AuditLog {
  private readonly file: string;
  private readonly dir: string;

  constructor(deps: { config: AppConfig }) {
    this.file = deps.config.historyFile;
    this.dir = path.dirname(this.file);
  }

  async append(event: AuditEvent): Promise<void> {
    await fs.mkdir(this.dir, { recursive: true });
    await fs.appendFile(this.file, JSON.stringify(event) + '\n');
  }

  async list(): Promise<AuditEvent[]> {
    try {
      const raw = await fs.readFile(this.file, 'utf8');
      return raw
        .split('\n')
        .filter((line) => line.length > 0)
        .map((line) => JSON.parse(line) as AuditEvent);
    } catch {
      return [];
    }
  }
}
