/* RecruitRail — recruiting shell with a data-driven, grouped navigation.
   The rail is the desktop posture; the canonical components/app/AppShell.jsx
   adds a `tabs` (mobile bottom-nav) posture that this kit will adopt next.

   Navigation is a single source of truth: NAV_SECTIONS (grouped destinations)
   + NAV_FOOTER (pinned utilities). Adding a destination is a data edit here,
   not a JSX change anywhere else — the modern, scalable nav pattern used by
   Linear/Notion/Stripe-style products. */
const { Icon, IconButton, Avatar, Badge } = window.MyJobDesignSystem_f3658e;

/* Grouped destinations. `id` is the routing key consumed by app.jsx — the ids
   are stable; only the labels/grouping express the taxonomy (see
   decisions/nav-taxonomy.md, #201).

   WORK is the recruiter's funnel, left to right: the Workspace overview, the
   Mandates you're filling, Matching candidates to those roles, the Applications
   that produces, and the Placements you win. Matching lives here (not under
   PEOPLE) because it's an ACTION on the work — "fill this role" — whose output
   is an application, not a way to browse people. PEOPLE is the roster you
   represent (the Talent Pool). INSIGHTS reports on it. ASSISTANT is the AI
   surface (the product is "CoRecruiter"). */
const NAV_SECTIONS = [
  {
    label: 'Work',
    items: [
      { id: 'uebersicht', label: 'Workspace', icon: 'home' },
      { id: 'mandate', label: 'Mandates', icon: 'briefcase' },
      { id: 'matching', label: 'Matching', icon: 'search' },
      // Applications is wired to the live applications resource (ADR-0046):
      // submissions filed from Matching land here, so the board is reachable.
      { id: 'bewerbungen', label: 'Applications', icon: 'send' },
      { id: 'platzierungen', label: 'Placements', icon: 'award' },
    ],
  },
  {
    label: 'People',
    items: [{ id: 'pool', label: 'Talent Pool', icon: 'users' }],
  },
  // Comms/Inbox is hidden until it is wired to a real mail source — an empty
  // placeholder view reads as broken, not as "coming soon".

  {
    label: 'Insights',
    items: [{ id: 'berichte', label: 'Reports', icon: 'trend' }],
  },
  {
    // The section names the surface (Assistant); the product name (CoRecruiter)
    // stays on the item. "AI" as a section label was a category, not a place.
    label: 'Assistant',
    items: [{ id: 'assistant', label: 'CoRecruiter', icon: 'zap' }],
  },
];

/* Pinned utilities, rendered at the bottom of the rail. */
const NAV_FOOTER = [{ id: 'einstellungen', label: 'Settings', icon: 'sliders' }];

/* Quick light/dark switch in the rail footer — the same choice Settings offers,
   one click away (#196). Sits on the ink rail, so it's styled on glass. Inline
   sun/moon glyphs (the shared Icon set has none). */
function RailThemeToggle() {
  const useThemeHook = window.useTheme || (() => ['dark', () => {}]);
  const [mode] = useThemeHook();
  const t = window.myJobTheme;
  const [hover, setHover] = React.useState(false);
  const dark = mode !== 'light';
  const glyph = dark
    ? React.createElement('svg', { width: 15, height: 15, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true },
        React.createElement('path', { d: 'M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z' }))
    : React.createElement('svg', { width: 15, height: 15, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true },
        React.createElement('circle', { cx: 12, cy: 12, r: 4 }),
        React.createElement('path', { d: 'M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4' }));
  return (
    <button
      type="button"
      onClick={() => t && t.toggleMode()}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      aria-label={dark ? 'Switch to light appearance' : 'Switch to dark appearance'}
      title={dark ? 'Switch to light' : 'Switch to dark'}
      style={{
        width: '100%', display: 'flex', alignItems: 'center', gap: '11px', cursor: 'pointer',
        appearance: 'none', textAlign: 'left', margin: '2px 0', padding: '9px 12px',
        borderRadius: 'var(--radius-md)', border: '1px solid transparent',
        background: hover ? 'var(--sidebar-glass)' : 'transparent',
        color: 'var(--sidebar-muted)', fontFamily: 'var(--font-body)', fontSize: '13.5px', fontWeight: 500,
      }}
    >
      <span style={{ display: 'inline-flex', width: '20px', justifyContent: 'center', color: '#fff' }}>{glyph}</span>
      {dark ? 'Light mode' : 'Dark mode'}
    </button>
  );
}

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

/* A three-bar menu button — the DS icon set has no hamburger, so it is drawn
   inline. Shown only on mobile, it opens the navigation drawer. */
function MenuButton({ onClick }) {
  return (
    <button
      onClick={onClick}
      aria-label="Open navigation"
      style={{ flexShrink: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '38px', height: '38px', background: 'var(--surface-card)', border: '1px solid var(--border-strong)', borderRadius: 'var(--radius-md)', cursor: 'pointer', color: 'var(--text-soft)' }}
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
        <line x1="3" y1="6" x2="21" y2="6" />
        <line x1="3" y1="12" x2="21" y2="12" />
        <line x1="3" y1="18" x2="21" y2="18" />
      </svg>
    </button>
  );
}

