import { jest } from '@jest/globals';
import {
  SsrfFetch,
  type SsrfFetchDeps,
  type SsrfLookupRecord,
} from '../../src/adapters/ssrf-fetch.js';
import { NoTextError, PostingFetchError, SsrfBlockedError } from '../../src/domain/errors.js';
import type { JobFetchConfig } from '../../src/config.js';

const DEFAULTS: JobFetchConfig = { maxBytes: 1_000_000, timeoutMs: 10_000, maxRedirects: 5 };

type FetchHandler = (url: string, init: { dispatcher?: unknown; signal?: AbortSignal }) => Response;

type AgentFactory = NonNullable<SsrfFetchDeps['createAgent']>;

/** Assemble an SsrfFetch with scripted lookup/fetch and a recording agent factory. */
function makeFetcher(opts: {
  config?: Partial<JobFetchConfig>;
  lookup?: Record<string, SsrfLookupRecord[]>;
  onFetch?: FetchHandler;
}) {
  const calls: { url: string; init: { dispatcher?: unknown; signal?: AbortSignal } }[] = [];
  const agents: { address: string; family: number }[] = [];

  const createAgent: AgentFactory = (address, family) => {
    agents.push({ address, family });
    return {} as ReturnType<AgentFactory>;
  };

  const deps: SsrfFetchDeps = {
    config: { ...DEFAULTS, ...opts.config },
    lookup: async (host) => opts.lookup?.[host] ?? [{ address: '93.184.216.34', family: 4 }],
    createAgent,
    fetchImpl: (url, init) => {
      calls.push({ url, init });
      return Promise.resolve(opts.onFetch!(url, init));
    },
  };
  return { fetcher: new SsrfFetch(deps), calls, agents };
}

const html = '<h1>Senior C++ Engineer</h1><p>Build fast distributed systems at Acme in Berlin.</p>';

describe('SsrfFetch — scheme whitelist', () => {
  it('SchemeFile_Rejected', async () => {
    const { fetcher } = makeFetcher({ onFetch: () => new Response(html) });
    await expect(fetcher.fetchPage('file:///etc/passwd')).rejects.toBeInstanceOf(SsrfBlockedError);
  });

  it('MalformedUrl_RejectedAsSsrfBlocked', async () => {
    const { fetcher, calls } = makeFetcher({ onFetch: () => new Response(html) });
    await expect(fetcher.fetchPage('http://[::1')).rejects.toBeInstanceOf(SsrfBlockedError);
    expect(calls).toHaveLength(0); // rejected before any request
  });

  it('SchemeFtpOrGopher_Rejected', async () => {
    const { fetcher } = makeFetcher({ onFetch: () => new Response(html) });
    await expect(fetcher.fetchPage('ftp://example.com/x')).rejects.toBeInstanceOf(SsrfBlockedError);
    await expect(fetcher.fetchPage('gopher://example.com/x')).rejects.toBeInstanceOf(
      SsrfBlockedError,
    );
  });
});

describe('SsrfFetch — host resolution & classification', () => {
  it('HostLocalhost_Rejected', async () => {
    const { fetcher, calls } = makeFetcher({
      lookup: { localhost: [{ address: '127.0.0.1', family: 4 }] },
      onFetch: () => new Response(html),
    });
    await expect(fetcher.fetchPage('http://localhost/')).rejects.toBeInstanceOf(SsrfBlockedError);
    expect(calls).toHaveLength(0); // rejected before any request
  });

  it('HostResolvingMixedAddresses_Rejected', async () => {
    const { fetcher, calls } = makeFetcher({
      lookup: {
        'example.com': [
          { address: '93.184.216.34', family: 4 },
          { address: '10.0.0.1', family: 4 },
        ],
      },
      onFetch: () => new Response(html),
    });
    await expect(fetcher.fetchPage('https://example.com/')).rejects.toBeInstanceOf(
      SsrfBlockedError,
    );
    expect(calls).toHaveLength(0);
  });

  it('RedirectToPrivate_Rejected', async () => {
    const { fetcher } = makeFetcher({
      lookup: { 'example.com': [{ address: '93.184.216.34', family: 4 }] },
      onFetch: (url) =>
        new URL(url).hostname === 'example.com'
          ? new Response('', { status: 302, headers: { location: 'http://10.0.0.1/' } })
          : new Response(html),
    });
    await expect(fetcher.fetchPage('https://example.com/')).rejects.toBeInstanceOf(
      SsrfBlockedError,
    );
  });

  it('SpecialFormHostLoopback_Rejected', async () => {
    // `2130706433` (decimal loopback) normalises to 127.0.0.1 before resolving.
    const { fetcher, calls } = makeFetcher({ onFetch: () => new Response(html) });
    await expect(fetcher.fetchPage('http://2130706433/')).rejects.toBeInstanceOf(SsrfBlockedError);
    expect(calls).toHaveLength(0);
  });

  it('SpecialFormHostPublic_Accepted', async () => {
    // `134744072` is 8.8.8.8 in decimal form → public → connected to the pinned quad.
    const { fetcher, agents } = makeFetcher({ onFetch: () => new Response(html) });
    const result = await fetcher.fetchPage('http://134744072/job');
    expect(result.finalUrl).toBe('http://134744072/job');
    expect(agents).toEqual([{ address: '8.8.8.8', family: 4 }]);
  });

  it('LiteralPrivateIp_Rejected', async () => {
    const { fetcher, calls } = makeFetcher({ onFetch: () => new Response(html) });
    await expect(fetcher.fetchPage('http://127.0.0.1/')).rejects.toBeInstanceOf(SsrfBlockedError);
    expect(calls).toHaveLength(0);
  });

  it('LiteralPrivateIpv6_Rejected', async () => {
    const { fetcher, calls } = makeFetcher({ onFetch: () => new Response(html) });
    await expect(fetcher.fetchPage('http://[::1]/')).rejects.toBeInstanceOf(SsrfBlockedError);
    expect(calls).toHaveLength(0);
  });

  it('SsrfFetch_UnresolvableHost_ReturnsPostingFetchNetwork', async () => {
    // A DNS resolution failure (ENOTFOUND) is a fetch failure, not an SSRF block
    // and not a raw 500 — the plan contract maps it to 502 posting-fetch.
    const fetcher = new SsrfFetch({
      config: { ...DEFAULTS },
      lookup: async () => {
        throw new Error('getaddrinfo ENOTFOUND does-not-exist.example');
      },
      createAgent: () => ({}) as ReturnType<AgentFactory>,
      fetchImpl: () => Promise.resolve(new Response(html)),
    });
    await expect(fetcher.fetchPage('https://does-not-exist.example/')).rejects.toMatchObject({
      reason: 'network',
    });
    await expect(fetcher.fetchPage('https://does-not-exist.example/')).rejects.toBeInstanceOf(
      PostingFetchError,
    );
  });
});

