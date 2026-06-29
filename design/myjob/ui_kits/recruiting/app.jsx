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

function App() {
  const [nav, setNav] = React.useState('uebersicht');
  const [search, setSearch] = React.useState('');
  const [openTalent, setOpenTalent] = React.useState(null);
  const [mappeFor, setMappeFor] = React.useState(null);
  const [editing, setEditing] = React.useState(null);

  const [talents, setTalents] = React.useState(window.TALENTS);
  const apps = window.APPLICATIONS;
  const me = talents.find((t) => t.me);

  const deleteTalent = (id) => {
    setTalents((prev) => prev.filter((t) => t.id !== id));
    setOpenTalent(null);
  };

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
      <window.RecruitRail active="pool" onNav={(n) => { setEditing(null); setOpenTalent(null); setNav(n); }} me={me} talentCount={talents.length} search={search} onSearch={setSearch} title={editTalent.me ? 'My documents' : editTalent.name} subtitle="Edit resume & cover letter" badges={badges}>
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
    if (nav === 'uebersicht') body = <window.Dashboard me={me} apps={apps} vkpis={window.VERMITTLER_KPIS} clients={window.CLIENTS} mandates={window.MANDATES} onOpenTalent={goTalent} onOpenPipeline={() => setNav('bewerbungen')} onOpenMandate={() => setNav('mandate')} />;
    else if (nav === 'mandate') body = <window.MandateView clients={window.CLIENTS} mandates={window.MANDATES} />;
    else if (nav === 'pool') body = <window.TalentGrid talents={talents} apps={apps} onOpen={goTalent} onDelete={deleteTalent} />;
    else if (nav === 'matching') body = <window.Matching talents={talents} />;
    else if (nav === 'bewerbungen') body = (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', height: '100%' }}>
        <window.PipelineBoard apps={apps} talents={talents} onOpen={goTalent} />
      </div>
    );
    else if (nav === 'platzierungen') body = <window.PlatzierungenView placements={window.PLACEMENTS} kpis={window.VERMITTLER_KPIS} />;
    else if (nav === 'berichte') body = <window.ReportsView clients={window.CLIENTS} mandates={window.MANDATES} placements={window.PLACEMENTS} apps={apps} kpis={window.VERMITTLER_KPIS} />;
    else if (nav === 'postfach') body = <window.Inbox messages={window.MESSAGES} apps={apps} talents={talents} onOpenTalent={goTalent} />;
    else if (nav === 'einstellungen') body = <window.SettingsView />;
  }

  const actions = (!talent && (nav === 'bewerbungen' || nav === 'uebersicht'))
    ? <A.Button variant="primary" size="sm" iconLeft={<A.Icon name="plus" size={15} />} onClick={() => setMappeFor(me)}>Add application</A.Button>
    : (!talent && nav === 'mandate')
    ? <A.Button variant="primary" size="sm" iconLeft={<A.Icon name="plus" size={15} />}>New mandate</A.Button>
    : null;

  return (
    <window.RecruitRail active={talent ? 'pool' : nav} onNav={(n) => { setOpenTalent(null); setNav(n); }} me={me} talentCount={talents.length} search={search} onSearch={setSearch} title={title} subtitle={subtitle} badges={badges} actions={actions}>
      {body}
      {mappeFor && <window.MappeModal talent={mappeFor} onClose={() => setMappeFor(null)} />}
    </window.RecruitRail>
  );
}

Object.assign(window, { App });
