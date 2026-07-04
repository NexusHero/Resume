import { randomBytes } from 'node:crypto';
import type { SessionStore } from '../ports/session-store.js';
import type { Clock } from '../ports/clock.js';

/**
 * In-memory session store: a random token → user id map. Sessions do not
 * survive a restart, so this is used for tests; production uses the file-backed
 * store. An optional clock + ttlMs enforce server-side expiry; without them
 * (the default) sessions never expire.
 */
export class MemorySessionStore implements SessionStore {
  private readonly sessions = new Map<string, { userId: string; createdAt: number }>();
  private readonly clock?: Clock;
  private readonly ttlMs: number;

  constructor(deps: { clock?: Clock; ttlMs?: number } = {}) {
    this.clock = deps.clock;
    this.ttlMs = deps.ttlMs ?? Infinity;
  }

  private now(): number {
    return this.clock ? Date.parse(this.clock.isoNow()) : 0;
  }

  async create(userId: string): Promise<string> {
    const token = randomBytes(32).toString('hex');
    this.sessions.set(token, { userId, createdAt: this.now() });
    return token;
  }

  async userIdFor(token: string): Promise<string | null> {
    const record = this.sessions.get(token);
    if (!record) return null;
    if (this.ttlMs !== Infinity && record.createdAt + this.ttlMs <= this.now()) {
      this.sessions.delete(token);
      return null;
    }
    return record.userId;
  }

  async destroy(token: string): Promise<void> {
    this.sessions.delete(token);
  }

  async destroyForUser(userId: string): Promise<void> {
    for (const [token, record] of this.sessions) {
      if (record.userId === userId) this.sessions.delete(token);
    }
  }
}
