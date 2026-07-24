import {
  Body,
  Controller,
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
import { saveDocumentsSchema } from '../../domain/talent-documents.js';
import { DocumentService } from '../../services/document-service.js';
import type { DocumentRepository } from '../../ports/document-repository.js';
import type { TalentRepository } from '../../ports/talent-repository.js';
import type { UserRepository } from '../../ports/user-repository.js';
import type { AttachmentStore } from '../../ports/attachment-store.js';
import type { PdfRenderer } from '../../ports/pdf-renderer.js';
import type { PdfMerger } from '../../ports/pdf-merger.js';
import type { Clock } from '../../ports/clock.js';
import { AuthGuard } from '../auth.guard.js';
import { CurrentScope } from '../params.js';
import { ZodValidationPipe } from '../zod-validation.pipe.js';
import {
  DOCUMENT_SERVICE,
  DOCUMENT_REPOSITORY,
  TALENT_REPOSITORY,
  USER_REPOSITORY,
  ATTACHMENT_STORE,
  PDF_RENDERER,
  PDF_MERGER,
  CLOCK,
} from '../tokens.js';

const str = (v: unknown): string | undefined => (typeof v === 'string' ? v : undefined);

/**
 * Talent documents (non-AI routes) under /api/v1/talents/:id (ADR-0051 port of the
 * DocumentController's DocumentService half): read/save the structured documents
 * and render the CV + dossier PDFs. The AI tailoring routes join once the AI
 * cluster lands.
 */
@Controller('api/v1/talents/:id')
@UseGuards(AuthGuard)
export class DocumentsController {
  constructor(@Inject(DOCUMENT_SERVICE) private readonly service: DocumentService) {}

  @Get('documents')
  async get(@CurrentScope() scope: string, @Param('id') id: string) {
    return { documents: await this.service.get(scope, id) };
  }

  @Put('documents')
  async save(
    @CurrentScope() scope: string,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(saveDocumentsSchema))
    input: ReturnType<typeof saveDocumentsSchema.parse>,
  ) {
    return { documents: await this.service.save(scope, id, input) };
  }

  /**
   * Render the posted (possibly unsaved) editor content to the same HTML the PDF
   * export is built from, so the editor's live preview and the PDF can never
   * drift (ADR-0052). Nothing is persisted; the `:id` is unused — the body is
   * the whole document. A plain 200 (not 201): no resource is created.
   */
  @Post('documents/preview')
  @HttpCode(200)
  preview(
    @Body(new ZodValidationPipe(saveDocumentsSchema))
    input: ReturnType<typeof saveDocumentsSchema.parse>,
  ) {
    return { html: this.service.renderPreviewHtml(input) };
  }

  @Get('documents/pdf')
  async pdf(@CurrentScope() scope: string, @Param('id') id: string, @Res() res: Response) {
    const buffer = await this.service.renderPdf(scope, id);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="documents-${id}.pdf"`);
    res.send(buffer);
  }

  @Get('dossier/pdf')
  async dossier(
    @CurrentScope() scope: string,
    @Param('id') id: string,
    @Query() q: Record<string, unknown>,
    @Res() res: Response,
  ) {
    const attachmentIds = (str(q.attachments) ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const buffer = await this.service.renderDossierPdf(
      scope,
      id,
      {
        company: str(q.company),
        contactName: str(q.contact),
        street: str(q.street),
        postalCodeCity: str(q.plzOrt),
        subject: str(q.subject),
      },
      attachmentIds,
    );
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="dossier-${id}.pdf"`);
    res.send(buffer);
  }

  @Post('dossier/pdf')
  @HttpCode(200)
  async previewDossier(
    @CurrentScope() scope: string,
    @Param('id') id: string,
    @Query() q: Record<string, unknown>,
    @Body(new ZodValidationPipe(saveDocumentsSchema))
    input: ReturnType<typeof saveDocumentsSchema.parse>,
    @Res() res: Response,
  ) {
    const attachmentIds = (str(q.attachments) ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const buffer = await this.service.renderDossierFromDocuments(
      scope,
      input as unknown as import('../../domain/talent-documents.js').TalentDocuments,
      {
        company: str(q.company),
        contactName: str(q.contact),
        street: str(q.street),
        postalCodeCity: str(q.plzOrt),
        subject: str(q.subject),
      },
      attachmentIds,
    );
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="dossier-${id}.pdf"`);
    res.send(buffer);
  }

  @Post('dossier/zip')
  @HttpCode(200)
  async previewDossierZip(
    @CurrentScope() scope: string,
    @Param('id') id: string,
    @Query() q: Record<string, unknown>,
    @Body(new ZodValidationPipe(saveDocumentsSchema))
    input: ReturnType<typeof saveDocumentsSchema.parse>,
    @Res() res: Response,
  ) {
    const attachmentIds = (str(q.attachments) ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const buffer = await this.service.renderDossierZip(
      scope,
      input as unknown as import('../../domain/talent-documents.js').TalentDocuments,
      {
        company: str(q.company),
        contactName: str(q.contact),
        street: str(q.street),
        postalCodeCity: str(q.plzOrt),
        subject: str(q.subject),
      },
      attachmentIds,
    );
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="Bewerbung-${id}.zip"`);
    res.send(buffer);
  }
}

@Module({
  controllers: [DocumentsController],
  providers: [
    {
      provide: DOCUMENT_SERVICE,
      useFactory: (
        documentRepository: DocumentRepository,
        talentRepository: TalentRepository,
        userRepository: UserRepository,
        attachmentStore: AttachmentStore,
        pdfRenderer: PdfRenderer,
        pdfMerger: PdfMerger,
        clock: Clock,
      ) =>
        new DocumentService({
          documentRepository,
          talentRepository,
          userRepository,
          attachmentStore,
          pdfRenderer,
          pdfMerger,
          clock,
        }),
      inject: [
        DOCUMENT_REPOSITORY,
        TALENT_REPOSITORY,
        USER_REPOSITORY,
        ATTACHMENT_STORE,
        PDF_RENDERER,
        PDF_MERGER,
        CLOCK,
      ],
    },
  ],
  exports: [DOCUMENT_SERVICE],
})
export class DocumentsModule {}
