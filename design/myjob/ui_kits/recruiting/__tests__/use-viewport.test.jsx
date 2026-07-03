/* Tests for the useViewport breakpoint hook (ADR-0025). jsdom has no
   matchMedia, so each test installs a stub; the "absent" case proves the hook
   degrades to desktop instead of throwing. */
import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest';
import { renderHook } from '@testing-library/react';

let useViewport;

beforeAll(async () => {
  await import('../use-viewport.jsx');
  useViewport = window.useViewport;
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

describe('useViewport', () => {
  it('Viewport_QueryMatches_ReportsMobile', () => {
    stubMatchMedia(true);
    const { result } = renderHook(() => useViewport());
    expect(result.current.isMobile).toBe(true);
  });

  it('Viewport_QueryDoesNotMatch_ReportsDesktop', () => {
    stubMatchMedia(false);
    const { result } = renderHook(() => useViewport());
    expect(result.current.isMobile).toBe(false);
  });

  it('Viewport_NoMatchMedia_DegradesToDesktop', () => {
    delete window.matchMedia;
    const { result } = renderHook(() => useViewport());
    expect(result.current.isMobile).toBe(false);
  });

  it('Viewport_Mounts_SubscribesAndUnsubscribesToChanges', () => {
    const add = vi.fn();
    const remove = vi.fn();
    window.matchMedia = vi.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
      addEventListener: add,
      removeEventListener: remove,
      addListener: vi.fn(),
      removeListener: vi.fn(),
    }));
    const { unmount } = renderHook(() => useViewport());
    expect(add).toHaveBeenCalledWith('change', expect.any(Function));
    unmount();
    expect(remove).toHaveBeenCalledWith('change', expect.any(Function));
  });
});
