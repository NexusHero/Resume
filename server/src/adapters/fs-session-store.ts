import { promises as fs } from 'node:fs';
import { randomBytes } from 'node:crypto';
import path from 'node:path';
import type { AppConfig } from '../config';
import type { SessionStore } from '../ports/session-store';
import type { Clock } from '../ports/clock';

/** One persisted session row: an opaque token mapped to its owning user. */
interface SessionRecord {
  token: string;
  userId: string;
  createdAt: string; // ISO 8601
}

/**
 * File-backed session store: the JSON array in bewerbungen/sessions.json.
 * Unlike the in-memory store, sessions survive a server restart, so users
 * stay logged in across deploys. Tokens are opaque 256-bit random strings.
 */
export class FsSessionStore implements SessionStore {
  private readonly file: string;
  private readonly dir: string;
  private readonly clock: Clock;

  constructor(deps: { config: AppConfig; clock: Clock }) {
    this.file = deps.config.sessionsFile;
    this.dir = path.dirname(this.file);
    this.clock = deps.clock;
  }

  private async readAll(): Promise<SessionRecord[]> {
    try {
      const raw = await fs.readFile(this.file, 'utf8');
      const data = JSON.parse(raw);
      return Array.isArray(data) ? (data as SessionRecord[]) : [];
    } catch {
      return [];
    }
  }

  private async write(sessions: SessionRecord[]): Promise<void> {
    await fs.mkdir(this.dir, { recursive: true });
    await fs.writeFile(this.file, JSON.stringify(sessions, null, 2) + '\n');
  }

  async create(userId: string): Promise<string> {
    const token = randomBytes(32).toString('hex');
    const all = await this.readAll();
    all.push({ token, userId, createdAt: this.clock.isoNow() });
    await this.write(all);
    return token;
  }

  async userIdFor(token: string): Promise<string | null> {
    return (await this.readAll()).find((s) => s.token === token)?.userId ?? null;
  }

  async destroy(token: string): Promise<void> {
    const all = await this.readAll();
    const next = all.filter((s) => s.token !== token);
    if (next.length !== all.length) await this.write(next);
  }

  async destroyForUser(userId: string): Promise<void> {
    const all = await this.readAll();
    const next = all.filter((s) => s.userId !== userId);
    if (next.length !== all.length) await this.write(next);
  }
}
