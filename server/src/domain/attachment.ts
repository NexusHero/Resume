import { z } from 'zod';

/** A file (PDF) attached to a talent — a reference, certificate, portfolio, … */
export interface Attachment {
  id: string;
  ownerId: string;
  talentId: string;
  name: string;
  contentType: string;
  size: number; // bytes
  createdAt: string; // ISO 8601
}

/**
 * POST /api/v1/talents/:id/attachments — the file is uploaded base64-encoded in
 * JSON (the API is JSON-only; no multipart). Capped so a single upload cannot
 * blow past the body limit.
 */
export const uploadAttachmentSchema = z.object({
  name: z.string().min(1, 'name is required').max(200),
  contentType: z.string().default('application/pdf'),
  // ~15 MB of raw bytes → ~20 MB base64.
  dataBase64: z.string().min(1, 'file is required').max(21_000_000),
});
export type UploadAttachmentInput = z.infer<typeof uploadAttachmentSchema>;
