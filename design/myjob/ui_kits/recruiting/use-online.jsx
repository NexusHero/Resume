/* useOnline — tracks connectivity for the offline experience (ADR-0039). Reads
   navigator.onLine and updates on the browser's `online`/`offline` events. In an
   engine without `navigator.onLine` (old, or a test env) it degrades to online,
   so it never falsely blocks the UI. Published on window per the kit convention. */
function useOnline() {
  const read = () =>
    typeof navigator === 'undefined' || typeof navigator.onLine === 'undefined'
      ? true
      : navigator.onLine;

  const [online, setOnline] = React.useState(read);

  React.useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    setOnline(read()); // resync in case it changed between first render and effect
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  return online;
}

Object.assign(window, { useOnline });
