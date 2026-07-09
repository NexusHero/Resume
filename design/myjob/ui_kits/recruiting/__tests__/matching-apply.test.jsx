/* Regression tests for Matching: the "+" apply action (Bug: manual matching had
   no way to apply a candidate) and the removal of the sample-postings banner in
   favour of an honest live-sources-down notice (Bug: no real jobs / mock data). */
import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

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

describe('Matching — apply on a candidate’s behalf', () => {
  beforeEach(() => {
    window.RecruitApi = {
      searchJobs: vi.fn().mockResolvedValue({ jobs: [job], liveDown: false }),
    };
  });

  it('Apply_Click_CallsOnApplyWithJobAndSelectedCandidate', async () => {
    const onApply = vi.fn().mockResolvedValue({ id: 'app1' });
    render(<Matching talents={talents} onApply={onApply} />);

    await waitFor(() => expect(screen.getByText('Apply Nora')).toBeInTheDocument());
    await userEvent.click(screen.getByText('Apply Nora'));

    expect(onApply).toHaveBeenCalledTimes(1);
    expect(onApply.mock.calls[0][0]).toMatchObject({ id: 'j1', company: 'Aurora Systems' });
    expect(onApply.mock.calls[0][1]).toMatchObject({ id: 'me', name: 'Nora Kessler' });
    await waitFor(() => expect(screen.getByText('Applied · Nora')).toBeInTheDocument());
  });

  it('NoOnApply_ShowsNoApplyButton', async () => {
    render(<Matching talents={talents} />);
    // Wait for the postings to load (the mode toggle is present once loaded).
    await screen.findByText('Auto · Skill-Match');
    expect(screen.queryByText(/^Apply /)).not.toBeInTheDocument();
  });
});

describe('Matching — real jobs only', () => {
  it('LiveSourcesDown_ShowsOutageNoticeNotSample', async () => {
    window.RecruitApi = {
      searchJobs: vi.fn().mockResolvedValue({ jobs: [], liveDown: true }),
    };
    render(<Matching talents={talents} onApply={vi.fn()} />);
    await waitFor(() =>
      expect(screen.getByText(/Live job sources are unreachable/)).toBeInTheDocument(),
    );
    // The old "sample postings" wording must be gone.
    expect(screen.queryByText(/sample postings/i)).not.toBeInTheDocument();
  });
});

describe('Matching — accumulated source counts', () => {
  it('ShowsTotalAndPerSourceBreakdown_MarksDownSources', async () => {
    window.RecruitApi = {
      searchJobs: vi.fn().mockResolvedValue({
        jobs: [job],
        liveDown: false,
        total: 63,
        sources: [
          { name: 'Arbeitnow', count: 25, ok: true },
          { name: 'Remotive', count: 38, ok: true },
          { name: 'Adzuna', count: 0, ok: false },
        ],
      }),
    };
    render(<Matching talents={talents} onApply={vi.fn()} />);

    const strip = await screen.findByTestId('source-counts');
    // accumulated total across all API sources
    expect(strip).toHaveTextContent('63 jobs');
    // only the two healthy sources count toward "across N/M"
    expect(strip).toHaveTextContent('across 2/3 sources');
    // per-board counts, with the down board shown as unavailable
    expect(strip).toHaveTextContent('Arbeitnow 25');
    expect(strip).toHaveTextContent('Remotive 38');
    expect(strip).toHaveTextContent('Adzuna —');
  });

  it('NoSourcesInResponse_HidesStrip', async () => {
    window.RecruitApi = { searchJobs: vi.fn().mockResolvedValue({ jobs: [job], liveDown: false }) };
    render(<Matching talents={talents} onApply={vi.fn()} />);
    await screen.findByText('Auto · Skill-Match');
    expect(screen.queryByTestId('source-counts')).not.toBeInTheDocument();
  });
});

describe('Matching — apply without a job board', () => {
  const mandates = [{ id: 'm1', client: 'Aurora Systems GmbH', role: 'Senior C++ Engineer' }];

  beforeEach(() => {
    // No live postings at all — the manual apply path must still work.
    window.RecruitApi = { searchJobs: vi.fn().mockResolvedValue({ jobs: [], liveDown: true }) };
  });

  it('ManualRole_TypedCompanyAndRole_AppliesSelectedCandidate', async () => {
    const onApply = vi.fn().mockResolvedValue({ id: 'app1' });
    render(<Matching talents={talents} mandates={mandates} onApply={onApply} />);

    await userEvent.click(await screen.findByText('Manual'));
    await userEvent.type(screen.getByLabelText('Company'), 'Helio GmbH');
    await userEvent.type(screen.getByLabelText('Role'), 'Backend Engineer');
    await userEvent.click(screen.getByRole('button', { name: /^Apply$/ }));

    expect(onApply).toHaveBeenCalledTimes(1);
    expect(onApply.mock.calls[0][0]).toMatchObject({ company: 'Helio GmbH', title: 'Backend Engineer' });
    expect(onApply.mock.calls[0][1]).toMatchObject({ id: 'me' });
    await waitFor(() => expect(screen.getByText('Applied')).toBeInTheDocument());
  });

  it('ManualRole_PrefillFromMandate_FillsCompanyAndRole', async () => {
    const onApply = vi.fn().mockResolvedValue({});
    render(<Matching talents={talents} mandates={mandates} onApply={onApply} />);

    await userEvent.click(await screen.findByText('Manual'));
    await userEvent.selectOptions(screen.getByLabelText('Prefill from a mandate'), 'm1');

    expect(screen.getByLabelText('Company')).toHaveValue('Aurora Systems GmbH');
    expect(screen.getByLabelText('Role')).toHaveValue('Senior C++ Engineer');
  });
});
