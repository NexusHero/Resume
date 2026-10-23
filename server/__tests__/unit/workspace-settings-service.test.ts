import { WorkspaceSettingsService } from '../../src/services/workspace-settings-service.js';
import { InMemoryWorkspaceSettingsStore } from '../support/fakes.js';

describe('WorkspaceSettingsService', () => {
  it('WorkspaceSettingsService_GetMissingRow_ReturnsVermittlungFalse', async () => {
    const service = new WorkspaceSettingsService({
      workspaceSettingsStore: new InMemoryWorkspaceSettingsStore(),
    });
    expect(await service.get('team')).toEqual({ vermittlung: false });
  });

  it('WorkspaceSettingsService_SetVermittlung_PersistsThroughStore', async () => {
    const store = new InMemoryWorkspaceSettingsStore();
    const service = new WorkspaceSettingsService({ workspaceSettingsStore: store });

    expect(await service.setVermittlung('team', true)).toEqual({ vermittlung: true });
    expect(await store.get('team')).toEqual({ vermittlung: true });
    expect(await service.get('team')).toEqual({ vermittlung: true });

    // Switching it back off persists too.
    await service.setVermittlung('team', false);
    expect(await service.get('team')).toEqual({ vermittlung: false });
  });
});
