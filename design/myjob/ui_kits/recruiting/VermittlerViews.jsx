/* VermittlerViews — the agency backbone: Mandate, Platzierungen, Berichte. */
const VV = window.MyJobDesignSystem_f3658e;

const PRIORITY = {
  high:   { label: 'High', bg: 'var(--status-rejected-soft)', bd: 'var(--status-rejected-border)', fg: 'var(--status-rejected-strong)', dot: 'var(--status-rejected)' },
  medium: { label: 'Medium', bg: 'var(--status-review-soft)', bd: 'var(--status-review-border)', fg: 'var(--status-review-strong)', dot: 'var(--status-review)' },
  low:    { label: 'Low', bg: 'var(--surface-sunk)', bd: 'var(--border)', fg: 'var(--text-soft)', dot: 'var(--neutral-400)' },
};
function PrioPill({ p }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontFamily: 'var(--font-mono)', fontSize: '10.5px', fontWeight: 600, padding: '2px 8px', borderRadius: 'var(--radius-pill)', background: p.bg, color: p.fg, border: `1px solid ${p.bd}` }}>
      <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: p.dot }} />{p.label}
    </span>
  );
}

const PLACEMENT_TONE = { 'Paid': 'hired', 'Invoiced': 'offer', 'Probation': 'interview' };

/* ---------- Mandate: client search assignments ---------- */
function MandateView({ mandates, onEdit, onOpenPipeline }) {
  const order = [];
  const byClient = new Map();
  (mandates || []).forEach((m) => {
    const key = m.client || '—';
    if (!byClient.has(key)) {
      byClient.set(key, []);
      order.push(key);
    }
    byClient.get(key).push(m);
  });
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {order.map((client) => {
        const ms = byClient.get(client);
        return (
          <VV.Card key={client} pad={false}>
            <header style={{ display: 'flex', alignItems: 'center', gap: '13px', padding: '15px 18px', borderBottom: '1px solid var(--border)' }}>
              <span style={{ width: '40px', height: '40px', borderRadius: 'var(--radius-md)', background: 'var(--ink-900)', color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}><VV.Icon name="building" size={19} /></span>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '16px', fontWeight: 700, color: 'var(--text-heading)', letterSpacing: '-0.01em' }}>{client}</div>
              </div>
              <VV.Badge variant="subtle" size="sm">{ms.length} mandates</VV.Badge>
            </header>
            {ms.map((m) => (
              <div key={m.id} onClick={onEdit ? () => onEdit(m) : undefined} role={onEdit ? 'button' : undefined} title={onEdit ? 'Edit mandate' : undefined} style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.5fr) 96px 104px 116px 116px', alignItems: 'center', gap: '14px', padding: '13px 18px', borderBottom: '1px solid var(--border)', cursor: onEdit ? 'pointer' : 'default' }}>
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
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: m.status === 'active' ? 'var(--success)' : 'var(--text-soft)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{m.status}</span>
                  {onOpenPipeline && (
                    <button
                      onClick={(e) => { e.stopPropagation(); onOpenPipeline(m); }}
                      title="Open pipeline"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: 'none', border: '1px solid var(--border-strong)', borderRadius: 'var(--radius-pill)', cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: '10.5px', color: 'var(--text-soft)', padding: '3px 9px' }}
                    >
                      <VV.Icon name="briefcase" size={12} /> Pipeline
                    </button>
                  )}
                  <VV.Icon name="chevronRight" size={15} style={{ color: 'var(--text-soft)' }} />
                </div>
              </div>
            ))}
          </VV.Card>
        );
      })}
      {order.length === 0 && (
        <VV.Card>
          <div style={{ padding: '40px', textAlign: 'center', fontSize: '13px', color: 'var(--text-soft)' }}>
            No mandates yet.
          </div>
        </VV.Card>
      )}
    </div>
  );
}

/* ---------- Platzierungen: booked placements + fees ---------- */
function PlatzierungenView({ placements, kpis, onEdit }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px' }}>
        {kpis.map((k, i) => <VV.StatCard key={i} {...k} />)}
      </div>
      <VV.Card pad={false} title="Placements" subtitle="Successful placements and fees">
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.4fr) minmax(0,1.2fr) 110px 110px 110px', gap: '14px', padding: '11px 18px', fontFamily: 'var(--font-mono)', fontSize: '9.5px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-soft)', borderBottom: '1px solid var(--border)', background: 'var(--surface-subtle)' }}>
          <span>Talent</span><span>Client · Role</span><span>Start</span><span>Fee</span><span style={{ textAlign: 'right' }}>Status</span>
        </div>
        {placements.map((p) => (
          <div key={p.id} onClick={onEdit ? () => onEdit(p) : undefined} role={onEdit ? 'button' : undefined} title={onEdit ? 'Edit placement' : undefined} style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.4fr) minmax(0,1.2fr) 110px 110px 110px', gap: '14px', alignItems: 'center', padding: '13px 18px', borderBottom: '1px solid var(--border)', cursor: onEdit ? 'pointer' : 'default' }}>
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
        {placements.length === 0 && (
          <div style={{ padding: '40px', textAlign: 'center', fontSize: '13px', color: 'var(--text-soft)' }}>
            No placements yet.
          </div>
        )}
      </VV.Card>
    </div>
  );
}

