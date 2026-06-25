/* VermittlerViews — the agency backbone: Mandate, Platzierungen, Berichte. */
const VV = window.BewerbungstoolDesignSystem_a75119;

const PRIORITY = {
  hoch:    { label: 'Hoch', bg: 'var(--status-rejected-soft)', bd: 'var(--status-rejected-border)', fg: 'var(--status-rejected-strong)', dot: 'var(--status-rejected)' },
  mittel:  { label: 'Mittel', bg: 'var(--status-review-soft)', bd: 'var(--status-review-border)', fg: 'var(--status-review-strong)', dot: 'var(--status-review)' },
  niedrig: { label: 'Niedrig', bg: 'var(--surface-sunk)', bd: 'var(--border)', fg: 'var(--text-soft)', dot: 'var(--neutral-400)' },
};
function PrioPill({ p }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontFamily: 'var(--font-mono)', fontSize: '10.5px', fontWeight: 600, padding: '2px 8px', borderRadius: 'var(--radius-pill)', background: p.bg, color: p.fg, border: `1px solid ${p.bd}` }}>
      <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: p.dot }} />{p.label}
    </span>
  );
}

const PLACEMENT_TONE = { 'Bezahlt': 'hired', 'In Rechnung': 'offer', 'Probezeit': 'interview' };

/* ---------- Mandate: client search assignments ---------- */
function MandateView({ clients, mandates }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {clients.map((k) => {
        const ms = mandates.filter((m) => m.clientId === k.id);
        if (ms.length === 0) return null;
        return (
          <VV.Card key={k.id} pad={false}>
            <header style={{ display: 'flex', alignItems: 'center', gap: '13px', padding: '15px 18px', borderBottom: '1px solid var(--border)' }}>
              <span style={{ width: '40px', height: '40px', borderRadius: 'var(--radius-md)', background: 'var(--ink-900)', color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}><VV.Icon name="building" size={19} /></span>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '16px', fontWeight: 700, color: 'var(--text-heading)', letterSpacing: '-0.01em' }}>{k.name}</div>
                <div style={{ fontSize: '12px', color: 'var(--text-soft)', marginTop: '1px' }}>{k.industry} · {k.location} · Kunde seit {k.since}</div>
              </div>
              <VV.Badge variant="subtle" size="sm">{ms.length} Mandate</VV.Badge>
            </header>
            {ms.map((m) => (
              <div key={m.id} style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.5fr) 96px 104px 116px 116px', alignItems: 'center', gap: '14px', padding: '13px 18px', borderBottom: '1px solid var(--border)' }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-heading)' }}>{m.role}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-soft)', marginTop: '2px' }}><VV.Icon name="pin" size={11} />{m.location}</div>
                </div>
                <PrioPill p={PRIORITY[m.priority]} />
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '14px', fontWeight: 600, color: 'var(--accent-strong)', fontVariantNumeric: 'tabular-nums' }}>{m.fee}</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10.5px', color: 'var(--text-soft)' }}>{m.feeValue}</span>
                </div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-muted)' }}>
                  <VV.Icon name="users" size={12} style={{ display: 'inline', verticalAlign: '-2px', marginRight: '4px' }} />{m.submitted} · {m.interviews} Int.
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'flex-end' }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: m.status === 'aktiv' ? 'var(--success)' : 'var(--text-soft)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{m.status}</span>
                  <VV.Icon name="chevronRight" size={15} style={{ color: 'var(--text-soft)' }} />
                </div>
              </div>
            ))}
          </VV.Card>
        );
      })}
    </div>
  );
}

/* ---------- Platzierungen: booked placements + fees ---------- */
function PlatzierungenView({ placements, kpis }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px' }}>
        {kpis.map((k, i) => <VV.StatCard key={i} {...k} />)}
      </div>
      <VV.Card pad={false} title="Platzierungen" subtitle="Erfolgreiche Vermittlungen und Provision">
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.4fr) minmax(0,1.2fr) 110px 110px 110px', gap: '14px', padding: '11px 18px', fontFamily: 'var(--font-mono)', fontSize: '9.5px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-soft)', borderBottom: '1px solid var(--border)', background: 'var(--surface-subtle)' }}>
          <span>Talent</span><span>Kunde · Rolle</span><span>Start</span><span>Provision</span><span style={{ textAlign: 'right' }}>Status</span>
        </div>
        {placements.map((p) => (
          <div key={p.id} style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.4fr) minmax(0,1.2fr) 110px 110px 110px', gap: '14px', alignItems: 'center', padding: '13px 18px', borderBottom: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '11px', minWidth: 0 }}>
              <VV.Avatar name={p.candName} size="sm" />
              <span style={{ fontFamily: 'var(--font-display)', fontSize: '13.5px', fontWeight: 700, color: 'var(--text-heading)' }}>{p.candName}</span>
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-heading)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.client}</div>
              <div style={{ fontSize: '11.5px', color: 'var(--text-soft)' }}>{p.candRole}</div>
            </div>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-muted)' }}>{p.start}</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '14px', fontWeight: 600, color: 'var(--accent-strong)', fontVariantNumeric: 'tabular-nums' }}>{p.fee}</span>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}><VV.StatusBadge status={PLACEMENT_TONE[p.status]} label={p.status} size="sm" /></div>
          </div>
        ))}
      </VV.Card>
    </div>
  );
}

/* ---------- Berichte: provision per client + mandate health + funnel ---------- */
function ReportsView({ clients, mandates, placements, apps, kpis }) {
  const feeNum = (s) => parseInt(String(s).replace(/[^0-9]/g, ''), 10) || 0;
  const perClient = clients.map((k) => ({
    name: k.name,
    sum: placements.filter((p) => p.client === k.name).reduce((a, p) => a + feeNum(p.fee), 0),
  })).filter((x) => x.sum > 0).sort((a, b) => b.sum - a.sum);
  const maxFee = Math.max(...perClient.map((x) => x.sum), 1);
  const active = mandates.filter((m) => m.status === 'aktiv').length;
  const fmt = (n) => n.toLocaleString('de-DE');
  const order = window.STAGES_ORDER;
  const maxStage = Math.max(...order.map((s) => apps.filter((a) => a.status === s).length), 1);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px' }}>
        {kpis.map((k, i) => <VV.StatCard key={i} {...k} />)}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '16px' }}>
        <VV.Card title="Provision je Kunde" subtitle="Gebuchte Vermittlungen Q2">
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
        </VV.Card>
        <VV.Card title="Bewerbungs-Funnel" subtitle="Kandidat:innen je Phase">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {order.map((s) => {
              const n = apps.filter((a) => a.status === s).length;
              const meta = VV.STAGES[s];
              return (
                <div key={s} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ width: '74px', fontFamily: 'var(--font-mono)', fontSize: '10.5px', color: 'var(--text-muted)', flexShrink: 0 }}>{window.STAGE_LABELS[s]}</span>
                  <div style={{ flex: 1, height: '20px', background: 'var(--surface-sunk)', borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
                    <div style={{ width: `${(n / maxStage) * 100}%`, height: '100%', background: meta.color, borderRadius: 'var(--radius-sm)', minWidth: '6px' }} />
                  </div>
                  <span style={{ width: '20px', fontFamily: 'var(--font-mono)', fontSize: '12px', fontWeight: 600, color: 'var(--text-heading)', textAlign: 'right' }}>{n}</span>
                </div>
              );
            })}
          </div>
        </VV.Card>
      </div>
    </div>
  );
}

Object.assign(window, { MandateView, PlatzierungenView, ReportsView });
