import {
  type DocumentAiAction,
  type DocumentAiTarget,
  summaryPrompt,
  letterPrompt,
  toParagraphs,
  fallbackSummary,
  fallbackLetter,
} from '../domain/document-ai';
import type { LlmProvider, LlmProviderId } from '../ports/llm-provider';
import type { ApiKeyStore } from '../ports/api-key-store';
import type { Logger } from '../ports/logger';
import type { DocumentService } from './document-service';
import type { LlmService } from './llm-service';

export interface DocumentAiSuggestion {
  action: DocumentAiAction;
  /** Present for a summary suggestion. */
  text?: string;
  /** Present for a cover-letter suggestion. */
  paragraphs?: string[];
  /** Which backend produced it — 'template' when the deterministic fallback ran. */
  provider: LlmProviderId | 'template';
}

export interface DocumentAiServiceDeps {
  documentService: DocumentService;
  llmService: LlmService;
  apiKeyStore: ApiKeyStore;
  logger: Logger;
}

/**
 * AI assistance for the document editor: rewrite the resume summary or draft
 * cover-letter paragraphs from the talent's own facts, using the caller's
 * stored key for the current provider (falling back to the server credential,
 * then to a deterministic template — so it always returns usable text).
 */
export class DocumentAiService {
  private readonly documents: DocumentService;
  private readonly llm: LlmService;
  private readonly keys: ApiKeyStore;
  private readonly logger: Logger;

  constructor(deps: DocumentAiServiceDeps) {
    this.documents = deps.documentService;
    this.llm = deps.llmService;
    this.keys = deps.apiKeyStore;
    this.logger = deps.logger;
  }

  private async resolveProvider(
    ownerId: string,
  ): Promise<{ provider: LlmProvider; apiKey?: string } | null> {
    const currentId = this.llm.currentProvider();
    const current = this.llm.get(currentId);
    const apiKey = await this.keys.get(ownerId, currentId);
    if (current && apiKey) return { provider: current, apiKey };
    const active = this.llm.active(); // a provider with server credentials
    return active ? { provider: active } : null;
  }

  async suggest(
    ownerId: string,
    talentId: string,
    action: DocumentAiAction,
    target: DocumentAiTarget = {},
  ): Promise<DocumentAiSuggestion> {
    const documents = await this.documents.get(ownerId, talentId); // 404s on unknown talent
    const resolved = await this.resolveProvider(ownerId);

    if (resolved) {
      try {
        const { provider, apiKey } = resolved;
        const built =
          action === 'summary' ? summaryPrompt(documents) : letterPrompt(documents, target);
        const text = await provider.generate({
          system: built.system,
          prompt: built.prompt,
          maxTokens: action === 'summary' ? 300 : 700,
          ...(apiKey ? { apiKey } : {}),
        });
        return action === 'summary'
          ? { action, text: text.trim(), provider: provider.id }
          : { action, paragraphs: toParagraphs(text), provider: provider.id };
      } catch (err) {
        this.logger.warn(
          { action, err: err instanceof Error ? err.message : String(err) },
          'AI document suggestion failed, falling back to template',
        );
      }
    }

    return action === 'summary'
      ? { action, text: fallbackSummary(documents), provider: 'template' }
      : { action, paragraphs: fallbackLetter(documents, target), provider: 'template' };
  }
}
