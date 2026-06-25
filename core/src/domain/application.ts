import { z } from 'zod';

/**
 * The application funnel stages (English domain language).
 * Replaces the legacy German status strings.
 */
export const APPLICATION_STATUSES = [
  'sent',
  'screening',
  'interview',
  'offer',
  'hired',
  'rejected',
] as const;

export const applicationStatusSchema = z.enum(APPLICATION_STATUSES);
export type ApplicationStatus = z.infer<typeof applicationStatusSchema>;

/** A persisted job application. */
export interface Application {
  id: string;
  date: string; // YYYY-MM-DD
  company: string;
  position: string;
  address: string;
  reference: string;
  status: ApplicationStatus;
  pdfPath: string | null;
  source: string;
  createdAt: string; // ISO 8601
  updatedAt?: string; // ISO 8601
  commit?: string; // short git hash, if versioned
}

/** An append-only audit trail entry. */
export interface AuditEvent {
  ts: string; // ISO 8601
  action: 'create' | 'update' | 'commit';
  id: string;
  by?: string;
  data?: unknown;
  changed?: Record<string, { from: unknown; to: unknown }>;
  commit?: string;
}

const base64 = z
  .string()
  .regex(/^[A-Za-z0-9+/]*={0,2}$/, 'must be base64')
  .optional();

/** POST /api/v1/applications — record an application (optionally with a finished PDF). */
export const createApplicationSchema = z.object({
  company: z.string().min(1, 'company is required'),
  position: z.string().default(''),
  address: z.string().optional(),
  contactName: z.string().optional(),
  street: z.string().optional(),
  postalCodeCity: z.string().optional(),
  reference: z.string().default(''),
  status: applicationStatusSchema.default('sent'),
  source: z.string().optional(),
  pdfBase64: base64,
});
export type CreateApplicationInput = z.infer<typeof createApplicationSchema>;

/** PATCH /api/v1/applications/:id — partial update of mutable fields. */
export const updateApplicationSchema = z
  .object({
    company: z.string().min(1),
    position: z.string(),
    address: z.string(),
    reference: z.string(),
    status: applicationStatusSchema,
    source: z.string(),
  })
  .partial();
export type UpdateApplicationInput = z.infer<typeof updateApplicationSchema>;

/** POST /api/v1/applications/build — render CV + cover letter, merge, archive. */
export const buildApplicationSchema = z.object({
  company: z.string().min(1, 'company is required'),
  contactName: z.string().optional(),
  street: z.string().optional(),
  postalCodeCity: z.string().optional(),
  position: z.string().default(''),
  reference: z.string().default(''),
  location: z.string().optional(),
  date: z.string().optional(),
  language: z.enum(['de', 'en']).default('de'),
  status: applicationStatusSchema.default('sent'),
  source: z.string().optional(),
  attachments: z.array(z.object({ name: z.string(), base64: z.string() })).default([]),
});
export type BuildApplicationInput = z.infer<typeof buildApplicationSchema>;

/** Compose a single-line address from its parts when no explicit address is given. */
export function composeAddress(parts: {
  address?: string;
  contactName?: string;
  street?: string;
  postalCodeCity?: string;
}): string {
  if (parts.address && parts.address.trim()) return parts.address.trim();
  return [parts.contactName, parts.street, parts.postalCodeCity]
    .filter((p): p is string => Boolean(p && p.trim()))
    .join(', ');
}
