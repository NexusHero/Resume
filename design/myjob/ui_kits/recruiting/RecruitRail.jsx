/* RecruitRail — recruiting shell with a data-driven, grouped navigation.
   The rail is the desktop posture; the canonical components/app/AppShell.jsx
   adds a `tabs` (mobile bottom-nav) posture that this kit will adopt next.

   Navigation is a single source of truth: NAV_SECTIONS (grouped destinations)
   + NAV_FOOTER (pinned utilities). Adding a destination is a data edit here,
   not a JSX change anywhere else — the modern, scalable nav pattern used by
   Linear/Notion/Stripe-style products. */
const { Icon, IconButton, Avatar, Badge } = window.MyJobDesignSystem_f3658e;

/* Grouped destinations. `id` is the routing key consumed by app.jsx. */
const NAV_SECTIONS = [
  {
    label: 'Work',
    items: [
      { id: 'uebersicht', label: 'Workspace', icon: 'home' },
      { id: 'mandate', label: 'Mandates', icon: 'briefcase' },
      { id: 'bewerbungen', label: 'Applications', icon: 'columns' },
      { id: 'platzierungen', label: 'Placements', icon: 'award' },
    ],
  },
  {
    label: 'People',
    items: [
      { id: 'pool', label: 'Talent Pool', icon: 'users' },
      { id: 'matching', label: 'Matching', icon: 'search' },
    ],
  },
  {
    label: 'Comms',
    items: [{ id: 'postfach', label: 'Inbox', icon: 'inbox' }],
  },
  {
    label: 'Insights',
    items: [{ id: 'berichte', label: 'Reports', icon: 'trend' }],
  },
];

/* Pinned utilities, rendered at the bottom of the rail. */
const NAV_FOOTER = [{ id: 'einstellungen', label: 'Settings', icon: 'sliders' }];

function NavItem({ item, active, onClick, badge }) {
  const [hover, setHover] = React.useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: '11px', width: '100%',
        padding: '9px 11px', borderRadius: 'var(--radius-md)', border: 'none', cursor: 'pointer',
        fontFamily: 'var(--font-body)', fontSize: '13.5px', fontWeight: active ? 600 : 500,
        color: active ? '#fff' : 'var(--sidebar-muted)',
        background: active ? 'var(--sidebar-glass-strong)' : hover ? 'var(--sidebar-glass)' : 'transparent',
        textAlign: 'left', transition: 'background var(--dur-fast), color var(--dur-fast)',
      }}
    >
      <Icon name={item.icon} size={17} style={{ color: active ? 'var(--accent-on-dark)' : 'currentColor' }} />
      <span style={{ flex: 1 }}>{item.label}</span>
      {badge != null && (
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', fontWeight: 600, color: active ? '#fff' : 'var(--sidebar-soft)', background: active ? 'var(--accent)' : 'var(--sidebar-glass)', borderRadius: 'var(--radius-pill)', padding: '1px 7px', minWidth: '18px', textAlign: 'center' }}>{badge}</span>
      )}
    </button>
  );
}

