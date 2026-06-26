/* Meine Stellen — work history + earnings. Two comp models:
   salary (Gehaltsverlauf + total paid) and hourly (Stunden × Satz).
   List → click a position → earnings detail with a small bar chart. */
const PO = window.MyJobDesignSystem_f3658e;

function fmtMonth(ym) {
  if (!ym) return 'heute';
  const [y, m] = ym.split('-');
  if (!m) return y;
  return new Date(+y, +m - 1, 1).toLocaleDateString('de-DE', { month: 'short', year: 'numeric' });
}
function PosTile({ p, size = 44 }) {
  const ini = p.company.split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
  return <div style={{ width: size, height: size, flexShrink: 0, borderRadius: 'var(--radius-md)', background: p.tile, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: size * 0.34 + 'px' }}>{ini}</div>;
}

/* tiny SVG bar chart */
function MiniBars({ data, color = 'var(--accent)', unit = '' }) {
  const max = Math.max(...data.map((d) => d.v));
  const W = 100 / data.length;
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0', height: '120px', width: '100%' }}>
      {data.map((d, i) => (
        <div key={i} style={{ width: `${W}%`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', gap: '7px', height: '100%' }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', fontWeight: 600, color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>{d.label2 || ''}</div>
          <div title={`${d.v}${unit}`} style={{ width: '64%', height: `${Math.max(4, (d.v / max) * 88)}px`, background: color, borderRadius: 'var(--radius-sm) var(--radius-sm) 0 0', transition: 'height var(--dur-med) var(--ease-out)' }} />
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '9.5px', color: 'var(--text-soft)', textAlign: 'center', lineHeight: 1.2 }}>{d.label}</div>
        </div>
      ))}
    </div>
  );
}

function PosRow({ p, onOpen }) {
  const { fmtEUR, positionTotal } = window.KarriereData;
  const [hover, setHover] = React.useState(false);
  const t = positionTotal(p);
  return (
    <div onClick={() => onOpen(p.id)} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{ display: 'grid', gridTemplateColumns: 'minmax(0,2fr) 150px 150px 28px', alignItems: 'center', gap: '16px', padding: '16px 18px', cursor: 'pointer', background: hover ? 'var(--surface-subtle)' : 'transparent', borderBottom: '1px solid var(--border)', transition: 'background var(--dur-fast) var(--ease-out)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', minWidth: 0 }}>
        <PosTile p={p} />
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: '15px', fontWeight: 700, color: 'var(--text-heading)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0 }}>{p.company}</span>
            {p.current && <PO.Badge variant="soft" size="sm" style={{ flexShrink: 0 }}>aktiv</PO.Badge>}
          </div>
          <div style={{ fontSize: '12.5px', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.role}</div>
        </div>
      </div>
      <div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11.5px', color: 'var(--text-body)' }}>{fmtMonth(p.start)} – {fmtMonth(p.end)}</div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10.5px', color: 'var(--text-soft)', marginTop: '2px' }}>{p.type}</div>
      </div>
      <div style={{ textAlign: 'right' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: '17px', fontWeight: 700, color: 'var(--text-heading)', fontVariantNumeric: 'tabular-nums' }}>{fmtEUR(t.total)}</div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-soft)' }}>{p.model === 'hourly' ? `${t.hours} h × ${p.rate} €` : 'gesamt bezahlt'}</div>
      </div>
      <PO.Icon name="chevronRight" size={16} style={{ color: 'var(--text-soft)' }} />
    </div>
  );
}

