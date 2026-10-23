import { z } from 'zod';
import type { LlmProviderId } from '../ports/llm-provider.js';

/**
 * Team roles a user can hold. Roles are a set — a person can be several at once
 * (e.g. admin + recruiter). `admin` implies full access, including managing
 * members and their roles; `recruiter` is the day-to-day worker.
 */
export const ROLES = ['admin', 'recruiter'] as const;
export const roleSchema = z.enum(ROLES);
export type Role = (typeof ROLES)[number];

/**
 * The tenant a user belongs to (ADR-0033). Data ownership is scoped by tenant,
 * so users in different tenants never see each other's records. A user without
 * an explicit tenant belongs to `DEFAULT_TENANT` — the single tenant every
 * current deployment runs as, which preserves the pre-multi-tenant behaviour.
 */
export const DEFAULT_TENANT = 'team';

/** A registered account. `passwordHash` never leaves the server. */
export interface User {
  id: string;
  email: string;
  passwordHash: string;
  roles: Role[];
  createdAt: string; // ISO 8601
  /** The tenant this user belongs to (ADR-0033); absent means `DEFAULT_TENANT`. */
  tenantId?: string;
  /** When the email address was confirmed via the emailed link (soft check). */
  verifiedAt?: string;
  /**
   * The persisted provider choice (ADR-0011, kept by ADR-0057). It is only used
   * when that provider has a central server key; otherwise resolution falls back
   * to the server default / any available provider.
   */
  llmProvider?: LlmProviderId;
}

/** The public projection of a user — no secrets. */
export interface UserView {
  id: string;
  email: string;
  roles: Role[];
  createdAt: string;
  /** The tenant this user belongs to (ADR-0033); absent means `DEFAULT_TENANT`. */
  tenantId?: string;
  verifiedAt?: string;
}

export function toUserView(u: User): UserView {
  return {
    id: u.id,
    email: u.email,
    roles: u.roles,
    createdAt: u.createdAt,
    ...(u.tenantId ? { tenantId: u.tenantId } : {}),
    ...(u.verifiedAt ? { verifiedAt: u.verifiedAt } : {}),
  };
}

/** True when the user holds the admin role. */
export function isAdmin(u: { roles: Role[] }): boolean {
  return u.roles.includes('admin');
}

/** PATCH /api/v1/members/:id/roles — set a member's roles (admin only). */
export const setRolesSchema = z.object({
  roles: z.array(roleSchema).min(1, 'at least one role is required'),
});
export type SetRolesInput = z.infer<typeof setRolesSchema>;

const email = z
  .string()
  .trim()
  .email('a valid email is required')
  .transform((s) => s.toLowerCase());

/** POST /api/v1/auth/register */
export const registerSchema = z.object({
  email,
  password: z.string().min(8, 'password must be at least 8 characters'),
  /**
   * Names the workspace created for a self-serve registration (ADR-0036);
   * ignored when self-serve tenants are off. Absent → a default is derived.
   */
  workspaceName: z.string().trim().max(80).optional(),
});
export type RegisterInput = z.infer<typeof registerSchema>;

/** POST /api/v1/auth/login */
export const loginSchema = z.object({
  email,
  password: z.string().min(1, 'password is required'),
});
export type LoginInput = z.infer<typeof loginSchema>;
