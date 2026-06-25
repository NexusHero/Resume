/* MappeModal — assemble a Bewerbungsmappe: recipient + Lebenslauf + Anhänge + Anschreiben.
   This is the flow the old "3 Kacheln" should have been. */
const MM = window.BewerbungstoolDesignSystem_a75119;

function MappeModal({ talent, onClose }) {
  const [picked, setPicked] = React.useState(() => new Set(talent.attachments.map((a) => a.id)));
  const [letter, setLetter] = React.useState(true);
  const toggle = (id) => setPicked((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const count = (talent.resume ? 1 : 0) + (letter ? 1 : 0) + picked.size;

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(8,11,18,0.45)', backdropFilter: 'blur(2px)', zIndex: 50, animation: 'fadeIn .2s ease' }} />
      <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 51, width: 'min(880px, 94vw)', maxHeight: '90vh', display: 'flex', flexDirection: 'column', background: 'var(--surface-card)', borderRadius: 'var(--radius-xl)', boxShadow: 'var(--shadow-lg)', overflow: 'hidden', animation: 'popIn .24s cubic-bezier(0.16,1,0.3,1)' }}>
        {/* header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '13px', padding: '18px 22px', borderBottom: '1px solid var(--border)' }}>
          <span style={{ width: '38px', height: '38px', borderRadius: 'var(--radius-md)', background: 'var(--accent)', color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}><MM.Icon name="send" size={18} /></span>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '17px', fontWeight: 700, color: 'var(--text-heading)' }}>Create application dossier</div>
            <div style={{ fontSize: '12.5px', color: 'var(--text-soft)' }}>for {talent.name}</div>
          </div>
          <MM.IconButton icon="x" label="Close" variant="ghost" onClick={onClose} />
        </div>

        {/* body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 22px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', alignItems: 'start' }}>
          {/* left: recipient */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '13px' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-soft)' }}>Recipient</div>
            <MM.Input label="Company" icon="building" defaultValue="Aurora Systems GmbH" />
            <MM.Input label="Position" icon="briefcase" defaultValue="Senior C++ Engineer" />
            <MM.Input label="Contact person" icon="user" defaultValue="Personalabteilung" />
            <MM.Input label="ZIP & city" icon="pin" defaultValue="10115 Berlin" />
          </div>

          {/* right: contents */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '13px' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-soft)' }}>Dossier contents</div>

            {/* CV — always included */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '11px', padding: '11px 13px', border: '1px solid var(--accent-border)', borderRadius: 'var(--radius-md)', background: 'var(--accent-soft)' }}>
              <MM.Icon name="fileText" size={17} style={{ color: 'var(--accent-strong)' }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-heading)' }}>Resume</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10.5px', color: 'var(--accent-strong)' }}>always included</div>
              </div>
              <MM.Icon name="check" size={16} strokeWidth={2.6} style={{ color: 'var(--accent-strong)' }} />
            </div>

            {/* Anschreiben toggle */}
            <label style={{ display: 'flex', alignItems: 'center', gap: '11px', padding: '11px 13px', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', cursor: 'pointer' }}>
              <MM.Icon name="edit" size={17} style={{ color: 'var(--text-muted)' }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-heading)' }}>Cover letter</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10.5px', color: 'var(--text-soft)' }}>tailored to the role</div>
              </div>
              <MM.Switch checked={letter} onChange={setLetter} />
            </label>

            {/* attachments to link */}
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-soft)', marginTop: '2px' }}>Link attachments</div>
            {talent.attachments.map((a) => {
              const on = picked.has(a.id);
              return (
                <label key={a.id} style={{ display: 'flex', alignItems: 'center', gap: '11px', padding: '10px 13px', border: `1px solid ${on ? 'var(--accent-border)' : 'var(--border)'}`, borderRadius: 'var(--radius-md)', background: on ? 'var(--accent-soft)' : 'var(--surface-card)', cursor: 'pointer' }}>
                  <MM.Checkbox checked={on} onChange={() => toggle(a.id)} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-heading)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.name}</div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10.5px', color: 'var(--text-soft)' }}>{a.tag}</div>
                  </div>
                </label>
              );
            })}
          </div>
        </div>

        {/* footer */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 22px', borderTop: '1px solid var(--border)', background: 'var(--surface-subtle)' }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-muted)' }}>{count} Dokumente · 1 PDF</span>
          <div style={{ display: 'flex', gap: '10px' }}>
            <MM.Button variant="ghost" onClick={onClose}>Cancel</MM.Button>
            <MM.Button variant="primary" iconRight={<MM.Icon name="arrowRight" size={15} />} onClick={onClose}>Send dossier</MM.Button>
          </div>
        </div>
      </div>
    </>
  );
}

Object.assign(window, { MappeModal });
