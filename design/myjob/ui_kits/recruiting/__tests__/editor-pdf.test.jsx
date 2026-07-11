/* Regression tests for the Editor's PDF export. The bug: the PDF button opened
   the endpoint with window.open(), which silently fails under the app's strict
   CSP / installed PWA / native shell, so nothing downloaded. The fix fetches the
   bytes and saves a file, and surfaces any failure. */
import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

let Editor;

beforeAll(async () => {
  await import('../use-viewport.jsx');
  await import('../DataStates.jsx');
  await import('../EditorShared.jsx');
  await import('../EditorDocs.jsx');
  await import('../EditorModals.jsx');
  await import('../Editor.jsx');
  Editor = window.Editor;
});

const talent = {
  id: 't1',
  name: 'Ada Lovelace',
  role: 'Staff Engineer',
  email: '',
  phone: '',
  location: '',
  linkedin: '',
  resume: { summary: '', experience: [], education: [], skillGroups: [] },
  letter: null,
};

describe('Editor — PDF export', () => {
  beforeEach(() => {
    window.RecruitApi = {
      getTalentDocuments: vi.fn().mockResolvedValue(null),
      saveTalentDocuments: vi.fn().mockResolvedValue({}),
      talentDocumentsPdfUrl: (id) => `/api/v1/talents/${id}/documents/pdf`,
      downloadTalentDocumentsPdf: vi.fn().mockResolvedValue(undefined),
    };
  });

  it('Pdf_Click_DownloadsFileNamedAfterCandidate', async () => {
    render(<Editor talent={talent} onClose={vi.fn()} onCreateMappe={vi.fn()} />);
    await userEvent.click(screen.getAllByText('PDF')[0]);
    expect(window.RecruitApi.downloadTalentDocumentsPdf).toHaveBeenCalledWith(
      't1',
      'Ada-Lovelace.pdf',
    );
  });

  it('Pdf_Failure_ShowsError', async () => {
    window.RecruitApi.downloadTalentDocumentsPdf.mockRejectedValue(new Error('API 500'));
    render(<Editor talent={talent} onClose={vi.fn()} onCreateMappe={vi.fn()} />);
    await userEvent.click(screen.getAllByText('PDF')[0]);
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Der PDF-Download ist fehlgeschlagen. Bitte versuche es erneut.');
  });
});
