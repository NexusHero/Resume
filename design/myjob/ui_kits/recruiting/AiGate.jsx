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

  const AI_CONSENT_BODY =
    'Dein Workspace verwendet KI (Anthropic Claude bzw. Google Gemini), um den Lebenslauf des ' +
    'Mandanten und den Text der Stellenanzeige zu verarbeiten. Die Inhalte werden dafür an den ' +
    'konfigurierten Anbieter übermittelt. Diese Verarbeitung gilt nach dem EU AI Act (Anhang III) ' +
    'als Hochrisiko-KI im Bereich Beschäftigung — sie dient nur der Unterstützung: Du prüfst jeden ' +
    'Vorschlag und übernimmst ihn ausdrücklich selbst. Jede Übermittlung wird im KI-Audit-Trail ' +
    '(Modell, Zeitpunkt, Kosten) protokolliert. Die Einwilligung gilt für diesen Workspace und kann ' +
    'jederzeit in den Einstellungen widerrufen werden.';

  /* The one shared consent dialog before the first AI transmission (ADR-0063).
     Admin → "Zustimmen" (PATCH aiConsent:true); non-admin → "Frag deinen Admin". */
  function AiConsentDialog({ isAdmin, onAccept, onCancel, busy }) {
    return (
      <div
        role="dialog"
        aria-modal="true"
        aria-label="KI-Verarbeitung zustimmen"
        data-testid="ai-consent-dialog"
        style={{
          alignSelf: 'stretch',
          border: '1px solid var(--border-strong)',
          borderRadius: 'var(--radius-lg)',
          background: 'var(--surface-card)',
          boxShadow: 'var(--shadow-md)',
          padding: '18px 20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
        }}
      >
        <div
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: '15px',
            fontWeight: 700,
            color: 'var(--text-heading)',
          }}
        >
          KI-Verarbeitung zustimmen
        </div>
        <div style={{ fontSize: '12.5px', lineHeight: 1.6, color: 'var(--text-body)' }}>
          {AI_CONSENT_BODY}
        </div>
        {isAdmin === false ? (
          <div role="status" style={{ fontSize: '12.5px', color: 'var(--text-soft)' }}>
            Bitte deinen Workspace-Admin um Freigabe (Einstellungen → KI-Anbindung).
          </div>
        ) : (
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
            <button
              type="button"
              data-testid="ai-consent-accept"
              onClick={onAccept}
              disabled={busy}
              style={{
                cursor: busy ? 'default' : 'pointer',
                border: 'none',
                background: 'var(--accent)',
                color: 'var(--accent-contrast)',
                borderRadius: 'var(--radius-sm)',
                fontFamily: 'var(--font-body)',
                fontSize: '12.5px',
                fontWeight: 600,
                padding: '6px 14px',
              }}
            >
              Zustimmen
            </button>
            <button
              type="button"
              data-testid="ai-consent-cancel"
              onClick={onCancel}
              style={{
                cursor: 'pointer',
                border: '1px solid var(--border-strong)',
                background: 'transparent',
                color: 'var(--text-muted)',
                borderRadius: 'var(--radius-sm)',
                fontFamily: 'var(--font-body)',
                fontSize: '12.5px',
                padding: '6px 14px',
              }}
            >
              Abbrechen
            </button>
          </div>
        )}
      </div>
    );
  }

  /* React hook: a `guard` wrapper that runs the action only once `aiConsent` is
     granted; otherwise it shows the dialog and runs the action on accept. */
  function useAiConsent() {
    const ws = window.useWorkspaceSettings ? window.useWorkspaceSettings() : { aiConsent: false };
    const [open, setOpen] = React.useState(false);
    const [busy, setBusy] = React.useState(false);
    const [rejected, setRejected] = React.useState(false);
    const [isAdmin, setIsAdmin] = React.useState(null);
    const pendingRef = React.useRef(null);
    React.useEffect(() => {
      let alive = true;
      const p =
        window.RecruitApi && window.RecruitApi.authMe
          ? window.RecruitApi.authMe()
          : Promise.resolve(null);
      p.then((me) => {
          if (alive) setIsAdmin(!!(me && me.roles && me.roles.includes('admin')));
        }).catch(() => {
          if (alive) setIsAdmin(false);
        });
      return () => {
        alive = false;
      };
    }, []);

    const guard = (fn) => (...args) => {
      if (ws.aiConsent === true) {
        return fn(...args);
      }
      setRejected(false);
      pendingRef.current = { fn, args };
      setOpen(true);
      return undefined;
    };
    const accept = () => {
      setBusy(true);
      window.RecruitApi.updateWorkspaceSettings({ aiConsent: true })
        .then(() => (window.WorkspaceSettings ? window.WorkspaceSettings.refresh() : null))
        .then(() => {
          setBusy(false);
          setOpen(false);
          const p = pendingRef.current;
          pendingRef.current = null;
          if (p) p.fn(...p.args);
        })
        .catch(() => setBusy(false));
    };
    const cancel = () => {
      setOpen(false);
      setRejected(true);
      pendingRef.current = null;
    };
    const dialog = open
      ? React.createElement(AiConsentDialog, { isAdmin, onAccept: accept, onCancel: cancel, busy })
      : null;
    return { guard, dialog, rejected, consentGranted: ws.aiConsent === true };
  }

  window.aiGateBlocked = () => !!(window.AiStatus && window.AiStatus.get().status === 'not-configured');
  window.AiNotConfiguredHint = AiNotConfiguredHint;
  window.AiButton = AiButton;
  window.TextImportNotice = TextImportNotice;
  window.AiNavigateSettings = navigateSettings;
  window.AiConsentDialog = AiConsentDialog;
  window.useAiConsent = useAiConsent;
})();
