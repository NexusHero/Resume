/* Workspace — Übersicht (dashboard), Talente grid, Stellen, Postfach. */
const WS = window.MyJobDesignSystem_5611b7;

/* ---------- Übersicht — the recruiting desk at a glance ---------- */
function OnboardingCard({ onNav }) {
  const steps = [
    { icon: 'users', nav: 'pool', title: 'Talent hinzufügen', desc: 'Pool aufbauen — Kandidat:in anlegen oder CVs importieren.' },
    { icon: 'briefcase', nav: 'mandate', title: 'Mandat anlegen', desc: 'Eine zu besetzende Rolle öffnen und ihre Pipeline verfolgen.' },
    { icon: 'search', nav: 'matching', title: 'Stellen finden', desc: 'Kandidat:in auf passende Stellen matchen und bewerben.' },
  ];
  return (
    <WS.Card>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: '16px', fontWeight: 700, color: 'var(--text-heading)' }}>Leg mit deinem Desk los</div>
      <div style={{ fontSize: '13px', color: 'var(--text-soft)', marginTop: '3px', marginBottom: '16px' }}>Drei schnelle Einstiege — wähl einen.</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
        {steps.map((s) => (
          <button
            key={s.nav}
            onClick={() => onNav(s.nav)}
            style={{ textAlign: 'left', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '8px', padding: '15px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'var(--surface-sunk)' }}
          >
            <span style={{ width: '34px', height: '34px', borderRadius: 'var(--radius-md)', background: 'var(--accent-soft)', color: 'var(--accent-strong)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}><WS.Icon name={s.icon} size={16} /></span>
            <span style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--text-heading)' }}>{s.title}</span>
            <span style={{ fontSize: '12px', color: 'var(--text-soft)', lineHeight: 1.5 }}>{s.desc}</span>
          </button>
        ))}
      </div>
    </WS.Card>
  );
}

function Dashboard({ me, apps, vkpis, clients, mandates, talentCount, onNav, onOpenTalent, onOpenPipeline, onOpenMandate }) {
  const { isMobile } = window.useViewport ? window.useViewport() : { isMobile: false };
  // The desk's applications that need progressing — interview/offer stage across
  // every candidate (this is an agency view; the recruiter places others).
  const nextSteps = apps.filter((a) => a.status === 'interview' || a.status === 'offer');
  // First run: nothing on the desk yet — guide the recruiter to a first action
  // instead of showing four zeroes and empty panels.
  const firstRun = mandates.length === 0 && apps.length === 0 && (talentCount || 0) === 0;
  // Live mandates carry the client name directly; the sample shape carries a
  // clientId resolved against the clients list. Prefer the name, fall back.
  const clientName = (m) => m.client || (clients.find((c) => c.id === m.clientId) || {}).name || '';
  const topMandates = mandates.filter((m) => m.status === 'active').slice(0, 4);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
      {/* greeting — quiet, no dark bar; profile lives bottom-left in the rail */}
      <div>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: '22px', fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--text-heading)' }}>Hallo, {me.name.split(' ')[0]}.</div>
        <div style={{ fontSize: '13px', color: 'var(--text-soft)', marginTop: '3px' }}>{mandates.filter((m) => m.status === 'active').length} aktive Mandate · {nextSteps.length} {nextSteps.length === 1 ? 'Bewerbung' : 'Bewerbungen'} in Interview oder Angebot.</div>
      </div>

      {firstRun && onNav && <OnboardingCard onNav={onNav} />}

      {/* agency kpis */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', gap: '14px' }}>
        {vkpis.map((k, i) => <WS.StatCard key={i} {...k} />)}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '16px', alignItems: 'start' }}>
        {/* active mandates */}
        <WS.Card title="Aktive Mandate" subtitle="Suchmandate mit Frist"
          action={<WS.Button size="sm" variant="ghost" iconRight={<WS.Icon name="arrowRight" size={14} />} onClick={onOpenMandate}>Alle</WS.Button>} pad={false}>
          {topMandates.map((m) => (
            <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: '13px', padding: '13px 18px', borderBottom: '1px solid var(--border)' }}>
              <span style={{ width: '38px', height: '38px', borderRadius: 'var(--radius-md)', background: 'var(--accent-soft)', color: 'var(--accent-strong)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><WS.Icon name="briefcase" size={17} /></span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--text-heading)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.role}</div>
                <div style={{ fontSize: '11.5px', color: 'var(--text-soft)', marginTop: '1px' }}>{clientName(m)} · {m.submitted} vorgeschlagen</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', fontWeight: 600, color: 'var(--accent-strong)' }}>{m.fee}</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10.5px', color: 'var(--text-soft)' }}>bis {m.deadline}</div>
              </div>
            </div>
          ))}
        </WS.Card>

        {/* applications to progress across the desk */}
        <WS.Card title="Bewerbungen im Fortschritt" subtitle="Interview & Angebot"
          action={<WS.Button size="sm" variant="ghost" iconRight={<WS.Icon name="arrowRight" size={14} />} onClick={onOpenPipeline}>Pipeline</WS.Button>} pad={false}>
          {nextSteps.map((a) => (
            <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: '13px', padding: '13px 18px', borderBottom: '1px solid var(--border)' }}>
              <WS.EntityTile type="company" name={a.company} size="md" />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-heading)' }}>{a.company}</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--accent-strong)', marginTop: '1px' }}>{a.talentName || a.role || ''}</div>
              </div>
              <WS.StatusBadge status={a.status} size="sm" />
            </div>
          ))}
          {nextSteps.length === 0 && <div style={{ padding: '30px', textAlign: 'center', fontSize: '13px', color: 'var(--text-soft)' }}>Noch keine Bewerbungen in Interview oder Angebot.</div>}
        </WS.Card>
      </div>
    </div>
  );
}

