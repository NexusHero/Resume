import type { Logger } from '../ports/logger';
import type { Mailer, MailMessage } from '../ports/mailer';

/**
 * Development mailer: instead of sending, it logs the message (subject + body) so
 * the reset link is visible in the server output. The default transport, so
 * local/dev/CI need no SMTP server — set MAIL_TRANSPORT=smtp for real delivery.
 */
export class ConsoleMailer implements Mailer {
  private readonly logger: Logger;

  constructor(deps: { logger: Logger }) {
    this.logger = deps.logger;
  }

  async send(message: MailMessage): Promise<void> {
    this.logger.info(
      { to: message.to, subject: message.subject, body: message.text },
      '[mail:console] email not sent (dev transport) — body logged below',
    );
  }
}
