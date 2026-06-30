import { z } from 'zod';

/** A registered account. `passwordHash` never leaves the server. */
export interface User {
  id: string;
  email: string;
  passwordHash: string;
  createdAt: string; // ISO 8601
}

/** The public projection of a user — no secrets. */
export interface UserView {
  id: string;
  email: string;
  createdAt: string;
}

export function toUserView(u: User): UserView {
  return { id: u.id, email: u.email, createdAt: u.createdAt };
}

const email = z
  .string()
  .trim()
  .email('a valid email is required')
  .transform((s) => s.toLowerCase());

/** POST /api/v1/auth/register */
export const registerSchema = z.object({
  email,
  password: z.string().min(8, 'password must be at least 8 characters'),
});
export type RegisterInput = z.infer<typeof registerSchema>;

/** POST /api/v1/auth/login */
export const loginSchema = z.object({
  email,
  password: z.string().min(1, 'password is required'),
});
export type LoginInput = z.infer<typeof loginSchema>;
