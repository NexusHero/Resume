import type { Pool } from 'pg';
import type { RateLimiter } from '../../ports/rate-limiter.js';

// Bound how often a lazy sweep of expired rows runs — cheap opportunistic
// cleanup so the table doesn't grow unboundedly with one-off clients, without
// a separate scheduled job.
const SWEEP_EVERY = 200;

/**
 * Postgres-backed fixed-window counter, shared across every instance of a
 * horizontally-scaled deployment (`STORE=sql`) — unlike {@link
 * InMemoryRateLimiter}, whose count is only ever correct for a single
 * instance. A single atomic `INSERT ... ON CONFLICT DO UPDATE` both starts a
 * fresh window (when the previous one expired) and increments an in-flight
 * one, so concurrent hits on the same key from different instances still
 * serialize correctly on Postgres's per-row lock — no read-then-write race.
 */
export class SqlRateLimiter implements RateLimiter {
  private hits = 0;

  constructor(private readonly pool: Pool) {}

  private async sweepExpired(now: number): Promise<void> {
    if (++this.hits % SWEEP_EVERY !== 0) return;
    await this.pool.query('DELETE FROM rate_limit_windows WHERE reset_at <= $1', [now]);
  }

  async hit(key: string, windowMs: number): Promise<{ count: number }> {
    const now = Date.now();
    void this.sweepExpired(now); // best-effort; never block the caller on cleanup
    const res = await this.pool.query<{ count: number }>(
      `INSERT INTO rate_limit_windows (key, count, reset_at)
       VALUES ($1, 1, $2)
       ON CONFLICT (key) DO UPDATE SET
         count = CASE WHEN rate_limit_windows.reset_at <= $3 THEN 1
                       ELSE rate_limit_windows.count + 1 END,
         reset_at = CASE WHEN rate_limit_windows.reset_at <= $3 THEN $2
                         ELSE rate_limit_windows.reset_at END
       RETURNING count`,
      [key, now + windowMs, now],
    );
    return { count: res.rows[0]!.count };
  }
}
