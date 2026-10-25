import {
  appendStatusChange,
  type CreateJobApplicationInput,
  type JobApplication,
  type JobApplicationStatus,
  type UpdateJobApplicationDocumentsInput,
} from '../domain/job-application.js';
import { FrozenError, NotFoundError, ValidationError } from '../domain/errors.js';
import {
  copyDocumentsForApplication,
  emptyDocuments,
  type TalentDocuments,
} from '../domain/talent-documents.js';
import type { JobApplicationRepository } from '../ports/job-application-repository.js';
import type { JobPostingRepository } from '../ports/job-posting-repository.js';
import type { TalentRepository } from '../ports/talent-repository.js';
import type { DocumentRepository } from '../ports/document-repository.js';
import type { AttachmentStore } from '../ports/attachment-store.js';
import type { Clock } from '../ports/clock.js';
import type { IdGenerator } from '../ports/id-generator.js';

export interface JobApplicationServiceDeps {
  jobApplicationRepository: JobApplicationRepository;
  jobPostingRepository: JobPostingRepository;
  talentRepository: TalentRepository;
  documentRepository: DocumentRepository;
  attachmentStore: AttachmentStore;
  clock: Clock;
  idGenerator: IdGenerator;
}

export interface JobApplicationCreateResult {
  jobApplication: JobApplication;
  /** True when an application for `(posting, talent)` already existed (AK-2.2). */
  alreadyExisting: boolean;
}

/**
 * CRUD for job applications ("Bewerbung" = Stelle × Mandant, ADR-0059). `create`
 * is idempotent (one application per `(posting, talent)`), seeds the snapshot
 * fields and copies the base documents into the embedded copy.
 */
export class JobApplicationService {
  private readonly repo: JobApplicationRepository;
  private readonly postings: JobPostingRepository;
  private readonly talents: TalentRepository;
  private readonly documents: DocumentRepository;
  private readonly attachments: AttachmentStore;
  private readonly clock: Clock;
  private readonly ids: IdGenerator;

  constructor(deps: JobApplicationServiceDeps) {
    this.repo = deps.jobApplicationRepository;
    this.postings = deps.jobPostingRepository;
    this.talents = deps.talentRepository;
    this.documents = deps.documentRepository;
    this.attachments = deps.attachmentStore;
    this.clock = deps.clock;
    this.ids = deps.idGenerator;
  }

