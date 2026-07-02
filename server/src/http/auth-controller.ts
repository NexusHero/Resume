import type { Request, Response, NextFunction } from 'express';
import { registerSchema, loginSchema } from '../domain/user';
import { UnauthorizedError } from '../domain/errors';
import type { AuthService } from '../services/auth-service';
import type { AppConfig } from '../config';

/** Reads a single cookie value from the raw Cookie header (no cookie-parser dep). */
function readCookie(req: Request, name: string): string | undefined {
  const header = req.headers.cookie;
  if (!header) return undefined;
  for (const part of header.split(';')) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    if (part.slice(0, idx).trim() === name) {
      return decodeURIComponent(part.slice(idx + 1).trim());
    }
  }
  return undefined;
}

/** Auth endpoints under /api/v1/auth — register, login, logout, me, providers. */
export class AuthController {
  private readonly service: AuthService;
  private readonly cookieName: string;
  private readonly cookieSecure: boolean;
  private readonly maxAgeMs: number;
  private readonly providers: { google: boolean; linkedin: boolean };

  constructor(deps: { authService: AuthService; config: AppConfig }) {
    this.service = deps.authService;
    this.cookieName = deps.config.auth.sessionCookieName;
    this.cookieSecure = deps.config.auth.cookieSecure;
    // Keep the cookie's client-side lifetime aligned with the server session TTL.
    this.maxAgeMs = deps.config.auth.sessionTtlMs;
    this.providers = {
      google: deps.config.auth.google.enabled,
      linkedin: deps.config.auth.linkedin.enabled,
    };
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

  register = async (req: Request, res: Response): Promise<void> => {
    const input = registerSchema.parse(req.body);
    const { user, token } = await this.service.register(input);
    this.setSession(res, token);
    res.status(201).json({ user });
  };

  login = async (req: Request, res: Response): Promise<void> => {
    const input = loginSchema.parse(req.body);
    const { user, token } = await this.service.login(input);
    this.setSession(res, token);
    res.json({ user });
  };

  logout = async (req: Request, res: Response): Promise<void> => {
    await this.service.logout(readCookie(req, this.cookieName));
    res.clearCookie(this.cookieName, { path: '/' });
    res.sendStatus(204);
  };

  me = async (req: Request, res: Response): Promise<void> => {
    const user = await this.service.currentUser(readCookie(req, this.cookieName));
    res.json({ user });
  };

  providersInfo = async (_req: Request, res: Response): Promise<void> => {
    res.json(this.providers);
  };

  /**
   * Guard for authenticated routes: resolves the session cookie to a user and
   * stamps `req.userId`. Rejects with 401 when no valid session is present.
   */
  requireAuth = async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    const user = await this.service.currentUser(readCookie(req, this.cookieName));
    if (!user) throw new UnauthorizedError();
    const r = req as Request & { userId?: string; roles?: typeof user.roles };
    r.userId = user.id;
    r.roles = user.roles;
    next();
  };

  /**
   * Soft auth for otherwise-open routes: stamps `req.userId` when a valid session
   * is present, but never rejects. Lets e.g. cover-letter generation use the
   * signed-in user's own key while still working for anonymous callers.
   */
  attachUser = async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    const user = await this.service.currentUser(readCookie(req, this.cookieName));
    if (user) (req as Request & { userId?: string }).userId = user.id;
    next();
  };
}
