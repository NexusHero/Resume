import { Inject, Injectable, type CanActivate, type ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import { RateLimitError } from '../domain/errors.js';
import type { AppConfig } from '../config.js';
import type { RateLimiter } from '../ports/rate-limiter.js';
import { optionalUserId } from '../http/current-user.js';
import { CONFIG, RATE_LIMITER } from './tokens.js';

const WINDOW_MS = 60_000;

/**
 * Per-user throttle on the generative AI routes (the only ones that spend the
 * owner's LLM budget) — the Nest replacement for the Express `aiLimiter`
 * middleware. Fixed one-minute window keyed by the acting user (falling back to
 * the client IP) so one recruiter can't exhaust the shared quota.
 * `security.aiRateLimitPerMinute = 0` disables it; non-AI routes never see it.
 *
 * The count itself lives behind the injected {@link RateLimiter} port, so it is
 * shared across every instance of a horizontally-scaled deployment
 * (`STORE=sql`) instead of being a per-process count that gets N times more
 * permissive as the deployment scales out.
 */
@Injectable()
export class AiRateLimitGuard implements CanActivate {
  constructor(
    @Inject(CONFIG) private readonly config: AppConfig,
    @Inject(RATE_LIMITER) private readonly limiter: RateLimiter,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const limit = this.config.security.aiRateLimitPerMinute;
    if (!(limit > 0)) return true;
    const req = ctx.switchToHttp().getRequest<Request>();
    const key = optionalUserId(req) ?? req.ip ?? 'anon';
    const { count } = await this.limiter.hit(key, WINDOW_MS);
    if (count > limit) throw new RateLimitError();
    return true;
  }
}
