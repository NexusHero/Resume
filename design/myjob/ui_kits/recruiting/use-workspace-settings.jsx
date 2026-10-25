/* React binding for the workspace-settings store. */
(function () {
  function useWorkspaceSettings() {
    const [state, setState] = React.useState(window.WorkspaceSettings.get());
    React.useEffect(() => window.WorkspaceSettings.subscribe(setState), []);
    return {
      ...state,
      vermittlung: state.status === 'loaded' ? state.vermittlung : false,
      aiConsent: state.status === 'loaded' ? state.aiConsent : false,
      refresh: () => window.WorkspaceSettings.refresh(),
    };
  }
  window.useWorkspaceSettings = useWorkspaceSettings;
})();
