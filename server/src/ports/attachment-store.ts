import type { Attachment } from '../domain/attachment.js';

/** An attachment plus its bytes. */
export interface AttachmentBlob {
  attachment: Attachment;
  bytes: Buffer;
}

/**
 * Persistence of talent attachments (metadata + bytes), scoped to an owner.
 */
export interface AttachmentStore {
  add(attachment: Attachment, bytes: Buffer): Promise<void>;
  list(ownerId: string, talentId: string): Promise<Attachment[]>;
  get(ownerId: string, id: string): Promise<AttachmentBlob | null>;
  remove(ownerId: string, id: string): Promise<boolean>;
  /** Drop every attachment of one talent (cascade when the talent is removed). */
  removeForTalent(ownerId: string, talentId: string): Promise<void>;
  /** Drop every attachment an owner has (DSGVO account erasure). */
  removeForOwner(ownerId: string): Promise<void>;
}
