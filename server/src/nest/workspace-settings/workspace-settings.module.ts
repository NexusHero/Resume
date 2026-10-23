import { Body, Controller, Get, Inject, Module, Patch, UseGuards } from '@nestjs/common';
import { updateWorkspaceSettingsSchema } from '../../domain/workspace-settings.js';
import { WorkspaceSettingsService } from '../../services/workspace-settings-service.js';
import type { WorkspaceSettingsStore } from '../../ports/workspace-settings-store.js';
import { AuthGuard } from '../auth.guard.js';
import { Can, RolesGuard } from '../authorization.js';
import { CurrentScope } from '../params.js';
import { ZodValidationPipe } from '../zod-validation.pipe.js';
import { WORKSPACE_SETTINGS_SERVICE, WORKSPACE_SETTINGS_STORE } from '../tokens.js';

/**
 * Per-workspace settings under /api/v1/settings/workspace (ADR-0057). Any
 * authenticated member may read the flag (the nav depends on it); only a
 * workspace admin may flip `vermittlung` (RBAC via `@Can('workspace', 'update')`).
 */
@Controller('api/v1/settings/workspace')
@UseGuards(AuthGuard)
export class WorkspaceSettingsController {
  constructor(
    @Inject(WORKSPACE_SETTINGS_SERVICE) private readonly service: WorkspaceSettingsService,
  ) {}

  @Get()
  get(@CurrentScope() scope: string) {
    return this.service.get(scope);
  }

  @Patch()
  @UseGuards(RolesGuard)
  @Can('workspace', 'update')
  async update(
    @CurrentScope() scope: string,
    @Body(new ZodValidationPipe(updateWorkspaceSettingsSchema))
    body: ReturnType<typeof updateWorkspaceSettingsSchema.parse>,
  ) {
    return this.service.setVermittlung(scope, body.vermittlung);
  }
}

@Module({
  controllers: [WorkspaceSettingsController],
  providers: [
    RolesGuard,
    {
      provide: WORKSPACE_SETTINGS_SERVICE,
      useFactory: (workspaceSettingsStore: WorkspaceSettingsStore) =>
        new WorkspaceSettingsService({ workspaceSettingsStore }),
      inject: [WORKSPACE_SETTINGS_STORE],
    },
  ],
  exports: [WORKSPACE_SETTINGS_SERVICE],
})
export class WorkspaceSettingsModule {}
