import { randomBytes } from 'node:crypto';
import type { InviteRepository } from '../ports/invite-repository.js';
import type { UserRepository } from '../ports/user-repository.js';
import type { SessionStore } from '../ports/session-store.js';
import type { PasswordHasher } from '../ports/password-hasher.js';
import type { IdGenerator } from '../ports/id-generator.js';
import type { Clock } from '../ports/clock.js';
import type { Mailer } from '../ports/mailer.js';
import type { Logger } from '../ports/logger.js';
import type { AppConfig } from '../config.js';
import { type User, type UserView, toUserView } from '../domain/user.js';
import { ConflictError, UnauthorizedError } from '../domain/errors.js';
import {
  type CreateInviteInput,
  type AcceptInviteInput,
  type TenantInvite,
  type TenantInviteView,
  toInviteView,
  tenantInviteUrl,
  tenantInviteEmail,
} from '../domain/tenant-invite.js';

export interface InviteServiceDeps {
  inviteRepository: InviteRepository;
  userRepository: UserRepository;
  sessionStore: SessionStore;
  passwordHasher: PasswordHasher;
  idGenerator: IdGenerator;
  clock: Clock;
  mailer: Mailer;
  logger: Logger;
  config: AppConfig;
}

/** What an accepted invite yields: the new account plus a fresh session token. */
export interface AcceptResult {
  user: UserView;
  token: string;
}

/**
 * Tenant onboarding by invitation (ADR-0035). An admin invites an email into
 * their own tenant with a set of roles; the invitee accepts by choosing a
 * password, which creates their account already bound to that tenant. This is
 * how a user acquires a non-default `tenantId` — the registration flow is left
 * untouched (a fresh sign-up still bootstraps the default single tenant).
 */
export class InviteService {
  private readonly invites: InviteRepository;
  private readonly users: UserRepository;
  private readonly sessions: SessionStore;
  private readonly hasher: PasswordHasher;
  private readonly ids: IdGenerator;
  private readonly clock: Clock;
  private readonly mailer: Mailer;
  private readonly logger: Logger;
  private readonly baseUrl: string;
  private readonly ttlMs: number;

  constructor(deps: InviteServiceDeps) {
    this.invites = deps.inviteRepository;
    this.users = deps.userRepository;
    this.sessions = deps.sessionStore;
    this.hasher = deps.passwordHasher;
    this.ids = deps.idGenerator;
    this.clock = deps.clock;
    this.mailer = deps.mailer;
    this.logger = deps.logger;
    this.baseUrl = deps.config.mail.appBaseUrl;
    this.ttlMs = deps.config.mail.inviteTtlMs;
  }

  /**
   * An admin invites an email into `tenantId` with `roles`. Rejects if an
   * account with that email already exists. Emails the accept link (best-effort;
   * the URL is also returned so a console/offline deployment can share it).
   */
  async create(
    tenantId: string,
    invitedBy: string,
    input: CreateInviteInput,
  ): Promise<{ invite: TenantInviteView; acceptUrl: string }> {
    const existing = await this.users.findByEmail(input.email);
    if (existing) throw new ConflictError('An account with this email already exists');

    const invite: TenantInvite = {
      token: randomBytes(32).toString('hex'),
      email: input.email,
      tenantId,
      roles: [...new Set(input.roles)],
      invitedBy,
      createdAt: this.clock.isoNow(),
    };
    await this.invites.create(invite);

    const acceptUrl = tenantInviteUrl(this.baseUrl, invite.token);
    const ttlHours = Math.round(this.ttlMs / 3_600_000);
    const { subject, text, html } = tenantInviteEmail(acceptUrl, ttlHours);
    try {
      await this.mailer.send({ to: invite.email, subject, text, html });
    } catch (err) {
      // Never fail invite creation on mail problems (offline-first; console mailer in dev).
      this.logger.error({ err }, 'failed to send invitation email');
    }
    return { invite: toInviteView(invite), acceptUrl };
  }

  /** Pending invitations for a tenant (no tokens), newest first. */
  async list(tenantId: string): Promise<TenantInviteView[]> {
    const invites = await this.invites.listByTenant(tenantId);
    return invites.map(toInviteView);
  }

  /**
   * Accept an invitation: validates + consumes the token, then creates the
   * account bound to the invite's tenant and roles, and opens a session.
   * Single-use; expired or unknown tokens are rejected.
   */
  async accept(input: AcceptInviteInput): Promise<AcceptResult> {
    const invite = await this.invites.consume(input.token);
    if (!invite) throw new UnauthorizedError('This invitation is invalid or has already been used');
    if (Date.parse(invite.createdAt) + this.ttlMs <= Date.parse(this.clock.isoNow())) {
      throw new UnauthorizedError('This invitation has expired');
    }
    // The account may have been created by other means between invite and accept.
    const existing = await this.users.findByEmail(invite.email);
    if (existing) throw new ConflictError('An account with this email already exists');

    const user: User = {
      id: this.ids.next(),
      email: invite.email,
      passwordHash: await this.hasher.hash(input.password),
      roles: invite.roles,
      createdAt: this.clock.isoNow(),
      tenantId: invite.tenantId,
    };
    await this.users.add(user);
    const token = await this.sessions.create(user.id);
    return { user: toUserView(user), token };
  }
}
