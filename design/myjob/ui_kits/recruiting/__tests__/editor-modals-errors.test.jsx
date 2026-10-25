/* Point 3 cleanup: user-triggered modal failures must not disappear silently. */
import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

beforeAll(async () => {
  await import('../use-viewport.jsx');
  await import('../EditorShared.jsx');
  await import('../EditorModals.jsx');
});

beforeEach(() => {
  window.RecruitApi = {
    getMailStatus: vi.fn().mockResolvedValue(null),
    listArtifacts: vi.fn().mockResolvedValue([]),
    getArtifactStats: vi.fn().mockResolvedValue({ byKind: [] }),
    atsScore: vi.fn().mockRejectedValue(new Error('upstream down')),
    pitchCandidate: vi.fn().mockRejectedValue(new Error('upstream down')),
    outreachMessage: vi.fn().mockRejectedValue(new Error('upstream down')),
  };
});

describe('Editor modals — visible failures', () => {
  it('AtsModal_Failure_ShowsGenericError', async () => {
    render(<window.AtsModal talentId="t1" onClose={vi.fn()} />);
    await userEvent.type(
      screen.getByPlaceholderText('Paste job description…'),
      'React Engineer',
    );
    await userEvent.click(screen.getByText('Analyze'));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('The ATS check failed');
    expect(window.RecruitApi.atsScore).toHaveBeenCalledWith('t1', 'React Engineer');
  });

  it('PitchModal_Failure_ShowsGenericError', async () => {
    render(<window.PitchModal talentId="t1" onClose={vi.fn()} />);
    await userEvent.click(screen.getByText('Generate'));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('The pitch could not be created');
    expect(window.RecruitApi.pitchCandidate).toHaveBeenCalledWith('t1', '');
  });

  it('OutreachModal_Failure_ShowsGenericError', async () => {
    render(<window.OutreachModal talentId="t1" onClose={vi.fn()} />);
    await userEvent.click(screen.getByText('Generate'));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('The outreach message could not be drafted');
    expect(window.RecruitApi.outreachMessage).toHaveBeenCalled();
  });
});
