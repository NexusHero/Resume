/* ADR-0047 — the assistant must never swallow a 503: the user sees why. */
import { describe, it, expect, beforeAll, afterEach, beforeEach, vi } from 'vitest';
import { render, fireEvent, screen } from '@testing-library/react';

let AssistantView;

beforeAll(async () => {
  await import('../use-viewport.jsx');
  await import('../ai-status.js');
  await import('../use-ai-status.jsx');
  await import('../AiGate.jsx');
  await import('../AssistantView.jsx');
  AssistantView = window.AssistantView;
});

afterEach(() => {
  delete window.RecruitApi;
});

const api = () => ({
  getLlmSettings: vi.fn().mockResolvedValue({ configured: false, current: null, providers: [] }),
  getAssistant: vi.fn().mockResolvedValue({
    settings: { enabled: true, mode: 'suggest', intervalMinutes: 60, applySource: 'mandates', minApplyScore: 70 },
    counts: {},
  }),
  listAssistantSuggestions: vi.fn().mockResolvedValue([]),
  updateAssistant: vi.fn().mockRejectedValue(new Error('No AI provider is configured on this server.')),
  runAssistant: vi.fn().mockRejectedValue(new Error('No AI provider is configured on this server.')),
  resolveAssistantSuggestion: vi.fn(),
  assistantDossierUrl: () => '/x',
});

describe('AssistantView errors', () => {
  beforeEach(async () => {
    window.AiStatus.reset();
  });

  const aiError = () => {
    const err = new Error('No AI provider is configured on this server.');
    err.code = 'ai-not-configured';
    return err;
  };

  it('AssistantView_RunFailsWith503_ShowsTheErrorInsteadOfSwallowingIt', async () => {
    window.RecruitApi = api();
    window.RecruitApi.runAssistant.mockRejectedValue(aiError());
    render(<AssistantView />);
    const run = await screen.findByRole('button', { name: /Run now/ });
    fireEvent.click(run);
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('AI not configured — set up a server key.');
    expect(alert).toHaveTextContent('Settings');
  });

  it('AssistantView_PatchFails_ShowsTheError', async () => {
    window.RecruitApi = api();
    window.RecruitApi.updateAssistant.mockRejectedValue(aiError());
    render(<AssistantView />);
    const select = await screen.findByRole('combobox');
    fireEvent.change(select, { target: { value: '15' } });
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('AI not configured — set up a server key.');
    expect(alert).toHaveTextContent('Settings');
  });

  it('AssistantView_Generic500_ShowsRawMessageWithoutSettingsLink', async () => {
    window.RecruitApi = api();
    const boom = new Error('Unexpected server failure');
    boom.code = 'internal-error';
    window.RecruitApi.runAssistant.mockRejectedValue(boom);
    render(<AssistantView />);
    fireEvent.click(await screen.findByRole('button', { name: /Run now/ }));
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Unexpected server failure');
    expect(alert).not.toHaveTextContent('Settings');
  });

  it('AssistantView_AutopilotWithoutKey_DisablesEnableSwitchAndShowsHint', async () => {
    window.RecruitApi = api();
    window.RecruitApi.getAssistant.mockResolvedValue({
      settings: { enabled: false, mode: 'autopilot', intervalMinutes: 60, applySource: 'mandates', minApplyScore: 70 },
      counts: {},
    });
    // Observe the key status through the shared store (as the app does).
    await window.AiStatus.refresh();
    render(<AssistantView />);
    const toggle = await screen.findByRole('button', { name: 'Turn on' });
    expect(toggle).toBeDisabled();
    expect(screen.getAllByText(/AI not configured/).length).toBeGreaterThan(0);
    fireEvent.click(toggle);
    expect(window.RecruitApi.updateAssistant).not.toHaveBeenCalled();
  });

  it('AssistantView_ErrorKind_ShowsLabelAndOnlyDismiss', async () => {
    window.RecruitApi = api();
    window.RecruitApi.listAssistantSuggestions.mockResolvedValue([
      {
        id: 'e1',
        kind: 'autopilot-error',
        title: 'Autopilot: application for Ada could not be built',
        rationale: 'The AI provider failed.',
        status: 'proposed',
        createdAt: '2026-01-01T00:00:00.000Z',
      },
    ]);
    render(<AssistantView />);
    expect(await screen.findByText('Failed')).toBeInTheDocument();
    expect(await screen.findByText('Close')).toBeInTheDocument();
    // An error hint has no meaningful "accept" action — only dismiss.
    expect(screen.queryByText('Annehmen')).not.toBeInTheDocument();
  });

  it('AssistantView_RunResult_ShowsFailedCount', async () => {
    window.RecruitApi = api();
    window.RecruitApi.runAssistant.mockResolvedValue({ proposed: 2, failures: 1, applied: 0 });
    render(<AssistantView />);
    fireEvent.click(await screen.findByRole('button', { name: /Run now/ }));
    expect(await screen.findByText(/1 failed/)).toBeInTheDocument();
  });
});
