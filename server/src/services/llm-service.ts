import { ValidationError } from '../domain/errors';
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
 * Runtime-switchable LLM provider registry. Holds every wired provider plus the
 * currently selected one, which the settings endpoint flips at runtime. The
 * selection is in-memory by design — it is an operator preference, not user
 * data, and resets to the configured default on restart.
 */
export class LlmService {
  private readonly providers: Map<LlmProviderId, LlmProvider>;
  private readonly logger: Logger;
  private currentId: LlmProviderId;

  constructor(deps: LlmServiceDeps) {
    this.providers = new Map(deps.providers.map((p) => [p.id, p]));
    this.logger = deps.logger;
    this.currentId = this.providers.has(deps.defaultProvider)
      ? deps.defaultProvider
      : (deps.providers[0]?.id ?? 'claude');
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

  /** Switch the active provider. Rejects unknown ids with a 400. */
  setProvider(id: string): LlmSettings {
    if (!this.providers.has(id as LlmProviderId)) {
      throw new ValidationError(`Unknown LLM provider: ${id}`, {
        allowed: [...this.providers.keys()],
      });
    }
    this.currentId = id as LlmProviderId;
    this.logger.info({ provider: this.currentId }, 'llm provider switched');
    return this.settings();
  }

  /** The active provider, or null when it has no credentials configured. */
  active(): LlmProvider | null {
    const provider = this.providers.get(this.currentId);
    return provider && provider.available ? provider : null;
  }

  /** The currently selected provider id (regardless of availability). */
  currentProvider(): LlmProviderId {
    return this.currentId;
  }

  /** A provider by id regardless of availability — for callers supplying their own key. */
  get(id: LlmProviderId): LlmProvider | undefined {
    return this.providers.get(id);
  }
}
