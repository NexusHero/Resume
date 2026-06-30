/** A transactional email to send. */
export interface MailMessage {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

/** Sends transactional email. Adapters: console (dev) or SMTP (nodemailer). */
export interface Mailer {
  send(message: MailMessage): Promise<void>;
}
