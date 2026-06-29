/* Jobquellen — connect job-board APIs to pull live jobs into the search.
   Public sources connect in one click; API-key / OAuth sources open a
   connect sheet. Connection state is lifted to the app. */
const SR = window.MyJobDesignSystem_f3658e;

const AUTH_LABEL = { public: 'Open API', apikey: 'API key', oauth: 'OAuth' };
const AUTH_ICON = { public: 'globe', apikey: 'id', oauth: 'logout' };

function ProviderTile({ p, size = 44 }) {
  const ini = p.name.replace(/[^A-Za-zÄÖÜ ]/g, '').split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
  return <div style={{ width: size, height: size, flexShrink: 0, borderRadius: 'var(--radius-md)', background: p.tile, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: size * 0.32 + 'px' }}>{ini}</div>;
}

function ProviderCard({ p, onConnect, onDisconnect }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', padding: '18px', borderRadius: 'var(--radius-lg)', background: 'var(--surface-card)', border: `1px solid ${p.connected ? 'var(--accent-border)' : 'var(--border)'}`, boxShadow: 'var(--shadow-sm)' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '13px' }}>
        <ProviderTile p={p} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: '15.5px', fontWeight: 700, color: 'var(--text-heading)' }}>{p.name}</span>
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-soft)', marginTop: '3px' }}>{p.kind} · {p.region}</div>
        </div>
        {p.connected
          ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontFamily: 'var(--font-mono)', fontSize: '10.5px', fontWeight: 700, color: 'var(--status-hired-strong)', background: 'var(--status-hired-soft)', border: '1px solid var(--status-hired-border)', borderRadius: 'var(--radius-pill)', padding: '3px 9px' }}><span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--status-hired)' }} />Connected</span>
          : <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10.5px', color: 'var(--text-soft)', border: '1px solid var(--border)', borderRadius: 'var(--radius-pill)', padding: '3px 9px' }}>Disconnected</span>}
      </div>

      <p style={{ fontSize: '12.5px', lineHeight: 1.55, color: 'var(--text-muted)', margin: 0, minHeight: '38px' }}>{p.desc}</p>

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
        <SR.Badge variant="subtle" size="sm" icon={<SR.Icon name={AUTH_ICON[p.auth]} size={11} />}>{AUTH_LABEL[p.auth]}</SR.Badge>
        {p.connected && <SR.Badge variant="subtle" size="sm" icon={<SR.Icon name="briefcase" size={11} />}>{p.jobs} Jobs</SR.Badge>}
        {p.connected && p.lastSync && <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10.5px', color: 'var(--text-soft)' }}>Sync {p.lastSync}</span>}
      </div>

      <div style={{ display: 'flex', gap: '8px', borderTop: '1px solid var(--border)', paddingTop: '14px' }}>
        {p.connected ? (
          <React.Fragment>
            <SR.Button size="sm" variant="outline" iconLeft={<SR.Icon name="settings" size={14} />}>Manage</SR.Button>
            <SR.Button size="sm" variant="ghost" onClick={() => onDisconnect(p.id)}>Disconnect</SR.Button>
          </React.Fragment>
        ) : (
          <SR.Button size="sm" variant="primary" block iconLeft={<SR.Icon name="plus" size={14} />} onClick={() => onConnect(p)}>Connect</SR.Button>
        )}
      </div>
    </div>
  );
}

