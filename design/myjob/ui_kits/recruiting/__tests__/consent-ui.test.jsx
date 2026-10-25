/* AI consent UI (ADR-0063): the shared dialog before the first AI transmission,
   the ChatPanel block, and the settings revoke. */
import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import { render, fireEvent, screen, waitFor, act } from '@testing-library/react';

let ChatPanel;
let SettingsView;

beforeAll(async () => {
  globalThis.installDesignSystem();
  await import('../workspace-settings.js');
  await import('../use-workspace-settings.jsx');
  await import('../ai-status.js');
  await import('../use-ai-status.jsx');
  await import('../AiGate.jsx');
  await import('../data.js');
  await import('../ChatPanel.jsx');
  await import('../SettingsView.jsx');
  ChatPanel = window.ChatPanel;
  SettingsView = window.SettingsView;
});

beforeEach(() => {
  window.WorkspaceSettings.reset();
  delete window.RecruitApi;
  delete window.useAiStatus;
  delete window.matchMedia;
});

function mockApi(overrides = {}) {
  return {
    getWorkspaceSettings: vi.fn().mockResolvedValue({ vermittlung: false, aiConsent: false }),
    updateWorkspaceSettings: vi.fn().mockResolvedValue({ vermittlung: false, aiConsent: true }),
    authMe: vi.fn().mockResolvedValue({ id: 'me', email: 'me@x.io', roles: ['admin'] }),
    getLlmSettings: vi.fn().mockResolvedValue({
      configured: true,
      current: 'claude',
      providers: [{ id: 'claude', available: true }],
    }),
    agentChat: vi.fn(async () => {}),
    agentListSessions: vi.fn().mockResolvedValue([]),
    agentGetSession: vi.fn().mockResolvedValue({ messages: [], usage: null }),
    agentDeleteSession: vi.fn().mockResolvedValue(undefined),
    agentAbort: vi.fn().mockResolvedValue({ status: 'aborted' }),
    // SettingsView cards below read these on mount.
    getMyProfileName: vi.fn().mockResolvedValue(''),
    getUsage: vi.fn().mockResolvedValue({ requests: 0 }),
    listMembers: vi.fn().mockResolvedValue([]),
    listInvites: vi.fn().mockResolvedValue([]),
    getRetentionPolicy: vi.fn().mockResolvedValue({
      reviewDays: 180,
      deletionDays: 365,
      autoAnonymize: false,
    }),
    retentionReport: vi.fn().mockResolvedValue([]),
    ...overrides,
  };
}

/* A minimal consumer of the shared gate — mirrors how the editors wrap their
   AI actions. */
function ConsentProbe({ onAction }) {
  const { guard, dialog } = window.useAiConsent();
  return (
    <div>
      <button type="button" onClick={guard(onAction)}>
        AI action
      </button>
      {dialog}
    </div>
  );
}

describe('AiConsentDialog (ADR-0063)', () => {
  it('AiConsentDialog_NotGranted_ShowsGermanText', () => {
    render(
      <window.AiConsentDialog isAdmin={true} onAccept={() => {}} onCancel={() => {}} />,
    );
    expect(screen.getByRole('dialog', { name: 'Approve AI processing' })).toBeInTheDocument();
    expect(screen.getByText(/EU AI Act/)).toBeInTheDocument();
    expect(screen.getByText(/Anthropic Claude or Google Gemini/)).toBeInTheDocument();
    expect(screen.getByText('Approve')).toBeInTheDocument();
    expect(screen.getByText('Cancel')).toBeInTheDocument();
  });

  it('AiConsentDialog_NonAdmin_ShowsAskAdminHint', () => {
    render(
      <window.AiConsentDialog isAdmin={false} onAccept={() => {}} onCancel={() => {}} />,
    );
    expect(
      screen.getByText(/Ask your workspace admin to approve/),
    ).toBeInTheDocument();
    expect(screen.queryByText('Approve')).toBeNull();
  });

  it('AiConsent_Guard_NoConsent_ShowsDialogInsteadOfCallingHandler', async () => {
    window.RecruitApi = mockApi();
    await window.WorkspaceSettings.refresh();
    const onAction = vi.fn();
    render(<ConsentProbe onAction={onAction} />);
    fireEvent.click(screen.getByText('AI action'));
    expect(screen.getByRole('dialog', { name: 'Approve AI processing' })).toBeInTheDocument();
    expect(onAction).not.toHaveBeenCalled();
  });

  it('AiConsentDialog_Accept_CallsUpdateWorkspaceSettingsAndRunsAction', async () => {
    window.RecruitApi = mockApi();
    await window.WorkspaceSettings.refresh();
    const onAction = vi.fn();
    render(<ConsentProbe onAction={onAction} />);
    fireEvent.click(screen.getByText('AI action'));
    fireEvent.click(screen.getByTestId('ai-consent-accept'));
    await waitFor(() =>
      expect(window.RecruitApi.updateWorkspaceSettings).toHaveBeenCalledWith({ aiConsent: true }),
    );
    await waitFor(() => expect(onAction).toHaveBeenCalledTimes(1));
  });

  it('AiConsentDialog_Reject_SendsNoAiRequest', async () => {
    window.RecruitApi = mockApi();
    await window.WorkspaceSettings.refresh();
    const onAction = vi.fn();
    render(<ConsentProbe onAction={onAction} />);
    fireEvent.click(screen.getByText('AI action'));
    fireEvent.click(screen.getByTestId('ai-consent-cancel'));
    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: 'Approve AI processing' })).toBeNull(),
    );
    expect(onAction).not.toHaveBeenCalled();
    expect(window.RecruitApi.updateWorkspaceSettings).not.toHaveBeenCalled();
  });
});

describe('ChatPanel consent (ADR-0063)', () => {
  it('ChatPanel_NoConsent_BlocksSend', async () => {
    window.RecruitApi = mockApi();
    window.useAiStatus = () => ({ provider: null });
    await window.WorkspaceSettings.refresh();
    const { getByTestId } = render(<ChatPanel onClose={() => {}} onOpenApplication={() => {}} />);
    fireEvent.change(getByTestId('chat-input'), { target: { value: 'Hi' } });
    fireEvent.click(getByTestId('chat-send'));
    expect(getByTestId('ai-consent-dialog')).toBeInTheDocument();
    expect(window.RecruitApi.agentChat).not.toHaveBeenCalled();
  });
});

describe('SettingsView consent state + revoke (ADR-0063)', () => {
  it('SettingsView_ShowsConsentStateAndRevoke', async () => {
    window.RecruitApi = mockApi({
      getWorkspaceSettings: vi.fn().mockResolvedValue({ vermittlung: false, aiConsent: true }),
    });
    render(<SettingsView user={{ id: 'me' }} />);
    expect(await screen.findByText('Consent granted')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('ai-consent-revoke'));
    await waitFor(() =>
      expect(window.RecruitApi.updateWorkspaceSettings).toHaveBeenCalledWith({ aiConsent: false }),
    );
  });

  it('SettingsView_NoConsent_ShowsNoRevokeButton', async () => {
    window.RecruitApi = mockApi();
    render(<SettingsView user={{ id: 'me' }} />);
    await screen.findByText('No consent');
    expect(screen.queryByTestId('ai-consent-revoke')).toBeNull();
  });
});
