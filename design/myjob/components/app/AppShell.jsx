import React from 'react';
import { Icon } from '../core/Icon.jsx';
import { Avatar } from '../core/Avatar.jsx';

/**
 * AppShell — the ONE shell both products share. 2026 „Vivid" redesign:
 * desktop posture is a FLOATING rounded nav rail (white in light mode,
 * conserved ink gradient in dark mode via the --rail-* tokens) + a
 * transparent topbar with a big Clash Display title; mobile posture folds
 * the rail into a bottom tab bar. Same nav model, two postures.
 *
 *   product="recruit"    → "myJob Recruit", desktop-first
 *   product="applicant"  → "myJob", mobile-first
 *
 * The logomark is the Now-Split mark (assets/logo/) — royal tile, actual
 * block, ghost block, live-orange playhead. Settings + account live at the
 * rail foot. Pass `detail` to mount the right-side panel on desktop.
 */
export function Logomark({ size = 34 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 256 256" style={{ flexShrink: 0, display: 'block', borderRadius: size * 0.23, boxShadow: '0 6px 16px -6px rgba(54, 84, 224, 0.55)' }} aria-label="myJob Logo">
      <defs>
        <linearGradient id="mjNowSplitTile" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#3D5CF5"></stop>
          <stop offset="1" stopColor="#2941B8"></stop>
        </linearGradient>
      </defs>
      <rect width="256" height="256" rx="60" fill="url(#mjNowSplitTile)"></rect>
      <rect x="50" y="96" width="60" height="72" rx="17" fill="#ffffff"></rect>
      <rect x="146" y="96" width="60" height="72" rx="17" fill="none" stroke="rgba(255,255,255,0.8)" strokeWidth="7" strokeDasharray="15 13" strokeLinecap="round"></rect>
      <rect x="123" y="80" width="10" height="104" rx="5" fill="#FF5320"></rect>
      <circle cx="128" cy="62" r="13" fill="#FF5320"></circle>
    </svg>
  );
}

function Wordmark({ product }) {
  return (
    <div style={{ lineHeight: 1, minWidth: 0 }}>
      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '19px', color: 'var(--rail-text)', letterSpacing: '-0.02em', display: 'flex', alignItems: 'baseline', gap: '6px' }}>
        <span>my<span style={{ color: 'var(--live)' }}>Job</span></span>
        {product === 'recruit' && (
          <span style={{ fontFamily: 'var(--font-display)', fontSize: '12.5px', fontWeight: 600, color: 'var(--rail-soft)' }}>Recruit</span>
        )}
      </div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--rail-soft)', marginTop: '4px' }}>
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
        padding: '10px 14px', borderRadius: 'var(--radius-pill)', border: 'none', cursor: 'pointer',
        fontFamily: 'var(--font-body)', fontSize: '13.5px', fontWeight: active ? 600 : 500,
        color: active ? 'var(--accent-contrast)' : 'var(--rail-muted)',
        background: active ? 'var(--accent)' : hover ? 'var(--rail-glass)' : 'transparent',
        boxShadow: active ? 'var(--shadow-accent)' : 'none',
        textAlign: 'left',
        transform: hover && !active ? 'translateX(2px)' : 'none',
        transition: 'background var(--dur-fast) var(--ease-out), color var(--dur-fast) var(--ease-out), transform var(--dur-med) var(--ease-spring), box-shadow var(--dur-fast) var(--ease-out)',
      }}
    >
      <Icon name={item.icon} size={17} solid={active} style={{ color: 'currentColor' }} />
      <span style={{ flex: 1 }}>{item.label}</span>
      {item.badge != null && item.badge > 0 && (
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-3xs)', fontWeight: 700, color: active ? 'var(--accent-strong)' : 'var(--live-contrast)', background: active ? '#ffffff' : 'var(--live)', borderRadius: 'var(--radius-pill)', padding: '2px 7px', minWidth: '18px', textAlign: 'center' }}>{item.badge}</span>
      )}
    </button>
  );
}

