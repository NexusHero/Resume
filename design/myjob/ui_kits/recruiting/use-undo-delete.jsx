/* window.useUndoDelete — React binding for the undo-delete controller (#200).
   Returns [pending, { undo }] where pending is { label } | null. Re-renders when
   a delete is scheduled, undone, committed or flushed. */
const React = window.React;

function useUndoDelete() {
  const ctl = window.UndoDelete;
  const [pending, setPending] = React.useState(ctl ? ctl.getPending() : null);
  React.useEffect(() => {
    if (!ctl) return undefined;
    const sync = () => setPending(ctl.getPending());
    sync();
    return ctl.subscribe(sync);
  }, [ctl]);
  const undo = React.useCallback(() => ctl && ctl.undo(), [ctl]);
  return [pending, { undo }];
}

Object.assign(window, { useUndoDelete });
