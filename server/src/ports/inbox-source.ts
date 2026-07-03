import type { InboxMessage } from '../domain/mail-sync';

/**
 * Read access to the desk's mailbox, reduced to what reply detection needs.
 * Adapters: IMAP (imapflow) in production, a disabled null object when no
 * mailbox is configured, in-memory fakes in tests.
 */
export interface InboxSource {
  /** Messages received at or after `since` (ISO 8601), order unspecified. */
  listSince(since: string): Promise<InboxMessage[]>;
}
