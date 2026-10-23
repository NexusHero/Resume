/* AI gate components (ADR-0057). One central server key:
   - AiNotConfiguredHint: "KI nicht eingerichtet" with a settings link.
   - AiButton: renders a normal button, but without a key shows the hint and
     never calls the handler; while the status is unknown it is disabled; on a
     status-loading error it stays usable (the server decides 503/200).
   - TextImportNotice: the named text-only CV import notice. */
(function () {
  const G = window.MyJobDesignSystem_5611b7;

  function navigateSettings(e) {
    if (e && e.preventDefault) e.preventDefault();
    try {
      window.dispatchEvent(new CustomEvent('myjob:navigate', { detail: { to: 'einstellungen' } }));
    } catch {
      /* ignore */
    }
  }

  function AiNotConfiguredHint({ compact = false, live = true }) {
    return (
      <span
        {...(live ? { role: 'status' } : {})}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          flexWrap: 'wrap',
          fontFamily: 'var(--font-mono)',
          fontSize: '11px',
          color: 'var(--danger)',
        }}
      >
        {compact ? 'KI nicht eingerichtet' : 'KI nicht eingerichtet — diese Aktion benötigt einen zentralen Server-Schlüssel.'}
        <button
          type="button"
          onClick={navigateSettings}
          style={{
            appearance: 'none',
            border: 'none',
            background: 'none',
            padding: 0,
            cursor: 'pointer',
            font: 'inherit',
            color: 'var(--accent-strong)',
            textDecoration: 'underline',
          }}
        >
          Einstellungen
        </button>
      </span>
    );
  }

  function AiButton({ onClick, disabled, children, compactHint = false, ...rest }) {
    const status = window.useAiStatus ? window.useAiStatus() : { status: 'configured' };
    const blocked = status.status === 'not-configured';
    const loading = status.status === 'unknown';
    const handle = (e) => {
      if (blocked || loading) return;
      if (onClick) onClick(e);
    };
    return (
      <React.Fragment>
        <G.Button
          {...rest}
          onClick={handle}
          disabled={disabled || loading || blocked}
          title={blocked ? 'KI nicht eingerichtet — in den Einstellungen konfigurieren' : rest.title}
        >
          {children}
        </G.Button>
        {blocked && (
          <span style={{ marginLeft: '10px' }}>
            <AiNotConfiguredHint compact={compactHint} />
          </span>
        )}
      </React.Fragment>
    );
  }

  function TextImportNotice() {
    return (
      <div
        role="status"
        style={{
          marginTop: '10px',
          padding: '10px 12px',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--warning-border, #e6b800)',
          background: 'var(--warning-soft, rgba(230,184,0,0.10))',
          fontSize: '12.5px',
          color: 'var(--text-body)',
          lineHeight: 1.5,
        }}
      >
        Text übernommen (ohne KI) — Stationen und Skills bitte manuell ergänzen oder KI in den
        Einstellungen einrichten.
      </div>
    );
  }

  window.aiGateBlocked = () => !!(window.AiStatus && window.AiStatus.get().status === 'not-configured');
  window.AiNotConfiguredHint = AiNotConfiguredHint;
  window.AiButton = AiButton;
  window.TextImportNotice = TextImportNotice;
  window.AiNavigateSettings = navigateSettings;
})();
