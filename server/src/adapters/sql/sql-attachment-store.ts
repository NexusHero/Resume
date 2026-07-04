import { and, eq } from 'drizzle-orm';
import type { Attachment } from '../../domain/attachment.js';
import type { AttachmentBlob, AttachmentStore } from '../../ports/attachment-store.js';
import type { Db } from './db.js';
import { attachments } from './schema.js';
import { rowToAttachment, attachmentToRow } from './mappers.js';

/**
 * Postgres-backed attachment store, scoped to an owner. Bytes are held as
 * base64 text alongside the metadata — simple and portable across stores.
 */
export class SqlAttachmentStore implements AttachmentStore {
  private readonly db: Db;

  constructor(deps: { db: Db }) {
    this.db = deps.db;
  }

  async add(attachment: Attachment, bytes: Buffer): Promise<void> {
    await this.db.insert(attachments).values(attachmentToRow(attachment, bytes.toString('base64')));
  }

  async list(ownerId: string, talentId: string): Promise<Attachment[]> {
    const rows = await this.db
      .select()
      .from(attachments)
      .where(and(eq(attachments.ownerId, ownerId), eq(attachments.talentId, talentId)));
    return rows.map(rowToAttachment);
  }

  async get(ownerId: string, id: string): Promise<AttachmentBlob | null> {
    const rows = await this.db
      .select()
      .from(attachments)
      .where(and(eq(attachments.ownerId, ownerId), eq(attachments.id, id)));
    const row = rows[0];
    if (!row) return null;
    return { attachment: rowToAttachment(row), bytes: Buffer.from(row.data, 'base64') };
  }

  async remove(ownerId: string, id: string): Promise<boolean> {
    const removed = await this.db
      .delete(attachments)
      .where(and(eq(attachments.ownerId, ownerId), eq(attachments.id, id)))
      .returning({ id: attachments.id });
    return removed.length > 0;
  }

  async removeForTalent(ownerId: string, talentId: string): Promise<void> {
    await this.db
      .delete(attachments)
      .where(and(eq(attachments.ownerId, ownerId), eq(attachments.talentId, talentId)));
  }

  async removeForOwner(ownerId: string): Promise<void> {
    await this.db.delete(attachments).where(eq(attachments.ownerId, ownerId));
  }
}
