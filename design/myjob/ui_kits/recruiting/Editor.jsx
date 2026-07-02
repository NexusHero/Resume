/* Editor — the document workbench: form on the left, live document preview on
   the right. Two documents per talent: Lebenslauf (resume) and Anschreiben
   (cover letter). The bolt-on tools live in their own modules: previews in
   EditorDocs, the import/ATS/pitch/outreach modals in EditorModals, shared
   primitives (PillButton, ModalShell, honesty banners) in EditorShared —
   main.jsx loads all of them before this file. */
const ED = window.MyJobDesignSystem_f3658e;
const { PillButton: EdPill, ResumeDoc: EdResumeDoc, LetterDoc: EdLetterDoc, ImportCvModal: EdImportCvModal, AtsModal: EdAtsModal, PitchModal: EdPitchModal, OutreachModal: EdOutreachModal } = window;

/* CV style presets for the live customization bar (accent + font + size). */
const ED_ACCENTS = [
  { accent: '#2A6FDB', strong: '#1d4ed8', onDark: '#7aa7f5' },
  { accent: '#1F8A5B', strong: '#15734a', onDark: '#6ee7b7' },
  { accent: '#D97757', strong: '#b45309', onDark: '#f0a58a' },
  { accent: '#7C3AED', strong: '#6d28d9', onDark: '#c4b5fd' },
];

