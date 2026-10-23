/* React binding for the AI status store. */
(function () {
  function useAiStatus() {
    const [state, setState] = React.useState(window.AiStatus.get());
    React.useEffect(() => window.AiStatus.subscribe(setState), []);
    return state;
  }
  window.useAiStatus = useAiStatus;
})();
