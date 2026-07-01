import nodemailer, { type Transporter } from 'nodemailer';
import type { AppConfig } from '../config';
import type { Mailer, MailMessage } from '../ports/mailer';

/**
 * SMTP mailer (nodemailer). Provider-agnostic: point SMTP_HOST/PORT/USER/PASS at
 * any SMTP relay (Brevo, Mailjet, SES, …). The transporter is created lazily and
 * reused. Excluded from unit coverage — it talks to a real SMTP server, so it is
 * exercised by the deployment, not the test suite.
 */
export class SmtpMailer implements Mailer {
  private readonly from: string;
  private readonly options: {
    host: string;
    port: number;
    secure: boolean;
    auth?: { user: string; pass: string };
  };
  private transporter: Transporter | null = null;

  constructor(deps: { config: AppConfig }) {
    const smtp = deps.config.mail.smtp;
    this.from = deps.config.mail.from;
    this.options = {
      host: smtp.host,
      port: smtp.port,
      secure: smtp.secure,
      // Only authenticate when credentials are configured (some relays are open
      // on a trusted network).
      ...(smtp.user || smtp.pass ? { auth: { user: smtp.user, pass: smtp.pass } } : {}),
    };
  }

  private get tx(): Transporter {
    if (!this.transporter) this.transporter = nodemailer.createTransport(this.options);
    return this.transporter;
  }

  async send(message: MailMessage): Promise<void> {
    await this.tx.sendMail({
      from: this.from,
      to: message.to,
      subject: message.subject,
      text: message.text,
      html: message.html,
    });
  }
}
