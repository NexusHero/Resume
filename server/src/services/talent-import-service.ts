import { createTalentSchema } from '../domain/talent.js';
import {
  type ImportPdfsInput,
  type ImportResult,
  importPdfsSchema,
  importedName,
  importedSkills,
  DEFAULT_IMPORT_NAME,
  nameFromFilename,
  safeFilename,
} from '../domain/talent-import.js';
import { NoTextLayerError } from '../domain/errors.js';
import { ORIGINAL_CV_ATTACHMENT_NAME, saveDocumentsSchema } from '../domain/talent-documents.js';
import type { Logger } from '../ports/logger.js';
import type { TalentService } from './talent-service.js';
import type { DocumentService } from './document-service.js';
import type { DocumentAiService } from './document-ai-service.js';
import type { ParsedPdfDocument } from './cv-parse-service.js';
import type { AttachmentService } from './attachment-service.js';

export interface TalentImportServiceDeps {
  talentService: TalentService;
  documentService: DocumentService;
  documentAiService: DocumentAiService;
  attachmentService: AttachmentService;
  logger: Logger;
}

/**
 * Bulk CV import: turn a batch of uploaded PDF CVs into talents. Each CV is
 * handled independently — a failure on one is reported and the batch continues.
 * Without a server AI key the import runs the named text-only mode: the full CV
 * text is stored in `resume.rawText`, the PDF is kept as an attachment (there is
 * no "discard" in a bulk import) and no structure is invented. A talent that
 * fails after creation is rolled back so the pool gets no empty shells.
 */
export class TalentImportService {
  private readonly talents: TalentService;
  private readonly documents: DocumentService;
  private readonly ai: DocumentAiService;
  private readonly attachments: AttachmentService;
  private readonly logger: Logger;

  constructor(deps: TalentImportServiceDeps) {
    this.talents = deps.talentService;
    this.documents = deps.documentService;
    this.ai = deps.documentAiService;
    this.attachments = deps.attachmentService;
    this.logger = deps.logger;
  }

  async importPdfs(
    scope: string,
    userId: string,
    input: ImportPdfsInput,
  ): Promise<{ results: ImportResult[] }> {
    const { items } = importPdfsSchema.parse(input);
    const results: ImportResult[] = [];
    for (const item of items) {
      results.push(await this.importOne(scope, userId, item.dataBase64, item.filename));
    }
    return { results };
  }

  private async importOne(
    scope: string,
    userId: string,
    dataBase64: string,
    rawFilename: string,
  ): Promise<ImportResult> {
    const filename = safeFilename(rawFilename);
    const talent = await this.talents.create(
      scope,
      createTalentSchema.parse({ name: DEFAULT_IMPORT_NAME }),
    );
    try {
      const pdf = Buffer.from(dataBase64, 'base64');
      const parsed = await this.ai.parsePdf(scope, userId, talent.id, pdf);

      if (parsed.mode === 'text') {
        return await this.importText(scope, talent.id, filename, pdf, parsed);
      }

      const name = importedName(parsed.contact);
      const skills = importedSkills(parsed.resume);
      await this.talents.update(scope, talent.id, {
        name,
        role: parsed.contact.role,
        email: parsed.contact.email,
        phone: parsed.contact.phone,
        location: parsed.contact.location,
        skills,
      });
      await this.documents.save(
        scope,
        talent.id,
        saveDocumentsSchema.parse({ contact: parsed.contact, resume: parsed.resume }),
      );
      return {
        ok: true,
        talentId: talent.id,
        name,
        skillCount: skills.length,
        mode: 'ai',
        provider: parsed.provider,
        usage: parsed.usage,
        extractedChars: parsed.extractedChars,
      };
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      this.logger.warn({ talentId: talent.id, error }, 'bulk CV import failed for one file');
      // Undo the placeholder so a failed import leaves nothing behind.
      await this.talents.remove(scope, talent.id).catch(() => undefined);
      return {
        ok: false,
        filename,
        error: err instanceof NoTextLayerError ? 'no-text-layer' : error,
      };
    }
  }

  /** Text mode: keep the full text, name from the filename, PDF as attachment. */
  private async importText(
    scope: string,
    talentId: string,
    filename: string,
    pdf: Buffer,
    parsed: ParsedPdfDocument,
  ): Promise<ImportResult> {
    const name = nameFromFilename(filename);
    await this.talents.update(scope, talentId, { name });
    await this.documents.save(
      scope,
      talentId,
      saveDocumentsSchema.parse({ contact: parsed.contact, resume: parsed.resume }),
    );
    const attachmentId = await this.attachPdf(scope, talentId, pdf);
    return {
      ok: true,
      talentId,
      name,
      skillCount: 0,
      mode: 'text',
      attachmentId,
      ...(parsed.truncated ? { truncated: true } : {}),
      extractedChars: parsed.extractedChars,
    };
  }

  /**
   * Store the original CV under the fixed reference name. Upload first, then
   * remove older originals (a failed upload must not leave the candidate with
   * no CV attachment). The PDF stays a reference: it is never preselected for an
   * application and never attached automatically (ADR-0057).
   */
  private async attachPdf(
    scope: string,
    talentId: string,
    pdf: Buffer,
  ): Promise<string | undefined> {
    try {
      const created = await this.attachments.upload(scope, talentId, {
        name: ORIGINAL_CV_ATTACHMENT_NAME,
        contentType: 'application/pdf',
        dataBase64: pdf.toString('base64'),
      });
      const existing = await this.attachments.list(scope, talentId);
      for (const att of existing) {
        if (att.id !== created.id && att.name === ORIGINAL_CV_ATTACHMENT_NAME) {
          await this.attachments.remove(scope, att.id).catch(() => undefined);
        }
      }
      return created.id;
    } catch (err) {
      // The import itself succeeded; a failed attachment must not lose the CV
      // text. Log it and leave `attachmentId` out.
      this.logger.warn(
        { talentId, err: err instanceof Error ? err.message : String(err) },
        'CV attachment could not be stored',
      );
      return undefined;
    }
  }
}
