import {
  Inject,
  Injectable,
  SetMetadata,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AiNotConfiguredError } from '../domain/errors.js';
import type { LlmService } from '../services/llm-service.js';
import { LLM_SERVICE } from './tokens.js';

export const REQUIRES_AI = 'requires:ai';

/**
 * Marks a route as generative (spends LLM tokens). The `AiConfiguredGuard` is a
 * no-op without this metadata (plan §3.5/§5.4). The text-mode CV import routes
 * deliberately carry no marker: they work without a key.
 */
export const RequiresAi = () => SetMetadata(REQUIRES_AI, true);

/**
 * Gates a generative AI route on the server's central key (ADR-0057). When no
 * provider key is configured it answers `503 ai-not-configured` before the
 * handler runs, so no template text can ever be produced. It must run after
 * `AuthGuard` and (on intermediary routes) after `VermittlungGuard`, but before
 * the rate limit and plan gates.
 */
@Injectable()
export class AiConfiguredGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @Inject(LLM_SERVICE) private readonly llm: LlmService,
  ) {}

  canActivate(ctx: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<boolean | undefined>(REQUIRES_AI, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (!required) return true;
    if (!this.llm.hasAvailableProvider()) throw new AiNotConfiguredError();
    return true;
  }
}
