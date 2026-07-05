import { randomBytes } from 'node:crypto';
import { eq } from 'drizzle-orm';
import type { AppConfig } from '../../config.js';
import type { Clock } from '../../ports/clock.js';
import type { PasswordResetTokenStore } from '../../ports/password-reset-token-store.js';
import type { Db } from './db.js';
import { passwordResetTokens } from './schema.js';
import { hashToken } from '../token-hash.js';

/**
 * Postgres-backed password-reset tokens. Tokens are opaque 256-bit random
 * strings, single-use, and expire after the configured TTL — mirroring the
 * file-backed store, but shared across server instances. Only the token's
 * SHA-256 hash is persisted in the `token` column (ADR-0004).
 */
export class SqlPasswordResetTokenStore implements PasswordResetTokenStore {
  private readonly db: Db;
  private readonly clock: Clock;
  private readonly ttlMs: number;

  constructor(deps: { db: Db; clock: Clock; config: AppConfig }) {
    this.db = deps.db;
    this.clock = deps.clock;
    this.ttlMs = deps.config.mail.resetTokenTtlMs;
  }

  async create(userId: string): Promise<string> {
    const token = randomBytes(32).toString('hex');
    await this.db
      .insert(passwordResetTokens)
      .values({ token: hashToken(token), userId, createdAt: this.clock.isoNow() });
    return token;
  }

  async consume(token: string): Promise<string | null> {
    const rows = await this.db
      .delete(passwordResetTokens)
      .where(eq(passwordResetTokens.token, hashToken(token)))
      .returning();
    const row = rows[0];
    if (!row) return null;
    if (Date.parse(row.createdAt) + this.ttlMs <= Date.parse(this.clock.isoNow())) {
      return null;
    }
    return row.userId;
  }

  async destroyForUser(userId: string): Promise<void> {
    await this.db.delete(passwordResetTokens).where(eq(passwordResetTokens.userId, userId));
  }
}
