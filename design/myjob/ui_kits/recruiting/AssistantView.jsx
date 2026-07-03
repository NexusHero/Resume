/* AssistantView — the agent's home: a master switch, the autonomy mode, and
   the review queue. The assistant runs server-side on a schedule (also while
   nobody is signed in); everything it finds lands here as a suggestion with a
   rationale and Accept/Dismiss — the same staged-change contract as the
   editor's AI banner. In mode "act" the internal, reversible actions are
   applied directly and show up as auto-applied. */
const AV = window.MyJobDesignSystem_f3658e;

const AV_KIND_LABELS = {
  'shortlist-add': 'Shortlist',
  'follow-up': 'Follow-up',
  'data-gap': 'Data gap',
};
const AV_KIND_COLORS = {
  'shortlist-add': 'var(--accent-strong)',
  'follow-up': 'var(--warning-strong, #8a6d00)',
  'data-gap': 'var(--text-soft)',
};

function AvCard({ children, style }) {
  return (
    <div style={{ background: 'var(--surface-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-sm)', padding: '20px 22px', ...style }}>
      {children}
    </div>
  );
}

function AvModePill({ active, onClick, label, hint }) {
  return (
    <button onClick={onClick} title={hint} style={{ flex: 1, padding: '8px 10px', border: 'none', cursor: 'pointer', borderRadius: 'var(--radius-sm)', fontFamily: 'var(--font-mono)', fontSize: '11px', fontWeight: 600, background: active ? 'var(--surface-card)' : 'transparent', color: active ? 'var(--text-heading)' : 'var(--text-soft)', boxShadow: active ? 'var(--shadow-xs)' : 'none' }}>
      {label}
    </button>
  );
}

