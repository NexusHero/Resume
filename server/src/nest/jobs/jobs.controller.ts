import { Controller, Get, Inject, Query, UseGuards } from '@nestjs/common';
import type { JobSearchService } from '../../services/job-search-service.js';
import type { JobSearchResult } from '../../domain/job.js';
import { jobQuerySchema } from '../../domain/job.js';
import type { AppConfig } from '../../config.js';
import { AuthGuard } from '../auth.guard.js';
import { JOB_SEARCH_SERVICE, CONFIG } from '../tokens.js';

/**
 * GET /api/v1/jobs — two-tier, skill-matched job search (ADR-0051 port of the
 * Express JobController). With no query parameters it runs the candidate's
 * pre-configured default search so the screen is never empty; `?q=&threshold=`
 * override it. The raw query is validated with the same `jobQuerySchema`.
 */
@Controller('api/v1/jobs')
@UseGuards(AuthGuard)
export class JobsController {
  private readonly defaultSearch: Record<string, unknown>;

  constructor(
    @Inject(JOB_SEARCH_SERVICE) private readonly service: JobSearchService,
    @Inject(CONFIG) config: AppConfig,
  ) {
    this.defaultSearch = config.defaultJobSearch;
  }

  @Get()
  async search(@Query() rawQuery: Record<string, unknown>): Promise<JobSearchResult> {
    const hasParams = Object.keys(rawQuery).length > 0;
    const query = jobQuerySchema.parse(hasParams ? rawQuery : this.defaultSearch);
    return this.service.search(query);
  }
}
