import {
  Injectable,
  Inject,
  SetMetadata,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { currentPrincipal, currentIsSuperAdmin } from '../http/current-user.js';
import { ForbiddenError } from '../domain/errors.js';
import type { Authorizer } from '../ports/authorizer.js';
import { AUTHORIZER } from './tokens.js';

export const CAN_KEY = 'can:permission';

/**
 * Declares the RBAC permission a route requires (ADR-0051 port of `requireCan`):
 * `@Can('member', 'invite')`. The RolesGuard reads it and runs the Authorizer at
 * the route edge, so admin-only routes stay declarative instead of each handler
 * re-checking by hand.
 */
export const Can = (kind: string, action: string) => SetMetadata(CAN_KEY, { kind, action });

/** Enforces the `@Can(...)` permission via the RBAC Authorizer (403 on refusal). */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    @Inject(AUTHORIZER) private readonly authorizer: Authorizer,
    private readonly reflector: Reflector,
  ) {}

  canActivate(ctx: ExecutionContext): boolean {
    const meta = this.reflector.getAllAndOverride<{ kind: string; action: string } | undefined>(
      CAN_KEY,
      [ctx.getHandler(), ctx.getClass()],
    );
    if (!meta) return true; // no @Can on this route — nothing to enforce
    const req = ctx.switchToHttp().getRequest<Request>();
    if (!this.authorizer.check(currentPrincipal(req), { kind: meta.kind }, meta.action)) {
      throw new ForbiddenError();
    }
    return true;
  }
}

/** Gates a route to the instance-level super-admin (ADR-0037): 403 otherwise. */
@Injectable()
export class SuperAdminGuard implements CanActivate {
  canActivate(ctx: ExecutionContext): boolean {
    if (!currentIsSuperAdmin(ctx.switchToHttp().getRequest<Request>())) throw new ForbiddenError();
    return true;
  }
}
