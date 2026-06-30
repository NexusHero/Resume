import type { Request } from 'express';
import { UnauthorizedError } from '../domain/errors';

/** The authenticated user's id, attached to the request by AuthController.requireAuth. */
export function currentUserId(req: Request): string {
  const id = (req as Request & { userId?: string }).userId;
  if (!id) throw new UnauthorizedError();
  return id;
}

/** The user's id if a session was attached, else undefined — for open routes. */
export function optionalUserId(req: Request): string | undefined {
  return (req as Request & { userId?: string }).userId;
}
