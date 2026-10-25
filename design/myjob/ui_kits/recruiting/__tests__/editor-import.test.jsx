/* Fehler 1 + 2 — text import without a key, and the original CV only on accept. */
import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

let Editor;

const ORIGINAL = 'Original CV (import).pdf';

const talent = {
  id: 't1',
  name: 'Ada Lovelace',
  role: 'Staff Engineer',
  email: '',
  phone: '',
  location: '',
  linkedin: '',
  resume: {
    summary: 'Bestehendes Profil',
    experience: [
      { role: 'Senior Dev', company: 'Acme', period: '', location: '', bullets: [], skills: [] },
    ],
    education: [],
    skillGroups: [],
    rawText: '',
  },
  letter: null,
};

const docs = () => ({
  contact: { name: 'Ada Lovelace', role: 'Staff Engineer', email: '', phone: '', location: '', linkedin: '' },
  resume: talent.resume,
  letter: { firma: '', ansprechpartner: '', strasse: '', plzOrt: '', betreff: '', anrede: '', absaetze: [''], gruss: '' },
  style: { accent: '#000', strong: '#000', onDark: '#000', font: 'x', size: 1 },
});

beforeAll(async () => {
  await import('../use-viewport.jsx');
  await import('../DataStates.jsx');
  await import('../ai-status.js');
  await import('../use-ai-status.jsx');
  await import('../AiGate.jsx');
  await import('../EditorShared.jsx');
  await import('../EditorDocs.jsx');
  await import('../EditorModals.jsx');
  await import('../import-merge.js');
  await import('../Editor.jsx');
  Editor = window.Editor;
});

beforeEach(async () => {
  window.AiStatus.reset();
  window.RecruitApi = {
    getLlmSettings: vi.fn().mockResolvedValue({ configured: false, current: null, providers: [] }),
    aiConfigured: vi.fn().mockResolvedValue(false),
    getTalentDocuments: vi.fn().mockResolvedValue(docs()),
    saveTalentDocuments: vi.fn().mockResolvedValue({}),
    previewDocumentsHtml: vi.fn().mockResolvedValue('<html></html>'),
    talentDocumentsPdfUrl: () => '/api/v1/talents/t1/documents/pdf',
    parseDocument: vi.fn().mockResolvedValue({ mode: 'text', contact: {}, resume: { rawText: 'FULL CV TEXT' } }),
    parseDocumentPdf: vi.fn().mockResolvedValue({ mode: 'text', contact: {}, resume: { rawText: 'PDF TEXT' } }),
    listAttachments: vi.fn().mockResolvedValue([]),
    uploadAttachment: vi.fn().mockImplementation(async (_id, input) => ({ id: 'a-new', ...input })),
    deleteAttachment: vi.fn().mockResolvedValue(undefined),
  };
  await window.AiStatus.refresh();
});

const openEditor = async () => {
  const view = render(<Editor talent={talent} onClose={vi.fn()} onCreateMappe={vi.fn()} />);
  await waitFor(() => expect(view.container.querySelector('[data-doc-hydrated="true"]')).toBeTruthy());
  return view;
};

