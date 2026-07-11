/* Regression tests for the Editor's "AI tailor" action. The bug: a failing
   suggestDocument call was swallowed by an empty catch, so pressing the button
   produced no visible reaction at all. The fix surfaces the error (and keeps
   the success path intact). */
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

describe('Editor — AI tailor', () => {
  beforeEach(() => {
    window.RecruitApi = {
      getTalentDocuments: vi.fn().mockResolvedValue(null),
      saveTalentDocuments: vi.fn().mockResolvedValue({}),
      talentDocumentsPdfUrl: () => '/api/v1/talents/t1/documents/pdf',
      suggestDocument: vi.fn(),
    };
  });

  it('AiTailor_Failure_ShowsErrorInsteadOfNothing', async () => {
    window.RecruitApi.suggestDocument.mockRejectedValue(
      new Error('This is a Pro feature. Upgrade to unlock it.'),
    );
    render(<Editor talent={talent} onClose={vi.fn()} onCreateMappe={vi.fn()} />);

    await userEvent.click(screen.getByText('KI anpassen'));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('KI-Anpassung fehlgeschlagen');
    expect(alert).toHaveTextContent('This is a Pro feature. Upgrade to unlock it.');
    expect(window.RecruitApi.suggestDocument).toHaveBeenCalledWith('t1', 'summary', {});
  });

  it('AiTailor_Success_ShowsSuggestionAndNoError', async () => {
    window.RecruitApi.suggestDocument.mockResolvedValue({
      action: 'summary',
      text: 'A crisp tailored summary.',
      provider: 'template',
    });
    render(<Editor talent={talent} onClose={vi.fn()} onCreateMappe={vi.fn()} />);

    await userEvent.click(screen.getByText('KI anpassen'));

    await waitFor(() => expect(screen.getByText('A crisp tailored summary.')).toBeInTheDocument());
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
