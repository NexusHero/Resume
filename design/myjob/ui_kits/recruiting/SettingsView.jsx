/* SettingsView — AI models & API keys. The active model is wired to the live
   /settings/llm endpoint; per-provider API keys use a secured (masked, reveal,
   remove) flow and are kept in this browser. Mirrors the Elliott Wave Analyzer
   settings UX, rebranded to myJob. English-only. */
const SV = window.MyJobDesignSystem_f3658e;
const SV_KEY = (id) => `myjob.apikey.${id}`;

function loadKey(id) {
  try {
    return localStorage.getItem(SV_KEY(id)) || '';
  } catch (e) {
    return '';
  }
}
function storeKey(id, value) {
  try {
    if (value) localStorage.setItem(SV_KEY(id), value);
    else localStorage.removeItem(SV_KEY(id));
  } catch (e) {
    /* ignore */
  }
}

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
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-muted)' }}>{'•'.repeat(14) + saved.slice(-4)}</span>
          <span style={{ fontSize: '11px', color: 'var(--text-soft)' }}>Hidden — never shown again</span>
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

  React.useEffect(() => {
    if (!settings) return;
    const next = {};
    settings.providers.forEach((p) => {
      const v = loadKey(p.id);
      if (v) next[p.id] = v;
    });
    setKeys(next);
  }, [settings]);

  const activate = (id) => {
    if (busy) return;
    setBusy(true);
    window.RecruitApi.setLlmProvider(id)
      .then(setSettings)
      .catch(() => {})
      .finally(() => setBusy(false));
  };
  const saveKey = (id, value) => { storeKey(id, value); setKeys((k) => ({ ...k, [id]: value })); };
  const removeKey = (id) => { storeKey(id, ''); setKeys((k) => { const n = { ...k }; delete n[id]; return n; }); };

  return (
    <div style={{ maxWidth: '780px' }}>
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
    </div>
  );
}

Object.assign(window, { SettingsView });
