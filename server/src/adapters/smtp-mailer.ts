import nodemailer, { type Transporter } from 'nodemailer';
import type { AppConfig } from '../config.js';
import type { Mailer, MailMessage } from '../ports/mailer.js';

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
    requireTLS: boolean;
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
      // Implicit TLS (465) or a mandatory STARTTLS upgrade — never cleartext,
      // unless SMTP_REQUIRE_TLS=false explicitly allows a trusted local relay.
      requireTLS: smtp.secure || smtp.requireTls,
      // Only authenticate when credentials are configured (some relays are open
      // on a trusted network).
      ...(smtp.user || smtp.pass ? { auth: { user: smtp.user, pass: smtp.pass } } : {}),
    };
  }

  private get tx(): Transporter {
    // Reviewed (SonarCloud S5332): `options` always sets implicit TLS (`secure`)
    // or a mandatory STARTTLS upgrade (`requireTLS`); cleartext only when the
    // operator sets SMTP_REQUIRE_TLS=false for a trusted local relay.
    if (!this.transporter) this.transporter = nodemailer.createTransport(this.options); // NOSONAR
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
