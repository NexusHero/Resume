/* ConfirmDialog — a designed, in-world confirmation for IRREVERSIBLE actions
   (#200). Reversible deletes use the undo snackbar; but a truly one-way action
   (DSGVO anonymisation) still warrants a deliberate confirm — just not the
   browser's window.confirm, which breaks the designed world. role="dialog",
   focus lands on the confirm button, Escape / backdrop cancel. */
const CD = window.MyJobDesignSystem_5611b7;
const React = window.React;

function ConfirmDialog({ title, message, confirmLabel = 'Bestätigen', cancelLabel = 'Abbrechen', danger = true, onConfirm, onCancel }) {
  // Focus trap, Esc-to-cancel, focus-return (#203). Initial focus lands on
  // Cancel (the first control) — the safe default for a destructive prompt.
  const dialogRef = React.useRef(null);
  window.useDialog(dialogRef, onCancel);

  const accent = danger ? 'var(--danger)' : 'var(--accent)';
  return (
    <>
      <div onClick={onCancel} style={{ position: 'fixed', inset: 0, background: 'rgba(8,11,18,0.45)', backdropFilter: 'blur(2px)', zIndex: 70, animation: 'fadeIn .2s ease' }} />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 71, width: 'min(420px, 94vw)', background: 'var(--surface-card)', borderRadius: 'var(--radius-xl)', boxShadow: 'var(--shadow-lg)', overflow: 'hidden', animation: 'popIn .24s cubic-bezier(0.16,1,0.3,1)' }}
      >
        <div style={{ padding: '22px 24px 18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '11px', marginBottom: '10px' }}>
            <span style={{ width: '34px', height: '34px', flexShrink: 0, borderRadius: 'var(--radius-md)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: danger ? 'var(--danger-soft)' : 'var(--accent-soft)', color: accent }}>
              <CD.Icon name="alert" size={18} />
            </span>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '16.5px', fontWeight: 700, color: 'var(--text-heading)', margin: 0, letterSpacing: '-0.01em' }}>{title}</h2>
          </div>
          {message && <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.55, margin: '0 0 2px' }}>{message}</p>}
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', padding: '14px 20px', background: 'var(--surface-subtle)', borderTop: '1px solid var(--border)' }}>
          <button type="button" onClick={onCancel} style={{ cursor: 'pointer', appearance: 'none', fontFamily: 'var(--font-body)', fontSize: '13px', fontWeight: 500, color: 'var(--text-muted)', background: 'var(--surface-card)', border: '1px solid var(--border-strong)', borderRadius: 'var(--radius-md)', padding: '8px 15px' }}>{cancelLabel}</button>
          <button type="button" onClick={onConfirm} style={{ cursor: 'pointer', appearance: 'none', fontFamily: 'var(--font-body)', fontSize: '13px', fontWeight: 600, color: 'var(--accent-contrast)', background: accent, border: `1px solid ${accent}`, borderRadius: 'var(--radius-md)', padding: '8px 16px' }}>{confirmLabel}</button>
        </div>
      </div>
    </>
  );
}

Object.assign(window, { ConfirmDialog });
