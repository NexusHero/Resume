/* AppShell agent-action visibility (ADR-0062 §6.7): the Chat-Agent entry is a
   main-path companion — always visible, NOT vermittlung-gated; the CoRecruiter
   action remains gated. On mobile the agent action is icon-only. */
import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest';
import { render, waitFor } from '@testing-library/react';

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
    AppShell: ({ nav = [], actions, children }) => (
      <div>
        <div>
          {nav.map((n) => (
            <span key={n.id} data-nav>
              {n.label}
            </span>
          ))}
        </div>
        <div data-actions>{actions}</div>
        {children}
      </div>
    ),
  });
  await import('../workspace-settings.js');
  await import('../use-workspace-settings.jsx');
  await import('../use-viewport.jsx');
  await import('../data.js');
  await import('../Workspace.jsx');
  await import('../ChatPanel.jsx');
  await import('../app.jsx');
  Workspace = window.Workspace;
});

afterEach(() => {
  delete window.RecruitApi;
});

describe('AppShell agent action', () => {
  it('AppShell_AgentAction_VisibleWithoutVermittlung', async () => {
    window.RecruitApi = emptyApi(false);
    window.WorkspaceSettings.reset();
    const { container } = render(
      <Workspace user={{ id: 'u1', email: 'u1@x.io', roles: ['recruiter'] }} onLogout={() => {}} />,
    );
    await waitFor(() => expect(window.RecruitApi.getWorkspaceSettings).toHaveBeenCalled());
    await waitFor(() =>
      expect(container.querySelector('[data-actions]').textContent).toContain('Agent'),
    );
    // The CoRecruiter action is vermittlung-gated and must not appear.
    expect(container.textContent).not.toContain('CoRecruiter');
  });

  it('AppShell_AgentAction_Mobile_RendersIconOnly', async () => {
    window.useViewport = () => ({ isMobile: true });
    window.RecruitApi = emptyApi(false);
    window.WorkspaceSettings.reset();
    const { container } = render(
      <Workspace user={{ id: 'u1', email: 'u1@x.io', roles: ['recruiter'] }} onLogout={() => {}} />,
    );
    await waitFor(() => expect(window.RecruitApi.getWorkspaceSettings).toHaveBeenCalled());
    await waitFor(() =>
      expect(container.querySelector('[data-actions]').textContent).not.toContain('Agent'),
    );
    // Icon-only: no text label on the narrow app bar.
    expect(container.querySelector('[data-actions]').textContent).toBe('');
    delete window.useViewport;
  });
});
