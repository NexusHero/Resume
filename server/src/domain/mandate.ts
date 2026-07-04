import { z } from 'zod';
import type { OutputLang } from './language.js';

export const MANDATE_PRIORITIES = ['high', 'medium', 'low'] as const;
export type MandatePriority = (typeof MANDATE_PRIORITIES)[number];

export const MANDATE_STATUSES = ['active', 'paused', 'closed'] as const;
export type MandateStatus = (typeof MANDATE_STATUSES)[number];

/** A client search mandate — the Vermittler's core work item. */
export interface Mandate {
  id: string;
  ownerId: string;
  client: string;
  role: string;
  location: string;
  fee: string;
  feeValue: string;
  deadline: string;
  priority: MandatePriority;
  status: MandateStatus;
  submitted: number;
  interviews: number;
  /** The job ad text — the employer's own requirements for this role. */
  jobText: string;
  /**
   * Language of the job ad, derived from `jobText`. Generated documents for this
   * mandate (pitch, outreach, prep, …) follow it: a German posting yields a
   * German application, an English posting an English one — independent of the
   * app UI language. Defaults to `'en'` when the ad is empty.
   */
  lang: OutputLang;
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
}

/** POST /api/v1/mandates — open a new search mandate. */
export const createMandateSchema = z.object({
  client: z.string().min(1, 'client is required'),
  role: z.string().min(1, 'role is required'),
  location: z.string().min(1, 'location is required'),
  fee: z.string().default(''),
  feeValue: z.string().default(''),
  deadline: z.string().default(''),
  priority: z.enum(MANDATE_PRIORITIES).default('medium'),
  status: z.enum(MANDATE_STATUSES).default('active'),
  submitted: z.number().int().min(0).default(0),
  interviews: z.number().int().min(0).default(0),
  jobText: z.string().max(50_000).default(''),
});
export type CreateMandateInput = z.infer<typeof createMandateSchema>;

/** PATCH /api/v1/mandates/:id — every field optional. */
export const updateMandateSchema = z
  .object({
    client: z.string().min(1),
    role: z.string().min(1),
    location: z.string().min(1),
    fee: z.string(),
    feeValue: z.string(),
    deadline: z.string(),
    priority: z.enum(MANDATE_PRIORITIES),
    status: z.enum(MANDATE_STATUSES),
    submitted: z.number().int().min(0),
    interviews: z.number().int().min(0),
    jobText: z.string().max(50_000),
  })
  .partial();
export type UpdateMandateInput = z.infer<typeof updateMandateSchema>;
