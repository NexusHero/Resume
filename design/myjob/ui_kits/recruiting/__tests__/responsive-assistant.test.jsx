/* Tests for the responsive AssistantView review queue (ADR-0025). Each proposed
   suggestion is a three-part row — kind badge · content · Approve/Dismiss — that
   squeezes the content to nothing on a phone. On mobile the row stacks
   (flex-direction column) so the content gets full width and the actions drop
   below. Asserted through the inline flex-direction, matchMedia stubbed per block. */
import { describe, it, expect, beforeAll, afterEach, beforeEach, vi } from 'vitest';
import { render, waitFor } from '@testing-library/react';

let AssistantView;

beforeAll(async () => {
  await import('../use-viewport.jsx');
  await import('../AssistantView.jsx');
  AssistantView = window.AssistantView;
});

afterEach(() => {
  delete window.matchMedia;
  delete window.RecruitApi;
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

const flexDirs = (container) =>
  [...container.querySelectorAll('[style]')].map((el) => el.style.flexDirection).filter(Boolean);

beforeEach(() => {
  window.RecruitApi = {
    getAssistant: vi.fn().mockResolvedValue({
      settings: {
        enabled: true,
        mode: 'suggest',
        intervalMinutes: 60,
        applySource: 'jobs',
        minApplyScore: 70,
        lastRunAt: null,
      },
      counts: {},
    }),
    listAssistantSuggestions: vi.fn().mockResolvedValue([
      { id: 's1', kind: 'shortlist-add', title: 'Add Jonas', rationale: 'Strong match', status: 'proposed' },
    ]),
  };
});

describe('AssistantView — responsive review queue', () => {
  it('Queue_Desktop_RowLaidOutInline', async () => {
    stubMatchMedia(false);
    const { container, findByText } = render(<AssistantView onChanged={vi.fn()} />);
    await findByText('Add Jonas');
    // The suggestion row keeps the badge · content · actions on one line.
    expect(flexDirs(container)).toContain('row');
  });

  it('Queue_Mobile_RowStacks', async () => {
    stubMatchMedia(true);
    const { container, findByText } = render(<AssistantView onChanged={vi.fn()} />);
    await findByText('Add Jonas');
    await waitFor(() => expect(flexDirs(container)).toContain('column'));
    expect(flexDirs(container)).not.toContain('row'); // the stacked row is not inline
  });
});
