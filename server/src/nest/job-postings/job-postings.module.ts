import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Inject,
  Module,
  Param,
  Patch,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import {
  adoptJobPostingSchema,
  createJobPostingSchema,
  extractJobPostingSchema,
  jobPostingQuerySchema,
  updateJobPostingSchema,
  type AdoptJobPostingInput,
  type CreateJobPostingInput,
  type ExtractJobPostingInput,
  type JobPostingQuery,
  type UpdateJobPostingInput,
} from '../../domain/job-posting.js';
import { NotFoundError } from '../../domain/errors.js';
import { JobPostingService, type GetPosting } from '../../services/job-posting-service.js';
import { JobPostingExtractService } from '../../services/job-posting-extract-service.js';
import type { LlmFeatureRunner } from '../../services/llm-feature-runner.js';
import type { JobPostingRepository } from '../../ports/job-posting-repository.js';
import type { PageFetcher } from '../../ports/page-fetcher.js';
import type { JobSource } from '../../ports/job-source.js';
import type { Clock } from '../../ports/clock.js';
import type { IdGenerator } from '../../ports/id-generator.js';
import { CompositeJobSource } from '../../adapters/composite-job-source.js';
import { AuthGuard } from '../auth.guard.js';
import { AiConfiguredGuard, RequiresAi } from '../ai-configured.guard.js';
import { AiConsentGuard, RequiresAiConsent } from '../ai-consent.guard.js';
import { AiRateLimitGuard } from '../ai-rate-limit.guard.js';
import { CurrentScope, CurrentUserId } from '../params.js';
import { ZodValidationPipe } from '../zod-validation.pipe.js';
import { JobsModule } from '../jobs/jobs.module.js';
import {
  JOB_POSTING_SERVICE,
  JOB_POSTING_EXTRACT_SERVICE,
  JOB_POSTING_REPOSITORY,
  PAGE_FETCHER,
  JOB_SOURCE,
  LLM_FEATURE_RUNNER,
  CLOCK,
  ID_GENERATOR,
} from '../tokens.js';

/**
 * Saved job postings ("Stellen") under /api/v1/job-postings (ADR-0058).
 * AuthGuard on the class, scope via @CurrentScope(); **no** VermittlungGuard —
 * Stellen stay visible when the intermediary switch is off (AK-0.2). The
 * `AiConfiguredGuard` is marker-based (no-op without `@RequiresAi()`, which only
 * `/extract` carries); `AiRateLimitGuard` is a method guard on `/extract` only.
 */
@Controller('api/v1/job-postings')
@UseGuards(AuthGuard, AiConfiguredGuard, AiConsentGuard)
export class JobPostingsController {
  constructor(
    @Inject(JOB_POSTING_SERVICE) private readonly service: JobPostingService,
    @Inject(JOB_POSTING_EXTRACT_SERVICE) private readonly extractService: JobPostingExtractService,
  ) {}

  @Get()
  list(
    @CurrentScope() scope: string,
    @Query(new ZodValidationPipe(jobPostingQuerySchema)) query: JobPostingQuery,
  ) {
    return this.service.list(scope, query.q);
  }

  @Get(':id')
  async get(@CurrentScope() scope: string, @Param('id') id: string) {
    return { jobPosting: await this.service.get(scope, id) };
  }

  @Post('adopt')
  @HttpCode(200)
  async adopt(
    @CurrentScope() scope: string,
    @Body(new ZodValidationPipe(adoptJobPostingSchema)) input: AdoptJobPostingInput,
  ) {
    const { jobPosting, alreadySaved } = await this.service.adopt(scope, input);
    return { jobPosting, alreadySaved };
  }

  @Post('extract')
  @HttpCode(200)
  @RequiresAi()
  @RequiresAiConsent()
  @UseGuards(AiRateLimitGuard)
  async extract(
    @CurrentUserId() userId: string,
    @Body(new ZodValidationPipe(extractJobPostingSchema)) input: ExtractJobPostingInput,
  ) {
    return 'url' in input
      ? this.extractService.fromUrl(userId, input.url)
      : this.extractService.fromText(userId, input.text);
  }

  @Post()
  async create(
    @CurrentScope() scope: string,
    @Body(new ZodValidationPipe(createJobPostingSchema)) input: CreateJobPostingInput,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { jobPosting, alreadySaved } = await this.service.create(scope, input);
    res.status(alreadySaved ? 200 : 201);
    return { jobPosting, alreadySaved };
  }

  @Patch(':id')
  async update(
    @CurrentScope() scope: string,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateJobPostingSchema)) input: UpdateJobPostingInput,
  ) {
    return { jobPosting: await this.service.update(scope, id, input) };
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(@CurrentScope() scope: string, @Param('id') id: string) {
    await this.service.delete(scope, id);
  }
}

/**
 * Adapt the composite `JOB_SOURCE` to the service's thin `getPosting(source,
 * sourceId)` dependency. A composite delegates to the source by name; a
 * non-composite (EmptyJobSource — no sources configured) can never know a
 * source, so it 404s "Quelle unbekannt" (note #4).
 */
function adaptGetPosting(jobSource: JobSource): GetPosting {
  return (source, sourceId) => {
    if (jobSource instanceof CompositeJobSource) {
      return jobSource.getPostingBySource(source, sourceId);
    }
    throw new NotFoundError(`Unknown job source ${source}`);
  };
}

/** Job-postings feature slice (ADR-0051): services wired via useFactory. */
@Module({
  imports: [JobsModule], // provides JOB_SOURCE (composite) for getPosting
  controllers: [JobPostingsController],
  providers: [
    {
      provide: JOB_POSTING_SERVICE,
      useFactory: (
        jobPostingRepository: JobPostingRepository,
        clock: Clock,
        idGenerator: IdGenerator,
        jobSource: JobSource,
      ) =>
        new JobPostingService({
          jobPostingRepository,
          clock,
          idGenerator,
          getPosting: adaptGetPosting(jobSource),
        }),
      inject: [JOB_POSTING_REPOSITORY, CLOCK, ID_GENERATOR, JOB_SOURCE],
    },
    {
      provide: JOB_POSTING_EXTRACT_SERVICE,
      useFactory: (llmFeatureRunner: LlmFeatureRunner, pageFetcher: PageFetcher) =>
        new JobPostingExtractService({ llmFeatureRunner, pageFetcher }),
      inject: [LLM_FEATURE_RUNNER, PAGE_FETCHER],
    },
  ],
  exports: [JOB_POSTING_SERVICE, JOB_POSTING_EXTRACT_SERVICE],
})
export class JobPostingsModule {}
