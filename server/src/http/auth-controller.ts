import type { Request, Response } from 'express';
import { registerSchema, loginSchema } from '../domain/user';
import type { AuthService } from '../services/auth-service';
import type { AppConfig } from '../config';

const COOKIE_MAX_AGE_MS = 1000 * 60 * 60 * 24 * 30; // 30 days

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
  private readonly providers: { google: boolean; linkedin: boolean };

  constructor(deps: { authService: AuthService; config: AppConfig }) {
    this.service = deps.authService;
    this.cookieName = deps.config.auth.sessionCookieName;
    this.providers = {
      google: deps.config.auth.google.enabled,
      linkedin: deps.config.auth.linkedin.enabled,
    };
  }

  private setSession(res: Response, token: string): void {
    res.cookie(this.cookieName, token, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: COOKIE_MAX_AGE_MS,
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
}