function EarnDetail({ p, onClose }) {
  const { fmtEUR, positionTotal } = window.KarriereData;
  const t = positionTotal(p);
  let chart, breakdown;
  if (p.model === 'salary') {
    chart = p.salary.map((s, i) => ({ label: 'ab ' + fmtMonth(s.from), label2: fmtEUR(s.gross).replace('€ ', ''), v: s.gross }));
    const base = t.total - (p.bonusPaid || 0);
    breakdown = [
      { k: 'Grundgehalt (kumuliert)', v: base, c: 'var(--accent)' },
      { k: 'Bonus (kumuliert)', v: p.bonusPaid || 0, c: 'var(--status-offer)' },
    ];
  } else {
    chart = p.hours.map((h) => ({ label: h.month, label2: h.h + 'h', v: h.h * p.rate }));
  }
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 40, display: 'flex', justifyContent: 'flex-end' }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(8,11,18,0.45)', backdropFilter: 'blur(2px)', animation: 'kfade var(--dur-fast) var(--ease-out)' }} />
      <div style={{ position: 'relative', width: '500px', maxWidth: '92vw', height: '100%', background: 'var(--surface-card)', borderLeft: '1px solid var(--border)', boxShadow: 'var(--shadow-lg)', overflowY: 'auto', animation: 'kslide var(--dur-med) var(--ease-out)' }}>
        <div style={{ padding: '22px 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
          <PosTile p={p} size={52} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '19px', fontWeight: 700, color: 'var(--text-heading)' }}>{p.company}</div>
            <div style={{ fontSize: '13.5px', color: 'var(--text-muted)' }}>{p.role}</div>
            <div style={{ display: 'flex', gap: '8px', marginTop: '8px', flexWrap: 'wrap' }}>
              <PO.Badge variant="subtle" size="sm">{p.type}</PO.Badge>
              <PO.MetaPill icon="calendar">{fmtMonth(p.start)} – {fmtMonth(p.end)}</PO.MetaPill>
            </div>
          </div>
          <PO.IconButton icon="x" label="Schließen" variant="ghost" onClick={onClose} />
        </div>

        <div style={{ padding: '22px 24px', display: 'flex', flexDirection: 'column', gap: '22px' }}>
          <div style={{ background: 'linear-gradient(160deg, var(--ink-800), var(--ink-900))', borderRadius: 'var(--radius-lg)', padding: '20px 22px', color: '#fff' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10.5px', letterSpacing: 'var(--ls-wide)', textTransform: 'uppercase', color: 'var(--sidebar-soft)' }}>Bisher verdient</div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '40px', fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.1, marginTop: '4px', fontVariantNumeric: 'tabular-nums' }}>{fmtEUR(t.total)}</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11.5px', color: 'var(--accent-on-dark)', marginTop: '4px' }}>
              {p.model === 'hourly' ? `${t.hours} Stunden × ${p.rate} €/h` : `aktueller Stand: ${fmtEUR(p.salary[p.salary.length - 1].gross)} / Monat brutto`}
            </div>
          </div>

          <section>
            <h4 style={{ fontFamily: 'var(--font-mono)', fontSize: '10.5px', letterSpacing: 'var(--ls-wide)', textTransform: 'uppercase', color: 'var(--text-soft)', margin: '0 0 16px' }}>{p.model === 'salary' ? 'Gehaltsverlauf · brutto / Monat' : 'Stunden × Satz'}</h4>
            <MiniBars data={chart} color={p.model === 'salary' ? 'var(--accent)' : 'var(--status-hired)'} />
          </section>

          {breakdown && (
            <section style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <h4 style={{ fontFamily: 'var(--font-mono)', fontSize: '10.5px', letterSpacing: 'var(--ls-wide)', textTransform: 'uppercase', color: 'var(--text-soft)', margin: 0 }}>Zusammensetzung</h4>
              {breakdown.map((b) => (
                <div key={b.k} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                      <span style={{ fontSize: '12.5px', color: 'var(--text-body)' }}>{b.k}</span>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12.5px', fontWeight: 600, color: 'var(--text-heading)', fontVariantNumeric: 'tabular-nums' }}>{fmtEUR(b.v)}</span>
                    </div>
                    <div style={{ height: '7px', borderRadius: 'var(--radius-pill)', background: 'var(--surface-sunk)', overflow: 'hidden' }}>
                      <div style={{ width: `${(b.v / t.total) * 100}%`, height: '100%', background: b.c, borderRadius: 'var(--radius-pill)' }} />
                    </div>
                  </div>
                </div>
              ))}
            </section>
          )}

          <div style={{ display: 'flex', gap: '10px' }}>
            <PO.Button variant="outline" size="sm" iconLeft={<PO.Icon name="download" size={14} />}>Als Nachweis (PDF)</PO.Button>
            <PO.Button variant="ghost" size="sm" iconLeft={<PO.Icon name="edit" size={14} />}>Bearbeiten</PO.Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Stellen({ openId, onOpen, onClose }) {
  const { POSITIONS, fmtEUR, positionTotal } = window.KarriereData;
  const lifetime = POSITIONS.reduce((s, p) => s + positionTotal(p).total, 0);
  const current = POSITIONS.filter((p) => p.current);
  const openPos = POSITIONS.find((p) => p.id === openId);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', maxWidth: '1100px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px' }}>
        <PO.StatCard label="Lebensverdienst" value={fmtEUR(lifetime)} icon="trend" />
        <PO.StatCard label="Aktive Stellen" value={current.length} icon="briefcase" />
        <PO.StatCard label="Stundensatz · Freelance" value={'75\u00a0€'} icon="zap" />
      </div>

      <AP_Card title="Arbeitshistorie" subtitle="Klicke eine Stelle für den Verdienst-Verlauf">
        {POSITIONS.map((p) => <PosRow key={p.id} p={p} onOpen={onOpen} />)}
      </AP_Card>

      {openPos && <EarnDetail p={openPos} onClose={onClose} />}
    </div>
  );
}

/* Card wrapper with flush body (DS Card pad=false) */
function AP_Card({ title, subtitle, children }) {
  return <PO.Card title={title} subtitle={subtitle} pad={false}>{children}</PO.Card>;
}

Object.assign(window, { KStellen: Stellen });
