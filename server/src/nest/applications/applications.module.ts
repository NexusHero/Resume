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
  UseGuards,
} from '@nestjs/common';
import {
  createApplicationSchema,
  updateApplicationSchema,
  buildApplicationSchema,
} from '../../domain/application.js';
import { ApplicationService } from '../../services/application-service.js';
import type { ApplicationRepository } from '../../ports/application-repository.js';
import type { AuditLog } from '../../ports/audit-log.js';
import type { PdfArchive } from '../../ports/pdf-archive.js';
import type { PdfRenderer } from '../../ports/pdf-renderer.js';
import type { PdfMerger } from '../../ports/pdf-merger.js';
import type { Versioner } from '../../ports/versioner.js';
import type { Clock } from '../../ports/clock.js';
import type { IdGenerator } from '../../ports/id-generator.js';
import type { Logger } from '../../ports/logger.js';
import { AuthGuard } from '../auth.guard.js';
import { CurrentScope } from '../params.js';
import { ZodValidationPipe } from '../zod-validation.pipe.js';
import {
  APPLICATION_SERVICE,
  APPLICATION_REPOSITORY,
  AUDIT_LOG,
  PDF_ARCHIVE,
  PDF_RENDERER,
  PDF_MERGER,
  VERSIONER,
  CLOCK,
  ID_GENERATOR,
  LOGGER,
} from '../tokens.js';

/**
 * Applications under /api/v1 (ADR-0051 port of ApplicationController): the pipeline
 * list, the audit history, submitting an application, building one to PDF, and
 * stage updates. Team-scoped.
 */
@Controller('api/v1')
@UseGuards(AuthGuard)
export class ApplicationsController {
  constructor(@Inject(APPLICATION_SERVICE) private readonly service: ApplicationService) {}

  @Get('applications')
  list(@CurrentScope() scope: string) {
    return this.service.list(scope);
  }

  @Get('history')
  history(@CurrentScope() scope: string) {
    return this.service.history(scope);
  }

  @Post('applications')
  @HttpCode(201)
  async create(
    @CurrentScope() scope: string,
    @Body(new ZodValidationPipe(createApplicationSchema))
    input: ReturnType<typeof createApplicationSchema.parse>,
  ) {
    return { application: await this.service.create(scope, input) };
  }

  @Post('applications/build')
  @HttpCode(201)
  async build(
    @CurrentScope() scope: string,
    @Body(new ZodValidationPipe(buildApplicationSchema))
    input: ReturnType<typeof buildApplicationSchema.parse>,
  ) {
    return this.service.build(scope, input);
  }

  @Patch('applications/:id')
  async update(
    @CurrentScope() scope: string,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateApplicationSchema))
    input: ReturnType<typeof updateApplicationSchema.parse>,
  ) {
    return { application: await this.service.update(scope, id, input) };
  }

  @Delete('applications/:id')
  @HttpCode(204)
  async remove(@CurrentScope() scope: string, @Param('id') id: string) {
    await this.service.delete(scope, id);
  }
}

/** Applications feature slice (ADR-0051): ApplicationService wired via useFactory. */
@Module({
  controllers: [ApplicationsController],
  providers: [
    {
      provide: APPLICATION_SERVICE,
      useFactory: (
        applicationRepository: ApplicationRepository,
        auditLog: AuditLog,
        pdfArchive: PdfArchive,
        pdfRenderer: PdfRenderer,
        pdfMerger: PdfMerger,
        versioner: Versioner,
        clock: Clock,
        idGenerator: IdGenerator,
        logger: Logger,
      ) =>
        new ApplicationService({
          applicationRepository,
          auditLog,
          pdfArchive,
          pdfRenderer,
          pdfMerger,
          versioner,
          clock,
          idGenerator,
          logger,
        }),
      inject: [
        APPLICATION_REPOSITORY,
        AUDIT_LOG,
        PDF_ARCHIVE,
        PDF_RENDERER,
        PDF_MERGER,
        VERSIONER,
        CLOCK,
        ID_GENERATOR,
        LOGGER,
      ],
    },
  ],
  exports: [APPLICATION_SERVICE],
})
export class ApplicationsModule {}