  /** The owner's applications, optionally filtered by talent/status, newest first. */
  async list(
    ownerId: string,
    talentId?: string,
    status?: JobApplicationStatus,
  ): Promise<JobApplication[]> {
    const all = await this.repo.list(ownerId, talentId, status);
    return all.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async get(ownerId: string, id: string): Promise<JobApplication> {
    const application = await this.repo.findById(ownerId, id);
    if (!application) throw new NotFoundError(`Job application ${id} not found`);
    return application;
  }

  /**
   * Create an application for `(posting, talent)` — idempotent (AK-2.2): a second
   * call returns the existing application with `alreadyExisting: true`. Seeds the
   * snapshots (`postingCompany`/`postingTitle`/`talentName`), the `draft` status
   * and its first history entry, and an **independent copy** of the base
   * documents (empty defaults when the talent has no base set yet, §3.4).
   */
  async create(
    ownerId: string,
    input: CreateJobApplicationInput,
  ): Promise<JobApplicationCreateResult> {
    const posting = await this.postings.findById(ownerId, input.jobPostingId);
    if (!posting) throw new NotFoundError('Job posting not found');
    const talent = await this.talents.findById(ownerId, input.talentId);
    if (!talent) throw new NotFoundError('Candidate not found');

    const existing = await this.repo.findByPostingAndTalent(ownerId, posting.id, talent.id);
    if (existing) return { jobApplication: existing, alreadyExisting: true };

    const createdAt = this.clock.isoNow();
    const base = await this.documents.get(ownerId, talent.id);
    const documents = base
      ? copyDocumentsForApplication(base)
      : emptyDocuments(
          ownerId,
          talent.id,
          {
            name: talent.name,
            role: talent.role,
            email: talent.email,
            phone: talent.phone,
            location: talent.location,
            linkedin: '',
          },
          createdAt,
        );

    const application: JobApplication = {
      id: this.ids.next(),
      ownerId,
      jobPostingId: posting.id,
      postingCompany: posting.company,
      postingTitle: posting.title,
      talentId: talent.id,
      talentName: talent.name,
      status: 'draft',
      statusHistory: [{ status: 'draft', at: createdAt }],
      documents,
      selectedAttachmentIds: [],
      createdAt,
      updatedAt: createdAt,
    };
    await this.repo.add(application);

    // Race backstop (ADR-0059): the sql unique index swallows a concurrent insert
    // of the same (posting, talent); re-check so the caller observes one row.
    const winner = await this.repo.findByPostingAndTalent(ownerId, posting.id, talent.id);
    if (winner && winner.id !== application.id)
      return { jobApplication: winner, alreadyExisting: true };
    return { jobApplication: application, alreadyExisting: false };
  }

  /** The embedded document copy. 404 on a foreign id. */
  async getDocuments(ownerId: string, id: string): Promise<TalentDocuments> {
    const application = await this.get(ownerId, id);
    return application.documents;
  }

  /**
   * Persist the editor payload onto the **copy only** (B05). The server strips
   * `resume.rawText` and drops `translations` (a copy carries neither, ADR-0059)
   * and bumps `updatedAt`. The base CV and other applications stay untouched.
   *
   * Once the application is not `draft` it is frozen (AK-4.5, ADR-0061 §5): the
   * save throws `FrozenError` unless the caller confirms with `unfreeze`, which
   * appends a noted history entry (once per status phase, no autosave spam).
   */
  async saveDocuments(
    ownerId: string,
    id: string,
    input: UpdateJobApplicationDocumentsInput,
    unfreeze = false,
  ): Promise<TalentDocuments> {
    const application = await this.get(ownerId, id);
    this.assertNotFrozen(application, unfreeze);
    const now = this.clock.isoNow();
    const documents: TalentDocuments = {
      ownerId: application.documents.ownerId,
      talentId: application.documents.talentId,
      contact: input.contact,
      resume: { ...input.resume, rawText: '' },
      letter: input.letter,
      style: input.style,
      updatedAt: now,
    };
    const next = this.withUnfreezeNote(
      { ...application, documents, updatedAt: now },
      now,
      'Documents edited after freezing',
    );
    await this.repo.update(next);
    return documents;
  }

  /**
   * Persist the PDF-only attachment selection (OQ3, ADR-0061). Each id must be an
   * attachment of the same talent in this workspace (else `NotFoundError`) **and**
   * a PDF (else `ValidationError`). Frozen unless confirmed with `unfreeze`.
   */
  async saveAttachments(
    ownerId: string,
    id: string,
    attachmentIds: string[],
    unfreeze = false,
  ): Promise<JobApplication> {
    const application = await this.get(ownerId, id);
    this.assertNotFrozen(application, unfreeze);
    for (const attachmentId of attachmentIds) {
      const blob = await this.attachments.get(ownerId, attachmentId);
      if (!blob || blob.attachment.talentId !== application.talentId) {
        throw new NotFoundError(`Attachment ${attachmentId} not found`);
      }
      if (blob.attachment.contentType !== 'application/pdf') {
        throw new ValidationError('Only PDF attachments can be selected');
      }
    }
    const now = this.clock.isoNow();
    const next = this.withUnfreezeNote(
      { ...application, selectedAttachmentIds: attachmentIds, updatedAt: now },
      now,
      'Attachments edited after freezing',
    );
    await this.repo.update(next);
    return next;
  }

  /** `status !== 'draft'` is frozen; without `unfreeze` the write is a 409. */
  private assertNotFrozen(application: JobApplication, unfreeze: boolean): void {
    if (application.status !== 'draft' && !unfreeze) throw new FrozenError();
  }

  /**
   * Append the force-edit note once per **confirmation type** (Note-Dedup, AK-4.5):
   * a repeated forced edit of the same kind (documents, or attachments) appends
   * no second note (anti-autosave-spam), but a forced edit of the *other* kind
   * appends its own distinct note — so two different forced edits after "sent"
   * yield two distinguishable history entries. A later status change writes a
   * note-less entry, so the next forced edit is noted again.
   */
  private withUnfreezeNote(application: JobApplication, now: string, note: string): JobApplication {
    if (application.status === 'draft') return application;
    const last = application.statusHistory[application.statusHistory.length - 1];
    if (last?.note === note) return application;
    return {
      ...application,
      statusHistory: appendStatusChange(application.statusHistory, application.status, now, note),
    };
  }

  /** Append a status change with a timestamp (AK-4.4 pre-run: any transition). */
  async changeStatus(
    ownerId: string,
    id: string,
    status: JobApplicationStatus,
  ): Promise<JobApplication> {
    const application = await this.get(ownerId, id);
    const now = this.clock.isoNow();
    const next: JobApplication = {
      ...application,
      status,
      statusHistory: appendStatusChange(application.statusHistory, status, now),
      updatedAt: now,
    };
    await this.repo.update(next);
    return next;
  }

  /** Remove an owned application (and its embedded copy). 404 on a foreign id. */
  async delete(ownerId: string, id: string): Promise<void> {
    await this.get(ownerId, id);
    await this.repo.delete(ownerId, id);
  }
}
