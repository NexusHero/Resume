import {
  type TalentDocuments,
  type DocumentTranslation,
  type SaveDocumentsInput,
  defaultStyle,
  emptyResume,
  emptyLetter,
} from '../domain/talent-documents.js';
import { detectLanguage } from '../domain/language.js';
import type { OutputLang } from '../domain/language.js';
import { documentsToHtml } from '../domain/documents-html.js';
import { NotFoundError } from '../domain/errors.js';
import type { DocumentRepository } from '../ports/document-repository.js';
import type { TalentRepository } from '../ports/talent-repository.js';
import type { UserRepository } from '../ports/user-repository.js';
import type { AttachmentStore } from '../ports/attachment-store.js';
import type { PdfRenderer } from '../ports/pdf-renderer.js';
import type { PdfMerger } from '../ports/pdf-merger.js';
import type { Clock } from '../ports/clock.js';

export interface DocumentServiceDeps {
  documentRepository: DocumentRepository;
  talentRepository: TalentRepository;
  userRepository: UserRepository;
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
  private readonly users: UserRepository;
  private readonly attachments: AttachmentStore;
  private readonly pdf: PdfRenderer;
  private readonly merger: PdfMerger;
  private readonly clock: Clock;

  constructor(deps: DocumentServiceDeps) {
    this.docs = deps.documentRepository;
    this.talents = deps.talentRepository;
    this.users = deps.userRepository;
    this.attachments = deps.attachmentStore;
    this.pdf = deps.pdfRenderer;
    this.merger = deps.pdfMerger;
    this.clock = deps.clock;
  }

  /**
   * The subject a document set belongs to: a pool talent, or — for the
   * recruiter's own documents, which are keyed by their user id and have no
   * talent record — the signed-in user themselves.
   */
  private async requireSubject(
    ownerId: string,
    talentId: string,
  ): Promise<{
    name: string;
    role: string;
    email: string;
    phone: string;
    location: string;
    updatedAt: string;
  }> {
    const talent = await this.talents.findById(ownerId, talentId);
    if (talent) return talent;
    const user = await this.users.findById(talentId);
    if (!user) throw new NotFoundError(`Talent ${talentId} not found`);
    // "suhay.sevinc@…" → "Suhay Sevinc" — same derivation the workspace uses.
    const name = user.email
      .split('@')[0]!
      .split(/[._-]+/)
      .map((w) => w.replace(/\d+/g, ''))
      .filter(Boolean)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
    return {
      name,
      role: 'Recruiter',
      email: user.email,
      phone: '',
      location: '',
      updatedAt: user.createdAt,
    };
  }

  async get(ownerId: string, talentId: string): Promise<TalentDocuments> {
    const subject = await this.requireSubject(ownerId, talentId);

    const existing = await this.docs.get(ownerId, talentId);
    if (existing) return existing;

    // No set saved yet — seed the contact from the subject, blank the rest.
    return {
      ownerId,
      talentId,
      contact: {
        name: subject.name,
        role: subject.role,
        email: subject.email,
        phone: subject.phone,
        location: subject.location,
        linkedin: '',
      },
      resume: { ...emptyResume },
      letter: { ...emptyLetter },
      style: { ...defaultStyle },
      updatedAt: subject.updatedAt,
    };
  }

  async save(
    ownerId: string,
    talentId: string,
    input: SaveDocumentsInput,
  ): Promise<TalentDocuments> {
    await this.requireSubject(ownerId, talentId); // 404s unknown subjects

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

  /**
   * The letter's date line, "Zürich, 2.7.2026" — locale follows the letter's
   * language (a German Anschreiben gets a German date), mirroring the preview.
   */
  private letterDate(documents: TalentDocuments): string {
    const lang = detectLanguage(`${documents.letter.anrede} ${documents.letter.gruss}`, 'de');
    const date = new Date(this.clock.isoNow()).toLocaleDateString(
      lang === 'de' ? 'de-DE' : 'en-GB',
    );
    const city = documents.contact.location.trim();
    return city ? `${city}, ${date}` : date;
  }

  /** Render the talent's saved documents (resume + cover letter) to a PDF. */
  async renderPdf(ownerId: string, talentId: string): Promise<Buffer> {
    const documents = await this.get(ownerId, talentId);
    return this.pdf.renderHtml(
      documentsToHtml(documents, { letterDate: this.letterDate(documents) }),
    );
  }

  /**
   * Render arbitrary (possibly unsaved) editor content to the exact same HTML
   * the PDF is built from — the single source of truth behind the editor's live
   * preview (ADR-0052). Because {@link renderPdf} runs this identical
   * `documentsToHtml` output through Puppeteer, what the recruiter sees in the
   * preview is what the export produces; the preview never persists anything.
   */
  renderPreviewHtml(input: SaveDocumentsInput): string {
    const documents: TalentDocuments = {
      ownerId: '',
      talentId: '',
      contact: input.contact,
      resume: input.resume,
      letter: input.letter,
      style: input.style,
      updatedAt: this.clock.isoNow(),
    };
    return documentsToHtml(documents, { letterDate: this.letterDate(documents) });
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
    return this.renderDossierFromDocuments(ownerId, documents, recipient, attachmentIds);
  }

  /**
   * Render a Bewerbungsmappe from a documents object supplied by the caller —
   * the same assembly as {@link renderDossierPdf} but from arbitrary content,
   * so the auto-apply agent can render a tailored snapshot without persisting
   * it over the candidate's stored documents (ADR-0019).
   */
  async renderDossierFromDocuments(
    ownerId: string,
    documents: TalentDocuments,
    recipient: DossierRecipient,
    attachmentIds: string[] = [],
  ): Promise<Buffer> {
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
    const mainPdf = await this.pdf.renderHtml(
      documentsToHtml(merged, { letterDate: this.letterDate(merged) }),
    );
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
