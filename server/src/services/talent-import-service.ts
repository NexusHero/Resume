import { createTalentSchema } from '../domain/talent';
import {
  type ImportPdfsInput,
  type ImportResult,
  importPdfsSchema,
  importedName,
  importedSkills,
  DEFAULT_IMPORT_NAME,
} from '../domain/talent-import';
import { saveDocumentsSchema } from '../domain/talent-documents';
import type { Logger } from '../ports/logger';
import type { TalentService } from './talent-service';
import type { DocumentService } from './document-service';
import type { DocumentAiService } from './document-ai-service';

export interface TalentImportServiceDeps {
  talentService: TalentService;
  documentService: DocumentService;
  documentAiService: DocumentAiService;
  logger: Logger;
}

/**
 * Bulk CV import: turn a batch of uploaded PDF CVs into talents. Each CV is
 * handled independently — a failure on one is reported and the batch continues —
 * by reusing the existing single-CV path: create a talent, parse its PDF into
 * structured contact + resume, then persist name/skills and the document set.
 * A talent that fails after creation is rolled back so the pool gets no empty
 * shells.
 */
export class TalentImportService {
  private readonly talents: TalentService;
  private readonly documents: DocumentService;
  private readonly ai: DocumentAiService;
  private readonly logger: Logger;

  constructor(deps: TalentImportServiceDeps) {
    this.talents = deps.talentService;
    this.documents = deps.documentService;
    this.ai = deps.documentAiService;
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
    filename: string,
  ): Promise<ImportResult> {
    // Create first (parse needs an existing talent to attach to), then roll the
    // talent back if anything downstream throws.
    const talent = await this.talents.create(
      scope,
      createTalentSchema.parse({ name: DEFAULT_IMPORT_NAME }),
    );
    try {
      const parsed = await this.ai.parsePdf(
        scope,
        userId,
        talent.id,
        Buffer.from(dataBase64, 'base64'),
      );
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
        provider: parsed.provider,
        extractedChars: parsed.extractedChars,
      };
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      this.logger.warn({ talentId: talent.id, error }, 'bulk CV import failed for one file');
      // Undo the placeholder so a failed import leaves nothing behind.
      await this.talents.remove(scope, talent.id).catch(() => undefined);
      return { ok: false, filename, error };
    }
  }
}
