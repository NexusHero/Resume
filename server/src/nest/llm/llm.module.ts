import {
  Body,
  Controller,
  Get,
  HttpCode,
  Inject,
  Module,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { z } from 'zod';
import { coverLetterRequestSchema } from '../../domain/cover-letter.js';
import { ValidationError } from '../../domain/errors.js';
import type { LlmProviderId } from '../../ports/llm-provider.js';
import type { UserRepository } from '../../ports/user-repository.js';
import { AiConfiguredGuard, RequiresAi } from '../ai-configured.guard.js';
import { AiConsentGuard, RequiresAiConsent } from '../ai-consent.guard.js';
import { AuthGuard, OptionalAuthGuard } from '../auth.guard.js';
import { AiRateLimitGuard } from '../ai-rate-limit.guard.js';
import { PlanGuard, RequiresPlan } from '../plan.guard.js';
import { OptionalUserId } from '../params.js';
import { ZodValidationPipe } from '../zod-validation.pipe.js';
import { COVER_LETTER_SERVICE, LLM_SERVICE, USER_REPOSITORY } from '../tokens.js';
import type { LlmService } from '../../services/llm-service.js';
import type { CoverLetterService } from '../../services/cover-letter-service.js';

const llmProviderSchema = z.enum(['claude', 'gemini']);
const updateLlmSettingsSchema = z.object({ provider: llmProviderSchema });

/**
 * LLM server status, the persisted provider choice and cover-letter generation
 * (ADR-0051, reworked by ADR-0057). One central key per provider; no per-user
 * keys. `GET /settings/llm` reports `configured` and the *effective* provider
 * for the caller; `PUT` may only pick a provider that has a server key.
 * `POST /cover-letter` requires a login (breaking change).
 */
@Controller('api/v1')
export class LlmController {
  constructor(
    @Inject(LLM_SERVICE) private readonly llm: LlmService,
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(COVER_LETTER_SERVICE) private readonly coverLetter: CoverLetterService,
  ) {}

  @Get('settings/llm')
  @UseGuards(OptionalAuthGuard)
  async settings(@OptionalUserId() userId: string | undefined) {
    const stored = userId ? (await this.users.findById(userId))?.llmProvider : undefined;
    return this.llm.settings(stored);
  }

  @Put('settings/llm')
  @UseGuards(AuthGuard)
  async updateSettings(
    @OptionalUserId() userId: string,
    @Body(new ZodValidationPipe(updateLlmSettingsSchema))
    body: { provider: LlmProviderId },
  ) {
    if (!this.llm.get(body.provider)?.available) {
      throw new ValidationError('Provider is not configured on this server.');
    }
    await this.users.setLlmProvider(userId, body.provider);
    return this.llm.settings(body.provider);
  }

  @Post('cover-letter')
  @HttpCode(200)
  @UseGuards(AuthGuard, AiConfiguredGuard, AiConsentGuard, AiRateLimitGuard, PlanGuard)
  @RequiresAi()
  @RequiresAiConsent()
  @RequiresPlan('pro')
  async generateCoverLetter(
    @OptionalUserId() userId: string,
    @Body(new ZodValidationPipe(coverLetterRequestSchema))
    input: ReturnType<typeof coverLetterRequestSchema.parse>,
  ) {
    return this.coverLetter.generate(input, userId);
  }
}

@Module({ controllers: [LlmController] })
export class LlmModule {}
