/* Bewerbungen UI (AK-2.1/2.2/2.8) — list, the "Bewerbung erstellen" flow from a
   posting, and the Bewerbungs-Editor wrapper. */
import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

let Bewerbungen;
let JobPostings;
let BewerbungsEditor;

beforeAll(async () => {
  await import('../undo-delete.js');
  await import('../use-viewport.jsx');
  await import('../DataStates.jsx');
  await import('../EditorShared.jsx');
  await import('../EditorDocs.jsx');
  await import('../EditorModals.jsx');
  await import('../Bewerbungen.jsx');
  await import('../JobPostings.jsx');
  await import('../Editor.jsx');
  await import('../BewerbungsEditor.jsx');
  Bewerbungen = window.Bewerbungen;
  JobPostings = window.JobPostings;
  BewerbungsEditor = window.BewerbungsEditor;
});

const documents = {
  ownerId: 'team',
  talentId: 't1',
  contact: { name: 'Ada Lovelace', role: 'Engineer', email: '', phone: '', location: '', linkedin: '' },
  resume: { summary: '', experience: [], education: [], skillGroups: [], rawText: '' },
  letter: { firma: '', ansprechpartner: '', strasse: '', plzOrt: '', betreff: '', anrede: '', absaetze: [''], gruss: '' },
  style: { accent: '#2A6FDB', strong: '#1d4ed8', onDark: '#7aa7f5', font: 'var(--font-display)', size: 1 },
  updatedAt: '2026-06-25T10:00:00.000Z',
};

const application = (over = {}) => ({
  id: 'a1',
  ownerId: 'team',
  jobPostingId: 'p1',
  postingCompany: 'Aurora Systems',
  postingTitle: 'Senior C++ Engineer',
  talentId: 't1',
  talentName: 'Ada Lovelace',
  status: 'draft',
  statusHistory: [{ status: 'draft', at: '2026-06-25T10:00:00.000Z' }],
  documents,
  createdAt: '2026-06-25T10:00:00.000Z',
  updatedAt: '2026-06-25T10:00:00.000Z',
  ...over,
});

const posting = (over = {}) => ({
  id: 'p1',
  ownerId: 'team',
  source: 'text',
  company: 'Aurora Systems',
  title: 'Senior C++ Engineer',
  location: 'Berlin',
  country: 'DE',
  description: 'Build distributed systems.',
  requirements: ['C++'],
  descriptionIncomplete: false,
  createdAt: '2026-06-25T10:00:00.000Z',
  ...over,
});

beforeEach(() => {
  window.UndoDelete = { schedule: vi.fn(), flush: vi.fn(), getPending: () => null };
});

describe('Bewerbungen — Liste', () => {
  beforeEach(() => {
    window.RecruitApi = { deleteJobApplication: vi.fn().mockResolvedValue(undefined) };
  });

  it('BewerbungenList_Rendered_ShowsApplicationsWithStatus', () => {
    render(
      <Bewerbungen
        applications={[application(), application({ id: 'a2', status: 'sent', postingTitle: 'Backend Dev' })]}
      />,
    );
    expect(screen.getByText('Senior C++ Engineer')).toBeInTheDocument();
    expect(screen.getByText('Backend Dev')).toBeInTheDocument();
    expect(screen.getByText('Entwurf')).toBeInTheDocument();
    expect(screen.getByText('Versendet')).toBeInTheDocument();
  });

  it('BewerbungenList_Search_FiltersClientSide', async () => {
    render(
      <Bewerbungen
        applications={[application(), application({ id: 'a2', postingTitle: 'Frontend Dev', postingCompany: 'Globex' })]}
      />,
    );
    await userEvent.type(screen.getByLabelText('Bewerbungen durchsuchen'), 'frontend');
    expect(screen.queryByText('Senior C++ Engineer')).not.toBeInTheDocument();
    expect(screen.getByText('Frontend Dev')).toBeInTheDocument();
  });

  it('BewerbungenList_Delete_ShowsUndoAndRestores', async () => {
    const onChanged = vi.fn();
    render(<Bewerbungen applications={[application()]} onChanged={onChanged} />);
    await userEvent.click(screen.getByRole('button', { name: 'Löschen' }));

    expect(window.UndoDelete.schedule).toHaveBeenCalledTimes(1);
    const action = window.UndoDelete.schedule.mock.calls[0][0];
    expect(action.label).toContain('entfernt');

    action.restore();
    await waitFor(() => expect(onChanged).toHaveBeenCalled());
    expect(screen.getByText('Senior C++ Engineer')).toBeInTheDocument();
  });

  it('BewerbungenList_RendersCompanyTitleAfterPostingDeleted', () => {
    // No posting exists — the list reads the snapshots postingCompany/postingTitle.
    render(<Bewerbungen applications={[application()]} />);
    expect(screen.getByText('Aurora Systems')).toBeInTheDocument();
    expect(screen.getByText('Senior C++ Engineer')).toBeInTheDocument();
  });
});

