import { promises as fs } from 'node:fs';
import { randomBytes } from 'node:crypto';
import path from 'node:path';
import type { AppConfig } from '../config';
import type { Clock } from '../ports/clock';
import type { EmailVerificationTokenStore } from '../ports/email-verification-token-store';
import type { EmailVerificationToken } from '../domain/email-verification';

/**
 * File-backed email-verification tokens (the JSON array in
 * bewerbungen/email-verification-tokens.json). Tokens are opaque 256-bit
 * random strings, single-use, and expire after the configured TTL.
 */
export class FsEmailVerificationTokenStore implements EmailVerificationTokenStore {
  private readonly file: string;
  private readonly dir: string;
  private readonly clock: Clock;
  private readonly ttlMs: number;

  constructor(deps: { config: AppConfig; clock: Clock }) {
    this.file = deps.config.emailVerificationTokensFile;
    this.dir = path.dirname(this.file);
    this.clock = deps.clock;
    this.ttlMs = deps.config.mail.resetTokenTtlMs;
  }

  private async readAll(): Promise<EmailVerificationToken[]> {
    try {
      const raw = await fs.readFile(this.file, 'utf8');
      const data = JSON.parse(raw);
      return Array.isArray(data) ? (data as EmailVerificationToken[]) : [];
    } catch {
      return [];
    }
  }

  private async write(tokens: EmailVerificationToken[]): Promise<void> {
    await fs.mkdir(this.dir, { recursive: true });
    await fs.writeFile(this.file, JSON.stringify(tokens, null, 2) + '\n');
  }

  async create(userId: string): Promise<string> {
    const token = randomBytes(32).toString('hex');
    const all = await this.readAll();
    all.push({ token, userId, createdAt: this.clock.isoNow() });
    await this.write(all);
    return token;
  }

  async consume(token: string): Promise<string | null> {
    const all = await this.readAll();
    const record = all.find((t) => t.token === token);
    if (!record) return null;
    // Single-use: remove it whether or not it has expired.
    await this.write(all.filter((t) => t.token !== token));
    if (Date.parse(record.createdAt) + this.ttlMs <= Date.parse(this.clock.isoNow())) {
      return null;
    }
    return record.userId;
  }

  async destroyForUser(userId: string): Promise<void> {
    const all = await this.readAll();
    const next = all.filter((t) => t.userId !== userId);
    if (next.length !== all.length) await this.write(next);
  }
}
