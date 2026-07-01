import { asc, eq } from 'drizzle-orm';
import type { UsageEvent, UsageFeature } from '../../domain/usage';
import type { LlmProviderId } from '../../ports/llm-provider';
import type { UsageMeter } from '../../ports/usage-meter';
import type { Db } from './db';
import { usageEvents } from './schema';

/** Postgres-backed usage meter, ordered by insertion (`seq`). */
export class SqlUsageMeter implements UsageMeter {
  private readonly db: Db;

  constructor(deps: { db: Db }) {
    this.db = deps.db;
  }

  async record(event: UsageEvent): Promise<void> {
    await this.db.insert(usageEvents).values({
      ownerId: event.ownerId,
      provider: event.provider,
      feature: event.feature,
      inputTokens: event.inputTokens,
      outputTokens: event.outputTokens,
      at: event.at,
    });
  }

  async list(ownerId: string): Promise<UsageEvent[]> {
    const rows = await this.db
      .select()
      .from(usageEvents)
      .where(eq(usageEvents.ownerId, ownerId))
      .orderBy(asc(usageEvents.seq));
    return rows.map((r) => ({
      ownerId: r.ownerId,
      provider: r.provider as LlmProviderId,
      feature: r.feature as UsageFeature,
      inputTokens: r.inputTokens,
      outputTokens: r.outputTokens,
      at: r.at,
    }));
  }

  async removeForOwner(ownerId: string): Promise<void> {
    await this.db.delete(usageEvents).where(eq(usageEvents.ownerId, ownerId));
  }
}
