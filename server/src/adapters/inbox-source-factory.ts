import type { AppConfig } from '../config';
import type { InboxMessage } from '../domain/mail-sync';
import type { InboxSource } from '../ports/inbox-source';
import { ImapInboxSource } from './imap-inbox-source';

/** Null object for deployments without a configured mailbox: an empty inbox. */
export class DisabledInboxSource implements InboxSource {
  async listSince(): Promise<InboxMessage[]> {
    return [];
  }
}

/**
 * Reply detection is enabled iff `MAIL_IMAP_HOST` is set (mirrors the mailer
 * factory: real adapter when configured, harmless default otherwise).
 */
export function createInboxSource(deps: { config: AppConfig }): InboxSource {
  if (deps.config.mail.imap.host) {
    return new ImapInboxSource({ config: deps.config });
  }
  return new DisabledInboxSource();
}
