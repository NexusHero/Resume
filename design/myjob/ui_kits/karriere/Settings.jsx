/* Settings — choose the LLM provider (Claude or Gemini) used to generate
   cover letters. The choice is persisted server-side via /settings/llm, so the
   backend switches which model writes the cover letters. */
const ST = window.MyJobDesignSystem_f3658e;

const PROVIDER_META = {
  claude: { label: 'Claude', vendor: 'Anthropic', tile: '#d97706', desc: "Anthropic's models (Opus). Writes nuanced, natural cover letters." },
  gemini: { label: 'Gemini', vendor: 'Google', tile: '#1a73e8', desc: "Google's models (Gemini). Fast and cost-effective." },
};

function ProviderCard({ id, info, active, onSelect, busy }) {
  const meta = PROVIDER_META[id] || { label: info.label, vendor: '', tile: 'var(--accent)', desc: '' };
  const disabled = !info.available;
  return (
    <button onClick={() => !disabled && !busy && onSelect(id)} disabled={disabled || busy}
      style={{ display: 'flex', alignItems: 'flex-start', gap: '13px', textAlign: 'left', width: '100%', padding: '14px 15px', borderRadius: 'var(--radius-md)', cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.55 : 1, background: active ? 'var(--accent-soft)' : 'var(--surface-subtle)', border: `1px solid ${active ? 'var(--accent-border)' : 'var(--border)'}`, transition: 'all var(--dur-fast) var(--ease-out)' }}>
      <span style={{ width: '38px', height: '38px', borderRadius: 'var(--radius-sm)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: meta.tile, color: '#fff' }}><ST.Icon name="zap" size={18} /></span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: '15px', fontWeight: 700, color: 'var(--text-heading)' }}>{meta.label}</span>
          {meta.vendor && <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-soft)' }}>{meta.vendor}</span>}
          {!info.available && <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9.5px', fontWeight: 600, color: 'var(--text-soft)', background: 'var(--surface-sunk)', border: '1px solid var(--border)', borderRadius: 'var(--radius-pill)', padding: '1px 7px' }}>API key missing</span>}
        </div>
        <div style={{ fontSize: '12.5px', color: 'var(--text-muted)', marginTop: '3px' }}>{meta.desc}</div>
      </div>
      <span style={{ width: '20px', height: '20px', flexShrink: 0, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: active ? 'var(--accent)' : 'transparent', border: active ? 'none' : '1.5px solid var(--border-strong)', color: '#fff' }}>{active && <ST.Icon name="check" size={12} strokeWidth={2.6} />}</span>
    </button>
  );
}

function Settings({ onClose }) {
  const { api } = window.KarriereData;
  const [state, setState] = React.useState({ loading: true, error: null, current: null, providers: [] });
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    api.getLlmSettings()
      .then((s) => setState({ loading: false, error: null, current: s.current, providers: s.providers }))
      .catch((e) => setState({ loading: false, error: e.message || 'Failed to load', current: null, providers: [] }));
  }, []);

  const select = (id) => {
    setBusy(true);
    api.setLlmProvider(id)
      .then((s) => setState((st) => ({ ...st, current: s.current, providers: s.providers })))
      .catch((e) => setState((st) => ({ ...st, error: e.message || 'Could not switch provider' })))
      .finally(() => setBusy(false));
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(8,11,18,0.55)', backdropFilter: 'blur(3px)', animation: 'kfade var(--dur-fast) var(--ease-out)' }} />
      <div style={{ position: 'relative', width: '480px', maxWidth: '100%', display: 'flex', flexDirection: 'column', background: 'var(--surface-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-xl)', boxShadow: 'var(--shadow-lg)', overflow: 'hidden', animation: 'kpop var(--dur-med) var(--ease-out)' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ width: '38px', height: '38px', borderRadius: 'var(--radius-md)', background: 'var(--accent-soft)', color: 'var(--accent-strong)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><ST.Icon name="sliders" size={18} /></span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '17px', fontWeight: 700, color: 'var(--text-heading)' }}>AI model</div>
            <div style={{ fontSize: '12.5px', color: 'var(--text-soft)' }}>Who writes your cover letters?</div>
          </div>
          <ST.IconButton icon="x" label="Close" variant="ghost" onClick={onClose} />
        </div>

        <div style={{ padding: '18px 24px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {state.loading && <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-soft)', fontSize: '13px' }}>Loading …</div>}
          {state.error && <div style={{ padding: '12px 14px', borderRadius: 'var(--radius-md)', background: 'var(--surface-subtle)', border: '1px solid var(--border)', fontSize: '12.5px', color: 'var(--text-muted)' }}><ST.Icon name="info" size={13} style={{ verticalAlign: '-2px', marginRight: '6px' }} />{state.error}</div>}
          {!state.loading && state.providers.map((p) => (
            <ProviderCard key={p.id} id={p.id} info={p} active={state.current === p.id} onSelect={select} busy={busy} />
          ))}
          {!state.loading && !state.error && (
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10.5px', color: 'var(--text-soft)', marginTop: '4px' }}>Missing a key? Set <code>ANTHROPIC_API_KEY</code> or <code>GEMINI_API_KEY</code> on the server.</div>
          )}
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { KSettings: Settings });
