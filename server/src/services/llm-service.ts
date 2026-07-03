import type { LlmProvider, LlmProviderId } from '../ports/llm-provider';
import type { Logger } from '../ports/logger';

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
      current: this.currentId,
      providers: [...this.providers.values()].map((p) => ({
        id: p.id,
        label: p.label,
        available: p.available,
      })),
    };
  }

  /** The default provider, or null when it has no server credentials configured. */
  active(): LlmProvider | null {
    const provider = this.providers.get(this.currentId);
    return provider && provider.available ? provider : null;
  }

  /** The configured default provider id (regardless of availability). */
  currentProvider(): LlmProviderId {
    return this.currentId;
  }

  /** A provider by id regardless of availability — for callers supplying their own key. */
  get(id: LlmProviderId): LlmProvider | undefined {
    return this.providers.get(id);
  }
}
