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

function Matching({ talents }) {
  const [mode, setMode] = React.useState('auto');
  const [candId, setCandId] = React.useState((talents.find((t) => t.me) || talents[0]).id);
  const [country, setCountry] = React.useState('ALL');
  const [source, setSource] = React.useState('All');
  const [query, setQuery] = React.useState('');

  // Live postings — loaded once; the search box filters client-side so typing
  // stays instant (the boards are already merged server-side).
  const [jobs, setJobs] = React.useState(null); // null = loading
  const [sample, setSample] = React.useState(false);
  const [error, setError] = React.useState(false);
  const load = React.useCallback(() => {
    setJobs(null);
    setError(false);
    window.RecruitApi.searchJobs()
      .then((r) => {
        setJobs(r.jobs);
        setSample(r.sample);
      })
      .catch(() => setError(true));
  }, []);
  React.useEffect(() => {
    load();
  }, [load]);

  const cand = talents.find((t) => t.id === candId) || talents[0];
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
      {sample && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12.5px', color: 'var(--text-muted)', background: 'var(--surface-sunk)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '8px 12px', marginBottom: '16px' }}>
          <MT.Icon name="info" size={14} style={{ flexShrink: 0 }} />
          <span>Sample postings — no live job source is configured. Enable Arbeitnow, Adzuna or Bundesagentur via the server config to search real openings.</span>
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
            <MT.PositionCard
              key={job.id}
              title={job.title} company={job.company} location={job.location} country={job.country}
              source={job.source} pensum={job.pensum} salary={job.salary} posted={job.posted}
              match={mtScore(cand, job).pct}
              skills={mtSkills(cand, job)}
              applyLabel={job.url ? 'View posting' : undefined}
              onApply={open}
              onView={open}
            />
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
