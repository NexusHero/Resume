import { WorkspaceSettingsService } from '../../src/services/workspace-settings-service.js';
import { InMemoryWorkspaceSettingsStore } from '../support/fakes.js';

describe('WorkspaceSettingsService', () => {
  const build = (store = new InMemoryWorkspaceSettingsStore()) => ({
    service: new WorkspaceSettingsService({ workspaceSettingsStore: store }),
    store,
  });

  it('WorkspaceSettingsService_NoStoredSettings_ReturnsVermittlungOff', async () => {
    const { service } = build();
    expect(await service.get('team')).toEqual({ vermittlung: false });
    expect(await service.isVermittlungEnabled('team')).toBe(false);
  });

  it('WorkspaceSettingsService_UpdateVermittlung_PersistsAndReturnsNewState', async () => {
    const { service, store } = build();
    expect(await service.update('team', { vermittlung: true })).toEqual({ vermittlung: true });
    expect(await store.get('team')).toEqual({ vermittlung: true });
    expect(await service.update('team', { vermittlung: false })).toEqual({ vermittlung: false });
  });

  it('WorkspaceSettingsService_UpdateInOneWorkspace_DoesNotAffectAnother', async () => {
    const { service } = build();
    await service.update('a', { vermittlung: true });
    expect(await service.get('b')).toEqual({ vermittlung: false });
  });

  it('WorkspaceSettingsService_StoredPartialObject_MergesDefaults', async () => {
    const store = new InMemoryWorkspaceSettingsStore();
    await store.set('team', {} as never);
    const { service } = build(store);
    expect(await service.get('team')).toEqual({ vermittlung: false });
  });

  it('WorkspaceSettingsService_FilterVermittlungEnabled_KeepsOnlyEnabledScopes', async () => {
    const { service } = build();
    await service.update('a', { vermittlung: true });
    await service.update('c', { vermittlung: true });
    expect(await service.filterVermittlungEnabled(['a', 'b', 'c'])).toEqual(['a', 'c']);
  });
});
