/* TalentProfile — the core screen. A talent (Ich first) with three tabs:
   Lebenslauf (editable CV) · Anhänge (linkable docs) · Bewerbungen. */
const TP = window.BewerbungstoolDesignSystem_a75119;

function EditableSection({ icon, title, onEdit, children }) {
  const [hover, setHover] = React.useState(false);
  return (
    <section onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)} style={{ marginBottom: '26px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '9px', marginBottom: '14px' }}>
        <TP.Icon name={icon} size={15} style={{ color: 'var(--accent)' }} />
        <h3 style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-muted)', margin: 0 }}>{title}</h3>
        <span style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
        <span style={{ opacity: hover ? 1 : 0, transition: 'opacity var(--dur-fast)' }}>
          <TP.IconButton icon="edit" label="Bearbeiten" variant="ghost" size="sm" onClick={onEdit} />
        </span>
      </div>
      {children}
    </section>
  );
}

/* ---- Lebenslauf tab ---- */
function ResumeTab({ talent, onEdit, onCreateMappe }) {
  const r = talent.resume;
  if (!r) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-soft)' }}>
        <TP.Icon name="fileText" size={28} style={{ color: 'var(--border-strong)', margin: '0 auto 12px' }} />
        <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-muted)' }}>Noch kein Lebenslauf hinterlegt</div>
        <div style={{ fontSize: '13px', marginTop: '4px', marginBottom: '16px' }}>Lege für {talent.name.split(' ')[0]} einen Lebenslauf an.</div>
        <TP.Button variant="primary" size="sm" iconLeft={<TP.Icon name="plus" size={15} />} onClick={onEdit}>Lebenslauf anlegen</TP.Button>
      </div>
    );
  }
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '24px', alignItems: 'start' }}>
      {/* CV sheet */}
      <TP.Card style={{ padding: '32px 34px' }} bodyStyle={{ padding: 0 }}>
        <div style={{ padding: '32px 34px' }}>
          <EditableSection icon="user" title="Profil" onEdit={onEdit}>
            <p style={{ fontSize: '14.5px', lineHeight: 1.65, color: 'var(--text-body)', margin: 0 }}>{r.summary}</p>
          </EditableSection>

          <EditableSection icon="briefcase" title="Berufserfahrung" onEdit={onEdit}>
            <div style={{ position: 'relative', paddingLeft: '22px' }}>
              <span style={{ position: 'absolute', left: '5px', top: '6px', bottom: '6px', width: '1.5px', background: 'var(--border-strong)' }} />
              {r.experience.map((e, i) => (
                <div key={i} style={{ position: 'relative', marginBottom: i === r.experience.length - 1 ? 0 : '20px' }}>
                  <span style={{ position: 'absolute', left: '-21px', top: '4px', width: '10px', height: '10px', borderRadius: '50%', background: i === 0 ? 'var(--accent)' : '#fff', border: `2px solid ${i === 0 ? 'var(--accent)' : 'var(--border-strong)'}` }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '10px' }}>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: '15.5px', fontWeight: 700, color: 'var(--text-heading)' }}>{e.role}</div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-soft)', whiteSpace: 'nowrap' }}>{e.period}</div>
                  </div>
                  <div style={{ fontSize: '13px', color: 'var(--accent-strong)', fontWeight: 600, margin: '2px 0 8px' }}>{e.company} · {e.location}</div>
                  <ul style={{ margin: '0 0 9px', paddingLeft: '17px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {e.bullets.map((b, j) => <li key={j} style={{ fontSize: '13.5px', lineHeight: 1.55, color: 'var(--text-body)' }}>{b}</li>)}
                  </ul>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {e.skills.map((s, j) => <TP.Badge key={j} variant="subtle" size="sm">{s}</TP.Badge>)}
                  </div>
                </div>
              ))}
            </div>
          </EditableSection>

          <EditableSection icon="cap" title="Ausbildung" onEdit={onEdit}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {r.education.map((e, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-heading)' }}>{e.degree}</div>
                    <div style={{ fontSize: '12.5px', color: 'var(--text-muted)', marginTop: '1px' }}>{e.school} · {e.note}</div>
                  </div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-soft)', whiteSpace: 'nowrap' }}>{e.period}</div>
                </div>
              ))}
            </div>
          </EditableSection>

          <section>
            <div style={{ display: 'flex', alignItems: 'center', gap: '9px', marginBottom: '14px' }}>
              <TP.Icon name="zap" size={15} style={{ color: 'var(--accent)' }} />
              <h3 style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-muted)', margin: 0 }}>Kompetenzen</h3>
              <span style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {r.skillGroups.map((g, i) => (
                <div key={i} style={{ display: 'flex', gap: '12px', alignItems: 'baseline' }}>
                  <span style={{ width: '78px', flexShrink: 0, fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-soft)' }}>{g.label}</span>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {g.items.map((s, j) => <TP.Badge key={j} variant={j === 0 ? 'soft' : 'outline'} size="sm">{s}</TP.Badge>)}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </TP.Card>

      {/* side rail: actions + linked attachments */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', position: 'sticky', top: 0 }}>
        <TP.Card>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-soft)', marginBottom: '10px' }}>Lebenslauf</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <TP.Button variant="primary" block iconLeft={<TP.Icon name="send" size={15} />} onClick={onCreateMappe}>Bewerbungsmappe erstellen</TP.Button>
            <TP.Button variant="outline" block iconLeft={<TP.Icon name="edit" size={15} />} onClick={onEdit}>Lebenslauf bearbeiten</TP.Button>
            <TP.Button variant="ghost" block iconLeft={<TP.Icon name="download" size={15} />}>Als PDF exportieren</TP.Button>
          </div>
        </TP.Card>
        <TP.Card>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-soft)' }}>Verknüpfte Anhänge</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-soft)' }}>{talent.attachments.length}</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
            {talent.attachments.map((a) => (
              <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: '9px', padding: '8px 10px', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', background: 'var(--surface-subtle)' }}>
                <TP.Icon name="paperclip" size={14} style={{ color: 'var(--accent)' }} />
                <span style={{ flex: 1, fontSize: '12px', fontWeight: 500, color: 'var(--text-heading)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.name}</span>
              </div>
            ))}
          </div>
        </TP.Card>
      </div>
    </div>
  );
}

/* ---- Anhänge tab — documents that link to applications ---- */
function AttachmentsTab({ talent, apps }) {
  const usage = (atId) => apps.filter((a) => (a.attachments || []).includes(atId));
  return (
    <TP.Card pad={false}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', borderBottom: '1px solid var(--border)' }}>
        <div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '15px', fontWeight: 700, color: 'var(--text-heading)' }}>Dokumente & Anhänge</div>
          <div style={{ fontSize: '12px', color: 'var(--text-soft)', marginTop: '1px' }}>Einmal hochladen, mit beliebigen Bewerbungen verknüpfen</div>
        </div>
        <TP.Button variant="ink" size="sm" iconLeft={<TP.Icon name="upload" size={14} />}>Hochladen</TP.Button>
      </div>
      {talent.attachments.length === 0 && (
        <div style={{ padding: '40px', textAlign: 'center', fontSize: '13px', color: 'var(--text-soft)' }}>Noch keine Anhänge.</div>
      )}
      {talent.attachments.map((a) => {
        const used = usage(a.id);
        return (
          <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 18px', borderBottom: '1px solid var(--border)' }}>
            <span style={{ width: '38px', height: '38px', flexShrink: 0, borderRadius: 'var(--radius-md)', background: 'var(--accent-soft)', color: 'var(--accent-strong)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}><TP.Icon name="fileText" size={18} /></span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-heading)' }}>{a.name}<span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--accent-strong)', marginLeft: '8px' }}>{a.tag}</span></div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-soft)', marginTop: '1px' }}>{a.sub}</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
              {used.length === 0
                ? <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-soft)' }}>nicht verknüpft</span>
                : used.map((u) => <TP.Badge key={u.id} variant="subtle" size="sm" icon={<TP.Icon name="paperclip" size={10} />}>{u.company.split(' ')[0]}</TP.Badge>)}
            </div>
            <TP.IconButton icon="more" label="Mehr" variant="ghost" size="sm" />
          </div>
        );
      })}
    </TP.Card>
  );
}

