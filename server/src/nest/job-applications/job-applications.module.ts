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
  updateJobApplicationAttachmentsSchema,
  updateJobApplicationDocumentsSchema,
  type ChangeJobApplicationStatusInput,
  type CreateJobApplicationInput,
  type JobApplicationQuery,
  type UpdateJobApplicationAttachmentsInput,
  type UpdateJobApplicationDocumentsInput,
} from '../../domain/job-application.js';
import { JobApplicationService } from '../../services/job-application-service.js';
import { JobApplicationDossierService } from '../../services/job-application-dossier-service.js';
import { ApplicationLetterService } from '../../services/application-letter-service.js';
import { MagicPenService } from '../../services/magic-pen-service.js';
import { penExperienceSchema, type PenExperienceInput } from '../../domain/magic-pen.js';
import type { LlmFeatureRunner } from '../../services/llm-feature-runner.js';
import type { JobApplicationRepository } from '../../ports/job-application-repository.js';
import type { JobPostingRepository } from '../../ports/job-posting-repository.js';
import type { TalentRepository } from '../../ports/talent-repository.js';
import type { DocumentRepository } from '../../ports/document-repository.js';
import type { AttachmentStore } from '../../ports/attachment-store.js';
import type { DocumentService } from '../../services/document-service.js';
import type { Clock } from '../../ports/clock.js';
import type { IdGenerator } from '../../ports/id-generator.js';
import { AuthGuard } from '../auth.guard.js';
import { AiConfiguredGuard, RequiresAi } from '../ai-configured.guard.js';
import { AiRateLimitGuard } from '../ai-rate-limit.guard.js';
import { CurrentScope, CurrentUserId } from '../params.js';
import { ZodValidationPipe } from '../zod-validation.pipe.js';
import { DocumentsModule } from '../documents/documents.module.js';
import {
  APPLICATION_LETTER_SERVICE,
  JOB_APPLICATION_SERVICE,
  JOB_APPLICATION_DOSSIER_SERVICE,
  JOB_APPLICATION_REPOSITORY,
  JOB_POSTING_REPOSITORY,
  TALENT_REPOSITORY,
  DOCUMENT_REPOSITORY,
  DOCUMENT_SERVICE,
  ATTACHMENT_STORE,
  LLM_FEATURE_RUNNER,
  CLOCK,
  ID_GENERATOR,
  MAGIC_PEN_SERVICE,
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
    @Inject(JOB_APPLICATION_DOSSIER_SERVICE)
    private readonly dossier: JobApplicationDossierService,
    @Inject(APPLICATION_LETTER_SERVICE) private readonly letterService: ApplicationLetterService,
    @Inject(MAGIC_PEN_SERVICE) private readonly magicPen: MagicPenService,
  ) {}

  @Get()
  list(
    @CurrentScope() scope: string,
    @Query(new ZodValidationPipe(jobApplicationQuerySchema)) query: JobApplicationQuery,
  ) {
    return this.service.list(scope, query.talentId, query.status);
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
    @Query('unfreeze') unfreeze?: string,
  ) {
    return { documents: await this.service.saveDocuments(scope, id, input, unfreeze === '1') };
  }

  @Put(':id/attachments')
  async saveAttachments(
    @CurrentScope() scope: string,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateJobApplicationAttachmentsSchema))
    input: UpdateJobApplicationAttachmentsInput,
    @Query('unfreeze') unfreeze?: string,
  ) {
    return {
      jobApplication: await this.service.saveAttachments(
        scope,
        id,
        input.attachmentIds,
        unfreeze === '1',
      ),
    };
  }

  @Get(':id/dossier/pdf')
  async dossierPdf(@CurrentScope() scope: string, @Param('id') id: string, @Res() res: Response) {
    const { buffer, filename } = await this.dossier.renderPdf(scope, id);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  }

  @Get(':id/dossier/zip')
  async dossierZip(@CurrentScope() scope: string, @Param('id') id: string, @Res() res: Response) {
    const { stream, filename } = await this.dossier.renderZip(scope, id);
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    // Streaming (OQ4): no Content-Length (chunked), abort on client disconnect.
    stream.pipe(res);
    res.on('close', () => stream.destroy());
    stream.on('error', (err: Error) => res.destroy(err));
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

  @Post(':id/pen/headline')
  @HttpCode(200)
  @RequiresAi()
  @UseGuards(AiRateLimitGuard)
  async penHeadline(
    @CurrentScope() scope: string,
    @CurrentUserId() userId: string,
    @Param('id') id: string,
  ) {
    return { suggestion: await this.magicPen.rewriteSection(scope, userId, id, 'headline') };
  }

  @Post(':id/pen/summary')
  @HttpCode(200)
  @RequiresAi()
  @UseGuards(AiRateLimitGuard)
  async penSummary(
    @CurrentScope() scope: string,
    @CurrentUserId() userId: string,
    @Param('id') id: string,
  ) {
    return { suggestion: await this.magicPen.rewriteSection(scope, userId, id, 'summary') };
  }

  @Post(':id/pen/experience')
  @HttpCode(200)
  @RequiresAi()
  @UseGuards(AiRateLimitGuard)
  async penExperience(
    @CurrentScope() scope: string,
    @CurrentUserId() userId: string,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(penExperienceSchema)) input: PenExperienceInput,
  ) {
    return {
      suggestion: await this.magicPen.rewriteSection(scope, userId, id, 'experienceBullets', {
        experienceIndex: input.experienceIndex,
      }),
    };
  }

  @Post(':id/pen/skills')
  @HttpCode(200)
  @RequiresAi()
  @UseGuards(AiRateLimitGuard)
  async penSkills(
    @CurrentScope() scope: string,
    @CurrentUserId() userId: string,
    @Param('id') id: string,
  ) {
    return { suggestion: await this.magicPen.rewriteSection(scope, userId, id, 'skills') };
  }

  @Post(':id/pen/all')
  @HttpCode(200)
  @RequiresAi()
  @UseGuards(AiRateLimitGuard)
  async penAll(
    @CurrentScope() scope: string,
    @CurrentUserId() userId: string,
    @Param('id') id: string,
  ) {
    return this.magicPen.rewriteAll(scope, userId, id);
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
  imports: [DocumentsModule],
  controllers: [JobApplicationsController],
  providers: [
    {
      provide: JOB_APPLICATION_SERVICE,
      useFactory: (
        jobApplicationRepository: JobApplicationRepository,
        jobPostingRepository: JobPostingRepository,
        talentRepository: TalentRepository,
        documentRepository: DocumentRepository,
        attachmentStore: AttachmentStore,
        clock: Clock,
        idGenerator: IdGenerator,
      ) =>
        new JobApplicationService({
          jobApplicationRepository,
          jobPostingRepository,
          talentRepository,
          documentRepository,
          attachmentStore,
          clock,
          idGenerator,
        }),
      inject: [
        JOB_APPLICATION_REPOSITORY,
        JOB_POSTING_REPOSITORY,
        TALENT_REPOSITORY,
        DOCUMENT_REPOSITORY,
        ATTACHMENT_STORE,
        CLOCK,
        ID_GENERATOR,
      ],
    },
    {
      provide: JOB_APPLICATION_DOSSIER_SERVICE,
      useFactory: (
        jobApplicationRepository: JobApplicationRepository,
        attachmentStore: AttachmentStore,
        documentService: DocumentService,
      ) =>
        new JobApplicationDossierService({
          jobApplicationRepository,
          attachmentStore,
          documentService,
        }),
      inject: [JOB_APPLICATION_REPOSITORY, ATTACHMENT_STORE, DOCUMENT_SERVICE],
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
    {
      provide: MAGIC_PEN_SERVICE,
      useFactory: (
        llmFeatureRunner: LlmFeatureRunner,
        jobApplicationRepository: JobApplicationRepository,
        jobPostingRepository: JobPostingRepository,
        documentRepository: DocumentRepository,
        applicationLetterService: ApplicationLetterService,
      ) =>
        new MagicPenService({
          llmFeatureRunner,
          jobApplicationRepository,
          jobPostingRepository,
          documentRepository,
          applicationLetterService,
        }),
      inject: [
        LLM_FEATURE_RUNNER,
        JOB_APPLICATION_REPOSITORY,
        JOB_POSTING_REPOSITORY,
        DOCUMENT_REPOSITORY,
        APPLICATION_LETTER_SERVICE,
      ],
    },
  ],
  exports: [JOB_APPLICATION_SERVICE, APPLICATION_LETTER_SERVICE],
})
export class JobApplicationsModule {}
