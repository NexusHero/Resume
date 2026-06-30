import type { Request } from 'express';
import { UnauthorizedError } from '../domain/errors';

/** The authenticated user's id, attached to the request by AuthController.requireAuth. */
export function currentUserId(req: Request): string {
  const id = (req as Request & { userId?: string }).userId;
  if (!id) throw new UnauthorizedError();
  return id;
}
