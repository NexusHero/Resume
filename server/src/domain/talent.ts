import { z } from 'zod';

/** A candidate the Vermittler represents — a member of the talent pool. */
export interface Talent {
  id: string;
  name: string;
  role: string;
  headline: string;
  location: string;
  email: string;
  phone: string;
  availability: string;
  salary: string;
  skills: string[];
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
}

/** POST /api/v1/talents — add a candidate to the pool. */
export const createTalentSchema = z.object({
  name: z.string().min(1, 'name is required'),
  role: z.string().default(''),
  headline: z.string().default(''),
  location: z.string().default(''),
  email: z.string().default(''),
  phone: z.string().default(''),
  availability: z.string().default(''),
  salary: z.string().default(''),
  skills: z.array(z.string()).default([]),
});
export type CreateTalentInput = z.infer<typeof createTalentSchema>;

/** PATCH /api/v1/talents/:id — every field optional. */
export const updateTalentSchema = z
  .object({
    name: z.string().min(1),
    role: z.string(),
    headline: z.string(),
    location: z.string(),
    email: z.string(),
    phone: z.string(),
    availability: z.string(),
    salary: z.string(),
    skills: z.array(z.string()),
  })
  .partial();
export type UpdateTalentInput = z.infer<typeof updateTalentSchema>;
