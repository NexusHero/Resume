import { promises as fs } from 'node:fs';
import path from 'node:path';
import type { AppConfig } from '../config.js';
import type { RetentionPolicy } from '../domain/retention.js';
import type { RetentionPolicyStore } from '../ports/retention-policy-store.js';

/** File-backed policy: a JSON object keyed by owner in retention-policy.json. */
export class FsRetentionPolicyStore implements RetentionPolicyStore {
  private readonly file: string;
  private readonly dir: string;

  constructor(deps: { config: AppConfig }) {
    this.file = deps.config.retentionPolicyFile;
    this.dir = path.dirname(this.file);
  }

  private async readAll(): Promise<Record<string, RetentionPolicy>> {
    try {
      const raw = await fs.readFile(this.file, 'utf8');
      const data = JSON.parse(raw);
      return data && typeof data === 'object' && !Array.isArray(data)
        ? (data as Record<string, RetentionPolicy>)
        : {};
    } catch {
      return {};
    }
  }

  async get(ownerId: string): Promise<RetentionPolicy | null> {
    return (await this.readAll())[ownerId] ?? null;
  }

  async set(ownerId: string, policy: RetentionPolicy): Promise<void> {
    const all = await this.readAll();
    all[ownerId] = policy;
    await fs.mkdir(this.dir, { recursive: true });
    await fs.writeFile(this.file, JSON.stringify(all, null, 2) + '\n');
  }
}