function Topbar({ title, subtitle, search, searchPlaceholder, onSearch, searchValue, actions }) {
  return (
    <header style={{
      minHeight: 'var(--app-topbar-h)', flexShrink: 0, display: 'flex', alignItems: 'center', gap: '16px',
      padding: '4px 6px 14px 6px',
    }}>
      <div style={{ minWidth: 0 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '24px', fontWeight: 600, color: 'var(--text-heading)', margin: 0, letterSpacing: '-0.015em', whiteSpace: 'nowrap' }}>{title}</h1>
        {subtitle && <div style={{ fontSize: '12px', color: 'var(--text-soft)', marginTop: '2px', whiteSpace: 'nowrap' }}>{subtitle}</div>}
      </div>
      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '10px' }}>
        {search && (
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--surface-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-pill)', padding: '0 16px', width: '250px', boxShadow: 'var(--shadow-xs)' }}>
            <Icon name="search" size={15} style={{ color: 'var(--text-soft)' }} />
            <input
              value={searchValue || ''}
              onChange={(e) => onSearch && onSearch(e.target.value)}
              placeholder={searchPlaceholder || 'Suchen …'}
              style={{ flex: 1, minWidth: 0, border: 'none', outline: 'none', background: 'transparent', fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--text-heading)', padding: '10px 0' }}
            />
          </label>
        )}
        <span style={{ position: 'relative', display: 'inline-flex' }}>
          <button title="Benachrichtigungen" style={{ width: '40px', height: '40px', display: 'grid', placeItems: 'center', borderRadius: 'var(--radius-pill)', border: '1px solid var(--border)', background: 'var(--surface-card)', cursor: 'pointer', color: 'var(--text-muted)', boxShadow: 'var(--shadow-xs)' }}>
            <Icon name="bell" size={16} />
          </button>
          <span style={{ position: 'absolute', top: '0px', right: '0px', width: '9px', height: '9px', borderRadius: '50%', background: 'var(--live)', border: '2px solid var(--surface-app)' }} />
        </span>
        {actions}
      </div>
    </header>
  );
}

