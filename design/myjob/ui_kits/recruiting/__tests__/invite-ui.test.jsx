/* Tests for the tenant-invitation UI (ADR-0035): the login screen's accept-invite
   mode (opened via ?invite_token=) and the admin "Invite a colleague" card in
   Settings. */
import { describe, it, expect, beforeAll, afterEach, beforeEach, vi } from 'vitest';
import { render, fireEvent, waitFor } from '@testing-library/react';

let LoginScreen;
let SettingsView;

beforeAll(async () => {
  await import('../use-viewport.jsx');
  await import('../Login.jsx');
  await import('../SettingsView.jsx');
  LoginScreen = window.LoginScreen;
  SettingsView = window.SettingsView;
});

afterEach(() => {
  delete window.RecruitApi;
  try {
    window.history.replaceState({}, '', '/');
  } catch {
    /* ignore */
  }
});

describe('LoginScreen — accept invite', () => {
  it('InviteToken_ShowsAcceptMode_SubmitsPasswordAndAuthenticates', async () => {
    window.history.replaceState({}, '', '/?invite_token=tok123');
    const onAuthed = vi.fn();
    window.RecruitApi = {
      acceptInvite: vi.fn().mockResolvedValue({ id: 'u1', email: 'new@acme.io' }),
    };
    const { container, getByRole } = render(
      <LoginScreen providers={{}} onAuthed={onAuthed} />,
    );
    // Accept-invite headline, and no email field (the token carries the address).
    expect(getByRole('heading', { name: 'Einladung annehmen' })).toBeInTheDocument();
    expect(container.querySelector('input[type="email"]')).toBeNull();

    const pw = container.querySelectorAll('input[type="password"]');
    expect(pw).toHaveLength(2); // password + confirm
    fireEvent.change(pw[0], { target: { value: 'a fine long passphrase' } });
    fireEvent.change(pw[1], { target: { value: 'a fine long passphrase' } });
    fireEvent.click(getByRole('button', { name: 'Einladung annehmen' }));

    await waitFor(() =>
      expect(window.RecruitApi.acceptInvite).toHaveBeenCalledWith('tok123', 'a fine long passphrase'),
    );
    await waitFor(() => expect(onAuthed).toHaveBeenCalledWith({ id: 'u1', email: 'new@acme.io' }));
  });

  it('NoInviteToken_ShowsNormalLogin', () => {
    const { getByText, container } = render(<LoginScreen providers={{}} onAuthed={vi.fn()} />);
    expect(getByText('Willkommen zurück')).toBeInTheDocument();
    expect(container.querySelector('input[type="email"]')).not.toBeNull();
  });
});

describe('SettingsView — Invite a colleague card', () => {
  const baseApi = () => ({
    getLlmSettings: vi.fn().mockResolvedValue({ current: '', providers: [] }),
    getApiKeyStatus: vi.fn().mockResolvedValue({}),
    getMyProfileName: vi.fn().mockResolvedValue(''),
    getUsage: vi.fn().mockResolvedValue({ requests: 0 }),
    listMembers: vi.fn().mockResolvedValue([]),
    listInvites: vi.fn().mockResolvedValue([]),
    getRetentionPolicy: vi.fn().mockResolvedValue({ reviewDays: 180, deletionDays: 365, autoAnonymize: false }),
    retentionReport: vi.fn().mockResolvedValue([]),
  });

  beforeEach(() => {
    window.matchMedia = undefined; // useViewport degrades to desktop
  });

  it('Admin_SeesInviteForm_CreatesInviteAndShowsLink', async () => {
    window.RecruitApi = {
      ...baseApi(),
      authMe: vi.fn().mockResolvedValue({ id: 'me', email: 'boss@acme.io', roles: ['admin'] }),
      createInvite: vi
        .fn()
        .mockResolvedValue({ invite: { email: 'x@acme.io', roles: ['recruiter'] }, acceptUrl: 'http://app/accept?invite_token=zzz' }),
    };
    const { findByText, getByLabelText, getByRole } = render(<SettingsView user={{ id: 'me' }} />);
    await findByText('Kolleg:in einladen');

    fireEvent.change(getByLabelText('E-Mail für Einladung'), { target: { value: 'x@acme.io' } });
    fireEvent.click(getByRole('button', { name: 'Einladung senden' }));

    await waitFor(() =>
      expect(window.RecruitApi.createInvite).toHaveBeenCalledWith('x@acme.io', ['recruiter']),
    );
    // The returned accept link is surfaced for offline sharing.
    await waitFor(() =>
      expect(getByLabelText('Einladungslink')).toHaveValue('http://app/accept?invite_token=zzz'),
    );
  });

  it('NonAdmin_DoesNotSeeInviteCard', async () => {
    window.RecruitApi = {
      ...baseApi(),
      authMe: vi.fn().mockResolvedValue({ id: 'me', email: 'r@acme.io', roles: ['recruiter'] }),
    };
    const { findByText, queryByText } = render(<SettingsView user={{ id: 'me' }} />);
    await findByText('KI-Modelle & API-Schlüssel'); // settings rendered
    await waitFor(() => expect(window.RecruitApi.authMe).toHaveBeenCalled());
    expect(queryByText('Kolleg:in einladen')).toBeNull();
  });
});
