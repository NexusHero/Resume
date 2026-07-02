/* EditorDocs — the pure presentational live-preview documents for the editor:
   Lebenslauf (dark-header resume) and Anschreiben (cover letter). No state, no
   API calls — they render the contact/resume/letter props. The `template` prop
   mirrors the server's PDF variants (documents-html.ts): `modern` = accent
   headline + accent-bar section heads, `compact` = tighter spacing/type,
   `classic` = the default look. */
const EDC = window.MyJobDesignSystem_f3658e;

/* ---------------- live preview: Lebenslauf ---------------- */
function SectionHead({ children, template }) {
  if (template === 'modern') {
    return (
      <div style={{ borderLeft: '3px solid var(--accent)', paddingLeft: '9px', margin: '0 0 12px' }}>
        <h4 style={{ fontFamily: 'var(--font-mono)', fontSize: '10.5px', fontWeight: 600, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--accent-strong)', margin: 0 }}>{children}</h4>
      </div>
    );
  }
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: '0 0 12px' }}>
      <span style={{ width: '14px', height: '2px', background: 'var(--accent)', borderRadius: '2px' }} />
      <h4 style={{ fontFamily: 'var(--font-mono)', fontSize: '10.5px', fontWeight: 600, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--accent-strong)', margin: 0 }}>{children}</h4>
    </div>
  );
}

