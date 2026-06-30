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

function Workspace({ onLogout }) {
  const [nav, setNav] = React.useState('uebersicht');
  const [search, setSearch] = React.useState('');
  const [openTalent, setOpenTalent] = React.useState(null);
  const [mappeFor, setMappeFor] = React.useState(null);
  const [editing, setEditing] = React.useState(null);
  // Placements come from the live REST API; the sample array is the offline fallback.
  const [placements, setPlacements] = React.useState(window.PLACEMENTS);

  const reloadPlacements = React.useCallback(
    () => window.RecruitApi.listPlacements().then(setPlacements).catch(() => {}),
    [],
  );
  React.useEffect(() => {
    let alive = true;
    window.RecruitApi.listPlacements()
      .then((list) => { if (alive) setPlacements(list); })
      .catch(() => {}); // keep the offline sample on error (e.g. file://)
    return () => { alive = false; };
  }, []);

  const addPlacement = () => {
    const candidateName = window.prompt('Candidate name');
    if (!candidateName) return;
    const client = window.prompt('Client') || '';
    window.RecruitApi.createPlacement({ candidateName, client }).then(reloadPlacements).catch(() => {});
  };

  // The talent pool comes from the live REST API; "me" (talent #1, with its
  // dossier) stays the sample object and is always pinned first.
  const me0 = window.TALENTS.find((t) => t.me);
  const [talents, setTalents] = React.useState(window.TALENTS);
  const reloadTalents = React.useCallback(
    () =>
      window.RecruitApi.listTalents()
        .then((list) => setTalents([me0, ...list.filter((t) => !t.me)]))
        .catch(() => {}),
    [me0],
  );
  React.useEffect(() => {
    let alive = true;
    window.RecruitApi.listTalents()
      .then((list) => { if (alive) setTalents([me0, ...list.filter((t) => !t.me)]); })
      .catch(() => {}); // keep the offline sample on error (e.g. file://)
    return () => { alive = false; };
  }, [me0]);

  const addTalent = () => {
    const name = window.prompt('Talent name');
    if (!name) return;
    const role = window.prompt('Role') || '';
    window.RecruitApi.createTalent({ name, role }).then(reloadTalents).catch(() => {});
  };

  // Mandates come from the live REST API; the client-name-resolved sample is the
  // offline fallback. MandateView groups by client name.
  const [mandates, setMandates] = React.useState(window.SAMPLE_MANDATES);
  const reloadMandates = React.useCallback(
    () => window.RecruitApi.listMandates().then(setMandates).catch(() => {}),
    [],
  );
  React.useEffect(() => {
    let alive = true;
    window.RecruitApi.listMandates()
      .then((list) => { if (alive) setMandates(list); })
      .catch(() => {}); // keep the offline sample on error (e.g. file://)
    return () => { alive = false; };
  }, []);

  const addMandate = () => {
    const client = window.prompt('Client');
    if (!client) return;
    const role = window.prompt('Role') || '';
    window.RecruitApi.createMandate({ client, role }).then(reloadMandates).catch(() => {});
  };

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

  const talent = openTalent && talents.find((t) => t.id === openTalent);
  const talentApps = (id) => apps.filter((a) => a.talentId === id);
  const editTalent = editing && talents.find((t) => t.id === editing);

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
    else if (nav === 'mandate') body = <window.MandateView mandates={mandates} />;
    else if (nav === 'pool') body = <window.TalentGrid talents={talents} apps={apps} onOpen={goTalent} onAdd={addTalent} />;
    else if (nav === 'matching') body = <window.Matching talents={talents} />;
    else if (nav === 'bewerbungen') body = (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', height: '100%' }}>
        <window.PipelineBoard apps={apps} talents={talents} onOpen={goTalent} />
      </div>
    );
    else if (nav === 'platzierungen') body = <window.PlatzierungenView placements={placements} kpis={vkpis} />;
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
