/* __kit_guard__ */
(function(){ var __s=document.currentScript; if (__s && /_ds_bundle\.js/.test(__s.src||'')) return;
/* AppShell — the dark navigation rail + sticky topbar that wraps every screen. */
const { Icon, IconButton, Avatar, Badge } = window.BewerbungstoolDesignSystem_a75119;

const HR_NAV = [
  { id: 'pipeline', label: 'Pipeline', icon: 'columns' },
  { id: 'stellen', label: 'Stellen', icon: 'briefcase' },
  { id: 'talente', label: 'Talente', icon: 'users' },
  { id: 'berichte', label: 'Berichte', icon: 'trend' },
  { id: 'postfach', label: 'Postfach', icon: 'inbox' },
];

function NavItem({ item, active, onClick }) {
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
      {item.label}
    </button>
  );
}

function AppShell({ active, onNav, navItems = HR_NAV, role, onRole, search, onSearch, title, subtitle, actions, children }) {
  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: 'var(--surface-app)' }}>
      {/* nav rail */}
      <aside style={{
        width: 'var(--app-nav-width)', flexShrink: 0, display: 'flex', flexDirection: 'column',
        background: 'linear-gradient(165deg, var(--ink-850) 0%, var(--ink-900) 100%)',
        borderRight: '1px solid var(--sidebar-border)',
      }}>
        <div style={{ padding: '20px 18px 16px', display: 'flex', alignItems: 'center', gap: '11px' }}>
          <img src="../../assets/logo/myjob-mark.svg" width="34" height="34" alt="" />
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '18px', color: '#fff', letterSpacing: '-0.02em', lineHeight: 1 }}><span style={{ color: 'var(--accent-on-dark)' }}>my</span>Job</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--sidebar-soft)', marginTop: '3px' }}>Bewerbungstool</div>
          </div>
        </div>

        <nav style={{ padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: '3px', flex: 1 }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--sidebar-soft)', padding: '8px 11px 6px' }}>{role === 'hr' ? 'Arbeitsbereich' : 'Agentur'}</div>
          {navItems.map((n) => <NavItem key={n.id} item={n} active={active === n.id} onClick={() => onNav(n.id)} />)}
        </nav>

        {/* role switcher */}
        <div style={{ padding: '14px 14px 10px', borderTop: '1px solid var(--sidebar-border)' }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--sidebar-soft)', marginBottom: '8px' }}>Ansicht</div>
          <div style={{ display: 'flex', background: 'var(--sidebar-glass)', borderRadius: 'var(--radius-md)', padding: '3px', border: '1px solid var(--sidebar-border)' }}>
            {[['hr', 'HR'], ['vermittler', 'Vermittler']].map(([id, lbl]) => (
              <button key={id} onClick={() => onRole(id)} style={{
                flex: 1, padding: '6px 8px', border: 'none', cursor: 'pointer', borderRadius: 'var(--radius-sm)',
                fontFamily: 'var(--font-mono)', fontSize: '11px', fontWeight: 600,
                background: role === id ? 'var(--accent)' : 'transparent',
                color: role === id ? '#fff' : 'var(--sidebar-muted)', transition: 'background var(--dur-fast)',
              }}>{lbl}</button>
            ))}
          </div>
        </div>

        <div style={{ padding: '10px 14px 16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Avatar name={role === 'hr' ? 'Petra Voss' : 'Karl Mertens'} size="sm" />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '12.5px', fontWeight: 600, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{role === 'hr' ? 'Petra Voss' : 'Karl Mertens'}</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--sidebar-soft)' }}>{role === 'hr' ? 'Recruiting · Acme' : 'Vermittler · TalentBridge'}</div>
          </div>
          <Icon name="logout" size={15} style={{ color: 'var(--sidebar-soft)' }} />
        </div>
      </aside>

      {/* main column */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* topbar */}
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
              <input value={search} onChange={(e) => onSearch(e.target.value)} placeholder="Suchen …" style={{ flex: 1, minWidth: 0, border: 'none', outline: 'none', background: 'transparent', fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--text-heading)', padding: '8px 0' }} />
            </label>
            <div style={{ position: 'relative' }}>
              <IconButton icon="bell" label="Benachrichtigungen" variant="outline" />
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

Object.assign(window, { AppShell, HR_NAV });

})();