function ConnectSheet({ provider, onClose, onDone }) {
  const [appId, setAppId] = React.useState('');
  const [key, setKey] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const isKey = provider.auth === 'apikey';
  const isOauth = provider.auth === 'oauth';
  const canSubmit = provider.auth === 'public' || (isKey ? key.trim().length > 3 : true);

  const submit = () => {
    setBusy(true);
    setTimeout(() => onDone(provider.id), 850);
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(8,11,18,0.55)', backdropFilter: 'blur(3px)', animation: 'kfade var(--dur-fast) var(--ease-out)' }} />
      <div style={{ position: 'relative', width: '480px', maxWidth: '100%', background: 'var(--surface-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-xl)', boxShadow: 'var(--shadow-lg)', overflow: 'hidden', animation: 'kpop var(--dur-med) var(--ease-out)' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '13px' }}>
          <ProviderTile p={provider} size={40} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '17px', fontWeight: 700, color: 'var(--text-heading)' }}>Connect {provider.name}</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-soft)' }}>{AUTH_LABEL[provider.auth]} · {provider.region}</div>
          </div>
          <SR.IconButton icon="x" label="Close" variant="ghost" onClick={onClose} />
        </div>

        <div style={{ padding: '22px 24px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {provider.auth === 'public' && (
            <div style={{ display: 'flex', gap: '11px', padding: '14px', borderRadius: 'var(--radius-md)', background: 'var(--status-hired-soft)', border: '1px solid var(--status-hired-border)' }}>
              <SR.Icon name="checkCircle" size={18} style={{ color: 'var(--status-hired-strong)', flexShrink: 0 }} />
              <div style={{ fontSize: '12.5px', color: 'var(--text-body)' }}>Open API — no credentials needed. Connect in one click.</div>
            </div>
          )}
          {isKey && (
            <React.Fragment>
              <SR.Input label="App ID (optional)" icon="id" placeholder="e.g. a1b2c3" value={appId} onChange={(e) => setAppId(e.target.value)} />
              <SR.Input label="API key" icon="id" type="password" placeholder="••••••••••••••••" value={key} onChange={(e) => setKey(e.target.value)} hint={`Create one in the ${provider.name} developer portal. Stored encrypted.`} />
            </React.Fragment>
          )}
          {isOauth && (
            <div style={{ display: 'flex', gap: '11px', padding: '14px', borderRadius: 'var(--radius-md)', background: 'var(--accent-soft)', border: '1px solid var(--accent-border)' }}>
              <SR.Icon name="logout" size={18} style={{ color: 'var(--accent-strong)', flexShrink: 0 }} />
              <div style={{ fontSize: '12.5px', color: 'var(--text-body)' }}>You'll be redirected to {provider.name} to grant myJob access. No passwords are stored.</div>
            </div>
          )}
          <label style={{ display: 'flex', alignItems: 'center', gap: '9px', fontSize: '12.5px', color: 'var(--text-muted)' }}>
            <SR.Icon name="info" size={14} style={{ color: 'var(--text-soft)' }} />Jobs are synced automatically every 30 minutes.
          </label>
        </div>

        <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border)', background: 'var(--surface-subtle)', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
          <SR.Button variant="ghost" onClick={onClose} disabled={busy}>Cancel</SR.Button>
          <SR.Button variant="primary" disabled={!canSubmit || busy} onClick={submit} iconLeft={<SR.Icon name={busy ? 'clock' : isOauth ? 'logout' : 'check'} size={15} />}>
            {busy ? 'Connecting …' : isOauth ? `Sign in with ${provider.name}` : 'Connect'}
          </SR.Button>
        </div>
      </div>
    </div>
  );
}

function Jobquellen({ providers, onToggle, onFindJobs }) {
  const [connecting, setConnecting] = React.useState(null);
  const connected = providers.filter((p) => p.connected);
  const totalJobs = connected.reduce((s, p) => s + p.jobs, 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '1100px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px' }}>
        <SR.StatCard label="Connected sources" value={connected.length} icon="globe" />
        <SR.StatCard label="Jobs from APIs" value={totalJobs} icon="briefcase" delta="live" dir="up" />
        <SR.StatCard label="Auto-sync" value="30 min" icon="clock" />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 18px', borderRadius: 'var(--radius-lg)', background: 'var(--surface-card)', border: '1px solid var(--border)' }}>
        <SR.Icon name="info" size={17} style={{ color: 'var(--accent)' }} />
        <div style={{ flex: 1, fontSize: '12.5px', color: 'var(--text-muted)' }}>Connect job boards and aggregators to pull postings straight into the <strong style={{ color: 'var(--text-heading)' }}>job search</strong>. Public sources connect instantly; others need a key or OAuth.</div>
        <SR.Button size="sm" variant="outline" iconRight={<SR.Icon name="arrowRight" size={13} />} onClick={onFindJobs}>To job search</SR.Button>
      </div>

      <div>
        <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '15px', fontWeight: 700, color: 'var(--text-heading)', margin: '0 0 12px' }}>Available sources</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '14px' }}>
          {providers.map((p) => (
            <ProviderCard key={p.id} p={p}
              onConnect={(prov) => prov.auth === 'public' ? onToggle(prov.id, true) : setConnecting(prov)}
              onDisconnect={(id) => onToggle(id, false)} />
          ))}
        </div>
      </div>

      {connecting && (
        <ConnectSheet provider={connecting} onClose={() => setConnecting(null)} onDone={(id) => { setConnecting(null); onToggle(id, true); }} />
      )}
    </div>
  );
}

Object.assign(window, { KJobquellen: Jobquellen });
