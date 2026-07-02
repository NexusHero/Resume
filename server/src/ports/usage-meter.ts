import type { UsageEvent } from '../domain/usage';

/**
 * Append-only meter of metered LLM calls, scoped to a user (the account whose
 * key/quota the call counts against). Recording must never break the feature
 * that triggered it — callers swallow errors — so the port stays tiny.
 */
export interface UsageMeter {
  /** Record one metered generation. */
  record(event: UsageEvent): Promise<void>;
  /** Every event for a user, in insertion order. */
  list(userId: string): Promise<UsageEvent[]>;
  /** Drop a user's events (DSGVO account erasure). */
  removeForUser(userId: string): Promise<void>;
}
