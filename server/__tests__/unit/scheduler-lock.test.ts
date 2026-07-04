import { jest } from '@jest/globals';
import { NoopSchedulerLock } from '../../src/adapters/noop-scheduler-lock.js';
import {
  PgAdvisorySchedulerLock,
  lockId,
} from '../../src/adapters/sql/pg-advisory-scheduler-lock.js';
import type { Pool } from 'pg';

describe('NoopSchedulerLock', () => {
  it('Noop_AlwaysLeader_RunsTaskAndReportsRan', async () => {
    const lock = new NoopSchedulerLock();
    const task = jest.fn().mockResolvedValue(undefined);
    const ran = await lock.runExclusive('assistant', task);
    expect(task).toHaveBeenCalledTimes(1);
    expect(ran).toBe(true);
  });
});

/** A fake pg Pool whose single client answers try-lock with `locked`. */
function fakePool(locked: boolean) {
  const query = jest.fn(async (sql: string) => {
    if (sql.includes('pg_try_advisory_lock')) return { rows: [{ locked }] };
    return { rows: [{}] }; // pg_advisory_unlock
  });
  const release = jest.fn();
  const pool = { connect: jest.fn(async () => ({ query, release })) };
  return { pool: pool as unknown as Pool, query, release };
}

describe('PgAdvisorySchedulerLock', () => {
  it('Pg_LockWon_RunsTaskThenUnlocksAndReleases', async () => {
    const { pool, query, release } = fakePool(true);
    const task = jest.fn().mockResolvedValue(undefined);

    const ran = await new PgAdvisorySchedulerLock(pool).runExclusive('assistant', task);

    expect(ran).toBe(true);
    expect(task).toHaveBeenCalledTimes(1);
    expect(query.mock.calls.some(([sql]) => String(sql).includes('pg_advisory_unlock'))).toBe(true);
    expect(release).toHaveBeenCalledTimes(1);
  });

  it('Pg_LockLost_SkipsTaskAndDoesNotUnlock', async () => {
    const { pool, query, release } = fakePool(false);
    const task = jest.fn().mockResolvedValue(undefined);

    const ran = await new PgAdvisorySchedulerLock(pool).runExclusive('assistant', task);

    expect(ran).toBe(false);
    expect(task).not.toHaveBeenCalled();
    expect(query.mock.calls.some(([sql]) => String(sql).includes('pg_advisory_unlock'))).toBe(
      false,
    );
    expect(release).toHaveBeenCalledTimes(1); // client still returned to the pool
  });

  it('Pg_TaskThrows_StillUnlocksAndReleasesAndPropagates', async () => {
    const { pool, query, release } = fakePool(true);
    const task = jest.fn().mockRejectedValue(new Error('boom'));

    await expect(new PgAdvisorySchedulerLock(pool).runExclusive('assistant', task)).rejects.toThrow(
      'boom',
    );

    expect(query.mock.calls.some(([sql]) => String(sql).includes('pg_advisory_unlock'))).toBe(true);
    expect(release).toHaveBeenCalledTimes(1);
  });
});

describe('lockId', () => {
  it('LockId_SameKey_IsStable', () => {
    expect(lockId('assistant')).toBe(lockId('assistant'));
  });

  it('LockId_DifferentKeys_Differ', () => {
    expect(lockId('assistant')).not.toBe(lockId('retention'));
  });

  it('LockId_IsAPositiveSafeInteger', () => {
    const id = lockId('reply-sync');
    expect(Number.isSafeInteger(id)).toBe(true);
    expect(id).toBeGreaterThan(0);
  });
});
