/* Component tests for the mandate pipeline's feature modals (ADR-0024). Each
   modal owns its feature state and talks to the backend through window.RecruitApi
   and to the parent through callbacks, so the tests stub the API and assert both
   the rendered states and the callback wiring. This is A2's safety net — the
   e2e layer never opens these modals. */
import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

let AddCandidateModal;
let FindMatchesModal;
let InterviewKitModal;
let CandidatePrepModal;
let CompanyKnowledgeModal;

beforeAll(async () => {
  await import('../MandatePipelineModals.jsx');
  ({
    AddCandidateModal,
    FindMatchesModal,
    InterviewKitModal,
    CandidatePrepModal,
    CompanyKnowledgeModal,
  } = window);
});

beforeEach(() => {
  window.ProviderBadge = function ProviderBadge() {
    return null;
  };
  window.RecruitApi = {
    listTalents: vi.fn().mockResolvedValue([]),
    addCandidacy: vi.fn().mockResolvedValue({}),
    matchMandate: vi.fn().mockResolvedValue([]),
    explainMatch: vi.fn().mockResolvedValue({ summary: '', reasons: [] }),
    interviewKit: vi.fn().mockResolvedValue({ questions: [], scorecard: [] }),
    candidatePrep: vi.fn().mockResolvedValue({}),
    companyKnowledge: vi.fn().mockResolvedValue({ profile: null }),
    recordObservation: vi.fn().mockResolvedValue({}),
    aggCheck: vi.fn().mockResolvedValue({ findings: [], riskLevel: 'none', summary: '' }),
    aggRewrite: vi.fn().mockResolvedValue({ changed: false }),
  };
});

const mandate = { id: 'm1', role: 'Staff Engineer', client: 'Helio GmbH' };

