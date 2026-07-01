/* Editor — the document workbench: form on the left, live document preview on the
   right. Two documents per talent: Lebenslauf (dark-header resume) and Anschreiben.
   This is the "richtig bearbeiten, wie vorher, mit dem Header" experience. */
const ED = window.MyJobDesignSystem_f3658e;

/* CV style presets for the live customization bar (accent + font + size). */
const ED_ACCENTS = [
  { accent: '#2A6FDB', strong: '#1d4ed8', onDark: '#7aa7f5' },
  { accent: '#1F8A5B', strong: '#15734a', onDark: '#6ee7b7' },
  { accent: '#D97757', strong: '#b45309', onDark: '#f0a58a' },
  { accent: '#7C3AED', strong: '#6d28d9', onDark: '#c4b5fd' },
];

/* ---------------- live preview: Lebenslauf ---------------- */
function SectionHead({ children }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: '0 0 12px' }}>
      <span style={{ width: '14px', height: '2px', background: 'var(--accent)', borderRadius: '2px' }} />
      <h4 style={{ fontFamily: 'var(--font-mono)', fontSize: '10.5px', fontWeight: 600, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--accent-strong)', margin: 0 }}>{children}</h4>
    </div>
  );
}

function ResumeDoc({ contact, resume }) {
  return (
    <div style={{ width: '720px', background: '#fff', borderRadius: 'var(--radius-md)', overflow: 'hidden', boxShadow: 'var(--shadow-page)', display: 'flex', minHeight: '940px' }}>
      {/* dark sidebar — the "Header" */}
      <aside style={{ width: '38%', background: 'linear-gradient(168deg, var(--ink-800) 0%, var(--ink-950) 100%)', color: '#fff', padding: '34px 26px' }}>
        <ED.Avatar name={contact.name} src={contact.src} size={104} radius="var(--radius-lg)" />
        <div style={{ fontFamily: 'var(--font-display)', fontSize: '25px', fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.1, marginTop: '18px' }}>{contact.name}</div>
        <div style={{ fontSize: '13px', color: 'var(--accent-on-dark)', fontWeight: 600, marginTop: '5px' }}>{contact.role}</div>

        <div style={{ height: '1px', background: 'var(--sidebar-border)', margin: '24px 0' }} />

        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--sidebar-soft)', marginBottom: '13px' }}>Kontakt</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '11px' }}>
          {[['mail', contact.email], ['phone', contact.phone], ['pin', contact.location], ['linkedin', contact.linkedin]].filter(([, v]) => v).map(([ic, v]) => (
            <div key={ic} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ width: '26px', height: '26px', flexShrink: 0, borderRadius: 'var(--radius-sm)', background: 'var(--sidebar-glass)', border: '1px solid var(--sidebar-border)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-on-dark)' }}><ED.Icon name={ic} size={13} /></span>
              <span style={{ fontSize: '11.5px', color: 'var(--sidebar-muted)', wordBreak: 'break-word' }}>{v}</span>
            </div>
          ))}
        </div>

        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--sidebar-soft)', margin: '26px 0 13px' }}>Skills</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '13px' }}>
          {resume.skillGroups.map((g, i) => (
            <div key={i}>
              <div style={{ fontSize: '11px', color: 'var(--sidebar-soft)', marginBottom: '6px' }}>{g.label}</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                {g.items.map((s, j) => <span key={j} style={{ fontFamily: 'var(--font-mono)', fontSize: '10.5px', color: '#fff', background: 'var(--sidebar-glass)', border: '1px solid var(--sidebar-border-strong)', borderRadius: 'var(--radius-sm)', padding: '3px 7px' }}>{s}</span>)}
              </div>
            </div>
          ))}
        </div>
      </aside>

      {/* light main */}
      <main style={{ flex: 1, padding: '34px 30px' }}>
        <section style={{ marginBottom: '26px' }}>
          <SectionHead>Profile</SectionHead>
          <p style={{ fontSize: '13px', lineHeight: 1.65, color: 'var(--text-body)', margin: 0 }}>{resume.summary}</p>
        </section>

        <section style={{ marginBottom: '26px' }}>
          <SectionHead>Experience</SectionHead>
          <div style={{ position: 'relative', paddingLeft: '20px' }}>
            <span style={{ position: 'absolute', left: '4px', top: '5px', bottom: '5px', width: '1.5px', background: 'var(--border-strong)' }} />
            {resume.experience.map((e, i) => (
              <div key={i} style={{ position: 'relative', marginBottom: i === resume.experience.length - 1 ? 0 : '18px' }}>
                <span style={{ position: 'absolute', left: '-20px', top: '4px', width: '9px', height: '9px', borderRadius: '50%', background: i === 0 ? 'var(--accent)' : '#fff', border: `2px solid ${i === 0 ? 'var(--accent)' : 'var(--border-strong)'}` }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '10px' }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: '14.5px', fontWeight: 700, color: 'var(--text-heading)' }}>{e.role}</div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10.5px', color: 'var(--text-soft)', whiteSpace: 'nowrap' }}>{e.period}</div>
                </div>
                <div style={{ fontSize: '12.5px', color: 'var(--accent-strong)', fontWeight: 600, margin: '2px 0 7px' }}>{e.company}{e.location ? ' · ' + e.location : ''}</div>
                <ul style={{ margin: 0, paddingLeft: '16px', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                  {e.bullets.filter(Boolean).map((b, j) => <li key={j} style={{ fontSize: '12.5px', lineHeight: 1.5, color: 'var(--text-body)' }}>{b}</li>)}
                </ul>
              </div>
            ))}
          </div>
        </section>

        <section>
          <SectionHead>Education</SectionHead>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '11px' }}>
            {resume.education.map((e, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
                <div>
                  <div style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--text-heading)' }}>{e.degree}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '1px' }}>{e.school}{e.note ? ' · ' + e.note : ''}</div>
                </div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10.5px', color: 'var(--text-soft)', whiteSpace: 'nowrap' }}>{e.period}</div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}

/* ---------------- live preview: Anschreiben ---------------- */
function LetterDoc({ contact, letter }) {
  return (
    <div style={{ width: '720px', background: '#fff', borderRadius: 'var(--radius-md)', overflow: 'hidden', boxShadow: 'var(--shadow-page)', minHeight: '940px', display: 'flex', flexDirection: 'column' }}>
      {/* same dark header for brand consistency */}
      <div style={{ background: 'linear-gradient(168deg, var(--ink-800), var(--ink-950))', color: '#fff', padding: '28px 44px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '24px', fontWeight: 700, letterSpacing: '-0.02em' }}>{contact.name}</div>
          <div style={{ fontSize: '12.5px', color: 'var(--accent-on-dark)', fontWeight: 600, marginTop: '3px' }}>{contact.role}</div>
        </div>
        <div style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: '10.5px', color: 'var(--sidebar-muted)', lineHeight: 1.7 }}>
          <div>{contact.email}</div><div>{contact.phone}</div><div>{contact.location}</div>
        </div>
      </div>

      <div style={{ flex: 1, padding: '38px 44px', fontFamily: 'var(--font-body)' }}>
        {/* recipient + date */}
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '20px', marginBottom: '34px' }}>
          <div style={{ fontSize: '13px', lineHeight: 1.6, color: 'var(--text-body)' }}>
            <div style={{ fontWeight: 600, color: 'var(--text-heading)' }}>{letter.firma}</div>
            <div>{letter.ansprechpartner}</div>
            <div>{letter.strasse}</div>
            <div>{letter.plzOrt}</div>
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11.5px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{contact.location}, {new Date().toLocaleDateString('de-DE')}</div>
        </div>

        <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-heading)', marginBottom: '20px' }}>{letter.betreff}</div>
        <div style={{ fontSize: '13px', color: 'var(--text-body)', marginBottom: '14px' }}>{letter.anrede}</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '13px' }}>
          {letter.absaetze.filter(Boolean).map((p, i) => <p key={i} style={{ fontSize: '13px', lineHeight: 1.7, color: 'var(--text-body)', margin: 0 }}>{p}</p>)}
        </div>
        <div style={{ marginTop: '26px', fontSize: '13px', color: 'var(--text-body)' }}>{letter.gruss}</div>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: '20px', fontWeight: 700, color: 'var(--text-heading)', marginTop: '8px', letterSpacing: '-0.01em' }}>{contact.name}</div>
      </div>
    </div>
  );
}

