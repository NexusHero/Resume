/* Tests for the responsive SettingsView (ADR-0057): the AI-setup and Workspace
   cards render in both postures (desktop rail / mobile tabs), and the
   intermediary switch is present for an admin. The old per-user key rows are
   gone with the central-key model. */
import { describe, it, expect, beforeAll, afterEach, beforeEach, vi } from 'vitest';
import { render } from '@testing-library/react';

let SettingsView;

beforeAll(async () => {
  await import('../use-viewport.jsx');
  await import('../SettingsView.jsx');
  SettingsView = window.SettingsView;
});

afterEach(() => {
  delete window.matchMedia;
  delete window.RecruitApi;
});

function stubMatchMedia(matches) {
  window.matchMedia = vi.fn().mockImplementation((query) => ({
    matches,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
  }));
}

const baseApi = () => ({
  getLlmSettings: vi.fn().mockResolvedValue({
    current: 'claude',
    providers: [{ id: 'claude', label: 'Claude', available: true }],
  }),
  getWorkspaceSettings: vi.fn().mockResolvedValue({ vermittlung: false }),
  updateWorkspaceSettings: vi.fn().mockResolvedValue({ vermittlung: true }),
  getMyProfileName: vi.fn().mockResolvedValue(''),
  authMe: vi.fn().mockResolvedValue({ id: 'me', email: 'me@x.io', roles: ['admin'] }),
  getUsage: vi.fn().mockResolvedValue({ requests: 0 }),
  listMembers: vi.fn().mockResolvedValue([]),
  listInvites: vi.fn().mockResolvedValue([]),
  getRetentionPolicy: vi.fn().mockResolvedValue({ reviewDays: 180, deletionDays: 365, autoAnonymize: false }),
  retentionReport: vi.fn().mockResolvedValue([]),
});

const user = { id: 'me', email: 'me@x.io', verifiedAt: '2026-01-01T00:00:00.000Z' };

describe('SettingsView — responsive cards', () => {
  beforeEach(() => {
    window.RecruitApi = baseApi();
  });

  it('AiSetupAndWorkspaceCards_Desktop_Render', async () => {
    stubMatchMedia(false);
    const { findByText, findByLabelText } = render(<SettingsView user={user} />);
    await findByText('KI-Anbindung');
    await findByLabelText('Vermittlung aktivieren');
  });

  it('AiSetupAndWorkspaceCards_Mobile_Render', async () => {
    stubMatchMedia(true);
    const { findByText, findByLabelText } = render(<SettingsView user={user} />);
    await findByText('KI-Anbindung');
    await findByLabelText('Vermittlung aktivieren');
  });
});
