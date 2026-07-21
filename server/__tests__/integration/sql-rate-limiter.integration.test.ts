import type { Pool } from 'pg';
import { createDb, migrate, type Db } from '../../src/adapters/sql/db.js';
import { SqlRateLimiter } from '../../src/adapters/sql/sql-rate-limiter.js';

/**
 * Real-Postgres integration. Skipped unless DATABASE_URL is set, so the default
 * (no DB, CI, pre-commit) stays green; run with a throwaway database via:
 *   DATABASE_URL=postgres://... npx jest sql-rate-limiter
 */
const url = process.env.DATABASE_URL;
const suite = url ? describe : describe.skip;

suite('SqlRateLimiter (real Postgres)', () => {
  let db: Db;
  let pool: Pool;

  beforeAll(async () => {
    const conn = createDb(url as string);
    db = conn.db;
    pool = conn.pool;
    await migrate(pool);
  });

  afterAll(async () => {
    await pool.end();
  });

  beforeEach(async () => {
    await pool.query('TRUNCATE rate_limit_windows');
  });

  it('CountsUp_ForRepeatedHitsOnTheSameKeyWithinTheWindow', async () => {
    const limiter = new SqlRateLimiter(db.$client);
    expect(await limiter.hit('a', 60_000)).toEqual({ count: 1 });
    expect(await limiter.hit('a', 60_000)).toEqual({ count: 2 });
    expect(await limiter.hit('a', 60_000)).toEqual({ count: 3 });
  });

  it('ResetsTheCount_OnceTheWindowExpires', async () => {
    const limiter = new SqlRateLimiter(db.$client);
    expect(await limiter.hit('a', 10)).toEqual({ count: 1 });
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(await limiter.hit('a', 10)).toEqual({ count: 1 }); // fresh window, not 2
  });

  it('SharesTheCountAcrossTwoIndependentInstances_ProvingCrossProcessSharing', async () => {
    // Two SqlRateLimiter instances over two independent pools stand in for two
    // horizontally-scaled server processes hitting the same shared counter —
    // the whole point of STORE=sql over the per-process InMemoryRateLimiter.
    const otherConn = createDb(url as string);
    try {
      const limiterA = new SqlRateLimiter(db.$client);
      const limiterB = new SqlRateLimiter(otherConn.pool);
      expect(await limiterA.hit('shared-key', 60_000)).toEqual({ count: 1 });
      expect(await limiterB.hit('shared-key', 60_000)).toEqual({ count: 2 });
      expect(await limiterA.hit('shared-key', 60_000)).toEqual({ count: 3 });
    } finally {
      await otherConn.pool.end();
    }
  });

  it('ConcurrentHitsOnTheSameKey_EachGetADistinctSerializedCount', async () => {
    const limiter = new SqlRateLimiter(db.$client);
    const results = await Promise.all(
      Array.from({ length: 10 }, () => limiter.hit('concurrent-key', 60_000)),
    );
    const counts = results.map((r) => r.count).sort((a, b) => a - b);
    expect(counts).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });
});
