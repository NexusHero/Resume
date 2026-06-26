/* Editor — the document workbench: form on the left, live document preview on the
   right. Two documents per talent: Lebenslauf (dark-header resume) and Anschreiben.
   This is the "richtig bearbeiten, wie vorher, mit dem Header" experience. */
const ED = window.MyJobDesignSystem_f3658e;

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

  const seg = (id, label) => (
    <button onClick={() => setDoc(id)} style={{ flex: 1, padding: '8px 10px', border: 'none', cursor: 'pointer', borderRadius: 'var(--radius-sm)', fontFamily: 'var(--font-mono)', fontSize: '12px', fontWeight: 600, background: doc === id ? 'var(--surface-card)' : 'transparent', color: doc === id ? 'var(--text-heading)' : 'var(--text-soft)', boxShadow: doc === id ? 'var(--shadow-xs)' : 'none' }}>{label}</button>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '14px' }}>
      <button onClick={onClose} style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', alignSelf: 'flex-start', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-muted)', padding: 0 }}>
        <ED.Icon name="arrowLeft" size={14} /> Back to profile
      </button>

      <div style={{ display: 'grid', gridTemplateColumns: '380px 1fr', gap: '20px', flex: 1, minHeight: 0, minWidth: 0 }}>
        {/* LEFT — form */}
        <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0, minWidth: 0 }}>
          <div style={{ display: 'flex', gap: '4px', background: 'var(--surface-sunk)', borderRadius: 'var(--radius-md)', padding: '4px', marginBottom: '16px' }}>
            {seg('lebenslauf', 'Resume')}{seg('anschreiben', 'Cover letter')}
          </div>

          <div style={{ flex: 1, overflowY: 'auto', paddingRight: '8px' }}>
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
              <ED.Button size="sm" variant="outline" iconLeft={<ED.Icon name="download" size={14} />}>PDF</ED.Button>
              <ED.Button size="sm" variant="primary" iconRight={<ED.Icon name="arrowRight" size={14} />} onClick={onCreateMappe}>To dossier</ED.Button>
            </div>
          </div>
          <div ref={previewRef} style={{ flex: 1, overflowY: 'auto', padding: '28px', display: 'flex', justifyContent: 'center' }}>
            <div style={{ zoom: scale }}>
              {doc === 'lebenslauf' ? <ResumeDoc contact={contact} resume={resume} /> : <LetterDoc contact={contact} letter={letter} />}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { Editor });
