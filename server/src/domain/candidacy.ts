import { z } from 'zod';

/**
 * The recruiting pipeline stages a candidate moves through for one mandate.
 * `placed` and `rejected` are terminal.
 */
export const CANDIDACY_STAGES = [
  'sourced',
  'screening',
  'interview',
  'offer',
  'placed',
  'rejected',
] as const;
export const candidacyStageSchema = z.enum(CANDIDACY_STAGES);
export type CandidacyStage = (typeof CANDIDACY_STAGES)[number];

/** Stages that count as "submitted to the client" (advanced past the longlist). */
export const SUBMITTED_STAGES: CandidacyStage[] = ['screening', 'interview', 'offer', 'placed'];
/** Stages that count as having reached an interview. */
export const INTERVIEW_STAGES: CandidacyStage[] = ['interview', 'offer', 'placed'];

/**
 * A talent's candidacy for one mandate — the link that turns a loose talent
 * pool + separate mandates into a pipeline. Owner-scoped; unique per
 * (owner, mandate, talent). `order` positions the card within its stage column.
 */
export interface Candidacy {
  id: string;
  ownerId: string;
  mandateId: string;
  talentId: string;
  stage: CandidacyStage;
  note: string;
  order: number;
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
}

/** POST /api/v1/mandates/:id/candidacies — add a talent to the mandate's pipeline. */
export const addCandidacySchema = z.object({
  talentId: z.string().min(1, 'talentId is required'),
  stage: candidacyStageSchema.default('sourced'),
  note: z.string().max(2000).default(''),
});
export type AddCandidacyInput = z.infer<typeof addCandidacySchema>;

/** PATCH /api/v1/candidacies/:id — move to a stage / reorder / annotate. */
export const updateCandidacySchema = z
  .object({
    stage: candidacyStageSchema,
    note: z.string().max(2000),
    order: z.number().int().min(0),
  })
  .partial();
export type UpdateCandidacyInput = z.infer<typeof updateCandidacySchema>;
