/* Regression test for the Editor's autosave. The bug: opening a document
   applied the loaded content via setState, which tripped the autosave effect
   and re-PUT the *unchanged* documents right back to the server. Besides being
   a wasteful write, it made "did my edit save?" checks race a spurious save.
   The fix records a baseline of the loaded content and only saves when the
   current content actually differs from it. */
import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import { render, waitFor } from '@testing-library/react';

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
  id: 't1', // a real, server-backed talent → canPersist
  name: 'Ada Lovelace',
  role: 'Staff Engineer',
  email: '',
  phone: '',
  location: '',
  linkedin: '',
  resume: { summary: '', experience: [], education: [], skillGroups: [] },
  letter: null,
};

describe('Editor — persistence', () => {
  beforeEach(() => {
    window.RecruitApi = {
      // Stored documents differ from the talent props so we know hydration ran.
      getTalentDocuments: vi.fn().mockResolvedValue({
        contact: { name: 'Ada (stored)', role: 'Staff Engineer', email: '', phone: '', location: '', linkedin: '' },
        resume: { summary: 'stored summary', experience: [], education: [], skillGroups: [] },
        letter: { firma: '', ansprechpartner: '', strasse: '', plzOrt: '', betreff: '', anrede: '', absaetze: [''], gruss: '' },
        style: { accent: '#2A6FDB', strong: '#1d4ed8', onDark: '#7aa7f5', font: 'var(--font-display)', size: 1 },
      }),
      saveTalentDocuments: vi.fn().mockResolvedValue({}),
      talentDocumentsPdfUrl: () => '/api/v1/talents/t1/documents/pdf',
      suggestDocument: vi.fn(),
    };
  });

  it('OpeningDocument_DoesNotResaveUnchangedContent', async () => {
    const { container } = render(<Editor talent={talent} onClose={vi.fn()} onCreateMappe={vi.fn()} />);

    // Hydration applied: the loaded documents are now in the form.
    await waitFor(() =>
      expect(container.querySelector('[data-doc-hydrated="true"]')).toBeTruthy(),
    );
    expect(window.RecruitApi.getTalentDocuments).toHaveBeenCalledWith('t1');

    // Let the autosave debounce (800ms) elapse — a spurious save would fire here.
    await new Promise((resolve) => setTimeout(resolve, 1000));
    expect(window.RecruitApi.saveTalentDocuments).not.toHaveBeenCalled();
  });
});
