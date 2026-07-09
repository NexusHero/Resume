/* Matching — the dual search inside the workspace: pick a candidate, see live
   roles ranked by skill-overlap (auto), or search/filter manually. Postings come
   from the real /api/v1/jobs two-tier search (offline: the server's sample
   source); scoring is per selected candidate, client-side. Reuses the
   design-system PositionCard. */
const MT = window.MyJobDesignSystem_f3658e;

function mtScore(cand, job) {
  const have = (cand.skills || []).map((s) => s.toLowerCase());
  const met = job.req.filter((r) => have.includes(r.toLowerCase())).length;
  const total = job.req.length;
  return { pct: total ? Math.round((met / total) * 100) : 0, met, total };
}
function mtSkills(cand, job) {
  const have = (cand.skills || []).map((s) => s.toLowerCase());
  return job.req.map((name) => ({ name, met: have.includes(name.toLowerCase()) }));
}

function Matching({ talents, mandates = [], onCreateMandate, onApply }) {
  const [mode, setMode] = React.useState('auto');
  const [candId, setCandId] = React.useState((talents.find((t) => t.me) || talents[0]).id);
  const [country, setCountry] = React.useState('ALL');
  const [source, setSource] = React.useState('All');
  const [query, setQuery] = React.useState('');
  // Per-job apply state: 'busy' | 'done' | 'error' (absent = idle).
  const [applyState, setApplyState] = React.useState({});
  // Board-independent "apply to a role": company + role typed directly or
  // prefilled from one of the recruiter's own mandates. This makes applying a
  // candidate possible even when no live posting is loaded (offline / board down).
  const [manual, setManual] = React.useState({ company: '', role: '' });

  // Live postings — loaded once; the search box filters client-side so typing
  // stays instant (the boards are already merged server-side).
  const [jobs, setJobs] = React.useState(null); // null = loading
  const [liveDown, setLiveDown] = React.useState(false);
  const [error, setError] = React.useState(false);
  const load = React.useCallback(() => {
    setJobs(null);
    setError(false);
    window.RecruitApi.searchJobs()
      .then((r) => {
        setJobs(r.jobs);
        setLiveDown(r.liveDown);
      })
      .catch(() => setError(true));
  }, []);
  React.useEffect(() => {
    load();
  }, [load]);

  const cand = talents.find((t) => t.id === candId) || talents[0];
  // Apply the selected candidate to a posting. Keyed by candidate+job so the
  // "Applied" state is specific to who you applied, not just which role.
  const apply = (job) => {
    if (!onApply) return;
    const key = `${cand.id}:${job.id}`;
    setApplyState((s) => ({ ...s, [key]: 'busy' }));
    Promise.resolve(onApply(job, cand))
      .then(() => setApplyState((s) => ({ ...s, [key]: 'done' })))
      .catch(() => setApplyState((s) => ({ ...s, [key]: 'error' })));
  };
  // Apply the selected candidate to a typed/mandate-derived role — no posting needed.
  const applyManual = () => {
    if (!onApply) return;
    const job = { id: 'manual', company: manual.company.trim(), title: manual.role.trim(), url: '' };
    const key = `${cand.id}:manual`;
    setApplyState((s) => ({ ...s, [key]: 'busy' }));
    Promise.resolve(onApply(job, cand))
      .then(() => setApplyState((s) => ({ ...s, [key]: 'done', 'manual-dirty': false })))
      .catch(() => setApplyState((s) => ({ ...s, [key]: 'error' })));
  };
  if (error) return <window.ErrorState onRetry={load} />;
  if (jobs === null) return <window.LoadingState />;

  const sources = ['All', ...new Set(jobs.map((j) => j.source).filter(Boolean))];
  const autoJobs = [...jobs].map((j) => ({ j, m: mtScore(cand, j).pct })).sort((a, b) => b.m - a.m);
  const q = query.trim().toLowerCase();
  const manualJobs = jobs.filter(
    (j) =>
      (country === 'ALL' || j.country === country) &&
      (source === 'All' || j.source === source) &&
      (!q || `${j.title} ${j.company} ${j.location}`.toLowerCase().includes(q)),
  );

  const chip = (active, label, on) => (
    <button key={label} onClick={on} style={{ appearance: 'none', cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: '13px', fontWeight: active ? 600 : 500, padding: '6px 13px', borderRadius: 'var(--radius-pill)', border: `1px solid ${active ? 'var(--accent-border)' : 'var(--border-strong)'}`, background: active ? 'var(--accent-soft)' : 'var(--surface-card)', color: active ? 'var(--accent-strong)' : 'var(--text-muted)' }}>{label}</button>
  );

  return (
    <div style={{ maxWidth: '780px' }}>
      {liveDown && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12.5px', color: 'var(--text-muted)', background: 'var(--surface-sunk)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '8px 12px', marginBottom: '16px' }}>
          <MT.Icon name="info" size={14} style={{ flexShrink: 0 }} />
          <span>Live job sources are unreachable right now, so no postings could be loaded. Check the server's network/API keys; the search recovers automatically.</span>
        </div>
      )}
      {/* mode */}
      <div style={{ display: 'inline-flex', background: 'var(--surface-sunk)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '3px', gap: '3px', marginBottom: '20px' }}>
        {[['auto', 'Auto · Skill-Match'], ['manual', 'Manual']].map(([id, lbl]) => (
          <button key={id} onClick={() => setMode(id)} style={{ appearance: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: '13px', fontWeight: mode === id ? 600 : 500, padding: '8px 16px', borderRadius: 'var(--radius-sm)', background: mode === id ? 'var(--surface-card)' : 'transparent', color: mode === id ? 'var(--text-heading)' : 'var(--text-soft)', boxShadow: mode === id ? 'var(--shadow-sm)' : 'none' }}>{lbl}</button>
        ))}
      </div>

      {/* candidate switcher */}
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-soft)', marginBottom: '9px' }}>Candidate</div>
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '18px' }}>
        {talents.map((t) => {
          const on = t.id === candId;
          return (
            <button key={t.id} onClick={() => setCandId(t.id)} style={{ appearance: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '4px 13px 4px 4px', borderRadius: 'var(--radius-pill)', border: `1px solid ${on ? 'var(--accent-border)' : 'var(--border-strong)'}`, background: on ? 'var(--accent-soft)' : 'var(--surface-card)', color: on ? 'var(--accent-strong)' : 'var(--text-muted)', fontSize: '13px', fontWeight: on ? 600 : 500 }}>
              <MT.Avatar name={t.name} src={t.src} size="xs" />{t.name}{t.me ? ' · Me' : ''}
            </button>
          );
        })}
      </div>

      {mode === 'manual' && onApply && (() => {
        const key = `${cand.id}:manual`;
        const st = applyState[key];
        const ready = manual.company.trim() && manual.role.trim();
        const inp = { flex: 1, minWidth: 0, border: '1px solid var(--border-strong)', outline: 'none', background: 'var(--surface-card)', borderRadius: 'var(--radius-md)', fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--text-heading)', padding: '9px 11px' };
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '18px', padding: '14px', border: '1px solid var(--accent-border)', background: 'var(--accent-soft)', borderRadius: 'var(--radius-lg)' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--accent-strong)' }}>Apply {cand.name.split(' ')[0]} to a role</div>
            <div style={{ fontSize: '12.5px', color: 'var(--text-muted)', marginTop: '-4px' }}>Type a role or pick one of your mandates — no live posting needed.</div>
            {mandates.length > 0 && (
              <select
                aria-label="Prefill from a mandate"
                value=""
                onChange={(e) => { const m = mandates.find((x) => x.id === e.target.value); if (m) setManual({ company: m.client || '', role: m.role || '' }); }}
                style={{ ...inp, cursor: 'pointer' }}
              >
                <option value="">From one of your mandates…</option>
                {mandates.map((m) => <option key={m.id} value={m.id}>{m.role} · {m.client}</option>)}
              </select>
            )}
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <input value={manual.company} onChange={(e) => setManual((s) => ({ ...s, company: e.target.value }))} placeholder="Company" aria-label="Company" style={inp} />
              <input value={manual.role} onChange={(e) => setManual((s) => ({ ...s, role: e.target.value }))} placeholder="Role" aria-label="Role" style={inp} />
              <button
                onClick={applyManual}
                disabled={!ready || st === 'busy'}
                style={{ appearance: 'none', cursor: !ready || st === 'busy' ? 'default' : 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'var(--accent)', border: 'none', borderRadius: 'var(--radius-md)', color: 'var(--accent-contrast)', fontFamily: 'var(--font-body)', fontSize: '13px', fontWeight: 600, padding: '9px 15px', opacity: !ready ? 0.5 : 1 }}
              >
                <MT.Icon name={st === 'done' ? 'check' : 'plus'} size={14} />
                {st === 'busy' ? 'Applying…' : st === 'done' ? 'Applied' : st === 'error' ? 'Retry' : 'Apply'}
              </button>
            </div>
          </div>
        );
      })()}

      {mode === 'manual' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '18px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--surface-card)', border: '1px solid var(--border-strong)', borderRadius: 'var(--radius-md)', padding: '0 12px' }}>
            <MT.Icon name="search" size={15} style={{ color: 'var(--text-soft)' }} />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search a role: title, company, location …" style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--text-heading)', padding: '10px 0' }} />
          </label>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {[['ALL', 'All countries'], ['CH', '🇨🇭 Switzerland'], ['DE', '🇩🇪 Germany']].map(([k, l]) => chip(country === k, l, () => setCountry(k)))}
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {sources.map((s) => chip(source === s, s, () => setSource(s)))}
          </div>
        </div>
      )}

      {mode === 'auto' && (
        <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '0 0 16px' }}>Roles matched to <b style={{ color: 'var(--text-heading)' }}>{cand.name}’s skill profile</b> — best fit first.</p>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {(mode === 'auto' ? autoJobs.map((x) => x.j) : manualJobs).map((job) => {
          const open = job.url ? () => window.open(job.url, '_blank', 'noopener') : undefined;
          return (
            <div key={job.id}>
              <MT.PositionCard
                title={job.title} company={job.company} location={job.location} country={job.country}
                source={job.source} pensum={job.pensum} salary={job.salary} posted={job.posted}
                match={mtScore(cand, job).pct}
                skills={mtSkills(cand, job)}
                applyLabel={job.url ? 'View posting' : undefined}
                onApply={open}
                onView={open}
              />
              {(onApply || onCreateMandate) && (
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '6px' }}>
                  {onApply && (() => {
                    const aState = applyState[`${cand.id}:${job.id}`];
                    const label =
                      aState === 'busy' ? 'Applying…'
                      : aState === 'done' ? `Applied · ${cand.name.split(' ')[0]}`
                      : aState === 'error' ? 'Retry apply'
                      : `Apply ${cand.name.split(' ')[0]}`;
                    const done = aState === 'done';
                    return (
                      <button
                        onClick={() => apply(job)}
                        disabled={aState === 'busy' || done}
                        title={`Apply ${cand.name} to this role — records an application with the company’s details`}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: aState === 'busy' || done ? 'default' : 'pointer', appearance: 'none', background: done ? 'var(--surface-sunk)' : 'var(--accent-soft)', border: `1px solid ${done ? 'var(--border-strong)' : 'var(--accent-border)'}`, borderRadius: 'var(--radius-pill)', color: done ? 'var(--text-soft)' : 'var(--accent-strong)', fontFamily: 'var(--font-mono)', fontSize: '11px', fontWeight: 600, padding: '4px 11px' }}
                      >
                        <MT.Icon name={done ? 'check' : 'plus'} size={12} /> {label}
                      </button>
                    );
                  })()}
                  {onCreateMandate && (
                    <button
                      onClick={() => onCreateMandate(job)}
                      title="Open a client mandate drafted from this posting"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: 'pointer', appearance: 'none', background: 'none', border: '1px solid var(--border-strong)', borderRadius: 'var(--radius-pill)', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: '11px', padding: '4px 11px' }}
                    >
                      <MT.Icon name="briefcase" size={12} /> Create mandate
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
        {(mode === 'auto' ? jobs.length === 0 : manualJobs.length === 0) && (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-soft)', border: '1px dashed var(--border-strong)', borderRadius: 'var(--radius-lg)' }}>No roles found.</div>
        )}
      </div>
    </div>
  );
}

Object.assign(window, { Matching });
