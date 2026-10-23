import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Inject,
  Module,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { createSavedSearchSchema } from '../../domain/saved-search.js';
import { SavedSearchService } from '../../services/saved-search-service.js';
import type { JobSearchService } from '../../services/job-search-service.js';
import type { SavedSearchRepository } from '../../ports/saved-search-repository.js';
import type { Clock } from '../../ports/clock.js';
import type { IdGenerator } from '../../ports/id-generator.js';
import { AuthGuard } from '../auth.guard.js';
import { CurrentScope } from '../params.js';
import { ZodValidationPipe } from '../zod-validation.pipe.js';
import { JobsModule } from '../jobs/jobs.module.js';
import {
  SAVED_SEARCH_SERVICE,
  SAVED_SEARCH_REPOSITORY,
  JOB_SEARCH_SERVICE,
  CLOCK,
  ID_GENERATOR,
} from '../tokens.js';

/**
 * Saved searches under /api/v1/searches (ADR-0051 port of SavedSearchController):
 * list, create, remove and re-run. Workspace-scoped (RI15/Q6) — every operation
 * is filtered to the caller's `@CurrentScope()`.
 */
@Controller('api/v1/searches')
@UseGuards(AuthGuard)
export class SearchesController {
  constructor(@Inject(SAVED_SEARCH_SERVICE) private readonly service: SavedSearchService) {}

  @Get()
  list(@CurrentScope() scope: string) {
    return this.service.list(scope);
  }

  @Post()
  @HttpCode(201)
  async create(
    @CurrentScope() scope: string,
    @Body(new ZodValidationPipe(createSavedSearchSchema))
    input: ReturnType<typeof createSavedSearchSchema.parse>,
  ) {
    return { search: await this.service.create(scope, input) };
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(@CurrentScope() scope: string, @Param('id') id: string): Promise<void> {
    await this.service.remove(scope, id);
  }

  @Get(':id/run')
  run(@CurrentScope() scope: string, @Param('id') id: string) {
    return this.service.run(scope, id);
  }
}

/** Saved-searches feature slice (ADR-0051): SavedSearchService wired via useFactory. */
@Module({
  imports: [JobsModule], // provides JOB_SEARCH_SERVICE to re-run a saved search
  controllers: [SearchesController],
  providers: [
    {
      provide: SAVED_SEARCH_SERVICE,
      useFactory: (
        savedSearchRepository: SavedSearchRepository,
        jobSearchService: JobSearchService,
        clock: Clock,
        idGenerator: IdGenerator,
      ) => new SavedSearchService({ savedSearchRepository, jobSearchService, clock, idGenerator }),
      inject: [SAVED_SEARCH_REPOSITORY, JOB_SEARCH_SERVICE, CLOCK, ID_GENERATOR],
    },
  ],
})
export class SearchesModule {}
