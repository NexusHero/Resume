/* MandatePipeline — the recruiting pipeline for ONE mandate: a Kanban of the
   talents in that mandate's stages, wired to the candidacies API (add from the
   pool, move stage, remove). Takes over the canvas like the talent profile. */
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
  const name = card.talent ? card.talent.name : 'Unknown talent';
  const role = card.talent ? card.talent.role : '';
  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        background: 'var(--surface-card)', border: '1px solid var(--border)',
        borderRadius: 'var(--radius-md)', padding: '11px 12px',
        boxShadow: hover ? 'var(--shadow-md)' : 'var(--shadow-xs)',
        transition: 'box-shadow var(--dur-fast)',
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

function MandatePipeline({ mandate, onBack, onOpenTalent }) {
  const [cards, setCards] = React.useState(null); // null = loading
  const [error, setError] = React.useState(false);
  const [adding, setAdding] = React.useState(false);
  const [pool, setPool] = React.useState([]);
  const [matching, setMatching] = React.useState(false);
  const [matchQuery, setMatchQuery] = React.useState('');
  const [matches, setMatches] = React.useState(null); // null = not run yet
  const [matchLoading, setMatchLoading] = React.useState(false);
  const [agg, setAgg] = React.useState(null); // null = not run yet
  const [aggLoading, setAggLoading] = React.useState(false);

  const load = React.useCallback(() => {
    setError(false);
    window.RecruitApi.mandateCandidacies(mandate.id).then(setCards).catch(() => setError(true));
  }, [mandate.id]);
  React.useEffect(() => { load(); }, [load]);

  const openAdd = async () => {
    setAdding(true);
    try { setPool(await window.RecruitApi.listTalents()); } catch { setPool([]); }
  };
  const inPipeline = new Set((cards || []).map((c) => c.talentId));
  const addable = pool.filter((t) => !inPipeline.has(t.id) && t.id !== 'me');

  const addCandidate = async (talentId) => {
    try {
      await window.RecruitApi.addCandidacy(mandate.id, { talentId });
      setAdding(false);
      load();
    } catch { /* ignore (e.g. duplicate) */ }
  };
  const openMatch = () => { setMatching(true); setMatches(null); setAgg(null); setMatchQuery(''); };
  const runAgg = async () => {
    setAggLoading(true);
    try {
      setAgg(await window.RecruitApi.aggCheck(matchQuery));
    } catch {
      setAgg({ findings: [], riskLevel: 'none', hasGenderMarker: false, summary: 'Prüfung fehlgeschlagen.' });
    } finally {
      setAggLoading(false);
    }
  };
  const runMatch = async () => {
    setMatchLoading(true);
    try {
      setMatches(await window.RecruitApi.matchMandate(mandate.id, { jobText: matchQuery, limit: 12 }));
    } catch {
      setMatches([]);
    } finally {
      setMatchLoading(false);
    }
  };
  const addFromMatch = async (talentId) => {
    try {
      await window.RecruitApi.addCandidacy(mandate.id, { talentId });
      setMatches((ms) => (ms || []).map((m) => (m.talentId === talentId ? { ...m, inPipeline: true } : m)));
      load();
    } catch { /* ignore (e.g. duplicate) */ }
  };
  const moveCard = async (card, stage) => {
    setCards((cs) => cs.map((c) => (c.id === card.id ? { ...c, stage } : c)));
    try { await window.RecruitApi.updateCandidacy(card.id, { stage }); } catch { load(); }
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
          <MP.Button variant="outline" size="sm" iconLeft={<MP.Icon name="zap" size={15} />} onClick={openMatch}>Find matches</MP.Button>
          <MP.Button variant="primary" size="sm" iconLeft={<MP.Icon name="plus" size={15} />} onClick={openAdd}>Add candidate</MP.Button>
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
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${MP_STAGES.length}, minmax(200px, 1fr))`, gap: '14px', alignItems: 'start', flex: 1, minHeight: 0, overflowX: 'auto' }}>
          {MP_STAGES.map((s) => {
            const list = cards.filter((c) => c.stage === s.id);
            return (
              <div key={s.id} style={{ display: 'flex', flexDirection: 'column', gap: '11px', minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 2px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: s.color }} />
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>{s.label}</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', fontWeight: 600, color: 'var(--text-soft)', background: 'var(--surface-sunk)', borderRadius: 'var(--radius-pill)', padding: '1px 8px', marginLeft: 'auto' }}>{list.length}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {list.map((c) => <MandateCard key={c.id} card={c} onOpenTalent={onOpenTalent} onMove={moveCard} onRemove={removeCard} />)}
                  {list.length === 0 && (
                    <div style={{ border: '1.5px dashed var(--border-strong)', borderRadius: 'var(--radius-md)', padding: '14px', textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-soft)' }}>empty</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {adding && (
        <>
          <div onClick={() => setAdding(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(8,11,18,0.45)', backdropFilter: 'blur(2px)', zIndex: 60 }} />
          <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 61, width: 'min(520px, 92vw)', maxHeight: '80vh', overflowY: 'auto', background: 'var(--surface-card)', borderRadius: 'var(--radius-xl)', boxShadow: 'var(--shadow-lg)', padding: '22px' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '17px', fontWeight: 700, color: 'var(--text-heading)', marginBottom: '4px' }}>Add a candidate</div>
            <div style={{ fontSize: '12.5px', color: 'var(--text-soft)', marginBottom: '14px' }}>Pick a talent from the pool to add to this mandate's pipeline.</div>
            {addable.length === 0 && (
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-soft)', padding: '8px 0' }}>Everyone in the pool is already in this pipeline.</div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {addable.map((t) => (
                <button key={t.id} onClick={() => addCandidate(t.id)} style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', textAlign: 'left', padding: '9px 11px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-strong)', background: 'var(--surface-card)', cursor: 'pointer' }}>
                  <MP.Avatar name={t.name} size="xs" />
                  <span style={{ fontFamily: 'var(--font-display)', fontSize: '13px', fontWeight: 600, color: 'var(--text-heading)' }}>{t.name}</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-soft)', marginLeft: 'auto' }}>{t.role}</span>
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
              <MP.Button variant="ghost" onClick={() => setAdding(false)}>Close</MP.Button>
            </div>
          </div>
        </>
      )}

      {matching && (
        <>
          <div onClick={() => setMatching(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(8,11,18,0.45)', backdropFilter: 'blur(2px)', zIndex: 60 }} />
          <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 61, width: 'min(600px, 94vw)', maxHeight: '84vh', display: 'flex', flexDirection: 'column', background: 'var(--surface-card)', borderRadius: 'var(--radius-xl)', boxShadow: 'var(--shadow-lg)', padding: '22px' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '17px', fontWeight: 700, color: 'var(--text-heading)', marginBottom: '4px' }}>Find matches</div>
            <div style={{ fontSize: '12.5px', color: 'var(--text-soft)', marginBottom: '14px' }}>Rank the talent pool for <strong>{mandate.role}</strong>. Leave the ad empty to match on the mandate itself, or paste a job ad to sharpen the ranking.</div>
            <MP.Textarea
              rows={4}
              placeholder={`Optional: paste the job ad for “${mandate.role}” to rank against its requirements…`}
              value={matchQuery}
              onChange={(e) => setMatchQuery(e.target.value)}
              aria-label="Job ad text"
            />
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '12px' }}>
              <MP.Button variant="outline" size="sm" iconLeft={<MP.Icon name="alert" size={15} />} disabled={aggLoading} onClick={runAgg}>
                {aggLoading ? 'Prüfe…' : 'AGG-Check'}
              </MP.Button>
              <MP.Button variant="primary" size="sm" iconLeft={<MP.Icon name="zap" size={15} />} disabled={matchLoading} onClick={runMatch}>
                {matchLoading ? 'Ranking…' : matches === null ? 'Rank pool' : 'Re-rank'}
              </MP.Button>
            </div>

            {agg !== null && (() => {
              const tone = agg.riskLevel === 'high' ? 'var(--danger)' : agg.riskLevel === 'medium' ? 'var(--status-offer-strong, #D97757)' : agg.riskLevel === 'low' ? 'var(--text-muted)' : 'var(--status-hired-strong)';
              return (
                <div style={{ marginTop: '12px', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '12px 14px', background: 'var(--surface-sunk)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: agg.findings.length ? '10px' : 0 }}>
                    <MP.Icon name="alert" size={14} style={{ color: tone }} />
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: tone }}>AGG {agg.riskLevel}</span>
                    <span style={{ fontSize: '12px', color: 'var(--text-soft)' }}>{agg.summary}</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {agg.findings.map((f, i) => (
                      <div key={i} style={{ display: 'flex', gap: '9px', alignItems: 'flex-start' }}>
                        <span style={{ flexShrink: 0, marginTop: '1px', fontFamily: 'var(--font-mono)', fontSize: '9.5px', fontWeight: 600, letterSpacing: '0.03em', textTransform: 'uppercase', color: f.severity === 'high' ? 'var(--danger)' : 'var(--text-soft)', background: 'var(--surface-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-pill)', padding: '2px 7px' }}>{f.categoryLabel}</span>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: '12.5px', color: 'var(--text-heading)' }}><strong style={{ color: 'var(--danger)' }}>„{f.term}"</strong> — {f.issue}</div>
                          <div style={{ fontSize: '11.5px', color: 'var(--text-soft)', marginTop: '1px' }}>{f.suggestion}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

            <div style={{ marginTop: '14px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {matches !== null && matches.length === 0 && (
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-soft)', padding: '8px 0' }}>No candidates in the pool yet.</div>
              )}
              {(matches || []).map((mm) => (
                <div key={mm.talentId} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 11px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'var(--surface-card)' }}>
                  <MP.Avatar name={mm.name} size="xs" />
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <button
                      onClick={() => onOpenTalent(mm.talentId)}
                      style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left', fontFamily: 'var(--font-display)', fontSize: '13px', fontWeight: 700, color: 'var(--text-heading)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }}
                    >
                      {mm.name}
                    </button>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '4px' }}>
                      {mm.role && <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10.5px', color: 'var(--text-soft)' }}>{mm.role}</span>}
                      {(mm.matched || []).slice(0, 4).map((sk) => (
                        <span key={sk} style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--accent-strong)', background: 'var(--surface-sunk)', borderRadius: 'var(--radius-pill)', padding: '1px 7px' }}>{sk}</span>
                      ))}
                    </div>
                  </div>
                  <MP.MatchIndicator value={mm.score} variant="chip" />
                  {mm.inPipeline ? (
                    <span style={{ flexShrink: 0, fontFamily: 'var(--font-mono)', fontSize: '10.5px', color: 'var(--text-soft)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <MP.Icon name="check" size={12} /> In pipeline
                    </span>
                  ) : (
                    <MP.Button variant="outline" size="sm" onClick={() => addFromMatch(mm.talentId)}>Add</MP.Button>
                  )}
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
              <MP.Button variant="ghost" onClick={() => setMatching(false)}>Close</MP.Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

window.MandatePipeline = MandatePipeline;