/* ---------- Berichte: provision per client + mandate health + funnel ---------- */
/* Candidacy-stage labels for the forecast (distinct from application stages). */
const FORECAST_STAGE_LABELS = {
  sourced: 'Sourced',
  screening: 'Screening',
  interview: 'Interview',
  offer: 'Offer',
  placed: 'Placed',
  rejected: 'Rejected',
};

/* ForecastCard — weighted expected revenue across the live pipeline. Each
   mandate's fee is weighted by the probability its pipeline yields a placement.
   Self-fetching so it stays decoupled from the report props. */
function ForecastCard() {
  const [data, setData] = React.useState(null); // null = loading
  const [error, setError] = React.useState(false);
  const fmt = (n) => (Number(n) || 0).toLocaleString('de-DE');

  React.useEffect(() => {
    let alive = true;
    window.RecruitApi.getForecast()
      .then((d) => { if (alive) setData(d); })
      .catch(() => { if (alive) setError(true); });
    return () => { alive = false; };
  }, []);

  return (
    <VV.Card title="Pipeline forecast" subtitle="Weighted expected revenue across live mandates">
      {error ? (
        <div style={{ padding: '18px', textAlign: 'center', color: 'var(--text-soft)', fontSize: '13px' }}>Could not load the forecast.</div>
      ) : data === null ? (
        <div style={{ padding: '22px', textAlign: 'center', color: 'var(--text-soft)', fontSize: '13px' }}>Loading…</div>
      ) : data.mandates.length === 0 ? (
        <div style={{ padding: '18px', textAlign: 'center', color: 'var(--text-soft)', fontSize: '13px' }}>No candidates in any pipeline yet — the forecast fills as you add candidacies.</div>
      ) : (
        <>
          <div style={{ display: 'flex', gap: '24px', marginBottom: '16px' }}>
            <div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '26px', fontWeight: 700, color: 'var(--accent-strong)', letterSpacing: '-0.02em' }}>{fmt(data.totalWeighted)} €</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10.5px', letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--text-soft)', marginTop: '2px' }}>Weighted (expected)</div>
            </div>
            <div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '26px', fontWeight: 700, color: 'var(--text-heading)', letterSpacing: '-0.02em' }}>{fmt(data.totalFaceValue)} €</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10.5px', letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--text-soft)', marginTop: '2px' }}>Face value (if all fill)</div>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '11px' }}>
            {data.mandates.map((m) => (
              <div key={m.mandateId} style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) auto', gap: '12px', alignItems: 'center' }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--text-heading)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.role} <span style={{ color: 'var(--text-soft)', fontWeight: 400 }}>· {m.client}</span></div>
                  <div style={{ height: '7px', marginTop: '5px', background: 'var(--surface-sunk)', borderRadius: 'var(--radius-pill)', overflow: 'hidden' }}>
                    <div style={{ width: `${Math.round(m.probability * 100)}%`, height: '100%', background: 'var(--accent)', borderRadius: 'var(--radius-pill)' }} />
                  </div>
                </div>
                <div style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '12.5px', fontWeight: 600, color: 'var(--accent-strong)' }}>{fmt(m.weightedValue)} €</div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-soft)', marginTop: '1px' }}>{Math.round(m.probability * 100)}% · {FORECAST_STAGE_LABELS[m.topStage] || m.topStage} · {m.candidacies}×</div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </VV.Card>
  );
}

function ReportsView({ clients, mandates, placements, apps, kpis }) {
  const feeNum = (s) => parseInt(String(s).replace(/[^0-9]/g, ''), 10) || 0;
  const perClient = clients.map((k) => ({
    name: k.name,
    sum: placements.filter((p) => p.client === k.name).reduce((a, p) => a + feeNum(p.fee), 0),
  })).filter((x) => x.sum > 0).sort((a, b) => b.sum - a.sum);
  const maxFee = Math.max(...perClient.map((x) => x.sum), 1);
  const active = mandates.filter((m) => m.status === 'active').length;
  const fmt = (n) => n.toLocaleString('de-DE');
  const order = window.STAGES_ORDER;
  const maxStage = Math.max(...order.map((s) => apps.filter((a) => a.status === s).length), 1);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px' }}>
        {kpis.map((k, i) => <VV.StatCard key={i} {...k} />)}
      </div>
      <ForecastCard />
      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '16px' }}>
        <VV.Card title="Fees per client" subtitle="Booked placements Q2">
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
        <VV.Card title="Application funnel" subtitle="Candidates per stage">
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
