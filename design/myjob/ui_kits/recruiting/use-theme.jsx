/* window.useTheme — the React binding for the appearance layer (#196).
 *
 * Returns [mode, setMode] where mode is the live 'light' | 'dark'. Re-renders
 * when the choice changes (Settings toggle, rail toggle) and, while the user is
 * still on the system default, when the OS preference flips. The attribute work
 * and persistence live in theme.js; this is just the subscription. */
const React = window.React;

function useTheme() {
  const t = window.myJobTheme;
  const [mode, setModeState] = React.useState(t ? t.resolveMode() : 'dark');

  React.useEffect(() => {
    if (!t) return undefined;
    const sync = () => setModeState(t.resolveMode());
    window.addEventListener('myjob:appearancechange', sync);
    const mq =
      typeof window.matchMedia === 'function'
        ? window.matchMedia('(prefers-color-scheme: dark)')
        : null;
    // Only the system default tracks the OS; an explicit choice is sticky.
    const onSystem = () => {
      if (!t.storedChoice()) sync();
    };
    if (mq && mq.addEventListener) mq.addEventListener('change', onSystem);
    return () => {
      window.removeEventListener('myjob:appearancechange', sync);
      if (mq && mq.removeEventListener) mq.removeEventListener('change', onSystem);
    };
  }, [t]);

  const set = React.useCallback((next) => t && t.setMode(next), [t]);
  return [mode, set];
}

Object.assign(window, { useTheme });
