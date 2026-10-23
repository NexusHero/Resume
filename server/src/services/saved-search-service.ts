import { type SavedSearch, type CreateSavedSearchInput } from '../domain/saved-search.js';
import { jobQuerySchema, type JobSearchResult } from '../domain/job.js';
import { NotFoundError } from '../domain/errors.js';
import type { SavedSearchRepository } from '../ports/saved-search-repository.js';
import type { Clock } from '../ports/clock.js';
import type { IdGenerator } from '../ports/id-generator.js';
import type { JobSearchService } from './job-search-service.js';

export interface SavedSearchServiceDeps {
  savedSearchRepository: SavedSearchRepository;
  jobSearchService: JobSearchService;
  clock: Clock;
  idGenerator: IdGenerator;
}

/** CRUD for named searches, plus running one through the job search. Workspace-scoped (RI15/Q6). */
export class SavedSearchService {
  private readonly repo: SavedSearchRepository;
  private readonly jobs: JobSearchService;
  private readonly clock: Clock;
  private readonly ids: IdGenerator;

  constructor(deps: SavedSearchServiceDeps) {
    this.repo = deps.savedSearchRepository;
    this.jobs = deps.jobSearchService;
    this.clock = deps.clock;
    this.ids = deps.idGenerator;
  }

  list(ownerId: string): Promise<SavedSearch[]> {
    return this.repo.list(ownerId);
  }

  async create(ownerId: string, input: CreateSavedSearchInput): Promise<SavedSearch> {
    const search: SavedSearch = {
      id: this.ids.next(),
      ownerId,
      name: input.name,
      query: {
        q: input.q,
        city: input.city,
        country: input.country,
        threshold: input.threshold,
      },
      createdAt: this.clock.isoNow(),
    };
    await this.repo.add(search);
    return search;
  }

  async remove(ownerId: string, id: string): Promise<void> {
    const removed = await this.repo.remove(ownerId, id);
    if (!removed) throw new NotFoundError(`Saved search ${id} not found`);
  }

  async run(ownerId: string, id: string): Promise<JobSearchResult> {
    const search = await this.repo.findById(ownerId, id);
    if (!search) throw new NotFoundError(`Saved search ${id} not found`);
    return this.jobs.search(jobQuerySchema.parse(search.query));
  }
}
