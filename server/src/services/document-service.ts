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
import type { AttachmentStore } from '../ports/attachment-store';
import type { PdfRenderer } from '../ports/pdf-renderer';
import type { PdfMerger } from '../ports/pdf-merger';
import type { Clock } from '../ports/clock';

export interface DocumentServiceDeps {
  documentRepository: DocumentRepository;
  talentRepository: TalentRepository;
  attachmentStore: AttachmentStore;
  pdfRenderer: PdfRenderer;
  pdfMerger: PdfMerger;
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
  private readonly attachments: AttachmentStore;
  private readonly pdf: PdfRenderer;
  private readonly merger: PdfMerger;
  private readonly clock: Clock;

  constructor(deps: DocumentServiceDeps) {
    this.docs = deps.documentRepository;
    this.talents = deps.talentRepository;
    this.attachments = deps.attachmentStore;
    this.pdf = deps.pdfRenderer;
    this.merger = deps.pdfMerger;
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

  /**
   * Assemble a Bewerbungsmappe (dossier): the saved documents rendered as one
   * PDF, with the cover letter addressed to a concrete recipient (the mandate /
   * company chosen in the editor). Empty recipient fields keep the saved value.
   */
  async renderDossierPdf(
    ownerId: string,
    talentId: string,
    recipient: DossierRecipient,
    attachmentIds: string[] = [],
  ): Promise<Buffer> {
    const documents = await this.get(ownerId, talentId);
    const merged: TalentDocuments = {
      ...documents,
      letter: {
        ...documents.letter,
        firma: recipient.company || documents.letter.firma,
        ansprechpartner: recipient.contactName || documents.letter.ansprechpartner,
        strasse: recipient.street || documents.letter.strasse,
        plzOrt: recipient.postalCodeCity || documents.letter.plzOrt,
        betreff: recipient.subject || documents.letter.betreff,
      },
    };
    const mainPdf = await this.pdf.renderHtml(documentsToHtml(merged));
    if (!attachmentIds.length) return mainPdf;

    // Append the selected PDF attachments after the resume + cover letter.
    const parts = [mainPdf];
    for (const id of attachmentIds) {
      const blob = await this.attachments.get(ownerId, id);
      if (blob && blob.attachment.contentType === 'application/pdf') parts.push(blob.bytes);
    }
    return parts.length > 1 ? this.merger.merge(parts, { title: 'Bewerbungsmappe' }) : mainPdf;
  }
}

/** The recipient a dossier's cover letter is addressed to. */
export interface DossierRecipient {
  company?: string;
  contactName?: string;
  street?: string;
  postalCodeCity?: string;
  subject?: string;
}