/* ---------------- left form ---------------- */
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
  const [letter, setLetter] = React.useState(() => JSON.parse(JSON.stringify(talent.letter || { firma: '', ansprechpartner: '', strasse: '', plzOrt: '', betreff: '', anrede: 'Sehr geehrte Damen und Herren,', absaetze: [''], gruss: 'Kind regards' })));

  const setC = (k, v) => setContact((s) => ({ ...s, [k]: v }));
  const setExp = (i, k, v) => setResume((s) => { const e = [...s.experience]; e[i] = { ...e[i], [k]: v }; return { ...s, experience: e }; });
  const setEdu = (i, k, v) => setResume((s) => { const e = [...s.education]; e[i] = { ...e[i], [k]: v }; return { ...s, education: e }; });
  const addExp = () => setResume((s) => ({ ...s, experience: [{ role: 'Neue Position', company: '', period: '', location: '', bullets: [''], skills: [] }, ...s.experience] }));
  const delExp = (i) => setResume((s) => ({ ...s, experience: s.experience.filter((_, j) => j !== i) }));
  const setPara = (i, v) => setLetter((s) => { const a = [...s.absaetze]; a[i] = v; return { ...s, absaetze: a }; });
  const addPara = () => setLetter((s) => ({ ...s, absaetze: [...s.absaetze, ''] }));

  /* ---- Magic: AI adjusts the active document. The suggestion is shown GREY
     and only applied on “Übernehmen” (or discarded on “Verwerfen”). ---- */
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

  /* ---- Persistence: load the stored documents on open, then autosave edits.
     The pinned demo "me" talent has no server row, so it stays local-only. ---- */
  const talentId = talent.id;
  const canPersist = !!talentId && talentId !== 'me';
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
  }, [contact, resume, letter, cfg]);

  const saveLabel = { saving: 'Saving…', saved: 'Saved', error: 'Not saved' };

  /* ---- Import: paste a CV or upload a PDF, let the AI parse it into fields ---- */
  const [importing, setImporting] = React.useState(false);
  const [importText, setImportText] = React.useState('');
  const [parsing, setParsing] = React.useState(false);
  const [importHint, setImportHint] = React.useState('');
  const pdfInputRef = React.useRef(null);
  const applyParsed = (parsed) => {
    if (parsed.contact) setContact((s) => ({ ...s, ...parsed.contact }));
    if (parsed.resume) setResume(parsed.resume);
  };
  const runImport = async () => {
    if (!importText.trim() || !canPersist) return;
    setParsing(true);
    setImportHint('');
    try {
      applyParsed(await window.RecruitApi.parseDocument(talentId, importText));
      setImporting(false);
      setImportText('');
    } catch {
      /* ignore parse error */
    }
    setParsing(false);
  };
  const runImportPdf = async (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!file || !canPersist) return;
    setParsing(true);
    setImportHint('');
    try {
      const dataBase64 = await new Promise((res, rej) => {
        const r = new FileReader();
        r.onload = () => res(String(r.result).split(',')[1] || '');
        r.onerror = rej;
        r.readAsDataURL(file);
      });
      const parsed = await window.RecruitApi.parseDocumentPdf(talentId, dataBase64);
      if (parsed.extractedChars === 0) {
        // scanned/image-only PDF — no text layer to read
        setImportHint('No text found in this PDF (scanned image?). Paste the text instead.');
      } else {
        applyParsed(parsed);
        setImporting(false);
      }
    } catch {
      setImportHint('Could not read that PDF. Try pasting the text instead.');
    }
    setParsing(false);
  };

  /* ---- ATS check: score the résumé against a pasted job ad ---- */
  const [atsOpen, setAtsOpen] = React.useState(false);
  const [jobText, setJobText] = React.useState('');
  const [ats, setAts] = React.useState(null);
  const [scoring, setScoring] = React.useState(false);
  const runAts = async () => {
    if (!jobText.trim() || !canPersist) return;
    setScoring(true);
    try {
      setAts(await window.RecruitApi.atsScore(talentId, jobText));
    } catch {
      /* ignore */
    }
    setScoring(false);
  };

  /* ---- Pitch: a "why this candidate" short profile to present to the client ---- */
  const [pitchOpen, setPitchOpen] = React.useState(false);
  const [mandateContext, setMandateContext] = React.useState('');
  const [pitch, setPitch] = React.useState(null);
  const [pitching, setPitching] = React.useState(false);
  const [pitchCopied, setPitchCopied] = React.useState(false);
  const runPitch = async () => {
    if (!canPersist) return;
    setPitching(true);
    try {
      setPitch(await window.RecruitApi.pitchCandidate(talentId, mandateContext));
    } catch {
      /* ignore */
    }
    setPitching(false);
  };
  const copyPitch = async () => {
    if (!pitch) return;
    const text = [pitch.headline, '', ...pitch.paragraphs, '', ...pitch.highlights.map((h) => `• ${h}`)]
      .join('\n')
      .trim();
    try {
      await navigator.clipboard.writeText(text);
      setPitchCopied(true);
      setTimeout(() => setPitchCopied(false), 1800);
    } catch {
      /* clipboard unavailable */
    }
  };

  /* ---- Outreach: first-contact message (to candidate or client, email/LinkedIn) ---- */
  const [outreachOpen, setOutreachOpen] = React.useState(false);
  const [outAudience, setOutAudience] = React.useState('candidate'); // candidate | client
  const [outChannel, setOutChannel] = React.useState('email'); // email | linkedin
  const [outTone, setOutTone] = React.useState('');
  const [outContext, setOutContext] = React.useState('');
  const [outMsg, setOutMsg] = React.useState(null);
  const [outBusy, setOutBusy] = React.useState(false);
  const [outCopied, setOutCopied] = React.useState(false);
  const runOutreach = async () => {
    if (!canPersist) return;
    setOutBusy(true);
    setOutCopied(false);
    try {
      setOutMsg(
        await window.RecruitApi.outreachMessage(talentId, {
          audience: outAudience,
          channel: outChannel,
          tone: outTone,
          mandateContext: outContext,
        }),
      );
    } catch {
      /* ignore */
    }
    setOutBusy(false);
  };
  const copyOutreach = async () => {
    if (!outMsg) return;
    const text = [outMsg.subject && `Betreff: ${outMsg.subject}`, outMsg.body]
      .filter(Boolean)
      .join('\n\n');
    try {
      await navigator.clipboard.writeText(text);
      setOutCopied(true);
      setTimeout(() => setOutCopied(false), 1800);
    } catch {
      /* clipboard unavailable */
    }
  };
  const openOutreachMail = () => {
    if (!outMsg) return;
    const to = outChannel === 'email' && outAudience === 'candidate' ? contact.email || '' : '';
    const url = `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(
      outMsg.subject || '',
    )}&body=${encodeURIComponent(outMsg.body || '')}`;
    window.open(url, '_blank');
  };

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
          <button
            onClick={() => setImporting(true)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'none', border: '1px solid var(--border-strong)', borderRadius: 'var(--radius-pill)', cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-soft)', padding: '4px 12px' }}
          >
            <ED.Icon name="upload" size={13} /> Import CV
          </button>
        )}
        {canPersist && (
          <button
            onClick={() => setAtsOpen(true)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'none', border: '1px solid var(--border-strong)', borderRadius: 'var(--radius-pill)', cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-soft)', padding: '4px 12px' }}
          >
            <ED.Icon name="search" size={13} /> ATS check
          </button>
        )}
        {canPersist && (
          <button
            onClick={() => setPitchOpen(true)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'none', border: '1px solid var(--border-strong)', borderRadius: 'var(--radius-pill)', cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-soft)', padding: '4px 12px' }}
          >
            <ED.Icon name="briefcase" size={13} /> Pitch
          </button>
        )}
        {canPersist && (
          <button
            onClick={() => setOutreachOpen(true)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'none', border: '1px solid var(--border-strong)', borderRadius: 'var(--radius-pill)', cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-soft)', padding: '4px 12px' }}
          >
            <ED.Icon name="send" size={13} /> Outreach
          </button>
        )}
        {canPersist && (
          <button
            onClick={() => window.open(window.RecruitApi.talentDocumentsPdfUrl(talentId), '_blank')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'none', border: '1px solid var(--border-strong)', borderRadius: 'var(--radius-pill)', cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-soft)', padding: '4px 12px' }}
          >
            <ED.Icon name="download" size={13} /> PDF
          </button>
        )}
      </div>

      {importing && (
        <>
          <div onClick={() => setImporting(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(8,11,18,0.45)', backdropFilter: 'blur(2px)', zIndex: 60 }} />
          <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 61, width: 'min(680px, 92vw)', background: 'var(--surface-card)', borderRadius: 'var(--radius-xl)', boxShadow: 'var(--shadow-lg)', padding: '22px' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '17px', fontWeight: 700, color: 'var(--text-heading)', marginBottom: '4px' }}>Import a CV</div>
            <div style={{ fontSize: '12.5px', color: 'var(--text-soft)', marginBottom: '12px' }}>Upload a PDF or paste the résumé text — the AI extracts profile, experience and skills into the editor.</div>
            <input ref={pdfInputRef} type="file" accept="application/pdf,.pdf" onChange={runImportPdf} style={{ display: 'none' }} />
            <div style={{ marginBottom: '12px' }}>
              <button onClick={() => pdfInputRef.current && pdfInputRef.current.click()} disabled={parsing} style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', background: 'none', border: '1px dashed var(--border-strong)', borderRadius: 'var(--radius-md)', cursor: parsing ? 'default' : 'pointer', fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-soft)', padding: '10px 16px', width: '100%', justifyContent: 'center' }}>
                <ED.Icon name="upload" size={14} /> {parsing ? 'Reading…' : 'Upload a PDF'}
              </button>
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', textAlign: 'center', margin: '0 0 10px' }}>or paste text</div>
            <textarea value={importText} onChange={(e) => setImportText(e.target.value)} rows={9} placeholder="Paste CV text here…" style={{ width: '100%', resize: 'vertical', padding: '11px 13px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-strong)', background: 'var(--surface-card)', color: 'var(--text-heading)', fontFamily: 'var(--font-body)', fontSize: '13px', outline: 'none' }} />
            {importHint && <div style={{ marginTop: '10px', fontSize: '12px', color: 'var(--danger)' }}>{importHint}</div>}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '14px' }}>
              <ED.Button variant="ghost" onClick={() => setImporting(false)}>Cancel</ED.Button>
              <ED.Button variant="primary" disabled={parsing || !importText.trim()} onClick={runImport}>{parsing ? 'Parsing…' : 'Parse & fill'}</ED.Button>
            </div>
          </div>
        </>
      )}

      {atsOpen && (
        <>
          <div onClick={() => setAtsOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(8,11,18,0.45)', backdropFilter: 'blur(2px)', zIndex: 60 }} />
          <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 61, width: 'min(680px, 92vw)', maxHeight: '88vh', overflowY: 'auto', background: 'var(--surface-card)', borderRadius: 'var(--radius-xl)', boxShadow: 'var(--shadow-lg)', padding: '22px' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '17px', fontWeight: 700, color: 'var(--text-heading)', marginBottom: '4px' }}>ATS match check</div>
            <div style={{ fontSize: '12.5px', color: 'var(--text-soft)', marginBottom: '12px' }}>Paste the job ad — the AI scores this résumé against it and suggests fixes.</div>
            <textarea value={jobText} onChange={(e) => setJobText(e.target.value)} rows={7} placeholder="Paste the job description…" style={{ width: '100%', resize: 'vertical', padding: '11px 13px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-strong)', background: 'var(--surface-card)', color: 'var(--text-heading)', fontFamily: 'var(--font-body)', fontSize: '13px', outline: 'none' }} />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
              <ED.Button variant="ghost" onClick={() => setAtsOpen(false)}>Close</ED.Button>
              <ED.Button variant="primary" disabled={scoring || !jobText.trim()} onClick={runAts}>{scoring ? 'Analyzing…' : 'Analyze'}</ED.Button>
            </div>
            {ats && (
              <div style={{ marginTop: '18px', borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px' }}>
                  <span style={{ fontFamily: 'var(--font-display)', fontSize: '30px', fontWeight: 700, color: ats.score >= 75 ? 'var(--positive, #1F8A5B)' : ats.score >= 50 ? 'var(--accent-strong)' : 'var(--danger)' }}>{ats.score}</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-soft)' }}>/ 100 match</span>
                </div>
                {ats.matched && ats.matched.length > 0 && (
                  <div style={{ marginTop: '10px' }}>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-soft)', marginBottom: '5px' }}>Matched</div>
                    <div>{ats.matched.map((m, i) => <span key={i} style={{ display: 'inline-block', background: 'var(--accent-soft)', color: 'var(--accent-strong)', borderRadius: '4px', padding: '2px 8px', margin: '0 5px 5px 0', fontSize: '12px' }}>{m}</span>)}</div>
                  </div>
                )}
                {ats.missing && ats.missing.length > 0 && (
                  <div style={{ marginTop: '8px' }}>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-soft)', marginBottom: '5px' }}>Missing</div>
                    <div>{ats.missing.map((m, i) => <span key={i} style={{ display: 'inline-block', background: 'var(--danger-soft)', color: 'var(--danger)', borderRadius: '4px', padding: '2px 8px', margin: '0 5px 5px 0', fontSize: '12px' }}>{m}</span>)}</div>
                  </div>
                )}
                {ats.suggestions && ats.suggestions.length > 0 && (
                  <ul style={{ margin: '10px 0 0', paddingLeft: '18px', fontSize: '13px', color: 'var(--text-body)' }}>
                    {ats.suggestions.map((s, i) => <li key={i} style={{ margin: '3px 0' }}>{s}</li>)}
                  </ul>
                )}
              </div>
            )}
          </div>
        </>
      )}

      {pitchOpen && (
        <>
          <div onClick={() => setPitchOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(8,11,18,0.45)', backdropFilter: 'blur(2px)', zIndex: 60 }} />
          <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 61, width: 'min(680px, 92vw)', maxHeight: '88vh', overflowY: 'auto', background: 'var(--surface-card)', borderRadius: 'var(--radius-xl)', boxShadow: 'var(--shadow-lg)', padding: '22px' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '17px', fontWeight: 700, color: 'var(--text-heading)', marginBottom: '4px' }}>Candidate pitch</div>
            <div style={{ fontSize: '12.5px', color: 'var(--text-soft)', marginBottom: '12px' }}>A short „why this candidate" profile to present to the client. Add the mandate/role for a tailored pitch (optional).</div>
            <textarea value={mandateContext} onChange={(e) => setMandateContext(e.target.value)} rows={5} placeholder="Mandate / role context (optional)…" style={{ width: '100%', resize: 'vertical', padding: '11px 13px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-strong)', background: 'var(--surface-card)', color: 'var(--text-heading)', fontFamily: 'var(--font-body)', fontSize: '13px', outline: 'none' }} />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
              <ED.Button variant="ghost" onClick={() => setPitchOpen(false)}>Close</ED.Button>
              <ED.Button variant="primary" disabled={pitching} onClick={runPitch}>{pitching ? 'Drafting…' : pitch ? 'Regenerate' : 'Generate'}</ED.Button>
            </div>
            {pitch && (
              <div style={{ marginTop: '18px', borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: '16px', fontWeight: 700, color: 'var(--text-heading)' }}>{pitch.headline}</div>
                  <button onClick={copyPitch} style={{ flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'none', border: '1px solid var(--border-strong)', borderRadius: 'var(--radius-pill)', cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-soft)', padding: '4px 12px' }}>
                    <ED.Icon name={pitchCopied ? 'check' : 'fileText'} size={13} /> {pitchCopied ? 'Copied' : 'Copy'}
                  </button>
                </div>
                {pitch.paragraphs.map((p, i) => (
                  <p key={i} style={{ margin: '10px 0 0', fontSize: '13px', lineHeight: 1.55, color: 'var(--text-body)' }}>{p}</p>
                ))}
                {pitch.highlights && pitch.highlights.length > 0 && (
                  <ul style={{ margin: '12px 0 0', paddingLeft: '18px', fontSize: '13px', color: 'var(--text-body)' }}>
                    {pitch.highlights.map((h, i) => <li key={i} style={{ margin: '3px 0' }}>{h}</li>)}
                  </ul>
                )}
              </div>
            )}
          </div>
        </>
      )}

      {outreachOpen && (() => {
        const pill = (active, onClick, label) => (
          <button onClick={onClick} style={{ flex: 1, padding: '7px 10px', border: 'none', cursor: 'pointer', borderRadius: 'var(--radius-sm)', fontFamily: 'var(--font-mono)', fontSize: '11px', fontWeight: 600, background: active ? 'var(--surface-card)' : 'transparent', color: active ? 'var(--text-heading)' : 'var(--text-soft)', boxShadow: active ? 'var(--shadow-xs)' : 'none' }}>{label}</button>
        );
        const toggle = (children) => (
          <div style={{ display: 'flex', gap: '4px', background: 'var(--surface-sunk)', borderRadius: 'var(--radius-md)', padding: '4px' }}>{children}</div>
        );
        return (
          <>
            <div onClick={() => setOutreachOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(8,11,18,0.45)', backdropFilter: 'blur(2px)', zIndex: 60 }} />
            <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 61, width: 'min(680px, 92vw)', maxHeight: '88vh', overflowY: 'auto', background: 'var(--surface-card)', borderRadius: 'var(--radius-xl)', boxShadow: 'var(--shadow-lg)', padding: '22px' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '17px', fontWeight: 700, color: 'var(--text-heading)', marginBottom: '4px' }}>Outreach message</div>
              <div style={{ fontSize: '12.5px', color: 'var(--text-soft)', marginBottom: '14px' }}>Draft the first-contact message — to the candidate (sourcing) or to a client (presenting the candidate), as an email or a LinkedIn DM.</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                <div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-soft)', marginBottom: '5px' }}>To</div>
                  {toggle(<>{pill(outAudience === 'candidate', () => setOutAudience('candidate'), 'Candidate')}{pill(outAudience === 'client', () => setOutAudience('client'), 'Client')}</>)}
                </div>
                <div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-soft)', marginBottom: '5px' }}>Channel</div>
                  {toggle(<>{pill(outChannel === 'email', () => setOutChannel('email'), 'Email')}{pill(outChannel === 'linkedin', () => setOutChannel('linkedin'), 'LinkedIn')}</>)}
                </div>
              </div>
              <input value={outTone} onChange={(e) => setOutTone(e.target.value)} placeholder="Tone (optional), e.g. locker/Du or förmlich/Sie" style={{ width: '100%', padding: '9px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-strong)', background: 'var(--surface-card)', color: 'var(--text-heading)', fontFamily: 'var(--font-body)', fontSize: '13px', outline: 'none', marginBottom: '10px' }} />
              <textarea value={outContext} onChange={(e) => setOutContext(e.target.value)} rows={4} placeholder="Mandate / role context (optional)…" style={{ width: '100%', resize: 'vertical', padding: '11px 13px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-strong)', background: 'var(--surface-card)', color: 'var(--text-heading)', fontFamily: 'var(--font-body)', fontSize: '13px', outline: 'none' }} />
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
                <ED.Button variant="ghost" onClick={() => setOutreachOpen(false)}>Close</ED.Button>
                <ED.Button variant="primary" disabled={outBusy} onClick={runOutreach}>{outBusy ? 'Drafting…' : outMsg ? 'Regenerate' : 'Generate'}</ED.Button>
              </div>
              {outMsg && (
                <div style={{ marginTop: '18px', borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px', marginBottom: '10px' }}>
                    {outChannel === 'email' && (
                      <button onClick={openOutreachMail} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'none', border: '1px solid var(--border-strong)', borderRadius: 'var(--radius-pill)', cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-soft)', padding: '4px 12px' }}>
                        <ED.Icon name="send" size={13} /> Open in email
                      </button>
                    )}
                    <button onClick={copyOutreach} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'none', border: '1px solid var(--border-strong)', borderRadius: 'var(--radius-pill)', cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-soft)', padding: '4px 12px' }}>
                      <ED.Icon name={outCopied ? 'check' : 'fileText'} size={13} /> {outCopied ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                  {outMsg.subject && (
                    <div style={{ fontSize: '13px', color: 'var(--text-heading)', marginBottom: '8px' }}><strong>Betreff:</strong> {outMsg.subject}</div>
                  )}
                  <div style={{ whiteSpace: 'pre-wrap', fontSize: '13px', lineHeight: 1.55, color: 'var(--text-body)' }}>{outMsg.body}</div>
                </div>
              )}
            </div>
          </>
        );
      })()}

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
                  <ED.Icon name="zap" size={12} />KI-Vorschlag · noch nicht übernommen
                </div>
                <div style={{ padding: '12px 13px' }}>
                  {gen ? (
                    <div style={{ fontSize: '12.5px', color: 'var(--accent-strong)', fontStyle: 'italic' }}>myJob passt an …</div>
                  ) : pending.kind === 'summary' ? (
                    <div style={{ fontSize: '12.5px', lineHeight: 1.6, color: 'var(--text-soft)', fontStyle: 'italic' }}>{pending.value}</div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>{pending.value.map((p, i) => <p key={i} style={{ fontSize: '12.5px', lineHeight: 1.6, color: 'var(--text-soft)', fontStyle: 'italic', margin: 0 }}>{p}</p>)}</div>
                  )}
                </div>
                {!gen && (
                  <div style={{ display: 'flex', gap: '8px', padding: '10px 13px', borderTop: '1px solid var(--border)', background: 'var(--surface-subtle)' }}>
                    <button onClick={acceptAI} style={{ appearance: 'none', cursor: 'pointer', border: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px', fontFamily: 'var(--font-body)', fontSize: '12px', fontWeight: 600, color: 'var(--accent-contrast)', background: 'var(--accent)', borderRadius: 'var(--radius-sm)', padding: '6px 12px' }}><ED.Icon name="check" size={13} />Übernehmen</button>
                    <button onClick={cancelAI} style={{ appearance: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px', fontFamily: 'var(--font-body)', fontSize: '12px', fontWeight: 500, color: 'var(--text-muted)', background: 'transparent', border: '1px solid var(--border-strong)', borderRadius: 'var(--radius-sm)', padding: '6px 12px' }}><ED.Icon name="x" size={13} />Verwerfen</button>
                  </div>
                )}
              </div>
            )}
            {/* shared contact */}
            <FormGroup title="Contact / header">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <ED.Input label="Name" value={contact.name} onChange={(e) => setC('name', e.target.value)} wrapStyle={{ gridColumn: '1 / -1' }} />
                <ED.Input label="Rolle" value={contact.role} onChange={(e) => setC('role', e.target.value)} wrapStyle={{ gridColumn: '1 / -1' }} />
                <ED.Input label="E-Mail" value={contact.email} onChange={(e) => setC('email', e.target.value)} />
                <ED.Input label="Telefon" value={contact.phone} onChange={(e) => setC('phone', e.target.value)} />
                <ED.Input label="Ort" value={contact.location} onChange={(e) => setC('location', e.target.value)} />
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
                          <ED.Input label="Zeitraum" value={e.period} onChange={(ev) => setExp(i, 'period', ev.target.value)} />
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
                        <ED.Input label="Abschluss" value={e.degree} onChange={(ev) => setEdu(i, 'degree', ev.target.value)} wrapStyle={{ gridColumn: '1 / -1' }} />
                        <ED.Input label="Institution" value={e.school} onChange={(ev) => setEdu(i, 'school', ev.target.value)} />
                        <ED.Input label="Zeitraum" value={e.period} onChange={(ev) => setEdu(i, 'period', ev.target.value)} />
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
                <FormGroup title="Inhalt">
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
              <ED.Icon name="eye" size={14} /> Live-Vorschau · {doc === 'lebenslauf' ? 'Resume' : 'Cover letter'}
            </span>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={runAI} style={{ appearance: 'none', cursor: 'pointer', border: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px', fontFamily: 'var(--font-body)', fontSize: '12.5px', fontWeight: 600, color: 'var(--accent-contrast)', background: 'var(--accent)', borderRadius: 'var(--radius-md)', padding: '7px 12px' }}>
                <ED.Icon name="zap" size={14} />KI anpassen
              </button>
              <ED.Button size="sm" variant="outline" iconLeft={<ED.Icon name="download" size={14} />}>PDF</ED.Button>
              <ED.Button size="sm" variant="primary" iconRight={<ED.Icon name="arrowRight" size={14} />} onClick={onCreateMappe}>To dossier</ED.Button>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '8px 16px', borderBottom: '1px solid var(--border)', flexShrink: 0, flexWrap: 'wrap' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-soft)' }}>Stil</span>
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
              {doc === 'lebenslauf' ? <ResumeDoc contact={contact} resume={resume} /> : <LetterDoc contact={contact} letter={letter} />}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { Editor });
