/* AK-0.6 — the AI gate: no key means a hint with a settings link and no call. */
import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import { render, fireEvent, screen, waitFor } from '@testing-library/react';

beforeAll(async () => {
  await import('../ai-status.js');
  await import('../use-ai-status.jsx');
  await import('../AiGate.jsx');
});

beforeEach(() => {
  window.AiStatus.reset();
});

const setStatus = async (status) => {
  window.RecruitApi = {
    getLlmSettings: vi.fn().mockResolvedValue({
      configured: status === 'configured',
      current: status === 'configured' ? 'claude' : null,
      providers: status === 'configured' ? [{ id: 'claude', available: true }] : [],
    }),
  };
  await window.AiStatus.refresh();
};

describe('AiGate (AK-0.6)', () => {
  it('AiButton_NotConfigured_ShowsHintWithSettingsLinkAndDoesNotCallHandler', async () => {
    await setStatus('not-configured');
    const handler = vi.fn();
    render(<window.AiButton onClick={handler}>KI anpassen</window.AiButton>);
    expect(screen.getByText('KI nicht eingerichtet', { exact: false })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /KI anpassen/ }));
    expect(handler).not.toHaveBeenCalled();
  });

  it('AiButton_Configured_CallsHandlerOnClick', async () => {
    await setStatus('configured');
    const handler = vi.fn();
    render(<window.AiButton onClick={handler}>KI anpassen</window.AiButton>);
    fireEvent.click(screen.getByRole('button', { name: /KI anpassen/ }));
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('AiButton_StatusUnknown_IsDisabled', () => {
    render(<window.AiButton onClick={vi.fn()}>KI anpassen</window.AiButton>);
    expect(screen.getByRole('button', { name: /KI anpassen/ })).toBeDisabled();
  });

  it('AiStatus_Response503AiNotConfigured_SetsNotConfiguredAndRefreshes', async () => {
    window.RecruitApi = {
      getLlmSettings: vi.fn().mockResolvedValue({ configured: false, providers: [] }),
    };
    await window.AiStatus.refresh();
    expect(window.AiStatus.get().status).toBe('not-configured');
  });

  it('AiNotConfiguredHint_SettingsLink_DispatchesNavigateEvent', async () => {
    await setStatus('not-configured');
    const onNavigate = vi.fn();
    window.addEventListener('myjob:navigate', onNavigate);
    render(
      <window.AiButton onClick={vi.fn()}>KI anpassen</window.AiButton>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Einstellungen' }));
    await waitFor(() => expect(onNavigate).toHaveBeenCalled());
    window.removeEventListener('myjob:navigate', onNavigate);
  });
});
