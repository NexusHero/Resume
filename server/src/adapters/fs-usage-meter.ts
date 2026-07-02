import { promises as fs } from 'node:fs';
import path from 'node:path';
import type { AppConfig } from '../config';
import type { UsageEvent } from '../domain/usage';
import type { UsageMeter } from '../ports/usage-meter';

/** File-backed usage meter: an append-only JSON array in the store's usage.json. */
export class FsUsageMeter implements UsageMeter {
  private readonly file: string;
  private readonly dir: string;

  constructor(deps: { config: AppConfig }) {
    this.file = deps.config.usageFile;
    this.dir = path.dirname(this.file);
  }

  private async readAll(): Promise<UsageEvent[]> {
    try {
      const raw = await fs.readFile(this.file, 'utf8');
      const data = JSON.parse(raw);
      return Array.isArray(data) ? (data as UsageEvent[]) : [];
    } catch {
      return [];
    }
  }

  async record(event: UsageEvent): Promise<void> {
    const all = await this.readAll();
    all.push(event);
    await this.write(all);
  }

  async list(userId: string): Promise<UsageEvent[]> {
    return (await this.readAll()).filter((e) => e.userId === userId);
  }

  async removeForUser(userId: string): Promise<void> {
    const all = await this.readAll();
    const next = all.filter((e) => e.userId !== userId);
    if (next.length !== all.length) await this.write(next);
  }

  private async write(rows: UsageEvent[]): Promise<void> {
    await fs.mkdir(this.dir, { recursive: true });
    await fs.writeFile(this.file, JSON.stringify(rows, null, 2) + '\n');
  }
}
