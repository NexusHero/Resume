/* __kit_guard__ */
(function(){ if (!window.__MYJOB_KIT_READY) return;
/* Bewerber app — applicant home (applications) + Bewerbungsmappe composer. */
const B = window.BewerbungstoolDesignSystem_a75119;

function Header({ tab, setTab }) {
  return (
    <header style={{ background: 'linear-gradient(165deg, var(--ink-850), var(--ink-900))', color: '#fff', padding: '22px 36px 0' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <img src="../../assets/logo/myjob-mark.svg" width="34" height="34" alt="" />
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '18px', letterSpacing: '-0.02em' }}><span style={{ color: 'var(--accent-on-dark)' }}>my</span>Job</div>
        <B.Badge variant="glass" size="sm">for applicants</B.Badge>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <B.IconButton icon="bell" label="Notifications" variant="glass" />
          <B.Avatar name={window.ME.name} src={window.ME.src} size="sm" />
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '17px', margin: '22px 0 18px' }}>
        <B.Avatar name={window.ME.name} src={window.ME.src} size={58} radius="var(--radius-lg)" />
        <div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '26px', fontWeight: 700, letterSpacing: '-0.025em' }}>{window.ME.name}</div>
          <div style={{ fontSize: '13.5px', color: 'var(--sidebar-muted)', marginTop: '2px' }}>{window.ME.role} · {window.ME.location}</div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: '4px' }}>
        {[['mappe', 'My applications'], ['neu', 'Create new dossier']].map(([id, lbl]) => (
          <button key={id} onClick={() => setTab(id)} style={{
            appearance: 'none', background: 'transparent', border: 'none', cursor: 'pointer',
            padding: '11px 16px', marginBottom: '-1px', fontFamily: 'var(--font-body)', fontSize: '14px', fontWeight: 600,
            color: tab === id ? '#fff' : 'var(--sidebar-soft)', borderBottom: `2px solid ${tab === id ? 'var(--accent-on-dark)' : 'transparent'}`,
          }}>{lbl}</button>
        ))}
      </div>
    </header>
  );
}

/* ---------- Applications list ---------- */
function ApplicationsView() {
  const apps = window.APPLICATIONS;
  const active = apps.filter((a) => a.status !== 'rejected' && a.status !== 'hired').length;
  return (
    <div style={{ maxWidth: '880px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '18px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px' }}>
        <B.StatCard label="Active applications" value={String(active)} icon="send" />
        <B.StatCard label="Interviewing" value={String(apps.filter((a) => a.status === 'interview').length)} icon="message" />
        <B.StatCard label="Angebote" value={String(apps.filter((a) => a.status === 'offer').length)} delta="+1" dir="up" icon="award" />
      </div>

      <B.Card pad={false} title="Verlauf" action={<B.Button size="sm" variant="outline" iconLeft={<B.Icon name="download" size={14} />}>Export</B.Button>}>
        {apps.map((a) => (
          <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: '15px', padding: '15px 18px', borderBottom: '1px solid var(--border)' }}>
            <div style={{ width: '42px', height: '42px', flexShrink: 0, borderRadius: 'var(--radius-md)', background: 'var(--surface-sunk)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
              <B.Icon name="building" size={20} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '15px', fontWeight: 700, color: 'var(--text-heading)' }}>{a.firma}</div>
              <div style={{ fontSize: '12.5px', color: 'var(--text-muted)', marginTop: '1px' }}>{a.stelle} · {a.ort}</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
              <B.StatusBadge status={a.status} size="sm" />
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-soft)' }}>{a.next}</span>
            </div>
          </div>
        ))}
      </B.Card>
    </div>
  );
}

/* ---------- Bewerbungsmappe composer ---------- */
function ComposerView() {
  const [docs, setDocs] = React.useState(window.DOCS);
  const move = (i, dir) => {
    setDocs((d) => {
      const n = [...d]; const j = i + dir;
      if (j < 0 || j >= n.length) return n;
      [n[i], n[j]] = [n[j], n[i]]; return n;
    });
  };
  const remove = (id) => setDocs((d) => d.filter((x) => x.id !== id));
  return (
    <div style={{ maxWidth: '880px', margin: '0 auto', display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: '18px', alignItems: 'start' }}>
      <B.Card title="Recipient" subtitle="An wen geht die Mappe?">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '13px' }}>
          <B.Input label="Company" icon="building" defaultValue="Aurora Systems GmbH" />
          <B.Input label="Position" icon="briefcase" defaultValue="Senior C++ Engineer" />
          <B.Input label="Contact person" icon="user" defaultValue="Personalabteilung" />
          <B.Input label="Referenz" defaultValue="REF-2026-481" />
          <B.Input label="Street & no." icon="pin" defaultValue="Lichtstrasse 12" />
          <B.Input label="ZIP & city" defaultValue="10115 Berlin" />
        </div>
      </B.Card>

      <B.Card title="Dokumente" subtitle="Reihenfolge der finalen PDF">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {docs.map((d, i) => (
            <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: '11px', padding: '10px 12px', border: `1px solid ${d.pinned ? 'var(--accent-border)' : 'var(--border)'}`, borderRadius: 'var(--radius-md)', background: d.pinned ? 'var(--accent-soft)' : 'var(--surface-card)' }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', fontWeight: 600, color: '#fff', background: 'var(--ink-900)', width: '20px', height: '20px', borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{i + 1}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-heading)' }}>{d.name}<span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--accent-strong)', marginLeft: '7px' }}>{d.tag}</span></div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-soft)' }}>{d.sub}</div>
              </div>
              <div style={{ display: 'flex', gap: '3px' }}>
                <B.IconButton icon="chevronUp" label="High" variant="ghost" size="sm" onClick={() => move(i, -1)} disabled={i === 0} />
                <B.IconButton icon="chevronDown" label="Runter" variant="ghost" size="sm" onClick={() => move(i, 1)} disabled={i === docs.length - 1} />
                <B.IconButton icon="trash" label="Remove" variant="ghost" size="sm" onClick={() => remove(d.id)} disabled={d.pinned} />
              </div>
            </div>
          ))}
        </div>
        <div style={{ marginTop: '12px', border: '2px dashed var(--border-strong)', borderRadius: 'var(--radius-md)', padding: '18px', textAlign: 'center' }}>
          <B.Button variant="ink" size="sm" iconLeft={<B.Icon name="upload" size={14} />}>Add PDF</B.Button>
          <div style={{ fontSize: '12px', color: 'var(--text-soft)', marginTop: '8px' }}>oder Dateien hierher ziehen</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '16px' }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-muted)' }}>{docs.length} Dokumente</span>
          <B.Button variant="primary" iconRight={<B.Icon name="arrowRight" size={15} />}>Create dossier</B.Button>
        </div>
      </B.Card>
    </div>
  );
}

function BewerberApp() {
  const [tab, setTab] = React.useState('mappe');
  return (
    <div style={{ minHeight: '100vh', background: 'var(--surface-app)' }}>
      <Header tab={tab} setTab={setTab} />
      <main style={{ padding: '28px 36px 60px' }}>
        {tab === 'mappe' ? <ApplicationsView /> : <ComposerView />}
      </main>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<BewerberApp />);

})();
