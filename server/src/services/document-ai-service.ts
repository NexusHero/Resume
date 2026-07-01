import {
  type DocumentAiAction,
  type DocumentAiTarget,
  summaryPrompt,
  letterPrompt,
  toParagraphs,
  fallbackSummary,
  fallbackLetter,
} from '../domain/document-ai';
import { parsePrompt, extractJson, fallbackParsed } from '../domain/document-parse';
import {
  type DocumentContact,
  type ResumeContent,
  saveDocumentsSchema,
} from '../domain/talent-documents';
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

export interface ParsedDocument {
  contact: DocumentContact;
  resume: ResumeContent;
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

  /**
   * Parse a pasted CV (plain text) into our structured contact + resume model.
   * Uses the LLM to extract JSON, validated against the documents schema; if no
   * provider is available or the reply is unusable, the raw text is kept as the
   * summary so nothing is lost.
   */
  async parse(ownerId: string, talentId: string, text: string): Promise<ParsedDocument> {
    await this.documents.get(ownerId, talentId); // 404s on unknown talent
    const resolved = await this.resolveProvider(ownerId);

    let raw: unknown = null;
    let provider: LlmProviderId | 'template' = 'template';
    if (resolved) {
      try {
        const built = parsePrompt(text);
        const reply = await resolved.provider.generate({
          system: built.system,
          prompt: built.prompt,
          maxTokens: 1500,
          ...(resolved.apiKey ? { apiKey: resolved.apiKey } : {}),
        });
        raw = extractJson(reply);
        if (raw) provider = resolved.provider.id;
      } catch (err) {
        this.logger.warn(
          { err: err instanceof Error ? err.message : String(err) },
          'CV parsing failed, falling back',
        );
      }
    }

    // Validate whatever we have (LLM JSON or fallback) through the save schema,
    // which fills defaults for any missing/invalid field.
    const source = (raw && typeof raw === 'object' ? raw : fallbackParsed(text)) as {
      contact?: unknown;
      resume?: unknown;
    };
    const validated = saveDocumentsSchema.parse({ contact: source.contact, resume: source.resume });
    return { contact: validated.contact, resume: validated.resume, provider };
  }
}
