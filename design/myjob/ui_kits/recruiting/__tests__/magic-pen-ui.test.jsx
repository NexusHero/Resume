/* Magic Pen UI (AK-3.1/3.4/3.5) — per-section pen buttons, staged before/after,
   accept-writes-copy-only, grounding confirm, and the "Alles anpassen" fan-out. */
import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

let BewerbungsEditor;
let Editor;

beforeAll(async () => {
  await import('../undo-delete.js');
  await import('../use-viewport.jsx');
  await import('../DataStates.jsx');
  await import('../EditorShared.jsx');
  await import('../EditorDocs.jsx');
  await import('../EditorModals.jsx');
  await import('../EditorDiff.jsx');
  await import('../Editor.jsx');
  await import('../BewerbungsEditor.jsx');
  BewerbungsEditor = window.BewerbungsEditor;
  Editor = window.Editor;
});

const documents = (over = {}) => ({
  ownerId: 'team',
  talentId: 't1',
  contact: { name: 'Ada', role: 'Backend Engineer', email: '', phone: '', location: '', linkedin: '' },
  resume: {
    summary: 'Backend engineer.',
    experience: [
      { role: 'Backend Engineer', company: 'Acme', period: '2018–2022', location: '', bullets: ['Built APIs'], skills: [] },
    ],
    education: [],
    skillGroups: [{ label: 'Languages', items: ['Rust'] }],
    rawText: '',
  },
  letter: { firma: '', ansprechpartner: '', strasse: '', plzOrt: '', betreff: '', anrede: '', absaetze: [''], gruss: '' },
  style: { accent: '#2A6FDB', strong: '#1d4ed8', onDark: '#7aa7f5', font: 'var(--font-display)', size: 1 },
  updatedAt: '2026-06-25T10:00:00.000Z',
  ...over,
});

const application = (over = {}) => ({
  id: 'a1',
  ownerId: 'team',
  jobPostingId: 'p1',
  postingCompany: 'Aurora Systems',
  postingTitle: 'Senior C++ Engineer',
  talentId: 't1',
  talentName: 'Ada',
  status: 'draft',
  statusHistory: [{ status: 'draft', at: '2026-06-25T10:00:00.000Z' }],
  documents: documents(),
  createdAt: '2026-06-25T10:00:00.000Z',
  updatedAt: '2026-06-25T10:00:00.000Z',
  ...over,
});

const suggestion = (over = {}) => ({
  section: 'summary',
  before: 'Backend engineer.',
  after: 'Tuned backend engineer.',
  provider: 'claude',
  usage: { inputTokens: 1, outputTokens: 1, costUsd: 0 },
  grounding: { grounded: true, unsupported: [] },
  ...over,
});

function installRecruitApi(over = {}) {
  window.RecruitApi = {
    aiConfigured: vi.fn().mockResolvedValue(true),
    getJobApplicationDocuments: vi.fn().mockResolvedValue(documents()),
    saveJobApplicationDocuments: vi.fn().mockResolvedValue(documents()),
    saveTalentDocuments: vi.fn(),
    changeJobApplicationStatus: vi.fn().mockResolvedValue(application({ status: 'sent' })),
    generateJobApplicationLetter: vi.fn().mockResolvedValue({ paragraphs: ['p'], provider: 'claude' }),
    previewDocumentsHtml: vi.fn().mockResolvedValue('<html></html>'),
    talentDossierPreviewPdf: vi.fn().mockResolvedValue(new Blob(['%PDF'], { type: 'application/pdf' })),
    saveBlob: vi.fn().mockResolvedValue(undefined),
    penHeadline: vi.fn().mockResolvedValue(suggestion({ section: 'headline', before: 'Backend Engineer', after: 'Senior Backend Engineer' })),
    penSummary: vi.fn().mockResolvedValue(suggestion()),
    penExperience: vi.fn().mockResolvedValue(suggestion({ section: 'experienceBullets', before: ['Built APIs'], after: ['Built resilient APIs'], experienceIndex: 0, station: { role: 'Backend Engineer', company: 'Acme', period: '2018–2022' } })),
    penSkills: vi.fn().mockResolvedValue(suggestion({ section: 'skills', before: [{ label: 'Languages', items: ['Rust'] }], after: [{ label: 'Languages', items: ['Rust', 'Go'] }] })),
    ...over,
  };
}

beforeEach(() => {
  window.UndoDelete = { schedule: vi.fn(), flush: vi.fn(), getPending: () => null };
  installRecruitApi();
});