/* A labelled group of nav items. The header is a small mono kicker. */
function NavSection({ section, active, onNav, badges }) {
  return (
    <div style={{ marginBottom: '6px' }}>
      <div style={{ padding: '10px 12px 5px', fontFamily: 'var(--font-mono)', fontSize: '9px', fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--sidebar-soft)' }}>{section.label}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
        {section.items.map((n) => (
          <NavItem key={n.id} item={n} active={active === n.id} onClick={() => onNav(n.id)} badge={badges[n.id]} />
        ))}
      </div>
    </div>
  );
}

function RecruitRail({ active, onNav, me, talentCount, search, onSearch, title, subtitle, badges = {}, actions, children }) {
  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: 'var(--surface-app)' }}>
      <aside style={{
        width: 'var(--app-nav-width)', flexShrink: 0, display: 'flex', flexDirection: 'column',
        background: 'linear-gradient(165deg, var(--ink-850) 0%, var(--ink-900) 100%)',
        borderRight: '1px solid var(--sidebar-border)',
      }}>
        <div style={{ padding: '20px 18px 16px', display: 'flex', alignItems: 'center', gap: '11px' }}>
          <img src="../../assets/logo/myjob-mark.svg" width="34" height="34" alt="" />
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '18px', color: '#fff', letterSpacing: '-0.02em', lineHeight: 1 }}><span style={{ color: 'var(--accent-on-dark)' }}>my</span>Job</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--sidebar-soft)', marginTop: '3px' }}>We connect partners</div>
          </div>
        </div>

        <nav style={{ padding: '8px 12px', display: 'flex', flexDirection: 'column', flex: 1, overflowY: 'auto' }}>
          {NAV_SECTIONS.map((s) => <NavSection key={s.label} section={s} active={active} onNav={onNav} badges={badges} />)}
        </nav>

        {/* Pinned utilities (Settings) sit just above the identity footer. */}
        <div style={{ padding: '6px 12px 4px', borderTop: '1px solid var(--sidebar-border)' }}>
          {NAV_FOOTER.map((n) => <NavItem key={n.id} item={n} active={active === n.id} onClick={() => onNav(n.id)} badge={badges[n.id]} />)}
        </div>

        {/* who I represent — the Vermittler scale, stated quietly */}
        <button onClick={() => onNav('talente')} style={{
          margin: '4px 14px 10px', padding: '11px 13px', borderRadius: 'var(--radius-md)', cursor: 'pointer', textAlign: 'left',
          background: 'var(--sidebar-glass)', border: '1px solid var(--sidebar-border)', display: 'flex', alignItems: 'center', gap: '10px',
        }}>
          <Avatar name={me.name} src={me.src} size="sm" ring />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '12.5px', fontWeight: 600, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{me.name}</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--sidebar-soft)' }}>Me · +{talentCount - 1} talents</div>
          </div>
          <Icon name="chevronRight" size={14} style={{ color: 'var(--sidebar-soft)' }} />
        </button>
      </aside>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <header style={{
          height: 'var(--app-topbar-h)', flexShrink: 0, display: 'flex', alignItems: 'center', gap: '16px',
          padding: '0 28px', background: 'color-mix(in oklch, var(--paper) 88%, transparent)',
          backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', borderBottom: '1px solid var(--border)',
          position: 'sticky', top: 0, zIndex: 5,
        }}>
          <div style={{ minWidth: 0 }}>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 700, color: 'var(--text-heading)', margin: 0, letterSpacing: '-0.015em' }}>{title}</h1>
            {subtitle && <div style={{ fontSize: '11.5px', color: 'var(--text-soft)', marginTop: '1px' }}>{subtitle}</div>}
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--surface-card)', border: '1px solid var(--border-strong)', borderRadius: 'var(--radius-md)', padding: '0 11px', width: '220px' }}>
              <Icon name="search" size={15} style={{ color: 'var(--text-soft)' }} />
              <input value={search} onChange={(e) => onSearch(e.target.value)} placeholder="Talents, companies, roles …" style={{ flex: 1, minWidth: 0, border: 'none', outline: 'none', background: 'transparent', fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--text-heading)', padding: '8px 0' }} />
            </label>
            <div style={{ position: 'relative' }}>
              <IconButton icon="bell" label="Notifications" variant="outline" />
              <span style={{ position: 'absolute', top: '-3px', right: '-3px', width: '8px', height: '8px', borderRadius: '50%', background: 'var(--signal-500)', border: '2px solid var(--paper)' }} />
            </div>
            {actions}
          </div>
        </header>

        <main style={{ flex: 1, overflowY: 'auto', padding: 'var(--pad-app)' }}>
          {children}
        </main>
      </div>
    </div>
  );
}

Object.assign(window, { RecruitRail });
