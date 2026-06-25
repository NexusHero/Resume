/* PipelineBoard — Kanban of BEWERBUNGEN (applications) by stage. */
const PB = window.BewerbungstoolDesignSystem_a75119;

function KanbanCard({ app, talent, onOpen }) {
  const [hover, setHover] = React.useState(false);
  return (
    <div
      onClick={() => onOpen(talent.id)}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        background: 'var(--surface-card)', border: '1px solid var(--border)',
        borderRadius: 'var(--radius-md)', padding: '12px 13px', cursor: 'pointer',
        boxShadow: hover ? 'var(--shadow-md)' : 'var(--shadow-xs)',
        transform: hover ? 'translateY(-2px)' : 'none',
        transition: 'box-shadow var(--dur-fast), transform var(--dur-fast)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '9px' }}>
        <PB.Icon name="building" size={14} style={{ color: 'var(--text-soft)' }} />
        <span style={{ fontFamily: 'var(--font-display)', fontSize: '13.5px', fontWeight: 700, color: 'var(--text-heading)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{app.company}</span>
      </div>
      <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '11px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{app.role}</div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '7px', minWidth: 0 }}>
          <PB.Avatar name={talent.name} src={talent.src} size="xs" />
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-soft)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{talent.me ? 'Ich' : talent.name.split(' ')[0]}</span>
        </div>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', fontWeight: 600, color: app.score >= 80 ? 'var(--success)' : 'var(--text-muted)' }}>{app.score}%</span>
      </div>
    </div>
  );
}

function PipelineBoard({ apps, talents, onOpen }) {
  const order = window.STAGES_ORDER;
  const byId = Object.fromEntries(talents.map((t) => [t.id, t]));
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${order.length}, minmax(210px, 1fr))`, gap: '14px', alignItems: 'start', height: '100%' }}>
      {order.map((stage) => {
        const list = apps.filter((a) => a.status === stage);
        const meta = PB.STAGES[stage];
        return (
          <div key={stage} style={{ display: 'flex', flexDirection: 'column', gap: '11px', minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 2px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: meta.color }} />
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>{window.STAGE_LABELS[stage]}</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', fontWeight: 600, color: 'var(--text-soft)', background: 'var(--surface-sunk)', borderRadius: 'var(--radius-pill)', padding: '1px 8px', marginLeft: 'auto' }}>{list.length}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {list.map((a) => <KanbanCard key={a.id} app={a} talent={byId[a.talentId]} onOpen={onOpen} />)}
              {list.length === 0 && (
                <div style={{ border: '1.5px dashed var(--border-strong)', borderRadius: 'var(--radius-md)', padding: '16px', textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-soft)' }}>leer</div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

Object.assign(window, { PipelineBoard });
