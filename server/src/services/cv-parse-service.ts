import {
  type ImportMode,
  MAX_IMPORT_TEXT,
  parsePrompt,
  extractJson,
  takeText,
} from '../domain/document-parse.js';
import {
  type DocumentContact,
  type ResumeContent,
  saveDocumentsSchema,
} from '../domain/talent-documents.js';
import { InternalError, NoTextLayerError, UpstreamProviderError } from '../domain/errors.js';
import type { LlmProviderId } from '../ports/llm-provider.js';
import type { PdfTextExtractor } from '../ports/pdf-text-extractor.js';
import type { Logger } from '../ports/logger.js';
import { type CallUsage } from '../domain/usage.js';
import { MAX_TOKENS, errMessage, type LlmFeatureRunner } from './llm-feature-runner.js';
import type { LlmService } from './llm-service.js';
import type { DocumentService } from './document-service.js';

/** Minimum non-whitespace characters for a PDF to count as having a text layer. */
export const MIN_TEXT_LAYER_CHARS = 20;

/** A CV parsed (or taken as text) from pasted text or an uploaded PDF. */
export interface ParsedDocument {
  contact: DocumentContact;
  resume: ResumeContent;
  /** `ai` when the model structured it, `text` for the named text-only mode. */
  mode: ImportMode;
  /** Present only in `ai` mode. */
  provider?: LlmProviderId;
  usage?: CallUsage;
  /** Text mode only: the raw text exceeded the import limit and was cut. */
  truncated?: boolean;
}

/** A CV parsed from an uploaded PDF; `extractedChars` is 0 for an empty text layer. */
export interface ParsedPdfDocument extends ParsedDocument {
  extractedChars: number;
}

export interface CvParseServiceDeps {
  llmFeatureRunner: LlmFeatureRunner;
  llmService: LlmService;
  documentService: DocumentService;
  pdfTextExtractor: PdfTextExtractor;
  logger: Logger;
}

/** Parse a CV (pasted text or an uploaded PDF) into the structured document model. */
export class CvParseService {
  private readonly runner: LlmFeatureRunner;
  private readonly llm: LlmService;
  private readonly documents: DocumentService;
  private readonly pdfText: PdfTextExtractor;
  private readonly logger: Logger;

  constructor(deps: CvParseServiceDeps) {
    this.runner = deps.llmFeatureRunner;
    this.llm = deps.llmService;
    this.documents = deps.documentService;
    this.pdfText = deps.pdfTextExtractor;
    this.logger = deps.logger;
  }

  /**
   * Import a pasted CV. The mode is chosen up front (owner decision Q2): with a
   * server key the model structures it (`ai`), without one the full text is kept
   * for manual take-over (`text`). There is never a fallback after a failure.
   */
  async parse(
    scope: string,
    userId: string,
    talentId: string,
    text: string,
  ): Promise<ParsedDocument> {
    await this.documents.get(scope, talentId); // 404s on unknown talent

    if (!this.llm.hasAvailableProvider()) {
      const taken = takeText(text);
      const validated = saveDocumentsSchema.parse({ resume: taken.resume });
      return {
        contact: validated.contact,
        resume: validated.resume,
        mode: 'text',
        ...(taken.truncated ? { truncated: true } : {}),
      };
    }

    const res = await this.runner.run(
      userId,
      'parse',
      MAX_TOKENS.parse,
      parsePrompt(text.slice(0, MAX_IMPORT_TEXT)),
    );
    const raw: unknown = extractJson(res.reply);
    if (!raw || typeof raw !== 'object') {
      throw new UpstreamProviderError();
    }
    const source = raw as { contact?: unknown; resume?: unknown };
    const validated = saveDocumentsSchema.parse({ contact: source.contact, resume: source.resume });
    return {
      contact: validated.contact,
      resume: validated.resume,
      mode: 'ai',
      provider: res.provider,
      usage: res.usage,
    };
  }

  /**
   * Import a CV uploaded as a PDF: extract its text layer, then run the same
   * path as pasted text. A PDF without a usable text layer (scanned/protected)
   * is a 422 `no-text-layer` in both modes; the import does not silently return
   * an empty document.
   */
  async parsePdf(
    scope: string,
    userId: string,
    talentId: string,
    pdf: Buffer,
  ): Promise<ParsedPdfDocument> {
    await this.documents.get(scope, talentId); // 404s on unknown talent

    let text: string;
    try {
      text = await this.pdfText.extract(pdf);
    } catch (err) {
      // A crashing extractor is a server fault, not a scanned PDF: log it and
      // answer 500 (InternalError), never the 422 "no text layer" path (Q1).
      this.logger.error({ err: errMessage(err) }, 'PDF text extraction failed');
      throw new InternalError('PDF text extraction failed');
    }

    const readable = text.replace(/\s/g, '');
    if (readable.length < MIN_TEXT_LAYER_CHARS) throw new NoTextLayerError();

    const parsed = await this.parse(scope, userId, talentId, text);
    return { ...parsed, extractedChars: text.length };
  }
}
