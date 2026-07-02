import { randomBytes } from 'node:crypto';
import { eq } from 'drizzle-orm';
import type { AppConfig } from '../../config';
import type { Clock } from '../../ports/clock';
import type { EmailVerificationTokenStore } from '../../ports/email-verification-token-store';
import type { Db } from './db';
import { emailVerificationTokens } from './schema';

/**
 * Postgres-backed email-verification tokens. Tokens are opaque 256-bit random
 * strings, single-use, and expire after the configured TTL — mirroring the
 * file-backed store, but shared across server instances.
 */
export class SqlEmailVerificationTokenStore implements EmailVerificationTokenStore {
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
      .insert(emailVerificationTokens)
      .values({ token, userId, createdAt: this.clock.isoNow() });
    return token;
  }

  async consume(token: string): Promise<string | null> {
    const rows = await this.db
      .delete(emailVerificationTokens)
      .where(eq(emailVerificationTokens.token, token))
      .returning();
    const row = rows[0];
    if (!row) return null;
    if (Date.parse(row.createdAt) + this.ttlMs <= Date.parse(this.clock.isoNow())) {
      return null;
    }
    return row.userId;
  }

  async destroyForUser(userId: string): Promise<void> {
    await this.db.delete(emailVerificationTokens).where(eq(emailVerificationTokens.userId, userId));
  }
}
