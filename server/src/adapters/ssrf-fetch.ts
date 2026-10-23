import dns from 'node:dns';
import ipaddr from 'ipaddr.js';
import { Agent, buildConnector, type Dispatcher } from 'undici';
import { NoTextError, PostingFetchError, SsrfBlockedError } from '../domain/errors.js';
import type { JobFetchConfig } from '../config.js';
import type { PageFetcher } from '../ports/page-fetcher.js';
import { classifyAddresses, normalizeSpecialHost } from './ssrf-guard.js';
import { htmlToText } from './html-text.js';

/** The minimum meaningful (non-whitespace) text for a posting page (AK-1.5). */
const MIN_TEXT_CHARS = 20;

export interface SsrfLookupRecord {
  address: string;
  family: number;
}

type SsrfLookup = (host: string) => Promise<SsrfLookupRecord[]>;

type FetchImpl = (
  url: string,
  init: {
    redirect: 'manual';
    dispatcher?: Dispatcher;
    signal?: AbortSignal;
  },
) => Promise<Response>;

const defaultLookup: SsrfLookup = (host) => dns.promises.lookup(host, { all: true });

const defaultFetch: FetchImpl = (url, init) => fetch(url, init as RequestInit);

/**
 * Pin undici's connection to an already-vetted IP: the `lookup` override returns
 * the vetted address so the socket connects to it without a second DNS
 * resolution (closing the DNS-rebinding window). The request URL is unchanged,
 * so the `Host` header and TLS SNI still carry the original host.
 */
const defaultCreateAgent = (address: string, family: number): Dispatcher =>
  new Agent({
    connect: buildConnector({
      lookup: (_hostname, _options, callback) => callback(null, address, family),
    }),
  });

export interface SsrfFetchDeps {
  config: JobFetchConfig;
  /** Injectable DNS lookup (all records) for tests. */
  lookup?: SsrfLookup;
  /** Injectable fetch (returns undici-compatible responses) for tests. */
  fetchImpl?: FetchImpl;
  /** Injectable agent factory for tests (asserts the pinned IP). */
  createAgent?: (address: string, family: number) => Dispatcher;
}

function isAbortError(err: unknown): boolean {
  // Node's DOMException is not an `Error`, so check the name on any object.
  return (err as { name?: string } | null)?.name === 'AbortError';
}

/** Strip the brackets a URL hostname carries around an IPv6 literal. */
function stripBrackets(host: string): string {
  return host.startsWith('[') && host.endsWith(']') ? host.slice(1, -1) : host;
}

/**
 * The `PageFetcher` adapter: a user-supplied URL, fetched SSRF-safely. Every
 * hop (initial URL + each redirect) is re-checked: schema whitelist, host
 * special-form normalisation, IP classification, then a pinned connection.
 * Size/time/redirect limits come from `config.jobFetch` (Q5); the classification
 * itself is hard-wired.
 */
export class SsrfFetch implements PageFetcher {
  private readonly cfg: JobFetchConfig;
  private readonly lookup: SsrfLookup;
  private readonly fetchImpl: FetchImpl;
  private readonly createAgent: (address: string, family: number) => Dispatcher;

  constructor(deps: SsrfFetchDeps) {
    this.cfg = deps.config;
    this.lookup = deps.lookup ?? defaultLookup;
    this.fetchImpl = deps.fetchImpl ?? defaultFetch;
    this.createAgent = deps.createAgent ?? defaultCreateAgent;
  }

  async fetchPage(rawUrl: string): Promise<{ text: string; finalUrl: string }> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.cfg.timeoutMs);
    try {
      let url = rawUrl;
      for (let hop = 0; ; hop += 1) {
        if (hop > this.cfg.maxRedirects) throw new PostingFetchError('redirect-limit');

        const parsed = this.assertAllowedScheme(url);
        const vetted = await this.vettedAddress(parsed.hostname);
        const agent = this.createAgent(vetted.address, vetted.family);

        let res: Response;
        try {
          res = await this.fetchImpl(url, {
            redirect: 'manual',
            dispatcher: agent,
            signal: controller.signal,
          });
        } catch (err) {
          if (isAbortError(err)) throw new PostingFetchError('timeout');
          throw new PostingFetchError('network');
        }

        // Redirect hop — resolve against the current URL and re-run the whole
        // check (schema, host classification, pinning) from step 1.
        if (res.status >= 300 && res.status < 400) {
          const location = res.headers.get('location');
          if (!location) throw new PostingFetchError('network');
          // A malformed Location header makes `new URL(…, base)` throw a plain
          // TypeError — map it to the fetch contract (502 posting-fetch), never
          // a raw 500.
          let next: URL;
          try {
            next = new URL(location, parsed);
          } catch {
            throw new PostingFetchError('network');
          }
          url = next.toString();
          continue;
        }

        if (!res.ok) throw new PostingFetchError('http-status');

        const text = await this.readBodyCapped(res, controller);
        const extracted = htmlToText(text);
        if (extracted.replace(/\s/g, '').length < MIN_TEXT_CHARS) throw new NoTextError();
        return { text: extracted, finalUrl: url };
      }
    } finally {
      clearTimeout(timeout);
    }
  }

  private assertAllowedScheme(url: string): URL {
    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      throw new SsrfBlockedError();
    }
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') throw new SsrfBlockedError();
    return parsed;
  }

  /** Resolve the host and return the vetted (public) address to connect to. */
  private async vettedAddress(hostname: string): Promise<SsrfLookupRecord> {
    const bare = stripBrackets(hostname);

    // Non-dotted special forms (decimal/hex/octal/shorthand) normalise to a
    // dotted quad and are classified directly — before any DNS resolution.
    const special = normalizeSpecialHost(bare);
    if (special !== null) {
      if (!classifyAddresses([special])) throw new SsrfBlockedError();
      return { address: special, family: 4 };
    }

    // A literal IPv4/IPv6 (ipaddr.js parses it): classify directly.
    if (ipaddr.isValid(bare)) {
      if (!classifyAddresses([bare])) throw new SsrfBlockedError();
      return { address: bare, family: ipaddr.parse(bare).kind() === 'ipv6' ? 6 : 4 };
    }

    // A hostname: resolve every record (A and AAAA) and require all public. A
    // resolution failure (ENOTFOUND, …) is a fetch failure, not an SSRF block —
    // map it to `502 posting-fetch` (`reason: network`) per the plan contract.
    let records: SsrfLookupRecord[];
    try {
      records = await this.lookup(bare);
    } catch {
      throw new PostingFetchError('network');
    }
    if (!classifyAddresses(records.map((r) => r.address))) throw new SsrfBlockedError();
    const first = records[0];
    if (!first) throw new PostingFetchError('network');
    return first;
  }

  /** Read the body, aborting (too-large) once it exceeds `maxBytes`. */
  private async readBodyCapped(res: Response, controller: AbortController): Promise<string> {
    const reader = res.body?.getReader();
    if (!reader) return '';
    const chunks: Uint8Array[] = [];
    const decoder = new TextDecoder();
    let total = 0;
    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        total += value.byteLength;
        if (total > this.cfg.maxBytes) {
          controller.abort();
          throw new PostingFetchError('too-large');
        }
        chunks.push(value);
      }
    } catch (err) {
      if (err instanceof PostingFetchError) throw err;
      if (isAbortError(err)) throw new PostingFetchError('timeout');
      throw new PostingFetchError('network');
    }
    const text = chunks.map((c) => decoder.decode(c, { stream: true })).join('');
    return text + decoder.decode();
  }
}
