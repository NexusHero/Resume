/**
 * Runs periodic background jobs on exactly one instance (ADR-0030). With more
 * than one app instance behind Postgres, an unguarded `setInterval` fires on
 * every instance and duplicates the work (assistant runs, retention sweeps,
 * reply polling). A `SchedulerLock` gates each tick so only the leader for a
 * given job runs it.
 */
export interface SchedulerLock {
  /**
   * Run `task` iff this instance currently holds the lock named `key`; skip it
   * otherwise. Resolves to `true` when the task ran (this instance was the
   * leader for `key`), `false` when another instance held it. Never rejects for
   * a lost election — only a genuine task or backend failure propagates.
   */
  runExclusive(key: string, task: () => Promise<void>): Promise<boolean>;
}
