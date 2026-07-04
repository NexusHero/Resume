/* OfflineBanner — a slim, fixed status bar shown while the browser is offline
   (ADR-0039). The installed PWA still opens from cache offline; this tells the
   user why saves/loads will fail and reassures them their last-loaded view is
   still readable. Renders nothing when online. */
function OfflineBanner() {
  const online = useOnline();
  if (online) return null;
  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 10000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        padding: '7px 14px',
        background: 'var(--warning-soft, #fef3c7)',
        color: 'var(--warning-strong, #92400e)',
        borderBottom: '1px solid var(--warning-border, #f59e0b)',
        fontSize: '12.5px',
        fontWeight: 600,
        fontFamily: 'var(--font-body)',
      }}
    >
      <span aria-hidden="true">●</span>
      You’re offline — showing your last loaded data. Changes won’t save until you’re back online.
    </div>
  );
}

Object.assign(window, { OfflineBanner });
