/* Workspace settings store (ADR-0057). The UI must not derive `vermittlung`
   from the login response — it reads GET /settings/workspace and treats the
   unknown state as "off" (no intermediary requests). */
(function () {
  let state = { status: 'unknown', vermittlung: false };
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
      if (gen === generation) setState({ status: 'loaded', vermittlung: !!(data && data.vermittlung) });
    } catch {
      if (gen === generation) setState({ status: 'error', vermittlung: false });
    }
    return state;
  }

  function reset() {
    generation += 1;
    setState({ status: 'unknown', vermittlung: false });
  }

  async function set(patch) {
    const data = await window.RecruitApi.updateWorkspaceSettings(patch);
    setState({ status: 'loaded', vermittlung: !!(data && data.vermittlung) });
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
