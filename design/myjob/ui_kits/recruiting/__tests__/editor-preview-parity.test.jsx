/* Guards the WYSIWYG invariant (ADR-0052) from the browser side: the editor's
   live preview is an iframe of the exact HTML the server builds the PDF from
   (RecruitApi.previewDocumentsHtml), and it re-renders when the content or the
   style changes — so what the recruiter sees is what the export produces. */
import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
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
  resume: { summary: 'Systems pioneer.', experience: [], education: [], skillGroups: [] },
  letter: null,
};

const SERVER_HTML =
  '<!DOCTYPE html><html lang="en"><body><section id="doc-resume">PREVIEW_FROM_SERVER — Ada Lovelace</section></body></html>';

describe('Editor — live preview parity', () => {
  beforeEach(() => {
    window.RecruitApi = {
      getTalentDocuments: vi.fn().mockResolvedValue(null),
      saveTalentDocuments: vi.fn().mockResolvedValue({}),
      previewDocumentsHtml: vi.fn().mockResolvedValue(SERVER_HTML),
      talentDocumentsPdfUrl: (id) => `/api/v1/talents/${id}/documents/pdf`,
      downloadTalentDocumentsPdf: vi.fn().mockResolvedValue(undefined),
    };
  });

  it('Preview_RendersTheServerHtmlInAnIframe', async () => {
    render(<Editor talent={talent} onClose={vi.fn()} onCreateMappe={vi.fn()} />);

    // The preview is an iframe fed by the server render (not a hand-built DOM).
    const frame = await screen.findByTitle('Dokumentvorschau');
    expect(frame.tagName).toBe('IFRAME');
    await waitFor(() => expect(frame.getAttribute('srcdoc')).toContain('PREVIEW_FROM_SERVER'));

    // It asked the server to render the current editor content.
    expect(window.RecruitApi.previewDocumentsHtml).toHaveBeenCalled();
    const [id, payload] = window.RecruitApi.previewDocumentsHtml.mock.calls[0];
    expect(id).toBe('t1');
    expect(payload).toHaveProperty('contact');
    expect(payload).toHaveProperty('resume');
    expect(payload).toHaveProperty('letter');
    expect(payload).toHaveProperty('style');
  });

  it('Preview_ReRendersWhenTheStyleChanges', async () => {
    render(<Editor talent={talent} onClose={vi.fn()} onCreateMappe={vi.fn()} />);
    await waitFor(() => expect(window.RecruitApi.previewDocumentsHtml).toHaveBeenCalled());
    const before = window.RecruitApi.previewDocumentsHtml.mock.calls.length;

    // Switching the template is a style change — the preview must re-fetch so the
    // exported PDF and what the recruiter sees stay in lockstep.
    await userEvent.click(screen.getByText('Modern'));

    await waitFor(() =>
      expect(window.RecruitApi.previewDocumentsHtml.mock.calls.length).toBeGreaterThan(before),
    );
    const lastPayload = window.RecruitApi.previewDocumentsHtml.mock.calls.at(-1)[1];
    expect(lastPayload.style.template).toBe('modern');
  });

  it('Preview_SelectingInk_ReRendersWithTheInkTemplate', async () => {
    render(<Editor talent={talent} onClose={vi.fn()} onCreateMappe={vi.fn()} />);
    await waitFor(() => expect(window.RecruitApi.previewDocumentsHtml).toHaveBeenCalled());
    const before = window.RecruitApi.previewDocumentsHtml.mock.calls.length;

    await userEvent.click(screen.getByText('Ink'));

    await waitFor(() =>
      expect(window.RecruitApi.previewDocumentsHtml.mock.calls.length).toBeGreaterThan(before),
    );
    const lastPayload = window.RecruitApi.previewDocumentsHtml.mock.calls.at(-1)[1];
    expect(lastPayload.style.template).toBe('ink');
  });
});
