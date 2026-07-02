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
      // Domain field `userId` maps onto the legacy `owner_id` column (no migration).
      userId: event.userId,
      provider: event.provider,
      feature: event.feature,
      inputTokens: event.inputTokens,
      outputTokens: event.outputTokens,
      at: event.at,
    });
  }

  async list(userId: string): Promise<UsageEvent[]> {
    const rows = await this.db
      .select()
      .from(usageEvents)
      .where(eq(usageEvents.userId, userId))
      .orderBy(asc(usageEvents.seq));
    return rows.map((r) => ({
      userId: r.userId,
      provider: r.provider as LlmProviderId,
      feature: r.feature as UsageFeature,
      inputTokens: r.inputTokens,
      outputTokens: r.outputTokens,
      at: r.at,
    }));
  }

  async removeForUser(userId: string): Promise<void> {
    await this.db.delete(usageEvents).where(eq(usageEvents.userId, userId));
  }
}
