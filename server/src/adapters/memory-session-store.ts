import { randomBytes } from 'node:crypto';
import type { SessionStore } from '../ports/session-store';

/**
 * In-memory session store: a random token → user id map. Sessions do not
 * survive a restart (acceptable for the single-recruiter MVP); a persistent
 * (file/SQL) store is a follow-up.
 */
export class MemorySessionStore implements SessionStore {
  private readonly sessions = new Map<string, string>();

  async create(userId: string): Promise<string> {
    const token = randomBytes(32).toString('hex');
    this.sessions.set(token, userId);
    return token;
  }

  async userIdFor(token: string): Promise<string | null> {
    return this.sessions.get(token) ?? null;
  }

  async destroy(token: string): Promise<void> {
    this.sessions.delete(token);
  }
}
