import type { LlmProvider, LlmProviderId } from '../ports/llm-provider.js';
import type { Logger } from '../ports/logger.js';

export interface LlmProviderInfo {
  id: LlmProviderId;
  label: string;
  available: boolean;
}

export interface LlmSettings {
  current: LlmProviderId;
  providers: LlmProviderInfo[];
}

export interface LlmServiceDeps {
  providers: LlmProvider[];
  /** Provider selected at startup (from config / env). */
  defaultProvider: LlmProviderId;
  logger: Logger;
}

/**
 * The LLM provider registry: every wired provider plus the server's configured
 * default. The provider *selection* is per user and persisted on the user
 * record (Settings → AI models), so it survives restarts and is never shared
 * across the team — this service only answers "which providers exist, which
 * have server credentials, and what is the default".
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

  settings(): LlmSettings {
    return {
      // The effective provider (the one generation would use), so the settings
      // surface and the server agree when only the optional key is set.
      current: this.active()?.id ?? this.currentId,
      providers: [...this.providers.values()].map((p) => ({
        id: p.id,
        label: p.label,
        available: p.available,
      })),
    };
  }

  /**
   * The provider generation will use: the configured default when it has server
   * credentials, otherwise any other available provider. The product contract is
   * "ANTHROPIC is the standard, GEMINI the optional fallback" (ADR-0057), so a
   * server with only `GEMINI_API_KEY` must still be configured — not report 503
   * while the UI says "KI eingerichtet".
   */
  active(): LlmProvider | null {
    const preferred = this.providers.get(this.currentId);
    if (preferred && preferred.available) return preferred;
    for (const provider of this.providers.values()) {
      if (provider.available) return provider;
    }
    return null;
  }

  /** The configured default provider id (regardless of availability). */
  currentProvider(): LlmProviderId {
    return this.currentId;
  }

  /** True when the server has a usable central key (ADR-0057). */
  isConfigured(): boolean {
    return this.active() !== null;
  }

  /** A provider by id regardless of availability — for callers supplying their own key. */
  get(id: LlmProviderId): LlmProvider | undefined {
    return this.providers.get(id);
  }
}
