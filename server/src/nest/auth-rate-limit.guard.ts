import { Injectable, type CanActivate, type ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import { RateLimitError } from '../domain/errors.js';

/**
 * Throttle for the credential endpoints (register/login/accept-invite/password
 * reset/verify-email confirm) against brute-force and account-creation abuse —
 * the Nest replacement for the Express `authLimiter`. Fixed 15-minute window of
 * 10 attempts per client IP; the problem+json body carries the real reason so
 * the login form can show "too many attempts" instead of a generic failure.
 */
const WINDOW_MS = 15 * 60 * 1000;
const LIMIT = 10;

@Injectable()
export class AuthRateLimitGuard implements CanActivate {
  private readonly windows = new Map<string, { count: number; resetAt: number }>();

  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest<Request>();
    const key = req.ip ?? 'anon';
    const now = Date.now();
    const window = this.windows.get(key);
    if (!window || window.resetAt <= now) {
      this.windows.set(key, { count: 1, resetAt: now + WINDOW_MS });
      return true;
    }
    window.count += 1;
    if (window.count > LIMIT) {
      throw new RateLimitError('Too many attempts. Please wait a few minutes and try again.');
    }
    return true;
  }
}