describe('SsrfFetch — redirects', () => {
  it('RedirectChainFollowedAndEachHopRechecked', async () => {
    const { fetcher, calls } = makeFetcher({
      lookup: {
        'example.com': [{ address: '93.184.216.34', family: 4 }],
        'jobs.example.org': [{ address: '93.184.216.35', family: 4 }],
      },
      onFetch: (url) =>
        new URL(url).hostname === 'example.com'
          ? new Response('', {
              status: 302,
              headers: { location: 'https://jobs.example.org/role' },
            })
          : new Response(html),
    });
    const result = await fetcher.fetchPage('https://example.com/');
    expect(result.text).toContain('Senior C++ Engineer');
    expect(result.finalUrl).toBe('https://jobs.example.org/role');
    // each hop re-resolved its own host (per-hop recheck)
    expect(calls.map((c) => c.url)).toEqual([
      'https://example.com/',
      'https://jobs.example.org/role',
    ]);
  });

  it('RelativeRedirect_ResolvedAgainstCurrentUrl', async () => {
    const { fetcher, calls } = makeFetcher({
      onFetch: (url) =>
        url === 'https://example.com/start'
          ? new Response('', { status: 301, headers: { location: '/job/123' } })
          : new Response(html),
    });
    const result = await fetcher.fetchPage('https://example.com/start');
    expect(result.finalUrl).toBe('https://example.com/job/123');
    expect(calls[1]?.url).toBe('https://example.com/job/123');
  });

  it('TooManyRedirects_ThrowsPostingFetchRedirectLimit', async () => {
    const { fetcher } = makeFetcher({
      config: { maxRedirects: 0 },
      onFetch: () =>
        new Response('', { status: 302, headers: { location: 'https://example.com/x' } }),
    });
    await expect(fetcher.fetchPage('https://example.com/')).rejects.toMatchObject({
      reason: 'redirect-limit',
    });
  });

  it('SsrfFetch_MalformedRedirectLocation_ReturnsPostingFetchNetwork', async () => {
    // A broken Location header makes `new URL(…, base)` throw a plain TypeError —
    // it must surface as 502 posting-fetch, not a raw 500.
    const { fetcher } = makeFetcher({
      onFetch: () => new Response('', { status: 302, headers: { location: 'http://[::1' } }),
    });
    await expect(fetcher.fetchPage('https://example.com/')).rejects.toMatchObject({
      reason: 'network',
    });
    await expect(fetcher.fetchPage('https://example.com/')).rejects.toBeInstanceOf(
      PostingFetchError,
    );
  });
});

