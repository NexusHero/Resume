import type { SchedulerLock } from '../ports/scheduler-lock';

/**
 * Single-instance default (ADR-0030): this process is always the leader, so
 * every job runs. Used with the filesystem store and any deployment that runs
 * exactly one instance — no coordination needed.
 */
export class NoopSchedulerLock implements SchedulerLock {
  async runExclusive(_key: string, task: () => Promise<void>): Promise<boolean> {
    await task();
    return true;
  }
}
