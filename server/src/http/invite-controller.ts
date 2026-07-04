import type { Request, Response } from 'express';
import { createInviteSchema, acceptInviteSchema } from '../domain/tenant-invite';
import { ForbiddenError } from '../domain/errors';
import type { InviteService } from '../services/invite-service';
import type { Authorizer } from '../ports/authorizer';
import type { AppConfig } from '../config';
import { currentPrincipal, currentScope, currentUserId } from './current-user';

/**
 * Tenant invitations (ADR-0035). Admin-only create/list under
 * `/members/invites`; a public `/auth/accept-invite` that opens a session for
 * the new account, mirroring how the auth controller sets the session cookie.
 */
export class InviteController {
  private readonly service: InviteService;
  private readonly authz: Authorizer;
  private readonly cookieName: string;
  private readonly cookieSecure: boolean;
  private readonly maxAgeMs: number;

  constructor(deps: { inviteService: InviteService; authorizer: Authorizer; config: AppConfig }) {
    this.service = deps.inviteService;
    this.authz = deps.authorizer;
    this.cookieName = deps.config.auth.sessionCookieName;
    this.cookieSecure = deps.config.auth.cookieSecure;
    this.maxAgeMs = deps.config.auth.sessionTtlMs;
  }

  private require(req: Request, action: string): void {
    if (!this.authz.check(currentPrincipal(req), { kind: 'member' }, action)) {
      throw new ForbiddenError();
    }
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

  /** POST /members/invites — an admin invites an email into their tenant. */
  create = async (req: Request, res: Response): Promise<void> => {
    this.require(req, 'invite');
    const input = createInviteSchema.parse(req.body);
    const result = await this.service.create(currentScope(req), currentUserId(req), input);
    res.status(201).json(result);
  };

  /** GET /members/invites — pending invitations for the admin's tenant. */
  list = async (req: Request, res: Response): Promise<void> => {
    this.require(req, 'listInvites');
    res.json(await this.service.list(currentScope(req)));
  };

  /** POST /auth/accept-invite — the invitee sets a password and joins. */
  accept = async (req: Request, res: Response): Promise<void> => {
    const input = acceptInviteSchema.parse(req.body);
    const { user, token } = await this.service.accept(input);
    this.setSession(res, token);
    res.status(201).json({ user });
  };
}
