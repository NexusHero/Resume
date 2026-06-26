/* Shell — app frame for myJob · Karriere.
   Two directions: 'rail' (ink sidebar, on-brand) and 'bright' (light sidebar,
   airy Personio-style). Topbar carries the Mode (light/dark) + Direction toggles. */
const SH = window.MyJobDesignSystem_f3658e;

const NAV = [
  { id: 'uebersicht', label: 'Übersicht', icon: 'home' },
  { id: 'jobsuche', label: 'Jobsuche', icon: 'search' },
  { id: 'jobquellen', label: 'Jobquellen', icon: 'globe' },
  { id: 'bewerbungen', label: 'Bewerbungen', icon: 'send' },
  { id: 'stellen', label: 'Meine Stellen', icon: 'briefcase' },
];

function SegToggle({ options, value, onChange, bright }) {
  return (
    <div style={{
      display: 'inline-flex', padding: '3px', borderRadius: 'var(--radius-pill)',
      background: bright ? 'var(--surface-sunk)' : 'var(--sidebar-glass)',
      border: `1px solid ${bright ? 'var(--border)' : 'var(--sidebar-border)'}`,
    }}>
      {options.map((o) => {
        const active = o.id === value;
        return (
          <button key={o.id} onClick={() => onChange(o.id)} title={o.label}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px', border: 'none', cursor: 'pointer',
              padding: o.iconOnly ? '6px 9px' : '6px 12px', borderRadius: 'var(--radius-pill)',
              fontFamily: 'var(--font-mono)', fontSize: '11px', fontWeight: 600,
              background: active ? (bright ? 'var(--surface-card)' : 'var(--sidebar-glass-strong)') : 'transparent',
              color: active ? (bright ? 'var(--text-heading)' : '#fff') : (bright ? 'var(--text-soft)' : 'var(--sidebar-soft)'),
              boxShadow: active && bright ? 'var(--shadow-xs)' : 'none',
              transition: 'all var(--dur-fast) var(--ease-out)',
            }}>
            {o.icon && <SH.Icon name={o.icon} size={14} />}
            {!o.iconOnly && o.label}
          </button>
        );
      })}
    </div>
  );
}

function NavItem({ item, active, onClick, badge, bright }) {
  const [hover, setHover] = React.useState(false);
  const activeBg = bright ? 'var(--accent-soft)' : 'var(--sidebar-glass-strong)';
  const hoverBg = bright ? 'var(--surface-sunk)' : 'var(--sidebar-glass)';
  const color = bright
    ? (active ? 'var(--accent-strong)' : 'var(--text-muted)')
    : (active ? '#fff' : 'var(--sidebar-muted)');
  return (
    <button onClick={onClick} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: '11px', width: '100%',
        padding: '10px 12px', borderRadius: 'var(--radius-md)', border: 'none', cursor: 'pointer',
        fontFamily: 'var(--font-body)', fontSize: '13.5px', fontWeight: active ? 600 : 500,
        color, background: active ? activeBg : hover ? hoverBg : 'transparent',
        textAlign: 'left', transition: 'background var(--dur-fast), color var(--dur-fast)',
      }}>
      <SH.Icon name={item.icon} size={17} style={{ color: active ? (bright ? 'var(--accent)' : 'var(--accent-on-dark)') : 'currentColor' }} />
      <span style={{ flex: 1 }}>{item.label}</span>
      {badge != null && badge > 0 && (
        <span style={{
          fontFamily: 'var(--font-mono)', fontSize: '10px', fontWeight: 700,
          color: active ? '#fff' : (bright ? 'var(--accent-strong)' : 'var(--sidebar-soft)'),
          background: active ? 'var(--accent)' : (bright ? 'var(--accent-soft)' : 'var(--sidebar-glass)'),
          borderRadius: 'var(--radius-pill)', padding: '1px 7px', minWidth: '18px', textAlign: 'center',
        }}>{badge}</span>
      )}
    </button>
  );
}

