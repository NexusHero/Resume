import {
  Inject,
  Injectable,
  SetMetadata,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { FEATURE_NOT_ENABLED_DETAIL } from '../domain/workspace-settings.js';
import { NotFoundError } from '../domain/errors.js';
import { currentScope } from '../http/current-user.js';
import type { WorkspaceSettingsService } from '../services/workspace-settings-service.js';
import { WORKSPACE_SETTINGS_SERVICE } from './tokens.js';

export const REQUIRES_VERMITTLUNG = 'requires:vermittlung';

/**
 * Marks an intermediary route. The marker (not a per-route guard) keeps the
 * whole chain on the class, so `VermittlungGuard` always runs directly after
 * `AuthGuard` (ADR-0057, plan §3.5).
 */
export const RequiresVermittlung = () => SetMetadata(REQUIRES_VERMITTLUNG, true);

/**
 * Hides intermediary routes when the workspace switch is off. It answers 404,
 * not 403: the route does not exist in an application-first workspace. Runs
 * after `AuthGuard` (it reads the stamped scope); no-op without the marker.
 */
@Injectable()
export class VermittlungGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @Inject(WORKSPACE_SETTINGS_SERVICE) private readonly settings: WorkspaceSettingsService,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<boolean | undefined>(REQUIRES_VERMITTLUNG, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (!required) return true;
    const req = ctx.switchToHttp().getRequest<Request>();
    if (!(await this.settings.isVermittlungEnabled(currentScope(req)))) {
      throw new NotFoundError(FEATURE_NOT_ENABLED_DETAIL);
    }
    return true;
  }
}
