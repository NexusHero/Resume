import { parsePrompt, extractJson, fallbackParsed } from '../domain/document-parse.js';
import {
  type DocumentContact,
  type ResumeContent,
  saveDocumentsSchema,
} from '../domain/talent-documents.js';
import type { LlmProviderId } from '../ports/llm-provider.js';
import type { PdfTextExtractor } from '../ports/pdf-text-extractor.js';
import type { Logger } from '../ports/logger.js';
import { type CallUsage } from '../domain/usage.js';
import { MAX_TOKENS, errMessage, type LlmFeatureRunner } from './llm-feature-runner.js';
import type { DocumentService } from './document-service.js';

export interface ParsedDocument {
  contact: DocumentContact;
  resume: ResumeContent;
  provider: LlmProviderId | 'template';
  usage?: CallUsage;
}

/** A CV parsed from an uploaded PDF; `extractedChars` is 0 for a scanned PDF. */
export interface ParsedPdfDocument extends ParsedDocument {
  extractedChars: number;
}

export interface CvParseServiceDeps {
  llmFeatureRunner: LlmFeatureRunner;
  documentService: DocumentService;
  pdfTextExtractor: PdfTextExtractor;
  logger: Logger;
}

/** Parse a CV (pasted text or an uploaded PDF) into the structured document model. */
export class CvParseService {
  private readonly runner: LlmFeatureRunner;
  private readonly documents: DocumentService;
  private readonly pdfText: PdfTextExtractor;
  private readonly logger: Logger;

  constructor(deps: CvParseServiceDeps) {
    this.runner = deps.llmFeatureRunner;
    this.documents = deps.documentService;
    this.pdfText = deps.pdfTextExtractor;
    this.logger = deps.logger;
  }

  /**
   * Parse a pasted CV (plain text) into our structured contact + resume model.
   * Uses the LLM to extract JSON, validated against the documents schema; if no
   * provider is available or the reply is unusable, the raw text is kept as the
   * summary so nothing is lost.
   */
  async parse(
    scope: string,
    userId: string,
    talentId: string,
    text: string,
  ): Promise<ParsedDocument> {
    await this.documents.get(scope, talentId); // 404s on unknown talent

    const res = await this.runner.run(userId, 'parse', MAX_TOKENS.parse, parsePrompt(text));
    const raw: unknown = res ? extractJson(res.reply) : null;
    const provider: LlmProviderId | 'template' = res && raw ? res.provider : 'template';
    const usage = res && raw ? res.usage : undefined;

    // Validate whatever we have (LLM JSON or fallback) through the save schema,
    // which fills defaults for any missing/invalid field.
    const source = (raw && typeof raw === 'object' ? raw : fallbackParsed(text)) as {
      contact?: unknown;
      resume?: unknown;
    };
    const validated = saveDocumentsSchema.parse({ contact: source.contact, resume: source.resume });
    return { contact: validated.contact, resume: validated.resume, provider, usage };
  }

  /**
   * Parse a CV uploaded as a PDF: extract its text layer, then run the same
   * text-parsing path. A scanned/image-only PDF has no text (`extractedChars`
   * 0) — we return an empty structured set rather than call the LLM on nothing,
   * so the UI can prompt the user to paste the text instead.
   */
  async parsePdf(
    scope: string,
    userId: string,
    talentId: string,
    pdf: Buffer,
  ): Promise<ParsedPdfDocument> {
    await this.documents.get(scope, talentId); // 404s on unknown talent

    let text = '';
    try {
      text = await this.pdfText.extract(pdf);
    } catch (err) {
      this.logger.warn({ err: errMessage(err) }, 'PDF text extraction failed');
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

    const parsed = await this.parse(scope, userId, talentId, text.slice(0, 50_000));
    return { ...parsed, extractedChars: text.length };
  }
}
