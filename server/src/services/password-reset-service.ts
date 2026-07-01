import type { UserRepository } from '../ports/user-repository';
import type { SessionStore } from '../ports/session-store';
import type { PasswordResetTokenStore } from '../ports/password-reset-token-store';
import type { PasswordHasher } from '../ports/password-hasher';
import type { Mailer } from '../ports/mailer';
import type { Logger } from '../ports/logger';
import type { AppConfig } from '../config';
import { UnauthorizedError } from '../domain/errors';
import { passwordResetEmail, passwordResetUrl } from '../domain/password-reset';

export interface PasswordResetServiceDeps {
  userRepository: UserRepository;
  sessionStore: SessionStore;
  passwordResetTokenStore: PasswordResetTokenStore;
  passwordHasher: PasswordHasher;
  mailer: Mailer;
  logger: Logger;
  config: AppConfig;
}

/**
 * Password-reset flow: request a link by email, then set a new password with the
 * emailed one-time token. Requesting is deliberately non-committal about whether
 * an account exists (no user enumeration); confirming consumes the token, sets
 * the new hash, and invalidates every existing session so a leaked token can't
 * outlive the reset.
 */
export class PasswordResetService {
  private readonly users: UserRepository;
  private readonly sessions: SessionStore;
  private readonly tokens: PasswordResetTokenStore;
  private readonly hasher: PasswordHasher;
  private readonly mailer: Mailer;
  private readonly logger: Logger;
  private readonly baseUrl: string;
  private readonly ttlMinutes: number;

  constructor(deps: PasswordResetServiceDeps) {
    this.users = deps.userRepository;
    this.sessions = deps.sessionStore;
    this.tokens = deps.passwordResetTokenStore;
    this.hasher = deps.passwordHasher;
    this.mailer = deps.mailer;
    this.logger = deps.logger;
    this.baseUrl = deps.config.mail.appBaseUrl;
    this.ttlMinutes = Math.round(deps.config.mail.resetTokenTtlMs / 60000);
  }

  /**
   * Mint a token and email a reset link — but only if the account exists. Always
   * resolves the same way so the caller can't tell whether the email is
   * registered. Mail failures are logged, never surfaced to the caller.
   */
  async request(email: string): Promise<void> {
    const user = await this.users.findByEmail(email);
    if (!user) return;
    const token = await this.tokens.create(user.id);
    const url = passwordResetUrl(this.baseUrl, token);
    const { subject, text, html } = passwordResetEmail(url, this.ttlMinutes);
    try {
      await this.mailer.send({ to: user.email, subject, text, html });
    } catch (err) {
      this.logger.error({ err }, 'failed to send password-reset email');
    }
  }

  /**
   * Consume the token and set the new password. Throws UnauthorizedError when the
   * token is unknown or expired. On success every session for the user is dropped.
   */
  async confirm(token: string, newPassword: string): Promise<void> {
    const userId = await this.tokens.consume(token);
    if (!userId) throw new UnauthorizedError('This reset link is invalid or has expired');
    const passwordHash = await this.hasher.hash(newPassword);
    await this.users.updatePassword(userId, passwordHash);
    // A reset invalidates any other outstanding link and all live sessions.
    await this.tokens.destroyForUser(userId);
    await this.sessions.destroyForUser(userId);
  }
}
