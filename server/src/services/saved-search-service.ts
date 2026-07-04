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

/** CRUD for named searches, plus running one through the job search. */
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

  list(): Promise<SavedSearch[]> {
    return this.repo.list();
  }

  async create(input: CreateSavedSearchInput): Promise<SavedSearch> {
    const search: SavedSearch = {
      id: this.ids.next(),
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

  async remove(id: string): Promise<void> {
    const removed = await this.repo.remove(id);
    if (!removed) throw new NotFoundError(`Saved search ${id} not found`);
  }

  async run(id: string): Promise<JobSearchResult> {
    const search = await this.repo.findById(id);
    if (!search) throw new NotFoundError(`Saved search ${id} not found`);
    return this.jobs.search(jobQuerySchema.parse(search.query));
  }
}
