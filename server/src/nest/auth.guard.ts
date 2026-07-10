import { Injectable, Inject, type CanActivate, type ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import type { AuthService } from '../services/auth-service.js';
import type { AppConfig } from '../config.js';
import { UnauthorizedError } from '../domain/errors.js';
import { DEFAULT_TENANT } from '../domain/user.js';
import { AUTH_SERVICE, CONFIG } from './tokens.js';

/** Read a single cookie value from the request's Cookie header. */
function readCookie(req: Request, name: string): string | undefined {
  const header = req.headers.cookie;
  if (!header) return undefined;
  for (const part of header.split(';')) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    if (part.slice(0, idx).trim() === name) return decodeURIComponent(part.slice(idx + 1).trim());
  }
  return undefined;
}

type AuthedRequest = Request & {
  userId?: string;
  roles?: string[];
  tenantId?: string;
  isSuperAdmin?: boolean;
};

/**
 * Authenticates a route (ADR-0051), replacing the Express `requireAuth`
 * middleware. Resolves the session cookie to a user via `AuthService`, stamps
 * the request (`userId`, `roles`, `tenantId`, `isSuperAdmin`) exactly as before
 * so the `@CurrentUserId`/`@CurrentScope` decorators read the same fields, and
 * throws `UnauthorizedError` (→ 401 problem+json) when no valid session exists.
 */
@Injectable()
export class AuthGuard implements CanActivate {
  private readonly superAdminEmails: readonly string[];
  private readonly cookieName: string;

  constructor(
    @Inject(AUTH_SERVICE) private readonly auth: AuthService,
    @Inject(CONFIG) config: AppConfig,
  ) {
    this.superAdminEmails = config.superAdminEmails;
    this.cookieName = config.auth.sessionCookieName;
  }

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest<AuthedRequest>();
    const user = await this.auth.currentUser(readCookie(req, this.cookieName));
    if (!user) throw new UnauthorizedError();
    req.userId = user.id;
    req.roles = user.roles;
    req.tenantId = user.tenantId ?? DEFAULT_TENANT;
    req.isSuperAdmin = this.superAdminEmails.includes(user.email);
    return true;
  }
}

/**
 * Soft authentication (ADR-0051), replacing `attachUser`: stamps the user when a
 * valid session is present but never rejects — for otherwise-open routes that
 * personalise with the signed-in user's own API key when available.
 */
@Injectable()
export class OptionalAuthGuard implements CanActivate {
  private readonly cookieName: string;

  constructor(
    @Inject(AUTH_SERVICE) private readonly auth: AuthService,
    @Inject(CONFIG) config: AppConfig,
  ) {
    this.cookieName = config.auth.sessionCookieName;
  }

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest<AuthedRequest>();
    const user = await this.auth.currentUser(readCookie(req, this.cookieName));
    if (user) {
      req.userId = user.id;
      req.tenantId = user.tenantId ?? DEFAULT_TENANT;
    }
    return true;
  }
}
