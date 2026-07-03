import { l2normalize } from '../domain/embedding';
import type { EmbeddingProvider } from '../ports/embedding-provider';
import type { HttpFetch } from '../ports/http-fetch';
import type { Logger } from '../ports/logger';

/** The POST an embedding backend needs for one text. */
export interface NeuralEmbeddingRequest {
  url: string;
  headers?: Record<string, string>;
  body: unknown;
}

/**
 * Shared scaffold for HTTP-backed neural embedding providers (Ollama, OpenAI):
 * POST the text over the {@link HttpFetch} port, extract the vector, L2-normalize
 * it (so `cosine`/`similarityScore` stay in range whatever the backend returns)
 * and — on any failure or timeout — fall back to the deterministic hashed
 * provider so matching degrades instead of breaking (ADR-0017, ADR-0020). Empty
 * text is delegated to the fallback directly (no wasted round-trip).
 */
export abstract class NeuralEmbeddingProvider implements EmbeddingProvider {
  protected constructor(
    protected readonly http: HttpFetch,
    protected readonly fallback: EmbeddingProvider,
    protected readonly logger: Logger,
    protected readonly timeoutMs: number,
    protected readonly label: string,
  ) {}

  /** Build the backend-specific request for a text. */
  protected abstract request(text: string): NeuralEmbeddingRequest;
  /** Pull the embedding vector out of the backend's JSON reply. */
  protected abstract extract(json: unknown): number[] | undefined;

  async embed(text: string): Promise<number[]> {
    if (!text.trim()) return this.fallback.embed(text);
    const { url, headers, body } = this.request(text);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const res = await this.http(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json', ...headers },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      if (!res.ok) throw new Error(`${this.label} embeddings HTTP ${res.status}`);
      const vector = this.extract(await res.json());
      if (!Array.isArray(vector) || vector.length === 0) {
        throw new Error(`${this.label} returned no embedding`);
      }
      return l2normalize(vector);
    } catch (err) {
      this.logger.warn(
        { err: err instanceof Error ? err.message : String(err) },
        `${this.label} embedding failed, falling back to hashed vectors`,
      );
      return this.fallback.embed(text);
    } finally {
      clearTimeout(timer);
    }
  }
}
