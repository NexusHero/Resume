/* Tests for the responsive SettingsView (ADR-0025, E1 final gap): the AI-provider
   rows carry a three-column grid (name · key · controls) on desktop that can't
   fit on a phone, so on mobile each row collapses to a single stacked column.
   Asserted through the inline grid template, with matchMedia stubbed per block. */
import { describe, it, expect, beforeAll, afterEach, beforeEach, vi } from 'vitest';
import { render, waitFor } from '@testing-library/react';

let SettingsView;

beforeAll(async () => {
  await import('../use-viewport.jsx');
  await import('../SettingsView.jsx');
  SettingsView = window.SettingsView;
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

const gridCols = (container) =>
  [...container.querySelectorAll('[style]')]
    .map((el) => el.style.gridTemplateColumns)
    .filter(Boolean);

const PROVIDER_COLS = 'minmax(0,1fr) minmax(0,1.3fr) auto';

beforeEach(() => {
  // A non-admin user keeps the Team/Compliance cards minimal, so the only grids
  // in the tree come from the provider rows under test.
  window.RecruitApi = {
    getLlmSettings: vi.fn().mockResolvedValue({
      current: 'claude',
      providers: [
        { id: 'claude', label: 'Claude', available: true },
        { id: 'gemini', label: 'Gemini', available: false },
      ],
    }),
    getApiKeyStatus: vi.fn().mockResolvedValue({}),
    authMe: vi.fn().mockResolvedValue({ id: 'me', email: 'me@x.io', roles: ['recruiter'] }),
    getUsage: vi.fn().mockResolvedValue({ requests: 0 }),
  };
});

const user = { id: 'me', email: 'me@x.io', verifiedAt: '2026-01-01T00:00:00.000Z' };

describe('SettingsView — responsive provider rows', () => {
  it('Providers_Desktop_ThreeColumnGrid', async () => {
    stubMatchMedia(false);
    const { container } = render(<SettingsView user={user} />);
    await waitFor(() => expect(gridCols(container)).toContain(PROVIDER_COLS));
  });

  it('Providers_Mobile_StackToOneColumn', async () => {
    stubMatchMedia(true);
    const { container } = render(<SettingsView user={user} />);
    // Wait until the provider rows have rendered (the key-status effect resolves).
    await waitFor(() => expect(gridCols(container).length).toBeGreaterThan(0));
    expect(gridCols(container)).not.toContain(PROVIDER_COLS);
    expect(gridCols(container)).toContain('1fr');
  });
});
