import type { ApplicationTarget } from '../domain/application-target.js';
import type { ApplicationPayload } from '../domain/assistant.js';
import type { TalentDocuments } from '../domain/talent-documents.js';
import type { DocumentAiService } from './document-ai-service.js';
import type { DocumentService } from './document-service.js';
import type { AttachmentService } from './attachment-service.js';

export interface ApplicationBuilderDeps {
  documentAiService: DocumentAiService;
  documentService: DocumentService;
  attachmentService: AttachmentService;
}

/**
 * The isolated, heavy module of the auto-apply agent (ADR-0019): it builds a
 * complete, tailored application packet for a candidate + opening, and renders
 * its Bewerbungsmappe. It spends AI tokens (via DocumentAiService) — kept
 * separate from the assistant's token-free playbook — and NEVER writes the
 * candidate's canonical documents: the tuned CV + cover letter live only as a
 * snapshot on the staged suggestion.
 */
export class ApplicationBuilder {
  private readonly ai: DocumentAiService;
  private readonly documents: DocumentService;
  private readonly attachments: AttachmentService;

  constructor(deps: ApplicationBuilderDeps) {
    this.ai = deps.documentAiService;
    this.documents = deps.documentService;
    this.attachments = deps.attachmentService;
  }

  /**
   * Build the application snapshot: tailor the CV + cover letter to the ad (in
   * the ad's language) and select the candidate's PDF certificates. `score` is
   * supplied by the caller's match. Returns the payload staged on the queue.
   */
  async build(
    scope: string,
    userId: string,
    target: ApplicationTarget,
    talentId: string,
    score: number,
  ): Promise<ApplicationPayload> {
    const tailored = await this.ai.tailorForMandate(scope, userId, talentId, {
      role: target.role,
      company: target.company,
      jobText: target.jobText,
      lang: target.lang,
    });
    const pdfCertificates = (await this.attachments.list(scope, talentId))
      .filter((a) => a.contentType === 'application/pdf')
      .map((a) => a.id);

    return {
      source: target.source,
      targetRef: target.ref,
      role: target.role,
      company: target.company,
      location: target.location,
      mandateId: target.source === 'mandates' ? target.ref : '',
      jobText: target.jobText,
      lang: target.lang,
      score,
      summary: tailored.summary,
      paragraphs: tailored.paragraphs,
      attachmentIds: pdfCertificates,
      provider: tailored.provider,
      ungroundedCount: tailored.grounding.unsupported.length,
    };
  }

  /**
   * Render the Bewerbungsmappe for a staged application: the candidate's
   * documents with the tailored summary + cover-letter body from the snapshot,
   * addressed to the opening, plus the selected certificates — without ever
   * persisting the snapshot over the stored documents.
   */
  async renderDossier(
    scope: string,
    talentId: string,
    payload: ApplicationPayload,
  ): Promise<Buffer> {
    const documents = await this.documents.get(scope, talentId);
    const snapshot: TalentDocuments = {
      ...documents,
      resume: { ...documents.resume, summary: payload.summary },
      letter: {
        ...documents.letter,
        firma: payload.company || documents.letter.firma,
        betreff: payload.company ? `Bewerbung als ${payload.role}` : documents.letter.betreff,
        absaetze: payload.paragraphs.length ? payload.paragraphs : documents.letter.absaetze,
      },
    };
    return this.documents.renderDossierFromDocuments(
      scope,
      snapshot,
      { company: payload.company, subject: `Bewerbung als ${payload.role}` },
      payload.attachmentIds,
    );
  }
}
