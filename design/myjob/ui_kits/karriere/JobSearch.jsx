/* Jobsuche — find jobs by Land / Stadt / Suchbegriff, then create an
   application straight from a posting. Sending happens later; here you
   build it and remember it. */
const JS = window.MyJobDesignSystem_f3658e;

function JobTile({ job, size = 44 }) {
  const ini = job.company.split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
  return <div style={{ width: size, height: size, flexShrink: 0, borderRadius: 'var(--radius-md)', background: job.tile, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: size * 0.34 + 'px' }}>{ini}</div>;
}
function MatchPill({ v }) {
  const strong = v >= 90;
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontFamily: 'var(--font-mono)', fontSize: '11.5px', fontWeight: 700, color: strong ? 'var(--status-hired-strong)' : 'var(--accent-strong)', background: strong ? 'var(--status-hired-soft)' : 'var(--accent-soft)', border: `1px solid ${strong ? 'var(--status-hired-border)' : 'var(--accent-border)'}`, borderRadius: 'var(--radius-pill)', padding: '3px 9px' }}>
      <JS.Icon name="zap" size={12} />{v}%
    </div>
  );
}

function JobRow({ job, onOpen, stretch }) {
  const [hover, setHover] = React.useState(false);
  const missing = stretch ? (window.KarriereData.skillMatch(job).missing) : [];
  return (
    <div onClick={() => onOpen(job.id)} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '16px 18px', cursor: 'pointer', background: hover ? 'var(--surface-subtle)' : 'transparent', borderBottom: '1px solid var(--border)', transition: 'background var(--dur-fast) var(--ease-out)' }}>
      <JobTile job={job} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: '15px', fontWeight: 700, color: 'var(--text-heading)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0 }}>{job.role}</span>
          <span style={{ flexShrink: 0 }}><MatchPill v={job.match} /></span>
          {missing.length > 0 && <span style={{ flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: '4px', fontFamily: 'var(--font-mono)', fontSize: '10px', fontWeight: 600, color: 'var(--text-soft)', background: 'var(--surface-subtle)', border: '1px solid var(--border)', borderRadius: 'var(--radius-pill)', padding: '2px 8px' }}><JS.Icon name="trend" size={10} />+{missing.length} neue Skill{missing.length === 1 ? '' : 's'}</span>}
        </div>
        <div style={{ fontSize: '12.5px', color: 'var(--text-muted)', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{job.company} · {job.city} · {job.mode}</div>
        <div style={{ display: 'flex', gap: '6px', marginTop: '9px', flexWrap: 'wrap', alignItems: 'center' }}>
          {job.source && <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--accent-strong)', background: 'var(--accent-soft)', border: '1px solid var(--accent-border)', borderRadius: 'var(--radius-pill)', padding: '2px 8px' }}><JS.Icon name="globe" size={10} />via {job.source}</span>}
          {job.tags.map((t) => <JS.Badge key={t} variant="subtle" size="sm">{t}</JS.Badge>)}
        </div>
      </div>
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '12.5px', fontWeight: 600, color: 'var(--text-heading)', whiteSpace: 'nowrap' }}>{job.salary}</div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10.5px', color: 'var(--text-soft)', marginTop: '3px' }}>{job.posted}</div>
      </div>
      <JS.Icon name="chevronRight" size={16} style={{ color: 'var(--text-soft)' }} />
    </div>
  );
}