/* ---- Bewerbungen tab ---- */
function TalentApplications({ apps, onCreateMappe }) {
  return (
    <TP.Card pad={false} title="Bewerbungen" subtitle="Alle Mappen dieses Talents"
      action={<TP.Button size="sm" variant="primary" iconLeft={<TP.Icon name="plus" size={14} />} onClick={onCreateMappe}>Neue Mappe</TP.Button>}>
      {apps.length === 0 && <div style={{ padding: '40px', textAlign: 'center', fontSize: '13px', color: 'var(--text-soft)' }}>Noch keine Bewerbungen.</div>}
      {apps.map((a) => (
        <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 18px', borderBottom: '1px solid var(--border)' }}>
          <span style={{ width: '38px', height: '38px', flexShrink: 0, borderRadius: 'var(--radius-md)', background: 'var(--surface-sunk)', color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}><TP.Icon name="building" size={18} /></span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '14.5px', fontWeight: 700, color: 'var(--text-heading)' }}>{a.company}</div>
            <div style={{ fontSize: '12.5px', color: 'var(--text-muted)', marginTop: '1px' }}>{a.role} · {a.location}</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {a.anschreiben && <TP.Badge variant="subtle" size="sm" icon={<TP.Icon name="fileText" size={10} />}>Anschreiben</TP.Badge>}
            <TP.Badge variant="subtle" size="sm" icon={<TP.Icon name="paperclip" size={10} />}>{(a.attachments || []).length}</TP.Badge>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '5px', width: '150px' }}>
            <TP.StatusBadge status={a.status} size="sm" />
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-soft)' }}>{a.next}</span>
          </div>
        </div>
      ))}
    </TP.Card>
  );
}

