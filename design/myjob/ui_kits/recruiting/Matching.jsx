/* Matching — the dual search inside the workspace: pick a candidate, see live
   roles ranked by skill-overlap (auto), or search/filter manually. Postings come
   from the real /api/v1/jobs two-tier search (offline: the server's sample
   source); scoring is per selected candidate, client-side. Reuses the
   design-system PositionCard. */
const MT = window.MyJobDesignSystem_5611b7;

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

function Matching({ talents, mandates = [], onCreateMandate, onOpenPosting, onAdopted }) {
  const [mode, setMode] = React.useState('auto');
  const [candId, setCandId] = React.useState((talents.find((t) => t.me) || talents[0]).id);
  const [country, setCountry] = React.useState('ALL');
  const [source, setSource] = React.useState('All');
  const [query, setQuery] = React.useState('');
  // Per-job adopt state: 'busy' | 'done' | 'already' | 'error' (absent = idle).
  const [adoptState, setAdoptState] = React.useState({});
  // For 'already': the id of the existing posting, so "öffnen" can navigate.
  const [adoptSavedId, setAdoptSavedId] = React.useState({});

  // Live postings — loaded once; the search box filters client-side so typing
  // stays instant (the boards are already merged server-side).
  const [jobs, setJobs] = React.useState(null); // null = loading
  const [liveDown, setLiveDown] = React.useState(false);
  // Per-board breakdown [{ name, count, ok }] + accumulated total across all
  // API sources — shown as a source-count strip above the results.
  const [srcCounts, setSrcCounts] = React.useState([]);
  const [total, setTotal] = React.useState(0);
  const [error, setError] = React.useState(false);
  const load = React.useCallback(() => {
    setJobs(null);
    setError(false);
    window.RecruitApi.searchJobs()
      .then((r) => {
        setJobs(r.jobs);
        setLiveDown(r.liveDown);
        setSrcCounts(Array.isArray(r.sources) ? r.sources : []);
        setTotal(typeof r.total === 'number' ? r.total : r.jobs.length);
      })
      .catch(() => setError(true));
  }, []);
  React.useEffect(() => {
    load();
  }, [load]);

  const cand = talents.find((t) => t.id === candId) || talents[0];

  // "Stelle übernehmen" (AK-1.1) — save a live search result without AI. The
  // search row carries the source id (`job.id`) and the URL; the server dedups.
  const adopt = async (job) => {
    setAdoptState((s) => ({ ...s, [job.id]: 'busy' }));
    try {
      const result = await window.RecruitApi.adoptJobPosting({
        source: job.source || '',
        sourceId: job.id,
        url: job.url || undefined,
        company: job.company,
        title: job.title,
        location: job.location || '',
        country: job.country || '',
        requirements: Array.isArray(job.req) ? job.req : [],
      });
      if (result && result.alreadySaved) {
        setAdoptSavedId((r) => ({ ...r, [job.id]: result.jobPosting && result.jobPosting.id }));
        setAdoptState((s) => ({ ...s, [job.id]: 'already' }));
      } else {
        setAdoptState((s) => ({ ...s, [job.id]: 'done' }));
        if (onAdopted) onAdopted();
      }
    } catch (e) {
      setAdoptState((s) => ({ ...s, [job.id]: 'error' }));
    }
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
          <span>Live-Stellenquellen sind gerade nicht erreichbar, daher konnten keine Stellen geladen werden. Prüfe die Netzwerk-/API-Schlüssel des Servers; die Suche erholt sich automatisch.</span>
        </div>
      )}
      {/* Accumulated jobs across every API source, with a per-board breakdown. A
          down board is shown struck-through so an outage is visible, not hidden. */}
      {srcCounts.length > 0 && (
        <div data-testid="source-counts" style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '18px' }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', fontWeight: 600, color: 'var(--text-heading)' }}>
            {total} {total === 1 ? 'Stelle' : 'Stellen'}
          </span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-soft)' }}>
            aus {srcCounts.filter((s) => s.ok).length}/{srcCounts.length} Quellen
          </span>
          <span style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {srcCounts.map((s) => (
              <span key={s.name} title={s.ok ? `${s.name}: ${s.count} Stellen` : `${s.name} ist nicht erreichbar`} style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontFamily: 'var(--font-mono)', fontSize: '11px', padding: '3px 9px', borderRadius: 'var(--radius-pill)', border: '1px solid var(--border)', background: 'var(--surface-card)', color: s.ok ? 'var(--text-muted)' : 'var(--text-soft)', textDecoration: s.ok ? 'none' : 'line-through', opacity: s.ok ? 1 : 0.6 }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: s.ok ? 'var(--positive, #1F8A5B)' : 'var(--danger, #d64545)' }} />
                {s.name} {s.ok ? s.count : '—'}
              </span>
            ))}
          </span>
        </div>
      )}
      {/* mode */}
      <div style={{ display: 'inline-flex', background: 'var(--surface-sunk)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '3px', gap: '3px', marginBottom: '20px' }}>
        {[['auto', 'Auto · Skill-Match'], ['manual', 'Manuell']].map(([id, lbl]) => (
          <button key={id} onClick={() => setMode(id)} style={{ appearance: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: '13px', fontWeight: mode === id ? 600 : 500, padding: '8px 16px', borderRadius: 'var(--radius-sm)', background: mode === id ? 'var(--surface-card)' : 'transparent', color: mode === id ? 'var(--text-heading)' : 'var(--text-soft)', boxShadow: mode === id ? 'var(--shadow-sm)' : 'none' }}>{lbl}</button>
        ))}
      </div>

      {/* candidate switcher */}
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-soft)', marginBottom: '9px' }}>Kandidat:in</div>
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '18px' }}>
        {talents.map((t) => {
          const on = t.id === candId;
          return (
            <button key={t.id} onClick={() => setCandId(t.id)} style={{ appearance: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '4px 13px 4px 4px', borderRadius: 'var(--radius-pill)', border: `1px solid ${on ? 'var(--accent-border)' : 'var(--border-strong)'}`, background: on ? 'var(--accent-soft)' : 'var(--surface-card)', color: on ? 'var(--accent-strong)' : 'var(--text-muted)', fontSize: '13px', fontWeight: on ? 600 : 500 }}>
              <MT.Avatar name={t.name} src={t.src} size="xs" />{t.name}{t.me ? ' · Ich' : ''}
            </button>
          );
        })}
      </div>

      {mode === 'manual' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '18px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--surface-card)', border: '1px solid var(--border-strong)', borderRadius: 'var(--radius-md)', padding: '0 12px' }}>
            <MT.Icon name="search" size={15} style={{ color: 'var(--text-soft)' }} />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Stelle suchen: Titel, Unternehmen, Ort …" style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--text-heading)', padding: '10px 0' }} />
          </label>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {[['ALL', 'Alle Länder'], ['CH', '🇨🇭 Schweiz'], ['DE', '🇩🇪 Deutschland']].map(([k, l]) => chip(country === k, l, () => setCountry(k)))}
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {sources.map((s) => chip(source === s, s, () => setSource(s)))}
          </div>
        </div>
      )}

      {mode === 'auto' && (
        <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '0 0 16px' }}>Stellen passend zum <b style={{ color: 'var(--text-heading)' }}>Skill-Profil von {cand.name}</b> — beste Übereinstimmung zuerst.</p>
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
                applyLabel={job.url ? 'Stelle ansehen' : undefined}
                onApply={open}
                onView={open}
              />
              {true && (
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '6px' }}>
                  {(() => {
                    const st = adoptState[job.id];
                    const already = st === 'already';
                    const label =
                      st === 'busy' ? 'Übernehme …'
                      : st === 'done' ? 'Übernommen'
                      : st === 'already' ? 'Bereits gespeichert → öffnen'
                      : st === 'error' ? 'Erneut versuchen'
                      : 'Stelle übernehmen';
                    return (
                      <button
                        onClick={() => (already && onOpenPosting ? onOpenPosting(adoptSavedId[job.id]) : adopt(job))}
                        disabled={st === 'busy' || st === 'done'}
                        title="Diese Stelle als gespeicherte Stelle übernehmen (ohne KI)"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: st === 'busy' || st === 'done' ? 'default' : 'pointer', appearance: 'none', background: st === 'done' ? 'var(--surface-sunk)' : 'var(--surface-card)', border: '1px solid var(--border-strong)', borderRadius: 'var(--radius-pill)', color: st === 'done' ? 'var(--text-soft)' : 'var(--text-heading)', fontFamily: 'var(--font-mono)', fontSize: '11px', fontWeight: 600, padding: '4px 11px' }}
                      >
                        <MT.Icon name={st === 'done' ? 'check' : 'bookmark'} size={12} /> {label}
                      </button>
                    );
                  })()}
                  {onCreateMandate && (
                    <button
                      onClick={() => onCreateMandate(job)}
                      title="Einen Klienten-Suchauftrag aus dieser Stelle entwerfen"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: 'pointer', appearance: 'none', background: 'none', border: '1px solid var(--border-strong)', borderRadius: 'var(--radius-pill)', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: '11px', padding: '4px 11px' }}
                    >
                      <MT.Icon name="briefcase" size={12} /> Suchauftrag anlegen
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
        {(mode === 'auto' ? jobs.length === 0 : manualJobs.length === 0) && (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-soft)', border: '1px dashed var(--border-strong)', borderRadius: 'var(--radius-lg)' }}>Keine Treffer.</div>
        )}
      </div>
    </div>
  );
}

Object.assign(window, { Matching });
