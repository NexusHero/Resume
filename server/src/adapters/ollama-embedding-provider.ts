import { NeuralEmbeddingProvider, type NeuralEmbeddingRequest } from './neural-embedding-provider';
import type { EmbeddingProvider } from '../ports/embedding-provider';
import type { HttpFetch } from '../ports/http-fetch';
import type { Logger } from '../ports/logger';

export interface OllamaEmbeddingConfig {
  /** Base URL of the Ollama server, e.g. http://localhost:11434 (no trailing slash). */
  url: string;
  /** Embedding model to run, e.g. nomic-embed-text. */
  model: string;
  timeoutMs: number;
}

/**
 * Neural embeddings from a local Ollama server (ADR-0020). Fully first-party:
 * the model runs on the operator's own machine, so candidate text never leaves
 * the deployment (DSGVO). Opt-in; on any error it falls back to hashed vectors.
 */
export class OllamaEmbeddingProvider extends NeuralEmbeddingProvider {
  private readonly url: string;
  private readonly model: string;

  constructor(deps: {
    httpFetch: HttpFetch;
    fallback: EmbeddingProvider;
    logger: Logger;
    config: OllamaEmbeddingConfig;
  }) {
    super(deps.httpFetch, deps.fallback, deps.logger, deps.config.timeoutMs, 'ollama');
    this.url = deps.config.url;
    this.model = deps.config.model;
  }

  protected request(text: string): NeuralEmbeddingRequest {
    return { url: `${this.url}/api/embeddings`, body: { model: this.model, prompt: text } };
  }

  protected extract(json: unknown): number[] | undefined {
    return (json as { embedding?: number[] } | null)?.embedding;
  }
}
