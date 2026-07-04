import { embed } from '../domain/embedding.js';
import type { EmbeddingProvider } from '../ports/embedding-provider.js';

/** The default embedding backend: local hashed lexical vectors (ADR-0017). */
export class HashedEmbeddingProvider implements EmbeddingProvider {
  async embed(text: string): Promise<number[]> {
    return embed(text);
  }
}
