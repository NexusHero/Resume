/* Matching — the dual search inside the workspace: pick a candidate, see roles
   ranked by skill-overlap (auto), or search/filter roles manually — then apply
   the candidate on their behalf. Reuses the design-system PositionCard. */
const MT = window.MyJobDesignSystem_f3658e;

/* DACH roles with required skills — Swiss-heavy (country + source are modelled). */
const MT_JOBS = [
  { id: 'j1', title: 'Senior C++ Engineer', company: 'Helvetia Digital AG', location: 'Zurich', country: 'CH', source: 'jobs.ch', pensum: '80–100%', salary: 'CHF 120–140k', posted: '2 days ago', req: ['C++20', 'Qt / QML', 'gRPC', 'Microservices'] },
  { id: 'j2', title: 'Software Engineer Embedded', company: 'Sensirion AG', location: 'Stäfa', country: 'CH', source: 'jobs.ch', pensum: '100%', salary: 'CHF 115–130k', posted: 'yesterday', req: ['C++20', 'Microservices', 'REST'] },
  { id: 'j3', title: '.NET Backend Engineer', company: 'Swisscom', location: 'Bern', country: 'CH', source: 'job-room.ch', pensum: '80–100%', salary: 'CHF 110–128k', posted: '4 days ago', req: ['C# / .NET', 'gRPC', 'Microservices'] },
  { id: 'j4', title: 'Software Engineer C++', company: 'TRUMPF', location: 'Ditzingen', country: 'DE', source: 'LinkedIn', pensum: 'Full-time', salary: '€ 85–98k', posted: '1 week ago', req: ['C++20', 'OPC-UA', 'Docker'] },
  { id: 'j5', title: 'DevOps Engineer', company: 'Migros Digital', location: 'Zurich', country: 'CH', source: 'jobs.ch', pensum: '80–100%', salary: 'CHF 105–120k', posted: '3 days ago', req: ['Terraform', 'AWS', 'CI/CD', 'Go'] },
  { id: 'j6', title: 'Product Designer', company: 'Aurora Systems', location: 'Munich', country: 'DE', source: 'LinkedIn', pensum: 'Full-time', salary: '€ 72–85k', posted: '5 days ago', req: ['Figma', 'Design Systems', 'Prototyping'] },
];
const MT_SOURCES = ['All', 'jobs.ch', 'job-room.ch', 'LinkedIn'];

function mtScore(cand, job) {
  const have = (cand.skills || []).map((s) => s.toLowerCase());
  const met = job.req.filter((r) => have.includes(r.toLowerCase())).length;
  return { pct: Math.round((met / job.req.length) * 100), met, total: job.req.length };
}
function mtSkills(cand, job) {
  const have = (cand.skills || []).map((s) => s.toLowerCase());
  return job.req.map((name) => ({ name, met: have.includes(name.toLowerCase()) }));
}

function Matching({ talents, onApplied }) {
  const [mode, setMode] = React.useState('auto');
  const [candId, setCandId] = React.useState((talents.find((t) => t.me) || talents[0]).id);
  const [country, setCountry] = React.useState('ALL');
  const [source, setSource] = React.useState('All');
  const [query, setQuery] = React.useState('');
  const [applied, setApplied] = React.useState({});
  const [toast, setToast] = React.useState(null);

  const cand = talents.find((t) => t.id === candId);
  const autoJobs = [...MT_JOBS].map((j) => ({ j, m: mtScore(cand, j).pct })).sort((a, b) => b.m - a.m);
  const q = query.trim().toLowerCase();
  const manualJobs = MT_JOBS.filter((j) =>
    (country === 'ALL' || j.country === country) &&
    (source === 'All' || j.source === source) &&
    (!q || `${j.title} ${j.company} ${j.location}`.toLowerCase().includes(q))
  );

  const apply = (cId, jId) => {
    setApplied((p) => ({ ...p, [`${cId}-${jId}`]: true }));
    const c = talents.find((t) => t.id === cId); const j = MT_JOBS.find((x) => x.id === jId);
    setToast(`Applied ${c.name.split(' ')[0]} to “${j.title}” — added to pipeline`);
    clearTimeout(window.__mtT); window.__mtT = setTimeout(() => setToast(null), 3600);
    if (onApplied) onApplied(cId, jId);
  };

  const chip = (active, label, on) => (
    <button onClick={on} style={{ appearance: 'none', cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: '13px', fontWeight: active ? 600 : 500, padding: '6px 13px', borderRadius: 'var(--radius-pill)', border: `1px solid ${active ? 'var(--accent-border)' : 'var(--border-strong)'}`, background: active ? 'var(--accent-soft)' : 'var(--surface-card)', color: active ? 'var(--accent-strong)' : 'var(--text-muted)' }}>{label}</button>
  );

  return (
    <div style={{ maxWidth: '780px' }}>
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
            {MT_SOURCES.map((s) => chip(source === s, s, () => setSource(s)))}
          </div>
        </div>
      )}

      {mode === 'auto' && (
        <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '0 0 16px' }}>Roles matched to <b style={{ color: 'var(--text-heading)' }}>{cand.name}’s skill profile</b> — best fit first.</p>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {(mode === 'auto' ? autoJobs.map((x) => x.j) : manualJobs).map((job) => {
          const done = applied[`${cand.id}-${job.id}`];
          const first = cand.name.split(' ')[0];
          return (
            <MT.PositionCard
              key={job.id}
              title={job.title} company={job.company} location={job.location} country={job.country}
              source={job.source} pensum={job.pensum} salary={job.salary} posted={job.posted}
              match={mtScore(cand, job).pct}
              skills={mtSkills(cand, job)}
              status={done ? 'new' : undefined}
              applyLabel={done ? `✓ ${first} applied` : `Apply ${first}`}
              onApply={done ? undefined : () => apply(cand.id, job.id)}
              onView={() => {}}
            />
          );
        })}
        {mode === 'manual' && manualJobs.length === 0 && (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-soft)', border: '1px dashed var(--border-strong)', borderRadius: 'var(--radius-lg)' }}>No roles found.</div>
        )}
      </div>

      {toast && (
        <div style={{ position: 'fixed', left: '50%', bottom: '28px', transform: 'translateX(-50%)', background: 'var(--ink-900)', color: '#fff', fontFamily: 'var(--font-body)', fontSize: '13px', padding: '12px 20px', borderRadius: 'var(--radius-pill)', boxShadow: 'var(--shadow-md)', zIndex: 60 }}>{toast}</div>
      )}
    </div>
  );
}

Object.assign(window, { Matching });
