/* Matching — "Stelle übernehmen" (AK-1.1/1.6). */
import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

let Matching;

beforeAll(async () => {
  await import('../DataStates.jsx');
  await import('../Matching.jsx');
  Matching = window.Matching;
});

const talents = [{ id: 'me', me: true, name: 'Nora Kessler', skills: ['C++'] }];

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

describe('Matching — Stelle übernehmen', () => {
  beforeEach(() => {
    window.RecruitApi = {
      searchJobs: vi.fn().mockResolvedValue({ jobs: [job], liveDown: false }),
      adoptJobPosting: vi
        .fn()
        .mockResolvedValue({ jobPosting: { id: 'p1' }, alreadySaved: false }),
    };
  });

  it('Matching_AdoptButton_CallsAdoptAndMarksDone', async () => {
    const onAdopted = vi.fn();
    render(<Matching talents={talents} onAdopted={onAdopted} />);

    await waitFor(() => expect(screen.getByText('Stelle übernehmen')).toBeInTheDocument());
    await userEvent.click(screen.getByText('Stelle übernehmen'));

    await waitFor(() => expect(window.RecruitApi.adoptJobPosting).toHaveBeenCalledTimes(1));
    expect(window.RecruitApi.adoptJobPosting.mock.calls[0][0]).toMatchObject({
      source: 'Arbeitnow',
      sourceId: 'j1',
      company: 'Aurora Systems',
      title: 'Senior C++ Engineer',
      requirements: ['C++', 'Rust'],
    });

    await waitFor(() => expect(screen.getByText('Übernommen')).toBeInTheDocument());
    expect(onAdopted).toHaveBeenCalledTimes(1);
  });

  it('Matching_AdoptAlreadySaved_OpensExistingPosting', async () => {
    window.RecruitApi.adoptJobPosting.mockResolvedValue({
      jobPosting: { id: 'p1' },
      alreadySaved: true,
    });
    const onOpenPosting = vi.fn();
    render(<Matching talents={talents} onOpenPosting={onOpenPosting} />);

    await waitFor(() => expect(screen.getByText('Stelle übernehmen')).toBeInTheDocument());
    await userEvent.click(screen.getByText('Stelle übernehmen'));

    await waitFor(() => expect(screen.getByText('Bereits gespeichert → öffnen')).toBeInTheDocument());
    await userEvent.click(screen.getByText('Bereits gespeichert → öffnen'));

    expect(onOpenPosting).toHaveBeenCalledWith('p1');
  });
});
