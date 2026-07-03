/* Tests for the E1.3 responsive views (ADR-0027): the Editor stacks its two
   panes and wraps its toolbar on mobile, the CV profile stacks its columns, and
   the form modals drop to a single column. Asserted through the inline grid
   templates, with matchMedia stubbed per block. */
import { describe, it, expect, beforeAll, afterEach, beforeEach, vi } from 'vitest';
import { render, waitFor } from '@testing-library/react';

let Editor;
let TalentProfile;
let RecordFormModal;

beforeAll(async () => {
  await import('../use-viewport.jsx');
  await import('../DataStates.jsx'); // window.LoadingState, shown while the profile loads
  // The editor reads its collaborators off window at module scope, so import the
  // pieces in the same order main.jsx does before the editor itself.
  await import('../EditorShared.jsx');
  await import('../EditorDocs.jsx');
  await import('../EditorModals.jsx');
  await import('../Editor.jsx');
  await import('../TalentProfile.jsx');
  await import('../RecordFormModal.jsx');
  Editor = window.Editor;
  TalentProfile = window.TalentProfile;
  RecordFormModal = window.RecordFormModal;
});

afterEach(() => {
  delete window.matchMedia;
});

function stubMatchMedia(matches) {
  window.matchMedia = vi.fn().mockImplementation((query) => ({
    matches,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
  }));
}

const gridCols = (container) =>
  [...container.querySelectorAll('[style]')].map((el) => el.style.gridTemplateColumns).filter(Boolean);
const flexWraps = (container) =>
  [...container.querySelectorAll('[style]')].map((el) => el.style.flexWrap).filter(Boolean);

const meTalent = {
  id: 'me',
  name: 'Nora Kessler',
  role: 'Recruiter',
  email: '',
  phone: '',
  location: '',
  linkedin: '',
  src: null,
  resume: { summary: '', experience: [], education: [], skillGroups: [] },
  letter: null,
};

describe('Editor — responsive', () => {
  it('Editor_Desktop_TwoPaneSideBySideAndToolbarNoWrap', () => {
    stubMatchMedia(false);
    const { container } = render(<Editor talent={meTalent} onClose={vi.fn()} onCreateMappe={vi.fn()} />);
    expect(gridCols(container)).toContain('380px 1fr');
    expect(flexWraps(container)).toContain('nowrap');
  });

  it('Editor_Mobile_PanesStackAndToolbarWraps', () => {
    stubMatchMedia(true);
    const { container } = render(<Editor talent={meTalent} onClose={vi.fn()} onCreateMappe={vi.fn()} />);
    expect(gridCols(container)).not.toContain('380px 1fr'); // stacked
    expect(flexWraps(container)).toContain('wrap');
  });
});

describe('RecordFormModal — responsive', () => {
  it('Record_Desktop_FieldsInTwoColumns', () => {
    stubMatchMedia(false);
    const { container } = render(<RecordFormModal kind="mandate" onClose={vi.fn()} onSubmit={vi.fn()} />);
    expect(gridCols(container)).toContain('1fr 1fr');
  });

  it('Record_Mobile_FieldsStackToOneColumn', () => {
    stubMatchMedia(true);
    const { container } = render(<RecordFormModal kind="mandate" onClose={vi.fn()} onSubmit={vi.fn()} />);
    expect(gridCols(container)).not.toContain('1fr 1fr');
  });
});

describe('TalentProfile — responsive CV', () => {
  beforeEach(() => {
    window.RecruitApi = {
      getTalentDocuments: vi.fn().mockResolvedValue(null),
      listAttachments: vi.fn().mockResolvedValue([]),
    };
  });

  const talent = {
    id: 't1',
    name: 'Ada Lovelace',
    role: 'Staff Engineer',
    resume: { summary: 'x', experience: [], education: [], skillGroups: [] },
  };

  it('Profile_Desktop_CvColumnsSideBySide', async () => {
    stubMatchMedia(false);
    const { container } = render(<TalentProfile talent={talent} apps={[]} onBack={vi.fn()} onEdit={vi.fn()} onCreateMappe={vi.fn()} />);
    await waitFor(() => expect(gridCols(container)).toContain('1fr 300px'));
    expect(gridCols(container)).toContain('264px 1fr');
  });

  it('Profile_Mobile_CvColumnsStack', async () => {
    stubMatchMedia(true);
    const { container } = render(<TalentProfile talent={talent} apps={[]} onBack={vi.fn()} onEdit={vi.fn()} onCreateMappe={vi.fn()} />);
    await waitFor(() => expect(container.querySelector('[data-ds="Card"]')).toBeTruthy());
    expect(gridCols(container)).not.toContain('1fr 300px');
    expect(gridCols(container)).not.toContain('264px 1fr');
  });
});
