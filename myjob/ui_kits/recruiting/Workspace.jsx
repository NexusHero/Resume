/* Workspace — Übersicht (dashboard), Talente grid, Stellen, Postfach. */
const WS = window.BewerbungstoolDesignSystem_a75119;

/* ---------- Übersicht — agency-led, but my own applications stay front of mind ---------- */
function Dashboard({ me, apps, vkpis, clients, mandates, onOpenTalent, onOpenPipeline, onOpenMandate }) {
  const mine = apps.filter((a) => a.talentId === 'me');
  const nextSteps = mine.filter((a) => a.status === 'interview' || a.status === 'offer');
  const clientName = (id) => (clients.find((c) => c.id === id) || {}).name || '';
  const topMandates = mandates.filter((m) => m.status === 'active').slice(0, 4);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
      {/* greeting */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '20px 24px', borderRadius: 'var(--radius-lg)', background: 'linear-gradient(160deg, var(--ink-850), var(--ink-900))', color: '#fff' }}>
        <WS.Avatar name={me.name} src={me.src} size={52} radius="var(--radius-md)" ring />
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '20px', fontWeight: 700, letterSpacing: '-0.02em' }}>Hello, {me.name.split(' ')[0]}.</div>
          <div style={{ fontSize: '13px', color: 'var(--sidebar-muted)', marginTop: '2px' }}>{mandates.filter((m) => m.status === 'active').length} active mandates · {nextSteps.length} of your own applications in motion.</div>
        </div>
        <WS.Button variant="primary" iconLeft={<WS.Icon name="user" size={15} />} onClick={() => onOpenTalent('me')}>My profile</WS.Button>
      </div>

      {/* agency kpis */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px' }}>
        {vkpis.map((k, i) => <WS.StatCard key={i} {...k} />)}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', alignItems: 'start' }}>
        {/* active mandates */}
        <WS.Card title="Active mandates" subtitle="Search mandates with deadline"
          action={<WS.Button size="sm" variant="ghost" iconRight={<WS.Icon name="arrowRight" size={14} />} onClick={onOpenMandate}>All</WS.Button>} pad={false}>
          {topMandates.map((m) => (
            <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: '13px', padding: '13px 18px', borderBottom: '1px solid var(--border)' }}>
              <span style={{ width: '36px', height: '36px', borderRadius: 'var(--radius-md)', background: 'var(--ink-900)', color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><WS.Icon name="briefcase" size={16} /></span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--text-heading)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.role}</div>
                <div style={{ fontSize: '11.5px', color: 'var(--text-soft)', marginTop: '1px' }}>{clientName(m.clientId)} · {m.submitted} proposed</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', fontWeight: 600, color: 'var(--accent-strong)' }}>{m.fee}</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10.5px', color: 'var(--text-soft)' }}>due {m.deadline}</div>
              </div>
            </div>
          ))}
        </WS.Card>

        {/* my own next steps */}
        <WS.Card title="My next steps" subtitle="Own applications (me)"
          action={<WS.Button size="sm" variant="ghost" iconRight={<WS.Icon name="arrowRight" size={14} />} onClick={onOpenPipeline}>Pipeline</WS.Button>} pad={false}>
          {nextSteps.map((a) => (
            <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: '13px', padding: '13px 18px', borderBottom: '1px solid var(--border)' }}>
              <span style={{ width: '36px', height: '36px', borderRadius: 'var(--radius-md)', background: 'var(--surface-sunk)', color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><WS.Icon name="building" size={17} /></span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-heading)' }}>{a.company}</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--accent-strong)', marginTop: '1px' }}>{a.next}</div>
              </div>
              <WS.StatusBadge status={a.status} size="sm" />
            </div>
          ))}
          {nextSteps.length === 0 && <div style={{ padding: '30px', textAlign: 'center', fontSize: '13px', color: 'var(--text-soft)' }}>No open steps.</div>}
        </WS.Card>
      </div>
    </div>
  );
}

/* ---------- Talents grid ---------- */
function TalentGrid({ talents, apps, onOpen }) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-soft)' }}>{talents.length} talents</span>
        <span style={{ flex: 1 }} />
        <WS.Button size="sm" variant="outline" iconLeft={<WS.Icon name="plus" size={14} />}>Add talent</WS.Button>
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
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-soft)' }}><WS.Icon name="send" size={12} />{n} applications</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', fontWeight: 600, color: t.score >= 80 ? 'var(--success)' : 'var(--text-muted)' }}>{t.score}%</span>
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
            <WS.MetaPill icon="trend" tone="accent">{j.salary}</WS.MetaPill>
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
            <span style={{ width: '40px', height: '40px', flexShrink: 0, borderRadius: 'var(--radius-md)', background: 'var(--ink-900)', color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}><WS.Icon name="building" size={18} /></span>
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
