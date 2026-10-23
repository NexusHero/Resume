import { Inject, Injectable, type CanActivate, type ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import { NotFoundError } from '../domain/errors.js';
import { currentScope } from '../http/current-user.js';
import type { WorkspaceSettingsStore } from '../ports/workspace-settings-store.js';
import { WORKSPACE_SETTINGS_STORE } from './tokens.js';

/**
 * Hides the intermediary ("Vermittlung") feature routes when the workspace has
 * the switch off (ADR-0057). It answers `404`, not `403`: the route simply does
 * not exist in an application-first workspace. It must run **after**
 * `AuthGuard` (it reads the stamped tenant scope). Wired per controller/handler.
 */
@Injectable()
export class VermittlungGuard implements CanActivate {
  constructor(@Inject(WORKSPACE_SETTINGS_STORE) private readonly store: WorkspaceSettingsStore) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest<Request>();
    const settings = await this.store.get(currentScope(req));
    if (!settings?.vermittlung) throw new NotFoundError('Unknown endpoint.');
    return true;
  }
}
