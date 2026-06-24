/* __kit_guard__ */
(function(){ var __s=document.currentScript; if (__s && /_ds_bundle\.js/.test(__s.src||'')) return;
/* VermittlerViews — the agency workflow: Mandate, Talent-Pool, Platzierungen, Berichte. */
const W = window.BewerbungstoolDesignSystem_a75119;

const PRIORITY = {
  hoch:    { label: 'Hoch', bg: 'var(--status-rejected-soft)', bd: 'var(--status-rejected-border)', fg: 'var(--status-rejected-strong)', dot: 'var(--status-rejected)' },
  mittel:  { label: 'Mittel', bg: 'var(--status-review-soft)', bd: 'var(--status-review-border)', fg: 'var(--status-review-strong)', dot: 'var(--status-review)' },
  niedrig: { label: 'Niedrig', bg: 'var(--surface-sunk)', bd: 'var(--border)', fg: 'var(--text-soft)', dot: 'var(--neutral-400)' },
};
function Pill({ p }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontFamily: 'var(--font-mono)', fontSize: '10.5px', fontWeight: 600, padding: '2px 8px', borderRadius: 'var(--radius-pill)', background: p.bg, color: p.fg, border: `1px solid ${p.bd}` }}>
      <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: p.dot }} />{p.label}
    </span>
  );
}

const PLACEMENT_STATUS = {
  'Bezahlt':     { tone: 'hired' },
  'In Rechnung': { tone: 'offer' },
  'Probezeit':   { tone: 'interview' },
};

/* ---------- Mandate: client mandates grouped by Kunde ---------- */
function MandateView({ clients, mandates, onOpen }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {clients.map((k) => {
        const ms = mandates.filter((m) => m.clientId === k.id);
        if (ms.length === 0) return null;
        return (
          <W.Card key={k.id} pad={false}>
            <header style={{ display: 'flex', alignItems: 'center', gap: '13px', padding: '15px 18px', borderBottom: '1px solid var(--border)' }}>
              <span style={{ width: '40px', height: '40px', borderRadius: 'var(--radius-md)', background: 'var(--ink-900)', color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}><W.Icon name="building" size={19} /></span>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '16px', fontWeight: 700, color: 'var(--text-heading)', letterSpacing: '-0.01em' }}>{k.name}</div>
                <div style={{ fontSize: '12px', color: 'var(--text-soft)', marginTop: '1px' }}>{k.industry} · {k.location} · Kunde seit {k.since}</div>
              </div>
              <W.Badge variant="subtle" size="sm">{ms.length} Mandate</W.Badge>
            </header>
            {ms.map((m) => (
              <div key={m.id} onClick={() => onOpen && onOpen(m)} style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.5fr) 96px 100px 120px 120px', alignItems: 'center', gap: '14px', padding: '13px 18px', borderBottom: '1px solid var(--border)', cursor: onOpen ? 'pointer' : 'default' }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-heading)' }}>{m.role}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-soft)', marginTop: '2px' }}><W.Icon name="pin" size={11} />{m.location}</div>
                </div>
                <Pill p={PRIORITY[m.priority]} />
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '14px', fontWeight: 600, color: 'var(--accent-strong)', fontVariantNumeric: 'tabular-nums' }}>{m.fee}</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10.5px', color: 'var(--text-soft)' }}>{m.feeValue}</span>
                </div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-muted)' }}>
                  <W.Icon name="users" size={12} style={{ display: 'inline', verticalAlign: '-2px', marginRight: '4px' }} />{m.submitted} · {m.interviews} Int.
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'flex-end' }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: m.status === 'aktiv' ? 'var(--success)' : 'var(--text-soft)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{m.status}</span>
                  <W.Icon name="chevronRight" size={15} style={{ color: 'var(--text-soft)' }} />
                </div>
              </div>
            ))}
          </W.Card>
        );
      })}
    </div>
  );
}

/* ---------- Talent-Pool: the agency roster ---------- */
function PoolView({ pool, candidates, onOpen }) {
  const byId = Object.fromEntries(candidates.map((c) => [c.id, c]));
  return (
    <W.Card pad={false} title="Talent-Pool" subtitle="Kandidat:innen der Agentur und ihre Verfügbarkeit">
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.5fr) 110px minmax(0,1.3fr) 70px 90px', gap: '14px', padding: '11px 18px', fontFamily: 'var(--font-mono)', fontSize: '9.5px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-soft)', borderBottom: '1px solid var(--border)', background: 'var(--surface-subtle)' }}>
        <span>Talent</span><span>Verfügbar</span><span>Vorgeschlagen bei</span><span>Match</span><span style={{ textAlign: 'right' }}>Phase</span>
      </div>
      {pool.map((p) => {
        const c = byId[p.id]; if (!c) return null;
        return (
          <div key={p.id} onClick={() => onOpen(c.id)} style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.5fr) 110px minmax(0,1.3fr) 70px 90px', gap: '14px', alignItems: 'center', padding: '11px 18px', borderBottom: '1px solid var(--border)', cursor: 'pointer' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '11px', minWidth: 0 }}>
              <W.Avatar name={c.name} src={c.src} size="md" />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '13.5px', fontWeight: 700, color: 'var(--text-heading)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.name}</div>
                <div style={{ fontSize: '12px', color: 'var(--text-soft)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.role}</div>
              </div>
            </div>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11.5px', fontWeight: 600, color: p.availability === 'sofort' ? 'var(--success)' : 'var(--text-muted)' }}>{p.availability}</span>
            <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
              {p.submittedTo.map((s, i) => <W.Badge key={i} variant="subtle" size="sm">{s}</W.Badge>)}
            </div>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', fontWeight: 600, color: c.score >= 80 ? 'var(--success)' : 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>{c.score}%</span>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}><W.StatusBadge status={c.status} size="sm" /></div>
          </div>
        );
      })}
    </W.Card>
  );
}

