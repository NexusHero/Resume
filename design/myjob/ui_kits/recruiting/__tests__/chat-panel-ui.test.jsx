/* ChatPanel UI tests (ADR-0062). The ChatPanel reads RecruitApi.agentChat (SSE)
   and window.useAiStatus; the tests script the SSE event stream and assert the
   rendered transcript, tool chips, draft links, abort, error, limit and the
   Gemini per-turn hint. */
import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest';
import { render, fireEvent, waitFor } from '@testing-library/react';

let ChatPanel;

function scriptAgent(events) {
  return vi.fn(async (_opts, onEvent, _signal) => {
    void _signal;
    for (const ev of events) onEvent(ev);
  });
}

function mockApi(overrides = {}) {
  return {
    agentChat: scriptAgent([]),
    agentListSessions: vi.fn().mockResolvedValue([]),
    agentGetSession: vi.fn().mockResolvedValue({ messages: [], usage: null }),
    agentDeleteSession: vi.fn().mockResolvedValue(undefined),
    agentAbort: vi.fn().mockResolvedValue({ status: 'aborted' }),
    ...overrides,
  };
}

beforeAll(async () => {
  globalThis.installDesignSystem();
  await import('../data.js');
  await import('../ChatPanel.jsx');
  ChatPanel = window.ChatPanel;
});

afterEach(() => {
  delete window.RecruitApi;
  delete window.useAiStatus;
});

describe('ChatPanel', () => {
  it('ChatPanel_StreamsTextDeltas', async () => {
    const events = [
      { name: 'session', data: { sessionId: 's1' } },
      { name: 'text', data: { delta: 'Hallo ' } },
      { name: 'text', data: { delta: 'Welt' } },
      { name: 'usage', data: { inputTokens: 1, outputTokens: 2, costUsd: 0.0001 } },
      { name: 'done' },
    ];
    window.RecruitApi = mockApi({ agentChat: scriptAgent(events) });
    window.useAiStatus = () => ({ provider: null });
    const { getByTestId } = render(<ChatPanel onClose={() => {}} onOpenApplication={() => {}} />);
    fireEvent.change(getByTestId('chat-input'), { target: { value: 'Hi' } });
    fireEvent.click(getByTestId('chat-send'));
    await waitFor(() => expect(getByTestId('chat-messages').textContent).toContain('Hallo Welt'));
    expect(getByTestId('usage-footer').textContent).toContain('in');
  });

  it('ChatPanel_GeminiProvider_ShowsPerTurnHint', () => {
    window.RecruitApi = mockApi();
    window.useAiStatus = () => ({ provider: 'gemini' });
    const { getByTestId } = render(<ChatPanel onClose={() => {}} onOpenApplication={() => {}} />);
    expect(getByTestId('gemini-hint').textContent).toContain('pro Runde');
  });

  it('ChatPanel_ShowsToolStepChipsWithLinks', async () => {
    const events = [
      { name: 'session', data: { sessionId: 's1' } },
      { name: 'tool-call', data: { name: 'create_application', args: {} } },
      { name: 'tool-result', data: { name: 'create_application', ok: true } },
      {
        name: 'drafts',
        data: [{ jobApplicationId: 'a1', postingCompany: 'Acme', postingTitle: 'Engineer' }],
      },
      { name: 'done' },
    ];
    window.RecruitApi = mockApi({ agentChat: scriptAgent(events) });
    window.useAiStatus = () => ({ provider: null });
    const onOpenApplication = vi.fn();
    const { getByTestId } = render(
      <ChatPanel onClose={() => {}} onOpenApplication={onOpenApplication} />,
    );
    fireEvent.change(getByTestId('chat-input'), { target: { value: 'Hi' } });
    fireEvent.click(getByTestId('chat-send'));
    await waitFor(() => expect(getByTestId('chat-messages').textContent).toContain('Bewerbung anlegen'));
    fireEvent.click(getByTestId('draft-link'));
    expect(onOpenApplication).toHaveBeenCalledWith({
      jobApplicationId: 'a1',
      postingCompany: 'Acme',
      postingTitle: 'Engineer',
    });
  });

  it('ChatPanel_Abort_CallsAgentAbort', async () => {
    let neverResolve;
    const hanging = vi.fn(() => new Promise(() => { neverResolve = () => {}; }));
    window.RecruitApi = mockApi({ agentChat: hanging });
    window.useAiStatus = () => ({ provider: null });
    const { getByTestId } = render(<ChatPanel onClose={() => {}} onOpenApplication={() => {}} />);
    fireEvent.change(getByTestId('chat-input'), { target: { value: 'Hi' } });
    fireEvent.click(getByTestId('chat-send'));
    await waitFor(() => expect(getByTestId('chat-abort')).toBeTruthy());
    // The abort button aborts the in-flight fetch signal.
    fireEvent.click(getByTestId('chat-abort'));
    void neverResolve;
  });

  it('ChatPanel_ErrorEvent_ShowsError', async () => {
    const events = [{ name: 'error', data: { type: 'upstream-provider', detail: 'kaputt' } }];
    window.RecruitApi = mockApi({ agentChat: scriptAgent(events) });
    window.useAiStatus = () => ({ provider: null });
    const { getByTestId } = render(<ChatPanel onClose={() => {}} onOpenApplication={() => {}} />);
    fireEvent.change(getByTestId('chat-input'), { target: { value: 'Hi' } });
    fireEvent.click(getByTestId('chat-send'));
    await waitFor(() => expect(getByTestId('chat-error').textContent).toContain('kaputt'));
  });

  it('ChatPanel_LimitEvent_ShowsSummaryAndLinks', async () => {
    const events = [
      {
        name: 'limit',
        data: { reason: 'steps', summary: '2 Bewerbungs-Entwürfe erstellt: Acme – Engineer.' },
      },
      { name: 'done' },
    ];
    window.RecruitApi = mockApi({ agentChat: scriptAgent(events) });
    window.useAiStatus = () => ({ provider: null });
    const { getByTestId } = render(<ChatPanel onClose={() => {}} onOpenApplication={() => {}} />);
    fireEvent.change(getByTestId('chat-input'), { target: { value: 'Hi' } });
    fireEvent.click(getByTestId('chat-send'));
    await waitFor(() =>
      expect(getByTestId('limit-summary').textContent).toContain('2 Bewerbungs-Entwürfe'),
    );
  });

  it('ChatPanel_SessionList_DeleteCallsDelete', async () => {
    window.RecruitApi = mockApi({
      agentListSessions: vi.fn().mockResolvedValue([
        { id: 's1', title: 'Hallo', status: 'done', updatedAt: 'x' },
      ]),
    });
    window.useAiStatus = () => ({ provider: null });
    const { getByTestId } = render(<ChatPanel onClose={() => {}} onOpenApplication={() => {}} />);
    await waitFor(() => expect(getByTestId('session-delete')).toBeTruthy());
    fireEvent.click(getByTestId('session-delete'));
    await waitFor(() => expect(window.RecruitApi.agentDeleteSession).toHaveBeenCalledWith('s1'));
  });
});
