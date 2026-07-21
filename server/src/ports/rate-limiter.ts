/**
 * A fixed-window request counter, keyed by an arbitrary string (an IP, a user
 * id). Backs both the credential-endpoint brute-force guard and the AI-spend
 * guard. The port exists so a single-instance deployment can keep a cheap
 * in-memory counter while a horizontally-scaled one (`STORE=sql`) shares the
 * count across every instance — otherwise each instance would enforce its own
 * independent limit, making the effective limit N times more permissive than
 * configured as the deployment scales out.
 */
export interface RateLimiter {
  /**
   * Record one hit for `key` and return the count within its current window.
   * The window starts (or restarts) on the first hit after the previous one
   * expired; `windowMs` is the window length for a *newly started* window —
   * an in-flight window keeps whatever length it started with.
   */
  hit(key: string, windowMs: number): Promise<{ count: number }>;
}
