import type { AppConfig } from '../config';
import type { Logger } from '../ports/logger';
import type { Mailer } from '../ports/mailer';
import { ConsoleMailer } from './console-mailer';
import { SmtpMailer } from './smtp-mailer';

/**
 * Chooses the mail transport from `config.mail.transport`: `smtp` uses nodemailer
 * (real delivery), anything else falls back to the console mailer (dev default,
 * so local/CI need no SMTP server).
 */
export function createMailer(deps: { config: AppConfig; logger: Logger }): Mailer {
  if (deps.config.mail.transport === 'smtp') {
    return new SmtpMailer({ config: deps.config });
  }
  return new ConsoleMailer({ logger: deps.logger });
}
