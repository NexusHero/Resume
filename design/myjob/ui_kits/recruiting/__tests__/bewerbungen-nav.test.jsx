/* AK-2.8 / Q1 — the "Bewerbungen" nav shows the new list; the frozen Pipeline
   board is reachable only as a "Pipeline" sub-tab when Vermittlung is on. */
import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

let Workspace;

function emptyApi(vermittlung) {
  const empty = () => Promise.resolve([]);
  return {
    getWorkspaceSettings: vi.fn().mockResolvedValue({ vermittlung }),
    listMandates: vi.fn(empty),
    listTalents: vi.fn(empty),
    listPlacements: vi.fn(empty),
    listApplications: vi.fn(empty),
    listJobPostings: vi.fn(empty),
    listJobApplications: vi.fn(empty),
    getTalentDocuments: vi.fn().mockResolvedValue(null),
  };
}

beforeAll(async () => {
  globalThis.installDesignSystem({
    AppShell: ({ nav = [], onNav, settingsLabel, children }) => (
      <div>
        <div>
          {nav.map((n) => (
            <button key={n.id} data-nav onClick={() => onNav && onNav(n.id)}>
              {n.label}
            </button>
          ))}
        </div>
        <span data-settings>{settingsLabel}</span>
        {children}
      </div>
    ),
    Tabs: ({ tabs = [], onChange }) => (
      <div data-tabs>
        {tabs.map((t) => (
          <button key={t.id} data-tab={t.id} onClick={() => onChange && onChange(t.id)}>
            {t.label}
          </button>
        ))}
      </div>
    ),
  });
  await import('../workspace-settings.js');
  await import('../use-workspace-settings.jsx');
  await import('../use-viewport.jsx');
  await import('../data.js');
  await import('../Workspace.jsx');
  await import('../Bewerbungen.jsx');
  await import('../app.jsx');
  Workspace = window.Workspace;
});

afterEach(() => {
  delete window.RecruitApi;
});

describe('Bewerbungen nav (AK-2.8 / Q1)', () => {
  it('BewerbungenNav_VermittlungOff_ShowsOnlyNewList', async () => {
    window.RecruitApi = emptyApi(false);
    window.WorkspaceSettings.reset();
    render(
      <Workspace user={{ id: 'u1', email: 'u1@x.io', roles: ['recruiter'] }} onLogout={() => {}} />,
    );
    await waitFor(() => expect(window.RecruitApi.getWorkspaceSettings).toHaveBeenCalled());

    const bewerbungen = [...document.querySelectorAll('[data-nav]')].find(
      (el) => el.textContent === 'Bewerbungen',
    );
    await userEvent.click(bewerbungen);

    // No "Pipeline" sub-tab when Vermittlung is off.
    await waitFor(() => expect(document.querySelector('[data-tabs]')).toBeNull());
  });

  it('BewerbungenNav_VermittlungOn_ShowsPipelineSubTab', async () => {
    window.RecruitApi = emptyApi(true);
    window.WorkspaceSettings.reset();
    render(
      <Workspace user={{ id: 'u1', email: 'u1@x.io', roles: ['admin'] }} onLogout={() => {}} />,
    );
    await waitFor(() => expect(window.RecruitApi.getWorkspaceSettings).toHaveBeenCalled());

    const bewerbungen = [...document.querySelectorAll('[data-nav]')].find(
      (el) => el.textContent === 'Bewerbungen',
    );
    await userEvent.click(bewerbungen);

    await waitFor(() => expect(document.querySelector('[data-tabs]')).toContainHTML('Pipeline'));
    expect(document.querySelector('[data-tabs]')).toContainHTML('Bewerbungen');
  });
});
