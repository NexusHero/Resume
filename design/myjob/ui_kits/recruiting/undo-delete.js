/* Undo-able delete controller (#200). The designed alternative to
   window.confirm for reversible destructive actions (Material/HIG prefer Undo
   over Confirm): the caller optimistically hides the row, then schedules the
   real DELETE here. The delete is only sent when the snackbar times out (or the
   page is flushed on unload/navigation). "Undo" cancels the pending delete and
   the caller restores the row.

   One pending delete at a time: scheduling a new one FLUSHES the previous
   (commits it immediately) so no delete is silently dropped. Framework-free so
   it can own a real timer and a beforeunload flush; a thin React binding
   (use-undo-delete.jsx) subscribes the snackbar. */

const DELAY_MS = 6000;

let pending = null; // { label, commit, restore, timer } | null
const subscribers = new Set();

function notify() {
  for (const fn of subscribers) fn();
}

/** Run the pending delete's commit exactly once and clear it. */
function commitPending() {
  if (!pending) return;
  const { commit, timer } = pending;
  if (timer) clearTimeout(timer);
  pending = null;
  notify();
  try {
    commit();
  } catch {
    /* the caller's commit owns its own error handling */
  }
}

/**
 * Optimistically-removed already by the caller; schedule the real delete.
 * @param {{label:string, commit:function, restore:function}} action
 */
function schedule(action) {
  // Only one in flight — commit the previous immediately so its delete is not lost.
  if (pending) commitPending();
  const entry = { label: action.label, commit: action.commit, restore: action.restore, timer: null };
  entry.timer =
    typeof setTimeout === 'function' ? setTimeout(() => commitPending(), DELAY_MS) : null;
  pending = entry;
  notify();
}

/** Cancel the pending delete and let the caller restore the row. */
function undo() {
  if (!pending) return;
  const { restore, timer } = pending;
  if (timer) clearTimeout(timer);
  pending = null;
  notify();
  try {
    restore();
  } catch {
    /* ignore */
  }
}

/** Commit any pending delete now (navigation / unload). */
function flush() {
  commitPending();
}

function getPending() {
  return pending ? { label: pending.label } : null;
}

function subscribe(fn) {
  subscribers.add(fn);
  return () => subscribers.delete(fn);
}

/** Test-only: drop any pending delete without committing. */
function reset() {
  if (pending && pending.timer) clearTimeout(pending.timer);
  pending = null;
  notify();
}

const UndoDelete = { DELAY_MS, schedule, undo, flush, getPending, subscribe, reset };

if (typeof window !== 'undefined') {
  window.UndoDelete = UndoDelete;
  // A pending delete must not be lost if the tab closes — commit it on unload.
  if (typeof window.addEventListener === 'function' && !window.__undoDeleteUnloadBound) {
    window.addEventListener('beforeunload', flush);
    window.__undoDeleteUnloadBound = true;
  }
}

export { UndoDelete, DELAY_MS };
