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
  const [explains, setExplains] = React.useState({}); // talentId -> { loading, open, data }
  const [interview, setInterview] = React.useState(null); // { name, loading, data } | null
  const [prep, setPrep] = React.useState(null); // { name, loading, data } | null

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
  const toggleExplain = async (talentId) => {
    const cur = explains[talentId];
    if (cur && cur.data) {
      setExplains((e) => ({ ...e, [talentId]: { ...cur, open: !cur.open } }));
      return;
    }
    setExplains((e) => ({ ...e, [talentId]: { loading: true, open: true } }));
    try {
      const data = await window.RecruitApi.explainMatch(mandate.id, talentId);
      setExplains((e) => ({ ...e, [talentId]: { loading: false, open: true, data } }));
    } catch {
      setExplains((e) => ({
        ...e,
        [talentId]: { loading: false, open: true, data: { summary: 'Konnte keine Begründung laden.', reasons: [] } },
      }));
    }
  };
  const openInterview = async (talentId, name) => {
    setInterview({ name, loading: true, data: null });
    try {
      const data = await window.RecruitApi.interviewKit(mandate.id, talentId);
      setInterview({ name, loading: false, data });
    } catch {
      setInterview({ name, loading: false, data: null, error: true });
    }
  };
  const openPrep = async (talentId, name) => {
    setPrep({ name, loading: true, data: null });
    try {
      const data = await window.RecruitApi.candidatePrep(mandate.id, talentId);
      setPrep({ name, loading: false, data });
    } catch {
      setPrep({ name, loading: false, data: null, error: true });
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
              {(matches || []).map((mm) => {
                const exp = explains[mm.talentId];
                return (
                  <div key={mm.talentId} style={{ borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'var(--surface-card)', overflow: 'hidden' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 11px' }}>
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
                      <button onClick={() => toggleExplain(mm.talentId)} title="Warum passt dieser Kandidat?" style={{ flexShrink: 0, cursor: 'pointer', background: 'none', border: '1px solid var(--border-strong)', borderRadius: 'var(--radius-pill)', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: '10.5px', padding: '4px 9px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <MP.Icon name="zap" size={12} /> {exp && exp.open ? 'Warum ▲' : 'Warum ▾'}
                      </button>
                      <button onClick={() => openInterview(mm.talentId, mm.name)} title="Interview-Kit erstellen" style={{ flexShrink: 0, cursor: 'pointer', background: 'none', border: '1px solid var(--border-strong)', borderRadius: 'var(--radius-pill)', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: '10.5px', padding: '4px 9px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <MP.Icon name="message" size={12} /> Interview
                      </button>
                      <button onClick={() => openPrep(mm.talentId, mm.name)} title="Bewerber-Vorbereitung erstellen" style={{ flexShrink: 0, cursor: 'pointer', background: 'none', border: '1px solid var(--border-strong)', borderRadius: 'var(--radius-pill)', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: '10.5px', padding: '4px 9px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <MP.Icon name="award" size={12} /> Prep
                      </button>
                      <MP.MatchIndicator value={mm.score} variant="chip" />
                      {mm.inPipeline ? (
                        <span style={{ flexShrink: 0, fontFamily: 'var(--font-mono)', fontSize: '10.5px', color: 'var(--text-soft)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <MP.Icon name="check" size={12} /> In pipeline
                        </span>
                      ) : (
                        <MP.Button variant="outline" size="sm" onClick={() => addFromMatch(mm.talentId)}>Add</MP.Button>
                      )}
                    </div>
                    {exp && exp.open && (
                      <div style={{ borderTop: '1px solid var(--border)', background: 'var(--surface-sunk)', padding: '10px 12px' }}>
                        {exp.loading ? (
                          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-soft)' }}>Begründung wird erstellt…</div>
                        ) : (
                          <>
                            {exp.data.summary && <div style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--text-heading)', marginBottom: exp.data.reasons.length ? '6px' : 0 }}>{exp.data.summary}</div>}
                            <ul style={{ margin: 0, paddingLeft: '16px', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                              {exp.data.reasons.map((r, i) => (
                                <li key={i} style={{ fontSize: '12px', color: 'var(--text-soft)', lineHeight: 1.45 }}>{r}</li>
                              ))}
                            </ul>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
              <MP.Button variant="ghost" onClick={() => setMatching(false)}>Close</MP.Button>
            </div>
          </div>
        </>
      )}

      {interview && (
        <>
          <div onClick={() => setInterview(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(8,11,18,0.5)', backdropFilter: 'blur(2px)', zIndex: 70 }} />
          <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 71, width: 'min(640px, 94vw)', maxHeight: '86vh', display: 'flex', flexDirection: 'column', background: 'var(--surface-card)', borderRadius: 'var(--radius-xl)', boxShadow: 'var(--shadow-lg)', padding: '22px' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '4px' }}>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: '17px', fontWeight: 700, color: 'var(--text-heading)' }}>Interview-Kit</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-soft)' }}>{interview.name} · {mandate.role}</span>
            </div>

            {interview.loading ? (
              <div style={{ padding: '28px', textAlign: 'center', color: 'var(--text-soft)', fontSize: '13px' }}>Leitfaden wird erstellt…</div>
            ) : !interview.data ? (
              <div style={{ padding: '22px', textAlign: 'center', color: 'var(--text-soft)', fontSize: '13px' }}>Konnte das Interview-Kit nicht laden.</div>
            ) : (
              <div style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '10px' }}>
                {interview.data.focus && (
                  <div style={{ fontSize: '12.5px', color: 'var(--text-heading)', background: 'var(--surface-sunk)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '10px 12px' }}>
                    <strong>Fokus:</strong> {interview.data.focus}
                  </div>
                )}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {interview.data.questions.map((q, i) => (
                    <div key={i} style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '11px 12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '4px' }}>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9.5px', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--accent-strong)', background: 'var(--surface-sunk)', borderRadius: 'var(--radius-pill)', padding: '2px 8px' }}>{q.category}</span>
                      </div>
                      <div style={{ fontSize: '13px', color: 'var(--text-heading)', lineHeight: 1.45 }}>{q.question}</div>
                      {q.lookFor && <div style={{ fontSize: '11.5px', color: 'var(--text-soft)', marginTop: '3px' }}>→ Achte auf: {q.lookFor}</div>}
                    </div>
                  ))}
                </div>
                {interview.data.scorecard.length > 0 && (
                  <div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10.5px', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '7px' }}>Scorecard</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {interview.data.scorecard.map((s, i) => (
                        <span key={i} style={{ fontSize: '11.5px', color: 'var(--text-soft)', background: 'var(--surface-sunk)', border: '1px solid var(--border)', borderRadius: 'var(--radius-pill)', padding: '3px 10px' }}>{s}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
              <MP.Button variant="ghost" onClick={() => setInterview(null)}>Close</MP.Button>
            </div>
          </div>
        </>
      )}

      {prep && (
        <>
          <div onClick={() => setPrep(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(8,11,18,0.5)', backdropFilter: 'blur(2px)', zIndex: 70 }} />
          <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 71, width: 'min(680px, 95vw)', maxHeight: '88vh', display: 'flex', flexDirection: 'column', background: 'var(--surface-card)', borderRadius: 'var(--radius-xl)', boxShadow: 'var(--shadow-lg)', padding: '22px' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '2px' }}>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: '17px', fontWeight: 700, color: 'var(--text-heading)' }}>Bewerber-Vorbereitung</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-soft)' }}>{prep.name} · {mandate.role}</span>
            </div>
            <div style={{ fontSize: '11.5px', color: 'var(--text-soft)', marginBottom: '8px' }}>Zum Teilen mit dem Kandidaten. Firmenangaben sind Einschätzungen — vor dem Gespräch prüfen.</div>

            {prep.loading ? (
              <div style={{ padding: '28px', textAlign: 'center', color: 'var(--text-soft)', fontSize: '13px' }}>Vorbereitung wird erstellt…</div>
            ) : !prep.data ? (
              <div style={{ padding: '22px', textAlign: 'center', color: 'var(--text-soft)', fontSize: '13px' }}>Konnte die Vorbereitung nicht laden.</div>
            ) : (
              <div style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '6px' }}>
                {/* Company style with provenance */}
                <div style={{ background: 'var(--surface-sunk)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '12px 14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10.5px', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--text-heading)' }}>Interview-Stil: {prep.data.companyLabel}</span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9.5px', color: 'var(--text-soft)', border: '1px solid var(--border)', borderRadius: 'var(--radius-pill)', padding: '1px 7px' }}>{prep.data.companySource} · {prep.data.companyConfidence}</span>
                  </div>
                  <ul style={{ margin: 0, paddingLeft: '16px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    {prep.data.formats.map((f, i) => <li key={i} style={{ fontSize: '12px', color: 'var(--text-soft)' }}>{f}</li>)}
                  </ul>
                  <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '5px' }}>{prep.data.rounds}</div>
                </div>

                {prep.data.obligations.length > 0 && (
                  <PrepSection title="Auflagen (aus der Anzeige)" items={prep.data.obligations} tone="var(--danger)" MP={MP} />
                )}
                {prep.data.processHints.length > 0 && (
                  <PrepSection title="Prozess-Hinweise" items={prep.data.processHints} MP={MP} />
                )}

                {prep.data.requirementChecks.length > 0 && (
                  <div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10.5px', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '7px' }}>Anforderungen abgleichen</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                      {prep.data.requirementChecks.map((c, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '12.5px' }}>
                          <MP.Icon name={c.covered ? 'check' : 'alert'} size={13} style={{ marginTop: '1px', color: c.covered ? 'var(--status-hired-strong)' : 'var(--status-offer-strong, #D97757)' }} />
                          <span style={{ color: 'var(--text-body)' }}>{c.text}{!c.covered && <span style={{ color: 'var(--text-soft)' }}> — im Profil belegen</span>}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {prep.data.strengths.length > 0 && (
                  <div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10.5px', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '7px' }}>Deine Stärken für diese Stelle</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {prep.data.strengths.map((s, i) => <span key={i} style={{ fontSize: '11.5px', color: 'var(--accent-strong)', background: 'var(--surface-sunk)', border: '1px solid var(--border)', borderRadius: 'var(--radius-pill)', padding: '3px 10px' }}>{s}</span>)}
                    </div>
                  </div>
                )}

                <div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10.5px', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '7px' }}>Womit du rechnen solltest</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {prep.data.likelyQuestions.map((q, i) => (
                      <div key={i} style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '10px 12px' }}>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9.5px', fontWeight: 600, textTransform: 'uppercase', color: 'var(--accent-strong)' }}>{q.category}</span>
                        <div style={{ fontSize: '12.5px', color: 'var(--text-heading)', marginTop: '2px' }}>{q.question}</div>
                        {q.why && <div style={{ fontSize: '11px', color: 'var(--text-soft)', marginTop: '2px' }}>{q.why}</div>}
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10.5px', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '7px' }}>Antwort-Gerüste (STAR)</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {prep.data.starAnswers.map((s, i) => (
                      <div key={i} style={{ background: 'var(--surface-sunk)', borderRadius: 'var(--radius-md)', padding: '10px 12px' }}>
                        <div style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--text-heading)' }}>{s.prompt}</div>
                        <div style={{ fontSize: '12px', color: 'var(--text-soft)', marginTop: '3px', lineHeight: 1.5 }}>{s.scaffold}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <PrepSection title="Fragen, die du stellen solltest" items={prep.data.candidateQuestions} MP={MP} />
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
              <MP.Button variant="ghost" onClick={() => setPrep(null)}>Close</MP.Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function PrepSection({ title, items, tone, MP }) {
  return (
    <div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10.5px', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: tone || 'var(--text-muted)', marginBottom: '7px' }}>{title}</div>
      <ul style={{ margin: 0, paddingLeft: '16px', display: 'flex', flexDirection: 'column', gap: '3px' }}>
        {items.map((it, i) => <li key={i} style={{ fontSize: '12.5px', color: 'var(--text-body)', lineHeight: 1.45 }}>{it}</li>)}
      </ul>
    </div>
  );
}

window.MandatePipeline = MandatePipeline;