function JobDetail({ job, onClose, onCreate }) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 40, display: 'flex', justifyContent: 'flex-end' }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(8,11,18,0.45)', backdropFilter: 'blur(2px)', animation: 'kfade var(--dur-fast) var(--ease-out)' }} />
      <div style={{ position: 'relative', width: '480px', maxWidth: '92vw', height: '100%', background: 'var(--surface-card)', borderLeft: '1px solid var(--border)', boxShadow: 'var(--shadow-lg)', overflowY: 'auto', display: 'flex', flexDirection: 'column', animation: 'kslide var(--dur-med) var(--ease-out)' }}>
        <div style={{ padding: '22px 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
          <JobTile job={job} size={52} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '19px', fontWeight: 700, color: 'var(--text-heading)' }}>{job.role}</div>
            <div style={{ fontSize: '13.5px', color: 'var(--text-muted)' }}>{job.company}</div>
            <div style={{ display: 'flex', gap: '8px', marginTop: '8px', flexWrap: 'wrap' }}>
              <MatchPill v={job.match} />
              <JS.MetaPill icon="pin">{job.city} · {job.mode}</JS.MetaPill>
            </div>
          </div>
          <JS.IconButton icon="x" label="Schließen" variant="ghost" onClick={onClose} />
        </div>

        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '20px', flex: 1 }}>
          <section style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <KField label="Gehalt" value={job.salary} mono />
            <KField label="Land" value={job.country} />
            <KField label="Arbeitsmodell" value={job.mode} />
            <KField label="Veröffentlicht" value={job.posted} />
          </section>
          <section style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '11px 13px', borderRadius: 'var(--radius-md)', background: 'var(--surface-subtle)', border: '1px solid var(--border)' }}>
            <JS.Icon name={job.applyVia === 'E-Mail' ? 'mail' : job.applyVia === 'LinkedIn Easy Apply' ? 'linkedin' : 'globe'} size={16} style={{ color: 'var(--accent)' }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '9.5px', letterSpacing: 'var(--ls-wide)', textTransform: 'uppercase', color: 'var(--text-soft)' }}>Bewerbung über · {job.applyVia}</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-heading)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{job.applyUrl}</div>
            </div>
          </section>
          <section>
            <h4 style={{ fontFamily: 'var(--font-mono)', fontSize: '10.5px', letterSpacing: 'var(--ls-wide)', textTransform: 'uppercase', color: 'var(--text-soft)', margin: '0 0 8px' }}>Beschreibung</h4>
            <p style={{ fontSize: '13.5px', lineHeight: 1.65, color: 'var(--text-body)', margin: 0 }}>{job.snippet}</p>
          </section>
          <section>
            <h4 style={{ fontFamily: 'var(--font-mono)', fontSize: '10.5px', letterSpacing: 'var(--ls-wide)', textTransform: 'uppercase', color: 'var(--text-soft)', margin: '0 0 10px' }}>Skills</h4>
            <div style={{ display: 'flex', gap: '7px', flexWrap: 'wrap' }}>{job.tags.map((t) => <JS.Badge key={t} variant="soft">{t}</JS.Badge>)}</div>
          </section>
        </div>

        <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border)', display: 'flex', gap: '10px', background: 'var(--surface-subtle)', position: 'sticky', bottom: 0 }}>
          <JS.Button variant="primary" block iconLeft={<JS.Icon name="edit" size={15} />} onClick={() => onCreate(job)}>Bewerbung erstellen</JS.Button>
          <JS.IconButton icon="bookmark" label="Merken" variant="outline" size="lg" />
        </div>
      </div>
    </div>
  );
}

function KField({ label, value, mono }) {
  return (
    <div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: 'var(--ls-wide)', textTransform: 'uppercase', color: 'var(--text-soft)', marginBottom: '4px' }}>{label}</div>
      <div style={{ fontFamily: mono ? 'var(--font-mono)' : 'var(--font-body)', fontSize: '13.5px', fontWeight: 600, color: 'var(--text-heading)' }}>{value}</div>
    </div>
  );
}

function SkeletonRow() {
  const bar = (w) => <div style={{ height: '11px', width: w, borderRadius: 'var(--radius-pill)', background: 'var(--surface-sunk)' }} />;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '16px 18px', borderBottom: '1px solid var(--border)', opacity: 0.7 }}>
      <div style={{ width: '44px', height: '44px', borderRadius: 'var(--radius-md)', background: 'var(--surface-sunk)', flexShrink: 0 }} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>{bar('45%')}{bar('30%')}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-end' }}>{bar('90px')}{bar('60px')}</div>
    </div>
  );
}

function SourceChip({ name, tile, active, onClick }) {
  return (
    <button onClick={onClick} style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: '11.5px', fontWeight: 600, padding: '6px 12px', borderRadius: 'var(--radius-pill)', border: `1px solid ${active ? 'var(--accent-border)' : 'var(--border-strong)'}`, background: active ? 'var(--accent-soft)' : 'var(--surface-card)', color: active ? 'var(--accent-strong)' : 'var(--text-soft)', transition: 'all var(--dur-fast) var(--ease-out)' }}>
      <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: active ? tile : 'var(--border-strong)' }} />{name}
    </button>
  );
}

function TierHeader({ icon, tone, title, hint, count }) {
  const strong = tone === 'hired' ? 'var(--status-hired-strong)' : 'var(--accent-strong)';
  const soft = tone === 'hired' ? 'var(--status-hired-soft)' : 'var(--accent-soft)';
  const border = tone === 'hired' ? 'var(--status-hired-border)' : 'var(--accent-border)';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 18px', borderBottom: '1px solid var(--border)', background: 'var(--surface-subtle)' }}>
      <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '24px', height: '24px', borderRadius: 'var(--radius-md)', background: soft, color: strong, border: `1px solid ${border}` }}><JS.Icon name={icon} size={13} /></span>
      <span style={{ fontFamily: 'var(--font-display)', fontSize: '13.5px', fontWeight: 700, color: 'var(--text-heading)' }}>{title}</span>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', fontWeight: 700, color: strong }}>{count}</span>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: 'var(--ls-wide)', textTransform: 'uppercase', color: 'var(--text-soft)', marginLeft: 'auto' }}>{hint}</span>
    </div>
  );
}

