/* AK-0.3 — the intermediary switch is admin-only and persists through the API. */
import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest';
import { render, fireEvent, waitFor, screen } from '@testing-library/react';

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

const baseApi = (roles) => ({
  getLlmSettings: vi.fn().mockResolvedValue({ current: 'claude', providers: [] }),
  getWorkspaceSettings: vi.fn().mockResolvedValue({ vermittlung: false }),
  setWorkspaceSettings: vi.fn().mockResolvedValue({ vermittlung: true }),
  getMyProfileName: vi.fn().mockResolvedValue(''),
  getUsage: vi.fn().mockResolvedValue({ requests: 0 }),
  listMembers: vi.fn().mockResolvedValue([]),
  listInvites: vi.fn().mockResolvedValue([]),
  getRetentionPolicy: vi.fn().mockResolvedValue({ reviewDays: 180, deletionDays: 365, autoAnonymize: false }),
  retentionReport: vi.fn().mockResolvedValue([]),
  authMe: vi.fn().mockResolvedValue({ id: 'me', email: 'me@x.io', roles }),
});

describe('SettingsView — Workspace switch (AK-0.3)', () => {
  it('SettingsToggle_AsAdmin_RendersAndToggles', async () => {
    window.RecruitApi = baseApi(['admin']);
    render(<SettingsView user={{ id: 'me' }} />);
    const toggle = await screen.findByLabelText('Vermittlung aktivieren');
    fireEvent.click(toggle);
    await waitFor(() =>
      expect(window.RecruitApi.setWorkspaceSettings).toHaveBeenCalledWith({ vermittlung: true }),
    );
  });

  it('SettingsToggle_AsRecruiter_NotRendered', async () => {
    window.RecruitApi = baseApi(['recruiter']);
    render(<SettingsView user={{ id: 'me' }} />);
    await screen.findByText('KI-Einrichtung');
    await waitFor(() => expect(window.RecruitApi.authMe).toHaveBeenCalled());
    expect(screen.queryByLabelText('Vermittlung aktivieren')).toBeNull();
  });
});
