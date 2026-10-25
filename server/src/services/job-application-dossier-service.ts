import type { Readable } from 'node:stream';
import { ZipFile } from 'yazl';
import { NotFoundError, ValidationError } from '../domain/errors.js';
import { recipientForMappe, type JobApplication } from '../domain/job-application.js';
import { safeFilename } from '../domain/slug.js';
import type { JobApplicationRepository } from '../ports/job-application-repository.js';
import type { AttachmentBlob, AttachmentStore } from '../ports/attachment-store.js';
import type { DocumentService } from './document-service.js';

export interface JobApplicationDossierServiceDeps {
  jobApplicationRepository: JobApplicationRepository;
  attachmentStore: AttachmentStore;
  documentService: DocumentService;
}

/** A rendered dossier plus the download filename. */
export interface RenderedPdf {
  buffer: Buffer;
  filename: string;
}

/** A streaming ZIP dossier plus the download filename. */
export interface RenderedZip {
  stream: Readable;
  filename: string;
}

/**
 * The Bewerbungsmappe for a job application (AK-4.1/4.2, ADR-0061): the merged
 * PDF is rendered **from the application's copy** (never the base CV) via the
 * reused `DocumentService.renderDossierFromDocuments` in `letter-first` order,
 * with the selected PDF attachments appended. The ZIP is streamed with `yazl`
 * (OQ4) — no in-memory whole-ZIP buffer, no re-import HTML (that is editor
 * semantics, not an employer submission).
 */
export class JobApplicationDossierService {
  private readonly repo: JobApplicationRepository;
  private readonly attachments: AttachmentStore;
  private readonly documents: DocumentService;

  constructor(deps: JobApplicationDossierServiceDeps) {
    this.repo = deps.jobApplicationRepository;
    this.attachments = deps.attachmentStore;
    this.documents = deps.documentService;
  }

  /** The merged PDF (letter → CV → selected attachments). */
  async renderPdf(scope: string, id: string): Promise<RenderedPdf> {
    const application = await this.requireApplication(scope, id);
    await this.requireAttachments(scope, application);
    const recipient = recipientForMappe(application);
    const buffer = await this.documents.renderDossierFromDocuments(
      scope,
      application.documents,
      recipient,
      application.selectedAttachmentIds,
      'letter-first',
    );
    return { buffer, filename: this.filename(application, 'pdf') };
  }

  /**
   * A streaming ZIP (OQ4): `Application.pdf` (the merged dossier, attachments
   * included — OQ1) plus each selected attachment as its own file (original
   * name, deduplicated). Validation is eager — an unknown/frozen/foreign/
   * non-PDF attachment throws **before** `end()`, so the caller never sees a
   * half-written stream.
   */
  async renderZip(scope: string, id: string): Promise<RenderedZip> {
    const application = await this.requireApplication(scope, id);
    const blobs = await this.requireAttachments(scope, application);
    const recipient = recipientForMappe(application);
    const mergedPdf = await this.documents.renderDossierFromDocuments(
      scope,
      application.documents,
      recipient,
      application.selectedAttachmentIds,
      'letter-first',
    );

    const zip = new ZipFile();
    zip.addBuffer(mergedPdf, 'Application.pdf');
    const names = new Set<string>();
    for (const { attachment, bytes } of blobs) {
      zip.addBuffer(bytes, this.dedupeName(attachment.name, names));
    }
    zip.end();
    return { stream: zip.outputStream as Readable, filename: this.filename(application, 'zip') };
  }

  /** The application in scope, or 404; a missing copy is 404 (ADR-0061 §2). */
  private async requireApplication(scope: string, id: string): Promise<JobApplication> {
    const application = await this.repo.findById(scope, id);
    if (!application) throw new NotFoundError(`Job application ${id} not found`);
    if (!application.documents) throw new NotFoundError('Application copy missing');
    return application;
  }

  /**
   * Resolve every selected attachment id against the store, eager and owner/talent
   * checked (RI3/OQ3): an unknown or foreign-talent attachment is 404, a non-PDF
   * is 400. Returns the resolved blobs in selection order.
   */
  private async requireAttachments(
    scope: string,
    application: JobApplication,
  ): Promise<AttachmentBlob[]> {
    const blobs: AttachmentBlob[] = [];
    for (const attachmentId of application.selectedAttachmentIds) {
      const blob = await this.attachments.get(scope, attachmentId);
      if (!blob || blob.attachment.talentId !== application.talentId) {
        throw new NotFoundError(`Attachment ${attachmentId} not found`);
      }
      if (blob.attachment.contentType !== 'application/pdf') {
        throw new ValidationError('Only PDF attachments can be selected');
      }
      blobs.push(blob);
    }
    return blobs;
  }

  /** `Application_<Candidate>_<Company>.<ext>` from the snapshots, slugified (Plan §5). */
  private filename(application: JobApplication, ext: 'pdf' | 'zip'): string {
    const candidate = safeFilename(application.talentName, 'Candidate');
    const company = safeFilename(application.postingCompany, 'Company');
    return `Application_${candidate}_${company}.${ext}`;
  }

  /** Keep each ZIP entry's original name unique (dedupe on collision). */
  private dedupeName(name: string, used: Set<string>): string {
    const base = safeFilename(name, 'Attachment');
    let candidate = base;
    let i = 2;
    while (used.has(candidate)) {
      candidate = `${base} (${i})`;
      i += 1;
    }
    used.add(candidate);
    return candidate;
  }
}
