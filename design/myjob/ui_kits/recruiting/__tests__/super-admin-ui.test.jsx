/* Tests for the super-admin console card in Settings (ADR-0037/0038): shown only
   to super-admins, lists tenants with a suspend/reactivate toggle, and expands a
   tenant to re-role its members. */
import { describe, it, expect, beforeAll, afterEach, beforeEach, vi } from 'vitest';
import { render, fireEvent, waitFor } from '@testing-library/react';

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

// The other Settings cards fire these; a super-admin is also a normal admin.
const baseApi = (isSuperAdmin) => ({
  getLlmSettings: vi.fn().mockResolvedValue({ current: '', providers: [] }),
  getApiKeyStatus: vi.fn().mockResolvedValue({}),
    getMyProfileName: vi.fn().mockResolvedValue(''),
  getUsage: vi.fn().mockResolvedValue({ requests: 0 }),
  listMembers: vi.fn().mockResolvedValue([]),
  listInvites: vi.fn().mockResolvedValue([]),
  getRetentionPolicy: vi.fn().mockResolvedValue({ reviewDays: 180, deletionDays: 365, autoAnonymize: false }),
  retentionReport: vi.fn().mockResolvedValue([]),
  authMe: vi.fn().mockResolvedValue({ id: 'me', email: 'root@x.io', roles: ['admin'], isSuperAdmin }),
});

describe('SettingsView — super-admin console', () => {
  it('NonSuperAdmin_DoesNotSeeTheConsole', async () => {
    window.RecruitApi = { ...baseApi(false) };
    const { findByText, queryByText } = render(<SettingsView user={{ id: 'me' }} />);
    await findByText('AI models & API keys');
    await waitFor(() => expect(window.RecruitApi.authMe).toHaveBeenCalled());
    expect(queryByText('Platform — all workspaces')).toBeNull();
  });

  it('SuperAdmin_ListsTenants_AndSuspends', async () => {
    const setTenantStatus = vi.fn().mockResolvedValue({ id: 't1', status: 'suspended' });
    window.RecruitApi = {
      ...baseApi(true),
      listTenants: vi
        .fn()
        .mockResolvedValueOnce([
          { id: 't1', name: 'Acme', status: 'active', memberCount: 3 },
          { id: 'team', name: 'Default team', status: 'active', memberCount: 1 },
        ])
        .mockResolvedValue([
          { id: 't1', name: 'Acme', status: 'suspended', memberCount: 3 },
          { id: 'team', name: 'Default team', status: 'active', memberCount: 1 },
        ]),
      setTenantStatus,
    };
    const { findByText, getAllByRole } = render(<SettingsView user={{ id: 'me' }} />);
    await findByText('Platform — all workspaces');
    await findByText(/Acme/);

    // Suspend the first tenant (the default team's button is disabled).
    const suspendBtn = getAllByRole('button', { name: 'Suspend' })[0];
    fireEvent.click(suspendBtn);
    await waitFor(() => expect(setTenantStatus).toHaveBeenCalledWith('t1', 'suspended'));
    await findByText('Reactivate'); // row reflects the reloaded suspended status
  });

  it('SuperAdmin_ExpandsTenant_AndRerolesAMember', async () => {
    const setTenantMemberRoles = vi.fn().mockResolvedValue({ id: 'u1', email: 'a@acme.io', roles: ['admin', 'recruiter'] });
    window.RecruitApi = {
      ...baseApi(true),
      listTenants: vi.fn().mockResolvedValue([{ id: 't1', name: 'Acme', status: 'active', memberCount: 1 }]),
      listTenantMembers: vi.fn().mockResolvedValue([{ id: 'u1', email: 'a@acme.io', roles: ['recruiter'] }]),
      setTenantMemberRoles,
    };
    const { findByText, getByText, getByRole } = render(<SettingsView user={{ id: 'me' }} />);
    await findByText('Platform — all workspaces');
    fireEvent.click(getByText(/Acme/)); // expand the tenant row
    await findByText('a@acme.io');

    // Grant the 'admin' role to the member.
    fireEvent.click(getByRole('checkbox', { name: 'admin role for a@acme.io' }));
    await waitFor(() =>
      expect(setTenantMemberRoles).toHaveBeenCalledWith('t1', 'u1', ['recruiter', 'admin']),
    );
  });
});
