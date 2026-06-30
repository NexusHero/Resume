import { and, eq } from 'drizzle-orm';
import type { ApiKeyStore } from '../../ports/api-key-store';
import type { LlmProviderId } from '../../ports/llm-provider';
import type { SecretCipher } from '../secret-cipher';
import type { Db } from './db';
import { apiKeys } from './schema';

/** Postgres-backed, encrypted per-user API-key store. */
export class SqlApiKeyStore implements ApiKeyStore {
  private readonly db: Db;
  private readonly cipher: SecretCipher;

  constructor(deps: { db: Db; secretCipher: SecretCipher }) {
    this.db = deps.db;
    this.cipher = deps.secretCipher;
  }

  async set(ownerId: string, provider: LlmProviderId, key: string): Promise<void> {
    const value = this.cipher.encrypt(key);
    await this.db
      .insert(apiKeys)
      .values({ ownerId, provider, value })
      .onConflictDoUpdate({ target: [apiKeys.ownerId, apiKeys.provider], set: { value } });
  }

  async get(ownerId: string, provider: LlmProviderId): Promise<string | null> {
    const rows = await this.db
      .select()
      .from(apiKeys)
      .where(and(eq(apiKeys.ownerId, ownerId), eq(apiKeys.provider, provider)));
    return rows[0] ? this.cipher.decrypt(rows[0].value) : null;
  }

  async remove(ownerId: string, provider: LlmProviderId): Promise<boolean> {
    const removed = await this.db
      .delete(apiKeys)
      .where(and(eq(apiKeys.ownerId, ownerId), eq(apiKeys.provider, provider)))
      .returning({ provider: apiKeys.provider });
    return removed.length > 0;
  }

  async providersFor(ownerId: string): Promise<LlmProviderId[]> {
    const rows = await this.db.select().from(apiKeys).where(eq(apiKeys.ownerId, ownerId));
    return rows.map((r) => r.provider as LlmProviderId);
  }
}
