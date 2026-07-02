import type { UserRepository } from '../ports/user-repository';
import type { EmailVerificationTokenStore } from '../ports/email-verification-token-store';
import type { Mailer } from '../ports/mailer';
import type { Logger } from '../ports/logger';
import type { Clock } from '../ports/clock';
import type { AppConfig } from '../config';
import type { User } from '../domain/user';
import { UnauthorizedError } from '../domain/errors';
import { emailVerificationEmail, emailVerificationUrl } from '../domain/email-verification';

export interface EmailVerificationServiceDeps {
  userRepository: UserRepository;
  emailVerificationTokenStore: EmailVerificationTokenStore;
  mailer: Mailer;
  logger: Logger;
  clock: Clock;
  config: AppConfig;
}

/**
 * Soft email verification: on registration (and on demand) a confirmation link
 * goes out; clicking it stamps `verifiedAt` on the account. Nothing is locked
 * while unverified — the app is offline-first and SMTP may be absent — but the
 * state is visible in Settings and future features can require it.
 */
export class EmailVerificationService {
  private readonly users: UserRepository;
  private readonly tokens: EmailVerificationTokenStore;
  private readonly mailer: Mailer;
  private readonly logger: Logger;
  private readonly clock: Clock;
  private readonly baseUrl: string;
  private readonly ttlMinutes: number;

  constructor(deps: EmailVerificationServiceDeps) {
    this.users = deps.userRepository;
    this.tokens = deps.emailVerificationTokenStore;
    this.mailer = deps.mailer;
    this.logger = deps.logger;
    this.clock = deps.clock;
    this.baseUrl = deps.config.mail.appBaseUrl;
    this.ttlMinutes = Math.round(deps.config.mail.resetTokenTtlMs / 60000);
  }

  /**
   * Mint a token and email the confirmation link. Best-effort: mail failures
   * are logged, never surfaced — registration must not fail because SMTP is
   * down or unconfigured (the console mailer prints the link in dev).
   */
  async send(user: Pick<User, 'id' | 'email'>): Promise<void> {
    const token = await this.tokens.create(user.id);
    const url = emailVerificationUrl(this.baseUrl, token);
    const { subject, text, html } = emailVerificationEmail(url, this.ttlMinutes);
    try {
      await this.mailer.send({ to: user.email, subject, text, html });
    } catch (err) {
      this.logger.error({ err }, 'failed to send verification email');
    }
  }

  /**
   * Consume the token and stamp the account verified. Throws UnauthorizedError
   * when the token is unknown or expired. Idempotent on the account: a second
   * link for an already-verified user simply re-stamps the same state.
   */
  async confirm(token: string): Promise<void> {
    const userId = await this.tokens.consume(token);
    if (!userId) throw new UnauthorizedError('This verification link is invalid or has expired');
    await this.users.markVerified(userId, this.clock.isoNow());
    // Any other outstanding link is now pointless.
    await this.tokens.destroyForUser(userId);
  }
}