function TalentProfile({ talent, apps, onBack, onEdit, onCreateMappe }) {
  const [tab, setTab] = React.useState('lebenslauf');
  const tabs = [
    { id: 'lebenslauf', label: 'Lebenslauf' },
    { id: 'anhaenge', label: 'Anhänge', count: talent.attachments.length },
    { id: 'bewerbungen', label: 'Bewerbungen', count: apps.length },
  ];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
      <button onClick={onBack} style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', alignSelf: 'flex-start', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-muted)', padding: 0 }}>
        <TP.Icon name="arrowLeft" size={14} /> Talente
      </button>

      {/* identity header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '18px', padding: '22px 26px', borderRadius: 'var(--radius-lg)', background: 'linear-gradient(160deg, var(--ink-850), var(--ink-900))', color: '#fff' }}>
        <TP.Avatar name={talent.name} src={talent.src} size={72} radius="var(--radius-lg)" ring={talent.me} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '26px', fontWeight: 700, letterSpacing: '-0.025em', margin: 0 }}>{talent.name}</h2>
            {talent.me && <TP.Badge variant="light" size="sm">Ich</TP.Badge>}
          </div>
          <div style={{ fontSize: '14px', color: 'var(--sidebar-muted)', marginTop: '3px' }}>{talent.role} · {talent.headline}</div>
          <div style={{ display: 'flex', gap: '8px', marginTop: '12px', flexWrap: 'wrap' }}>
            <TP.Badge variant="glass" size="sm" icon={<TP.Icon name="pin" size={11} />}>{talent.location}</TP.Badge>
            <TP.Badge variant="glass" size="sm" icon={<TP.Icon name="clock" size={11} />}>{talent.availability}</TP.Badge>
            <TP.Badge variant="glass" size="sm" icon={<TP.Icon name="mail" size={11} />}>{talent.email}</TP.Badge>
          </div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '30px', fontWeight: 700, color: 'var(--accent-on-dark)', lineHeight: 1 }}>{talent.score}%</div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--sidebar-soft)', marginTop: '4px' }}>Profil-Stärke</div>
        </div>
      </div>

      <TP.Tabs value={tab} onChange={setTab} tabs={tabs} />

      {tab === 'lebenslauf' && <ResumeTab talent={talent} onEdit={onEdit} onCreateMappe={onCreateMappe} />}
      {tab === 'anhaenge' && <AttachmentsTab talent={talent} apps={apps} />}
      {tab === 'bewerbungen' && <TalentApplications apps={apps} onCreateMappe={onCreateMappe} />}
    </div>
  );
}

Object.assign(window, { TalentProfile });
