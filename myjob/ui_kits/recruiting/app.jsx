/* __kit_guard__ */
(function(){ var __s=document.currentScript; if (__s && /_ds_bundle\.js/.test(__s.src||'')) return;
/* app.jsx — orchestrates the myJob recruiting workspace for two roles. */
const A = window.BewerbungstoolDesignSystem_a75119;

const VERMITTLER_NAV = [
  { id: 'mandate', label: 'Mandate', icon: 'briefcase' },
  { id: 'pool', label: 'Talent-Pool', icon: 'users' },
  { id: 'platzierungen', label: 'Platzierungen', icon: 'award' },
  { id: 'berichte', label: 'Berichte', icon: 'trend' },
  { id: 'postfach', label: 'Postfach', icon: 'inbox' },
];

const TITLES = {
  hr: {
    pipeline: ['Pipeline', 'Alle Kandidat:innen über die Phasen ziehen'],
    talente: ['Talente', 'Durchsuchbare Liste aller Bewerbungen'],
    stellen: ['Stellen', 'Offene Positionen und ihre Pipelines'],
    berichte: ['Berichte', 'Funnel, Quellen und Kennzahlen'],
    postfach: ['Postfach', 'Nachrichten von Kandidat:innen'],
  },
  vermittler: {
    mandate: ['Mandate', 'Suchaufträge je Kunde mit Provision und Frist'],
    pool: ['Talent-Pool', 'Eigener Kandidaten-Pool und Verfügbarkeit'],
    platzierungen: ['Platzierungen', 'Gebuchte Vermittlungen und Provision'],
    berichte: ['Berichte', 'Provision, Mandate und Auslastung'],
    postfach: ['Postfach', 'Nachrichten von Kandidat:innen'],
  },
};

function App() {
  const [role, setRole] = React.useState('hr');
  const [nav, setNav] = React.useState('pipeline');
  const [search, setSearch] = React.useState('');
  const [selected, setSelected] = React.useState(null);
  const [candidates, setCandidates] = React.useState(window.CANDIDATES);

  const navItems = role === 'hr' ? window.HR_NAV : VERMITTLER_NAV;

  const switchRole = (r) => {
    setRole(r);
    setNav(r === 'hr' ? 'pipeline' : 'mandate');
    setSelected(null);
  };

  const visible = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return candidates;
    return candidates.filter((c) => (c.name + ' ' + c.role + ' ' + c.position).toLowerCase().includes(q));
  }, [candidates, search]);

  const open = (id) => setSelected(id);
  const close = () => setSelected(null);
  const advance = (id) => {
    setCandidates((cs) => cs.map((c) => {
      if (c.id !== id) return c;
      const i = window.STAGES_ORDER.indexOf(c.status);
      const next = window.STAGES_ORDER[Math.min(i + 1, window.STAGES_ORDER.length - 1)];
      return { ...c, status: next };
    }));
  };
  const reject = (id) => {
    setCandidates((cs) => cs.map((c) => c.id === id ? { ...c, status: 'rejected' } : c));
    close();
  };

  const cand = candidates.find((c) => c.id === selected);
  const [title, subtitle] = TITLES[role][nav] || ['', ''];

  const ACTION_LABEL = {
    pipeline: 'Kandidat:in', stellen: 'Stelle anlegen',
    mandate: 'Mandat anlegen', pool: 'Talent hinzufügen', platzierungen: 'Platzierung buchen',
  };
  const actions = ACTION_LABEL[nav]
    ? <A.Button variant="primary" size="sm" iconLeft={<A.Icon name="plus" size={15} />}>{ACTION_LABEL[nav]}</A.Button>
    : null;

  return (
    <window.AppShell active={nav} onNav={setNav} navItems={navItems} role={role} onRole={switchRole} search={search} onSearch={setSearch} title={title} subtitle={subtitle} actions={actions}>
      {/* HR workflow */}
      {role === 'hr' && nav === 'pipeline' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', height: '100%' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', flexShrink: 0 }}>
            {window.KPIS.map((k, i) => <A.StatCard key={i} {...k} />)}
          </div>
          <div style={{ flex: 1, minHeight: 0 }}>
            <window.PipelineBoard candidates={visible} onOpen={open} />
          </div>
        </div>
      )}
      {role === 'hr' && nav === 'talente' && <window.CandidateList candidates={visible} onOpen={open} />}
      {role === 'hr' && nav === 'stellen' && <window.JobsView jobs={window.JOBS} candidates={candidates} onOpen={open} />}
      {role === 'hr' && nav === 'berichte' && <window.ReportsView candidates={candidates} kpis={window.KPIS} />}

      {/* Vermittler workflow */}
      {role === 'vermittler' && nav === 'mandate' && <window.MandateView clients={window.CLIENTS} mandates={window.MANDATES} />}
      {role === 'vermittler' && nav === 'pool' && <window.PoolView pool={window.POOL} candidates={candidates} onOpen={open} />}
      {role === 'vermittler' && nav === 'platzierungen' && <window.PlatzierungenView placements={window.PLACEMENTS} candidates={candidates} kpis={window.VERMITTLER_KPIS} />}
      {role === 'vermittler' && nav === 'berichte' && <window.VermittlerReports clients={window.CLIENTS} mandates={window.MANDATES} placements={window.PLACEMENTS} kpis={window.VERMITTLER_KPIS} />}

      {/* shared */}
      {nav === 'postfach' && <window.Inbox candidates={candidates} onOpen={open} />}

      {cand && <window.CandidateDetail c={cand} onClose={close} onAdvance={advance} onReject={reject} />}
    </window.AppShell>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);

})();
