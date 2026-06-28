import React from 'react';
import { Icon } from '../core/Icon.jsx';
import { Avatar } from '../core/Avatar.jsx';

/**
 * AppShell — the ONE shell both products share. Desktop posture is an ink left
 * rail + topbar (+ optional right-side detail panel so lists are never empty);
 * mobile posture folds the rail into a bottom tab bar. Same nav model, same
 * chrome, two postures.
 *
 *   product="recruit"    → "myJob Recruit", desktop-first
 *   product="applicant"  → "myJob", mobile-first
 *
 * Settings + account live at the rail foot (a utility, not a primary
 * destination). Pass `detail` to mount the right-side panel on desktop.
 */
function Logomark({ size = 30 }) {
  const bar = (h, o) => (
    <span style={{ display: 'block', width: Math.round(size * 0.13), background: '#fff', borderRadius: '1px', height: `${h}%`, opacity: o }} />
  );
  return (
    <span
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.28,
        background: 'var(--accent)',
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        gap: Math.round(size * 0.07),
        padding: size * 0.22,
        flexShrink: 0,
        boxSizing: 'border-box',
      }}
    >
      {bar(45, 0.55)}{bar(72, 0.8)}{bar(100, 1)}
    </span>
  );
}

function Wordmark({ product, onDark = true }) {
  const muted = onDark ? 'var(--sidebar-soft)' : 'var(--text-soft)';
  const ink = onDark ? '#fff' : 'var(--text-heading)';
  return (
    <div style={{ lineHeight: 1, minWidth: 0 }}>
      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '18px', color: ink, letterSpacing: '-0.02em', display: 'flex', alignItems: 'baseline', gap: '6px' }}>
        <span><span style={{ color: 'var(--accent-on-dark)' }}>my</span>Job</span>
        {product === 'recruit' && (
          <span style={{ fontFamily: 'var(--font-display)', fontSize: '13px', fontWeight: 600, color: 'var(--accent-on-dark)' }}>Recruit</span>
        )}
      </div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', letterSpacing: '0.14em', textTransform: 'uppercase', color: muted, marginTop: '3px' }}>
        {product === 'recruit' ? 'Vermittler-Workspace' : 'Für Bewerber:innen'}
      </div>
    </div>
  );
}

function RailNavItem({ item, active, onClick }) {
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
        background: active ? 'color-mix(in oklch, var(--accent) 24%, transparent)' : hover ? 'var(--sidebar-glass)' : 'transparent',
        textAlign: 'left', transition: 'background var(--dur-fast), color var(--dur-fast)',
      }}
    >
      <Icon name={item.icon} size={17} solid={active} style={{ color: active ? 'var(--accent-on-dark)' : 'currentColor' }} />
      <span style={{ flex: 1 }}>{item.label}</span>
      {item.badge != null && item.badge > 0 && (
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', fontWeight: 600, color: active ? '#fff' : 'var(--sidebar-soft)', background: active ? 'var(--accent)' : 'var(--sidebar-glass)', borderRadius: 'var(--radius-pill)', padding: '1px 7px', minWidth: '18px', textAlign: 'center' }}>{item.badge}</span>
      )}
    </button>
  );
}

function Topbar({ title, subtitle, search, searchPlaceholder, onSearch, searchValue, actions }) {
  return (
    <header style={{
      height: 'var(--app-topbar-h)', flexShrink: 0, display: 'flex', alignItems: 'center', gap: '16px',
      padding: '0 24px', background: 'color-mix(in oklch, var(--paper) 88%, transparent)',
      backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', borderBottom: '1px solid var(--border)',
      position: 'sticky', top: 0, zIndex: 5,
    }}>
      <div style={{ minWidth: 0 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 700, color: 'var(--text-heading)', margin: 0, letterSpacing: '-0.015em', whiteSpace: 'nowrap' }}>{title}</h1>
        {subtitle && <div style={{ fontSize: '11.5px', color: 'var(--text-soft)', marginTop: '1px', whiteSpace: 'nowrap' }}>{subtitle}</div>}
      </div>
      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '10px' }}>
        {search && (
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--surface-card)', border: '1px solid var(--border-strong)', borderRadius: 'var(--radius-md)', padding: '0 11px', width: '230px' }}>
            <Icon name="search" size={15} style={{ color: 'var(--text-soft)' }} />
            <input
              value={searchValue || ''}
              onChange={(e) => onSearch && onSearch(e.target.value)}
              placeholder={searchPlaceholder || 'Suchen …'}
              style={{ flex: 1, minWidth: 0, border: 'none', outline: 'none', background: 'transparent', fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--text-heading)', padding: '8px 0' }}
            />
          </label>
        )}
        <span style={{ position: 'relative', display: 'inline-flex' }}>
          <button title="Benachrichtigungen" style={{ width: '36px', height: '36px', display: 'grid', placeItems: 'center', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-strong)', background: 'var(--surface-card)', cursor: 'pointer', color: 'var(--text-muted)' }}>
            <Icon name="bell" size={16} />
          </button>
          <span style={{ position: 'absolute', top: '-2px', right: '-2px', width: '8px', height: '8px', borderRadius: '50%', background: 'var(--signal-500)', border: '2px solid var(--paper)' }} />
        </span>
        {actions}
      </div>
    </header>
  );
}

