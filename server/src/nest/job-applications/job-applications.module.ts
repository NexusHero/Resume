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
  Put,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import {
  changeJobApplicationStatusSchema,
  createJobApplicationSchema,
  jobApplicationQuerySchema,
  updateJobApplicationDocumentsSchema,
  type ChangeJobApplicationStatusInput,
  type CreateJobApplicationInput,
  type JobApplicationQuery,
  type UpdateJobApplicationDocumentsInput,
} from '../../domain/job-application.js';
import { JobApplicationService } from '../../services/job-application-service.js';
import { ApplicationLetterService } from '../../services/application-letter-service.js';
import type { LlmFeatureRunner } from '../../services/llm-feature-runner.js';
import type { JobApplicationRepository } from '../../ports/job-application-repository.js';
import type { JobPostingRepository } from '../../ports/job-posting-repository.js';
import type { TalentRepository } from '../../ports/talent-repository.js';
import type { DocumentRepository } from '../../ports/document-repository.js';
import type { Clock } from '../../ports/clock.js';
import type { IdGenerator } from '../../ports/id-generator.js';
import { AuthGuard } from '../auth.guard.js';
import { AiConfiguredGuard, RequiresAi } from '../ai-configured.guard.js';
import { AiRateLimitGuard } from '../ai-rate-limit.guard.js';
import { CurrentScope, CurrentUserId } from '../params.js';
import { ZodValidationPipe } from '../zod-validation.pipe.js';
import {
  APPLICATION_LETTER_SERVICE,
  JOB_APPLICATION_SERVICE,
  JOB_APPLICATION_REPOSITORY,
  JOB_POSTING_REPOSITORY,
  TALENT_REPOSITORY,
  DOCUMENT_REPOSITORY,
  LLM_FEATURE_RUNNER,
  CLOCK,
  ID_GENERATOR,
} from '../tokens.js';

/**
 * Job applications ("Bewerbungen") under /api/v1/job-applications (ADR-0059).
 * AuthGuard on the class, scope via @CurrentScope(); **no** VermittlungGuard —
 * applications stay visible when the intermediary switch is off (AK-0.2). The
 * `AiConfiguredGuard` is marker-based (no-op without `@RequiresAi()`, which only
 * `/letter` carries); `AiRateLimitGuard` is a method guard on `/letter` only.
 */
@Controller('api/v1/job-applications')
@UseGuards(AuthGuard, AiConfiguredGuard)
export class JobApplicationsController {
  constructor(
    @Inject(JOB_APPLICATION_SERVICE) private readonly service: JobApplicationService,
    @Inject(APPLICATION_LETTER_SERVICE) private readonly letterService: ApplicationLetterService,
  ) {}

  @Get()
  list(
    @CurrentScope() scope: string,
    @Query(new ZodValidationPipe(jobApplicationQuerySchema)) query: JobApplicationQuery,
  ) {
    return this.service.list(scope, query.talentId);
  }

  @Get(':id')
  async get(@CurrentScope() scope: string, @Param('id') id: string) {
    return { jobApplication: await this.service.get(scope, id) };
  }

  @Post()
  async create(
    @CurrentScope() scope: string,
    @Body(new ZodValidationPipe(createJobApplicationSchema)) input: CreateJobApplicationInput,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { jobApplication, alreadyExisting } = await this.service.create(scope, input);
    res.status(alreadyExisting ? 200 : 201);
    return { jobApplication, alreadyExisting };
  }

  @Get(':id/documents')
  async getDocuments(@CurrentScope() scope: string, @Param('id') id: string) {
    return { documents: await this.service.getDocuments(scope, id) };
  }

  @Put(':id/documents')
  async saveDocuments(
    @CurrentScope() scope: string,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateJobApplicationDocumentsSchema))
    input: UpdateJobApplicationDocumentsInput,
  ) {
    return { documents: await this.service.saveDocuments(scope, id, input) };
  }

  @Post(':id/letter')
  @HttpCode(200)
  @RequiresAi()
  @UseGuards(AiRateLimitGuard)
  async letter(
    @CurrentScope() scope: string,
    @CurrentUserId() userId: string,
    @Param('id') id: string,
  ) {
    return this.letterService.generate(scope, userId, id);
  }

  @Post(':id/status')
  @HttpCode(200)
  async changeStatus(
    @CurrentScope() scope: string,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(changeJobApplicationStatusSchema))
    input: ChangeJobApplicationStatusInput,
  ) {
    return { jobApplication: await this.service.changeStatus(scope, id, input.status) };
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(@CurrentScope() scope: string, @Param('id') id: string) {
    await this.service.delete(scope, id);
  }
}

/** Job-applications feature slice (ADR-0051): services wired via useFactory. */
@Module({
  controllers: [JobApplicationsController],
  providers: [
    {
      provide: JOB_APPLICATION_SERVICE,
      useFactory: (
        jobApplicationRepository: JobApplicationRepository,
        jobPostingRepository: JobPostingRepository,
        talentRepository: TalentRepository,
        documentRepository: DocumentRepository,
        clock: Clock,
        idGenerator: IdGenerator,
      ) =>
        new JobApplicationService({
          jobApplicationRepository,
          jobPostingRepository,
          talentRepository,
          documentRepository,
          clock,
          idGenerator,
        }),
      inject: [
        JOB_APPLICATION_REPOSITORY,
        JOB_POSTING_REPOSITORY,
        TALENT_REPOSITORY,
        DOCUMENT_REPOSITORY,
        CLOCK,
        ID_GENERATOR,
      ],
    },
    {
      provide: APPLICATION_LETTER_SERVICE,
      useFactory: (
        llmFeatureRunner: LlmFeatureRunner,
        jobApplicationRepository: JobApplicationRepository,
        jobPostingRepository: JobPostingRepository,
      ) =>
        new ApplicationLetterService({
          llmFeatureRunner,
          jobApplicationRepository,
          jobPostingRepository,
        }),
      inject: [LLM_FEATURE_RUNNER, JOB_APPLICATION_REPOSITORY, JOB_POSTING_REPOSITORY],
    },
  ],
  exports: [JOB_APPLICATION_SERVICE, APPLICATION_LETTER_SERVICE],
})
export class JobApplicationsModule {}
