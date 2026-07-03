/* useViewport — the kit's one responsive breakpoint hook (ADR-0025). The kit
   styles inline, so CSS @media cannot switch layout; components branch on this
   hook instead. It tracks a single `isMobile` breakpoint (phones and small
   portrait tablets); the rail fits on wider tablets, so they stay desktop.

   jsdom has no matchMedia, and neither do very old engines — the hook degrades
   to desktop (isMobile:false) when it is absent, so it never throws in tests or
   at build time. Published on window per the kit's module convention. */
const MOBILE_QUERY = '(max-width: 768px)';

function useViewport() {
  const read = () =>
    typeof window !== 'undefined' && typeof window.matchMedia === 'function'
      ? window.matchMedia(MOBILE_QUERY).matches
      : false;

  const [isMobile, setIsMobile] = React.useState(read);

  React.useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return undefined;
    const mql = window.matchMedia(MOBILE_QUERY);
    const onChange = () => setIsMobile(mql.matches);
    onChange(); // sync in case the width changed between first render and effect
    // addEventListener is the modern API; addListener is the Safari <14 fallback.
    if (mql.addEventListener) mql.addEventListener('change', onChange);
    else mql.addListener(onChange);
    return () => {
      if (mql.removeEventListener) mql.removeEventListener('change', onChange);
      else mql.removeListener(onChange);
    };
  }, []);

  return { isMobile };
}

Object.assign(window, { useViewport });
