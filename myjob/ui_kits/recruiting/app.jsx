/* app.jsx — orchestrates the unified myJob workspace. Define-only; render is in index.html. */
const A = window.BewerbungstoolDesignSystem_a75119;

const TITLES = {
  uebersicht: ['Übersicht', 'Vermittlung & eigene Bewerbungen auf einen Blick'],
  mandate: ['Mandate', 'Suchaufträge je Kunde mit Provision und Frist'],
  pool: ['Talent-Pool', 'Wen du vertrittst — Ich zuerst'],
  bewerbungen: ['Bewerbungen', 'Pipeline aller Vorschläge und eigenen Mappen'],
  platzierungen: ['Platzierungen', 'Gebuchte Vermittlungen und Provision'],
  berichte: ['Berichte', 'Provision, Funnel und Auslastung'],
  postfach: ['Postfach', 'Nachrichten von Kunden und Firmen'],
};

function App() {
  const [nav, setNav] = React.useState('uebersicht');
  const [search, setSearch] = React.useState('');
  const [openTalent, setOpenTalent] = React.useState(null);
  const [mappeFor, setMappeFor] = React.useState(null);
  const [editing, setEditing] = React.useState(null);

  const talents = window.TALENTS;
  const apps = window.APPLICATIONS;
  const me = talents.find((t) => t.me);

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
      <window.AppShell active="pool" onNav={(n) => { setEditing(null); setOpenTalent(null); setNav(n); }} me={me} talentCount={talents.length} search={search} onSearch={setSearch} title={editTalent.me ? 'Meine Dokumente' : editTalent.name} subtitle="Lebenslauf & Anschreiben bearbeiten" badges={badges}>
        <window.Editor talent={editTalent} onClose={() => setEditing(null)} onCreateMappe={() => { setMappeFor(editTalent); }} />
        {mappeFor && <window.MappeModal talent={mappeFor} onClose={() => setMappeFor(null)} />}
      </window.AppShell>
    );
  }

  // a talent profile takes over the whole canvas regardless of nav
  let title, subtitle, body;
  if (talent) {
    title = talent.me ? 'Mein Profil' : talent.name;
    subtitle = 'Lebenslauf, Anhänge und Bewerbungen';
    body = <window.TalentProfile talent={talent} apps={talentApps(talent.id)} onBack={back} onEdit={() => setEditing(talent.id)} onCreateMappe={() => setMappeFor(talent)} />;
  } else {
    [title, subtitle] = TITLES[nav];
    if (nav === 'uebersicht') body = <window.Dashboard me={me} apps={apps} vkpis={window.VERMITTLER_KPIS} clients={window.CLIENTS} mandates={window.MANDATES} onOpenTalent={goTalent} onOpenPipeline={() => setNav('bewerbungen')} onOpenMandate={() => setNav('mandate')} />;
    else if (nav === 'mandate') body = <window.MandateView clients={window.CLIENTS} mandates={window.MANDATES} />;
    else if (nav === 'pool') body = <window.TalentGrid talents={talents} apps={apps} onOpen={goTalent} />;
    else if (nav === 'bewerbungen') body = (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', height: '100%' }}>
        <window.PipelineBoard apps={apps} talents={talents} onOpen={goTalent} />
      </div>
    );
    else if (nav === 'platzierungen') body = <window.PlatzierungenView placements={window.PLACEMENTS} kpis={window.VERMITTLER_KPIS} />;
    else if (nav === 'berichte') body = <window.ReportsView clients={window.CLIENTS} mandates={window.MANDATES} placements={window.PLACEMENTS} apps={apps} kpis={window.VERMITTLER_KPIS} />;
    else if (nav === 'postfach') body = <window.Inbox messages={window.MESSAGES} apps={apps} talents={talents} onOpenTalent={goTalent} />;
  }

  const actions = (!talent && (nav === 'bewerbungen' || nav === 'uebersicht'))
    ? <A.Button variant="primary" size="sm" iconLeft={<A.Icon name="plus" size={15} />} onClick={() => setMappeFor(me)}>Bewerbung einpflegen</A.Button>
    : (!talent && nav === 'mandate')
    ? <A.Button variant="primary" size="sm" iconLeft={<A.Icon name="plus" size={15} />}>Mandat anlegen</A.Button>
    : null;

  return (
    <window.AppShell active={talent ? 'pool' : nav} onNav={(n) => { setOpenTalent(null); setNav(n); }} me={me} talentCount={talents.length} search={search} onSearch={setSearch} title={title} subtitle={subtitle} badges={badges} actions={actions}>
      {body}
      {mappeFor && <window.MappeModal talent={mappeFor} onClose={() => setMappeFor(null)} />}
    </window.AppShell>
  );
}

Object.assign(window, { App });
