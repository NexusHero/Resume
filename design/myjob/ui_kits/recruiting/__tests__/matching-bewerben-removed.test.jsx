/* AK-2.8 / Aufrufstelle 4 — the Matching "X bewerben"/"Bewerben" apply path is
   removed (replaced by "Adopt job → Create application"). */
import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

let Matching;

beforeAll(async () => {
  await import('../DataStates.jsx');
  await import('../Matching.jsx');
  Matching = window.Matching;
});

const talents = [
  { id: 'me', me: true, name: 'Nora Kessler', skills: ['C++'] },
  { id: 't1', me: false, name: 'Mara Vogel', skills: ['C++', 'Rust'] },
];

const job = {
  id: 'j1',
  title: 'Senior C++ Engineer',
  company: 'Aurora Systems',
  location: 'Berlin',
  country: 'DE',
  source: 'Arbeitnow',
  url: 'https://example.com/job',
  req: ['C++', 'Rust'],
};

describe('Matching — Bewerben path removed (AK-2.8)', () => {
  beforeEach(() => {
    window.RecruitApi = {
      searchJobs: vi.fn().mockResolvedValue({ jobs: [job], liveDown: false }),
      adoptJobPosting: vi.fn().mockResolvedValue({ jobPosting: { id: 'p1' }, alreadySaved: false }),
    };
  });

  it('Matching_NoBewerbenButton', async () => {
    render(<Matching talents={talents} />);
    await screen.findByText('Auto · skill match');

    // No "X bewerben" button on the card, no manual "Bewerben" / "stellvertretend bewerben".
    expect(screen.queryByText(/ bewerben$/)).not.toBeInTheDocument();
    expect(screen.queryByText(/stellvertretend bewerben/)).not.toBeInTheDocument();
    // "Adopt job" remains.
    await waitFor(() => expect(screen.getByText('Adopt job')).toBeInTheDocument());
  });
});
