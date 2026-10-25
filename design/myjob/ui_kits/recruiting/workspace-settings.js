/* Workspace settings store (ADR-0057, ADR-0063). The UI must not derive
   `vermittlung` or `aiConsent` from the login response — it reads
   GET /settings/workspace and treats the unknown state as "off" (no intermediary
   requests, no AI transmission). */
(function () {
  let state = { status: 'unknown', vermittlung: false, aiConsent: false };
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
      const data = await window.RecruitApi.getWorkspaceSettings();
      if (gen === generation)
        setState({
          status: 'loaded',
          vermittlung: !!(data && data.vermittlung),
          aiConsent: !!(data && data.aiConsent),
        });
    } catch {
      if (gen === generation) setState({ status: 'error', vermittlung: false, aiConsent: false });
    }
    return state;
  }

  function reset() {
    generation += 1;
    setState({ status: 'unknown', vermittlung: false, aiConsent: false });
  }

  async function set(patch) {
    const data = await window.RecruitApi.updateWorkspaceSettings(patch);
    setState({
      status: 'loaded',
      vermittlung: !!(data && data.vermittlung),
      aiConsent: !!(data && data.aiConsent),
    });
    return state;
  }

  window.WorkspaceSettings = {
    get: () => state,
    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    refresh,
    reset,
    set,
  };
})();
