import { ImapFlow } from 'imapflow';
import type { AppConfig } from '../config';
import type { InboxMessage } from '../domain/mail-sync';
import type { InboxSource } from '../ports/inbox-source';

/**
 * Reads the desk's inbox over IMAP (imapflow) for reply detection. A fresh
 * connection per poll keeps state trivial — reply sync runs every few minutes,
 * not per request. Only envelope data is read; message bodies never enter the
 * application (ADR-0015).
 */
export class ImapInboxSource implements InboxSource {
  private readonly imap: AppConfig['mail']['imap'];

  constructor(deps: { config: AppConfig }) {
    this.imap = deps.config.mail.imap;
  }

  async listSince(since: string): Promise<InboxMessage[]> {
    const client = new ImapFlow({
      host: this.imap.host,
      port: this.imap.port,
      secure: this.imap.secure,
      auth: { user: this.imap.user, pass: this.imap.pass },
      logger: false,
    });
    await client.connect();
    try {
      const lock = await client.getMailboxLock('INBOX');
      try {
        const messages: InboxMessage[] = [];
        // IMAP SINCE has day granularity; the domain matcher re-filters by
        // exact timestamp, so over-fetching a few hours is harmless.
        for await (const msg of client.fetch({ since: new Date(since) }, { envelope: true })) {
          const from = msg.envelope?.from?.[0];
          const date = msg.envelope?.date;
          if (!from?.address || !date) continue;
          messages.push({
            from: from.address,
            receivedAt: new Date(date).toISOString(),
            subject: msg.envelope?.subject ?? '',
          });
        }
        return messages;
      } finally {
        lock.release();
      }
    } finally {
      await client.logout();
    }
  }
}
