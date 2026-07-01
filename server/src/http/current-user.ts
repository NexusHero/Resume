import type { Request } from 'express';
import { UnauthorizedError } from '../domain/errors';
import type { Role } from '../domain/user';
import type { AuthPrincipal } from '../ports/authorizer';

type AuthedRequest = Request & { userId?: string; roles?: Role[] };

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
