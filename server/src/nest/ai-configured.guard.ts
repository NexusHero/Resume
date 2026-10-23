import { Inject, Injectable, type CanActivate } from '@nestjs/common';
import { AiNotConfiguredError } from '../domain/errors.js';
import type { LlmService } from '../services/llm-service.js';
import { LLM_SERVICE } from './tokens.js';

/**
 * Gates a generative AI route on the server's central key (ADR-0057). When no
 * provider key is configured it answers `503 ai-not-configured` before the
 * handler runs, so no template text can ever be produced. Must run after
 * `AuthGuard` (and, on intermediary routes, after `VermittlungGuard`).
 */
@Injectable()
export class AiConfiguredGuard implements CanActivate {
  constructor(@Inject(LLM_SERVICE) private readonly llm: LlmService) {}

  canActivate(): boolean {
    if (!this.llm.isConfigured()) throw new AiNotConfiguredError();
    return true;
  }
}
