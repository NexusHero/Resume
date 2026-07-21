import type { HttpFetch, HttpResponse } from '../ports/http-fetch.js';
import type { Logger } from '../ports/logger.js';

export interface CircuitBreakerOptions {
  /** Consecutive failures before the circuit opens (stops trying, fails fast). */
  failureThreshold: number;
  /** How long the circuit stays open before allowing one trial request through (half-open). */
  resetTimeoutMs: number;
  logger?: Logger;
  /** Injectable clock so tests can move time without waiting; defaults to Date.now. */
  now?: () => number;
  /** Identifies the wrapped source in the fail-fast error and the logs. */
  label?: string;
}

/** Thrown when the circuit is open — no network call was made for this attempt. */
export class CircuitOpenError extends Error {
  constructor(label: string) {
    super(`circuit open for ${label}: too many recent failures`);
    this.name = 'CircuitOpenError';
  }
}

type State = 'closed' | 'open' | 'half-open';

/**
 * Wrap an {@link HttpFetch} with a circuit breaker: closed (normal) -> open
 * (fail fast, no network call at all) -> half-open (one trial request) ->
 * closed on success or back to open on failure.
 *
 * Timeout+retry (resilient-fetch.ts) absorbs a single transient blip, but if a
 * board is genuinely down for an extended period every search still pays the
 * full timeout+retries cost hammering it again and again. After
 * `failureThreshold` consecutive failures this stops trying for
 * `resetTimeoutMs` and rejects immediately instead — so the other, healthy
 * boards come back faster and the down board isn't needlessly hammered.
 *
 * State lives only in this function's closure, so it is naturally scoped to
 * whichever single already-constructed `HttpFetch` is passed in (e.g. one job
 * source's own fetch) — never global. A board that is down does not affect
 * its neighbors; call this once per source with its own `inner`.
 *
 * An open circuit rejects like any other failed fetch — callers (the job
 * sources, then CompositeJobSource) already treat a thrown error from a
 * source as "this source is down right now" and skip it, so this introduces
 * no new failure mode into the pipeline.
 */
export function circuitBreaker(inner: HttpFetch, opts: CircuitBreakerOptions): HttpFetch {
  const now = opts.now ?? Date.now;
  const label = opts.label ?? 'job source';
  let state: State = 'closed';
  let failures = 0;
  let nextAttemptAt = 0;
  // Guards against a second call sneaking through as a concurrent trial while
  // the first half-open attempt is still in flight.
  let trialInFlight = false;

  return async (url, init): Promise<HttpResponse> => {
    if (state === 'open') {
      if (now() < nextAttemptAt) {
        throw new CircuitOpenError(label);
      }
      state = 'half-open';
    }
    if (state === 'half-open' && trialInFlight) {
      throw new CircuitOpenError(label);
    }

    const isTrial = state === 'half-open';
    if (isTrial) trialInFlight = true;
    try {
      const res = await inner(url, init);
      failures = 0;
      state = 'closed';
      trialInFlight = false;
      return res;
    } catch (err) {
      if (isTrial) trialInFlight = false;
      failures += 1;
      // A failed trial reopens regardless of the raw failure count — one bad
      // half-open attempt is enough evidence the board is still down.
      if (isTrial || failures >= opts.failureThreshold) {
        state = 'open';
        nextAttemptAt = now() + opts.resetTimeoutMs;
        opts.logger?.warn(
          { label, failures, resetTimeoutMs: opts.resetTimeoutMs, err: String(err) },
          'circuit breaker opened — failing fast for this source',
        );
      } else {
        opts.logger?.warn(
          { label, failures, threshold: opts.failureThreshold, err: String(err) },
          'circuit breaker recorded failure',
        );
      }
      throw err;
    }
  };
}