/* A titled block in the form column, with an optional add action. */
function FormGroup({ title, children, onAdd }) {
  return (
    <div style={{ marginBottom: '22px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '11px' }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>{title}</span>
        {onAdd && <ED.IconButton icon="plus" label="Add" variant="ghost" size="sm" onClick={onAdd} />}
      </div>
      {children}
    </div>
  );
}

function Editor({ talent, onClose, onCreateMappe }) {
  /* ---- Identity & persistence flags first — used by every handler below.
     The pinned "me" profile has no server row, so it stays local-only. ---- */
  const talentId = talent.id;
  const canPersist = !!talentId && talentId !== 'me';

  const [doc, setDoc] = React.useState('lebenslauf');
  const previewRef = React.useRef(null);
  const [scale, setScale] = React.useState(1);
  React.useEffect(() => {
    const el = previewRef.current; if (!el) return;
    const fit = () => { const w = el.clientWidth - 56; setScale(Math.min(1, w / 720)); };
    fit();
    const ro = new ResizeObserver(fit); ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const [contact, setContact] = React.useState({ name: talent.name, role: talent.role, email: talent.email, phone: talent.phone, location: talent.location, linkedin: talent.linkedin || '', src: talent.src });
  const [resume, setResume] = React.useState(() => JSON.parse(JSON.stringify(talent.resume || { summary: '', experience: [], education: [], skillGroups: [] })));
  const [letter, setLetter] = React.useState(() => JSON.parse(JSON.stringify(talent.letter || { firma: '', ansprechpartner: '', strasse: '', plzOrt: '', betreff: '', anrede: 'Dear Sir or Madam,', absaetze: [''], gruss: 'Kind regards' })));

  const setC = (k, v) => setContact((s) => ({ ...s, [k]: v }));
  const setExp = (i, k, v) => setResume((s) => { const e = [...s.experience]; e[i] = { ...e[i], [k]: v }; return { ...s, experience: e }; });
  const setEdu = (i, k, v) => setResume((s) => { const e = [...s.education]; e[i] = { ...e[i], [k]: v }; return { ...s, education: e }; });
  const addExp = () => setResume((s) => ({ ...s, experience: [{ role: 'New position', company: '', period: '', location: '', bullets: [''], skills: [] }, ...s.experience] }));
  const delExp = (i) => setResume((s) => ({ ...s, experience: s.experience.filter((_, j) => j !== i) }));
  const setPara = (i, v) => setLetter((s) => { const a = [...s.absaetze]; a[i] = v; return { ...s, absaetze: a }; });
  const addPara = () => setLetter((s) => ({ ...s, absaetze: [...s.absaetze, ''] }));

  /* ---- Magic: AI adjusts the active document. The suggestion is shown GREY
     and only applied on “Apply” (or discarded on “Discard”). ---- */
  const [gen, setGen] = React.useState(false);
  const [pending, setPending] = React.useState(null);
  const runAI = async () => {
    setGen(true);
    const action = doc === 'lebenslauf' ? 'summary' : 'letter';
    try {
      // The AI uses the candidate's own saved facts + the mandate/company on the
      // letter; for the pinned demo talent (no server row) there is no endpoint.
      const target = action === 'letter' ? { company: letter.firma, role: letter.betreff } : {};
      const s = await window.RecruitApi.suggestDocument(talentId, action, target);
      if (s.action === 'summary') setPending({ kind: 'summary', value: s.text });
      else setPending({ kind: 'letter', value: s.paragraphs });
    } catch {
      setPending(null);
    } finally {
      setGen(false);
    }
  };
  const acceptAI = () => {
    if (pending && pending.kind === 'summary') setResume((s) => ({ ...s, summary: pending.value }));
    if (pending && pending.kind === 'letter') setLetter((s) => ({ ...s, absaetze: pending.value }));
    setPending(null);
  };
  const cancelAI = () => setPending(null);

  /* live CV customization: template, accent colour, font family, size */
  const [cfg, setCfg] = React.useState({ template: 'classic', accent: '#2A6FDB', strong: '#1d4ed8', onDark: '#7aa7f5', font: 'var(--font-display)', size: 1 });

  /* ---- Persistence: load the stored documents on open, then autosave edits. ---- */
  const [saveState, setSaveState] = React.useState('idle'); // idle | saving | saved | error
  const loadedRef = React.useRef(false);
  const saveTimer = React.useRef(null);

  React.useEffect(() => {
    let alive = true;
    loadedRef.current = false;
    if (!canPersist) { loadedRef.current = true; return; }
    window.RecruitApi.getTalentDocuments(talentId)
      .then((d) => {
        if (!alive || !d) return;
        if (d.contact) setContact((s) => ({ ...s, ...d.contact }));
        if (d.resume) setResume(d.resume);
        if (d.letter) setLetter(d.letter);
        if (d.style) setCfg(d.style);
      })
      .catch(() => {})
      .finally(() => { if (alive) loadedRef.current = true; });
    return () => { alive = false; };
  }, [talentId]);

  React.useEffect(() => {
    if (!canPersist || !loadedRef.current) return;
    setSaveState('saving');
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      window.RecruitApi.saveTalentDocuments(talentId, { contact, resume, letter, style: cfg })
        .then(() => setSaveState('saved'))
        .catch(() => setSaveState('error'));
    }, 800);
    return () => clearTimeout(saveTimer.current);
  }, [contact, resume, letter, cfg, talentId]);

  const saveLabel = { saving: 'Saving…', saved: 'Saved', error: 'Not saved' };

  /* The import modal hands the parsed CV back here to fill the form. */
  const applyParsed = (parsed) => {
    if (parsed.contact) setContact((s) => ({ ...s, ...parsed.contact }));
    if (parsed.resume) setResume(parsed.resume);
  };

  /* ---- Translate: create the other-language variant of the documents ---- */
  const [translating, setTranslating] = React.useState('');
  const [translateMsg, setTranslateMsg] = React.useState(null);
  const runTranslate = async (lang) => {
    if (!canPersist || translating) return;
    setTranslating(lang);
    setTranslateMsg(null);
    try {
      const res = await window.RecruitApi.translateDocuments(talentId, lang);
      const name = lang === 'de' ? 'German' : 'English';
      setTranslateMsg({
        ok: true,
        text: res.created ? `${name} version created.` : `${name} version already exists.`,
      });
    } catch (e) {
      setTranslateMsg({ ok: false, text: (e && e.message) || 'Translation failed.' });
    }
    setTranslating('');
  };

  /* Which bolt-on tool is open — one at a time. */
  const [modal, setModal] = React.useState(null); // 'import' | 'ats' | 'pitch' | 'outreach' | null

  const seg = (id, label) => (
    <button onClick={() => setDoc(id)} style={{ flex: 1, padding: '8px 10px', border: 'none', cursor: 'pointer', borderRadius: 'var(--radius-sm)', fontFamily: 'var(--font-mono)', fontSize: '12px', fontWeight: 600, background: doc === id ? 'var(--surface-card)' : 'transparent', color: doc === id ? 'var(--text-heading)' : 'var(--text-soft)', boxShadow: doc === id ? 'var(--shadow-xs)' : 'none' }}>{label}</button>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '14px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', alignSelf: 'flex-start' }}>
        <button onClick={onClose} style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-muted)', padding: 0 }}>
          <ED.Icon name="arrowLeft" size={14} /> Back to profile
        </button>
        {canPersist && saveState !== 'idle' && (
          <span role="status" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontFamily: 'var(--font-mono)', fontSize: '11px', color: saveState === 'error' ? 'var(--danger)' : 'var(--text-soft)' }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: saveState === 'saved' ? 'var(--positive, #1F8A5B)' : saveState === 'error' ? 'var(--danger)' : 'var(--text-muted)' }} />
            {saveLabel[saveState]}
          </span>
        )}
        {canPersist && (
          <>
            <EdPill icon="upload" onClick={() => setModal('import')}>Import CV</EdPill>
            <EdPill icon="search" onClick={() => setModal('ats')}>ATS check</EdPill>
            <EdPill icon="briefcase" onClick={() => setModal('pitch')}>Pitch</EdPill>
            <EdPill icon="send" onClick={() => setModal('outreach')}>Outreach</EdPill>
            <EdPill icon="download" onClick={() => window.open(window.RecruitApi.talentDocumentsPdfUrl(talentId), '_blank')}>PDF</EdPill>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-soft)' }}>
                <ED.Icon name="globe" size={13} /> Translate
              </span>
              {[['en', 'EN'], ['de', 'DE']].map(([lang, label]) => (
                <EdPill
                  key={lang}
                  onClick={() => runTranslate(lang)}
                  disabled={!!translating}
                  title={`Translate the documents to ${lang === 'de' ? 'German' : 'English'}`}
                  style={{ fontWeight: 600, padding: '4px 10px', opacity: translating && translating !== lang ? 0.5 : 1 }}
                >
                  {translating === lang ? '…' : label}
                </EdPill>
              ))}
            </span>
          </>
        )}
      </div>

      {translateMsg && (
        <div
          role="status"
          style={{ alignSelf: 'flex-start', fontFamily: 'var(--font-mono)', fontSize: '11px', color: translateMsg.ok ? 'var(--positive, #1F8A5B)' : 'var(--danger)', background: translateMsg.ok ? 'var(--positive-soft, rgba(31,138,91,0.10))' : 'var(--danger-soft)', border: `1px solid ${translateMsg.ok ? 'var(--positive, #1F8A5B)' : 'var(--danger)'}`, borderRadius: 'var(--radius-md)', padding: '6px 12px' }}
        >
          {translateMsg.text}
        </div>
      )}

      {modal === 'import' && <EdImportCvModal talentId={talentId} onParsed={applyParsed} onClose={() => setModal(null)} />}
      {modal === 'ats' && <EdAtsModal talentId={talentId} onClose={() => setModal(null)} />}
      {modal === 'pitch' && <EdPitchModal talentId={talentId} onClose={() => setModal(null)} />}
      {modal === 'outreach' && <EdOutreachModal talentId={talentId} defaultEmail={contact.email} onClose={() => setModal(null)} />}

      <div style={{ display: 'grid', gridTemplateColumns: '380px 1fr', gap: '20px', flex: 1, minHeight: 0, minWidth: 0 }}>
        {/* LEFT — form */}
        <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0, minWidth: 0 }}>
          <div style={{ display: 'flex', gap: '4px', background: 'var(--surface-sunk)', borderRadius: 'var(--radius-md)', padding: '4px', marginBottom: '16px' }}>
            {seg('lebenslauf', 'Resume')}{seg('anschreiben', 'Cover letter')}
          </div>

          <div style={{ flex: 1, overflowY: 'auto', paddingRight: '8px' }}>
            {(gen || pending) && (
              <div style={{ border: '1px dashed var(--accent-border)', borderRadius: 'var(--radius-md)', overflow: 'hidden', marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '7px', padding: '8px 12px', background: 'var(--accent-soft)', fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 600, color: 'var(--accent-strong)' }}>
                  <ED.Icon name="zap" size={12} />AI suggestion · not applied yet
                </div>
                <div style={{ padding: '12px 13px' }}>
                  {gen ? (
                    <div style={{ fontSize: '12.5px', color: 'var(--accent-strong)', fontStyle: 'italic' }}>myJob is tailoring …</div>
                  ) : pending.kind === 'summary' ? (
                    <div style={{ fontSize: '12.5px', lineHeight: 1.6, color: 'var(--text-soft)', fontStyle: 'italic' }}>{pending.value}</div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>{pending.value.map((p, i) => <p key={i} style={{ fontSize: '12.5px', lineHeight: 1.6, color: 'var(--text-soft)', fontStyle: 'italic', margin: 0 }}>{p}</p>)}</div>
                  )}
                </div>
                {!gen && (
                  <div style={{ display: 'flex', gap: '8px', padding: '10px 13px', borderTop: '1px solid var(--border)', background: 'var(--surface-subtle)' }}>
                    <button onClick={acceptAI} style={{ appearance: 'none', cursor: 'pointer', border: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px', fontFamily: 'var(--font-body)', fontSize: '12px', fontWeight: 600, color: 'var(--accent-contrast)', background: 'var(--accent)', borderRadius: 'var(--radius-sm)', padding: '6px 12px' }}><ED.Icon name="check" size={13} />Apply</button>
                    <button onClick={cancelAI} style={{ appearance: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px', fontFamily: 'var(--font-body)', fontSize: '12px', fontWeight: 500, color: 'var(--text-muted)', background: 'transparent', border: '1px solid var(--border-strong)', borderRadius: 'var(--radius-sm)', padding: '6px 12px' }}><ED.Icon name="x" size={13} />Discard</button>
                  </div>
                )}
              </div>
            )}
            {/* shared contact */}
            <FormGroup title="Contact / header">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <ED.Input label="Name" value={contact.name} onChange={(e) => setC('name', e.target.value)} wrapStyle={{ gridColumn: '1 / -1' }} />
                <ED.Input label="Role" value={contact.role} onChange={(e) => setC('role', e.target.value)} wrapStyle={{ gridColumn: '1 / -1' }} />
                <ED.Input label="Email" value={contact.email} onChange={(e) => setC('email', e.target.value)} />
                <ED.Input label="Phone" value={contact.phone} onChange={(e) => setC('phone', e.target.value)} />
                <ED.Input label="Location" value={contact.location} onChange={(e) => setC('location', e.target.value)} />
                <ED.Input label="LinkedIn" value={contact.linkedin} onChange={(e) => setC('linkedin', e.target.value)} />
              </div>
            </FormGroup>

            {doc === 'lebenslauf' ? (
              <>
                <FormGroup title="Profile">
                  <ED.Textarea rows={4} value={resume.summary} onChange={(e) => setResume((s) => ({ ...s, summary: e.target.value }))} />
                </FormGroup>

                <FormGroup title="Experience" onAdd={addExp}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {resume.experience.map((e, i) => (
                      <div key={i} style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '12px', background: 'var(--surface-subtle)', display: 'flex', flexDirection: 'column', gap: '9px' }}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '-4px' }}>
                          <ED.IconButton icon="trash" label="Remove" variant="ghost" size="sm" onClick={() => delExp(i)} />
                        </div>
                        <ED.Input label="Position" value={e.role} onChange={(ev) => setExp(i, 'role', ev.target.value)} />
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '9px' }}>
                          <ED.Input label="Company" value={e.company} onChange={(ev) => setExp(i, 'company', ev.target.value)} />
                          <ED.Input label="Period" value={e.period} onChange={(ev) => setExp(i, 'period', ev.target.value)} />
                        </div>
                        <ED.Textarea label="Responsibilities (one per line)" rows={3} value={e.bullets.join('\n')} onChange={(ev) => setExp(i, 'bullets', ev.target.value.split('\n'))} />
                      </div>
                    ))}
                  </div>
                </FormGroup>

                <FormGroup title="Education">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {resume.education.map((e, i) => (
                      <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '9px', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '12px', background: 'var(--surface-subtle)' }}>
                        <ED.Input label="Degree" value={e.degree} onChange={(ev) => setEdu(i, 'degree', ev.target.value)} wrapStyle={{ gridColumn: '1 / -1' }} />
                        <ED.Input label="Institution" value={e.school} onChange={(ev) => setEdu(i, 'school', ev.target.value)} />
                        <ED.Input label="Period" value={e.period} onChange={(ev) => setEdu(i, 'period', ev.target.value)} />
                      </div>
                    ))}
                  </div>
                </FormGroup>
              </>
            ) : (
              <>
                <FormGroup title="Recipient">
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <ED.Input label="Company" value={letter.firma} onChange={(e) => setLetter((s) => ({ ...s, firma: e.target.value }))} wrapStyle={{ gridColumn: '1 / -1' }} />
                    <ED.Input label="Contact person" value={letter.ansprechpartner} onChange={(e) => setLetter((s) => ({ ...s, ansprechpartner: e.target.value }))} wrapStyle={{ gridColumn: '1 / -1' }} />
                    <ED.Input label="Street" value={letter.strasse} onChange={(e) => setLetter((s) => ({ ...s, strasse: e.target.value }))} />
                    <ED.Input label="ZIP & city" value={letter.plzOrt} onChange={(e) => setLetter((s) => ({ ...s, plzOrt: e.target.value }))} />
                  </div>
                </FormGroup>
                <FormGroup title="Content">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <ED.Input label="Subject" value={letter.betreff} onChange={(e) => setLetter((s) => ({ ...s, betreff: e.target.value }))} />
                    <ED.Input label="Salutation" value={letter.anrede} onChange={(e) => setLetter((s) => ({ ...s, anrede: e.target.value }))} />
                  </div>
                </FormGroup>
                <FormGroup title="Paragraphs" onAdd={addPara}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '9px' }}>
                    {letter.absaetze.map((p, i) => <ED.Textarea key={i} rows={3} value={p} onChange={(e) => setPara(i, e.target.value)} />)}
                  </div>
                </FormGroup>
              </>
            )}
          </div>
        </div>

        {/* RIGHT — live preview */}
        <div style={{ background: 'var(--surface-page)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', minHeight: 0, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)' }}>
              <ED.Icon name="eye" size={14} /> Live preview · {doc === 'lebenslauf' ? 'Resume' : 'Cover letter'}
            </span>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={runAI} style={{ appearance: 'none', cursor: 'pointer', border: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px', fontFamily: 'var(--font-body)', fontSize: '12.5px', fontWeight: 600, color: 'var(--accent-contrast)', background: 'var(--accent)', borderRadius: 'var(--radius-md)', padding: '7px 12px' }}>
                <ED.Icon name="zap" size={14} />AI tailor
              </button>
              <ED.Button size="sm" variant="outline" iconLeft={<ED.Icon name="download" size={14} />} onClick={() => window.open(window.RecruitApi.talentDocumentsPdfUrl(talentId), '_blank')}>PDF</ED.Button>
              <ED.Button size="sm" variant="primary" iconRight={<ED.Icon name="arrowRight" size={14} />} onClick={onCreateMappe}>To dossier</ED.Button>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '8px 16px', borderBottom: '1px solid var(--border)', flexShrink: 0, flexWrap: 'wrap' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-soft)' }}>Style</span>
            <div style={{ display: 'flex', gap: '4px', background: 'var(--surface-sunk)', borderRadius: 'var(--radius-sm)', padding: '3px' }}>
              {[['classic', 'Classic'], ['modern', 'Modern'], ['compact', 'Compact']].map(([id, label]) => (
                <button key={id} onClick={() => setCfg((c) => ({ ...c, template: id }))} style={{ border: 'none', cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: '11px', fontWeight: cfg.template === id ? 600 : 500, padding: '4px 9px', borderRadius: '4px', background: cfg.template === id ? 'var(--surface-card)' : 'transparent', color: cfg.template === id ? 'var(--text-heading)' : 'var(--text-muted)' }}>{label}</button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '6px' }}>
              {ED_ACCENTS.map((a, i) => <span key={i} onClick={() => setCfg((c) => ({ ...c, accent: a.accent, strong: a.strong, onDark: a.onDark }))} style={{ width: '22px', height: '22px', borderRadius: '6px', cursor: 'pointer', background: a.accent, border: `2px solid ${cfg.accent === a.accent ? 'var(--text-heading)' : 'transparent'}` }} />)}
            </div>
            <select value={cfg.font} onChange={(e) => setCfg((c) => ({ ...c, font: e.target.value }))} style={{ padding: '5px 9px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-strong)', background: 'var(--surface-card)', fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--text-heading)' }}>
              <option value="var(--font-display)">Space Grotesk</option>
              <option value="var(--font-body)">Inter</option>
              <option value="Georgia, serif">Georgia</option>
            </select>
            <div style={{ display: 'inline-flex', background: 'var(--surface-sunk)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '2px', gap: '2px' }}>
              {[['S', 0.92], ['M', 1], ['L', 1.08]].map(([l, v]) => <button key={l} onClick={() => setCfg((c) => ({ ...c, size: v }))} style={{ border: 'none', cursor: 'pointer', fontSize: '11px', fontWeight: cfg.size === v ? 600 : 500, padding: '4px 9px', borderRadius: '4px', background: cfg.size === v ? 'var(--surface-card)' : 'transparent', color: cfg.size === v ? 'var(--text-heading)' : 'var(--text-muted)' }}>{l}</button>)}
            </div>
          </div>
          <div ref={previewRef} style={{ flex: 1, overflowY: 'auto', padding: '28px', display: 'flex', justifyContent: 'center' }}>
            <div style={{ zoom: scale * cfg.size, '--accent': cfg.accent, '--accent-strong': cfg.strong, '--accent-on-dark': cfg.onDark, '--font-display': cfg.font, '--font-body': cfg.font }}>
              {doc === 'lebenslauf' ? <EdResumeDoc contact={contact} resume={resume} template={cfg.template} /> : <EdLetterDoc contact={contact} letter={letter} template={cfg.template} />}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { Editor });
