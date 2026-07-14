/* Snackbar — the undo toast for reversible deletes (#200). Bottom-centre of the
   canvas, message + an Undo action, auto-dismissing when the pending delete
   commits (the controller owns the 6s timer). role="status" so screen readers
   announce it; the Undo action is a real, keyboard-focusable <button>; the
   slide-in is skipped under prefers-reduced-motion. */
const React = window.React;

function prefersReducedMotion() {
  return (
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

function Snackbar() {
  const [pending, { undo }] = window.useUndoDelete();
  const reduced = prefersReducedMotion();
  const { isMobile } = window.useViewport ? window.useViewport() : { isMobile: false };
  if (!pending) return null;
  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        // Lift above the home indicator on the installed shell (env() is 0 in a
        // browser tab, so this is 24px on desktop) (#202).
        position: 'fixed', left: '50%', bottom: 'max(24px, env(safe-area-inset-bottom))', transform: 'translateX(-50%)',
        zIndex: 60, display: 'flex', alignItems: 'center', gap: '16px',
        maxWidth: 'calc(100vw - 32px)',
        padding: '12px 12px 12px 18px', borderRadius: 'var(--radius-md)',
        background: 'var(--ink-850)', color: '#fff',
        border: '1px solid var(--sidebar-border-strong)',
        boxShadow: 'var(--shadow-lg)',
        animation: reduced ? 'none' : 'snackbarIn var(--dur-med, 0.24s) var(--ease-out, ease)',
        WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact',
      }}
    >
      <span style={{ fontSize: '13.5px', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {pending.label}
      </span>
      <button
        type="button"
        onClick={undo}
        style={{
          flexShrink: 0, cursor: 'pointer', appearance: 'none',
          fontFamily: 'var(--font-body)', fontSize: '13px', fontWeight: 700,
          letterSpacing: '0.02em', color: 'var(--accent-on-dark)',
          background: 'var(--sidebar-glass)', border: '1px solid var(--sidebar-border-strong)',
          // A comfortable ≥44px tap target for the time-limited Undo on touch (#202).
          borderRadius: 'var(--radius-sm)', padding: isMobile ? '11px 18px' : '6px 14px', minHeight: isMobile ? '44px' : undefined,
        }}
      >
        Rückgängig
      </button>
    </div>
  );
}

// The slide-in keyframes (a style tag is fine under the kit's CSP — it's not an
// inline script); harmless if injected more than once.
if (typeof document !== 'undefined' && !document.getElementById('snackbar-anim')) {
  const s = document.createElement('style');
  s.id = 'snackbar-anim';
  s.textContent = '@keyframes snackbarIn { from { opacity: 0; transform: translate(-50%, 12px); } to { opacity: 1; transform: translate(-50%, 0); } }';
  document.head.appendChild(s);
}

Object.assign(window, { Snackbar });
