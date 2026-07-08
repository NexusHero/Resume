import { z } from 'zod';

export const PLACEMENT_STATUSES = ['probation', 'invoiced', 'paid'] as const;
export type PlacementStatus = (typeof PLACEMENT_STATUSES)[number];

/**
 * A placement fee is money, not free text: an optional currency symbol, digits
 * with dot/comma/space grouping, and an optional trailing symbol. An empty
 * string is allowed (the fee may be filled in later). This is the guard the UI
 * complained was missing — "19.000 €" is accepted, "tbd"/"lots" is rejected.
 * Kept lenient about grouping to match how recruiters type amounts.
 */
const MONEY_RE = /^[€$£\s]*\d[\d.,\s]*[€$£]?$/;
export const moneyString = z.string().refine((s) => s.trim() === '' || MONEY_RE.test(s.trim()), {
  message: 'fee must be a monetary amount, e.g. "19.000 €"',
});

/** A booked placement — a candidate hired into a client role, with its fee. */
export interface Placement {
  id: string;
  ownerId: string;
  candidateName: string;
  candidateRole: string;
  client: string;
  start: string;
  fee: string;
  status: PlacementStatus;
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
}

/** POST /api/v1/placements — record a booked placement. */
export const createPlacementSchema = z.object({
  candidateName: z.string().min(1, 'candidateName is required'),
  candidateRole: z.string().default(''),
  client: z.string().min(1, 'client is required'),
  start: z.string().default(''),
  fee: moneyString.default(''),
  status: z.enum(PLACEMENT_STATUSES).default('probation'),
});
export type CreatePlacementInput = z.infer<typeof createPlacementSchema>;

/** PATCH /api/v1/placements/:id — every field optional. */
export const updatePlacementSchema = z
  .object({
    candidateName: z.string().min(1),
    candidateRole: z.string(),
    client: z.string().min(1),
    start: z.string(),
    fee: moneyString,
    status: z.enum(PLACEMENT_STATUSES),
  })
  .partial();
export type UpdatePlacementInput = z.infer<typeof updatePlacementSchema>;
