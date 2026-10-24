import {
  Inject,
  Injectable,
  Optional,
  SetMetadata,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AiNotConfiguredError } from '../domain/errors.js';
import { agentFakeEnabled } from '../domain/chat-agent.js';
import type { LlmService } from '../services/llm-service.js';
import { AI_CONFIGURED_ALLOWS_DEV_FAKE, LLM_SERVICE } from './tokens.js';

export const REQUIRES_AI = 'requires:ai';

/**
 * Marks a generative route (spends LLM tokens). Text-mode CV import routes
 * carry no marker: they work without a key. Plan §3.5/§5.4.
 */
export const RequiresAi = () => SetMetadata(REQUIRES_AI, true);

/**
 * Gates a generative route on the server's central key (ADR-0057): without one
 * it answers 503 `ai-not-configured` before the handler, so no template text is
 * produced. Runs after `AuthGuard` and, on intermediary routes, after
 * `VermittlungGuard` — but before the rate-limit and plan gates.
 *
 * The dev-only fake agent (`AGENT_FAKE=1`, non-production) is an exception that
 * only the agent route opts into: when the `AI_CONFIGURED_ALLOWS_DEV_FAKE` token
 * is `true`, the guard also admits `agentFakeEnabled(process.env)` without a key.
 * Every other AI route leaves that token unset (default `false`) and stays 503
 * without a key, even with `AGENT_FAKE=1`.
 */
@Injectable()
export class AiConfiguredGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @Inject(LLM_SERVICE) private readonly llm: LlmService,
    @Optional()
    @Inject(AI_CONFIGURED_ALLOWS_DEV_FAKE)
    private readonly allowDevFake: boolean = false,
  ) {}

  canActivate(ctx: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<boolean | undefined>(REQUIRES_AI, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (!required) return true;
    if (this.allowDevFake && agentFakeEnabled(process.env)) return true;
    if (!this.llm.hasAvailableProvider()) throw new AiNotConfiguredError();
    return true;
  }
}
