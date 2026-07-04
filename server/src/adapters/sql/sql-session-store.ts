import { randomBytes } from 'node:crypto';
import { eq } from 'drizzle-orm';
import type { AppConfig } from '../../config.js';
import type { SessionStore } from '../../ports/session-store.js';
import type { Clock } from '../../ports/clock.js';
import type { Db } from './db.js';
import { sessions } from './schema.js';

/**
 * Postgres-backed session store. Tokens are opaque 256-bit random strings;
 * sessions older than the configured TTL are rejected (and pruned) on lookup,
 * mirroring the file-backed store. Unlike the file store, sessions survive across
 * server instances — required for a real multi-instance deployment.
 */
export class SqlSessionStore implements SessionStore {
  private readonly db: Db;
  private readonly clock: Clock;
  private readonly ttlMs: number;

  constructor(deps: { db: Db; clock: Clock; config: AppConfig }) {
    this.db = deps.db;
    this.clock = deps.clock;
    this.ttlMs = deps.config.auth.sessionTtlMs;
  }

  async create(userId: string): Promise<string> {
    const token = randomBytes(32).toString('hex');
    await this.db.insert(sessions).values({ token, userId, createdAt: this.clock.isoNow() });
    return token;
  }

  async userIdFor(token: string): Promise<string | null> {
    const rows = await this.db.select().from(sessions).where(eq(sessions.token, token));
    const row = rows[0];
    if (!row) return null;
    if (Date.parse(row.createdAt) + this.ttlMs <= Date.parse(this.clock.isoNow())) {
      await this.db.delete(sessions).where(eq(sessions.token, token));
      return null;
    }
    return row.userId;
  }

  async destroy(token: string): Promise<void> {
    await this.db.delete(sessions).where(eq(sessions.token, token));
  }

  async destroyForUser(userId: string): Promise<void> {
    await this.db.delete(sessions).where(eq(sessions.userId, userId));
  }
}