function ResumeDoc({ contact, resume, template = 'classic' }) {
  const compact = template === 'compact';
  const modern = template === 'modern';
  const mainPad = compact ? '26px 24px' : '34px 30px';
  const sectionGap = compact ? '18px' : '26px';
  const bodySize = compact ? '12px' : '13px';
  const bulletSize = compact ? '11.5px' : '12.5px';
  return (
    <div style={{ width: '720px', background: '#fff', borderRadius: 'var(--radius-md)', overflow: 'hidden', boxShadow: 'var(--shadow-page)', display: 'flex', minHeight: '940px' }}>
      {/* dark sidebar — the "Header" */}
      <aside style={{ width: '38%', background: 'linear-gradient(168deg, var(--ink-800) 0%, var(--ink-950) 100%)', color: '#fff', padding: compact ? '26px 22px' : '34px 26px' }}>
        <EDC.Avatar name={contact.name} src={contact.src} size={compact ? 88 : 104} radius="var(--radius-lg)" />
        <div style={{ fontFamily: 'var(--font-display)', fontSize: modern ? '27px' : compact ? '22px' : '25px', fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.1, marginTop: '18px', color: modern ? 'var(--accent-on-dark)' : '#fff' }}>{contact.name}</div>
        <div style={{ fontSize: '13px', color: 'var(--accent-on-dark)', fontWeight: 600, marginTop: '5px' }}>{contact.role}</div>

        <div style={{ height: '1px', background: 'var(--sidebar-border)', margin: compact ? '18px 0' : '24px 0' }} />

        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--sidebar-soft)', marginBottom: '13px' }}>Contact</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: compact ? '8px' : '11px' }}>
          {[['mail', contact.email], ['phone', contact.phone], ['pin', contact.location], ['linkedin', contact.linkedin]].filter(([, v]) => v).map(([ic, v]) => (
            <div key={ic} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ width: '26px', height: '26px', flexShrink: 0, borderRadius: 'var(--radius-sm)', background: 'var(--sidebar-glass)', border: '1px solid var(--sidebar-border)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-on-dark)' }}><EDC.Icon name={ic} size={13} /></span>
              <span style={{ fontSize: '11.5px', color: 'var(--sidebar-muted)', wordBreak: 'break-word' }}>{v}</span>
            </div>
          ))}
        </div>

        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--sidebar-soft)', margin: compact ? '18px 0 10px' : '26px 0 13px' }}>Skills</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: compact ? '9px' : '13px' }}>
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
      <main style={{ flex: 1, padding: mainPad }}>
        <section style={{ marginBottom: sectionGap }}>
          <SectionHead template={template}>Profile</SectionHead>
          <p style={{ fontSize: bodySize, lineHeight: compact ? 1.5 : 1.65, color: 'var(--text-body)', margin: 0 }}>{resume.summary}</p>
        </section>

        <section style={{ marginBottom: sectionGap }}>
          <SectionHead template={template}>Experience</SectionHead>
          <div style={{ position: 'relative', paddingLeft: '20px' }}>
            <span style={{ position: 'absolute', left: '4px', top: '5px', bottom: '5px', width: '1.5px', background: 'var(--border-strong)' }} />
            {resume.experience.map((e, i) => (
              <div key={i} style={{ position: 'relative', marginBottom: i === resume.experience.length - 1 ? 0 : compact ? '12px' : '18px' }}>
                <span style={{ position: 'absolute', left: '-20px', top: '4px', width: '9px', height: '9px', borderRadius: '50%', background: i === 0 ? 'var(--accent)' : '#fff', border: `2px solid ${i === 0 ? 'var(--accent)' : 'var(--border-strong)'}` }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '10px' }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: compact ? '13.5px' : '14.5px', fontWeight: 700, color: 'var(--text-heading)' }}>{e.role}</div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10.5px', color: 'var(--text-soft)', whiteSpace: 'nowrap' }}>{e.period}</div>
                </div>
                <div style={{ fontSize: bulletSize, color: 'var(--accent-strong)', fontWeight: 600, margin: '2px 0 7px' }}>{e.company}{e.location ? ' · ' + e.location : ''}</div>
                <ul style={{ margin: 0, paddingLeft: '16px', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                  {e.bullets.filter(Boolean).map((b, j) => <li key={j} style={{ fontSize: bulletSize, lineHeight: compact ? 1.4 : 1.5, color: 'var(--text-body)' }}>{b}</li>)}
                </ul>
              </div>
            ))}
          </div>
        </section>

        <section>
          <SectionHead template={template}>Education</SectionHead>
          <div style={{ display: 'flex', flexDirection: 'column', gap: compact ? '8px' : '11px' }}>
            {resume.education.map((e, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
                <div>
                  <div style={{ fontSize: compact ? '12.5px' : '13.5px', fontWeight: 700, color: 'var(--text-heading)' }}>{e.degree}</div>
                  <div style={{ fontSize: compact ? '11.5px' : '12px', color: 'var(--text-muted)', marginTop: '1px' }}>{e.school}{e.note ? ' · ' + e.note : ''}</div>
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
function LetterDoc({ contact, letter, template = 'classic' }) {
  const compact = template === 'compact';
  const modern = template === 'modern';
  const bodySize = compact ? '12px' : '13px';
  return (
    <div style={{ width: '720px', background: '#fff', borderRadius: 'var(--radius-md)', overflow: 'hidden', boxShadow: 'var(--shadow-page)', minHeight: '940px', display: 'flex', flexDirection: 'column' }}>
      {/* same dark header for brand consistency */}
      <div style={{ background: 'linear-gradient(168deg, var(--ink-800), var(--ink-950))', color: '#fff', padding: compact ? '22px 36px' : '28px 44px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: modern ? '26px' : compact ? '21px' : '24px', fontWeight: 700, letterSpacing: '-0.02em', color: modern ? 'var(--accent-on-dark)' : '#fff' }}>{contact.name}</div>
          <div style={{ fontSize: '12.5px', color: 'var(--accent-on-dark)', fontWeight: 600, marginTop: '3px' }}>{contact.role}</div>
        </div>
        <div style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: '10.5px', color: 'var(--sidebar-muted)', lineHeight: 1.7 }}>
          <div>{contact.email}</div><div>{contact.phone}</div><div>{contact.location}</div>
        </div>
      </div>

      <div style={{ flex: 1, padding: compact ? '30px 36px' : '38px 44px', fontFamily: 'var(--font-body)' }}>
        {/* recipient + date */}
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '20px', marginBottom: compact ? '26px' : '34px' }}>
          <div style={{ fontSize: bodySize, lineHeight: 1.6, color: 'var(--text-body)' }}>
            <div style={{ fontWeight: 600, color: 'var(--text-heading)' }}>{letter.firma}</div>
            <div>{letter.ansprechpartner}</div>
            <div>{letter.strasse}</div>
            <div>{letter.plzOrt}</div>
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11.5px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{contact.location}, {new Date().toLocaleDateString(/dear|sincerely|regards/i.test(`${letter.anrede} ${letter.gruss}`) ? 'en-GB' : 'de-DE')}</div>
        </div>

        <div style={{ fontSize: '14px', fontWeight: 700, color: modern ? 'var(--accent-strong)' : 'var(--text-heading)', marginBottom: '20px' }}>{letter.betreff}</div>
        <div style={{ fontSize: bodySize, color: 'var(--text-body)', marginBottom: '14px' }}>{letter.anrede}</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: compact ? '10px' : '13px' }}>
          {letter.absaetze.filter(Boolean).map((p, i) => <p key={i} style={{ fontSize: bodySize, lineHeight: compact ? 1.55 : 1.7, color: 'var(--text-body)', margin: 0 }}>{p}</p>)}
        </div>
        <div style={{ marginTop: '26px', fontSize: bodySize, color: 'var(--text-body)' }}>{letter.gruss}</div>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: '20px', fontWeight: 700, color: 'var(--text-heading)', marginTop: '8px', letterSpacing: '-0.01em' }}>{contact.name}</div>
      </div>
    </div>
  );
}

/* SectionHead stays private to this file — only the documents use it. */
Object.assign(window, { ResumeDoc, LetterDoc });
