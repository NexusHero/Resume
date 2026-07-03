/**
 * Text → vector, for semantic similarity. The port exists so the hashed
 * lexical default (offline, deterministic) can be swapped for a neural model
 * without touching matching — the same inversion that keeps LLM providers
 * replaceable (ADR-0017).
 */
export interface EmbeddingProvider {
  embed(text: string): Promise<number[]>;
}
