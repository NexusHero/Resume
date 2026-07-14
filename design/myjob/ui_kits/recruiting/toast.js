/* Lightweight status-toast controller — the designed replacement for
   window.alert() on non-destructive, no-undo notices (a bulk-import result,
   an anonymize failure). Framework-free like undo-delete.js; a thin React
   binding (use-toast.jsx) subscribes the rendered <Toast/>. */

const DELAY_MS = 5000;

let current = null; // { message, tone, timer } | null
const subscribers = new Set();

function notify() {
  for (const fn of subscribers) fn();
}

/** @param {string} message @param {'info'|'error'} [tone] */
function show(message, tone = 'info') {
  if (current && current.timer) clearTimeout(current.timer);
  current = {
    message,
    tone,
    timer: typeof setTimeout === 'function' ? setTimeout(() => dismiss(), DELAY_MS) : null,
  };
  notify();
}

function dismiss() {
  if (!current) return;
  if (current.timer) clearTimeout(current.timer);
  current = null;
  notify();
}

function getCurrent() {
  return current ? { message: current.message, tone: current.tone } : null;
}

function subscribe(fn) {
  subscribers.add(fn);
  return () => subscribers.delete(fn);
}

/** Test-only: clear without waiting for the timer. */
function reset() {
  if (current && current.timer) clearTimeout(current.timer);
  current = null;
  notify();
}

const Toast = { DELAY_MS, show, dismiss, getCurrent, subscribe, reset };

if (typeof window !== 'undefined') {
  window.showToast = show;
  window.ToastController = Toast;
}

export { Toast, DELAY_MS };
