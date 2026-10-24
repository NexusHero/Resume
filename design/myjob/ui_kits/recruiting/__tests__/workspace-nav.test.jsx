/* AK-0.1 — a fresh workspace's rail shows only the application-first
   destinations, and the intermediary ones appear only when `vermittlung` is on
   (ADR-0057). The AppShell stub is overridden to render the nav labels. */
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

const navLabels = (container) =>
  [...container.querySelectorAll('[data-nav]')].map((el) => el.textContent);

beforeAll(async () => {
  globalThis.installDesignSystem({
    AppShell: ({ nav = [], settingsLabel, children }) => (
      <div>
        <div>
          {nav.map((n) => (
            <span key={n.id} data-nav>
              {n.label}
            </span>
          ))}
        </div>
        <span data-settings>{settingsLabel}</span>
        {children}
      </div>
    ),
  });
  await import('../workspace-settings.js');
  await import('../use-workspace-settings.jsx');
  await import('../use-viewport.jsx');
  await import('../data.js');
  await import('../Workspace.jsx');
  await import('../app.jsx');
  Workspace = window.Workspace;
});

afterEach(() => {
  delete window.RecruitApi;
});

describe('Workspace rail (AK-0.1)', () => {
  it('Nav_FreshWorkspace_RendersOnlyFiveDestinations', async () => {
    window.RecruitApi = emptyApi(false);
    window.WorkspaceSettings.reset();
    const { container } = render(<Workspace user={{ id: 'u1', email: 'u1@x.io', roles: ['recruiter'] }} onLogout={() => {}} />);
    await waitFor(() => expect(window.RecruitApi.getWorkspaceSettings).toHaveBeenCalled());
    await waitFor(() => expect(navLabels(container).length).toBeGreaterThan(0));

    expect(navLabels(container)).toEqual(['Workspace', 'Mandanten', 'Stellen', 'Bewerbungen']);
    // Settings is the foot utility — the fifth destination.
    expect(container.querySelector('[data-settings]').textContent).toBe('Einstellungen');
    // No intermediary destinations.
    for (const label of ['Suchaufträge', 'Performance', 'Postfach']) {
      expect(navLabels(container)).not.toContain(label);
    }
  });

  it('Nav_VermittlungOn_RendersAgencyEntries', async () => {
    window.RecruitApi = emptyApi(true);
    window.WorkspaceSettings.reset();
    const { container } = render(<Workspace user={{ id: 'u1', email: 'u1@x.io', roles: ['admin'] }} onLogout={() => {}} />);
    await waitFor(() => expect(navLabels(container)).toContain('Suchaufträge'));
    expect(navLabels(container)).toEqual([
      'Workspace',
      'Mandanten',
      'Stellen',
      'Bewerbungen',
      'Suchaufträge',
      'Performance',
      'Postfach',
    ]);
  });
});
