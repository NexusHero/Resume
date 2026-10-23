/* Stellen UI — JobPostings list/detail/insert (AK-1.1/1.5/1.6/1.7). */
import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

let JobPostings;

beforeAll(async () => {
  await import('../undo-delete.js'); // window.UndoDelete (stubbed per test)
  await import('../JobPostings.jsx');
  JobPostings = window.JobPostings;
});

const posting = (over = {}) => ({
  id: 'p1',
  ownerId: 'team',
  source: 'text',
  company: 'Aurora Systems',
  title: 'Senior C++ Engineer',
  location: 'Berlin',
  country: 'DE',
  description: 'Build fast distributed systems at Acme.',
  requirements: ['C++', 'Rust'],
  descriptionIncomplete: false,
  createdAt: '2026-06-25T10:00:00.000Z',
  ...over,
});

function codeError(code, message) {
  const err = new Error(message || code);
  err.code = code;
  return err;
}

beforeEach(() => {
  window.UndoDelete = { schedule: vi.fn(), flush: vi.fn(), getPending: () => null };
  window.RecruitApi = {
    aiConfigured: vi.fn().mockResolvedValue(true),
    extractJobPosting: vi.fn(),
    createJobPosting: vi.fn(),
    updateJobPosting: vi.fn(),
    deleteJobPosting: vi.fn().mockResolvedValue(undefined),
  };
});

describe('JobPostings — list & detail', () => {
  it('JobPostingsList_Rendered_ShowsSavedPostings', () => {
    render(
      <JobPostings postings={[posting(), posting({ id: 'p2', title: 'Frontend Dev', company: 'Globex' })]} />,
    );
    expect(screen.getByText('Senior C++ Engineer')).toBeInTheDocument();
    expect(screen.getByText('Frontend Dev')).toBeInTheDocument();
  });

  it('JobPostingsList_Search_FiltersClientSide', async () => {
    render(
      <JobPostings postings={[posting(), posting({ id: 'p2', title: 'Frontend Dev', company: 'Globex' })]} />,
    );
    await userEvent.type(screen.getByLabelText('Stellen durchsuchen'), 'frontend');
    expect(screen.queryByText('Senior C++ Engineer')).not.toBeInTheDocument();
    expect(screen.getByText('Frontend Dev')).toBeInTheDocument();
  });

  it('JobPostingsDetail_ShowsFullDescription', async () => {
    render(<JobPostings postings={[posting()]} />);
    await userEvent.click(screen.getByText('Senior C++ Engineer'));
    expect(screen.getByText('Build fast distributed systems at Acme.')).toBeInTheDocument();
  });

  it('JobPostingsDetail_Incomplete_ShowsTextErgaenzen', async () => {
    render(<JobPostings postings={[posting({ description: '', descriptionIncomplete: true })]} />);
    await userEvent.click(screen.getByText('Senior C++ Engineer'));
    expect(screen.getByText('Text ergänzen')).toBeInTheDocument();
  });

  it('JobPostingsList_Delete_ShowsUndoAndRestores', async () => {
    const onChanged = vi.fn();
    render(<JobPostings postings={[posting()]} onChanged={onChanged} />);
    await userEvent.click(screen.getByText('Senior C++ Engineer'));
    await userEvent.click(screen.getByRole('button', { name: 'Löschen' }));

    expect(window.UndoDelete.schedule).toHaveBeenCalledTimes(1);
    const action = window.UndoDelete.schedule.mock.calls[0][0];
    expect(action.label).toContain('entfernt');

    // Undo restores the hidden row.
    action.restore();
    await waitFor(() => expect(onChanged).toHaveBeenCalled());
    expect(screen.getByText('Senior C++ Engineer')).toBeInTheDocument();
  });
});

describe('JobPostings — Stelle einfügen', () => {
  it('InsertDialog_TextPath_ShowsEditablePreviewBeforeSave', async () => {
    window.RecruitApi.extractJobPosting.mockResolvedValue({
      company: 'Acme',
      title: 'Backend Engineer',
      location: 'Berlin',
      country: 'DE',
      requirements: ['Rust'],
      description: 'A long ad text.',
      source: 'text',
    });
    render(<JobPostings postings={[]} />);
    await userEvent.click(screen.getByText('Stelle einfügen'));
    await userEvent.type(screen.getByLabelText('Anzeigentext'), 'A long ad text.');
    await userEvent.click(screen.getByText('Felder extrahieren'));

    await waitFor(() => expect(screen.getByLabelText('Unternehmen')).toBeInTheDocument());
    expect(screen.getByLabelText('Unternehmen').value).toBe('Acme');
    expect(screen.getByLabelText('Stelle').value).toBe('Backend Engineer');
  });

  it('InsertDialog_NoAiKey_ShowsNotConfiguredAndSendsNoRequest', async () => {
    window.RecruitApi.aiConfigured.mockResolvedValue(false);
    render(<JobPostings postings={[]} />);
    await userEvent.click(screen.getByText('Stelle einfügen'));
    await userEvent.type(screen.getByLabelText('Anzeigentext'), 'Some text.');
    await userEvent.click(screen.getByText('Felder extrahieren'));

    await waitFor(() => expect(screen.getByText(/KI nicht eingerichtet/)).toBeInTheDocument());
    expect(window.RecruitApi.extractJobPosting).not.toHaveBeenCalled();
  });

  it('InsertDialog_UrlPath_SsrfBlocked_ShowsClearError', async () => {
    window.RecruitApi.extractJobPosting.mockRejectedValue(
      codeError('ssrf-blocked', 'The URL targets a network address that is not allowed.'),
    );
    render(<JobPostings postings={[]} />);
    await userEvent.click(screen.getByText('Stelle einfügen'));
    await userEvent.click(screen.getByText('Von URL'));
    await userEvent.type(screen.getByLabelText('URL der Stellenanzeige'), 'http://10.0.0.1/');
    await userEvent.click(screen.getByText('Felder extrahieren'));

    await waitFor(() => expect(screen.getByText(/nicht erlaubt/)).toBeInTheDocument());
  });

  it('InsertDialog_UrlPath_NoText_ShowsBitteAnzeigentextEinfuegen', async () => {
    window.RecruitApi.extractJobPosting.mockRejectedValue(
      codeError('no-text', 'The page contains no usable posting text.'),
    );
    render(<JobPostings postings={[]} />);
    await userEvent.click(screen.getByText('Stelle einfügen'));
    await userEvent.click(screen.getByText('Von URL'));
    await userEvent.type(screen.getByLabelText('URL der Stellenanzeige'), 'https://login.example.com/');
    await userEvent.click(screen.getByText('Felder extrahieren'));

    await waitFor(() =>
      expect(screen.getByText(/Bitte Anzeigentext einfügen/)).toBeInTheDocument(),
    );
  });
});
