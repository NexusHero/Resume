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
  type AtsScore,
  atsPrompt,
  atsResultSchema,
  fallbackAts,
  normalizeAts,
} from '../domain/ats-ai';
import {
  type CandidatePitch,
  pitchPrompt,
  pitchResultSchema,
  fallbackPitch,
  normalizePitch,
} from '../domain/candidate-pitch';
import {
  type DocumentContact,
  type ResumeContent,
  saveDocumentsSchema,
} from '../domain/talent-documents';
import type { LlmProvider, LlmProviderId } from '../ports/llm-provider';
import type { ApiKeyStore } from '../ports/api-key-store';
import type { PdfTextExtractor } from '../ports/pdf-text-extractor';
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

/** A CV parsed from an uploaded PDF; `extractedChars` is 0 for a scanned PDF. */
export interface ParsedPdfDocument extends ParsedDocument {
  extractedChars: number;
}

export interface DocumentAiServiceDeps {
  documentService: DocumentService;
  llmService: LlmService;
  apiKeyStore: ApiKeyStore;
  pdfTextExtractor: PdfTextExtractor;
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
  private readonly pdfText: PdfTextExtractor;
  private readonly logger: Logger;

  constructor(deps: DocumentAiServiceDeps) {
    this.documents = deps.documentService;
    this.llm = deps.llmService;
    this.keys = deps.apiKeyStore;
    this.pdfText = deps.pdfTextExtractor;
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

  /**
   * Parse a CV uploaded as a PDF: extract its text layer, then run the same
   * text-parsing path. A scanned/image-only PDF has no text (`extractedChars`
   * 0) — we return an empty structured set rather than call the LLM on nothing,
   * so the UI can prompt the user to paste the text instead.
   */
  async parsePdf(ownerId: string, talentId: string, pdf: Buffer): Promise<ParsedPdfDocument> {
    await this.documents.get(ownerId, talentId); // 404s on unknown talent

    let text = '';
    try {
      text = await this.pdfText.extract(pdf);
    } catch (err) {
      this.logger.warn(
        { err: err instanceof Error ? err.message : String(err) },
        'PDF text extraction failed',
      );
    }

    if (!text.trim()) {
      const empty = saveDocumentsSchema.parse({});
      return {
        contact: empty.contact,
        resume: empty.resume,
        provider: 'template',
        extractedChars: 0,
      };
    }

    const parsed = await this.parse(ownerId, talentId, text.slice(0, 50_000));
    return { ...parsed, extractedChars: text.length };
  }

  /**
   * Score the talent's résumé against a pasted job ad. The LLM returns a match
   * rate plus matched/missing keywords and concrete fixes; without a provider,
   * a deterministic keyword-overlap fallback keeps it usable.
   */
  async scoreAgainstJob(
    ownerId: string,
    talentId: string,
    jobText: string,
  ): Promise<AtsScore & { provider: LlmProviderId | 'template' }> {
    const documents = await this.documents.get(ownerId, talentId); // 404s on unknown talent
    const resolved = await this.resolveProvider(ownerId);

    if (resolved) {
      try {
        const built = atsPrompt(documents, jobText);
        const reply = await resolved.provider.generate({
          system: built.system,
          prompt: built.prompt,
          maxTokens: 900,
          ...(resolved.apiKey ? { apiKey: resolved.apiKey } : {}),
        });
        const json = extractJson(reply);
        const parsed = atsResultSchema.safeParse(json);
        if (parsed.success) return { ...normalizeAts(parsed.data), provider: resolved.provider.id };
      } catch (err) {
        this.logger.warn(
          { err: err instanceof Error ? err.message : String(err) },
          'ATS scoring failed, falling back',
        );
      }
    }

    return { ...fallbackAts(documents, jobText), provider: 'template' };
  }

  /**
   * Draft a "why this candidate" short profile a recruiter presents to the
   * client, optionally tailored to a mandate/job context. The LLM returns a
   * headline, a few paragraphs and highlight bullets; without a provider, a
   * deterministic fallback assembles an honest profile from the talent's facts.
   */
  async pitchForMandate(
    ownerId: string,
    talentId: string,
    mandateContext: string,
  ): Promise<CandidatePitch & { provider: LlmProviderId | 'template' }> {
    const documents = await this.documents.get(ownerId, talentId); // 404s on unknown talent
    const resolved = await this.resolveProvider(ownerId);

    if (resolved) {
      try {
        const built = pitchPrompt(documents, mandateContext);
        const reply = await resolved.provider.generate({
          system: built.system,
          prompt: built.prompt,
          maxTokens: 700,
          ...(resolved.apiKey ? { apiKey: resolved.apiKey } : {}),
        });
        const json = extractJson(reply);
        const parsed = pitchResultSchema.safeParse(json);
        if (parsed.success) {
          const pitch = normalizePitch(parsed.data);
          if (pitch.headline || pitch.paragraphs.length) {
            return { ...pitch, provider: resolved.provider.id };
          }
        }
      } catch (err) {
        this.logger.warn(
          { err: err instanceof Error ? err.message : String(err) },
          'candidate pitch failed, falling back',
        );
      }
    }

    return { ...fallbackPitch(documents, mandateContext), provider: 'template' };
  }
}
