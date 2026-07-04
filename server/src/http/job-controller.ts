import type { Request, Response } from 'express';
import { jobQuerySchema } from '../domain/job.js';
import type { AppConfig } from '../config.js';
import type { JobSearchService } from '../services/job-search-service.js';

/**
 * GET /api/v1/jobs — two-tier, skill-matched job search.
 *
 * With no query parameters it runs the candidate's pre-configured default search
 * (so the screen is never empty on open). `?threshold=` overrides the tier
 * boundary (default 80).
 */
export class JobController {
  private readonly service: JobSearchService;
  private readonly defaultSearch: Record<string, unknown>;

  constructor(deps: { jobSearchService: JobSearchService; config: AppConfig }) {
    this.service = deps.jobSearchService;
    this.defaultSearch = deps.config.defaultJobSearch;
  }

  search = async (req: Request, res: Response): Promise<void> => {
    const hasParams = Object.keys(req.query).length > 0;
    const raw = hasParams ? req.query : this.defaultSearch;
    const query = jobQuerySchema.parse(raw);
    res.json(await this.service.search(query));
  };
}
