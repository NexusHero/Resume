/**
 * An LLM text-generation backend (Claude, Gemini, …). Kept deliberately small —
 * one `generate` call — so the cover-letter service can switch providers at
 * runtime without knowing which vendor is behind it. Adapters talk to their
 * vendor over the injectable {@link ../ports/http-fetch.HttpFetch} boundary, so
 * they unit-test against recorded JSON without touching the network.
 */
export type LlmProviderId = 'claude' | 'gemini';

export interface LlmGenerateInput {
  /** Optional system / instruction prompt. */
  system?: string;
  /** The user prompt. */
  prompt: string;
  /** Soft cap on generated tokens (provider default applies when unset). */
  maxTokens?: number;
}

export interface LlmProvider {
  readonly id: LlmProviderId;
  /** Human-readable name shown in the provider picker. */
  readonly label: string;
  /** True only when credentials are configured — an unavailable provider must not be selected. */
  readonly available: boolean;
  /** Generate a completion. Throws on transport / API errors. */
  generate(input: LlmGenerateInput): Promise<string>;
}
