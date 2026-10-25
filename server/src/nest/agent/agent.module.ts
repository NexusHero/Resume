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
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { createChatSessionSchema, type CreateChatSessionInput } from '../../domain/chat-agent.js';
import { NotFoundError } from '../../domain/errors.js';
import type { ChatSessionRepository } from '../../ports/chat-session-repository.js';
import type { AgentLlmProvider } from '../../ports/agent-llm-provider.js';
import type { UsageMeter } from '../../ports/usage-meter.js';
import type { Clock } from '../../ports/clock.js';
import type { IdGenerator } from '../../ports/id-generator.js';
import type { Logger } from '../../ports/logger.js';
import type { HttpFetch } from '../../ports/http-fetch.js';
import type { AppConfig } from '../../config.js';
import { agentFakeEnabled } from '../../domain/chat-agent.js';
import { FakeAgentLlmProvider } from '../../adapters/agent-fake-provider.js';
import { AnthropicLlmProvider } from '../../adapters/anthropic-llm-provider.js';
import { GeminiLlmProvider } from '../../adapters/gemini-llm-provider.js';
import { resilientFetch } from '../../adapters/resilient-fetch.js';
import { ChatAgentService, type ChatAgentEvent } from '../../services/chat-agent-service.js';
import { AgentToolService } from '../../services/agent-tool-service.js';
import type { JobSearchService } from '../../services/job-search-service.js';
import type { JobPostingService } from '../../services/job-posting-service.js';
import type { JobPostingExtractService } from '../../services/job-posting-extract-service.js';
import type { TalentService } from '../../services/talent-service.js';
import type { MatchService } from '../../services/match-service.js';
import type { JobApplicationService } from '../../services/job-application-service.js';
import type { ApplicationLetterService } from '../../services/application-letter-service.js';
import type { MagicPenService } from '../../services/magic-pen-service.js';
import type { TalentRepository } from '../../ports/talent-repository.js';
import type { DocumentRepository } from '../../ports/document-repository.js';
import { AuthGuard } from '../auth.guard.js';
import { AiConfiguredGuard, RequiresAi } from '../ai-configured.guard.js';
import { AiConsentGuard, RequiresAiConsent } from '../ai-consent.guard.js';
import { AiRateLimitGuard } from '../ai-rate-limit.guard.js';
import { CurrentScope, CurrentUserId } from '../params.js';
import { ZodValidationPipe } from '../zod-validation.pipe.js';
import {
  AGENT_LLM_PROVIDER,
  AGENT_TOOL_SERVICE,
  CHAT_AGENT_SERVICE,
  CHAT_SESSION_REPOSITORY,
  AI_CONFIGURED_ALLOWS_DEV_FAKE,
  USAGE_METER,
  CLOCK,
  ID_GENERATOR,
  LOGGER,
  CONFIG,
  HTTP_FETCH,
  JOB_SEARCH_SERVICE,
  JOB_POSTING_SERVICE,
  JOB_POSTING_EXTRACT_SERVICE,
  TALENT_SERVICE,
  MATCH_SERVICE,
  JOB_APPLICATION_SERVICE,
  APPLICATION_LETTER_SERVICE,
  MAGIC_PEN_SERVICE,
  TALENT_REPOSITORY,
  DOCUMENT_REPOSITORY,
} from '../tokens.js';
import { JobPostingsModule } from '../job-postings/job-postings.module.js';
import { JobApplicationsModule } from '../job-applications/job-applications.module.js';
import { JobsModule } from '../jobs/jobs.module.js';
import { TalentsModule } from '../talents/talents.module.js';
import { MatchModule } from '../match/match.module.js';

/** Serialise one SSE event to its wire form. */
function sse(event: ChatAgentEvent): string {
  if ('data' in event) {
    return `event: ${event.name}\ndata: ${JSON.stringify(event.data)}\n\n`;
  }
  return `event: ${event.name}\n\n`;
}

/**
 * The Chat-Agent surface under `/api/v1/agent` (ADR-0062, Plan §6). Main-path
 * companion, so it carries **no** `VermittlungGuard`/`PlanGuard`. A01 is the only
 * generative route (`@RequiresAi()` + `AiRateLimitGuard`); A02–A05 are
 * deterministic and read/write the per-user `ChatSession` store.
 */
@Controller('api/v1/agent')
@UseGuards(AuthGuard, AiConfiguredGuard, AiConsentGuard)
export class AgentController {
  constructor(
    @Inject(CHAT_AGENT_SERVICE) private readonly service: ChatAgentService,
    @Inject(CHAT_SESSION_REPOSITORY) private readonly sessions: ChatSessionRepository,
  ) {}

  @Post('chat')
  @HttpCode(200)
  @RequiresAi()
  @RequiresAiConsent()
  @UseGuards(AiRateLimitGuard)
  async chat(
    @CurrentScope() scope: string,
    @CurrentUserId() userId: string,
    @Body(new ZodValidationPipe(createChatSessionSchema)) input: CreateChatSessionInput,
    @Res() res: Response,
  ): Promise<void> {
    // Resolve/append before flushing, so a foreign/unknown session id stays a
    // 404 problem+json (never an SSE error after the first byte).
    const session = await this.service.prepare(scope, userId, input);
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();
    res.write(`event: session\ndata: ${JSON.stringify({ sessionId: session.id })}\n\n`);

    const onClose = (): void => {
      this.service.abort(scope, userId, session.id);
    };
    res.on('close', onClose);
    try {
      await this.service.run(scope, userId, session, (ev) => {
        res.write(sse(ev));
      });
    } catch (err) {
      res.write(
        `event: error\ndata: ${JSON.stringify({
          type: 'internal-error',
          detail: err instanceof Error ? err.message : String(err),
        })}\n\n`,
      );
    } finally {
      res.removeListener('close', onClose);
      res.end();
    }
  }

