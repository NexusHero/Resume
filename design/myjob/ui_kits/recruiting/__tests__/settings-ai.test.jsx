/* AK-0.6 — without a central key the settings surface says "KI nicht
   eingerichtet" and offers no per-user key input (ADR-0057). */
import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

let SettingsView;

beforeAll(async () => {
  await import('../use-viewport.jsx');
  await import('../SettingsView.jsx');
  SettingsView = window.SettingsView;
});

afterEach(() => {
  delete window.RecruitApi;
  delete window.matchMedia;
});

const baseApi = () => ({
  getLlmSettings: vi.fn().mockResolvedValue({ current: 'claude', providers: [{ id: 'claude', label: 'Claude', available: false }] }),
  getWorkspaceSettings: vi.fn().mockResolvedValue({ vermittlung: false }),
  setWorkspaceSettings: vi.fn().mockResolvedValue({ vermittlung: true }),
  getMyProfileName: vi.fn().mockResolvedValue(''),
  getUsage: vi.fn().mockResolvedValue({ requests: 0 }),
  listMembers: vi.fn().mockResolvedValue([]),
  listInvites: vi.fn().mockResolvedValue([]),
  getRetentionPolicy: vi.fn().mockResolvedValue({ reviewDays: 180, deletionDays: 365, autoAnonymize: false }),
  retentionReport: vi.fn().mockResolvedValue([]),
  authMe: vi.fn().mockResolvedValue({ id: 'me', email: 'me@x.io', roles: ['admin'] }),
});

describe('SettingsView — AI setup (AK-0.6)', () => {
  it('AiSetupCard_NoKey_ShowsNotConfiguredWithLink', async () => {
    window.RecruitApi = baseApi();
    const { findByText } = render(<SettingsView user={{ id: 'me' }} />);
    await findByText(/KI nicht eingerichtet/);
    // The card points at the env var, which is the only place to configure it.
    await findByText(/ANTHROPIC_API_KEY/);
  });

  it('AiSetupCard_NoKey_NoKeyInputRendered', async () => {
    window.RecruitApi = baseApi();
    const { container, findByText, queryByText } = render(<SettingsView user={{ id: 'me' }} />);
    await findByText(/KI nicht eingerichtet/);
    // The old per-user key input (type=password) and save button are gone.
    expect(container.querySelector('input[type="password"]')).toBeNull();
    expect(queryByText('Schlüssel speichern')).toBeNull();
  });
});
