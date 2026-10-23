/**
 * Fetches an arbitrary, user-supplied URL safely (SSRF-guarded, AK-1.4) and
 * returns the page's stripped text. This is deliberately **not** the JSON
 * `HttpFetch` (which only exposes `ok/status/json`): the page fetcher needs
 * redirect control, body streaming for size/time limits and IP pinning against
 * DNS rebinding.
 *
 * Throws `SsrfBlockedError` (blocked target), `PostingFetchError` (timeout /
 * too-large / redirect-limit / network / non-2xx) or `NoTextError` (no usable
 * text). Used only by `JobPostingExtractService.fromUrl`.
 */
export interface PageFetcher {
  fetchPage(url: string): Promise<{ text: string; finalUrl: string }>;
}
