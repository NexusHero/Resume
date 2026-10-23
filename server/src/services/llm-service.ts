import type { LlmProvider, LlmProviderId } from '../ports/llm-provider.js';
import type { Logger } from '../ports/logger.js';

export interface LlmProviderInfo {
  id: LlmProviderId;
  label: string;
  available: boolean;
}

export interface LlmSettings {
  /** The provider an AI call would use for this caller, or null when none is available. */
  current: LlmProviderId | null;
  providers: LlmProviderInfo[];
  /** True when at least one provider has a central server key. */
  configured: boolean;
}

export interface LlmServiceDeps {
  providers: LlmProvider[];
  /** Provider selected at startup (from config / env). */
  defaultProvider: LlmProviderId;
  logger: Logger;
}

/**
 * The LLM provider registry: every wired provider plus the server's configured
 * default. ADR-0057 keeps one central key per provider (env) and keeps the
 * persisted per-user provider *choice* (ADR-0011, Q9), but only among providers
 * that actually have a server key. This service answers "which providers exist,
 * which are available, and which one would be used".
 */
export class LlmService {
  private readonly providers: Map<LlmProviderId, LlmProvider>;
  private readonly currentId: LlmProviderId;

  constructor(deps: LlmServiceDeps) {
    this.providers = new Map(deps.providers.map((p) => [p.id, p]));
    this.currentId = this.providers.has(deps.defaultProvider)
      ? deps.defaultProvider
      : (deps.providers[0]?.id ?? 'claude');
    deps.logger.debug({ default: this.currentId }, 'llm providers wired');
  }

  /**
   * Resolve the provider for a caller (plan §5.4): 1. the stored choice when
   * that provider has a server key, 2. the configured default when available,
   * 3. any other available provider (Claude first), else null.
   */
  resolve(preferred?: LlmProviderId | null): LlmProvider | null {
    if (preferred) {
      const chosen = this.providers.get(preferred);
      if (chosen?.available) return chosen;
    }
    const configured = this.providers.get(this.currentId);
    if (configured?.available) return configured;
    const fallbackOrder: LlmProviderId[] = ['claude', 'gemini'];
    for (const id of fallbackOrder) {
      const provider = this.providers.get(id);
      if (provider?.available) return provider;
    }
    return [...this.providers.values()].find((p) => p.available) ?? null;
  }

  /** True when at least one provider has a central server key (ADR-0057). */
  hasAvailableProvider(): boolean {
    return [...this.providers.values()].some((p) => p.available);
  }

  settings(preferred?: LlmProviderId | null): LlmSettings {
    return {
      current: this.resolve(preferred)?.id ?? null,
      configured: this.hasAvailableProvider(),
      providers: [...this.providers.values()].map((p) => ({
        id: p.id,
        label: p.label,
        available: p.available,
      })),
    };
  }

  /** The provider by id, if wired (regardless of availability). */
  get(id: LlmProviderId): LlmProvider | undefined {
    return this.providers.get(id);
  }

  /** The server's configured default provider id (regardless of availability). */
  currentProvider(): LlmProviderId {
    return this.currentId;
  }

  // ---- Backwards-compatible aliases (older call sites/tests) -----------------
  active(): LlmProvider | null {
    return this.resolve();
  }

  isConfigured(): boolean {
    return this.hasAvailableProvider();
  }
}
