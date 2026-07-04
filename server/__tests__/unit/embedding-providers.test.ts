import { OllamaEmbeddingProvider } from '../../src/adapters/ollama-embedding-provider.js';
import { OpenAiEmbeddingProvider } from '../../src/adapters/openai-embedding-provider.js';
import { HashedEmbeddingProvider } from '../../src/adapters/hashed-embedding-provider.js';
import { createEmbeddingProvider } from '../../src/adapters/create-embedding-provider.js';
import { embed } from '../../src/domain/embedding.js';
import type { EmbeddingConfig } from '../../src/config.js';
import type { HttpFetch, HttpResponse } from '../../src/ports/http-fetch.js';
import { noopLogger } from '../support/fakes.js';

const hashed = new HashedEmbeddingProvider();

/** A stub HttpFetch that records the last call and returns a scripted reply. */
function stubFetch(reply: { ok?: boolean; status?: number; json?: unknown; throws?: boolean }) {
  const calls: { url: string; init?: Parameters<HttpFetch>[1] }[] = [];
  const fetch: HttpFetch = async (url, init) => {
    calls.push({ url, init });
    if (reply.throws) throw new Error('network down');
    const res: HttpResponse = {
      ok: reply.ok ?? true,
      status: reply.status ?? 200,
      json: async () => reply.json,
    };
    return res;
  };
  return { fetch, calls };
}

const norm = (v: number[]) => Math.sqrt(v.reduce((a, x) => a + x * x, 0));

const ollamaConfig = { url: 'http://localhost:11434', model: 'nomic-embed-text', timeoutMs: 1000 };
const openaiConfig = {
  apiKey: 'sk-test',
  model: 'text-embedding-3-small',
  baseUrl: 'https://api.openai.com/v1',
  timeoutMs: 1000,
};

describe('OllamaEmbeddingProvider', () => {
  it('Success_ReturnsNormalizedVector_AndPostsPrompt', async () => {
    const { fetch, calls } = stubFetch({ json: { embedding: [3, 4] } });
    const p = new OllamaEmbeddingProvider({
      httpFetch: fetch,
      fallback: hashed,
      logger: noopLogger,
      config: ollamaConfig,
    });
    const v = await p.embed('backend engineer');
    expect(v).toEqual([0.6, 0.8]); // L2-normalized
    expect(norm(v)).toBeCloseTo(1);
    expect(calls[0]!.url).toBe('http://localhost:11434/api/embeddings');
    expect(JSON.parse(calls[0]!.init!.body as string)).toEqual({
      model: 'nomic-embed-text',
      prompt: 'backend engineer',
    });
  });

  it('HttpError_FallsBackToHashed', async () => {
    const { fetch } = stubFetch({ ok: false, status: 500 });
    const p = new OllamaEmbeddingProvider({
      httpFetch: fetch,
      fallback: hashed,
      logger: noopLogger,
      config: ollamaConfig,
    });
    expect(await p.embed('go kubernetes')).toEqual(embed('go kubernetes'));
  });

  it('NetworkThrow_FallsBackToHashed', async () => {
    const { fetch } = stubFetch({ throws: true });
    const p = new OllamaEmbeddingProvider({
      httpFetch: fetch,
      fallback: hashed,
      logger: noopLogger,
      config: ollamaConfig,
    });
    expect(await p.embed('rust')).toEqual(embed('rust'));
  });

  it('MalformedReply_FallsBackToHashed', async () => {
    const { fetch } = stubFetch({ json: { notEmbedding: true } });
    const p = new OllamaEmbeddingProvider({
      httpFetch: fetch,
      fallback: hashed,
      logger: noopLogger,
      config: ollamaConfig,
    });
    expect(await p.embed('rust')).toEqual(embed('rust'));
  });

  it('EmptyText_DelegatesToFallback_WithoutFetching', async () => {
    const { fetch, calls } = stubFetch({ json: { embedding: [1, 0] } });
    const p = new OllamaEmbeddingProvider({
      httpFetch: fetch,
      fallback: hashed,
      logger: noopLogger,
      config: ollamaConfig,
    });
    expect(await p.embed('   ')).toEqual(embed('   '));
    expect(calls).toHaveLength(0);
  });
});

describe('OpenAiEmbeddingProvider', () => {
  it('Success_ExtractsDataEmbedding_AndSendsAuth', async () => {
    const { fetch, calls } = stubFetch({ json: { data: [{ embedding: [0, 5] }] } });
    const p = new OpenAiEmbeddingProvider({
      httpFetch: fetch,
      fallback: hashed,
      logger: noopLogger,
      config: openaiConfig,
    });
    const v = await p.embed('designer');
    expect(v).toEqual([0, 1]); // normalized
    expect(calls[0]!.url).toBe('https://api.openai.com/v1/embeddings');
    expect(calls[0]!.init!.headers!.authorization).toBe('Bearer sk-test');
    expect(JSON.parse(calls[0]!.init!.body as string)).toEqual({
      model: 'text-embedding-3-small',
      input: 'designer',
    });
  });

  it('HttpError_FallsBackToHashed', async () => {
    const { fetch } = stubFetch({ ok: false, status: 401 });
    const p = new OpenAiEmbeddingProvider({
      httpFetch: fetch,
      fallback: hashed,
      logger: noopLogger,
      config: openaiConfig,
    });
    expect(await p.embed('designer')).toEqual(embed('designer'));
  });
});

describe('createEmbeddingProvider', () => {
  const base: EmbeddingConfig = {
    provider: 'hashed',
    ollama: { url: 'http://localhost:11434', model: 'nomic-embed-text' },
    openai: { apiKey: '', model: 'text-embedding-3-small', baseUrl: 'https://api.openai.com/v1' },
    timeoutMs: 1000,
  };
  const httpFetch: HttpFetch = async () => ({ ok: true, status: 200, json: async () => ({}) });
  const make = (config: EmbeddingConfig) =>
    createEmbeddingProvider({ config, logger: noopLogger, httpFetch });

  it('Default_IsHashed', () => {
    expect(make(base)).toBeInstanceOf(HashedEmbeddingProvider);
  });

  it('Ollama_ReturnsOllamaProvider', () => {
    expect(make({ ...base, provider: 'ollama' })).toBeInstanceOf(OllamaEmbeddingProvider);
  });

  it('OpenAiWithKey_ReturnsOpenAiProvider', () => {
    const config = {
      ...base,
      provider: 'openai' as const,
      openai: { ...base.openai, apiKey: 'sk-x' },
    };
    expect(make(config)).toBeInstanceOf(OpenAiEmbeddingProvider);
  });

  it('OpenAiWithoutKey_FallsBackToHashed', () => {
    expect(make({ ...base, provider: 'openai' })).toBeInstanceOf(HashedEmbeddingProvider);
  });
});
