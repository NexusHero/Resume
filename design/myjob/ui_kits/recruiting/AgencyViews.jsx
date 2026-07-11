/* VermittlerViews — the agency backbone: Mandate, Platzierungen, Berichte. */
const VV = window.MyJobDesignSystem_5611b7;

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
  const { isMobile } = window.useViewport ? window.useViewport() : { isMobile: false };
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
            {/* Fixed-width columns don't fit a phone; scroll the table sideways
                on mobile rather than misaligning the cells (ADR-0026). */}
            <div style={{ overflowX: isMobile ? 'auto' : 'visible' }}>
            <div style={{ minWidth: isMobile ? '620px' : 'auto' }}>
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
            </div>
            </div>
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
  const { isMobile } = window.useViewport ? window.useViewport() : { isMobile: false };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', gap: '14px' }}>
        {kpis.map((k, i) => <VV.StatCard key={i} {...k} />)}
      </div>
      <VV.Card pad={false} title="Placements" subtitle="Successful placements and fees">
        {/* Fixed columns scroll sideways on a phone rather than misaligning (ADR-0026). */}
        <div style={{ overflowX: isMobile ? 'auto' : 'visible' }}>
        <div style={{ minWidth: isMobile ? '600px' : 'auto' }}>
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
        </div>
        </div>
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
/* OutcomeCard — the outcome loop's aggregate: which artifacts (and which
   backend, template vs AI) actually got replies. Loads its own data; hidden
   while the log is empty — no fabricated rates. */
function OutcomeCard() {
  const [stats, setStats] = React.useState(null);
  React.useEffect(() => {
    let alive = true;
    window.RecruitApi.getArtifactStats()
      .then((s) => { if (alive) setStats(s); })
      .catch(() => {});
    return () => { alive = false; };
  }, []);
  if (!stats || !stats.byKind || stats.byKind.length === 0) return null;
  const KIND_LABELS = { outreach: 'Outreach', pitch: 'Pitch' };
  const rate = (b) => (b.replyRate === null ? '— pending' : `${b.replyRate}%`);
  return (
    <VV.Card title="Outcome loop" subtitle="What your AI artifacts actually achieved — resolved replies only, no guesses">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {stats.byKind.map((b) => (
          <div key={b.kind} style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) auto auto', gap: '14px', alignItems: 'center', padding: '9px 0', borderBottom: '1px solid var(--border)' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-heading)' }}>{KIND_LABELS[b.kind] || b.kind}</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11.5px', color: 'var(--text-muted)' }}>{b.sent} sent · {b.pending} pending</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11.5px', color: b.replyRate === null ? 'var(--text-soft)' : 'var(--accent-strong)', minWidth: '72px', textAlign: 'right' }}>{rate(b)}</span>
          </div>
        ))}
        {stats.byProvider.filter((b) => b.replyRate !== null).map((b) => (
          <div key={`${b.kind}-${b.provider}`} style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) auto', gap: '14px', alignItems: 'center', padding: '6px 0' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10.5px', color: 'var(--text-soft)' }}>{KIND_LABELS[b.kind] || b.kind} · {b.provider}</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10.5px', color: 'var(--text-muted)' }}>{rate(b)}</span>
          </div>
        ))}
      </div>
    </VV.Card>
  );
}

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
          {/* Forecast v2: the stage curve is declared, never hidden — observed
              from this desk's resolved candidacies once the sample is big
              enough, industry default until then. */}
          {Array.isArray(data.probabilities) && data.probabilities.length > 0 && (
            <div style={{ marginTop: '16px', borderTop: '1px solid var(--border)', paddingTop: '12px' }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-soft)', marginBottom: '8px' }}>
                Stage probabilities · {data.probabilities.some((p) => p.source === 'observed') ? 'learned from your desk' : 'industry defaults — learning as your pipeline resolves'}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {data.probabilities.map((p) => (
                  <span key={p.stage} title={p.source === 'observed' ? `${p.wins} of ${p.sample} resolved candidacies through ${p.stage} were placed` : `Default — only ${p.sample} resolved so far`} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 9px', borderRadius: 'var(--radius-pill)', background: 'var(--surface-sunk)', fontFamily: 'var(--font-mono)', fontSize: '10.5px', color: 'var(--text-muted)' }}>
                    {FORECAST_STAGE_LABELS[p.stage] || p.stage} {Math.round(p.probability * 100)}%
                    <span style={{ fontSize: '9px', letterSpacing: '0.06em', textTransform: 'uppercase', color: p.source === 'observed' ? 'var(--accent-strong)' : 'var(--text-soft)' }}>{p.source === 'observed' ? `yours · ${p.sample}×` : 'default'}</span>
                  </span>
                ))}
              </div>
              {Array.isArray(data.insights) && data.insights.length > 0 && (
                <div style={{ marginTop: '12px' }}>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-soft)', marginBottom: '6px' }}>Interview conversion by client</div>
                  {data.insights.map((i) => (
                    <div key={i.client} style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) auto', gap: '12px', alignItems: 'center', padding: '5px 0' }}>
                      <span style={{ fontSize: '12px', color: 'var(--text-heading)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{i.client}</span>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10.5px', color: 'var(--text-muted)' }}>{i.placements} of {i.interviews} interviews placed · {i.rate}%</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </VV.Card>
  );
}

function ReportsView({ clients, mandates, placements, apps, kpis }) {
  const { isMobile } = window.useViewport ? window.useViewport() : { isMobile: false };
  const feeNum = (s) => parseInt(String(s).replace(/[^0-9]/g, ''), 10) || 0;
  const perClient = clients.map((k) => ({
    name: k.name,
    sum: placements.filter((p) => p.client === k.name).reduce((a, p) => a + feeNum(p.fee), 0),
  })).filter((x) => x.sum > 0).sort((a, b) => b.sum - a.sum);
  const maxFee = Math.max(...perClient.map((x) => x.sum), 1);
  const active = mandates.filter((m) => m.status === 'active').length;
  const fmt = (n) => n.toLocaleString('de-DE');

  // Download the booked placements as CSV — values quoted, so names with
  // commas survive; the blob URL is revoked right after the click.
  const exportCsv = () => {
    const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const rows = [
      ['candidate', 'role', 'client', 'start', 'fee', 'status'],
      ...placements.map((p) => [p.candName, p.candRole, p.client, p.start, p.fee, p.status]),
    ];
    const csv = rows.map((r) => r.map(esc).join(',')).join('\r\n');
    const url = URL.createObjectURL(new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'placements.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <VV.Button variant="outline" size="sm" iconLeft={<VV.Icon name="download" size={14} />} disabled={placements.length === 0} onClick={exportCsv}>
          Export placements (CSV)
        </VV.Button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', gap: '14px' }}>
        {kpis.map((k, i) => <VV.StatCard key={i} {...k} />)}
      </div>
      <ForecastCard />
      <OutcomeCard />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px' }}>
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
        {/* The application funnel returns when applications have a live source. */}
      </div>
    </div>
  );
}

Object.assign(window, { MandateView, PlatzierungenView, ReportsView });
