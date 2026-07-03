import { NeuralEmbeddingProvider, type NeuralEmbeddingRequest } from './neural-embedding-provider';
import type { EmbeddingProvider } from '../ports/embedding-provider';
import type { HttpFetch } from '../ports/http-fetch';
import type { Logger } from '../ports/logger';

export interface OpenAiEmbeddingConfig {
  apiKey: string;
  /** Embedding model, e.g. text-embedding-3-small. */
  model: string;
  /** API base URL (no trailing slash), e.g. https://api.openai.com/v1. */
  baseUrl: string;
  timeoutMs: number;
}

/**
 * Neural embeddings from OpenAI's embeddings API (ADR-0020). Highest match
 * quality, but a third-party data processor — opt-in, and only selected when a
 * key is set. On any error it falls back to hashed vectors.
 */
export class OpenAiEmbeddingProvider extends NeuralEmbeddingProvider {
  private readonly apiKey: string;
  private readonly model: string;
  private readonly baseUrl: string;

  constructor(deps: {
    httpFetch: HttpFetch;
    fallback: EmbeddingProvider;
    logger: Logger;
    config: OpenAiEmbeddingConfig;
  }) {
    super(deps.httpFetch, deps.fallback, deps.logger, deps.config.timeoutMs, 'openai');
    this.apiKey = deps.config.apiKey;
    this.model = deps.config.model;
    this.baseUrl = deps.config.baseUrl;
  }

  protected request(text: string): NeuralEmbeddingRequest {
    return {
      url: `${this.baseUrl}/embeddings`,
      headers: { authorization: `Bearer ${this.apiKey}` },
      body: { model: this.model, input: text },
    };
  }

  protected extract(json: unknown): number[] | undefined {
    return (json as { data?: { embedding?: number[] }[] } | null)?.data?.[0]?.embedding;
  }
}
