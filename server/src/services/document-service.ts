import {
  type TalentDocuments,
  type SaveDocumentsInput,
  defaultStyle,
  emptyResume,
  emptyLetter,
} from '../domain/talent-documents';
import { documentsToHtml } from '../domain/documents-html';
import { NotFoundError } from '../domain/errors';
import type { DocumentRepository } from '../ports/document-repository';
import type { TalentRepository } from '../ports/talent-repository';
import type { PdfRenderer } from '../ports/pdf-renderer';
import type { Clock } from '../ports/clock';

export interface DocumentServiceDeps {
  documentRepository: DocumentRepository;
  talentRepository: TalentRepository;
  pdfRenderer: PdfRenderer;
  clock: Clock;
}

/**
 * The resume + cover-letter document set for a talent. Owner-scoped: every
 * operation first verifies the talent belongs to the caller. When no set has
 * been saved yet, `get` seeds the contact block from the talent so the editor
 * always opens on a usable document.
 */
export class DocumentService {
  private readonly docs: DocumentRepository;
  private readonly talents: TalentRepository;
  private readonly pdf: PdfRenderer;
  private readonly clock: Clock;

  constructor(deps: DocumentServiceDeps) {
    this.docs = deps.documentRepository;
    this.talents = deps.talentRepository;
    this.pdf = deps.pdfRenderer;
    this.clock = deps.clock;
  }

  async get(ownerId: string, talentId: string): Promise<TalentDocuments> {
    const talent = await this.talents.findById(ownerId, talentId);
    if (!talent) throw new NotFoundError(`Talent ${talentId} not found`);

    const existing = await this.docs.get(ownerId, talentId);
    if (existing) return existing;

    // No set saved yet — seed the contact from the talent, blank the rest.
    return {
      ownerId,
      talentId,
      contact: {
        name: talent.name,
        role: talent.role,
        email: talent.email,
        phone: talent.phone,
        location: talent.location,
        linkedin: '',
      },
      resume: { ...emptyResume },
      letter: { ...emptyLetter },
      style: { ...defaultStyle },
      updatedAt: talent.updatedAt,
    };
  }

  async save(
    ownerId: string,
    talentId: string,
    input: SaveDocumentsInput,
  ): Promise<TalentDocuments> {
    const talent = await this.talents.findById(ownerId, talentId);
    if (!talent) throw new NotFoundError(`Talent ${talentId} not found`);

    const documents: TalentDocuments = {
      ownerId,
      talentId,
      contact: input.contact,
      resume: input.resume,
      letter: input.letter,
      style: input.style,
      updatedAt: this.clock.isoNow(),
    };
    await this.docs.save(documents);
    return documents;
  }

  /** Render the talent's saved documents (resume + cover letter) to a PDF. */
  async renderPdf(ownerId: string, talentId: string): Promise<Buffer> {
    const documents = await this.get(ownerId, talentId);
    return this.pdf.renderHtml(documentsToHtml(documents));
  }
}