describe('Bewerbungs-Editor — Magic Pen (per section)', () => {
  it('BewerbungsEditor_PenButtons_RenderedPerSection', async () => {
    render(<BewerbungsEditor application={application()} onClose={vi.fn()} />);
    await waitFor(() => expect(screen.getByTestId('pen-headline')).toBeInTheDocument());
    expect(screen.getByTestId('pen-summary')).toBeInTheDocument();
    expect(screen.getByTestId('pen-skills')).toBeInTheDocument();
    expect(screen.getByTestId('pen-experience-0')).toBeInTheDocument();
  });

  it('BewerbungsEditor_Pen_ShowsBeforeAfterAndStagesSuggestion', async () => {
    render(<BewerbungsEditor application={application()} onClose={vi.fn()} />);
    await waitFor(() => expect(screen.getByTestId('pen-summary')).toBeInTheDocument());
    await userEvent.click(screen.getByTestId('pen-summary'));

    await waitFor(() => expect(screen.getByText(/Vorschlag · noch nicht übernommen/)).toBeInTheDocument());
    expect(window.RecruitApi.penSummary).toHaveBeenCalledWith('a1');
  });

  it('BewerbungsEditor_Pen_Accept_WritesCopyOnly', async () => {
    render(<BewerbungsEditor application={application()} onClose={vi.fn()} />);
    await waitFor(() => expect(screen.getByTestId('pen-summary')).toBeInTheDocument());
    await userEvent.click(screen.getByTestId('pen-summary'));
    await waitFor(() => expect(screen.getByText(/Vorschlag · noch nicht übernommen/)).toBeInTheDocument());

    await userEvent.click(screen.getByRole('button', { name: /Übernehmen/ }));

    await waitFor(() =>
      expect(window.RecruitApi.saveJobApplicationDocuments).toHaveBeenCalled(),
    );
    const [, docs] = window.RecruitApi.saveJobApplicationDocuments.mock.calls[0];
    expect(docs.resume.summary).toBe('Tuned backend engineer.');
    expect(window.RecruitApi.saveTalentDocuments).not.toHaveBeenCalled();
  });

  it('BewerbungsEditor_Pen_Discard_LeavesCopyUnchanged', async () => {
    render(<BewerbungsEditor application={application()} onClose={vi.fn()} />);
    await waitFor(() => expect(screen.getByTestId('pen-summary')).toBeInTheDocument());
    await userEvent.click(screen.getByTestId('pen-summary'));
    await waitFor(() => expect(screen.getByText(/Vorschlag · noch nicht übernommen/)).toBeInTheDocument());

    await userEvent.click(screen.getByRole('button', { name: /Verwerfen/ }));

    await waitFor(() => expect(screen.queryByText(/Vorschlag · noch nicht übernommen/)).not.toBeInTheDocument());
    expect(window.RecruitApi.saveJobApplicationDocuments).not.toHaveBeenCalled();
  });

  it('BewerbungsEditor_Pen_GroundingViolation_ShowsWarningAndRequiresConfirm', async () => {
    window.RecruitApi.penSummary.mockResolvedValue(
      suggestion({ grounding: { grounded: false, unsupported: [{ kind: 'skill', text: 'Kubernetes' }] }, after: 'I use Kubernetes.' }),
    );
    render(<BewerbungsEditor application={application()} onClose={vi.fn()} />);
    await waitFor(() => expect(screen.getByTestId('pen-summary')).toBeInTheDocument());
    await userEvent.click(screen.getByTestId('pen-summary'));
    await waitFor(() => expect(screen.getByText(/nicht belegte Angabe/)).toBeInTheDocument());

    await userEvent.click(screen.getByRole('button', { name: /Übernehmen/ }));
    // Confirm step appears before the copy is written.
    await waitFor(() => expect(screen.getByRole('button', { name: /Trotzdem übernehmen/ })).toBeInTheDocument());
    expect(window.RecruitApi.saveJobApplicationDocuments).not.toHaveBeenCalled();
  });

  it('BewerbungsEditor_Pen_NoAiKey_ShowsNotConfiguredAndSendsNoRequest', async () => {
    window.RecruitApi.aiConfigured.mockResolvedValue(false);
    render(<BewerbungsEditor application={application()} onClose={vi.fn()} />);
    await waitFor(() => expect(screen.getByText(/KI nicht eingerichtet/)).toBeInTheDocument());
    await userEvent.click(screen.getByTestId('pen-summary'));

    expect(window.RecruitApi.penSummary).not.toHaveBeenCalled();
  });
});

describe('Talent-Editor — kein Magic Pen', () => {
  it('TalentEditor_NoPenButtons', async () => {
    // The talent editor does not pass `pen`, so no section buttons are rendered.
    render(
      <Editor
        talent={{ id: 't1', name: 'Ada', role: 'Engineer', email: '', phone: '', location: '', linkedin: '' }}
        onClose={vi.fn()}
        getDocuments={() => Promise.resolve(documents())}
        saveDocuments={() => Promise.resolve(documents())}
        renderPreviewHtml={() => Promise.resolve('<html></html>')}
        tools={['pdf', 'ai']}
      />,
    );
    await waitFor(() => expect(screen.getByText('Kurzprofil')).toBeInTheDocument());
    expect(screen.queryByTestId('pen-headline')).not.toBeInTheDocument();
    expect(screen.queryByTestId('pen-summary')).not.toBeInTheDocument();
    expect(screen.queryByTestId('pen-skills')).not.toBeInTheDocument();
  });
});