describe('Editor text import (Fehler 1)', () => {
  it('ImportModal_NoAiKey_TextImportWorksAndShowsTextModeNotice', async () => {
    await openEditor();
    await userEvent.click(screen.getByText('Import CV'));
    expect(screen.getAllByText(/Text imported \(without AI\)/).length).toBeGreaterThan(0);
    await userEvent.type(screen.getByPlaceholderText('Paste CV text here…'), 'Mein CV');
    await userEvent.click(screen.getByText('Analyze & apply'));
    await waitFor(() => expect(window.RecruitApi.parseDocument).toHaveBeenCalledWith('t1', 'Mein CV'));
    expect(await screen.findByText(/Text imported \(without AI\)/)).toBeInTheDocument();
  });

  it('EditorImport_TextMode_DoesNotClearExistingExperience', async () => {
    const { container } = await openEditor();
    await userEvent.click(screen.getByText('Import CV'));
    await userEvent.type(screen.getByPlaceholderText('Paste CV text here…'), 'Mein CV');
    await userEvent.click(screen.getByText('Analyze & apply'));
    await userEvent.click(await screen.findByText('Apply'));

    expect(await screen.findByText(/Imported text \(without AI\)/)).toBeInTheDocument();
    await waitFor(
      () => {
        const last = window.RecruitApi.saveTalentDocuments.mock.calls.at(-1);
        expect(last?.[1]?.resume?.summary).toBe('Bestehendes Profil');
        expect(last?.[1]?.resume?.rawText).toBe('FULL CV TEXT');
        expect(last?.[1]?.resume?.experience).toHaveLength(1);
        expect(last?.[1]?.resume?.experience[0].role).toBe('Senior Dev');
      },
      { timeout: 3000 },
    );
    expect(container.textContent).not.toContain('Senior Dev removed');
  });

  it('EditorImport_TruncatedText_ShowsTruncationNotice', async () => {
    // The server flags a CV cut at 50,000 chars; the editor must surface it
    // (text AND ai mode go through the same preview block).
    window.RecruitApi.parseDocument.mockResolvedValue({
      mode: 'text',
      truncated: true,
      contact: {},
      resume: { rawText: 'x'.repeat(50000) },
    });
    await openEditor();
    await userEvent.click(screen.getByText('Import CV'));
    await userEvent.type(screen.getByPlaceholderText('Paste CV text here…'), 'Mein CV');
    await userEvent.click(screen.getByText('Analyze & apply'));
    expect(await screen.findByText('Text was truncated at 50,000 characters.')).toBeInTheDocument();
  });
});

describe('Editor import attachment lifecycle (Fehler 2)', () => {
  const uploadPdf = async (view) => {
    const input = view.container.querySelector('input[type="file"][accept=".pdf,.html"]');
    const file = new File(['%PDF-1.4'], 'cv.pdf', { type: 'application/pdf' });
    await userEvent.upload(input, file);
    await waitFor(() => expect(window.RecruitApi.parseDocumentPdf).toHaveBeenCalled());
  };

  it('EditorImport_TextMode_PdfUploadedOnlyOnAccept', async () => {
    const view = await openEditor();
    await userEvent.click(screen.getByText('Import CV'));
    await uploadPdf(view);
    await screen.findByText('Apply');
    expect(window.RecruitApi.uploadAttachment).not.toHaveBeenCalled();

    await userEvent.click(screen.getByText('Apply'));
    await waitFor(() =>
      expect(window.RecruitApi.uploadAttachment).toHaveBeenCalledWith(
        't1',
        expect.objectContaining({ name: ORIGINAL, contentType: 'application/pdf' }),
      ),
    );
  });

  it('EditorImport_TextMode_DiscardLeavesNoAttachment', async () => {
    const view = await openEditor();
    await userEvent.click(screen.getByText('Import CV'));
    await uploadPdf(view);
    await userEvent.click(await screen.findByText('Discard'));
    expect(window.RecruitApi.uploadAttachment).not.toHaveBeenCalled();
  });

  it('EditorImport_TextMode_ReimportReplacesOriginalAttachment', async () => {
    window.RecruitApi.listAttachments.mockResolvedValue([
      { id: 'a-old', name: ORIGINAL, size: 8, contentType: 'application/pdf' },
    ]);
    const view = await openEditor();
    await userEvent.click(screen.getByText('Import CV'));
    await uploadPdf(view);
    await userEvent.click(await screen.findByText('Apply'));
    await waitFor(() => expect(window.RecruitApi.uploadAttachment).toHaveBeenCalled());
    await waitFor(() => expect(window.RecruitApi.deleteAttachment).toHaveBeenCalledWith('a-old'));
  });
});
