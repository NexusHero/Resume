/* Appearance layer (#196): default resolution (system on first run), an explicit
   choice winning and persisting, the data-mode attribute flipping, and the React
   binding (useTheme) re-rendering on a toggle. */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as theme from '../theme.js';

/** Pretend the OS prefers `pref`; systemMode only queries the dark media query. */
function setSystem(pref) {
  window.matchMedia = (q) => ({
    matches: q.includes('dark') ? pref === 'dark' : pref === 'light',
    addEventListener() {},
    removeEventListener() {},
  });
}

beforeEach(() => {
  localStorage.clear();
  document.documentElement.removeAttribute('data-mode');
  delete window.matchMedia;
});
afterEach(() => {
  delete window.matchMedia;
});

describe('theme.js — appearance resolution & persistence', () => {
  it('ResolveMode_NoChoice_FollowsSystemPreference', () => {
    setSystem('light');
    expect(theme.systemMode()).toBe('light');
    expect(theme.resolveMode()).toBe('light');
    setSystem('dark');
    expect(theme.resolveMode()).toBe('dark');
  });

  it('ResolveMode_ExplicitChoice_WinsOverSystemAndPersists', () => {
    setSystem('dark');
    theme.setMode('light');
    expect(localStorage.getItem(theme.THEME_KEY)).toBe('light');
    expect(theme.resolveMode()).toBe('light'); // choice beats the dark system
    expect(document.documentElement.getAttribute('data-mode')).toBe('light');
  });

  it('SetMode_SetsDataModeAndNotifiesSubscribers', () => {
    const spy = vi.fn();
    window.addEventListener('myjob:appearancechange', spy);
    theme.setMode('dark');
    expect(document.documentElement.getAttribute('data-mode')).toBe('dark');
    expect(spy).toHaveBeenCalledTimes(1);
    window.removeEventListener('myjob:appearancechange', spy);
  });

  it('ToggleMode_FlipsAndPersists', () => {
    theme.setMode('light');
    theme.toggleMode();
    expect(theme.resolveMode()).toBe('dark');
    expect(localStorage.getItem(theme.THEME_KEY)).toBe('dark');
  });

  it('UseSystem_DropsTheChoiceAndFollowsSystemAgain', () => {
    setSystem('light');
    theme.setMode('dark');
    theme.useSystem();
    expect(localStorage.getItem(theme.THEME_KEY)).toBeNull();
    expect(theme.resolveMode()).toBe('light');
    expect(document.documentElement.getAttribute('data-mode')).toBe('light');
  });
});

describe('useTheme — the React binding', () => {
  beforeEach(async () => {
    await import('../use-theme.jsx'); // attaches window.useTheme
  });

  it('Toggle_ReRendersWithTheNewModeAndFlipsDataMode', async () => {
    setSystem('dark');
    function Probe() {
      const [mode] = window.useTheme();
      return (
        <button onClick={() => window.myJobTheme.toggleMode()}>mode:{mode}</button>
      );
    }
    render(<Probe />);
    expect(screen.getByText('mode:dark')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button'));

    expect(screen.getByText('mode:light')).toBeInTheDocument();
    expect(document.documentElement.getAttribute('data-mode')).toBe('light');
  });
});
