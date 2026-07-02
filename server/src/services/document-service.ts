import {
  type TalentDocuments,
  type DocumentTranslation,
  type SaveDocumentsInput,
  defaultStyle,
  emptyResume,
  emptyLetter,
} from '../domain/talent-documents';
import type { OutputLang } from '../domain/language';
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
 * The resume + cover-letter document set for a talent. Team-scoped: the
 * `ownerId` parameter carries the caller's scope (`currentScope(req)` — the
 * shared team), and every operation first verifies the talent exists in that
 * scope. When no set has been saved yet, `get` seeds the contact block from
 * the talent so the editor always opens on a usable document.
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

    // Preserve any stored language variants — the editor save only carries the
    // primary set, so translations must not be dropped on a normal save.
    const existing = await this.docs.get(ownerId, talentId);
    const documents: TalentDocuments = {
      ownerId,
      talentId,
      contact: input.contact,
      resume: input.resume,
      letter: input.letter,
      style: input.style,
      ...(existing?.translations ? { translations: existing.translations } : {}),
      updatedAt: this.clock.isoNow(),
    };
    await this.docs.save(documents);
    return documents;
  }

  /** Store a translated language variant alongside the primary document set. */
  async saveTranslation(
    ownerId: string,
    talentId: string,
    lang: OutputLang,
    translation: DocumentTranslation,
  ): Promise<TalentDocuments> {
    const documents = await this.get(ownerId, talentId); // 404s on unknown talent
    const updated: TalentDocuments = {
      ...documents,
      translations: { ...(documents.translations ?? {}), [lang]: translation },
      updatedAt: this.clock.isoNow(),
    };
    await this.docs.save(updated);
    return updated;
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
