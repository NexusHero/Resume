/**
 * Minimal HTTP boundary used by the job-source adapters. Kept tiny and injectable
 * so the adapters' mapping logic is unit-tested against recorded JSON without ever
 * touching the network. The production binding (`nodeFetch`) wraps global fetch.
 */
export interface HttpResponse {
  ok: boolean;
  status: number;
  json(): Promise<unknown>;
  /**
   * The response body as a web `ReadableStream` (the `Response` form), or `null`
   * when there is none. Added for the agent's SSE streaming (ADR-0062 §2): the
   * production `nodeFetch` binding already returns a full `Response`, so the
   * stream is read with a `TextDecoder` + SSE line parser. Job-source fakes may
   * leave this `null`.
   */
  body: ReadableStream<Uint8Array> | null;
}

export type HttpFetch = (
  url: string,
  init?: {
    method?: string;
    headers?: Record<string, string>;
    body?: string;
    /** Abort signal, e.g. from a per-call timeout; forwarded to global fetch. */
    signal?: AbortSignal;
  },
) => Promise<HttpResponse>;
