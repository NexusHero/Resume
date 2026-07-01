/* SettingsView — AI models & API keys. The active model is wired to the live
   /settings/llm endpoint; per-provider API keys are stored encrypted on the
   server (PUT/DELETE /settings/keys/:provider) — never in the browser. English-only. */
const SV = window.MyJobDesignSystem_f3658e;

function ProviderRow({ p, active, onActivate, saved, onSave, onRemove }) {
  const [draft, setDraft] = React.useState('');
  const [reveal, setReveal] = React.useState(false);
  const connected = Boolean(saved) || p.available;
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1.3fr) auto', gap: '16px', alignItems: 'center', padding: '16px 0', borderBottom: '1px solid var(--border)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
        <span style={{ width: '36px', height: '36px', flexShrink: 0, borderRadius: 'var(--radius-md)', display: 'grid', placeItems: 'center', background: 'var(--ink-900)', color: '#fff', fontFamily: 'var(--font-display)', fontWeight: 700 }}>{p.label.charAt(0).toUpperCase()}</span>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-heading)' }}>
            {p.label}
            {connected && <span style={{ marginLeft: '8px', fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--status-hired-strong)', background: 'var(--status-hired-soft)', border: '1px solid var(--status-hired-border)', borderRadius: 'var(--radius-pill)', padding: '1px 8px' }}>Connected</span>}
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11.5px', color: 'var(--text-soft)' }}>{p.id}</div>
        </div>
      </div>

      {saved ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-muted)' }}>{'•'.repeat(18)}</span>
          <span style={{ fontSize: '11px', color: 'var(--text-soft)' }}>Stored securely on the server</span>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: '8px', minWidth: 0 }}>
          <input type={reveal ? 'text' : 'password'} value={draft} onChange={(e) => setDraft(e.target.value)} placeholder={`${p.label} API key`} autoComplete="off" spellCheck="false" aria-label={`${p.label} API key`} style={{ flex: 1, minWidth: 0, border: '1px solid var(--border-strong)', borderRadius: 'var(--radius-md)', background: 'var(--surface-card)', fontFamily: 'var(--font-mono)', fontSize: '12.5px', color: 'var(--text-heading)', padding: '9px 11px', outline: 'none' }} />
          <button type="button" onClick={() => setReveal((r) => !r)} aria-label={reveal ? 'Hide key' : 'Show key'} style={{ cursor: 'pointer', border: '1px solid var(--border-strong)', borderRadius: 'var(--radius-md)', background: 'var(--surface-card)', color: 'var(--text-muted)', padding: '0 11px' }}><SV.Icon name="eye" size={15} /></button>
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', justifyContent: 'flex-end' }}>
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: active ? 'var(--text-heading)' : 'var(--text-soft)', cursor: 'pointer', whiteSpace: 'nowrap' }}>
          <input type="radio" name="active-provider" checked={active} onChange={onActivate} /> Active
        </label>
        {saved ? (
          <button type="button" onClick={onRemove} style={{ cursor: 'pointer', background: 'none', border: 'none', color: 'var(--danger)', fontWeight: 600, fontSize: '12.5px' }}>Remove</button>
        ) : (
          <SV.Button size="sm" disabled={draft.trim().length === 0} onClick={() => { onSave(draft.trim()); setDraft(''); setReveal(false); }}>Save key</SV.Button>
        )}
      </div>
    </div>
  );
}

/* Data & privacy (DSGVO): export everything you own, or erase your account. */
function DataPrivacyCard() {
  const [busy, setBusy] = React.useState(''); // '' | 'export' | 'delete'
  const [error, setError] = React.useState('');
  const [confirm, setConfirm] = React.useState(false);

  const exportData = () => {
    setBusy('export');
    setError('');
    window.RecruitApi.exportAccount()
      .then((data) => {
        // Offer the payload as a downloadable JSON file.
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'myjob-export.json';
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
      })
      .catch(() => setError('Could not export your data. Please try again.'))
      .finally(() => setBusy(''));
  };

  const deleteAccount = () => {
    setBusy('delete');
    setError('');
    window.RecruitApi.deleteAccount()
      .then(() => {
        // The session is gone server-side; re-probe sends us to the login screen.
        window.location.reload();
      })
      .catch(() => {
        setError('Could not delete your account. Please try again.');
        setBusy('');
        setConfirm(false);
      });
  };

  return (
    <div style={{ background: 'var(--surface-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-sm)', padding: '22px 24px' }}>
      <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 700, color: 'var(--text-heading)', margin: 0, letterSpacing: '-0.01em' }}>Data &amp; privacy</h2>
      <div style={{ fontSize: '12.5px', color: 'var(--text-soft)', marginTop: '2px' }}>Your GDPR rights: take a copy of everything you store here, or erase your account for good.</div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', padding: '16px 0', borderBottom: '1px solid var(--border)', marginTop: '8px' }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-heading)' }}>Export my data</div>
          <div style={{ fontSize: '12px', color: 'var(--text-soft)', marginTop: '1px' }}>Download your account, mandates, talents and placements as JSON.</div>
        </div>
        <SV.Button size="sm" variant="outline" disabled={busy !== ''} onClick={exportData}>
          {busy === 'export' ? 'Preparing…' : 'Export'}
        </SV.Button>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', padding: '16px 0' }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-heading)' }}>Delete my account</div>
          <div style={{ fontSize: '12px', color: 'var(--text-soft)', marginTop: '1px' }}>Permanently erases your account and all data you own. This cannot be undone.</div>
        </div>
        {confirm ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
            <button type="button" onClick={() => setConfirm(false)} disabled={busy !== ''} style={{ cursor: 'pointer', background: 'none', border: '1px solid var(--border-strong)', borderRadius: 'var(--radius-md)', color: 'var(--text-muted)', fontSize: '12.5px', padding: '7px 12px' }}>Cancel</button>
            <button type="button" onClick={deleteAccount} disabled={busy !== ''} style={{ cursor: 'pointer', background: 'var(--danger)', border: '1px solid var(--danger)', borderRadius: 'var(--radius-md)', color: '#fff', fontWeight: 600, fontSize: '12.5px', padding: '7px 12px' }}>{busy === 'delete' ? 'Deleting…' : 'Confirm delete'}</button>
          </div>
        ) : (
          <button type="button" onClick={() => setConfirm(true)} style={{ cursor: 'pointer', background: 'none', border: '1px solid var(--status-rejected-border)', borderRadius: 'var(--radius-md)', color: 'var(--danger)', fontWeight: 600, fontSize: '12.5px', padding: '7px 12px', flexShrink: 0 }}>Delete account</button>
        )}
      </div>

      {error && <div role="alert" style={{ fontSize: '12.5px', color: 'var(--danger)', marginTop: '4px' }}>{error}</div>}
    </div>
  );
}

