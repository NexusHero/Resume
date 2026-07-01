/* app.jsx — orchestrates the unified myJob workspace. Define-only; render is in index.html. */
const A = window.MyJobDesignSystem_f3658e;

const TITLES = {
  uebersicht: ['Workspace', 'What needs your attention today'],
  mandate: ['Mandates', 'Search mandates per client with fee and deadline'],
  pool: ['Talent Pool', 'Who you represent — me first'],
  matching: ['Matching', 'Find roles by skill-overlap — apply on a candidate’s behalf'],
  bewerbungen: ['Applications', 'Pipeline of all submissions and your own dossiers'],
  platzierungen: ['Placements', 'Booked placements and fees'],
  berichte: ['Reports', 'Fees, funnel and utilization'],
  postfach: ['Inbox', 'Messages from clients and companies'],
  einstellungen: ['Settings', 'API key, AI framework & agentic mode'],
};

/**
 * Loads a list resource from the API and tracks loading/error state. It does
 * NOT fall back to sample data on failure — the recruiting views must only ever
 * show real records, never fabricated ones. Returns { data, loading, error,
 * reload } so views can render a loading, error (with retry), or empty state.
 */
function useResource(fetcher) {
  const [data, setData] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(false);
  const alive = React.useRef(true);
  React.useEffect(() => () => { alive.current = false; }, []);
  const reload = React.useCallback(() => {
    setLoading(true);
    setError(false);
    return fetcher()
      .then((list) => {
        if (!alive.current) return;
        setData(Array.isArray(list) ? list : []);
        setLoading(false);
      })
      .catch(() => {
        if (!alive.current) return;
        setError(true);
        setLoading(false);
      });
  }, [fetcher]);
  React.useEffect(() => { reload(); }, [reload]);
  return { data, loading, error, reload };
}