describe('AddCandidateModal', () => {
  it('Add_OnMount_FetchesPoolAndExcludesInPipelineAndMe', async () => {
    window.RecruitApi.listTalents.mockResolvedValue([
      { id: 't1', name: 'Ada', role: 'Eng' },
      { id: 't2', name: 'Bo', role: 'PM' },
      { id: 'me', name: 'Me', role: 'Recruiter' },
    ]);
    render(
      <AddCandidateModal mandate={mandate} excludeTalentIds={new Set(['t2'])} onClose={vi.fn()} onAdded={vi.fn()} />,
    );
    expect(await screen.findByText('Ada')).toBeInTheDocument();
    expect(screen.queryByText('Bo')).not.toBeInTheDocument(); // already in pipeline
    expect(screen.queryByText('Me')).not.toBeInTheDocument(); // the "me" talent is never addable
  });

  it('Add_TalentClicked_AddsThenNotifiesAndCloses', async () => {
    window.RecruitApi.listTalents.mockResolvedValue([{ id: 't1', name: 'Ada', role: 'Eng' }]);
    const onAdded = vi.fn();
    const onClose = vi.fn();
    render(<AddCandidateModal mandate={mandate} excludeTalentIds={new Set()} onClose={onClose} onAdded={onAdded} />);

    await userEvent.click(await screen.findByText('Ada'));

    expect(window.RecruitApi.addCandidacy).toHaveBeenCalledWith('m1', { talentId: 't1' });
    expect(onAdded).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

describe('FindMatchesModal', () => {
  it('Find_RankPool_RendersRankedCandidates', async () => {
    window.RecruitApi.matchMandate.mockResolvedValue([
      { talentId: 't1', name: 'Ada', role: 'Eng', score: 88, matched: ['react'], inPipeline: false },
    ]);
    render(<FindMatchesModal mandate={mandate} onClose={vi.fn()} onOpenTalent={vi.fn()} onAdded={vi.fn()} />);

    await userEvent.click(screen.getByRole('button', { name: /Pool ranken/ }));

    expect(window.RecruitApi.matchMandate).toHaveBeenCalledWith('m1', { jobText: '', limit: 12 });
    expect(await screen.findByText('Ada')).toBeInTheDocument();
  });

  it('Find_AddClicked_AddsCandidateAndReloadsBoard', async () => {
    window.RecruitApi.matchMandate.mockResolvedValue([
      { talentId: 't1', name: 'Ada', role: 'Eng', score: 88, matched: [], inPipeline: false },
    ]);
    const onAdded = vi.fn();
    render(<FindMatchesModal mandate={mandate} onClose={vi.fn()} onOpenTalent={vi.fn()} onAdded={onAdded} />);
    await userEvent.click(screen.getByRole('button', { name: /Pool ranken/ }));
    await screen.findByText('Ada');

    await userEvent.click(screen.getByRole('button', { name: 'Add' }));

    expect(window.RecruitApi.addCandidacy).toHaveBeenCalledWith('m1', { talentId: 't1' });
    expect(onAdded).toHaveBeenCalledTimes(1);
    expect(await screen.findByText('In pipeline')).toBeInTheDocument();
  });

  it('Find_WhyToggled_LoadsAndShowsExplanation', async () => {
    window.RecruitApi.matchMandate.mockResolvedValue([
      { talentId: 't1', name: 'Ada', role: 'Eng', score: 88, matched: [], inPipeline: true },
    ]);
    window.RecruitApi.explainMatch.mockResolvedValue({ summary: 'Strong React overlap', reasons: ['5y React'] });
    render(<FindMatchesModal mandate={mandate} onClose={vi.fn()} onOpenTalent={vi.fn()} onAdded={vi.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: /Pool ranken/ }));
    await screen.findByText('Ada');

    await userEvent.click(screen.getByRole('button', { name: /Why/ }));

    expect(window.RecruitApi.explainMatch).toHaveBeenCalledWith('m1', 't1');
    expect(await screen.findByText('Strong React overlap')).toBeInTheDocument();
    expect(screen.getByText('5y React')).toBeInTheDocument();
  });
});

describe('CompanyKnowledgeModal', () => {
  it('Knowledge_NoObservations_ShowsArchetypeFallbackNotice', async () => {
    render(<CompanyKnowledgeModal mandate={mandate} onClose={vi.fn()} />);
    expect(await screen.findByText(/No observations yet/)).toBeInTheDocument();
    expect(window.RecruitApi.companyKnowledge).toHaveBeenCalledWith('m1');
  });

  it('Knowledge_CaptureDisabledUntilAFormatIsPicked', async () => {
    render(<CompanyKnowledgeModal mandate={mandate} onClose={vi.fn()} />);
    await screen.findByText(/No observations yet/);

    const capture = screen.getByRole('button', { name: /Capture/ });
    expect(capture).toBeDisabled();

    await userEvent.click(screen.getByRole('button', { name: 'Coding-Challenge' }));
    expect(capture).toBeEnabled();
  });

  it('Knowledge_Capture_RecordsTheObservationForm', async () => {
    render(<CompanyKnowledgeModal mandate={mandate} onClose={vi.fn()} />);
    await screen.findByText(/No observations yet/);
    await userEvent.click(screen.getByRole('button', { name: 'System-Design' }));

    await userEvent.click(screen.getByRole('button', { name: /Capture/ }));

    expect(window.RecruitApi.recordObservation).toHaveBeenCalledWith(
      'm1',
      expect.objectContaining({ formats: ['system_design'], difficulty: 'medium' }),
    );
  });
});

describe('InterviewKitModal', () => {
  const kit = {
    name: 'Ada',
    loading: false,
    data: {
      focus: 'System design depth',
      questions: [{ category: 'Design', question: 'Design a rate limiter', lookFor: 'trade-offs' }],
      scorecard: ['Communication'],
    },
  };

  it('Interview_WithData_RendersQuestionsAndFocus', () => {
    render(<InterviewKitModal interview={kit} mandateRole="Staff Engineer" onClose={vi.fn()} />);
    expect(screen.getByText('Interview-Kit')).toBeInTheDocument();
    expect(screen.getByText('Design a rate limiter')).toBeInTheDocument();
    expect(screen.getByText(/System design depth/)).toBeInTheDocument();
  });

  it('Interview_Loading_ShowsBuildingState', () => {
    render(<InterviewKitModal interview={{ name: 'Ada', loading: true, data: null }} mandateRole="Eng" onClose={vi.fn()} />);
    expect(screen.getByText('Erstelle den Leitfaden…')).toBeInTheDocument();
  });

  it('Interview_NoData_ShowsErrorState', () => {
    render(<InterviewKitModal interview={{ name: 'Ada', loading: false, data: null }} mandateRole="Eng" onClose={vi.fn()} />);
    expect(screen.getByText('Konnte das Interview-Kit nicht laden.')).toBeInTheDocument();
  });
});

describe('CandidatePrepModal', () => {
  it('Prep_Loading_ShowsBuildingState', () => {
    render(<CandidatePrepModal prep={{ name: 'Ada', loading: true, data: null }} mandateRole="Eng" onClose={vi.fn()} />);
    expect(screen.getByText('Building the prep…')).toBeInTheDocument();
  });

  it('Prep_NoData_ShowsErrorState', () => {
    render(<CandidatePrepModal prep={{ name: 'Ada', loading: false, data: null }} mandateRole="Eng" onClose={vi.fn()} />);
    expect(screen.getByText('Could not load the prep.')).toBeInTheDocument();
  });
});
