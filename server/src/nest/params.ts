import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import {
  currentUserId,
  optionalUserId,
  currentRoles,
  currentPrincipal,
  currentScope,
  currentIsSuperAdmin,
} from '../http/current-user.js';

/**
 * Param decorators that expose the authenticated principal to Nest handlers
 * (ADR-0051). They read the exact request fields the `AuthGuard` stamps
 * (`userId`, `roles`, `tenantId`, `isSuperAdmin`), reusing the same
 * `current-user` helpers the Express controllers used — identical semantics,
 * including the `UnauthorizedError` thrown when a required id is missing.
 */
const req = (ctx: ExecutionContext): Request => ctx.switchToHttp().getRequest<Request>();

/** The authenticated user's id (throws 401 if unauthenticated). */
export const CurrentUserId = createParamDecorator((_data: unknown, ctx: ExecutionContext) =>
  currentUserId(req(ctx)),
);

/** The user's id if a session was attached, else undefined — for open routes. */
export const OptionalUserId = createParamDecorator((_data: unknown, ctx: ExecutionContext) =>
  optionalUserId(req(ctx)),
);

/** The acting principal (id + roles) for authorization checks. */
export const CurrentPrincipal = createParamDecorator((_data: unknown, ctx: ExecutionContext) =>
  currentPrincipal(req(ctx)),
);

/** The authenticated user's roles (empty if none stamped). */
export const CurrentRoles = createParamDecorator((_data: unknown, ctx: ExecutionContext) =>
  currentRoles(req(ctx)),
);

/** The owner scope for shared team data (tenant id, or the default tenant). */
export const CurrentScope = createParamDecorator((_data: unknown, ctx: ExecutionContext) =>
  currentScope(req(ctx)),
);

/** Whether the acting user holds the instance-level super-admin capability. */
export const CurrentIsSuperAdmin = createParamDecorator((_data: unknown, ctx: ExecutionContext) =>
  currentIsSuperAdmin(req(ctx)),
);
