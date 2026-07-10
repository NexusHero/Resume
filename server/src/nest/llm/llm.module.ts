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
  UseGuards,
} from '@nestjs/common';
import { z } from 'zod';
import { coverLetterRequestSchema } from '../../domain/cover-letter.js';
import { ValidationError } from '../../domain/errors.js';
import type { LlmProviderId } from '../../ports/llm-provider.js';
import type { ApiKeyStore } from '../../ports/api-key-store.js';
import type { UserRepository } from '../../ports/user-repository.js';
import type { LlmService } from '../../services/llm-service.js';
import type { CoverLetterService } from '../../services/cover-letter-service.js';
import { AuthGuard, OptionalAuthGuard } from '../auth.guard.js';
import { CurrentUserId, OptionalUserId } from '../params.js';
import { ZodValidationPipe } from '../zod-validation.pipe.js';
import { LLM_SERVICE, COVER_LETTER_SERVICE, API_KEY_STORE, USER_REPOSITORY } from '../tokens.js';

const setProviderSchema = z.object({ provider: z.string().min(1) });
const setKeySchema = z.object({ key: z.string().min(1, 'key is required') });
const PROVIDERS: LlmProviderId[] = ['claude', 'gemini'];

function parseProvider(raw: string): LlmProviderId {
  if (!PROVIDERS.includes(raw as LlmProviderId)) {
    throw new ValidationError(`Unknown LLM provider: ${raw}`, { allowed: PROVIDERS });
  }
  return raw as LlmProviderId;
}

/**
 * LLM provider settings, per-user API keys and cover-letter generation (ADR-0051
 * port of LlmController). `/settings/llm` and `/cover-letter` are soft-auth
 * (personalise with the caller's own key when signed in); the key routes require
 * a session. Keys are never returned — only their configured status.
 */
@Controller('api/v1')
export class LlmController {
  constructor(
    @Inject(LLM_SERVICE) private readonly llm: LlmService,
    @Inject(COVER_LETTER_SERVICE) private readonly coverLetter: CoverLetterService,
    @Inject(API_KEY_STORE) private readonly keys: ApiKeyStore,
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
  ) {}

  private async storedProvider(userId: string | undefined): Promise<LlmProviderId | null> {
    if (!userId) return null;
    const user = await this.users.findById(userId);
    return user?.llmProvider && this.llm.get(user.llmProvider) ? user.llmProvider : null;
  }

  @Get('settings/llm')
  @UseGuards(OptionalAuthGuard)
  async settings(@OptionalUserId() userId: string | undefined) {
    const base = this.llm.settings();
    const stored = await this.storedProvider(userId);
    return stored ? { ...base, current: stored } : base;
  }

  @Put('settings/llm')
  @UseGuards(AuthGuard)
  async setProvider(
    @CurrentUserId() userId: string,
    @Body(new ZodValidationPipe(setProviderSchema)) body: { provider: string },
  ) {
    const provider = parseProvider(body.provider);
    await this.users.setLlmProvider(userId, provider);
    return { ...this.llm.settings(), current: provider };
  }

  @Get('settings/keys')
  @UseGuards(AuthGuard)
  async keysStatus(@CurrentUserId() userId: string) {
    const configured = await this.keys.providersFor(userId);
    return Object.fromEntries(PROVIDERS.map((p) => [p, configured.includes(p)]));
  }

  @Put('settings/keys/:provider')
  @UseGuards(AuthGuard)
  @HttpCode(204)
  async setKey(
    @CurrentUserId() userId: string,
    @Param('provider') providerRaw: string,
    @Body(new ZodValidationPipe(setKeySchema)) body: { key: string },
  ): Promise<void> {
    await this.keys.set(userId, parseProvider(providerRaw), body.key.trim());
  }

  @Delete('settings/keys/:provider')
  @UseGuards(AuthGuard)
  @HttpCode(204)
  async removeKey(
    @CurrentUserId() userId: string,
    @Param('provider') providerRaw: string,
  ): Promise<void> {
    await this.keys.remove(userId, parseProvider(providerRaw));
  }

  @Post('cover-letter')
  @UseGuards(OptionalAuthGuard)
  async generateCoverLetter(
    @OptionalUserId() userId: string | undefined,
    @Body(new ZodValidationPipe(coverLetterRequestSchema))
    input: ReturnType<typeof coverLetterRequestSchema.parse>,
  ) {
    let override: { provider: LlmProviderId; apiKey: string } | undefined;
    if (userId) {
      const provider = (await this.storedProvider(userId)) ?? this.llm.currentProvider();
      const apiKey = await this.keys.get(userId, provider);
      if (apiKey) override = { provider, apiKey };
    }
    return this.coverLetter.generate(input, override, userId ?? undefined);
  }
}

@Module({ controllers: [LlmController] })
export class LlmModule {}
