/* myJob · Karriere — app wiring: nav state, light/dark mode, direction,
   live applications (create from Jobsuche), and the shared slide-overs. */
const KA = window.MyJobDesignSystem_f3658e;

const TITLES = {
  uebersicht: { t: 'Übersicht', s: 'Dein Karriere-Überblick auf einen Blick' },
  jobsuche: { t: 'Jobsuche', s: 'Jobs nach Land, Stadt & Suchbegriff finden — live aus verbundenen Quellen' },
  jobquellen: { t: 'Jobquellen', s: 'Jobbörsen & APIs verbinden, um Stellen automatisch zu holen' },
  bewerbungen: { t: 'Bewerbungen', s: 'Jede Bewerbung — erstellt, vorgemerkt, gesendet. Damit du keine vergisst' },
  stellen: { t: 'Meine Stellen', s: 'Arbeitshistorie & was du bisher verdient hast' },
};

function load(k, d) { try { return localStorage.getItem(k) || d; } catch (e) { return d; } }

function App() {
  const { ME, APPLICATIONS, PROVIDERS } = window.KarriereData;
  const [active, setActive] = React.useState('uebersicht');
  const [mode, setMode] = React.useState(() => load('karriere.mode', 'light'));
  const [direction, setDirection] = React.useState(() => load('karriere.dir', 'rail'));
  const [apps, setApps] = React.useState(APPLICATIONS);
  const [providers, setProviders] = React.useState(PROVIDERS);
  const [openApp, setOpenApp] = React.useState(null);
  const [openPos, setOpenPos] = React.useState(null);
  const [toast, setToast] = React.useState(null);
  const [settingsOpen, setSettingsOpen] = React.useState(false);

  React.useEffect(() => { try { localStorage.setItem('karriere.mode', mode); } catch (e) {} }, [mode]);
  React.useEffect(() => { try { localStorage.setItem('karriere.dir', direction); } catch (e) {} }, [direction]);
  React.useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(null), 3200); return () => clearTimeout(t); }, [toast]);

  const awaiting = apps.filter((a) => a.awaiting).length;
  const drafts = apps.filter((a) => a.draft).length;
  const meta = TITLES[active];
  const nav = (id) => { setActive(id); setOpenApp(null); setOpenPos(null); };

  const addApp = (draft) => {
    setApps((prev) => [draft, ...prev]);
    setActive('bewerbungen');
    setOpenApp(draft.id);
    setToast({ icon: 'checkCircle', text: `Bewerbung für ${draft.company} vorgemerkt.` });
  };
  const markSent = (id) => {
    setApps((prev) => prev.map((a) => a.id === id ? {
      ...a, draft: false, status: 'new', statusLabel: 'Gesendet', sent: a.created || '2026-06-26', awaiting: true,
      nextStep: 'Warten auf Eingangsbestätigung.',
      timeline: [...a.timeline, { date: a.created || '2026-06-26', label: 'Als gesendet markiert', kind: 'ack' }],
    } : a));
    setToast({ icon: 'send', text: 'Als gesendet markiert.' });
  };
  const toggleProvider = (id, connected) => {
    setProviders((prev) => prev.map((p) => p.id === id ? {
      ...p, connected, jobs: connected ? (p.jobs || (p.id === 'remotive' ? 1 : 2)) : 0, lastSync: connected ? 'gerade eben' : null,
    } : p));
    const prov = providers.find((p) => p.id === id);
    setToast(connected
      ? { icon: 'checkCircle', text: `${prov ? prov.name : 'Quelle'} verbunden — Jobs werden geladen.` }
      : { icon: 'info', text: `${prov ? prov.name : 'Quelle'} getrennt.` });
  };

  return (
    <window.KShell
      theme="blueprint" mode={mode} direction={direction}
      onMode={setMode} onDirection={setDirection}
      active={active} onNav={nav} me={ME}
      badges={{ bewerbungen: awaiting + drafts }}
      title={meta.t} subtitle={meta.s}
      onSettings={() => setSettingsOpen(true)}
      actions={active !== 'jobsuche' ? <KA.Button size="sm" variant="primary" iconLeft={<KA.Icon name="search" size={14} />} onClick={() => nav('jobsuche')}>Jobs finden</KA.Button> : null}
    >
      {active === 'uebersicht' && (
        <window.KUebersicht apps={apps} onNav={nav} onOpenApp={(id) => { setActive('bewerbungen'); setOpenApp(id); }} />
      )}
      {active === 'jobsuche' && (
        <window.KJobsuche onCreate={addApp} providers={providers} onManageSources={() => nav('jobquellen')} />
      )}
      {active === 'jobquellen' && (
        <window.KJobquellen providers={providers} onToggle={toggleProvider} onFindJobs={() => nav('jobsuche')} />
      )}
      {active === 'bewerbungen' && (
        <window.KBewerbungen apps={apps} openId={openApp} onOpen={setOpenApp} onClose={() => setOpenApp(null)} onMarkSent={markSent} onFindJobs={() => nav('jobsuche')} />
      )}
      {active === 'stellen' && (
        <window.KStellen openId={openPos} onOpen={setOpenPos} onClose={() => setOpenPos(null)} />
      )}

      {settingsOpen && <window.KSettings onClose={() => setSettingsOpen(false)} />}

      {toast && (
        <div style={{ position: 'fixed', bottom: '24px', left: '50%', transform: 'translateX(-50%)', zIndex: 60, display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 18px', borderRadius: 'var(--radius-pill)', background: 'var(--ink-900)', color: '#fff', boxShadow: 'var(--shadow-lg)', animation: 'kpop var(--dur-med) var(--ease-out)' }}>
          <KA.Icon name={toast.icon} size={17} style={{ color: 'var(--accent-on-dark)' }} />
          <span style={{ fontSize: '13px', fontWeight: 500 }}>{toast.text}</span>
        </div>
      )}
    </window.KShell>
  );
}

Object.assign(window, { KApp: App });
