/* WorkspaceSettings store — the `aiConsent` field travels with `vermittlung`
   and defaults to false in the unknown/error state (ADR-0063). */
import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';

beforeAll(async () => {
  await import('../workspace-settings.js');
});

beforeEach(() => {
  window.WorkspaceSettings.reset();
  delete window.RecruitApi;
});

describe('workspace-settings store (aiConsent)', () => {
  it('WorkspaceSettings_Get_DefaultsAiConsentFalse', () => {
    const state = window.WorkspaceSettings.get();
    expect(state.aiConsent).toBe(false);
    expect(state.vermittlung).toBe(false);
    expect(state.status).toBe('unknown');
  });

  it('WorkspaceSettings_Set_MapsAiConsent', async () => {
    window.RecruitApi = {
      updateWorkspaceSettings: vi.fn().mockResolvedValue({ vermittlung: false, aiConsent: true }),
    };
    const state = await window.WorkspaceSettings.set({ aiConsent: true });
    expect(state.aiConsent).toBe(true);
    expect(state.status).toBe('loaded');
  });

  it('WorkspaceSettings_Refresh_ReadsAiConsentFromServer', async () => {
    window.RecruitApi = {
      getWorkspaceSettings: vi.fn().mockResolvedValue({ vermittlung: false, aiConsent: true }),
    };
    const state = await window.WorkspaceSettings.refresh();
    expect(state.aiConsent).toBe(true);
    expect(state.vermittlung).toBe(false);
  });
});