function Workspace({ onLogout }) {
  const [nav, setNav] = React.useState('uebersicht');
  const [search, setSearch] = React.useState('');
  const [openTalent, setOpenTalent] = React.useState(null);
  const [openPipeline, setOpenPipeline] = React.useState(null); // mandate id whose pipeline is open
  const [mappeFor, setMappeFor] = React.useState(null);
  const [editing, setEditing] = React.useState(null);
  // Which create form is open ('mandate' | 'talent' | 'placement' | null).
  const [formKind, setFormKind] = React.useState(null);
  // The record being edited, as { kind, id, values } — null when not editing.
  const [editRecord, setEditRecord] = React.useState(null);
  // Live data sources. Each tracks loading/error and never falls back to
  // fabricated sample data — a recruiter must only ever see real records.
  const listMandates = React.useCallback(() => window.RecruitApi.listMandates(), []);
  const listTalents = React.useCallback(() => window.RecruitApi.listTalents(), []);
  const listPlacements = React.useCallback(() => window.RecruitApi.listPlacements(), []);
  const mandatesRes = useResource(listMandates);
  const talentsRes = useResource(listTalents);
  const placementsRes = useResource(listPlacements);

  const mandates = mandatesRes.data;
  const placements = placementsRes.data;
  // "me" (the recruiter's own pinned profile) is the user's own data, not a
  // fabricated candidate, so it stays pinned first in the pool.
  const me0 = window.TALENTS.find((t) => t.me);
  const talents = React.useMemo(
    () => [me0, ...talentsRes.data.filter((t) => !t.me)],
    [me0, talentsRes.data],
  );

  const addMandate = () => setFormKind('mandate');
  const addTalent = () => setFormKind('talent');
  const addPlacement = () => setFormKind('placement');

  // The create form modal submits here; each returns the create promise so the
  // modal can show its busy state, then close on success or surface an error.
  const submitForm = (kind, values) => {
    if (kind === 'mandate') return window.RecruitApi.createMandate(values).then(mandatesRes.reload);
    if (kind === 'talent') return window.RecruitApi.createTalent(values).then(talentsRes.reload);
    return window.RecruitApi.createPlacement(values).then(placementsRes.reload);
  };

  // Open the edit form for a record. Mandates already carry form-shaped fields;
  // placements come from the view in their mapped UI shape, so map them back.
  const editMandate = (m) => setEditRecord({ kind: 'mandate', id: m.id, values: m });
  const editPlacement = (p) =>
    setEditRecord({
      kind: 'placement',
      id: p.id,
      values: {
        candidateName: p.candName,
        candidateRole: p.candRole,
        client: p.client,
        start: p.start,
        fee: p.fee,
        status: String(p.status || '').toLowerCase(),
      },
    });

  const submitEdit = ({ kind, id }, values) => {
    if (kind === 'mandate')
      return window.RecruitApi.updateMandate(id, values).then(mandatesRes.reload);
    return window.RecruitApi.updatePlacement(id, values).then(placementsRes.reload);
  };

  // Render a view, or a loading / error (retry) state while its source resolves.
  const withState = (res, node) =>
    res.loading ? (
      <window.LoadingState />
    ) : res.error ? (
      <window.ErrorState onRetry={res.reload} />
    ) : (
      node
    );

  const apps = window.APPLICATIONS;
  const me = talents.find((t) => t.me);

  // Übersicht and Berichte run off the same live data the other views use, so
  // their KPIs and fee breakdown track the signed-in recruiter's own portfolio.
  const vkpis = React.useMemo(
    () => window.computeVermittlerKpis(mandates, talents, placements),
    [mandates, talents, placements],
  );
  const reportClients = React.useMemo(
    () => window.deriveReportClients(mandates, placements),
    [mandates, placements],
  );

  const unread = window.MESSAGES.filter((m) => m.unread).length;
  const badges = { bewerbungen: apps.filter((a) => a.status !== 'rejected' && a.status !== 'hired').length, postfach: unread || undefined };

  const goTalent = (id) => setOpenTalent(id);
  const back = () => setOpenTalent(null);
  const goPipeline = (m) => setOpenPipeline(m.id);

  const talent = openTalent && talents.find((t) => t.id === openTalent);
  const talentApps = (id) => apps.filter((a) => a.talentId === id);
  const editTalent = editing && talents.find((t) => t.id === editing);

  // a mandate's pipeline board takes over the whole canvas
  const pipelineMandate = openPipeline && mandates.find((m) => m.id === openPipeline);
  if (pipelineMandate) {
    return (
      <window.RecruitRail active="mandate" onNav={(n) => { setOpenPipeline(null); setNav(n); }} me={me} talentCount={talents.length} search={search} onSearch={setSearch} title={`${pipelineMandate.role} · Pipeline`} subtitle={pipelineMandate.client} badges={badges} onLogout={onLogout}>
        <window.MandatePipeline
          mandate={pipelineMandate}
          onBack={() => setOpenPipeline(null)}
          onOpenTalent={(id) => { setOpenPipeline(null); goTalent(id); }}
        />
      </window.RecruitRail>
    );
  }

  // editor takes over the whole canvas
  if (editTalent) {
    return (
      <window.RecruitRail active="pool" onNav={(n) => { setEditing(null); setOpenTalent(null); setNav(n); }} me={me} talentCount={talents.length} search={search} onSearch={setSearch} title={editTalent.me ? 'My documents' : editTalent.name} subtitle="Edit resume & cover letter" badges={badges} onLogout={onLogout}>
        <window.Editor talent={editTalent} onClose={() => setEditing(null)} onCreateMappe={() => { setMappeFor(editTalent); }} />
        {mappeFor && <window.MappeModal talent={mappeFor} onClose={() => setMappeFor(null)} />}
      </window.RecruitRail>
    );
  }

  // a talent profile takes over the whole canvas regardless of nav
  let title, subtitle, body;
  if (talent) {
    title = talent.me ? 'My profile' : talent.name;
    subtitle = 'Resume, attachments and applications';
    body = <window.TalentProfile talent={talent} apps={talentApps(talent.id)} onBack={back} onEdit={() => setEditing(talent.id)} onCreateMappe={() => setMappeFor(talent)} />;
  } else {
    [title, subtitle] = TITLES[nav];
    if (nav === 'uebersicht') body = <window.Dashboard me={me} apps={apps} vkpis={vkpis} clients={window.CLIENTS} mandates={mandates} onOpenTalent={goTalent} onOpenPipeline={() => setNav('bewerbungen')} onOpenMandate={() => setNav('mandate')} />;
    else if (nav === 'mandate') body = withState(mandatesRes, <window.MandateView mandates={mandates} onEdit={editMandate} onOpenPipeline={goPipeline} />);
    else if (nav === 'pool') body = withState(talentsRes, <window.TalentGrid talents={talents} apps={apps} onOpen={goTalent} onAdd={addTalent} />);
    else if (nav === 'matching') body = <window.Matching talents={talents} />;
    else if (nav === 'bewerbungen') body = (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', height: '100%' }}>
        <window.PipelineBoard apps={apps} talents={talents} onOpen={goTalent} />
      </div>
    );
    else if (nav === 'platzierungen') body = withState(placementsRes, <window.PlatzierungenView placements={placements} kpis={vkpis} onEdit={editPlacement} />);
    else if (nav === 'berichte') body = <window.ReportsView clients={reportClients} mandates={mandates} placements={placements} apps={apps} kpis={vkpis} />;
    else if (nav === 'postfach') body = <window.Inbox messages={window.MESSAGES} apps={apps} talents={talents} onOpenTalent={goTalent} />;
    else if (nav === 'einstellungen') body = <window.SettingsView />;
  }

  const actions = (!talent && (nav === 'bewerbungen' || nav === 'uebersicht'))
    ? <A.Button variant="primary" size="sm" iconLeft={<A.Icon name="plus" size={15} />} onClick={() => setMappeFor(me)}>Add application</A.Button>
    : (!talent && nav === 'mandate')
    ? <A.Button variant="primary" size="sm" iconLeft={<A.Icon name="plus" size={15} />} onClick={addMandate}>New mandate</A.Button>
    : (!talent && nav === 'platzierungen')
    ? <A.Button variant="primary" size="sm" iconLeft={<A.Icon name="plus" size={15} />} onClick={addPlacement}>Add placement</A.Button>
    : null;

  return (
    <window.RecruitRail active={talent ? 'pool' : nav} onNav={(n) => { setOpenTalent(null); setNav(n); }} me={me} talentCount={talents.length} search={search} onSearch={setSearch} title={title} subtitle={subtitle} badges={badges} actions={actions} onLogout={onLogout}>
      {body}
      {mappeFor && <window.MappeModal talent={mappeFor} onClose={() => setMappeFor(null)} />}
      {formKind && (
        <window.RecordFormModal
          kind={formKind}
          onClose={() => setFormKind(null)}
          onSubmit={(values) => submitForm(formKind, values)}
        />
      )}
      {editRecord && (
        <window.RecordFormModal
          kind={editRecord.kind}
          record={editRecord.values}
          onClose={() => setEditRecord(null)}
          onSubmit={(values) => submitEdit(editRecord, values)}
        />
      )}
    </window.RecruitRail>
  );
}

/* Auth gate: probe the session, then render either the login screen or the
   workspace. The recruiting UI is only mounted once a user is present. */
function App() {
  const [auth, setAuth] = React.useState({ status: 'loading', user: null });
  const [providers, setProviders] = React.useState({ google: false, linkedin: false });

  React.useEffect(() => {
    let alive = true;
    window.RecruitApi.authProviders()
      .then((p) => { if (alive) setProviders(p); })
      .catch(() => {});
    window.RecruitApi.authMe()
      .then((user) => { if (alive) setAuth({ status: 'ready', user }); })
      .catch(() => { if (alive) setAuth({ status: 'ready', user: null }); });
    return () => { alive = false; };
  }, []);

  if (auth.status === 'loading') return null;
  if (!auth.user) {
    return (
      <window.LoginScreen
        providers={providers}
        onAuthed={(user) => setAuth({ status: 'ready', user })}
      />
    );
  }

  const onLogout = () =>
    window.RecruitApi.authLogout()
      .catch(() => {})
      .then(() => setAuth({ status: 'ready', user: null }));

  return <Workspace onLogout={onLogout} />;
}

Object.assign(window, { App });