function RailShell({ product, nav, active, onNav, account, settingsLabel, title, subtitle, search, searchPlaceholder, onSearch, searchValue, actions, detail, children }) {
  return (
    <div style={{ display: 'flex', height: '100%', minHeight: 0, overflow: 'hidden', background: 'var(--app-bg)', padding: '14px', gap: '16px', boxSizing: 'border-box' }}>
      <aside style={{
        width: 'var(--app-nav-width)', flexShrink: 0, display: 'flex', flexDirection: 'column',
        background: 'var(--rail-bg)',
        border: '1px solid var(--rail-border)',
        borderRadius: 'var(--radius-2xl)',
        boxShadow: 'var(--shadow-md)',
        overflow: 'hidden',
      }}>
        <div style={{ padding: '20px 18px 16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Logomark size={38} />
          <Wordmark product={product} />
        </div>

        <nav style={{ padding: '6px 12px', display: 'flex', flexDirection: 'column', gap: '4px', flex: 1, overflowY: 'auto' }}>
          {nav.map((n) => <RailNavItem key={n.id} item={n} active={active === n.id} onClick={() => onNav && onNav(n.id)} />)}
        </nav>

        <div style={{ padding: '8px 12px 12px', display: 'flex', flexDirection: 'column', gap: '4px', borderTop: '1px solid var(--rail-border)' }}>
          <RailNavItem item={{ id: '__settings', label: settingsLabel || 'Einstellungen', icon: 'sliders' }} active={active === '__settings'} onClick={() => onNav && onNav('__settings')} />
          {account && (
            <button onClick={() => onNav && onNav('__account')} style={{
              marginTop: '4px', padding: '9px 11px', borderRadius: 'var(--radius-xl)', cursor: 'pointer', textAlign: 'left',
              background: 'var(--rail-glass)', border: '1px solid var(--rail-border)', display: 'flex', alignItems: 'center', gap: '10px',
            }}>
              <Avatar name={account.name} src={account.src} size="sm" ring />
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: 'var(--rail-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{account.name}</span>
                {account.meta && <span style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-3xs)', color: 'var(--rail-soft)' }}>{account.meta}</span>}
              </span>
              <Icon name="chevronRight" size={14} style={{ color: 'var(--rail-soft)' }} />
            </button>
          )}
        </div>
      </aside>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <Topbar title={title} subtitle={subtitle} search={search} searchPlaceholder={searchPlaceholder} onSearch={onSearch} searchValue={searchValue} actions={actions} />
        <div style={{ flex: 1, display: 'flex', minHeight: 0, gap: '16px' }}>
          <main style={{ flex: 1, overflowY: 'auto', padding: '2px 6px 8px 6px', minWidth: 0 }}>{children}</main>
          {detail && (
            <aside style={{ width: '360px', flexShrink: 0, border: '1px solid var(--border)', borderRadius: 'var(--radius-2xl)', background: 'var(--surface-card)', boxShadow: 'var(--shadow-md)', overflowY: 'auto' }}>{detail}</aside>
          )}
        </div>
      </div>
    </div>
  );
}

function TabsShell({ product, nav, active, onNav, account, title, actions, children }) {
  const tabs = nav.slice(0, 5);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, background: 'var(--app-bg)' }}>
      <header style={{
        flexShrink: 0, height: '56px', display: 'flex', alignItems: 'center', gap: '11px', padding: '0 16px',
        background: 'var(--rail-bg)', color: 'var(--rail-text)', borderBottom: '1px solid var(--rail-border)',
      }}>
        <Logomark size={28} />
        <span style={{ fontFamily: 'var(--font-display)', fontSize: '17px', fontWeight: 600, letterSpacing: '-0.015em', flex: 1, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{title}</span>
        {actions}
        <span style={{ position: 'relative', display: 'inline-flex' }}>
          <button title="Benachrichtigungen" style={{ width: '36px', height: '36px', display: 'grid', placeItems: 'center', borderRadius: 'var(--radius-pill)', border: '1px solid var(--rail-border)', background: 'var(--rail-glass)', cursor: 'pointer', color: 'var(--rail-text)' }}>
            <Icon name="bell" size={16} />
          </button>
          <span style={{ position: 'absolute', top: '0', right: '0', width: '8px', height: '8px', borderRadius: '50%', background: 'var(--live)' }} />
        </span>
        {account && <Avatar name={account.name} src={account.src} size="sm" ring />}
      </header>

      <main style={{ flex: 1, overflowY: 'auto', padding: '16px 14px 20px', minHeight: 0 }}>{children}</main>

      <nav style={{
        flexShrink: 0, display: 'grid', gridTemplateColumns: `repeat(${tabs.length}, 1fr)`,
        background: 'var(--rail-bg)', borderTop: '1px solid var(--rail-border)', paddingBottom: 'env(safe-area-inset-bottom)',
      }}>
        {tabs.map((n) => {
          const on = active === n.id;
          return (
            <button key={n.id} onClick={() => onNav && onNav(n.id)} style={{
              border: 'none', background: 'transparent', cursor: 'pointer', padding: '9px 4px 10px',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px',
              color: on ? 'var(--accent-strong)' : 'var(--rail-soft)',
            }}>
              <span style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '56px', height: '30px', borderRadius: 'var(--radius-pill)', background: on ? 'var(--accent)' : 'transparent', color: on ? 'var(--accent-contrast)' : 'currentColor', transition: 'background var(--dur-med) var(--ease-spring)' }}>
                <Icon name={n.icon} size={21} solid={on} strokeWidth={on ? 2.1 : 1.8} />
                {n.badge != null && n.badge > 0 && (
                  <span style={{ position: 'absolute', top: '-5px', right: '-8px', fontFamily: 'var(--font-mono)', fontSize: '9px', fontWeight: 700, color: 'var(--live-contrast)', background: 'var(--live)', borderRadius: 'var(--radius-pill)', padding: '0 4px', minWidth: '15px', textAlign: 'center', lineHeight: '15px' }}>{n.badge}</span>
                )}
              </span>
              <span style={{ fontSize: 'var(--fs-3xs)', fontWeight: on ? 600 : 500, letterSpacing: '0.01em', whiteSpace: 'nowrap' }}>{n.label}</span>
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
