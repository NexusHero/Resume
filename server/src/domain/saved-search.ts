import { z } from 'zod';
import { jobQuerySchema } from './job.js';

/** A named, reusable job search. */
export interface SavedSearch {
  id: string;
  name: string;
  query: {
    q?: string;
    city?: string;
    country?: string;
    threshold: number;
  };
  createdAt: string; // ISO 8601
}

/** POST /api/v1/searches — name and store a search. */
export const createSavedSearchSchema = z.object({
  name: z.string().min(1, 'name is required'),
  q: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  threshold: jobQuerySchema.shape.threshold,
});
export type CreateSavedSearchInput = z.infer<typeof createSavedSearchSchema>;
