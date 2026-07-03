/* Tests for the responsive dense views (ADR-0026). The KPI grids collapse from
   four to two columns and the fixed-column tables gain a horizontal-scroll
   wrapper on mobile; desktop keeps its layout. Asserted through the inline grid
   template and the overflow wrapper, with matchMedia stubbed per block. */
import { describe, it, expect, beforeAll, afterEach, beforeEach, vi } from 'vitest';
import { render } from '@testing-library/react';

let Dashboard;
let PlatzierungenView;

beforeAll(async () => {
  await import('../use-viewport.jsx');
  await import('../Workspace.jsx');
  await import('../VermittlerViews.jsx');
  Dashboard = window.Dashboard;
  PlatzierungenView = window.PlatzierungenView;
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

const dashboardProps = {
  me: { name: 'Nora Kessler' },
  apps: [],
  vkpis: [{ label: 'A' }, { label: 'B' }, { label: 'C' }, { label: 'D' }],
  clients: [],
  mandates: [],
  onOpenTalent: vi.fn(),
  onOpenPipeline: vi.fn(),
  onOpenMandate: vi.fn(),
};

const kpiGridOf = (container) => container.querySelector('[data-ds="StatCard"]').parentElement;

describe('Dashboard — responsive', () => {
  it('Dashboard_Desktop_KpisInFourColumns', () => {
    stubMatchMedia(false);
    const { container } = render(<Dashboard {...dashboardProps} />);
    expect(kpiGridOf(container).style.gridTemplateColumns).toBe('repeat(4, 1fr)');
  });

  it('Dashboard_Mobile_KpisCollapseToTwoColumns', () => {
    stubMatchMedia(true);
    const { container } = render(<Dashboard {...dashboardProps} />);
    expect(kpiGridOf(container).style.gridTemplateColumns).toBe('repeat(2, 1fr)');
  });

  it('Dashboard_Mobile_MainSectionStacksToOneColumn', () => {
    stubMatchMedia(true);
    const { container } = render(<Dashboard {...dashboardProps} />);
    const section = container.querySelector('[data-ds="Card"]').parentElement;
    expect(section.style.gridTemplateColumns).toBe('1fr');
  });
});

describe('PlatzierungenView — responsive', () => {
  const props = {
    kpis: [{ label: 'A' }, { label: 'B' }, { label: 'C' }, { label: 'D' }],
    placements: [
      { id: 'p1', candName: 'Ada', candRole: 'Eng', client: 'Helio', start: '2026-01', fee: '12 T€', status: 'Paid' },
    ],
    onEdit: vi.fn(),
  };

  beforeEach(() => {});

  it('Placements_Desktop_NoHorizontalScrollWrapper', () => {
    stubMatchMedia(false);
    const { container } = render(<PlatzierungenView {...props} />);
    expect(kpiGridOf(container).style.gridTemplateColumns).toBe('repeat(4, 1fr)');
    expect(container.querySelectorAll('[style*="overflow-x: auto"]')).toHaveLength(0);
  });

  it('Placements_Mobile_KpisCollapseAndTableScrolls', () => {
    stubMatchMedia(true);
    const { container } = render(<PlatzierungenView {...props} />);
    expect(kpiGridOf(container).style.gridTemplateColumns).toBe('repeat(2, 1fr)');
    expect(container.querySelectorAll('[style*="overflow-x: auto"]').length).toBeGreaterThan(0);
  });
});
