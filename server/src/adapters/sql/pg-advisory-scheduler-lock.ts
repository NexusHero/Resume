import type { Pool } from 'pg';
import type { SchedulerLock } from '../../ports/scheduler-lock.js';

/**
 * Postgres advisory-lock leader election (ADR-0030). Each tick tries a
 * non-blocking session advisory lock keyed by the job; only the instance that
 * wins runs the task, and the lock is released on the **same** connection
 * afterwards (session advisory locks are connection-scoped, so lock and unlock
 * must share a client). A crashed leader's session ends and Postgres drops the
 * lock, so the next tick re-elects automatically — no lease renewal needed.
 */
export class PgAdvisorySchedulerLock implements SchedulerLock {
  constructor(private readonly pool: Pool) {}

  async runExclusive(key: string, task: () => Promise<void>): Promise<boolean> {
    const id = lockId(key);
    const client = await this.pool.connect();
    try {
      const res = await client.query<{ locked: boolean }>(
        'SELECT pg_try_advisory_lock($1) AS locked',
        [id],
      );
      if (!res.rows[0]?.locked) return false;
      try {
        await task();
      } finally {
        await client.query('SELECT pg_advisory_unlock($1)', [id]);
      }
      return true;
    } finally {
      client.release();
    }
  }
}

/**
 * Stable, namespaced 31-bit key for `pg_try_advisory_lock(bigint)`. FNV-1a over
 * a namespaced string, masked positive so it never collides with another app's
 * advisory locks by accident and stays a safe integer.
 */
export function lockId(key: string): number {
  const s = `myjob:scheduler:${key}`;
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h & 0x7fffffff;
}
