import type { LlmProviderId } from './llm-provider.js';

/**
 * Per-user LLM provider API keys, stored server-side (encrypted at rest) instead
 * of in the browser. Keys go in and come out as plaintext; persistence adapters
 * handle the encryption.
 */
export interface ApiKeyStore {
  set(ownerId: string, provider: LlmProviderId, key: string): Promise<void>;
  get(ownerId: string, provider: LlmProviderId): Promise<string | null>;
  remove(ownerId: string, provider: LlmProviderId): Promise<boolean>;
  /** Which providers the user has a key configured for (for status display). */
  providersFor(ownerId: string): Promise<LlmProviderId[]>;
}
