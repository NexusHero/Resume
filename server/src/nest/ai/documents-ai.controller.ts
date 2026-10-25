import { Body, Controller, HttpCode, Inject, Param, Post, UseGuards } from '@nestjs/common';
import { aiSuggestSchema } from '../../domain/document-ai.js';
import { parseRequestSchema, parsePdfRequestSchema } from '../../domain/document-parse.js';
import { atsRequestSchema } from '../../domain/ats-ai.js';
import { pitchRequestSchema } from '../../domain/candidate-pitch.js';
import { outreachRequestSchema } from '../../domain/outreach.js';
import { translateRequestSchema } from '../../domain/document-translate.js';
import type { DocumentAiService } from '../../services/document-ai-service.js';
import { AuthGuard } from '../auth.guard.js';
import { AiRateLimitGuard } from '../ai-rate-limit.guard.js';
import { AiConfiguredGuard, RequiresAi } from '../ai-configured.guard.js';
import { AiConsentGuard, RequiresAiConsent } from '../ai-consent.guard.js';
import { RequiresVermittlung, VermittlungGuard } from '../vermittlung.guard.js';
import { PlanGuard, RequiresPlan } from '../plan.guard.js';
import { CurrentScope, CurrentUserId } from '../params.js';
import { ZodValidationPipe } from '../zod-validation.pipe.js';
import { DOCUMENT_AI_SERVICE } from '../tokens.js';

/**
 * Generative document AI under /api/v1/talents/:id/documents (ADR-0051 port of
 * the DocumentController's DocumentAiService half). Every route spends LLM
 * tokens, so the whole controller is Pro-gated and AI rate-limited; each route
 * additionally requires the server's central key (ADR-0057) and the Vermittlung
 * switch where the feature is agency-only. Documents belong to the team scope.
 */
@Controller('api/v1/talents/:id/documents')
@UseGuards(
  AuthGuard,
  VermittlungGuard,
  AiConfiguredGuard,
  AiConsentGuard,
  AiRateLimitGuard,
  PlanGuard,
)
@RequiresPlan('pro')
export class DocumentsAiController {
  constructor(@Inject(DOCUMENT_AI_SERVICE) private readonly ai: DocumentAiService) {}

  @Post('ai')
  @HttpCode(200)
  @RequiresAi()
  @RequiresAiConsent()
  async aiSuggest(
    @CurrentScope() scope: string,
    @CurrentUserId() userId: string,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(aiSuggestSchema))
    body: ReturnType<typeof aiSuggestSchema.parse>,
  ) {
    const { action, role, company, jobText } = body;
    return {
      suggestion: await this.ai.suggest(scope, userId, id, action, { role, company, jobText }),
    };
  }

  @Post('parse')
  @HttpCode(200)
  async parse(
    @CurrentScope() scope: string,
    @CurrentUserId() userId: string,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(parseRequestSchema)) body: { text: string },
  ) {
    return { parsed: await this.ai.parse(scope, userId, id, body.text) };
  }

  @Post('parse-pdf')
  @HttpCode(200)
  async parsePdf(
    @CurrentScope() scope: string,
    @CurrentUserId() userId: string,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(parsePdfRequestSchema)) body: { dataBase64: string },
  ) {
    const pdf = Buffer.from(body.dataBase64, 'base64');
    return { parsed: await this.ai.parsePdf(scope, userId, id, pdf) };
  }

  @Post('ats')
  @HttpCode(200)
  @RequiresAi()
  @RequiresAiConsent()
  async ats(
    @CurrentScope() scope: string,
    @CurrentUserId() userId: string,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(atsRequestSchema)) body: { jobText: string },
  ) {
    return { ats: await this.ai.scoreAgainstJob(scope, userId, id, body.jobText) };
  }

  @Post('pitch')
  @HttpCode(200)
  @RequiresVermittlung()
  @RequiresAi()
  @RequiresAiConsent()
  async pitch(
    @CurrentScope() scope: string,
    @CurrentUserId() userId: string,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(pitchRequestSchema))
    body: ReturnType<typeof pitchRequestSchema.parse>,
  ) {
    return { pitch: await this.ai.pitchForMandate(scope, userId, id, body.mandateContext) };
  }

  @Post('outreach')
  @HttpCode(200)
  @RequiresVermittlung()
  @RequiresAi()
  @RequiresAiConsent()
  async outreach(
    @CurrentScope() scope: string,
    @CurrentUserId() userId: string,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(outreachRequestSchema))
    opts: ReturnType<typeof outreachRequestSchema.parse>,
  ) {
    return { message: await this.ai.outreach(scope, userId, id, opts) };
  }

  @Post('translate')
  @HttpCode(200)
  @RequiresAi()
  @RequiresAiConsent()
  async translate(
    @CurrentScope() scope: string,
    @CurrentUserId() userId: string,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(translateRequestSchema))
    body: ReturnType<typeof translateRequestSchema.parse>,
  ) {
    return this.ai.translateDocuments(scope, userId, id, body.targetLang);
  }
}