/* ---------- Talents grid ---------- */
function TalentGrid({ talents, apps, onOpen, onAdd, onImport, importing }) {
  const fileRef = React.useRef(null);
  const pickFiles = (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (files.length && onImport) onImport(files);
  };
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-soft)' }}>{talents.length} {talents.length === 1 ? 'Talent' : 'Talente'}</span>
        <span style={{ flex: 1 }} />
        {onImport && (
          <>
            <input ref={fileRef} type="file" accept=".pdf,application/pdf" multiple style={{ display: 'none' }} onChange={pickFiles} />
            <WS.Button size="sm" variant="outline" iconLeft={<WS.Icon name="upload" size={14} />} onClick={() => fileRef.current && fileRef.current.click()} disabled={importing}>{importing ? 'Importiere…' : 'CVs importieren'}</WS.Button>
          </>
        )}
        <WS.Button size="sm" variant="outline" iconLeft={<WS.Icon name="plus" size={14} />} onClick={onAdd}>Talent hinzufügen</WS.Button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '14px' }}>
        {talents.map((t) => {
          const n = apps.filter((a) => a.talentId === t.id).length;
          return (
            <WS.Card key={t.id} style={{ cursor: 'pointer', border: t.me ? '1px solid var(--accent-border)' : '1px solid var(--border)' }} onClick={() => onOpen(t.id)}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '13px' }}>
                <WS.Avatar name={t.name} src={t.src} size="lg" ring={t.me} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                    <span style={{ fontFamily: 'var(--font-display)', fontSize: '16px', fontWeight: 700, color: 'var(--text-heading)' }}>{t.name}</span>
                    {t.me && <WS.Badge variant="soft" size="sm">Me</WS.Badge>}
                  </div>
                  <div style={{ fontSize: '12.5px', color: 'var(--text-muted)', marginTop: '1px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.role}</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', margin: '13px 0' }}>
                {t.skills.slice(0, 3).map((s, i) => <WS.Badge key={i} variant="outline" size="sm">{s}</WS.Badge>)}
                {t.skills.length > 3 && <WS.Badge variant="subtle" size="sm">+{t.skills.length - 3}</WS.Badge>}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '12px', borderTop: '1px solid var(--border)' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-soft)' }}><WS.Icon name="send" size={12} />{n} {n === 1 ? 'Bewerbung' : 'Bewerbungen'}</span>
                {t.score != null ? <WS.MatchIndicator value={t.score} variant="chip" size="sm" /> : <span style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', color: 'var(--text-muted)' }}>—</span>}
              </div>
            </WS.Card>
          );
        })}
      </div>
    </div>
  );
}

/* ---------- Stellen ---------- */
function JobsView({ jobs }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
      {jobs.map((j) => (
        <WS.Card key={j.id}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '10px' }}>
            <div>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '16px', fontWeight: 700, color: 'var(--text-heading)', margin: 0, letterSpacing: '-0.01em' }}>{j.title}</h3>
              <div style={{ fontSize: '12.5px', color: 'var(--text-muted)', marginTop: '3px' }}>{j.company}</div>
            </div>
            <WS.IconButton icon="bookmark" label="Save" variant={j.saved ? 'accent' : 'ghost'} size="sm" />
          </div>
          <div style={{ display: 'flex', gap: '8px', margin: '14px 0', flexWrap: 'wrap' }}>
            <WS.MetaPill icon="pin">{j.location}</WS.MetaPill>
            <WS.MetaPill icon="trend">{j.salary}</WS.MetaPill>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '12px', borderTop: '1px solid var(--border)' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontFamily: 'var(--font-mono)', fontSize: '12px', color: j.match >= 85 ? 'var(--success)' : 'var(--text-muted)', fontWeight: 600 }}>
              <WS.Icon name="zap" size={13} />{j.match}% Match
            </span>
            <WS.Button size="sm" variant="primary" iconRight={<WS.Icon name="arrowRight" size={14} />}>Apply</WS.Button>
          </div>
        </WS.Card>
      ))}
    </div>
  );
}

/* ---------- Postfach ---------- */
function Inbox({ messages, apps, talents, onOpenTalent }) {
  const appById = Object.fromEntries(apps.map((a) => [a.id, a]));
  const talById = Object.fromEntries(talents.map((t) => [t.id, t]));
  return (
    <WS.Card pad={false}>
      {messages.map((m) => {
        const app = appById[m.appId];
        const tal = app && talById[app.talentId];
        return (
          <div key={m.id} onClick={() => tal && onOpenTalent(tal.id)} style={{ display: 'flex', alignItems: 'center', gap: '13px', padding: '14px 18px', borderBottom: '1px solid var(--border)', cursor: 'pointer', background: m.unread ? 'var(--accent-soft)' : 'transparent' }}>
            <WS.EntityTile type="company" name={m.from} size="md" />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontFamily: 'var(--font-display)', fontSize: '14px', fontWeight: 700, color: 'var(--text-heading)' }}>{m.from}</span>
                {m.unread && <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: 'var(--accent)' }} />}
                {tal && <WS.Badge variant="subtle" size="sm">{tal.me ? 'Me' : tal.name.split(' ')[0]}</WS.Badge>}
              </div>
              <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.text}</div>
            </div>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-soft)', flexShrink: 0 }}>{m.when}</span>
          </div>
        );
      })}
    </WS.Card>
  );
}

Object.assign(window, { Dashboard, TalentGrid, JobsView, Inbox });
