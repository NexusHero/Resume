/* __kit_guard__ */
(function(){ var __s=document.currentScript; if (__s && /_ds_bundle\.js/.test(__s.src||'')) return;
/* Views — Talente list, Stellen, Berichte, Postfach. */
const V = window.BewerbungstoolDesignSystem_a75119;

/* ---------- Talente: candidate list ---------- */
function CandidateList({ candidates, onOpen }) {
  const [tab, setTab] = React.useState('alle');
  const counts = (s) => candidates.filter((c) => s === 'alle' ? true : c.status === s).length;
  const tabs = [
    { id: 'alle', label: 'Alle', count: counts('alle') },
    { id: 'new', label: 'Neu', count: counts('new') },
    { id: 'review', label: 'Sichtung', count: counts('review') },
    { id: 'interview', label: 'Interview', count: counts('interview') },
    { id: 'offer', label: 'Angebot', count: counts('offer') },
  ];
  const rows = candidates.filter((c) => tab === 'alle' ? true : c.status === tab);
  return (
    <V.Card pad={false}>
      <div style={{ padding: '6px 16px 0' }}>
        <V.Tabs value={tab} onChange={setTab} tabs={tabs} />
      </div>
      {/* column header */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.6fr) minmax(0,1.2fr) 78px 116px 96px', gap: '14px', padding: '11px 16px', fontFamily: 'var(--font-mono)', fontSize: '9.5px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-soft)', borderBottom: '1px solid var(--border)', background: 'var(--surface-subtle)' }}>
        <span>Kandidat:in</span><span>Stelle</span><span>Match</span><span>Phase</span><span style={{ textAlign: 'right' }}>Aktiv.</span>
      </div>
      {rows.map((c) => (
        <V.CandidateRow key={c.id} name={c.name} role={c.role} position={c.position} src={c.src}
          status={c.status} score={c.score} when={c.when} onClick={() => onOpen(c.id)} />
      ))}
    </V.Card>
  );
}

/* ---------- Stellen: job openings ---------- */
function JobsView({ jobs, candidates, onOpen }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
      {jobs.map((j) => {
        const apps = candidates.filter((c) => c.jobId === j.id);
        const interview = apps.filter((c) => c.status === 'interview' || c.status === 'offer').length;
        return (
          <V.Card key={j.id} style={{ cursor: 'pointer' }} onClick={() => apps[0] && onOpen(apps[0].id)}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '10px' }}>
              <div>
                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '17px', fontWeight: 700, color: 'var(--text-heading)', margin: 0, letterSpacing: '-0.01em' }}>{j.title}</h3>
                <div style={{ fontSize: '12.5px', color: 'var(--text-muted)', marginTop: '3px' }}>{j.team}</div>
              </div>
              <V.Badge variant="soft" size="sm">{j.type}</V.Badge>
            </div>
            <div style={{ display: 'flex', gap: '8px', margin: '14px 0', flexWrap: 'wrap' }}>
              <V.MetaPill icon="pin">{j.location}</V.MetaPill>
              <V.MetaPill icon="users" tone="accent">{apps.length} Bewerbungen</V.MetaPill>
            </div>
            <V.ProgressBar value={Math.round((interview / Math.max(apps.length, 1)) * 100)} tone="interview" />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '12px' }}>
              <div style={{ display: 'flex' }}>
                {apps.slice(0, 4).map((c, i) => (
                  <div key={c.id} style={{ marginLeft: i === 0 ? 0 : '-9px', border: '2px solid var(--surface-card)', borderRadius: '50%' }}>
                    <V.Avatar name={c.name} src={c.src} size="xs" />
                  </div>
                ))}
              </div>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--accent-strong)', fontWeight: 600 }}>
                Pipeline <V.Icon name="arrowRight" size={13} />
              </span>
            </div>
          </V.Card>
        );
      })}
    </div>
  );
}

/* ---------- Berichte: funnel + sources ---------- */
function ReportsView({ candidates, kpis }) {
  const order = window.STAGES_ORDER;
  const max = Math.max(...order.map((s) => candidates.filter((c) => c.status === s).length), 1);
  const sources = {};
  candidates.forEach((c) => { sources[c.source] = (sources[c.source] || 0) + 1; });
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px' }}>
        {kpis.map((k, i) => <V.StatCard key={i} {...k} />)}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '16px' }}>
        <V.Card title="Funnel" subtitle="Kandidat:innen je Phase">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {order.map((s) => {
              const n = candidates.filter((c) => c.status === s).length;
              const meta = V.STAGES[s];
              return (
                <div key={s} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ width: '88px', fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)', flexShrink: 0 }}>{meta.label}</span>
                  <div style={{ flex: 1, height: '24px', background: 'var(--surface-sunk)', borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
                    <div style={{ width: `${(n / max) * 100}%`, height: '100%', background: meta.color, borderRadius: 'var(--radius-sm)', minWidth: '6px', transition: 'width var(--dur-med)' }} />
                  </div>
                  <span style={{ width: '22px', fontFamily: 'var(--font-mono)', fontSize: '13px', fontWeight: 600, color: 'var(--text-heading)', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{n}</span>
                </div>
              );
            })}
          </div>
        </V.Card>
        <V.Card title="Quellen" subtitle="Woher kommen Bewerbungen">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '13px' }}>
            {Object.entries(sources).sort((a, b) => b[1] - a[1]).map(([src, n]) => (
              <div key={src}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px', marginBottom: '5px' }}>
                  <span style={{ color: 'var(--text-body)', fontWeight: 500 }}>{src}</span>
                  <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-soft)' }}>{n}</span>
                </div>
                <V.ProgressBar value={(n / candidates.length) * 100} tone="accent" height={5} />
              </div>
            ))}
          </div>
        </V.Card>
      </div>
    </div>
  );
}

/* ---------- Postfach: inbox ---------- */
function Inbox({ candidates, onOpen }) {
  const msgs = [
    { id: 'c1', text: 'Vielen Dank für die Einladung — der Termin am 24.06. passt mir gut.', when: 'vor 2 Std.', unread: true },
    { id: 'c6', text: 'Anbei wie besprochen meine Arbeitsproben zur Research-Methodik.', when: 'vor 5 Std.', unread: true },
    { id: 'c7', text: 'Ich habe das Angebot erhalten und melde mich bis Freitag zurück.', when: 'gestern', unread: false },
    { id: 'c5', text: 'Gerne stehe ich für ein weiteres Gespräch zur Verfügung.', when: 'vor 2 Tagen', unread: false },
  ];
  const byId = Object.fromEntries(candidates.map((c) => [c.id, c]));
  return (
    <V.Card pad={false}>
      {msgs.map((m) => {
        const c = byId[m.id]; if (!c) return null;
        return (
          <div key={m.id} onClick={() => onOpen(c.id)} style={{ display: 'flex', alignItems: 'center', gap: '13px', padding: '14px 18px', borderBottom: '1px solid var(--border)', cursor: 'pointer', background: m.unread ? 'var(--accent-soft)' : 'transparent' }}>
            <V.Avatar name={c.name} src={c.src} size="md" />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontFamily: 'var(--font-display)', fontSize: '14px', fontWeight: 700, color: 'var(--text-heading)' }}>{c.name}</span>
                {m.unread && <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: 'var(--accent)' }} />}
                <V.StatusBadge status={c.status} size="sm" />
              </div>
              <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.text}</div>
            </div>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-soft)', flexShrink: 0 }}>{m.when}</span>
          </div>
        );
      })}
    </V.Card>
  );
}

Object.assign(window, { CandidateList, JobsView, ReportsView, Inbox });

})();
