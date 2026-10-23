import 'reflect-metadata';
import { Reflector } from '@nestjs/core';
import type { ExecutionContext } from '@nestjs/common';
import { NotFoundError } from '../../src/domain/errors.js';
import { FEATURE_NOT_ENABLED_DETAIL } from '../../src/domain/workspace-settings.js';
import {
  REQUIRES_VERMITTLUNG,
  RequiresVermittlung,
  VermittlungGuard,
} from '../../src/nest/vermittlung.guard.js';
import { WorkspaceSettingsService } from '../../src/services/workspace-settings-service.js';
import { InMemoryWorkspaceSettingsStore } from '../support/fakes.js';

class MetaController {
  @RequiresVermittlung()
  gated() {}

  open() {}
}

const ctxFor = (handler: () => void, scope = 'team'): ExecutionContext =>
  ({
    getHandler: () => handler,
    getClass: () => MetaController,
    switchToHttp: () => ({ getRequest: () => ({ tenantId: scope }) }),
  }) as unknown as ExecutionContext;

describe('VermittlungGuard', () => {
  const build = async (vermittlung: boolean, scope = 'team') => {
    const store = new InMemoryWorkspaceSettingsStore();
    await store.set(scope, { vermittlung });
    const settings = new WorkspaceSettingsService({ workspaceSettingsStore: store });
    return new VermittlungGuard(new Reflector(), settings);
  };

  it('VermittlungGuard_SwitchOff_ThrowsNotFound', async () => {
    const guard = await build(false);
    await expect(guard.canActivate(ctxFor(MetaController.prototype.gated))).rejects.toMatchObject({
      message: FEATURE_NOT_ENABLED_DETAIL,
    });
  });

  it('VermittlungGuard_SwitchOn_AllowsRequest', async () => {
    const guard = await build(true);
    await expect(guard.canActivate(ctxFor(MetaController.prototype.gated))).resolves.toBe(true);
  });

  it('VermittlungGuard_RouteWithoutMetadata_AllowsRequest', async () => {
    const guard = await build(false);
    await expect(guard.canActivate(ctxFor(MetaController.prototype.open))).resolves.toBe(true);
  });

  it('VermittlungGuard_SwitchOnOnlyForOtherWorkspace_ThrowsNotFound', async () => {
    const guard = await build(true, 'other');
    await expect(
      guard.canActivate(ctxFor(MetaController.prototype.gated, 'team')),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it('VermittlungGuard_MethodMetadataOnMixedController_GatesOnlyThatMethod', async () => {
    const guard = await build(false);
    expect(Reflect.getMetadata(REQUIRES_VERMITTLUNG, MetaController.prototype.gated)).toBe(true);
    expect(
      Reflect.getMetadata(REQUIRES_VERMITTLUNG, MetaController.prototype.open),
    ).toBeUndefined();
    await expect(guard.canActivate(ctxFor(MetaController.prototype.open))).resolves.toBe(true);
  });
});