function Jobsuche({ onCreate, providers, onManageSources }) {
  const { JOBS, COUNTRIES } = window.KarriereData;
  const allProviders = providers || window.KarriereData.PROVIDERS;
  const connected = allProviders.filter((p) => p.connected);
  const connectedNames = connected.map((p) => p.name);
  const [country, setCountry] = React.useState('Alle Länder');
  const [city, setCity] = React.useState('');
  const [kw, setKw] = React.useState('');
  const [activeSources, setActiveSources] = React.useState(() => new Set(connectedNames));
  const [loading, setLoading] = React.useState(false);
  const [openJob, setOpenJob] = React.useState(null);
  const [creating, setCreating] = React.useState(null);
  const [onlyTop, setOnlyTop] = React.useState(false);
  const THRESHOLD = 80; // tier boundary: strong fits vs. stretch opportunities

  // keep source filter in sync as providers connect/disconnect
  React.useEffect(() => { setActiveSources(new Set(connectedNames)); }, [connectedNames.join('|')]);

  const runSearch = () => { setLoading(true); setTimeout(() => setLoading(false), 750); };
  React.useEffect(() => { runSearch(); }, []);

  const toggleSource = (name) => setActiveSources((prev) => { const n = new Set(prev); n.has(name) ? n.delete(name) : n.add(name); return n; });

  const results = JOBS.filter((j) => {
    if (!connectedNames.includes(j.source)) return false; // only from connected APIs
    if (!activeSources.has(j.source)) return false;
    if (country !== 'Alle Länder' && j.country !== country) return false;
    if (city && !(j.city.toLowerCase().includes(city.toLowerCase()))) return false;
    if (kw) {
      const hay = (j.role + ' ' + j.company + ' ' + j.tags.join(' ')).toLowerCase();
      if (!hay.includes(kw.toLowerCase())) return false;
    }
    return true;
  });
  // Two tiers: strong fits (>= threshold) first, then stretch / new-domain roles —
  // the lower tier is kept, not dropped, so growth opportunities stay visible.
  const ranked = [...results].sort((a, b) => b.match - a.match);
  const topJobs = ranked.filter((j) => j.match >= THRESHOLD);
  const moreJobs = ranked.filter((j) => j.match < THRESHOLD);
  const job = JOBS.find((j) => j.id === openJob);

  const inputBox = { display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--surface-card)', border: '1px solid var(--border-strong)', borderRadius: 'var(--radius-md)', padding: '0 12px', height: '42px' };

  if (connected.length === 0) {
    return (
      <div style={{ maxWidth: '1100px' }}>
        <JS.Card>
          <div style={{ padding: '36px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px' }}>
            <span style={{ width: '52px', height: '52px', borderRadius: 'var(--radius-lg)', background: 'var(--accent-soft)', color: 'var(--accent-strong)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><JS.Icon name="globe" size={24} /></span>
            <div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '17px', fontWeight: 700, color: 'var(--text-heading)' }}>Noch keine Jobquelle verbunden</div>
              <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px', maxWidth: '420px' }}>Verbinde eine Jobbörse oder einen Aggregator, um Stellen per API in deine Suche zu holen.</div>
            </div>
            <JS.Button variant="primary" iconLeft={<JS.Icon name="plus" size={15} />} onClick={onManageSources}>Jobquelle verbinden</JS.Button>
          </div>
        </JS.Card>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', maxWidth: '1100px' }}>
      <JS.Card pad={true} style={{ overflow: 'visible' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1.4fr auto', gap: '12px', alignItems: 'end' }}>
          <div>
            <label style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: 'var(--ls-wide)', textTransform: 'uppercase', color: 'var(--text-soft)', display: 'block', marginBottom: '6px' }}>Land</label>
            <JS.Select options={COUNTRIES} value={country} onChange={(e) => setCountry(e.target.value)} />
          </div>
          <div>
            <label style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: 'var(--ls-wide)', textTransform: 'uppercase', color: 'var(--text-soft)', display: 'block', marginBottom: '6px' }}>Stadt / Ort</label>
            <div style={inputBox}><JS.Icon name="pin" size={15} style={{ color: 'var(--text-soft)' }} /><input value={city} onChange={(e) => setCity(e.target.value)} placeholder="z. B. Berlin" style={{ flex: 1, minWidth: 0, border: 'none', outline: 'none', background: 'transparent', fontFamily: 'var(--font-body)', fontSize: '13.5px', color: 'var(--text-heading)' }} /></div>
          </div>
          <div>
            <label style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: 'var(--ls-wide)', textTransform: 'uppercase', color: 'var(--text-soft)', display: 'block', marginBottom: '6px' }}>Suchbegriffe</label>
            <div style={inputBox}><JS.Icon name="search" size={15} style={{ color: 'var(--text-soft)' }} /><input value={kw} onChange={(e) => setKw(e.target.value)} placeholder="Rolle, Skill, Firma …" style={{ flex: 1, minWidth: 0, border: 'none', outline: 'none', background: 'transparent', fontFamily: 'var(--font-body)', fontSize: '13.5px', color: 'var(--text-heading)' }} /></div>
          </div>
          <JS.Button variant="primary" size="lg" iconLeft={<JS.Icon name="search" size={16} />} onClick={runSearch}>Suchen</JS.Button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginTop: '14px', paddingTop: '14px', borderTop: '1px solid var(--border)' }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: 'var(--ls-wide)', textTransform: 'uppercase', color: 'var(--text-soft)', marginRight: '2px' }}>Quellen</span>
          {connected.map((p) => <SourceChip key={p.id} name={p.name} tile={p.tile} active={activeSources.has(p.name)} onClick={() => toggleSource(p.name)} />)}
          <button onClick={onManageSources} style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: '11px', fontWeight: 600, padding: '6px 10px', borderRadius: 'var(--radius-pill)', border: '1px dashed var(--border-strong)', background: 'transparent', color: 'var(--text-soft)' }}><JS.Icon name="plus" size={12} />Quelle</button>
        </div>
      </JS.Card>

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-muted)' }}><span style={{ color: 'var(--text-heading)', fontWeight: 600 }}>{loading ? '…' : results.length}</span> Jobs · <span style={{ color: 'var(--status-hired-strong)', fontWeight: 600 }}>{loading ? '…' : topJobs.length}</span> Top-Treffer aus {activeSources.size} Quelle{activeSources.size === 1 ? '' : 'n'}</div>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontFamily: 'var(--font-mono)', fontSize: '10.5px', color: 'var(--text-soft)' }}><span style={{ width: '7px', height: '7px', borderRadius: '50%', background: 'var(--status-hired)' }} />synchronisiert vor 4 Min</span>
          <JS.Button size="sm" variant={onlyTop ? 'primary' : 'outline'} iconLeft={<JS.Icon name="zap" size={14} />} onClick={() => setOnlyTop((v) => !v)}>Nur Top-Treffer</JS.Button>
          <JS.Button size="sm" variant="outline" iconLeft={<JS.Icon name="trend" size={14} />} onClick={runSearch}>Aktualisieren</JS.Button>
        </div>
      </div>

      {loading ? (
        <JS.Card pad={false}><SkeletonRow /><SkeletonRow /><SkeletonRow /></JS.Card>
      ) : results.length === 0 ? (
        <JS.Card pad={false}><div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-soft)', fontSize: '13px' }}>Keine Jobs für diese Suche. Filter oder Quellen anpassen.</div></JS.Card>
      ) : (
        <React.Fragment>
          {topJobs.length > 0 && (
            <JS.Card pad={false}>
              <TierHeader icon="zap" tone="hired" title="Top-Treffer" hint={`≥ ${THRESHOLD}% deiner Skills`} count={topJobs.length} />
              {topJobs.map((j) => <JobRow key={j.id} job={j} onOpen={setOpenJob} />)}
            </JS.Card>
          )}
          {!onlyTop && moreJobs.length > 0 && (
            <JS.Card pad={false}>
              <TierHeader icon="trend" tone="accent" title="Weitere & Entwicklungschancen" hint="neue Domänen & Technologien" count={moreJobs.length} />
              {moreJobs.map((j) => <JobRow key={j.id} job={j} onOpen={setOpenJob} stretch={true} />)}
            </JS.Card>
          )}
          {topJobs.length === 0 && onlyTop && (
            <JS.Card pad={false}><div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-soft)', fontSize: '13px' }}>Keine Treffer ≥ {THRESHOLD}%. Schalte „Nur Top-Treffer" aus, um Entwicklungschancen zu sehen.</div></JS.Card>
          )}
        </React.Fragment>
      )}

      {job && <JobDetail job={job} onClose={() => setOpenJob(null)} onCreate={(jb) => { setOpenJob(null); setCreating(jb); }} />}
      {creating && (
        <window.KCreateApplication job={creating} onClose={() => setCreating(null)} onSave={(draft) => { setCreating(null); onCreate(draft); }} />
      )}
    </div>
  );
}

Object.assign(window, { KJobsuche: Jobsuche });