describe('JobPostings — Bewerbung erstellen', () => {
  beforeEach(() => {
    window.RecruitApi = {
      listTalents: vi.fn().mockResolvedValue([{ id: 't1', name: 'Ada Lovelace', role: 'Engineer' }]),
      createJobApplication: vi.fn().mockResolvedValue({ jobApplication: application(), alreadyExisting: false }),
    };
  });

  it('JobPostingsDetail_CreateButton_OpensMandantPicker', async () => {
    render(<JobPostings postings={[posting()]} />);
    await userEvent.click(screen.getByText('Senior C++ Engineer'));
    await userEvent.click(screen.getByText('Bewerbung erstellen'));

    await waitFor(() => expect(screen.getByText('Ada Lovelace')).toBeInTheDocument());
  });

  it('CreateApplication_Duplicate_OpensExisting', async () => {
    window.RecruitApi.createJobApplication.mockResolvedValue({
      jobApplication: application({ id: 'existing' }),
      alreadyExisting: true,
    });
    const onOpenApplication = vi.fn();
    render(<JobPostings postings={[posting()]} onOpenApplication={onOpenApplication} />);
    await userEvent.click(screen.getByText('Senior C++ Engineer'));
    await userEvent.click(screen.getByText('Bewerbung erstellen'));
    await userEvent.click(await screen.findByText('Ada Lovelace'));

    await waitFor(() => expect(onOpenApplication).toHaveBeenCalledWith(expect.objectContaining({ id: 'existing' })));
  });
});

describe('Bewerbungs-Editor', () => {
  beforeEach(() => {
    window.RecruitApi = {
      aiConfigured: vi.fn().mockResolvedValue(true),
      getJobApplicationDocuments: vi.fn().mockResolvedValue(documents),
      saveJobApplicationDocuments: vi.fn().mockResolvedValue(documents),
      changeJobApplicationStatus: vi.fn().mockResolvedValue(application({ status: 'sent' })),
      generateJobApplicationLetter: vi.fn().mockResolvedValue({ paragraphs: ['p'], provider: 'claude' }),
      previewDocumentsHtml: vi.fn().mockResolvedValue('<html></html>'),
      talentDossierPreviewPdf: vi.fn().mockResolvedValue(new Blob(['%PDF-1.4'], { type: 'application/pdf' })),
      saveBlob: vi.fn().mockResolvedValue(undefined),
    };
  });

  it('BewerbungsEditor_StatusChange_CallsChangeJobApplicationStatus', async () => {
    render(<BewerbungsEditor application={application()} onClose={vi.fn()} />);
    await userEvent.click(screen.getByText('Versendet'));
    await waitFor(() =>
      expect(window.RecruitApi.changeJobApplicationStatus).toHaveBeenCalledWith('a1', 'sent'),
    );
  });

  it('BewerbungsEditor_Letter_NoAiKey_ShowsNotConfiguredAndSendsNoRequest', async () => {
    window.RecruitApi.aiConfigured.mockResolvedValue(false);
    render(<BewerbungsEditor application={application()} onClose={vi.fn()} />);
    // Wait for the "KI nicht eingerichtet" hint (the AI status resolved to false).
    await waitFor(() => expect(screen.getByText(/KI nicht eingerichtet/)).toBeInTheDocument());
    await userEvent.click(screen.getByText('Anschreiben generieren'));

    expect(window.RecruitApi.generateJobApplicationLetter).not.toHaveBeenCalled();
  });

  it('BewerbungsEditor_BaseOnlyToolsHidden', async () => {
    render(<BewerbungsEditor application={application()} onClose={vi.fn()} />);
    await waitFor(() => expect(screen.getByText('Anschreiben generieren')).toBeInTheDocument());
    // The base-editor write surfaces are hidden from the application editor (AK-2.3).
    expect(screen.queryByText('CV importieren')).not.toBeInTheDocument();
    expect(screen.queryByText('ATS-Check')).not.toBeInTheDocument();
    expect(screen.queryByText('Pitch')).not.toBeInTheDocument();
    expect(screen.queryByText('Ansprache')).not.toBeInTheDocument();
    expect(screen.queryByText('Übersetzen')).not.toBeInTheDocument();
    expect(screen.queryByText('KI anpassen')).not.toBeInTheDocument();
    // The Bewerbung-specific action is the editor's own, not a base tool.
    expect(screen.getByText('Anschreiben generieren')).toBeInTheDocument();
  });

  it('BewerbungsEditor_Pdf_RendersCopyViaDossierPreview', async () => {
    render(<BewerbungsEditor application={application()} onClose={vi.fn()} />);
    // Two PDF affordances render (toolbar pill + preview header) — click either.
    await userEvent.click((await screen.findAllByText('PDF'))[0]);

    await waitFor(() => expect(window.RecruitApi.talentDossierPreviewPdf).toHaveBeenCalled());
    const [talentId, docs, recipient] = window.RecruitApi.talentDossierPreviewPdf.mock.calls[0];
    expect(talentId).toBe('t1');
    // The export renders the application's copy (here: the same documents shape).
    expect(docs.contact.name).toBe('Ada Lovelace');
    expect(docs.letter).toBeTruthy();
    expect(recipient).toBeTruthy();
    await waitFor(() => expect(window.RecruitApi.saveBlob).toHaveBeenCalled());
  });
});