  @Get('chat')
  list(@CurrentScope() scope: string, @CurrentUserId() userId: string) {
    return this.service.list(scope, userId);
  }

  @Get('chat/:id')
  async get(
    @CurrentScope() scope: string,
    @CurrentUserId() userId: string,
    @Param('id') id: string,
  ) {
    return { session: await this.service.get(scope, userId, id) };
  }

  @Delete('chat/:id')
  @HttpCode(204)
  async remove(
    @CurrentScope() scope: string,
    @CurrentUserId() userId: string,
    @Param('id') id: string,
  ): Promise<void> {
    await this.service.delete(scope, userId, id);
  }

  @Post('chat/:id/abort')
  @HttpCode(200)
  async abort(
    @CurrentScope() scope: string,
    @CurrentUserId() userId: string,
    @Param('id') id: string,
  ) {
    // 404 for a foreign/unknown session; otherwise abort is idempotent.
    const existing = await this.sessions.findById(scope, userId, id);
    if (!existing) throw new NotFoundError(`Chat session ${id} not found`);
    this.service.abort(scope, userId, id);
    return { status: 'aborted' };
  }
}

/** Agent feature slice (ADR-0062): the tool-use loop over the Phase 1–4 services. */
@Module({
  imports: [JobPostingsModule, JobApplicationsModule, JobsModule, TalentsModule, MatchModule],
  controllers: [AgentController],
  providers: [
    // The agent route opts into the dev-only `AGENT_FAKE` gate (Minor): with
    // AGENT_FAKE=1 (non-production) A01 works without a central key. Every other
    // AI route leaves this token unset and stays 503 without a key.
    { provide: AI_CONFIGURED_ALLOWS_DEV_FAKE, useValue: true },
    {
      provide: AGENT_LLM_PROVIDER,
      useFactory: (config: AppConfig, logger: Logger, httpFetch: HttpFetch): AgentLlmProvider => {
        if (agentFakeEnabled(process.env)) return new FakeAgentLlmProvider();
        const bounded = resilientFetch(httpFetch, {
          timeoutMs: config.llm.timeoutMs,
          retries: 0,
          logger,
        });
        return config.llm.provider === 'gemini'
          ? new GeminiLlmProvider({ httpFetch: bounded, config: config.llm.gemini })
          : new AnthropicLlmProvider({ httpFetch: bounded, config: config.llm.anthropic });
      },
      inject: [CONFIG, LOGGER, HTTP_FETCH],
    },
    {
      provide: AGENT_TOOL_SERVICE,
      useFactory: (
        jobSearchService: JobSearchService,
        jobPostingService: JobPostingService,
        jobPostingExtractService: JobPostingExtractService,
        talentService: TalentService,
        matchService: MatchService,
        talentRepository: TalentRepository,
        documentRepository: DocumentRepository,
        jobApplicationService: JobApplicationService,
        applicationLetterService: ApplicationLetterService,
        magicPenService: MagicPenService,
      ) =>
        new AgentToolService({
          jobSearchService,
          jobPostingService,
          jobPostingExtractService,
          talentService,
          matchService,
          talentRepository,
          documentRepository,
          jobApplicationService,
          applicationLetterService,
          magicPenService,
        }),
      inject: [
        JOB_SEARCH_SERVICE,
        JOB_POSTING_SERVICE,
        JOB_POSTING_EXTRACT_SERVICE,
        TALENT_SERVICE,
        MATCH_SERVICE,
        TALENT_REPOSITORY,
        DOCUMENT_REPOSITORY,
        JOB_APPLICATION_SERVICE,
        APPLICATION_LETTER_SERVICE,
        MAGIC_PEN_SERVICE,
      ],
    },
    {
      provide: CHAT_AGENT_SERVICE,
      useFactory: (
        agentLlmProvider: AgentLlmProvider,
        chatSessionRepository: ChatSessionRepository,
        agentToolService: AgentToolService,
        usageMeter: UsageMeter,
        clock: Clock,
        idGenerator: IdGenerator,
        logger: Logger,
        config: AppConfig,
      ) =>
        new ChatAgentService({
          agentLlmProvider,
          chatSessionRepository,
          agentToolService,
          usageMeter,
          clock,
          idGenerator,
          logger,
          budgets: {
            maxSteps: config.agent.maxSteps,
            maxApplications: config.agent.maxApplications,
            maxTokens: config.agent.maxTokens,
            maxTimeMs: config.agent.maxTimeMs,
          },
        }),
      inject: [
        AGENT_LLM_PROVIDER,
        CHAT_SESSION_REPOSITORY,
        AGENT_TOOL_SERVICE,
        USAGE_METER,
        CLOCK,
        ID_GENERATOR,
        LOGGER,
        CONFIG,
      ],
    },
  ],
  exports: [CHAT_AGENT_SERVICE],
})
export class AgentModule {}
