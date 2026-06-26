/* CreateApplication — build an application from a job posting:
   choose documents, draft the Anschreiben, set salary, then remember it.
   Sending is for later — this saves it as an "Entwurf" in your tracker. */
const CA = window.MyJobDesignSystem_f3658e;

const DOC_OPTIONS = [
  { code: 'cv', label: 'Lebenslauf', icon: 'fileText', hint: 'Aktuelle Version' },
  { code: 'anschreiben', label: 'Anschreiben', icon: 'edit', hint: 'Auf die Stelle angepasst' },
  { code: 'mappe', label: 'Bewerbungsmappe (PDF)', icon: 'paperclip', hint: 'Alles in einem Dokument' },
  { code: 'zeugnisse', label: 'Zeugnisse', icon: 'award', hint: 'Arbeits- & Studienzeugnisse' },
  { code: 'portfolio', label: 'Portfolio / GitHub', icon: 'code', hint: 'Code-Beispiele' },
];

function CreateApplication({ job, onClose, onSave }) {
  const { anschreibenTemplate, makeDraft } = window.KarriereData;
  const [docs, setDocs] = React.useState({ cv: true, anschreiben: true, mappe: false, zeugnisse: false, portfolio: false });
  const [anschreiben, setAnschreiben] = React.useState(() => anschreibenTemplate(job));
  const [salary, setSalary] = React.useState('');
  const [notes, setNotes] = React.useState('');
  const toggle = (code) => setDocs((d) => ({ ...d, [code]: !d[code] }));
  const chosen = Object.keys(docs).filter((k) => docs[k]);

  const save = () => {
    onSave(makeDraft(job, { docs: chosen.length ? chosen : ['cv'], salary, notes, anschreiben }));
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(8,11,18,0.55)', backdropFilter: 'blur(3px)', animation: 'kfade var(--dur-fast) var(--ease-out)' }} />
      <div style={{ position: 'relative', width: '580px', maxWidth: '100%', maxHeight: '88vh', display: 'flex', flexDirection: 'column', background: 'var(--surface-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-xl)', boxShadow: 'var(--shadow-lg)', overflow: 'hidden', animation: 'kpop var(--dur-med) var(--ease-out)' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '13px' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: 'var(--radius-md)', background: job.tile, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '14px', flexShrink: 0 }}>{job.company.split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase()}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '17px', fontWeight: 700, color: 'var(--text-heading)' }}>Bewerbung erstellen</div>
            <div style={{ fontSize: '12.5px', color: 'var(--text-soft)' }}>{job.role} · {job.company} · {job.city}</div>
          </div>
          <CA.IconButton icon="x" label="Schließen" variant="ghost" onClick={onClose} />
        </div>

        <div style={{ padding: '20px 24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '22px' }}>
          <section>
            <h4 style={{ fontFamily: 'var(--font-mono)', fontSize: '10.5px', letterSpacing: 'var(--ls-wide)', textTransform: 'uppercase', color: 'var(--text-soft)', margin: '0 0 12px' }}>Unterlagen für die Mappe</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {DOC_OPTIONS.map((o) => {
                const on = docs[o.code];
                return (
                  <button key={o.code} onClick={() => toggle(o.code)} style={{ display: 'flex', alignItems: 'center', gap: '12px', textAlign: 'left', padding: '11px 13px', borderRadius: 'var(--radius-md)', cursor: 'pointer', background: on ? 'var(--accent-soft)' : 'var(--surface-subtle)', border: `1px solid ${on ? 'var(--accent-border)' : 'var(--border)'}`, transition: 'all var(--dur-fast) var(--ease-out)' }}>
                    <span style={{ width: '34px', height: '34px', borderRadius: 'var(--radius-sm)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: on ? 'var(--accent)' : 'var(--surface-card)', color: on ? 'var(--accent-contrast)' : 'var(--text-soft)', border: on ? 'none' : '1px solid var(--border)' }}><CA.Icon name={o.icon} size={16} /></span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--text-heading)' }}>{o.label}</div>
                      <div style={{ fontSize: '11.5px', color: 'var(--text-soft)' }}>{o.hint}</div>
                    </div>
                    <span style={{ width: '20px', height: '20px', borderRadius: 'var(--radius-xs)', display: 'flex', alignItems: 'center', justifyContent: 'center', background: on ? 'var(--accent)' : 'transparent', border: on ? 'none' : '1.5px solid var(--border-strong)', color: '#fff', flexShrink: 0 }}>{on && <CA.Icon name="check" size={13} strokeWidth={2.6} />}</span>
                  </button>
                );
              })}
            </div>
          </section>

          <CA.Textarea label="Anschreiben" rows={6} value={anschreiben} onChange={(e) => setAnschreiben(e.target.value)} hint="Vorlage automatisch befüllt — frei anpassbar." />

          <CA.Input label="Gehaltswunsch (optional)" icon="zap" placeholder="z. B. 88.000 €" value={salary} onChange={(e) => setSalary(e.target.value)} />

          <CA.Textarea label="Notiz für dich (optional)" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} hint="Nur für dich sichtbar — z. B. woher du den Job hast." />
        </div>

        <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border)', background: 'var(--surface-subtle)', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '7px', fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-soft)', flex: 1, whiteSpace: 'nowrap' }}>
            <CA.Icon name="info" size={14} />{chosen.length} Unterlage{chosen.length === 1 ? '' : 'n'} · senden später
          </div>
          <CA.Button variant="ghost" onClick={onClose}>Abbrechen</CA.Button>
          <CA.Button variant="primary" iconLeft={<CA.Icon name="bookmark" size={15} />} onClick={save}>Vormerken</CA.Button>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { KCreateApplication: CreateApplication });
