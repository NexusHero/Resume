/* ApplyModal — unified application builder: AI tailoring, attachments, and recipient setup. */
const AM = window.MyJobDesignSystem_5611b7;

function ApplyModal({ target, onClose, onApply }) {
  // Can be called with either target={job, cand} (from Matching) or target={talent} (from profile)
  const cand = target.cand || target.talent;
  const job = target.job || { company: '', title: '', location: '', req: [] };
  
  const { isMobile } = window.useViewport ? window.useViewport() : { isMobile: false };
  const canPersist = !!cand.id;

  const [loading, setLoading] = React.useState(true);
  const [docs, setDocs] = React.useState(null);
  
  // Recipient state
  const [rcpt, setRcpt] = React.useState({ 
    company: job.company || '', 
    subject: job.title ? `Bewerbung als ${job.title}` : '', 
    contact: '', 
    plzOrt: job.location || '' 
  });
  const setR = (k, v) => setRcpt((s) => ({ ...s, [k]: v }));

  // AI Tailoring state
  const [summary, setSummary] = React.useState('');
  const [paragraphs, setParagraphs] = React.useState([]);

  // Attachments state
  const [attachments, setAttachments] = React.useState(cand.attachments || []);
  const [picked, setPicked] = React.useState(() => new Set());
  const [letterEnabled, setLetterEnabled] = React.useState(true);

  const [busy, setBusy] = React.useState(false);
  const [aiBusy, setAiBusy] = React.useState(false);
  
  const dialogRef = React.useRef(null);
  if (window.useDialog) window.useDialog(dialogRef, onClose);
  
  const toggle = (id) => setPicked((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });

  React.useEffect(() => {
    let alive = true;
    if (!canPersist) {
      setLoading(false);
      return;
    }
    Promise.all([
      window.RecruitApi.getTalentDocuments(cand.id).catch(() => null),
      window.RecruitApi.listAttachments(cand.id).catch(() => [])
    ]).then(([d, list]) => {
      if (!alive) return;
      if (d) {
        setDocs(d);
        if (d.resume) setSummary(d.resume.summary || '');
        if (d.letter) setParagraphs(d.letter.absaetze || []);
      }
      setAttachments(list);
      setPicked(new Set(list.map((a) => a.id)));
      setLoading(false);
    });
    return () => { alive = false; };
  }, [cand.id, canPersist]);

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
      const att = await window.RecruitApi.uploadAttachment(cand.id, { name: file.name, contentType: file.type || 'application/pdf', dataBase64 });
      setAttachments((s) => [...s, att]);
      setPicked((s) => new Set(s).add(att.id));
    } catch {
      window.alert(`„${file.name}“ konnte nicht hochgeladen werden. Bitte erneut versuchen.`);
    }
    setBusy(false);
  };

  const runAi = async () => {
    if (aiBusy) return;
    setAiBusy(true);
    try {
      const summarySug = await window.RecruitApi.suggestDocument(cand.id, 'summary');
      if (summarySug && summarySug.text) setSummary(summarySug.text);

      const letterSug = await window.RecruitApi.suggestDocument(cand.id, 'letter', {
        company: rcpt.company || job.company,
        role: rcpt.subject || job.title,
        jobText: Array.isArray(job.req) ? job.req.join('\n') : ''
      });
      if (letterSug && letterSug.paragraphs) setParagraphs(letterSug.paragraphs);
    } catch (e) {
      if (window.showToast) window.showToast('KI-Anpassung fehlgeschlagen.', 'error');
    }
    setAiBusy(false);
  };

  const getTailoredDocs = () => {
    if (!docs) return null;
    return {
      ...docs,
      resume: { ...docs.resume, summary },
      letter: letterEnabled ? { ...docs.letter, absaetze: paragraphs } : { ...docs.letter, absaetze: [] }
    };
  };

  const getPdfBlob = async () => {
    const tailoredDocs = getTailoredDocs();
    return await window.RecruitApi.talentDossierPreviewPdf(cand.id, tailoredDocs, {
      company: rcpt.company,
      subject: rcpt.subject,
      contact: rcpt.contact,
      plzOrt: rcpt.plzOrt,
      attachments: [...picked].join(',')
    });
  };

  const getZipBlob = async () => {
    const tailoredDocs = getTailoredDocs();
    return await window.RecruitApi.talentDossierPreviewZip(cand.id, tailoredDocs, {
      company: rcpt.company,
      subject: rcpt.subject,
      contact: rcpt.contact,
      plzOrt: rcpt.plzOrt,
      attachments: [...picked].join(',')
    });
  };

  const handleApply = async () => {
    if (busy || !onApply) return;
    setBusy(true);
    try {
      let pdfBase64 = null;
      if (docs) {
        const blob = await getPdfBlob();
        pdfBase64 = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result.split(',')[1]);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      }
      
      const applicationJob = {
        company: rcpt.company || job.company,
        title: rcpt.subject || job.title,
        location: rcpt.plzOrt || job.location,
        url: job.url || '',
        id: job.id || 'manual'
      };
      
      await onApply(applicationJob, cand, pdfBase64);
      if (window.showToast) window.showToast('Bewerbung erfasst.', 'info');
      onClose();
    } catch (e) {
      if (window.showToast) window.showToast('Bewerbung fehlgeschlagen.', 'error');
      setBusy(false);
    }
  };

  const handleDownload = async () => {
    if (!canPersist || !docs) return;
    setBusy(true);
    try {
      const blob = await getZipBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Bewerbung_${cand.name.replace(/\s+/g, '_')}.zip`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (e) {
      if (window.showToast) window.showToast('Download fehlgeschlagen.', 'error');
    }
    setBusy(false);
  };

  const docCount = 1 + (letterEnabled ? 1 : 0) + picked.size;

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(8,11,18,0.45)', backdropFilter: 'blur(2px)', zIndex: 50, animation: 'fadeIn .2s ease' }} />
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-label="Bewerbung vorbereiten" style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 51, width: 'min(960px, 94vw)', maxHeight: '90vh', display: 'flex', flexDirection: 'column', background: 'var(--surface-card)', borderRadius: 'var(--radius-xl)', boxShadow: 'var(--shadow-lg)', overflow: 'hidden', animation: 'popIn .24s cubic-bezier(0.16,1,0.3,1)' }}>
        
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '13px', padding: '18px 22px', borderBottom: '1px solid var(--border)' }}>
          <span style={{ width: '38px', height: '38px', borderRadius: 'var(--radius-md)', background: 'var(--accent)', color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}><AM.Icon name="send" size={18} /></span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '17px', fontWeight: 700, color: 'var(--text-heading)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              Bewerbung erfassen
            </div>
            <div style={{ fontSize: '12.5px', color: 'var(--text-soft)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              für {cand.name}
            </div>
          </div>
          <AM.IconButton icon="x" label="Schließen" variant="ghost" onClick={onClose} />
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 22px', display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '320px 1fr', gap: '24px', alignItems: 'start' }}>
          
          {/* Left Column: Job Info & Recipient */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-soft)', marginBottom: '8px' }}>Empfänger</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <AM.Input label="Firma" value={rcpt.company} onChange={(e) => setR('company', e.target.value)} placeholder="Firma" />
                <AM.Input label="Position" value={rcpt.subject} onChange={(e) => setR('subject', e.target.value)} placeholder="Position" />
                <AM.Input label="Ansprechpartner" value={rcpt.contact} onChange={(e) => setR('contact', e.target.value)} placeholder="Ansprechpartner" />
                <AM.Input label="PLZ & Ort" value={rcpt.plzOrt} onChange={(e) => setR('plzOrt', e.target.value)} placeholder="PLZ & Ort" />
              </div>
            </div>

            <div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-soft)', marginBottom: '8px' }}>KI-Assistenz</div>
              <button onClick={runAi} disabled={aiBusy || !canPersist || loading} style={{ appearance: 'none', width: '100%', cursor: (aiBusy || !canPersist || loading) ? 'default' : 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '10px 14px', background: 'var(--surface-sunk)', border: '1px solid var(--border-strong)', borderRadius: 'var(--radius-md)', color: 'var(--text-heading)', fontSize: '13px', fontWeight: 500, transition: 'all .2s' }}>
                <AM.Icon name="zap" size={15} style={{ color: 'var(--accent-strong)' }} />
                {aiBusy ? 'Passe Unterlagen an…' : 'Texte für Empfänger anpassen'}
              </button>
              <div style={{ fontSize: '11.5px', color: 'var(--text-soft)', marginTop: '8px', lineHeight: 1.4 }}>
                Passt Anschreiben und Profil auf die Zielposition an. Originale bleiben unberührt.
              </div>
            </div>
            
            {/* Attachments */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-soft)' }}>Anhänge</span>
                {canPersist && (
                  <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: busy ? 'wait' : 'pointer', fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--accent-strong)' }}>
                    <AM.Icon name="plus" size={13} /> {busy ? 'Lädt…' : 'PDF hochladen'}
                    <input type="file" accept="application/pdf" onChange={onUpload} disabled={busy} style={{ display: 'none' }} />
                  </label>
                )}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {attachments.map((a) => {
                  const on = picked.has(a.id);
                  const kb = a.size ? `${Math.max(1, Math.round(a.size / 1024))} KB` : (a.tag || '');
                  return (
                    <label key={a.id} style={{ display: 'flex', alignItems: 'center', gap: '11px', padding: '10px 13px', border: `1px solid ${on ? 'var(--accent-border)' : 'var(--border)'}`, borderRadius: 'var(--radius-md)', background: on ? 'var(--accent-soft)' : 'var(--surface-card)', cursor: 'pointer' }}>
                      <AM.Checkbox checked={on} onChange={() => toggle(a.id)} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-heading)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.name}</div>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10.5px', color: 'var(--text-soft)' }}>{kb}</div>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right Column: Document Preview */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', minWidth: 0 }}>
            {loading ? (
              <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-soft)' }}>Lade Dokumente…</div>
            ) : !canPersist ? (
              <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-soft)' }}>Für das gepinnte Profil nicht verfügbar.</div>
            ) : (
              <>
                {/* CV Summary Preview */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-soft)' }}>Lebenslauf-Profil</div>
                  </div>
                  <div style={{ background: 'var(--surface-subtle)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '14px', fontSize: '13px', lineHeight: 1.6, color: 'var(--text-heading)' }}>
                    {summary || <span style={{ color: 'var(--text-muted)' }}>Kein Profiltext vorhanden.</span>}
                  </div>
                </div>

                {/* Cover Letter Preview */}
                <div>
                  <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px', cursor: 'pointer' }}>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-soft)' }}>Anschreiben-Text</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--text-muted)' }}>
                      In Mappe inkludieren
                      <AM.Switch checked={letterEnabled} onChange={setLetterEnabled} />
                    </div>
                  </label>
                  <div style={{ background: 'var(--surface-subtle)', border: `1px solid ${letterEnabled ? 'var(--border)' : 'var(--border-subtle)'}`, borderRadius: 'var(--radius-md)', padding: '14px', fontSize: '13px', lineHeight: 1.6, color: letterEnabled ? 'var(--text-heading)' : 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '12px', opacity: letterEnabled ? 1 : 0.6 }}>
                    {paragraphs.length > 0 ? (
                      paragraphs.map((p, i) => <div key={i}>{p}</div>)
                    ) : (
                      <span style={{ color: 'var(--text-muted)' }}>Kein Anschreiben vorhanden.</span>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', alignItems: 'center', justifySelf: 'flex-end', justifyContent: 'space-between', padding: '14px 22px', borderTop: '1px solid var(--border)', background: 'var(--surface-subtle)' }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-muted)' }}>{docCount} Dokumente · 1 PDF</span>
          <div style={{ display: 'flex', gap: '10px' }}>
            <AM.Button variant="ghost" size="sm" onClick={onClose} disabled={busy}>Abbrechen</AM.Button>
            {canPersist && (
              <AM.Button variant="outline" size="sm" iconLeft={<AM.Icon name="download" size={14} />} onClick={handleDownload} disabled={busy || loading}>
                Als ZIP laden
              </AM.Button>
            )}
            {onApply && (
              <AM.Button variant="primary" size="sm" iconLeft={<AM.Icon name="send" size={14} />} onClick={handleApply} disabled={busy || loading || !canPersist}>
                {busy ? 'Bewerbung läuft…' : 'Im System speichern'}
              </AM.Button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

Object.assign(window, { ApplyModal });
