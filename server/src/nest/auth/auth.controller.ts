import { Body, Controller, Get, HttpCode, Inject, Post, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import { registerSchema, loginSchema, DEFAULT_TENANT } from '../../domain/user.js';
import { confirmVerificationSchema } from '../../domain/email-verification.js';
import { UnauthorizedError } from '../../domain/errors.js';
import type { AuthService } from '../../services/auth-service.js';
import type { EmailVerificationService } from '../../services/email-verification-service.js';
import type { PlanProvider } from '../../ports/plan-provider.js';
import type { AppConfig } from '../../config.js';
import { AUTH_SERVICE, EMAIL_VERIFICATION_SERVICE, PLAN_PROVIDER, CONFIG } from '../tokens.js';

/** Reads a single cookie value from the raw Cookie header (no cookie-parser dep). */
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

/**
 * Auth endpoints under /api/v1/auth (ADR-0051 port of the Express AuthController):
 * register, login, logout, me, providers and email verification. Session cookies
 * are set/cleared on the passthrough Express response so behaviour is identical.
 * (Rate limiting for these routes is reinstated with the Throttler in a later
 * increment.)
 */
@Controller('api/v1/auth')
export class AuthController {
  private readonly cookieName: string;
  private readonly cookieSecure: boolean;
  private readonly maxAgeMs: number;
  private readonly providers: { google: boolean; linkedin: boolean };
  private readonly superAdminEmails: readonly string[];

  constructor(
    @Inject(AUTH_SERVICE) private readonly service: AuthService,
    @Inject(EMAIL_VERIFICATION_SERVICE) private readonly verification: EmailVerificationService,
    @Inject(PLAN_PROVIDER) private readonly plans: PlanProvider,
    @Inject(CONFIG) config: AppConfig,
  ) {
    this.cookieName = config.auth.sessionCookieName;
    this.cookieSecure = config.auth.cookieSecure;
    this.maxAgeMs = config.auth.sessionTtlMs;
    this.providers = {
      google: config.auth.google.enabled,
      linkedin: config.auth.linkedin.enabled,
    };
    this.superAdminEmails = config.superAdminEmails;
  }

  private isSuperAdmin(email: string): boolean {
    return this.superAdminEmails.includes(email.toLowerCase());
  }

  private setSession(res: Response, token: string): void {
    res.cookie(this.cookieName, token, {
      httpOnly: true,
      secure: this.cookieSecure,
      sameSite: 'lax',
      path: '/',
      maxAge: this.maxAgeMs,
    });
  }

  @Post('register')
  @HttpCode(201)
  async register(@Body() body: unknown, @Res({ passthrough: true }) res: Response) {
    const input = registerSchema.parse(body);
    const { user, token } = await this.service.register(input);
    this.setSession(res, token);
    // Best-effort: registration never fails on mail problems (offline-first).
    void this.verification.send(user);
    return { user };
  }

  @Post('login')
  @HttpCode(200)
  async login(@Body() body: unknown, @Res({ passthrough: true }) res: Response) {
    const input = loginSchema.parse(body);
    const { user, token } = await this.service.login(input);
    this.setSession(res, token);
    return { user };
  }

  @Post('logout')
  @HttpCode(204)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response): Promise<void> {
    await this.service.logout(readCookie(req, this.cookieName));
    res.clearCookie(this.cookieName, { path: '/' });
  }

  @Post('verify-email/request')
  @HttpCode(202)
  async requestVerification(@Req() req: Request): Promise<void> {
    const user = await this.service.currentUser(readCookie(req, this.cookieName));
    if (!user) throw new UnauthorizedError('Sign in to request a verification email');
    await this.verification.send(user);
  }

  @Post('verify-email/confirm')
  @HttpCode(204)
  async confirmVerification(@Body() body: unknown): Promise<void> {
    const { token } = confirmVerificationSchema.parse(body);
    await this.verification.confirm(token);
  }

  @Get('me')
  async me(@Req() req: Request) {
    const user = await this.service.currentUser(readCookie(req, this.cookieName));
    const plan = await this.plans.planFor(user?.tenantId ?? DEFAULT_TENANT);
    return { user, plan, isSuperAdmin: user ? this.isSuperAdmin(user.email) : false };
  }

  @Get('providers')
  providersInfo() {
    return this.providers;
  }
}