/* ---------- Platzierungen: booked placements + fees ---------- */
function PlatzierungenView({ placements, candidates, kpis }) {
  const byId = Object.fromEntries(candidates.map((c) => [c.id, c]));
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px' }}>
        {kpis.map((k, i) => <W.StatCard key={i} {...k} />)}
      </div>
      <W.Card pad={false} title="Platzierungen" subtitle="Erfolgreiche Vermittlungen und Provision">
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.4fr) minmax(0,1.2fr) 110px 110px 110px', gap: '14px', padding: '11px 18px', fontFamily: 'var(--font-mono)', fontSize: '9.5px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-soft)', borderBottom: '1px solid var(--border)', background: 'var(--surface-subtle)' }}>
          <span>Talent</span><span>Kunde · Rolle</span><span>Start</span><span>Provision</span><span style={{ textAlign: 'right' }}>Status</span>
        </div>
        {placements.map((p) => {
          const c = byId[p.candId];
          return (
            <div key={p.id} style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.4fr) minmax(0,1.2fr) 110px 110px 110px', gap: '14px', alignItems: 'center', padding: '13px 18px', borderBottom: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '11px', minWidth: 0 }}>
                <W.Avatar name={c ? c.name : '?'} src={c && c.src} size="sm" />
                <span style={{ fontFamily: 'var(--font-display)', fontSize: '13.5px', fontWeight: 700, color: 'var(--text-heading)' }}>{c ? c.name : '—'}</span>
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-heading)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.client}</div>
                <div style={{ fontSize: '11.5px', color: 'var(--text-soft)' }}>{p.role}</div>
              </div>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-muted)' }}>{p.start}</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '14px', fontWeight: 600, color: 'var(--accent-strong)', fontVariantNumeric: 'tabular-nums' }}>{p.fee}</span>
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}><W.StatusBadge status={PLACEMENT_STATUS[p.status].tone} label={p.status} size="sm" /></div>
            </div>
          );
        })}
      </W.Card>
    </div>
  );
}

/* ---------- Berichte (agency): provision per client + mandate health ---------- */
function VermittlerReports({ clients, mandates, placements, kpis }) {
  const feeNum = (s) => parseInt(String(s).replace(/[^0-9]/g, ''), 10) || 0;
  const perClient = clients.map((k) => ({
    name: k.name,
    sum: placements.filter((p) => p.client === k.name).reduce((a, p) => a + feeNum(p.fee), 0),
  })).filter((x) => x.sum > 0).sort((a, b) => b.sum - a.sum);
  const maxFee = Math.max(...perClient.map((x) => x.sum), 1);
  const active = mandates.filter((m) => m.status === 'aktiv').length;
  const fmt = (n) => n.toLocaleString('de-DE');
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px' }}>
        {kpis.map((k, i) => <W.StatCard key={i} {...k} />)}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '16px' }}>
        <W.Card title="Provision je Kunde" subtitle="Gebuchte Vermittlungen">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '13px' }}>
            {perClient.map((x) => (
              <div key={x.name}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px', marginBottom: '5px' }}>
                  <span style={{ color: 'var(--text-body)', fontWeight: 500 }}>{x.name}</span>
                  <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-strong)', fontWeight: 600 }}>{fmt(x.sum)} €</span>
                </div>
                <div style={{ height: '8px', background: 'var(--surface-sunk)', borderRadius: 'var(--radius-pill)', overflow: 'hidden' }}>
                  <div style={{ width: `${(x.sum / maxFee) * 100}%`, height: '100%', background: 'var(--accent)', borderRadius: 'var(--radius-pill)' }} />
                </div>
              </div>
            ))}
          </div>
        </W.Card>
        <W.Card title="Mandate" subtitle="Status der Suchaufträge">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px' }}>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: '34px', fontWeight: 700, color: 'var(--text-heading)' }}>{active}</span>
              <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>aktive Mandate</span>
            </div>
            <W.ProgressBar value={Math.round((active / mandates.length) * 100)} tone="interview" showValue label="Auslastung" />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '4px' }}>
              {mandates.map((m) => (
                <div key={m.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12.5px' }}>
                  <span style={{ color: 'var(--text-body)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginRight: '8px' }}>{m.role}</span>
                  <Pill p={PRIORITY[m.priority]} />
                </div>
              ))}
            </div>
          </div>
        </W.Card>
      </div>
    </div>
  );
}

Object.assign(window, { MandateView, PoolView, PlatzierungenView, VermittlerReports });

})();
