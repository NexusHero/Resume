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
        {compact ? 'AI not configured' : 'AI not configured — this action requires a central server key.'}
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
          Settings
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
          title={blocked ? 'AI not configured — configure it in Settings' : rest.title}
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
        Text imported (without AI) — please add roles and skills manually or set up AI in
        Settings.
      </div>
    );
  }

  const AI_CONSENT_BODY =
    'Your workspace uses AI (Anthropic Claude or Google Gemini) to process the candidate\u2019s ' +
    'CV and the job posting text. The content is sent to the configured provider for that ' +
    'purpose. Under the EU AI Act (Annex III) this processing counts as high-risk AI in the ' +
    'area of employment — it only supports you: you review every suggestion and explicitly ' +
    'apply it yourself. Every transmission is logged in the AI audit trail (model, time, cost). ' +
    'The consent applies to this workspace and can be revoked at any time in Settings.';

  /* The one shared consent dialog before the first AI transmission (ADR-0063).
     Admin → "Zustimmen" (PATCH aiConsent:true); non-admin → "Frag deinen Admin". */
  function AiConsentDialog({ isAdmin, onAccept, onCancel, busy }) {
    return (
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Approve AI processing"
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
          Approve AI processing
        </div>
        <div style={{ fontSize: '12.5px', lineHeight: 1.6, color: 'var(--text-body)' }}>
          {AI_CONSENT_BODY}
        </div>
        {isAdmin === false ? (
          <div role="status" style={{ fontSize: '12.5px', color: 'var(--text-soft)' }}>
            Ask your workspace admin to approve (Settings → AI connection).
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
              Approve
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
              Cancel
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