function Shell({ theme, mode, direction, onMode, onDirection, active, onNav, me, badges = {}, title, subtitle, actions, children }) {
  const bright = direction === 'bright';
  const sidebarBg = bright
    ? 'var(--surface-card)'
    : 'linear-gradient(165deg, var(--ink-850) 0%, var(--ink-900) 100%)';
  const sidebarBorder = bright ? '1px solid var(--border)' : '1px solid var(--sidebar-border)';
  const brandColor = bright ? 'var(--text-heading)' : '#fff';
  const brandSub = bright ? 'var(--text-soft)' : 'var(--sidebar-soft)';
  const logo = bright && mode === 'light' ? '../../assets/logo/myjob-mark-light.svg' : '../../assets/logo/myjob-mark.svg';

  return (
    <div data-theme={theme} data-mode={mode}
      style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: 'var(--surface-app)' }}>
      <aside style={{ width: 'var(--app-nav-width)', flexShrink: 0, display: 'flex', flexDirection: 'column', background: sidebarBg, borderRight: sidebarBorder }}>
        <div style={{ padding: '20px 18px 14px', display: 'flex', alignItems: 'center', gap: '11px' }}>
          <img src={logo} width="32" height="32" alt="" style={{ borderRadius: '9px' }} />
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '17px', color: brandColor, letterSpacing: '-0.02em', lineHeight: 1 }}>
              <span style={{ color: bright ? 'var(--accent)' : 'var(--accent-on-dark)' }}>my</span>Job
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', letterSpacing: '0.14em', textTransform: 'uppercase', color: brandSub, marginTop: '3px' }}>Karriere</div>
          </div>
        </div>

        <nav style={{ padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: '3px', flex: 1 }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', letterSpacing: 'var(--ls-wide)', textTransform: 'uppercase', color: bright ? 'var(--text-soft)' : 'var(--sidebar-soft)', padding: '8px 12px 4px' }}>Mein Karriere-Tracker</div>
          {NAV.map((n) => <NavItem key={n.id} item={n} active={active === n.id} onClick={() => onNav(n.id)} badge={badges[n.id]} bright={bright} />)}
        </nav>

        <div style={{ margin: '0 14px 14px', padding: '11px 13px', borderRadius: 'var(--radius-md)', background: bright ? 'var(--surface-sunk)' : 'var(--sidebar-glass)', border: `1px solid ${bright ? 'var(--border)' : 'var(--sidebar-border)'}`, display: 'flex', alignItems: 'center', gap: '10px' }}>
          <SH.Avatar name={me.name} src={me.src} size="md" ring />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '12.5px', fontWeight: 600, color: brandColor, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{me.name}</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: brandSub }}>{me.role}</div>
          </div>
        </div>
      </aside>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <header style={{
          height: 'var(--app-topbar-h)', flexShrink: 0, display: 'flex', alignItems: 'center', gap: '16px',
          padding: '0 28px', background: 'color-mix(in srgb, var(--surface-card) 86%, transparent)',
          backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', borderBottom: '1px solid var(--border)',
          position: 'sticky', top: 0, zIndex: 5,
        }}>
          <div style={{ minWidth: 0 }}>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 700, color: 'var(--text-heading)', margin: 0, letterSpacing: '-0.015em' }}>{title}</h1>
            {subtitle && <div style={{ fontSize: '11.5px', color: 'var(--text-soft)', marginTop: '1px' }}>{subtitle}</div>}
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '12px' }}>
            {actions}
            <SegToggle bright value={direction} onChange={onDirection} options={[{ id: 'rail', label: 'Kompakt' }, { id: 'bright', label: 'Luftig' }]} />
            <SegToggle bright value={mode} onChange={onMode} options={[{ id: 'light', label: 'Hell' }, { id: 'dark', label: 'Dunkel' }]} />
          </div>
        </header>

        <main style={{ flex: 1, overflowY: 'auto', padding: 'var(--pad-app)' }}>
          {children}
        </main>
      </div>
    </div>
  );
}

Object.assign(window, { KShell: Shell });
