import type { AppConfig } from '../config.js';
import type { Logger } from '../ports/logger.js';
import type { Mailer } from '../ports/mailer.js';
import { ConsoleMailer } from './console-mailer.js';
import { SmtpMailer } from './smtp-mailer.js';

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
