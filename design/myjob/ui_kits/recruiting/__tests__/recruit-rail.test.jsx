/* Tests for the responsive RecruitRail shell (ADR-0025). Desktop keeps the
   always-on rail + header search; mobile swaps to a hamburger-toggled drawer and
   drops the search. jsdom has no matchMedia, so each block stubs it. */
import { describe, it, expect, beforeAll, afterEach, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

let RecruitRail;

beforeAll(async () => {
  await import('../use-viewport.jsx'); // window.useViewport, read by the rail
  await import('../RecruitRail.jsx');
  RecruitRail = window.RecruitRail;
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

function renderRail(props = {}) {
  const onNav = props.onNav || vi.fn();
  render(
    <RecruitRail
      active="mandate"
      onNav={onNav}
      me={{ name: 'Nora' }}
      talentCount={5}
      search=""
      onSearch={vi.fn()}
      title="Mandates"
      subtitle="All the mandates"
      badges={{}}
      onLogout={vi.fn()}
    >
      <div>canvas</div>
    </RecruitRail>,
  );
  return { onNav };
}

describe('RecruitRail — desktop', () => {
  beforeEach(() => stubMatchMedia(false));

  it('Rail_Desktop_ShowsSearchAndNoHamburger', () => {
    renderRail();
    expect(screen.getByPlaceholderText(/Talents, companies, roles/)).toBeInTheDocument();
    expect(screen.queryByLabelText('Open navigation')).not.toBeInTheDocument();
  });

  it('Rail_Desktop_RailIsInFlowNotTranslated', () => {
    renderRail();
    const rail = screen.getByRole('complementary');
    expect(rail).toHaveStyle({ width: 'var(--app-nav-width)' });
    expect(rail.style.transform).toBe('');
  });
});

describe('RecruitRail — mobile', () => {
  beforeEach(() => stubMatchMedia(true));

  it('Rail_Mobile_ShowsHamburgerAndHidesSearch', () => {
    renderRail();
    expect(screen.getByLabelText('Open navigation')).toBeInTheDocument();
    expect(screen.queryByPlaceholderText(/Talents, companies, roles/)).not.toBeInTheDocument();
  });

  it('Rail_Mobile_DrawerClosedByDefaultThenOpensOnHamburger', async () => {
    renderRail();
    const rail = screen.getByRole('complementary');
    expect(rail).toHaveStyle({ transform: 'translateX(-100%)' });

    await userEvent.click(screen.getByLabelText('Open navigation'));

    expect(rail).toHaveStyle({ transform: 'translateX(0)' });
  });

  it('Rail_Mobile_NavClick_NavigatesAndClosesDrawer', async () => {
    const { onNav } = renderRail();
    await userEvent.click(screen.getByLabelText('Open navigation'));
    const rail = screen.getByRole('complementary');
    expect(rail).toHaveStyle({ transform: 'translateX(0)' });

    await userEvent.click(screen.getByRole('button', { name: 'Mandates' }));

    expect(onNav).toHaveBeenCalledWith('mandate');
    expect(rail).toHaveStyle({ transform: 'translateX(-100%)' }); // drawer closed again
  });
});
