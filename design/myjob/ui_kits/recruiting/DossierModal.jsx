/* MappeModal — assemble a Bewerbungsmappe: recipient + Lebenslauf + Anhänge + Anschreiben.
   This is the flow the old "3 Kacheln" should have been. */
const MM = window.MyJobDesignSystem_5611b7;

function MappeModal({ talent, onClose }) {
  const { isMobile } = window.useViewport ? window.useViewport() : { isMobile: false };
  const canPersist = !!talent.id && talent.id !== 'me';
  const [attachments, setAttachments] = React.useState(talent.attachments || []);
  const [picked, setPicked] = React.useState(() => new Set());
  const [letter, setLetter] = React.useState(true);
  const [busy, setBusy] = React.useState(false);
  // Focus trap, Esc-to-close, focus-return (#203).
  const dialogRef = React.useRef(null);
  window.useDialog(dialogRef, onClose);
  const toggle = (id) => setPicked((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const count = 1 + (letter ? 1 : 0) + picked.size;

  // Load the talent's persisted attachments (server-backed talents only).
  React.useEffect(() => {
    let alive = true;
    if (!canPersist) return;
    window.RecruitApi.listAttachments(talent.id)
      .then((list) => { if (alive) { setAttachments(list); setPicked(new Set(list.map((a) => a.id))); } })
      .catch(() => {});
    return () => { alive = false; };
  }, [talent.id]);

  const onUpload = async (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!file || !canPersist) return;
    setBusy(true);
    try {
      const dataBase64 = await new Promise((res, rej) => {
        const r = new FileReader();
        r.onload = () => res(String(r.result).split(',')[1] || '');
        r.onerror = rej;
        r.readAsDataURL(file);
      });
      const att = await window.RecruitApi.uploadAttachment(talent.id, { name: file.name, contentType: file.type || 'application/pdf', dataBase64 });
      setAttachments((s) => [...s, att]);
      setPicked((s) => new Set(s).add(att.id));
    } catch {
      // eslint-disable-next-line no-alert
      window.alert(`„${file.name}“ konnte nicht hochgeladen werden. Bitte erneut versuchen.`);
    }
    setBusy(false);
  };

  // Recipient the cover letter is addressed to; drives the generated dossier.
  const [rcpt, setRcpt] = React.useState({ company: '', subject: '', contact: '', plzOrt: '' });
  const setR = (k, v) => setRcpt((s) => ({ ...s, [k]: v }));
  const createDossier = () => {
    if (canPersist) {
      const url = window.RecruitApi.talentDossierPdfUrl(talent.id, { ...rcpt, attachments: [...picked].join(',') });
      window.open(url, '_blank');
    }
    onClose();
  };

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(8,11,18,0.45)', backdropFilter: 'blur(2px)', zIndex: 50, animation: 'fadeIn .2s ease' }} />
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-label="Bewerbungsmappe zusammenstellen" style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 51, width: 'min(880px, 94vw)', maxHeight: '90vh', display: 'flex', flexDirection: 'column', background: 'var(--surface-card)', borderRadius: 'var(--radius-xl)', boxShadow: 'var(--shadow-lg)', overflow: 'hidden', animation: 'popIn .24s cubic-bezier(0.16,1,0.3,1)' }}>
        {/* header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '13px', padding: '18px 22px', borderBottom: '1px solid var(--border)' }}>
          <span style={{ width: '38px', height: '38px', borderRadius: 'var(--radius-md)', background: 'var(--accent)', color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}><MM.Icon name="send" size={18} /></span>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '17px', fontWeight: 700, color: 'var(--text-heading)' }}>Bewerbungsmappe erstellen</div>
            <div style={{ fontSize: '12.5px', color: 'var(--text-soft)' }}>für {talent.name}</div>
          </div>
          <MM.IconButton icon="x" label="Schließen" variant="ghost" onClick={onClose} />
        </div>

        {/* body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 22px', display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '20px', alignItems: 'start' }}>
          {/* left: recipient */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '13px' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-soft)' }}>Empfänger</div>
            <MM.Input label="Firma" icon="building" value={rcpt.company} onChange={(e) => setR('company', e.target.value)} placeholder="Aurora Systems GmbH" />
            <MM.Input label="Position" icon="briefcase" value={rcpt.subject} onChange={(e) => setR('subject', e.target.value)} placeholder="Senior C++ Engineer" />
            <MM.Input label="Ansprechpartner" icon="user" value={rcpt.contact} onChange={(e) => setR('contact', e.target.value)} placeholder="Personalabteilung" />
            <MM.Input label="PLZ & Ort" icon="pin" value={rcpt.plzOrt} onChange={(e) => setR('plzOrt', e.target.value)} placeholder="10115 Berlin" />
          </div>

          {/* right: contents */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '13px' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-soft)' }}>Inhalt der Mappe</div>

            {/* CV — always included */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '11px', padding: '11px 13px', border: '1px solid var(--accent-border)', borderRadius: 'var(--radius-md)', background: 'var(--accent-soft)' }}>
              <MM.Icon name="fileText" size={17} style={{ color: 'var(--accent-strong)' }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-heading)' }}>Lebenslauf</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10.5px', color: 'var(--accent-strong)' }}>immer dabei</div>
              </div>
              <MM.Icon name="check" size={16} strokeWidth={2.6} style={{ color: 'var(--accent-strong)' }} />
            </div>

            {/* Anschreiben toggle */}
            <label style={{ display: 'flex', alignItems: 'center', gap: '11px', padding: '11px 13px', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', cursor: 'pointer' }}>
              <MM.Icon name="edit" size={17} style={{ color: 'var(--text-muted)' }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-heading)' }}>Anschreiben</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10.5px', color: 'var(--text-soft)' }}>auf die Stelle zugeschnitten</div>
              </div>
              <MM.Switch checked={letter} onChange={setLetter} />
            </label>

            {/* attachments to link */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '2px' }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-soft)' }}>Anhänge</span>
              {canPersist && (
                <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: busy ? 'wait' : 'pointer', fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--accent-strong)' }}>
                  <MM.Icon name="plus" size={13} /> {busy ? 'Wird hochgeladen…' : 'PDF hochladen'}
                  <input type="file" accept="application/pdf" onChange={onUpload} disabled={busy} style={{ display: 'none' }} />
                </label>
              )}
            </div>
            {attachments.length === 0 && (
              <div style={{ fontSize: '12px', color: 'var(--text-soft)' }}>Noch keine Anhänge.</div>
            )}
            {attachments.map((a) => {
              const on = picked.has(a.id);
              const kb = a.size ? `${Math.max(1, Math.round(a.size / 1024))} KB` : (a.tag || '');
              return (
                <label key={a.id} style={{ display: 'flex', alignItems: 'center', gap: '11px', padding: '10px 13px', border: `1px solid ${on ? 'var(--accent-border)' : 'var(--border)'}`, borderRadius: 'var(--radius-md)', background: on ? 'var(--accent-soft)' : 'var(--surface-card)', cursor: 'pointer' }}>
                  <MM.Checkbox checked={on} onChange={() => toggle(a.id)} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-heading)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.name}</div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10.5px', color: 'var(--text-soft)' }}>{kb}</div>
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
            <MM.Button variant="ghost" onClick={onClose}>Abbrechen</MM.Button>
            <MM.Button variant="primary" iconRight={<MM.Icon name="arrowRight" size={15} />} onClick={createDossier}>Mappe erstellen</MM.Button>
          </div>
        </div>
      </div>
    </>
  );
}

Object.assign(window, { MappeModal });
