import {
  appendStatusChange,
  type CreateJobApplicationInput,
  type JobApplication,
  type JobApplicationStatus,
  type UpdateJobApplicationDocumentsInput,
} from '../domain/job-application.js';
import { NotFoundError } from '../domain/errors.js';
import {
  copyDocumentsForApplication,
  emptyDocuments,
  type TalentDocuments,
} from '../domain/talent-documents.js';
import type { JobApplicationRepository } from '../ports/job-application-repository.js';
import type { JobPostingRepository } from '../ports/job-posting-repository.js';
import type { TalentRepository } from '../ports/talent-repository.js';
import type { DocumentRepository } from '../ports/document-repository.js';
import type { Clock } from '../ports/clock.js';
import type { IdGenerator } from '../ports/id-generator.js';

export interface JobApplicationServiceDeps {
  jobApplicationRepository: JobApplicationRepository;
  jobPostingRepository: JobPostingRepository;
  talentRepository: TalentRepository;
  documentRepository: DocumentRepository;
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
  private readonly clock: Clock;
  private readonly ids: IdGenerator;

  constructor(deps: JobApplicationServiceDeps) {
    this.repo = deps.jobApplicationRepository;
    this.postings = deps.jobPostingRepository;
    this.talents = deps.talentRepository;
    this.documents = deps.documentRepository;
    this.clock = deps.clock;
    this.ids = deps.idGenerator;
  }

  /** The owner's applications, optionally filtered by talent, newest first. */
  async list(ownerId: string, talentId?: string): Promise<JobApplication[]> {
    const all = await this.repo.list(ownerId, talentId);
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
    if (!posting) throw new NotFoundError('Stelle unbekannt');
    const talent = await this.talents.findById(ownerId, input.talentId);
    if (!talent) throw new NotFoundError('Mandant unbekannt');

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
   */
  async saveDocuments(
    ownerId: string,
    id: string,
    input: UpdateJobApplicationDocumentsInput,
  ): Promise<TalentDocuments> {
    const application = await this.get(ownerId, id);
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
    await this.repo.update({ ...application, documents, updatedAt: now });
    return documents;
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