function SettingsView() {
  const [settings, setSettings] = React.useState(null); // { current, providers }
  const [keys, setKeys] = React.useState({});
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    let alive = true;
    window.RecruitApi.getLlmSettings()
      .then((s) => { if (alive) setSettings(s); })
      .catch(() => { if (alive) setSettings({ current: '', providers: [] }); });
    return () => { alive = false; };
  }, []);

  // Which providers have a key stored on the server (booleans, never the keys).
  React.useEffect(() => {
    let alive = true;
    window.RecruitApi.getApiKeyStatus()
      .then((status) => { if (alive) setKeys(status); })
      .catch(() => {});
    return () => { alive = false; };
  }, []);

  const activate = (id) => {
    if (busy) return;
    setBusy(true);
    window.RecruitApi.setLlmProvider(id)
      .then(setSettings)
      .catch(() => {})
      .finally(() => setBusy(false));
  };
  const saveKey = (id, value) => {
    window.RecruitApi.setApiKey(id, value)
      .then(() => setKeys((k) => ({ ...k, [id]: true })))
      .catch(() => {});
  };
  const removeKey = (id) => {
    window.RecruitApi.removeApiKey(id)
      .then(() => setKeys((k) => ({ ...k, [id]: false })))
      .catch(() => {});
  };

  return (
    <div style={{ maxWidth: '780px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
      <div style={{ background: 'var(--surface-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-sm)', padding: '22px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
          <div style={{ flex: 1 }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 700, color: 'var(--text-heading)', margin: 0, letterSpacing: '-0.01em' }}>AI models & API keys</h2>
            <div style={{ fontSize: '12.5px', color: 'var(--text-soft)', marginTop: '2px' }}>Pick the active model and connect a provider key for AI cover letters and CV tailoring.</div>
          </div>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', flexShrink: 0, fontFamily: 'var(--font-mono)', fontSize: '10.5px', color: 'var(--text-soft)', background: 'var(--surface-sunk)', border: '1px solid var(--border)', borderRadius: 'var(--radius-pill)', padding: '4px 10px' }}><SV.Icon name="check" size={12} /> Stored securely</span>
        </div>

        {!settings ? (
          <div style={{ padding: '34px', textAlign: 'center', color: 'var(--text-soft)', fontSize: '13px' }}>Loading…</div>
        ) : settings.providers.length === 0 ? (
          <div style={{ padding: '28px', textAlign: 'center', color: 'var(--text-soft)', fontSize: '13px' }}>No providers available.</div>
        ) : (
          <div style={{ marginTop: '10px' }}>
            {settings.providers.map((p) => (
              <ProviderRow key={p.id} p={p} active={settings.current === p.id} onActivate={() => activate(p.id)} saved={keys[p.id]} onSave={(v) => saveKey(p.id, v)} onRemove={() => removeKey(p.id)} />
            ))}
          </div>
        )}

        <div style={{ display: 'flex', gap: '10px', marginTop: '16px', padding: '12px 14px', background: 'var(--surface-subtle)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', fontSize: '12.5px', color: 'var(--text-muted)', lineHeight: 1.6 }}>
          <SV.Icon name="check" size={16} style={{ flexShrink: 0, color: 'var(--text-soft)', marginTop: '2px' }} />
          <span>Keys are kept in this browser and sent over an encrypted channel only when generating. The active model is stored on the server. Remove a key any time to revoke access.</span>
        </div>
      </div>

      <DataPrivacyCard />
    </div>
  );
}

Object.assign(window, { SettingsView });
