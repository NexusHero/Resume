/* window.useToast — React binding for the status-toast controller (toast.js). */
function useToast() {
  const ctl = window.ToastController;
  const [state, setState] = window.React.useState(ctl.getCurrent());
  window.React.useEffect(() => ctl.subscribe(() => setState(ctl.getCurrent())), [ctl]);
  return [state, { dismiss: ctl.dismiss }];
}

Object.assign(window, { useToast });