function RailShell({ product, nav, active, onNav, account, settingsLabel, title, subtitle, search, searchPlaceholder, onSearch, searchValue, actions, detail, children }) {
  return (
    <div style={{ display: 'flex', height: '100%', minHeight: 0, overflow: 'hidden', background: 'var(--surface-app)' }}>
      <aside style={{
        width: 'var(--app-nav-width)', flexShrink: 0, display: 'flex', flexDirection: 'column',
        background: 'linear-gradient(165deg, var(--ink-850) 0%, var(--ink-900) 100%)',
        borderRight: '1px solid var(--sidebar-border)',
      }}>
        <div style={{ padding: '18px 16px 14px', display: 'flex', alignItems: 'center', gap: '11px' }}>
          <Logomark size={34} />
          <Wordmark product={product} />
        </div>

        <nav style={{ padding: '6px 12px', display: 'flex', flexDirection: 'column', gap: '3px', flex: 1, overflowY: 'auto' }}>
          {nav.map((n) => <RailNavItem key={n.id} item={n} active={active === n.id} onClick={() => onNav && onNav(n.id)} />)}
        </nav>

        <div style={{ padding: '8px 12px 10px', display: 'flex', flexDirection: 'column', gap: '3px', borderTop: '1px solid var(--sidebar-border)' }}>
          <RailNavItem item={{ id: '__settings', label: settingsLabel || 'Einstellungen', icon: 'sliders' }} active={active === '__settings'} onClick={() => onNav && onNav('__settings')} />
          {account && (
            <button onClick={() => onNav && onNav('__account')} style={{
              marginTop: '4px', padding: '9px 11px', borderRadius: 'var(--radius-md)', cursor: 'pointer', textAlign: 'left',
              background: 'var(--sidebar-glass)', border: '1px solid var(--sidebar-border)', display: 'flex', alignItems: 'center', gap: '10px',
            }}>
              <Avatar name={account.name} src={account.src} size="sm" ring />
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{account.name}</span>
                {account.meta && <span style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--sidebar-soft)' }}>{account.meta}</span>}
              </span>
              <Icon name="chevronRight" size={14} style={{ color: 'var(--sidebar-soft)' }} />
            </button>
          )}
        </div>
      </aside>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <Topbar title={title} subtitle={subtitle} search={search} searchPlaceholder={searchPlaceholder} onSearch={onSearch} searchValue={searchValue} actions={actions} />
        <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
          <main style={{ flex: 1, overflowY: 'auto', padding: 'var(--pad-app)', minWidth: 0 }}>{children}</main>
          {detail && (
            <aside style={{ width: '360px', flexShrink: 0, borderLeft: '1px solid var(--border)', background: 'var(--surface-card)', overflowY: 'auto' }}>{detail}</aside>
          )}
        </div>
      </div>
    </div>
  );
}

function TabsShell({ product, nav, active, onNav, account, title, actions, children }) {
  const tabs = nav.slice(0, 5);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, background: 'var(--surface-app)' }}>
      <header style={{
        flexShrink: 0, height: '54px', display: 'flex', alignItems: 'center', gap: '11px', padding: '0 16px',
        background: 'linear-gradient(165deg, var(--ink-850) 0%, var(--ink-900) 100%)', color: '#fff',
      }}>
        <Logomark size={26} />
        <span style={{ fontFamily: 'var(--font-display)', fontSize: '16px', fontWeight: 700, letterSpacing: '-0.015em', flex: 1, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{title}</span>
        {actions}
        <span style={{ position: 'relative', display: 'inline-flex' }}>
          <button title="Benachrichtigungen" style={{ width: '34px', height: '34px', display: 'grid', placeItems: 'center', borderRadius: 'var(--radius-md)', border: '1px solid var(--sidebar-border)', background: 'var(--sidebar-glass)', cursor: 'pointer', color: '#fff' }}>
            <Icon name="bell" size={16} />
          </button>
          <span style={{ position: 'absolute', top: '0', right: '0', width: '7px', height: '7px', borderRadius: '50%', background: 'var(--signal-on-dark)' }} />
        </span>
        {account && <Avatar name={account.name} src={account.src} size="sm" ring />}
      </header>

      <main style={{ flex: 1, overflowY: 'auto', padding: '16px 14px 20px', minHeight: 0 }}>{children}</main>

      <nav style={{
        flexShrink: 0, display: 'grid', gridTemplateColumns: `repeat(${tabs.length}, 1fr)`,
        background: 'var(--surface-card)', borderTop: '1px solid var(--border)', paddingBottom: 'env(safe-area-inset-bottom)',
      }}>
        {tabs.map((n) => {
          const on = active === n.id;
          return (
            <button key={n.id} onClick={() => onNav && onNav(n.id)} style={{
              border: 'none', background: 'transparent', cursor: 'pointer', padding: '9px 4px 10px',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px',
              color: on ? 'var(--accent-strong)' : 'var(--text-soft)',
            }}>
              <span style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '54px', height: '28px', borderRadius: 'var(--radius-pill)', background: on ? 'var(--accent-soft)' : 'transparent', transition: 'background var(--dur-fast) var(--ease-out)' }}>
                <Icon name={n.icon} size={21} solid={on} strokeWidth={on ? 2.1 : 1.8} />
                {n.badge != null && n.badge > 0 && (
                  <span style={{ position: 'absolute', top: '-5px', right: '-8px', fontFamily: 'var(--font-mono)', fontSize: '9px', fontWeight: 700, color: 'var(--accent-contrast)', background: 'var(--accent)', borderRadius: 'var(--radius-pill)', padding: '0 4px', minWidth: '15px', textAlign: 'center', lineHeight: '15px' }}>{n.badge}</span>
                )}
              </span>
              <span style={{ fontSize: '10px', fontWeight: on ? 600 : 500, letterSpacing: '0.01em', whiteSpace: 'nowrap' }}>{n.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}

export function AppShell({ posture = 'rail', ...props }) {
  return posture === 'tabs' ? <TabsShell {...props} /> : <RailShell {...props} />;
}
