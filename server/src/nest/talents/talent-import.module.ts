import { Body, Controller, HttpCode, Inject, Module, Post, UseGuards } from '@nestjs/common';
import { importPdfsSchema } from '../../domain/talent-import.js';
import { TalentImportService } from '../../services/talent-import-service.js';
import type { TalentService } from '../../services/talent-service.js';
import type { DocumentService } from '../../services/document-service.js';
import type { DocumentAiService } from '../../services/document-ai-service.js';
import type { Logger } from '../../ports/logger.js';
import { AuthGuard } from '../auth.guard.js';
import { AiRateLimitGuard } from '../ai-rate-limit.guard.js';
import { PlanGuard, RequiresPlan } from '../plan.guard.js';
import { CurrentScope, CurrentUserId } from '../params.js';
import { ZodValidationPipe } from '../zod-validation.pipe.js';
import { TalentsModule } from './talents.module.js';
import { DocumentsModule } from '../documents/documents.module.js';
import {
  TALENT_IMPORT_SERVICE,
  TALENT_SERVICE,
  DOCUMENT_SERVICE,
  DOCUMENT_AI_SERVICE,
  LOGGER,
} from '../tokens.js';

/**
 * Bulk CV import — POST /api/v1/talents/import (ADR-0051 port of the
 * TalentController's import route). Kept in its own slice because
 * TalentImportService composes the talents, documents and AI slices; the parse
 * step is generative, so the route is Pro-gated and AI rate-limited.
 */
@Controller('api/v1/talents')
@UseGuards(AuthGuard, AiRateLimitGuard, PlanGuard)
export class TalentImportController {
  constructor(@Inject(TALENT_IMPORT_SERVICE) private readonly importService: TalentImportService) {}

  @Post('import')
  @HttpCode(201)
  @RequiresPlan('pro')
  async importPdfs(
    @CurrentScope() scope: string,
    @CurrentUserId() userId: string,
    @Body(new ZodValidationPipe(importPdfsSchema))
    input: ReturnType<typeof importPdfsSchema.parse>,
  ) {
    return this.importService.importPdfs(scope, userId, input);
  }
}

@Module({
  imports: [TalentsModule, DocumentsModule],
  controllers: [TalentImportController],
  providers: [
    {
      provide: TALENT_IMPORT_SERVICE,
      useFactory: (
        talentService: TalentService,
        documentService: DocumentService,
        documentAiService: DocumentAiService,
        logger: Logger,
      ) => new TalentImportService({ talentService, documentService, documentAiService, logger }),
      inject: [TALENT_SERVICE, DOCUMENT_SERVICE, DOCUMENT_AI_SERVICE, LOGGER],
    },
  ],
  exports: [TALENT_IMPORT_SERVICE],
})
export class TalentImportModule {}
