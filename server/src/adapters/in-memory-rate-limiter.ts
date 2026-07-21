import type { RateLimiter } from '../ports/rate-limiter.js';

// Bound how long a stale window lingers: without this, a map keyed on many
// distinct clients only ever grows for the life of the process.
const SWEEP_EVERY = 200;

/**
 * Per-process fixed-window counter. Correct for a single-instance deployment
 * (`STORE=fs`, offline/dev default); a horizontally-scaled deployment
 * (`STORE=sql`) uses {@link SqlRateLimiter} instead so the count is actually
 * shared across instances.
 */
export class InMemoryRateLimiter implements RateLimiter {
  private readonly windows = new Map<string, { count: number; resetAt: number }>();
  private hits = 0;

  private sweepExpired(now: number): void {
    if (++this.hits % SWEEP_EVERY !== 0) return;
    for (const [key, window] of this.windows) {
      if (window.resetAt <= now) this.windows.delete(key);
    }
  }

  async hit(key: string, windowMs: number): Promise<{ count: number }> {
    const now = Date.now();
    this.sweepExpired(now);
    const window = this.windows.get(key);
    if (!window || window.resetAt <= now) {
      this.windows.set(key, { count: 1, resetAt: now + windowMs });
      return { count: 1 };
    }
    window.count += 1;
    return { count: window.count };
  }
}
