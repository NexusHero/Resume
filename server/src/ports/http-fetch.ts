/**
 * Minimal HTTP boundary used by the job-source adapters. Kept tiny and injectable
 * so the adapters' mapping logic is unit-tested against recorded JSON without ever
 * touching the network. The production binding (`nodeFetch`) wraps global fetch.
 */
export interface HttpResponse {
  ok: boolean;
  status: number;
  json(): Promise<unknown>;
}

export type HttpFetch = (
  url: string,
  init?: { method?: string; headers?: Record<string, string>; body?: string },
) => Promise<HttpResponse>;
