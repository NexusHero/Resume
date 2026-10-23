import {
  type AdoptJobPostingInput,
  type CreateJobPostingInput,
  type JobPosting,
  type UpdateJobPostingInput,
  matchesJobPostingQuery,
  normalizeUrl,
} from '../domain/job-posting.js';
import type { JobPostingDetail } from '../domain/job.js';
import { NotFoundError } from '../domain/errors.js';
import type { JobPostingRepository } from '../ports/job-posting-repository.js';
import type { Clock } from '../ports/clock.js';
import type { IdGenerator } from '../ports/id-generator.js';

/**
 * The thin "full text for one posting" dependency (note #4): the module factory
 * adapts the `JOB_SOURCE` composite to this shape. `null` means "the source is
 * known but supplies no full text" (→ `descriptionIncomplete`); an unknown
 * source is signalled by throwing `NotFoundError` (→ 404 "Quelle unbekannt").
 */
export type GetPosting = (source: string, sourceId: string) => Promise<JobPostingDetail | null>;

export interface JobPostingServiceDeps {
  jobPostingRepository: JobPostingRepository;
  clock: Clock;
  idGenerator: IdGenerator;
  getPosting: GetPosting;
}

export interface JobPostingCreateResult {
  jobPosting: JobPosting;
  /** True when a posting with the same dedup key already existed (AK-1.6). */
  alreadySaved: boolean;
}

/** CRUD for saved job postings ("Stellen"), plus adopt (no AI) and dedup. */
export class JobPostingService {
  private readonly repo: JobPostingRepository;
  private readonly clock: Clock;
  private readonly ids: IdGenerator;
  private readonly getPosting: GetPosting;

  constructor(deps: JobPostingServiceDeps) {
    this.repo = deps.jobPostingRepository;
    this.clock = deps.clock;
    this.ids = deps.idGenerator;
    this.getPosting = deps.getPosting;
  }

  /** The owner's postings, filtered by `q` and newest-first. */
  async list(ownerId: string, q?: string): Promise<JobPosting[]> {
    const all = await this.repo.list(ownerId);
    return all
      .filter((p) => (q ? matchesJobPostingQuery(p, q) : true))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async get(ownerId: string, id: string): Promise<JobPosting> {
    const posting = await this.repo.findById(ownerId, id);
    if (!posting) throw new NotFoundError(`Job posting ${id} not found`);
    return posting;
  }

  /**
   * Save a live search result ("Stelle übernehmen", AK-1.1) without AI. The
   * known fields come from the client's search; only the full text is fetched
   * per source (a `sourceId` present → detail lookup, else empty/incomplete).
   */
  async adopt(ownerId: string, input: AdoptJobPostingInput): Promise<JobPostingCreateResult> {
    const sourceId = input.sourceId?.trim() || undefined;
    const url = input.url ? normalizeUrl(input.url) : undefined;

    const existing = await this.repo.findDuplicate(ownerId, input.source, sourceId, url);
    if (existing) return { jobPosting: existing, alreadySaved: true };

    let description = '';
    let descriptionIncomplete = true;
    if (sourceId) {
      const detail = await this.getPosting(input.source, sourceId);
      if (detail) {
        description = detail.description;
        descriptionIncomplete = false;
      }
    }

    return this.persist(ownerId, {
      source: input.source,
      sourceId,
      url,
      company: input.company,
      title: input.title,
      location: input.location,
      country: input.country,
      description,
      requirements: input.requirements,
      descriptionIncomplete,
    });
  }

  /** Persist an edited extract draft ("Stelle einfügen", AK-1.3/1.6). */
  async create(ownerId: string, input: CreateJobPostingInput): Promise<JobPostingCreateResult> {
    const sourceId = input.sourceId?.trim() || undefined;
    const url = input.url ? normalizeUrl(input.url) : undefined;

    const existing = await this.repo.findDuplicate(ownerId, input.source, sourceId, url);
    if (existing) return { jobPosting: existing, alreadySaved: true };

    return this.persist(ownerId, {
      source: input.source,
      sourceId,
      url,
      company: input.company,
      title: input.title,
      location: input.location,
      country: input.country,
      description: input.description,
      requirements: input.requirements,
      descriptionIncomplete: input.description.trim() === '',
    });
  }

  /** Apply a partial update to the editable fields. 404 on a foreign id. */
  async update(ownerId: string, id: string, patch: UpdateJobPostingInput): Promise<JobPosting> {
    const current = await this.repo.findById(ownerId, id);
    if (!current) throw new NotFoundError(`Job posting ${id} not found`);

    const next: JobPosting = {
      ...current,
      ...(patch.company !== undefined ? { company: patch.company } : {}),
      ...(patch.title !== undefined ? { title: patch.title } : {}),
      ...(patch.location !== undefined ? { location: patch.location } : {}),
      ...(patch.country !== undefined ? { country: patch.country } : {}),
      ...(patch.description !== undefined ? { description: patch.description } : {}),
      ...(patch.requirements !== undefined ? { requirements: patch.requirements } : {}),
    };
    // The client may round-trip the flag; honour it only as a fallback when the
    // description is empty — the reset rule below always wins for real text.
    if (patch.descriptionIncomplete !== undefined) {
      next.descriptionIncomplete = patch.descriptionIncomplete;
    }
    // Reset rule (ADR-0058, §3.1): a non-empty description clears the
    // "incomplete" marker, so "Text ergänzen" lifts it without the client
    // steering the flag itself.
    if (next.description.trim() !== '') next.descriptionIncomplete = false;

    await this.repo.update(next);
    return next;
  }

  /** Remove an owned posting (AK-1.7). 404 on a foreign id. */
  async delete(ownerId: string, id: string): Promise<void> {
    const current = await this.repo.findById(ownerId, id);
    if (!current) throw new NotFoundError(`Job posting ${id} not found`);
    await this.repo.delete(ownerId, id);
  }

  private async persist(
    ownerId: string,
    fields: Omit<JobPosting, 'id' | 'ownerId' | 'createdAt'>,
  ): Promise<JobPostingCreateResult> {
    const posting: JobPosting = {
      id: this.ids.next(),
      ownerId,
      source: fields.source,
      ...(fields.sourceId ? { sourceId: fields.sourceId } : {}),
      ...(fields.url ? { url: fields.url } : {}),
      company: fields.company,
      title: fields.title,
      location: fields.location,
      country: fields.country,
      description: fields.description,
      requirements: fields.requirements,
      descriptionIncomplete: fields.descriptionIncomplete,
      createdAt: this.clock.isoNow(),
    };
    await this.repo.add(posting);
    // Race backstop (ADR-0058): the sql unique index swallows a concurrent
    // insert of the same dedup key, so re-check — if a different row now holds
    // the key, report it as "already saved" so the caller observes one row.
    const winner = await this.repo.findDuplicate(
      ownerId,
      fields.source,
      fields.sourceId,
      fields.url,
    );
    if (winner && winner.id !== posting.id) return { jobPosting: winner, alreadySaved: true };
    return { jobPosting: posting, alreadySaved: false };
  }
}
