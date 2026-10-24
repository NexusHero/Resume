import { z } from 'zod';
import type { TalentDocuments } from './talent-documents.js';
import { saveDocumentsSchema } from './talent-documents.js';

/**
 * A job application ("Bewerbung" = Stelle × Mandant, ADR-0059). Workspace-scoped
 * via `ownerId` (= the Workspace-Scope, ADR-0010/0033). It links a saved posting
 * (`JobPosting`) with a pool talent, carries its **own document copy** (so edits
 * never touch the base CV) and a status with an append-only timestamp history.
 */
export const JOB_APPLICATION_STATUSES = [
  'draft',
  'sent',
  'interview',
  'offer',
  'rejected',
] as const;
export type JobApplicationStatus = (typeof JOB_APPLICATION_STATUSES)[number];

export interface JobApplicationStatusChange {
  status: JobApplicationStatus;
  at: string; // ISO 8601
}

export interface JobApplication {
  id: string;
  /** The owning workspace scope (never from the request body). */
  ownerId: string;
  /** Soft reference to the posting (no FK, no cascade — deleting the posting leaves this intact). */
  jobPostingId: string;
  /** Snapshot of the posting's company (copied on create; display/editor/letter use it, never the posting). */
  postingCompany: string;
  /** Snapshot of the posting's title (dito). */
  postingTitle: string;
  /** The pool talent (Mandant) this application was filed for. */
  talentId: string;
  /** Name snapshot for display after the talent is anonymised (ADR-0046 pattern). */
  talentName: string;
  status: JobApplicationStatus;
  /** Append-only history; `status === statusHistory.at(-1).status` is the invariant. */
  statusHistory: JobApplicationStatusChange[];
  /** The document copy (`resume.rawText = ''`, no `translations`). */
  documents: TalentDocuments;
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
}

export const jobApplicationStatusSchema = z.enum(JOB_APPLICATION_STATUSES);

/** POST /api/v1/job-applications — exactly one posting and one talent. */
export const createJobApplicationSchema = z
  .object({
    jobPostingId: z.string().min(1, 'jobPostingId is required'),
    talentId: z.string().min(1, 'talentId is required'),
  })
  .strict();
export type CreateJobApplicationInput = z.infer<typeof createJobApplicationSchema>;

/**
 * PUT /api/v1/job-applications/:id/documents — the copy has exactly the editor
 * shape of a `TalentDocuments`, so the known `saveDocumentsSchema` is reused.
 */
export const updateJobApplicationDocumentsSchema = saveDocumentsSchema;
export type UpdateJobApplicationDocumentsInput = z.infer<
  typeof updateJobApplicationDocumentsSchema
>;

/** POST /api/v1/job-applications/:id/status — any transition is allowed. */
export const changeJobApplicationStatusSchema = z
  .object({ status: jobApplicationStatusSchema })
  .strict();
export type ChangeJobApplicationStatusInput = z.infer<typeof changeJobApplicationStatusSchema>;

/** GET /api/v1/job-applications query parameters. */
export const jobApplicationQuerySchema = z.object({ talentId: z.string().optional() });
export type JobApplicationQuery = z.infer<typeof jobApplicationQuerySchema>;

/**
 * Legacy pipeline `Application` status → new `JobApplication` status (AK-2.7,
 * Owner Q4). `hired` collapses into `offer` (the new vocabulary has no separate
 * "hired" stage) and `screening` into `sent`; everything else is 1:1.
 */
export const STATUS_TRANSITIONS_LEGACY: Record<string, JobApplicationStatus> = {
  sent: 'sent',
  screening: 'sent',
  interview: 'interview',
  offer: 'offer',
  hired: 'offer',
  rejected: 'rejected',
};

/** Map a legacy pipeline status, defaulting to `draft` for unknown values. */
export function mapLegacyStatus(status: string): JobApplicationStatus {
  return STATUS_TRANSITIONS_LEGACY[status] ?? 'draft';
}

/**
 * Append a status change with its timestamp (the history is append-only; the
 * service also keeps `status` in sync with the last entry).
 */
export function appendStatusChange(
  history: JobApplicationStatusChange[],
  status: JobApplicationStatus,
  at: string,
): JobApplicationStatusChange[] {
  return [...history, { status, at }];
}
