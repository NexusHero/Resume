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

/* One mandate candidacy card. The talent name/role/note is the body; the shared
   KanbanCard (KanbanShared.jsx, #199) supplies the drag, the Stage select, the
   remove button and click-to-open — the same anatomy as the Applications board. */
function MandateCard({ card, onOpenTalent, onMove, onRemove }) {
  const name = card.talent ? card.talent.name : 'Unknown talent';
  const role = card.talent ? card.talent.role : '';
  const stages = MP_STAGES.map((s) => ({ value: s.id, label: s.label }));
  return (
    <window.KanbanCard
      dragId={card.id}
      onOpen={card.talent ? () => onOpenTalent(card.talent.id) : undefined}
      openLabel={`Open ${name}`}
      stages={stages}
      stageValue={card.stage}
      onStageChange={(v) => onMove(card, v)}
      onRemove={() => onRemove(card)}
      removeLabel="Remove from pipeline"
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: role || card.note ? '8px' : 0 }}>
        <MP.Avatar name={name} size="xs" />
        <span style={{ flex: 1, minWidth: 0, fontFamily: 'var(--font-display)', fontSize: '13px', fontWeight: 700, color: 'var(--text-heading)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{name}</span>
      </div>
      {role && <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginBottom: card.note ? '9px' : 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{role}</div>}
      {card.note && <div style={{ fontSize: '11.5px', color: 'var(--text-soft)', lineHeight: 1.4 }}>{card.note}</div>}
    </window.KanbanCard>
  );
}

/* The Kanban board: one shared column per stage, cards dropped between them.
   Pure presentation — the orchestrator owns the cards and the drag/move handlers. */
function PipelineColumns({ cards, dropStage, setDropStage, onDrop, onOpenTalent, onMove, onRemove }) {
  const { isMobile } = window.useViewport ? window.useViewport() : { isMobile: false };
  // On a phone the board is a horizontal snap-scroller with the next column
  // peeking past the edge as the "there's more" affordance (#202).
  return (
    <div
      className={isMobile ? 'board-scroll' : undefined}
      style={{ display: 'grid', gridTemplateColumns: isMobile ? `repeat(${MP_STAGES.length}, 82vw)` : `repeat(${MP_STAGES.length}, minmax(200px, 1fr))`, gap: '14px', alignItems: 'start', flex: 1, minHeight: 0, overflowX: 'auto', paddingBottom: isMobile ? '4px' : undefined }}
    >
      {MP_STAGES.map((s) => {
        const list = cards.filter((c) => c.stage === s.id);
        return (
          <window.KanbanColumn
            key={s.id}
            color={s.color}
            label={s.label}
            count={list.length}
            snap={isMobile}
            over={dropStage === s.id}
            onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; setDropStage(s.id); }}
            onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setDropStage(null); }}
            onDrop={(e) => onDrop(e, s.id)}
            isEmpty={list.length === 0}
          >
            {list.map((c) => <MandateCard key={c.id} card={c} onOpenTalent={onOpenTalent} onMove={onMove} onRemove={onRemove} />)}
          </window.KanbanColumn>
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
  // Remove from the pipeline — Undo over silent-delete (#200). Optimistically
  // drop the card, send the DELETE only when the snackbar times out; "Undo"
  // restores it.
  const removeCard = (card) => {
    setCards((cs) => cs.filter((c) => c.id !== card.id));
    window.UndoDelete.schedule({
      label: `${card.talent ? card.talent.name : 'Candidate'} removed from pipeline`,
      commit: () => window.RecruitApi.removeCandidacy(card.id).catch(() => load()),
      restore: () => setCards((cs) => (cs.some((c) => c.id === card.id) ? cs : [...cs, card])),
    });
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
