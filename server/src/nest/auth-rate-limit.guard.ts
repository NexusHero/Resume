import { Inject, Injectable, type CanActivate, type ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import { RateLimitError } from '../domain/errors.js';
import type { RateLimiter } from '../ports/rate-limiter.js';
import { RATE_LIMITER } from './tokens.js';

/**
 * Throttle for the credential endpoints (register/login/accept-invite/password
 * reset/verify-email confirm) against brute-force and account-creation abuse —
 * the Nest replacement for the Express `authLimiter`. Fixed 15-minute window of
 * 10 attempts per client IP; the problem+json body carries the real reason so
 * the login form can show "too many attempts" instead of a generic failure.
 *
 * The count itself lives behind the injected {@link RateLimiter} port, so it is
 * shared across every instance of a horizontally-scaled deployment
 * (`STORE=sql`) instead of being a per-process count that gets N times more
 * permissive as the deployment scales out.
 */
const WINDOW_MS = 15 * 60 * 1000;
const LIMIT = 10;

@Injectable()
export class AuthRateLimitGuard implements CanActivate {
  constructor(@Inject(RATE_LIMITER) private readonly limiter: RateLimiter) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest<Request>();
    const key = req.ip ?? 'anon';
    const { count } = await this.limiter.hit(key, WINDOW_MS);
    if (count > LIMIT) {
      throw new RateLimitError('Too many attempts. Please wait a few minutes and try again.');
    }
    return true;
  }
}