function AssistantView({ onChanged }) {
  const [settings, setSettings] = React.useState(null); // null = loading
  const [counts, setCounts] = React.useState({});
  const [queue, setQueue] = React.useState([]);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState(false);
  const [lastRun, setLastRun] = React.useState(null); // result of a manual run

  const load = React.useCallback(() => {
    Promise.all([window.RecruitApi.getAssistant(), window.RecruitApi.listAssistantSuggestions()])
      .then(([overview, suggestions]) => {
        setSettings(overview.settings);
        setCounts(overview.counts);
        setQueue(suggestions);
        setError(false);
      })
      .catch(() => setError(true));
  }, []);
  React.useEffect(load, [load]);

  const patch = (p) => {
    if (busy) return;
    setBusy(true);
    window.RecruitApi.updateAssistant(p)
      .then((r) => setSettings(r.settings))
      .catch(() => {})
      .finally(() => setBusy(false));
  };
  const runNow = () => {
    if (busy) return;
    setBusy(true);
    setLastRun(null);
    window.RecruitApi.runAssistant()
      .then((r) => { setLastRun(r); load(); if (onChanged) onChanged(); })
      .catch(() => {})
      .finally(() => setBusy(false));
  };
  const resolve = (id, action) => {
    window.RecruitApi.resolveAssistantSuggestion(id, action)
      .then(() => { load(); if (action === 'accept' && onChanged) onChanged(); })
      .catch(() => {});
  };

  if (error) return <AvCard><div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-soft)', fontSize: '13px' }}>Could not load the assistant.</div></AvCard>;
  if (settings === null) return <AvCard><div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-soft)', fontSize: '13px' }}>Loading…</div></AvCard>;

  const proposed = queue.filter((s) => s.status === 'proposed');
  const resolved = queue.filter((s) => s.status !== 'proposed').slice(0, 12);
  const fmtWhen = (iso) => (iso ? new Date(iso).toLocaleString('en-GB') : 'never');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Control card: switch, mode, cadence, run now */}
      <AvCard>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 320px', minWidth: 0 }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 700, color: 'var(--text-heading)', margin: 0 }}>Assistant</h2>
            <div style={{ fontSize: '12.5px', color: 'var(--text-soft)', marginTop: '4px', lineHeight: 1.55 }}>
              Shortlists candidates for active mandates, flags stalled pipeline cards and empty profiles.
              Runs on the server in the background — also while you are signed out — and stages everything
              here for review. It never contacts anyone and never deletes anything.
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10.5px', letterSpacing: '0.06em', textTransform: 'uppercase', color: settings.enabled ? 'var(--positive, #1F8A5B)' : 'var(--text-soft)' }}>
              {settings.enabled ? 'On' : 'Off'}
            </span>
            <AV.Button variant={settings.enabled ? 'outline' : 'primary'} size="sm" disabled={busy} onClick={() => patch({ enabled: !settings.enabled })}>
              {settings.enabled ? 'Switch off' : 'Switch on'}
            </AV.Button>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '18px', marginTop: '16px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ flex: '0 1 300px' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-soft)', marginBottom: '6px' }}>Autonomy</div>
            <div style={{ display: 'flex', gap: '4px', background: 'var(--surface-sunk)', borderRadius: 'var(--radius-md)', padding: '4px' }}>
              <AvModePill active={settings.mode === 'suggest'} onClick={() => patch({ mode: 'suggest' })} label="Suggest" hint="Everything waits for your approval." />
              <AvModePill active={settings.mode === 'act'} onClick={() => patch({ mode: 'act' })} label="Act" hint="Internal, reversible actions (e.g. adding a match to the pipeline) are applied directly and marked auto-applied. Nothing outward-facing ever runs alone." />
            </div>
          </div>
          <div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-soft)', marginBottom: '6px' }}>Every</div>
            <select value={settings.intervalMinutes} disabled={busy} onChange={(e) => patch({ intervalMinutes: Number(e.target.value) })} style={{ padding: '8px 10px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-strong)', background: 'var(--surface-card)', color: 'var(--text-heading)', fontFamily: 'var(--font-mono)', fontSize: '12px' }}>
              <option value={15}>15 min</option>
              <option value={60}>hour</option>
              <option value={240}>4 hours</option>
              <option value={1440}>day</option>
            </select>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-soft)' }}>Last run: {fmtWhen(settings.lastRunAt)}</span>
            <AV.Button variant="primary" size="sm" disabled={busy || !settings.enabled} iconLeft={<AV.Icon name="zap" size={14} />} onClick={runNow}>Run now</AV.Button>
          </div>
        </div>
        {lastRun && (
          <div role="status" style={{ marginTop: '12px', fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--positive, #1F8A5B)' }}>
            Run finished — {lastRun.proposed} suggested{lastRun.applied ? `, ${lastRun.applied} auto-applied` : ''}.
          </div>
        )}
      </AvCard>

      {/* Review queue */}
      <AvCard>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px' }}>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '15px', fontWeight: 700, color: 'var(--text-heading)', margin: 0 }}>For your review</h3>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-soft)' }}>{proposed.length} open · {counts.accepted || 0} accepted · {counts.autoApplied || 0} auto-applied · {counts.dismissed || 0} dismissed</span>
        </div>
        {proposed.length === 0 ? (
          <div style={{ padding: '22px', textAlign: 'center', color: 'var(--text-soft)', fontSize: '13px' }}>
            {settings.enabled ? 'Nothing waiting — the assistant found no new work.' : 'The assistant is off. Switch it on and it will prepare suggestions here.'}
          </div>
        ) : (
          <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column' }}>
            {proposed.map((s) => (
              <div key={s.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
                <span style={{ flexShrink: 0, fontFamily: 'var(--font-mono)', fontSize: '9.5px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: AV_KIND_COLORS[s.kind] || 'var(--text-soft)', border: '1px solid var(--border)', borderRadius: 'var(--radius-pill)', padding: '3px 9px', marginTop: '2px' }}>
                  {AV_KIND_LABELS[s.kind] || s.kind}
                </span>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--text-heading)' }}>{s.title}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-soft)', marginTop: '2px', lineHeight: 1.5 }}>{s.rationale}</div>
                </div>
                <div style={{ flexShrink: 0, display: 'flex', gap: '8px' }}>
                  <AV.Button variant="primary" size="sm" onClick={() => resolve(s.id, 'accept')}>Accept</AV.Button>
                  <AV.Button variant="ghost" size="sm" onClick={() => resolve(s.id, 'dismiss')}>Dismiss</AV.Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </AvCard>

      {/* Recent activity — what the assistant did (incl. auto-applied) */}
      {resolved.length > 0 && (
        <AvCard>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '15px', fontWeight: 700, color: 'var(--text-heading)', margin: 0 }}>Recent activity</h3>
          <div style={{ marginTop: '8px' }}>
            {resolved.map((s) => (
              <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                <span style={{ flexShrink: 0, fontFamily: 'var(--font-mono)', fontSize: '9.5px', letterSpacing: '0.06em', textTransform: 'uppercase', color: s.status === 'dismissed' ? 'var(--text-muted)' : 'var(--positive, #1F8A5B)' }}>{s.status}</span>
                <span style={{ fontSize: '12.5px', color: 'var(--text-soft)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.title}</span>
              </div>
            ))}
          </div>
        </AvCard>
      )}
    </div>
  );
}

Object.assign(window, { AssistantView });
