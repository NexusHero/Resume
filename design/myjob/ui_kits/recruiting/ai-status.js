/* AI status store (ADR-0057): one central server key, four UI states.
   `unknown` (loading, buttons disabled), `configured`, `not-configured`
   (hint, no request) and `error` (hint + retry; buttons stay usable so the
   server decides with 503/200 — never a permanent lock-out). */
(function () {
  let state = { status: 'unknown', provider: null };
  let generation = 0;
  const listeners = new Set();

  function emit() {
    for (const fn of listeners) {
      try {
        fn(state);
      } catch {
        /* ignore */
      }
    }
  }

  function setState(next) {
    state = next;
    emit();
  }

  async function refresh() {
    const gen = ++generation;
    try {
      const data = await window.RecruitApi.getLlmSettings();
      if (gen !== generation) return state;
      const providers = Array.isArray(data && data.providers) ? data.providers : [];
      const available = !!(data && (data.configured ?? providers.some((p) => p && p.available)));
      setState({
        status: available ? 'configured' : 'not-configured',
        provider: (data && data.current) || null,
      });
    } catch {
      if (gen === generation) setState({ status: 'error', provider: null });
    }
    return state;
  }

  function reset() {
    generation += 1;
    setState({ status: 'unknown', provider: null });
  }

  window.AiStatus = {
    get: () => state,
    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    refresh,
    reset,
  };
})();