function RecruitRail({ active, onNav, me, talentCount, search, onSearch, title, subtitle, badges = {}, actions, onLogout, children }) {
  const { isMobile } = window.useViewport ? window.useViewport() : { isMobile: false };
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  // Leaving mobile (e.g. rotating a tablet to landscape) hides the drawer so it
  // can't linger over the restored rail.
  React.useEffect(() => { if (!isMobile) setDrawerOpen(false); }, [isMobile]);
  const handleNav = (id) => { setDrawerOpen(false); onNav(id); };

  const railBg = 'linear-gradient(165deg, var(--ink-850) 0%, var(--ink-900) 100%)';
  const asideStyle = isMobile
    ? {
        position: 'fixed', top: 0, bottom: 0, left: 0, zIndex: 50, width: 'min(280px, 82vw)',
        transform: drawerOpen ? 'translateX(0)' : 'translateX(-100%)', transition: 'transform var(--dur-med, 0.24s) ease',
        display: 'flex', flexDirection: 'column', background: railBg,
        borderRight: '1px solid var(--sidebar-border)', boxShadow: drawerOpen ? 'var(--shadow-lg)' : 'none',
      }
    : {
        width: 'var(--app-nav-width)', flexShrink: 0, display: 'flex', flexDirection: 'column',
        background: railBg, borderRight: '1px solid var(--sidebar-border)',
      };

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: 'var(--app-bg)' }}>
      {/* Skip link: the first Tab stop jumps keyboard users straight past the
          rail to the page content (#203). Visually hidden until focused (see the
          .skip-link rule in index.html). */}
      <a href="#main-content" className="skip-link">Skip to content</a>
      {isMobile && drawerOpen && (
        <div onClick={() => setDrawerOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(8,11,18,0.5)', backdropFilter: 'blur(2px)', zIndex: 49 }} />
      )}
      <aside style={asideStyle}>
        <div style={{ padding: '20px 18px 16px', display: 'flex', alignItems: 'center', gap: '11px' }}>
          <img src="/design/myjob/assets/logo/myjob-mark.svg" width="34" height="34" alt="" />
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '18px', color: '#fff', letterSpacing: '-0.02em', lineHeight: 1 }}><span style={{ color: 'var(--accent-on-dark)' }}>my</span>Job</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--sidebar-soft)', marginTop: '3px' }}>We connect partners</div>
          </div>
        </div>

        <nav aria-label="Primary" style={{ padding: '8px 12px', display: 'flex', flexDirection: 'column', flex: 1, overflowY: 'auto' }}>
          {NAV_SECTIONS.map((s) => <NavSection key={s.label} section={s} active={active} onNav={handleNav} badges={badges} />)}
        </nav>

        {/* Pinned utilities (Settings) sit just above the identity footer. */}
        <div style={{ padding: '6px 12px 4px', borderTop: '1px solid var(--sidebar-border)' }}>
          {NAV_FOOTER.map((n) => <NavItem key={n.id} item={n} active={active === n.id} onClick={() => handleNav(n.id)} badge={badges[n.id]} />)}
          <RailThemeToggle />
        </div>

        {/* who I represent — the Vermittler scale, stated quietly */}
        <button onClick={() => handleNav('pool')} style={{
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
          height: 'var(--app-topbar-h)', flexShrink: 0, display: 'flex', alignItems: 'center', gap: isMobile ? '10px' : '16px',
          padding: isMobile ? '0 14px' : '0 28px', background: 'color-mix(in oklch, var(--paper) 88%, transparent)',
          backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', borderBottom: '1px solid var(--border)',
          position: 'sticky', top: 0, zIndex: 5,
        }}>
          {isMobile && <MenuButton onClick={() => setDrawerOpen(true)} />}
          <div style={{ minWidth: 0 }}>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: isMobile ? '16px' : '18px', fontWeight: 700, color: 'var(--text-heading)', margin: 0, letterSpacing: '-0.015em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{title}</h1>
            {subtitle && !isMobile && <div style={{ fontSize: '11.5px', color: 'var(--text-soft)', marginTop: '1px' }}>{subtitle}</div>}
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '10px' }}>
            {/* The header search is a desktop convenience; on mobile it would crowd
                out the title, so it is dropped (search stays reachable per view). */}
            {!isMobile && (
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--surface-card)', border: '1px solid var(--border-strong)', borderRadius: 'var(--radius-md)', padding: '0 11px', width: '220px' }}>
                <Icon name="search" size={15} style={{ color: 'var(--text-soft)' }} />
                <input value={search} onChange={(e) => onSearch(e.target.value)} placeholder="Talents, companies, roles …" style={{ flex: 1, minWidth: 0, border: 'none', outline: 'none', background: 'transparent', fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--text-heading)', padding: '8px 0' }} />
              </label>
            )}
            {/* Notifications return once there is something to notify about. */}
            {actions}
            {onLogout && (
              <button onClick={onLogout} title="Log out" style={{ display: 'inline-flex', alignItems: 'center', background: 'var(--surface-card)', border: '1px solid var(--border-strong)', borderRadius: 'var(--radius-pill)', padding: '7px 13px', cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: '12.5px', fontWeight: 600, color: 'var(--text-soft)' }}>Log out</button>
            )}
          </div>
        </header>

        <main id="main-content" tabIndex={-1} style={{ flex: 1, overflowY: 'auto', padding: 'var(--pad-app)', outline: 'none' }}>
          {children}
        </main>
      </div>
    </div>
  );
}

Object.assign(window, { RecruitRail });
