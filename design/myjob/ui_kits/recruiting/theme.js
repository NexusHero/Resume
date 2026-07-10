/* Appearance (light/dark) theming (#196, ADR-0053).
 *
 * The token layer already carries both worlds — `:root` in tokens/colors.css is
 * light, `[data-mode="dark"]` in tokens/modes.css flips the semantic aliases —
 * so switching themes is a single attribute on <html>. This module owns that
 * attribute: it resolves the initial mode (explicit choice → else system
 * preference), applies it, and persists an explicit choice.
 *
 * Imported FIRST by main.jsx (before React) so `data-mode` is set before the
 * app paints; the dark boot splash covers the brief pre-hydration window, so
 * there is no flash even though a strict CSP (ADR-0004) forbids an inline script.
 *
 * The brand anchor (ADR-0053): the ink rail and the auth brand panel stay
 * ink-dark in BOTH themes — those use the `--sidebar-*` / `--ink-*` tokens,
 * which modes.css deliberately does not flip. The *working canvas* is what
 * changes. The document preview / exported PDF is paper and never themed
 * (documentsToHtml owns its own styles).
 */

export const THEME_KEY = 'myjob-appearance';
export const MODES = ['light', 'dark'];

/** The OS-level preference, or 'dark' where it can't be read (SSR/tests). */
export function systemMode() {
  if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return 'dark';
}

/** The user's explicitly-saved choice, or null if they've never chosen. */
export function storedChoice() {
  try {
    const v = localStorage.getItem(THEME_KEY);
    return v === 'light' || v === 'dark' ? v : null;
  } catch {
    return null;
  }
}

/** The mode to show now: explicit choice wins, otherwise follow the system. */
export function resolveMode() {
  return storedChoice() || systemMode();
}

/** Paint a mode by setting `data-mode` on the document root. */
export function applyMode(mode) {
  if (typeof document !== 'undefined') {
    document.documentElement.setAttribute('data-mode', mode === 'light' ? 'light' : 'dark');
  }
}

/** Persist an explicit choice, apply it, and notify subscribers (useTheme). */
export function setMode(mode) {
  const next = mode === 'light' ? 'light' : 'dark';
  try {
    localStorage.setItem(THEME_KEY, next);
  } catch {
    /* private mode / storage disabled — the choice just won't persist */
  }
  applyMode(next);
  if (typeof window !== 'undefined' && typeof window.CustomEvent === 'function') {
    window.dispatchEvent(new CustomEvent('myjob:appearancechange', { detail: next }));
  }
  return next;
}

/** Flip between light and dark, persisting the result. */
export function toggleMode() {
  return setMode(resolveMode() === 'dark' ? 'light' : 'dark');
}

/** Drop the explicit choice and follow the system preference again. */
export function useSystem() {
  try {
    localStorage.removeItem(THEME_KEY);
  } catch {
    /* storage disabled */
  }
  const next = systemMode();
  applyMode(next);
  if (typeof window !== 'undefined' && typeof window.CustomEvent === 'function') {
    window.dispatchEvent(new CustomEvent('myjob:appearancechange', { detail: next }));
  }
  return next;
}

/** Apply the resolved mode. Called on import so the attribute is set early. */
export function initTheme() {
  applyMode(resolveMode());
}

// Expose for the kit's window-global convention (Settings / rail read these),
// then apply immediately on import.
if (typeof window !== 'undefined') {
  window.myJobTheme = {
    THEME_KEY,
    MODES,
    systemMode,
    storedChoice,
    resolveMode,
    applyMode,
    setMode,
    toggleMode,
    useSystem,
  };
}
initTheme();
