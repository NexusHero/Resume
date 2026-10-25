/* Magic Pen × AI-consent resume path (regression, ADR-0060/0063).

   Covers the real screenshot bug: with consent NOT yet granted, the first
   Magic-Pen click opens the consent dialog, and accepting must RESUME the pen
   call and stage a suggestion — instead of crashing the render on
   `penPending.suggestion.grounding` (the pen seam used to be wrapped in a
   second `consent.guard`, whose stale `ws.aiConsent` closure returned
   `undefined` after accept). */
import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

let BewerbungsEditor;

beforeAll(async () => {
  await import('../workspace-settings.js');
  await import('../use-workspace-settings.jsx');
  await import('../AiGate.jsx');
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

function installApi(over = {}) {
  window.RecruitApi = {
    aiConfigured: vi.fn().mockResolvedValue(true),
    authMe: vi.fn().mockResolvedValue({ id: 'me', email: 'me@x.io', roles: ['admin'] }),
    getWorkspaceSettings: vi.fn().mockResolvedValue({ vermittlung: false, aiConsent: false }),
    updateWorkspaceSettings: vi.fn().mockResolvedValue({ vermittlung: false, aiConsent: true }),
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
  return window.RecruitApi;
}

beforeEach(() => {
  window.WorkspaceSettings.reset();
  window.UndoDelete = { schedule: vi.fn(), flush: vi.fn(), getPending: () => null };
  installApi();
});

describe('Bewerbungs-Editor — Magic Pen consent resume (Regression)', () => {
  it('BewerbungsEditor_Pen_ConsentResume_StagesSuggestionAfterAccept', async () => {
    await window.WorkspaceSettings.refresh(); // loaded, aiConsent: false

    render(<BewerbungsEditor application={application()} onClose={vi.fn()} />);
    await waitFor(() => expect(screen.getByTestId('pen-summary')).toBeInTheDocument());

    // First Magic-Pen click: consent not yet granted → dialog, no request.
    await userEvent.click(screen.getByTestId('pen-summary'));
    await waitFor(() => expect(screen.getByTestId('ai-consent-dialog')).toBeInTheDocument());
    expect(window.RecruitApi.penSummary).not.toHaveBeenCalled();

    // Accept → the pen call resumes and stages a rendered suggestion (no crash).
    await userEvent.click(screen.getByTestId('ai-consent-accept'));

    await waitFor(() => expect(window.RecruitApi.penSummary).toHaveBeenCalledWith('a1'));
    await waitFor(() => expect(screen.getByText(/Vorschlag · noch nicht übernommen/)).toBeInTheDocument());
    // The suggestion diff (before/after) is actually rendered.
    expect(screen.getByTestId('editor-diff')).toBeInTheDocument();
  });
});
