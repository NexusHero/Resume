/* MandatePipeline — the recruiting pipeline for ONE mandate: a Kanban of the
   talents in that mandate's stages, wired to the candidacies API (add from the
   pool, move stage, remove). Takes over the canvas like the talent profile.

   The orchestrator owns only the board (cards + drag state); the five feature
   modals it launches live in MandatePipelineModals.jsx (ADR-0024) and each owns
   its own state — this file just mounts them and reloads the board on add. */
const MP = window.MyJobDesignSystem_f3658e;

const MP_STAGES = [
  { id: 'sourced', label: 'Sourced', color: '#64748b' },
  { id: 'screening', label: 'Screening', color: '#2A6FDB' },
  { id: 'interview', label: 'Interview', color: '#7C3AED' },
  { id: 'offer', label: 'Offer', color: '#D97757' },
  { id: 'placed', label: 'Placed', color: '#1F8A5B' },
  { id: 'rejected', label: 'Rejected', color: '#b91c1c' },
];

function MandateCard({ card, onOpenTalent, onMove, onRemove }) {
  const [hover, setHover] = React.useState(false);
  const [dragging, setDragging] = React.useState(false);
  const name = card.talent ? card.talent.name : 'Unknown talent';
  const role = card.talent ? card.talent.role : '';
  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('text/plain', card.id);
        e.dataTransfer.effectAllowed = 'move';
        setDragging(true);
      }}
      onDragEnd={() => setDragging(false)}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      title="Drag to another stage"
      style={{
        background: 'var(--surface-card)', border: '1px solid var(--border)',
        borderRadius: 'var(--radius-md)', padding: '11px 12px',
        boxShadow: hover ? 'var(--shadow-md)' : 'var(--shadow-xs)',
        transition: 'box-shadow var(--dur-fast)',
        cursor: 'grab', opacity: dragging ? 0.45 : 1,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
        <MP.Avatar name={name} size="xs" />
        <button
          onClick={() => card.talent && onOpenTalent(card.talent.id)}
          title="Open profile"
          style={{ flex: 1, minWidth: 0, textAlign: 'left', background: 'none', border: 'none', padding: 0, cursor: card.talent ? 'pointer' : 'default', fontFamily: 'var(--font-display)', fontSize: '13px', fontWeight: 700, color: 'var(--text-heading)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
        >
          {name}
        </button>
        <button onClick={() => onRemove(card)} title="Remove from pipeline" style={{ flexShrink: 0, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '2px', lineHeight: 0 }}>
          <MP.Icon name="x" size={13} />
        </button>
      </div>
      {role && <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginBottom: '9px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{role}</div>}
      {card.note && <div style={{ fontSize: '11.5px', color: 'var(--text-soft)', marginBottom: '9px', lineHeight: 1.4 }}>{card.note}</div>}
      <select
        value={card.stage}
        onChange={(e) => onMove(card, e.target.value)}
        style={{ width: '100%', padding: '5px 8px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-strong)', background: 'var(--surface-sunk)', color: 'var(--text-soft)', fontFamily: 'var(--font-mono)', fontSize: '11px', cursor: 'pointer', outline: 'none' }}
      >
        {MP_STAGES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
      </select>
    </div>
  );
}

/* The Kanban board: one column per stage, cards dropped between them. Pure
   presentation — the orchestrator owns the cards and the drag/move handlers. */
function PipelineColumns({ cards, dropStage, setDropStage, onDrop, onOpenTalent, onMove, onRemove }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${MP_STAGES.length}, minmax(200px, 1fr))`, gap: '14px', alignItems: 'start', flex: 1, minHeight: 0, overflowX: 'auto' }}>
      {MP_STAGES.map((s) => {
        const list = cards.filter((c) => c.stage === s.id);
        const over = dropStage === s.id;
        return (
          <div
            key={s.id}
            onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; setDropStage(s.id); }}
            onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setDropStage(null); }}
            onDrop={(e) => onDrop(e, s.id)}
            style={{ display: 'flex', flexDirection: 'column', gap: '11px', minWidth: 0, borderRadius: 'var(--radius-md)', outline: over ? '2px dashed var(--accent)' : 'none', outlineOffset: '3px', background: over ? 'var(--accent-soft)' : 'transparent', transition: 'background var(--dur-fast)' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 2px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: s.color }} />
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>{s.label}</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', fontWeight: 600, color: 'var(--text-soft)', background: 'var(--surface-sunk)', borderRadius: 'var(--radius-pill)', padding: '1px 8px', marginLeft: 'auto' }}>{list.length}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', minHeight: '52px' }}>
              {list.map((c) => <MandateCard key={c.id} card={c} onOpenTalent={onOpenTalent} onMove={onMove} onRemove={onRemove} />)}
              {list.length === 0 && (
                <div style={{ border: '1.5px dashed var(--border-strong)', borderRadius: 'var(--radius-md)', padding: '14px', textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-soft)' }}>{over ? 'drop here' : 'empty'}</div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function MandatePipeline({ mandate, onBack, onOpenTalent }) {
  const [cards, setCards] = React.useState(null); // null = loading
  const [error, setError] = React.useState(false);
  const [adding, setAdding] = React.useState(false);
  const [matching, setMatching] = React.useState(false);
  const [knowledgeOpen, setKnowledgeOpen] = React.useState(false);
  const [dropStage, setDropStage] = React.useState(null);

  const load = React.useCallback(() => {
    setError(false);
    window.RecruitApi.mandateCandidacies(mandate.id).then(setCards).catch(() => setError(true));
  }, [mandate.id]);
  React.useEffect(() => { load(); }, [load]);

  const inPipeline = new Set((cards || []).map((c) => c.talentId));

  const moveCard = async (card, stage) => {
    setCards((cs) => cs.map((c) => (c.id === card.id ? { ...c, stage } : c)));
    try { await window.RecruitApi.updateCandidacy(card.id, { stage }); } catch { load(); }
  };
  // Drag-and-drop between stage columns — same optimistic move as the select.
  const dropCard = (e, stage) => {
    e.preventDefault();
    setDropStage(null);
    const id = e.dataTransfer.getData('text/plain');
    const card = (cards || []).find((c) => c.id === id);
    if (card && card.stage !== stage) moveCard(card, stage);
  };
  const removeCard = async (card) => {
    setCards((cs) => cs.filter((c) => c.id !== card.id));
    try { await window.RecruitApi.removeCandidacy(card.id); } catch { load(); }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '14px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button onClick={onBack} style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-muted)', padding: 0 }}>
          <MP.Icon name="arrowLeft" size={14} /> Back to mandates
        </button>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
          <MP.Button variant="outline" size="sm" iconLeft={<MP.Icon name="users" size={15} />} onClick={() => setKnowledgeOpen(true)}>Company knowledge</MP.Button>
          <MP.Button variant="outline" size="sm" iconLeft={<MP.Icon name="zap" size={15} />} onClick={() => setMatching(true)}>Find matches</MP.Button>
          <MP.Button variant="primary" size="sm" iconLeft={<MP.Icon name="plus" size={15} />} onClick={() => setAdding(true)}>Add candidate</MP.Button>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px' }}>
        <span style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 700, color: 'var(--text-heading)' }}>{mandate.role}</span>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-soft)' }}>{mandate.client}</span>
      </div>

      {error && (
        <div style={{ border: '1px solid var(--danger)', borderRadius: 'var(--radius-md)', padding: '16px', color: 'var(--danger)', fontSize: '13px' }}>
          Could not load the pipeline. <button onClick={load} style={{ background: 'none', border: 'none', color: 'var(--accent-strong)', cursor: 'pointer', textDecoration: 'underline' }}>Retry</button>
        </div>
      )}

      {!error && cards === null && (
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-soft)', padding: '20px' }}>Loading…</div>
      )}

      {!error && cards !== null && (
        <PipelineColumns
          cards={cards}
          dropStage={dropStage}
          setDropStage={setDropStage}
          onDrop={dropCard}
          onOpenTalent={onOpenTalent}
          onMove={moveCard}
          onRemove={removeCard}
        />
      )}

      {adding && (
        <window.AddCandidateModal
          mandate={mandate}
          excludeTalentIds={inPipeline}
          onClose={() => setAdding(false)}
          onAdded={load}
        />
      )}

      {matching && (
        <window.FindMatchesModal
          mandate={mandate}
          onClose={() => setMatching(false)}
          onOpenTalent={onOpenTalent}
          onAdded={load}
        />
      )}

      {knowledgeOpen && (
        <window.CompanyKnowledgeModal mandate={mandate} onClose={() => setKnowledgeOpen(false)} />
      )}
    </div>
  );
}

Object.assign(window, { MandatePipeline, MandateCard, PipelineColumns });
