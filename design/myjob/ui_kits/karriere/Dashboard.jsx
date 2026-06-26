/* Übersicht — the landing dashboard. Lifetime earnings, application health,
   and "nachfassen fällig" reminders so nothing slips. */
const DB = window.MyJobDesignSystem_f3658e;
const DB_TODAY = new Date('2026-06-26');
const dAgo = (d) => (d ? Math.round((DB_TODAY - new Date(d)) / 86400000) : null);

function Uebersicht({ apps, onNav, onOpenApp }) {
  const { POSITIONS, fmtEUR, positionTotal, ME } = window.KarriereData;
  const APPLICATIONS = apps || window.KarriereData.APPLICATIONS;
  const lifetime = POSITIONS.reduce((s, p) => s + positionTotal(p).total, 0);
  const active = APPLICATIONS.filter((a) => ['interview', 'offer', 'review', 'new'].includes(a.status));
  const awaiting = APPLICATIONS.filter((a) => a.awaiting);
  const offers = APPLICATIONS.filter((a) => a.status === 'offer');
  const recent = [...APPLICATIONS].sort((a, b) => new Date(b.sent) - new Date(a.sent)).slice(0, 4);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '1100px' }}>
      <div style={{ background: 'linear-gradient(160deg, var(--ink-800), var(--ink-950))', borderRadius: 'var(--radius-xl)', padding: '24px 26px', color: '#fff', display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: '240px' }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10.5px', letterSpacing: 'var(--ls-wide)', textTransform: 'uppercase', color: 'var(--sidebar-soft)' }}>Bisher insgesamt verdient</div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '44px', fontWeight: 700, letterSpacing: '-0.025em', lineHeight: 1.05, marginTop: '4px', fontVariantNumeric: 'tabular-nums' }}>{fmtEUR(lifetime)}</div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--accent-on-dark)', marginTop: '6px' }}>über {POSITIONS.length} Stellen · seit 2020</div>
        </div>
        <button onClick={() => onNav('stellen')} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', border: '1px solid var(--sidebar-border-strong)', background: 'var(--sidebar-glass)', color: '#fff', borderRadius: 'var(--radius-pill)', padding: '11px 18px', cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: '12.5px', fontWeight: 600 }}>
          Verdienst ansehen <DB.Icon name="arrowRight" size={15} />
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px' }}>
        <DB.StatCard label="Aktive Bewerbungen" value={active.length} icon="send" />
        <DB.StatCard label="Antwort offen" value={awaiting.length} icon="clock" delta="nachfassen" dir={awaiting.length ? 'down' : 'up'} />
        <DB.StatCard label="Angebote" value={offers.length} icon="award" delta={offers.length ? 'aktiv' : '—'} dir="up" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '16px', alignItems: 'start' }}>
        <DB.Card title="Zuletzt gesendet" subtitle="Deine neuesten Bewerbungen" action={<DB.Button size="sm" variant="ghost" iconRight={<DB.Icon name="arrowRight" size={13} />} onClick={() => onNav('bewerbungen')}>Alle</DB.Button>} pad={false}>
          {recent.map((a) => {
            const ini = a.company.split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
            return (
              <div key={a.id} onClick={() => onOpenApp(a.id)} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 18px', borderBottom: '1px solid var(--border)', cursor: 'pointer' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: 'var(--radius-md)', background: a.tile, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '13px', flexShrink: 0 }}>{ini}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--text-heading)' }}>{a.company}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-soft)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.role}</div>
                </div>
                <DB.StatusBadge status={a.status} label={a.statusLabel} size="sm" />
              </div>
            );
          })}
        </DB.Card>

        <DB.Card title="Nachfassen fällig" subtitle="Damit nichts vergessen wird">
          {awaiting.length === 0 ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--success)', fontSize: '13px' }}><DB.Icon name="checkCircle" size={18} /> Alles beantwortet 🎯</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {awaiting.map((a) => {
                const since = dAgo(a.lastReply);
                return (
                  <div key={a.id} onClick={() => onOpenApp(a.id)} style={{ display: 'flex', alignItems: 'center', gap: '11px', cursor: 'pointer' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--warning)', flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-heading)' }}>{a.company}</div>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10.5px', color: 'var(--warning)' }}>{since == null ? 'keine Bestätigung' : `${since} Tage ohne Antwort`}</div>
                    </div>
                    <DB.Icon name="send" size={15} style={{ color: 'var(--text-soft)' }} />
                  </div>
                );
              })}
            </div>
          )}
        </DB.Card>
      </div>
    </div>
  );
}

Object.assign(window, { KUebersicht: Uebersicht });
