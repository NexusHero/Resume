import { Body, Controller, Get, HttpCode, Inject, Module, Post, UseGuards } from '@nestjs/common';
import { coverLetterRequestSchema } from '../../domain/cover-letter.js';
import { AiConfiguredGuard } from '../ai-configured.guard.js';
import { OptionalAuthGuard } from '../auth.guard.js';
import { AiRateLimitGuard } from '../ai-rate-limit.guard.js';
import { PlanGuard, RequiresPlan } from '../plan.guard.js';
import { OptionalUserId } from '../params.js';
import { ZodValidationPipe } from '../zod-validation.pipe.js';
import { COVER_LETTER_SERVICE, LLM_SERVICE } from '../tokens.js';
import type { LlmService } from '../../services/llm-service.js';
import type { CoverLetterService } from '../../services/cover-letter-service.js';

/**
 * LLM server status + cover-letter generation (ADR-0051, reworked by ADR-0057).
 * There is one central key per server; the per-user key routes and the per-user
 * provider choice were removed. `GET /settings/llm` reports the server's
 * configured providers (for the "KI eingerichtet" surface); generation without
 * a key answers 503 `ai-not-configured`.
 */
@Controller('api/v1')
export class LlmController {
  constructor(
    @Inject(LLM_SERVICE) private readonly llm: LlmService,
    @Inject(COVER_LETTER_SERVICE) private readonly coverLetter: CoverLetterService,
  ) {}

  @Get('settings/llm')
  settings() {
    return this.llm.settings();
  }

  @Post('cover-letter')
  @HttpCode(200)
  @UseGuards(OptionalAuthGuard, AiRateLimitGuard, PlanGuard, AiConfiguredGuard)
  @RequiresPlan('pro')
  async generateCoverLetter(
    @OptionalUserId() userId: string | undefined,
    @Body(new ZodValidationPipe(coverLetterRequestSchema))
    input: ReturnType<typeof coverLetterRequestSchema.parse>,
  ) {
    return this.coverLetter.generate(input, userId ?? undefined);
  }
}

@Module({ controllers: [LlmController] })
export class LlmModule {}
