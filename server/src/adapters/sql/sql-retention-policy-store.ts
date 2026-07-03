import { eq } from 'drizzle-orm';
import type { RetentionPolicy } from '../../domain/retention';
import type { RetentionPolicyStore } from '../../ports/retention-policy-store';
import type { Db } from './db';
import { retentionPolicies } from './schema';

/** Postgres-backed retention policy (one row per scope; jsonb payload). */
export class SqlRetentionPolicyStore implements RetentionPolicyStore {
  private readonly db: Db;

  constructor(deps: { db: Db }) {
    this.db = deps.db;
  }

  async get(ownerId: string): Promise<RetentionPolicy | null> {
    const rows = await this.db
      .select()
      .from(retentionPolicies)
      .where(eq(retentionPolicies.ownerId, ownerId));
    return rows[0] ? (rows[0].policy as RetentionPolicy) : null;
  }

  async set(ownerId: string, policy: RetentionPolicy): Promise<void> {
    await this.db
      .insert(retentionPolicies)
      .values({ ownerId, policy })
      .onConflictDoUpdate({ target: retentionPolicies.ownerId, set: { policy } });
  }
}