describe('SsrfFetch — limits & failures', () => {
  it('FetchError_ThrowsPostingFetchNetwork', async () => {
    const { fetcher, calls } = makeFetcher({
      onFetch: () => {
        throw new Error('boom');
      },
    });
    await expect(fetcher.fetchPage('https://example.com/')).rejects.toMatchObject({
      reason: 'network',
    });
    expect(calls).toHaveLength(1); // the fetch itself failed, not the check
  });

  it('BodyReadError_ThrowsPostingFetchNetwork', async () => {
    // A body stream that errors mid-read (not an abort) → PostingFetchError('network').
    const failing = new Response(
      new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(new TextEncoder().encode('<p>hello</p>'));
          controller.error(new Error('stream boom'));
        },
      }),
      { status: 200, headers: { 'content-type': 'text/html' } },
    );
    const { fetcher } = makeFetcher({ onFetch: () => failing });
    await expect(fetcher.fetchPage('https://example.com/')).rejects.toMatchObject({
      reason: 'network',
    });
  });

  it('BodyOverSizeLimit_ThrowsPostingFetchTooLarge', async () => {
    const { fetcher } = makeFetcher({
      config: { maxBytes: 10 },
      onFetch: () => new Response('<p>this body is far longer than ten bytes</p>'),
    });
    await expect(fetcher.fetchPage('https://example.com/')).rejects.toMatchObject({
      reason: 'too-large',
    });
  });

  it('Non2xx_ThrowsPostingFetch', async () => {
    const { fetcher } = makeFetcher({ onFetch: () => new Response('', { status: 500 }) });
    await expect(fetcher.fetchPage('https://example.com/')).rejects.toBeInstanceOf(
      PostingFetchError,
    );
  });

  it('Timeout_ThrowsPostingFetchTimeout', async () => {
    jest.useFakeTimers();
    try {
      const hanging = new SsrfFetch({
        config: { maxBytes: 1_000_000, timeoutMs: 1000, maxRedirects: 5 },
        lookup: async () => [{ address: '93.184.216.34', family: 4 }],
        createAgent: () => ({}) as ReturnType<AgentFactory>,
        fetchImpl: (_url, init) =>
          new Promise((_resolve, reject) => {
            init.signal?.addEventListener('abort', () =>
              reject(new DOMException('aborted', 'AbortError')),
            );
          }),
      });
      const p = hanging.fetchPage('https://example.com/');
      const assertion = expect(p).rejects.toMatchObject({ reason: 'timeout' });
      await jest.advanceTimersByTimeAsync(1000);
      await assertion;
    } finally {
      jest.useRealTimers();
    }
  });
});

describe('SsrfFetch — text extraction', () => {
  it('HtmlPage_ReturnsStrippedTextAndFinalUrl', async () => {
    const { fetcher } = makeFetcher({ onFetch: () => new Response(html) });
    const result = await fetcher.fetchPage('https://example.com/job');
    expect(result.text).toBe(
      'Senior C++ Engineer Build fast distributed systems at Acme in Berlin.',
    );
    expect(result.finalUrl).toBe('https://example.com/job');
  });

  it('PageWithoutText_ThrowsNoText', async () => {
    const { fetcher } = makeFetcher({ onFetch: () => new Response('   ') });
    await expect(fetcher.fetchPage('https://example.com/')).rejects.toBeInstanceOf(NoTextError);
  });

  it('ScriptHeavyLoginPage_ThrowsNoText', async () => {
    // AK-1.5: inline <script>/<style> must not count as "text".
    const { fetcher } = makeFetcher({
      onFetch: () =>
        new Response('<script>window.APP=Array(500).join("x");</script><style>body{}</style>'),
    });
    await expect(fetcher.fetchPage('https://login.example.com/')).rejects.toBeInstanceOf(
      NoTextError,
    );
  });
});

describe('SsrfFetch — DNS pinning', () => {
  it('ConnectsToVettedIp', async () => {
    const { fetcher, agents } = makeFetcher({
      lookup: { 'example.com': [{ address: '93.184.216.34', family: 4 }] },
      onFetch: () => new Response(html),
    });
    await fetcher.fetchPage('https://example.com/job');
    expect(agents).toEqual([{ address: '93.184.216.34', family: 4 }]);
  });

  it('FallsBackToDefaultAgentFactoryWhenNotInjected', async () => {
    // No createAgent injected → the constructor-default undici Agent is used.
    const fetcher = new SsrfFetch({
      config: { ...DEFAULTS },
      lookup: async () => [{ address: '93.184.216.34', family: 4 }],
      fetchImpl: (_url, _init) => Promise.resolve(new Response(html)),
    });
    const result = await fetcher.fetchPage('https://example.com/job');
    expect(result.finalUrl).toBe('https://example.com/job');
  });

  it('LiteralPublicIpv6_FetchedAndPinnedToFamily6', async () => {
    const { fetcher, agents } = makeFetcher({
      lookup: { '[2001:4860:4860::8888]': [{ address: '2001:4860:4860::8888', family: 6 }] },
      onFetch: () => new Response(html),
    });
    const result = await fetcher.fetchPage('https://[2001:4860:4860::8888]/job');
    expect(result.finalUrl).toBe('https://[2001:4860:4860::8888]/job');
    expect(agents).toEqual([{ address: '2001:4860:4860::8888', family: 6 }]);
  });
});
