/* Tests for the richer offline experience (ADR-0039): the useOnline hook tracks
   connectivity and the OfflineBanner shows only while offline. */
import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest';
import { act, render } from '@testing-library/react';

let OfflineBanner;

beforeAll(async () => {
  await import('../use-online.jsx');
  await import('../OfflineBanner.jsx');
  OfflineBanner = window.OfflineBanner;
});

function setOnline(value) {
  Object.defineProperty(navigator, 'onLine', { value, configurable: true });
}

afterEach(() => {
  setOnline(true); // restore the default for the next test
});

describe('OfflineBanner', () => {
  it('Online_RendersNothing', () => {
    setOnline(true);
    const { container } = render(<OfflineBanner />);
    expect(container.querySelector('[role="status"]')).toBeNull();
  });

  it('Offline_ShowsTheBanner', () => {
    setOnline(false);
    const { getByRole } = render(<OfflineBanner />);
    expect(getByRole('status')).toBeInTheDocument();
    expect(getByRole('status').textContent).toMatch(/offline/i);
  });

  it('ReactsToConnectivityEvents', () => {
    setOnline(true);
    const { container } = render(<OfflineBanner />);
    expect(container.querySelector('[role="status"]')).toBeNull();

    // Go offline → the banner appears.
    act(() => {
      setOnline(false);
      window.dispatchEvent(new Event('offline'));
    });
    expect(container.querySelector('[role="status"]')).not.toBeNull();

    // Back online → it disappears.
    act(() => {
      setOnline(true);
      window.dispatchEvent(new Event('online'));
    });
    expect(container.querySelector('[role="status"]')).toBeNull();
  });

  it('useOnline_DegradesToOnline_WhenNavigatorOnLineMissing', () => {
    const original = Object.getOwnPropertyDescriptor(navigator, 'onLine');
    Object.defineProperty(navigator, 'onLine', { value: undefined, configurable: true });
    const { container } = render(<OfflineBanner />);
    expect(container.querySelector('[role="status"]')).toBeNull(); // treated as online
    if (original) Object.defineProperty(navigator, 'onLine', original);
  });
});
