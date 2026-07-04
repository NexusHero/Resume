import type { Request } from 'express';
import { UnauthorizedError } from '../domain/errors.js';
import { DEFAULT_TENANT, type Role } from '../domain/user.js';
import type { AuthPrincipal } from '../ports/authorizer.js';

type AuthedRequest = Request & {
  userId?: string;
  roles?: Role[];
  tenantId?: string;
  isSuperAdmin?: boolean;
};

/** The authenticated user's id, attached to the request by AuthController.requireAuth. */
export function currentUserId(req: Request): string {
  const id = (req as AuthedRequest).userId;
  if (!id) throw new UnauthorizedError();
  return id;
}

/** The user's id if a session was attached, else undefined — for open routes. */
export function optionalUserId(req: Request): string | undefined {
  return (req as AuthedRequest).userId;
}

/** The authenticated user's roles (empty if none stamped). */
export function currentRoles(req: Request): Role[] {
  return (req as AuthedRequest).roles ?? [];
}

/** The acting principal (id + roles) for authorization checks. */
export function currentPrincipal(req: Request): AuthPrincipal {
  return { id: currentUserId(req), roles: currentRoles(req) };
}

/**
 * The owner scope for **shared team data** (mandates, talents, pipeline, …) —
 * the tenant the acting user belongs to (ADR-0033). Recruiting records are owned
 * by the tenant, not the individual, so every member of a tenant sees the same
 * pool while different tenants are fully isolated. requireAuth stamps
 * `req.tenantId`; a request without one (or a user without an explicit tenant)
 * falls back to `DEFAULT_TENANT`, which is every current single-tenant
 * deployment. The `TEAM_SCOPE` alias is kept for that default.
 */
export const TEAM_SCOPE = DEFAULT_TENANT;
export function currentScope(req: Request): string {
  return (req as AuthedRequest).tenantId ?? DEFAULT_TENANT;
}

/**
 * Whether the acting user holds the instance-level **super-admin** capability
 * (ADR-0037) — cross-tenant visibility/management. Stamped by requireAuth from
 * the configured `superAdminEmails`; never derived from tenant roles.
 */
export function currentIsSuperAdmin(req: Request): boolean {
  return (req as AuthedRequest).isSuperAdmin === true;
}
