import { Body, Controller, Get, Global, Inject, Module, Patch, UseGuards } from '@nestjs/common';
import { updateWorkspaceSettingsSchema } from '../../domain/workspace-settings.js';
import { WorkspaceSettingsService } from '../../services/workspace-settings-service.js';
import type { WorkspaceSettingsStore } from '../../ports/workspace-settings-store.js';
import type { Logger } from '../../ports/logger.js';
import { AuthGuard } from '../auth.guard.js';
import { Can, RolesGuard } from '../authorization.js';
import { CurrentScope, CurrentUserId } from '../params.js';
import { ZodValidationPipe } from '../zod-validation.pipe.js';
import { LOGGER, WORKSPACE_SETTINGS_SERVICE, WORKSPACE_SETTINGS_STORE } from '../tokens.js';

/**
 * Per-workspace settings under /api/v1/settings/workspace (ADR-0057). Any
 * authenticated member may read the flag (the navigation depends on it); only a
 * workspace admin may change it (`@Can('workspace','configure')`; a super-admin
 * without the tenant role does not qualify).
 */
@Controller('api/v1/settings/workspace')
@UseGuards(AuthGuard)
export class WorkspaceSettingsController {
  constructor(
    @Inject(WORKSPACE_SETTINGS_SERVICE) private readonly service: WorkspaceSettingsService,
    @Inject(LOGGER) private readonly logger: Logger,
  ) {}

  @Get()
  get(@CurrentScope() scope: string) {
    return this.service.get(scope);
  }

  @Patch()
  @UseGuards(RolesGuard)
  @Can('workspace', 'configure')
  async update(
    @CurrentScope() scope: string,
    @CurrentUserId() userId: string,
    @Body(new ZodValidationPipe(updateWorkspaceSettingsSchema))
    body: ReturnType<typeof updateWorkspaceSettingsSchema.parse>,
  ) {
    const next = await this.service.update(scope, body);
    this.logger.info({ scope, userId, vermittlung: next.vermittlung }, 'workspace setting changed');
    return next;
  }
}

/**
 * Global so every guard (VermittlungGuard) and slice can inject the settings
 * service without re-importing the module in each feature module.
 */
@Global()
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
