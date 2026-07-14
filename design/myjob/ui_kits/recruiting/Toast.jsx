/* Toast — a designed replacement for window.alert() on non-destructive, no-undo
   notices (a bulk-import result, an anonymize failure). Same bottom-centre
   position and visual language as Snackbar (#200), but a plain dismiss (×)
   instead of "Undo" — this is a status message, not a reversible action.
   role="status" so screen readers announce it; skips the slide-in under
   prefers-reduced-motion. */
const React = window.React;

function prefersReducedMotion() {
  return (
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

function Toast() {
  const [state, { dismiss }] = window.useToast();
  const reduced = prefersReducedMotion();
  const { isMobile } = window.useViewport ? window.useViewport() : { isMobile: false };
  if (!state) return null;
  const isError = state.tone === 'error';
  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: 'fixed', left: '50%', bottom: 'max(24px, env(safe-area-inset-bottom))', transform: 'translateX(-50%)',
        zIndex: 60, display: 'flex', alignItems: 'center', gap: '16px',
        maxWidth: 'calc(100vw - 32px)',
        padding: '12px 12px 12px 18px', borderRadius: 'var(--radius-md)',
        background: isError ? 'var(--danger)' : 'var(--ink-850)', color: '#fff',
        border: '1px solid var(--sidebar-border-strong)',
        boxShadow: 'var(--shadow-lg)',
        animation: reduced ? 'none' : 'snackbarIn var(--dur-med, 0.24s) var(--ease-out, ease)',
        WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact',
      }}
    >
      <span style={{ fontSize: '13.5px', fontWeight: 500, whiteSpace: 'pre-wrap' }}>
        {state.message}
      </span>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Schließen"
        style={{
          flexShrink: 0, cursor: 'pointer', appearance: 'none', background: 'none', border: 'none',
          color: 'var(--accent-on-dark)', fontSize: '18px', lineHeight: 1, padding: isMobile ? '11px' : '2px',
          minHeight: isMobile ? '44px' : undefined, minWidth: isMobile ? '44px' : undefined,
        }}
      >
        ×
      </button>
    </div>
  );
}

Object.assign(window, { Toast });
