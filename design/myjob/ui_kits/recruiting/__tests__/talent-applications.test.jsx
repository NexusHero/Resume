/* Minor B — the talent profile's "Applications" tab shows the NEW job
   applications (listJobApplications), and the "New dossier" button is gone. */
import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

let TalentProfile;

const talent = {
  id: 't1',
  name: 'Ada Lovelace',
  role: 'Engineer',
  headline: '',
  location: 'Berlin',
  email: '',
  phone: '',
  availability: '',
  salary: '',
  skills: [],
  score: null,
  me: false,
  resume: null,
  attachments: [],
};

const application = {
  id: 'a1',
  ownerId: 'team',
  jobPostingId: 'p1',
  postingCompany: 'Aurora Systems',
  postingTitle: 'Senior C++ Engineer',
  talentId: 't1',
  talentName: 'Ada Lovelace',
  status: 'draft',
  statusHistory: [{ status: 'draft', at: '2026-06-25T10:00:00.000Z' }],
  documents: {
    contact: { name: 'Ada', role: '', email: '', phone: '', location: '', linkedin: '' },
    resume: { summary: '', experience: [], education: [], skillGroups: [] },
    letter: { firma: '', ansprechpartner: '', strasse: '', plzOrt: '', betreff: '', anrede: '', absaetze: [''], gruss: '' },
    style: { accent: '#2A6FDB', strong: '#1d4ed8', onDark: '#7aa7f5', font: 'var(--font-display)', size: 1 },
  },
  selectedAttachmentIds: [],
  createdAt: '2026-06-25T10:00:00.000Z',
  updatedAt: '2026-06-25T10:00:00.000Z',
};

beforeAll(async () => {
  globalThis.installDesignSystem({
    Tabs: ({ tabs = [], onChange }) => (
      <div data-tabs>
        {tabs.map((t) => (
          <button key={t.id} data-tab={t.id} onClick={() => onChange && onChange(t.id)}>
            {t.label}
          </button>
        ))}
      </div>
    ),
  });
  await import('../use-viewport.jsx');
  await import('../DataStates.jsx');
  await import('../TalentProfile.jsx');
  TalentProfile = window.TalentProfile;
});

describe('Talent profile — Applications tab (Minor B)', () => {
  beforeEach(() => {
    window.RecruitApi = {
      getTalentDocuments: vi.fn().mockResolvedValue(null),
      listAttachments: vi.fn().mockResolvedValue([]),
      listJobApplications: vi.fn().mockResolvedValue([application]),
    };
  });

  it('TalentApplications_ShowsNewJobApplications', async () => {
    render(<TalentProfile talent={talent} onBack={vi.fn()} onEdit={vi.fn()} />);
    await waitFor(() => expect(screen.queryByText('Loading…')).not.toBeInTheDocument());
    await userEvent.click(screen.getByText('Applications'));

    await waitFor(() => expect(window.RecruitApi.listJobApplications).toHaveBeenCalledWith(expect.objectContaining({ talentId: 't1' })));
    await waitFor(() => expect(screen.getByText('Aurora Systems')).toBeInTheDocument());
    expect(screen.getByText('Senior C++ Engineer')).toBeInTheDocument();
  });

  it('TalentApplications_NoNeueMappeButton', async () => {
    render(<TalentProfile talent={talent} onBack={vi.fn()} onEdit={vi.fn()} />);
    await waitFor(() => expect(screen.queryByText('Loading…')).not.toBeInTheDocument());
    await userEvent.click(screen.getByText('Applications'));

    await waitFor(() => expect(screen.getByText('Aurora Systems')).toBeInTheDocument());
    expect(screen.queryByText('New dossier')).not.toBeInTheDocument();
  });

  it('TalentApplications_StatusFilter_CallsListWithStatus', async () => {
    render(<TalentProfile talent={talent} onBack={vi.fn()} onEdit={vi.fn()} />);
    await waitFor(() => expect(screen.queryByText('Loading…')).not.toBeInTheDocument());
    await userEvent.click(screen.getByText('Applications'));
    await waitFor(() => expect(screen.getByText('Aurora Systems')).toBeInTheDocument());

    await userEvent.click(screen.getByTestId('talent-status-filter-Sent'));
    await waitFor(() =>
      expect(window.RecruitApi.listJobApplications).toHaveBeenCalledWith(
        expect.objectContaining({ talentId: 't1', status: 'sent' }),
      ),
    );
  });

  it('AttachmentsTab_ShowsLinkedApplications', async () => {
    window.RecruitApi.listJobApplications.mockResolvedValue([
      { ...application, selectedAttachmentIds: ['att1'] },
    ]);
    window.RecruitApi.listAttachments.mockResolvedValue([
      { id: 'att1', name: 'Zeugnis.pdf', contentType: 'application/pdf', size: 1024 },
    ]);
    render(<TalentProfile talent={talent} onBack={vi.fn()} onEdit={vi.fn()} />);
    await waitFor(() => expect(screen.queryByText('Loading…')).not.toBeInTheDocument());
    await userEvent.click(screen.getByText('Attachments'));

    await waitFor(() =>
      expect(screen.getByText(/linked to Aurora Systems · Senior C\+\+ Engineer/)).toBeInTheDocument(),
    );
  });

  it('AttachmentsTab_LinkOpensApplication', async () => {
    window.RecruitApi.listJobApplications.mockResolvedValue([
      { ...application, selectedAttachmentIds: ['att1'] },
    ]);
    window.RecruitApi.listAttachments.mockResolvedValue([
      { id: 'att1', name: 'Zeugnis.pdf', contentType: 'application/pdf', size: 1024 },
    ]);
    const onOpenApplication = vi.fn();
    render(
      <TalentProfile talent={talent} onBack={vi.fn()} onEdit={vi.fn()} onOpenApplication={onOpenApplication} />,
    );
    await waitFor(() => expect(screen.queryByText('Loading…')).not.toBeInTheDocument());
    await userEvent.click(screen.getByText('Attachments'));

    await userEvent.click(await screen.findByTestId('attachment-link-att1'));
    await waitFor(() => expect(onOpenApplication).toHaveBeenCalled());
  });
});
