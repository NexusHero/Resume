import { Inject, Injectable, type CanActivate, type ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import { RateLimitError } from '../domain/errors.js';
import type { AppConfig } from '../config.js';
import { optionalUserId } from '../http/current-user.js';
import { CONFIG } from './tokens.js';

/**
 * Per-user throttle on the generative AI routes (the only ones that spend the
 * owner's LLM budget) — the Nest replacement for the Express `aiLimiter`
 * middleware. Fixed one-minute window keyed by the acting user (falling back to
 * the client IP) so one recruiter can't exhaust the shared quota.
 * `security.aiRateLimitPerMinute = 0` disables it; non-AI routes never see it.
 */
@Injectable()
export class AiRateLimitGuard implements CanActivate {
  private readonly windows = new Map<string, { count: number; resetAt: number }>();

  constructor(@Inject(CONFIG) private readonly config: AppConfig) {}

  canActivate(ctx: ExecutionContext): boolean {
    const limit = this.config.security.aiRateLimitPerMinute;
    if (limit <= 0) return true;
    const req = ctx.switchToHttp().getRequest<Request>();
    const key = optionalUserId(req) ?? req.ip ?? 'anon';
    const now = Date.now();
    const window = this.windows.get(key);
    if (!window || window.resetAt <= now) {
      this.windows.set(key, { count: 1, resetAt: now + 60_000 });
      return true;
    }
    window.count += 1;
    if (window.count > limit) throw new RateLimitError();
    return true;
  }
}