describe('Bewerbungs-Editor — Alles anpassen (AK-3.5)', () => {
  it('BewerbungsEditor_AllesAnpassen_FansOutAndShowsPerSectionProgress', async () => {
    render(<BewerbungsEditor application={application()} onClose={vi.fn()} />);
    await waitFor(() => expect(screen.getByText('Alles für diese Stelle anpassen')).toBeInTheDocument());
    await userEvent.click(screen.getByText('Alles für diese Stelle anpassen'));

    await waitFor(() => expect(window.RecruitApi.penHeadline).toHaveBeenCalled());
    expect(window.RecruitApi.penSummary).toHaveBeenCalled();
    expect(window.RecruitApi.penExperience).toHaveBeenCalledWith('a1', 0, expect.anything());
    expect(window.RecruitApi.penSkills).toHaveBeenCalled();

    await waitFor(() => expect(screen.getAllByText('fertig').length).toBeGreaterThanOrEqual(4));
  });

  it('BewerbungsEditor_AllesAnpassen_AggregatedDiff_IndividualAccept', async () => {
    render(<BewerbungsEditor application={application()} onClose={vi.fn()} />);
    await waitFor(() => expect(screen.getByText('Alles für diese Stelle anpassen')).toBeInTheDocument());
    await userEvent.click(screen.getByText('Alles für diese Stelle anpassen'));

    await waitFor(() => expect(screen.getAllByRole('button', { name: /Übernehmen/ }).length).toBeGreaterThanOrEqual(4));
    // Accept just one tile (the headline) — the others stay pending.
    const first = screen.getAllByRole('button', { name: /Übernehmen/ })[0];
    await userEvent.click(first);
    await waitFor(() => expect(window.RecruitApi.saveJobApplicationDocuments).toHaveBeenCalled());
  });

  it('BewerbungsEditor_AllesAnpassen_Abort_StopsPendingRequests', async () => {
    // Pen calls never resolve until aborted, so the fan-out stays "running".
    window.RecruitApi.penSummary.mockReturnValue(new Promise(() => {}));
    window.RecruitApi.penHeadline.mockReturnValue(new Promise(() => {}));
    window.RecruitApi.penExperience.mockReturnValue(new Promise(() => {}));
    window.RecruitApi.penSkills.mockReturnValue(new Promise(() => {}));

    render(<BewerbungsEditor application={application()} onClose={vi.fn()} />);
    await waitFor(() => expect(screen.getByText('Alles für diese Stelle anpassen')).toBeInTheDocument());
    await userEvent.click(screen.getByText('Alles für diese Stelle anpassen'));

    await waitFor(() => expect(screen.getByRole('button', { name: /Abbrechen/ })).toBeInTheDocument());
    await userEvent.click(screen.getByRole('button', { name: /Abbrechen/ }));

    await waitFor(() => expect(screen.getAllByText('abgebrochen').length).toBeGreaterThanOrEqual(4));
    expect(window.RecruitApi.saveJobApplicationDocuments).not.toHaveBeenCalled();
  });

  it('BewerbungsEditor_AllesAnpassen_TileWithGroundingViolation_RequiresConfirm', async () => {
    // One fan-out tile (Profil) violates grounding; its accept must go through
    // the same two-step "Trotzdem übernehmen" gate as the per-section path (OQ6).
    window.RecruitApi.penSummary.mockResolvedValue(
      suggestion({
        section: 'summary',
        after: 'I use Kubernetes.',
        grounding: { grounded: false, unsupported: [{ kind: 'skill', text: 'Kubernetes' }] },
      }),
    );
    render(<BewerbungsEditor application={application()} onClose={vi.fn()} />);
    await waitFor(() => expect(screen.getByText('Alles für diese Stelle anpassen')).toBeInTheDocument());
    await userEvent.click(screen.getByText('Alles für diese Stelle anpassen'));

    // The violating tile shows the GroundingWarning (diff + unsupported highlight).
    await waitFor(() => expect(screen.getByText(/nicht belegte Angabe/)).toBeInTheDocument());

    // First "Übernehmen" does NOT write; it reveals the "Trotzdem übernehmen" step.
    await userEvent.click(screen.getByTestId('all-accept-summary'));
    await waitFor(() => expect(screen.getByTestId('all-confirm-summary')).toBeInTheDocument());
    expect(window.RecruitApi.saveJobApplicationDocuments).not.toHaveBeenCalled();

    // Second click (the explicit confirmation) writes the copy.
    await userEvent.click(screen.getByTestId('all-confirm-summary'));
    await waitFor(() => expect(window.RecruitApi.saveJobApplicationDocuments).toHaveBeenCalled());
    const [, docs] = window.RecruitApi.saveJobApplicationDocuments.mock.calls[0];
    expect(docs.resume.summary).toBe('I use Kubernetes.');
  });
});
