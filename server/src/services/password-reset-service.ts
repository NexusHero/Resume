import type { UserRepository } from '../ports/user-repository.js';
import type { AuthEngine } from '../ports/auth-engine.js';
import type { PasswordResetTokenStore } from '../ports/password-reset-token-store.js';
import type { Mailer } from '../ports/mailer.js';
import type { Logger } from '../ports/logger.js';
import type { AppConfig } from '../config.js';
import { UnauthorizedError } from '../domain/errors.js';
import { passwordResetEmail, passwordResetUrl } from '../domain/password-reset.js';

export interface PasswordResetServiceDeps {
  userRepository: UserRepository;
  authEngine: AuthEngine;
  passwordResetTokenStore: PasswordResetTokenStore;
  mailer: Mailer;
  logger: Logger;
  config: AppConfig;
}

/**
 * Password-reset flow: request a link by email, then set a new password with the
 * emailed one-time token. Requesting is deliberately non-committal about whether
 * an account exists (no user enumeration); confirming consumes the token, sets
 * the new password in the auth engine (ADR-0043), and invalidates every existing
 * session so a leaked token can't outlive the reset.
 */
export class PasswordResetService {
  private readonly users: UserRepository;
  private readonly engine: AuthEngine;
  private readonly tokens: PasswordResetTokenStore;
  private readonly mailer: Mailer;
  private readonly logger: Logger;
  private readonly baseUrl: string;
  private readonly ttlMinutes: number;

  constructor(deps: PasswordResetServiceDeps) {
    this.users = deps.userRepository;
    this.engine = deps.authEngine;
    this.tokens = deps.passwordResetTokenStore;
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
    const user = await this.users.findById(userId);
    if (user) {
      // Set the new password in the engine. An account that predates Better-Auth
      // and hasn't logged in since has no engine credential yet — create one with
      // the new password (signUp); otherwise update the existing one.
      try {
        await this.engine.signUp(user.email, newPassword);
      } catch {
        await this.engine.setPassword(user.email, newPassword);
      }
      // Drop every live session so a leaked reset link can't outlive the reset —
      // the engine is the sole credential authority (ADR-0043).
      await this.engine.revokeSessions(user.email);
    }
    // A reset also invalidates any other outstanding reset link.
    await this.tokens.destroyForUser(userId);
  }
}
