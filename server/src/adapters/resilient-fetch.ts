import type { HttpFetch, HttpResponse } from '../ports/http-fetch.js';
import type { Logger } from '../ports/logger.js';

export interface ResilientFetchOptions {
  /** Abort a single attempt after this many ms so a hung board never blocks. */
  timeoutMs: number;
  /** Extra attempts after the first on failure (0 = no retry). */
  retries: number;
  logger?: Logger;
  /** Backoff before a retry; injectable so tests don't actually wait. */
  backoffMs?: (attempt: number) => number;
  sleep?: (ms: number) => Promise<void>;
}

/**
 * Wrap an {@link HttpFetch} with a per-attempt timeout and a bounded retry.
 * The job boards are third-party and occasionally slow or flaky; without a
 * timeout a hung request blocks the whole search (the composite awaits every
 * source), and without a retry a single transient blip empties the results.
 * A source that still fails after its retries throws — the composite then skips
 * it (or, if all fail, the search reports `liveSourcesDown`).
 */
/**
 * Drop the query string before logging a URL — some sources (e.g. Adzuna) put
 * their API credentials there, and the logger has no redaction configured, so
 * logging the raw URL would leak secrets into the log stream on every failure.
 */
function loggableUrl(url: string): string {
  const i = url.indexOf('?');
  return i === -1 ? url : url.slice(0, i);
}

export function resilientFetch(inner: HttpFetch, opts: ResilientFetchOptions): HttpFetch {
  const sleep = opts.sleep ?? ((ms: number) => new Promise((r) => setTimeout(r, ms)));
  const backoff = opts.backoffMs ?? ((attempt: number) => 200 * 2 ** attempt);
  return async (url, init): Promise<HttpResponse> => {
    let lastErr: unknown;
    for (let attempt = 0; attempt <= opts.retries; attempt++) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), opts.timeoutMs);
      try {
        return await inner(url, { ...init, signal: controller.signal });
      } catch (err) {
        lastErr = err;
        opts.logger?.warn(
          { url: loggableUrl(url), attempt, retries: opts.retries, err: String(err) },
          'job source fetch failed',
        );
        if (attempt < opts.retries) await sleep(backoff(attempt));
      } finally {
        clearTimeout(timer);
      }
    }
    throw lastErr;
  };
}
