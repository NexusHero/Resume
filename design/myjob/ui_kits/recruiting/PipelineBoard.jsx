/* PipelineBoard — Kanban of BEWERBUNGEN (applications) by stage. Cards move
   between stages by drag-and-drop or the per-card stage dropdown (both persist
   via the applications PATCH), and a card can be removed. Built on the shared
   Kanban primitives (KanbanShared.jsx, #199) so it is interaction-identical to
   the mandate pipeline; the orchestrator (app.jsx) owns the move/delete. */
const PB = window.MyJobDesignSystem_f3658e;

/* The application-specific card body: company, role, candidate + match score.
   The drag/stage-select/remove/click-to-open anatomy is the shared KanbanCard. */
function ApplicationCard({ app, talent, stages, onOpen, onMove, onDelete }) {
  const canEdit = typeof onMove === 'function';
  return (
    <window.KanbanCard
      dragId={app.id}
      canDrag={canEdit}
      onOpen={() => onOpen(talent.id)}
      stages={canEdit ? stages : undefined}
      stageValue={app.status}
      onStageChange={canEdit ? (v) => onMove(app.id, v) : undefined}
      onRemove={canEdit ? () => onDelete(app.id, app.company) : undefined}
      removeLabel="Remove application"
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '9px' }}>
        <PB.Icon name="building" size={14} style={{ color: 'var(--text-soft)' }} />
        <span style={{ fontFamily: 'var(--font-display)', fontSize: '13.5px', fontWeight: 700, color: 'var(--text-heading)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{app.company}</span>
      </div>
      <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '11px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{app.role}</div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '7px', minWidth: 0 }}>
          <PB.Avatar name={talent.name} src={talent.src} size="xs" />
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-soft)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{talent.me ? 'Me' : (talent.name || '').split(' ')[0] || 'Candidate'}</span>
        </div>
        {typeof app.score === 'number' && (
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', fontWeight: 600, color: app.score >= 80 ? 'var(--success)' : 'var(--text-muted)' }}>{app.score}%</span>
        )}
      </div>
    </window.KanbanCard>
  );
}

function PipelineBoard({ apps, talents, onOpen, onMove, onDelete }) {
  const order = window.STAGES_ORDER;
  const stages = order.map((s) => ({ value: s, label: window.STAGE_LABELS[s] }));
  const [dropStage, setDropStage] = React.useState(null);
  const byId = Object.fromEntries(talents.map((t) => [t.id, t]));
  // An application filed for a candidate who is no longer in the pool (or the
  // pinned "me") still renders — fall back to the name captured on the record.
  const talentFor = (a) => byId[a.talentId] || { id: a.talentId, name: a.talentName || 'Candidate', me: false };
  const canEdit = typeof onMove === 'function';
  const drop = (e, stage) => {
    e.preventDefault();
    setDropStage(null);
    const id = e.dataTransfer.getData('text/plain');
    const app = apps.find((a) => a.id === id);
    if (app && app.status !== stage) onMove(id, stage);
  };
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${order.length}, minmax(210px, 1fr))`, gap: '14px', alignItems: 'start', height: '100%' }}>
      {order.map((stage) => {
        const list = apps.filter((a) => a.status === stage);
        const meta = PB.STAGES[stage];
        return (
          <window.KanbanColumn
            key={stage}
            color={meta.color}
            label={window.STAGE_LABELS[stage]}
            count={list.length}
            canDrop={canEdit}
            over={dropStage === stage}
            onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; setDropStage(stage); }}
            onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setDropStage(null); }}
            onDrop={(e) => drop(e, stage)}
            isEmpty={list.length === 0}
          >
            {list.map((a) => (
              <ApplicationCard key={a.id} app={a} talent={talentFor(a)} stages={stages} onOpen={onOpen} onMove={onMove} onDelete={onDelete} />
            ))}
          </window.KanbanColumn>
        );
      })}
    </div>
  );
}

Object.assign(window, { PipelineBoard, ApplicationCard });
