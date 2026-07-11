/* @ds-bundle: {"format":4,"namespace":"MyJobDesignSystem_5611b7","components":[{"name":"Logomark","sourcePath":"components/app/AppShell.jsx"},{"name":"AppShell","sourcePath":"components/app/AppShell.jsx"},{"name":"Avatar","sourcePath":"components/core/Avatar.jsx"},{"name":"Badge","sourcePath":"components/core/Badge.jsx"},{"name":"Button","sourcePath":"components/core/Button.jsx"},{"name":"EntityTile","sourcePath":"components/core/EntityTile.jsx"},{"name":"Icon","sourcePath":"components/core/Icon.jsx"},{"name":"ICON_NAMES","sourcePath":"components/core/Icon.jsx"},{"name":"IconButton","sourcePath":"components/core/IconButton.jsx"},{"name":"MetaPill","sourcePath":"components/core/MetaPill.jsx"},{"name":"ApplicationRow","sourcePath":"components/data/ApplicationRow.jsx"},{"name":"CandidateRow","sourcePath":"components/data/CandidateRow.jsx"},{"name":"Card","sourcePath":"components/data/Card.jsx"},{"name":"MatchIndicator","sourcePath":"components/data/MatchIndicator.jsx"},{"name":"PositionCard","sourcePath":"components/data/PositionCard.jsx"},{"name":"ProgressBar","sourcePath":"components/data/ProgressBar.jsx"},{"name":"StatCard","sourcePath":"components/data/StatCard.jsx"},{"name":"STAGES","sourcePath":"components/data/StatusBadge.jsx"},{"name":"StatusBadge","sourcePath":"components/data/StatusBadge.jsx"},{"name":"Tabs","sourcePath":"components/data/Tabs.jsx"},{"name":"Checkbox","sourcePath":"components/forms/Checkbox.jsx"},{"name":"Input","sourcePath":"components/forms/Input.jsx"},{"name":"Select","sourcePath":"components/forms/Select.jsx"},{"name":"Switch","sourcePath":"components/forms/Switch.jsx"},{"name":"Textarea","sourcePath":"components/forms/Textarea.jsx"}],"sourceHashes":{"components/app/AppShell.jsx":"3ea7aff9cc8a","components/core/Avatar.jsx":"642d834429aa","components/core/Badge.jsx":"c65e71a1747c","components/core/Button.jsx":"5f9cb3122052","components/core/EntityTile.jsx":"c6e7448180b1","components/core/Icon.jsx":"7acd36c8049a","components/core/IconButton.jsx":"11c416bbf004","components/core/MetaPill.jsx":"127e09c1b1d7","components/data/ApplicationRow.jsx":"2c61c6905714","components/data/CandidateRow.jsx":"d1f314f43799","components/data/Card.jsx":"6ecddbff63e5","components/data/MatchIndicator.jsx":"a8b2803d6891","components/data/PositionCard.jsx":"90dcd4ead3e6","components/data/ProgressBar.jsx":"39c4ae9bb2b5","components/data/StatCard.jsx":"afa0089bbae3","components/data/StatusBadge.jsx":"9e218736fd5f","components/data/Tabs.jsx":"d7895fd812a5","components/forms/Checkbox.jsx":"3ff388154f50","components/forms/Input.jsx":"d4c959e866f5","components/forms/Select.jsx":"c4da8171f3d4","components/forms/Switch.jsx":"798cb097d1f9","components/forms/Textarea.jsx":"a49a73a5a3fb","data/talent-pool.js":"6539dca5854c"},"inlinedExternals":[],"unexposedExports":[]} */

(() => {

const __ds_ns = (window.MyJobDesignSystem_5611b7 = window.MyJobDesignSystem_5611b7 || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// components/core/Avatar.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Candidate / user avatar. Circle by default (app chrome); pass a square
 * radius for document portraits. Renders an initials fallback behind the image
 * so a broken/empty src still reads as a person. Since the 2026 redesign the
 * fallback tile rides the PEOPLE palette — deterministic name→color, so every
 * candidate keeps their color across screens (recruiting is people; the pool
 * is colorful by design).
 */
function initialsFrom(name = '') {
  return name.trim().split(/\s+/).slice(0, 2).map(w => w[0] || '').join('').toUpperCase();
}

/* FNV-1a-ish deterministic name → people-palette slot (1..8) */
function peopleSlot(name = '') {
  let h = 2166136261;
  for (let i = 0; i < name.length; i++) {
    h ^= name.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h) % 8 + 1;
}
const SIZES = {
  xs: 24,
  sm: 32,
  md: 40,
  lg: 56,
  xl: 72
};
function Avatar({
  src,
  name = '',
  initials,
  size = 'md',
  radius = '50%',
  ring = false,
  style = {},
  ...rest
}) {
  const px = typeof size === 'number' ? size : SIZES[size] || 40;
  const ini = initials != null ? initials : initialsFrom(name);
  const fontSize = Math.round(px * 0.38);
  return /*#__PURE__*/React.createElement("div", _extends({
    title: name || undefined,
    style: {
      position: 'relative',
      width: `${px}px`,
      height: `${px}px`,
      flexShrink: 0,
      borderRadius: radius,
      overflow: 'hidden',
      isolation: 'isolate',
      boxShadow: ring ? '0 0 0 2px var(--surface-card), 0 0 0 4px var(--accent)' : 'none',
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("div", {
    "aria-hidden": "true",
    style: {
      position: 'absolute',
      inset: 0,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'var(--font-display)',
      fontSize: `${fontSize}px`,
      fontWeight: 'var(--fw-semibold)',
      letterSpacing: 'var(--ls-tight)',
      color: '#ffffff',
      background: `var(--people-${peopleSlot(name)}, var(--ink-700))`,
      zIndex: 0
    }
  }, ini), src && /*#__PURE__*/React.createElement("img", {
    src: src,
    alt: name,
    onError: e => {
      e.currentTarget.style.display = 'none';
    },
    style: {
      position: 'relative',
      zIndex: 1,
      width: '100%',
      height: '100%',
      objectFit: 'cover',
      display: 'block'
    }
  }));
}
Object.assign(__ds_scope, { Avatar });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Avatar.jsx", error: String((e && e.message) || e) }); }

// components/core/Badge.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Badge — THE one label-token primitive. Skills, tags, counts, metadata and the
 * status preset all build on this (MetaPill and StatusBadge are thin presets),
 * so the system has a single labelled-chip vocabulary in one shape (pill).
 */
const BASE = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '5px',
  fontFamily: 'var(--font-mono)',
  fontWeight: 'var(--fw-medium)',
  lineHeight: 1.4,
  whiteSpace: 'nowrap',
  borderRadius: 'var(--radius-pill)',
  border: '1px solid transparent'
};
const SIZES = {
  sm: {
    fontSize: '11px',
    padding: '3px 8px'
  },
  md: {
    fontSize: '12px',
    padding: '4px 10px'
  }
};
const VARIANTS = {
  outline: {
    background: 'var(--surface-card)',
    color: 'var(--text-muted)',
    borderColor: 'var(--border-strong)'
  },
  subtle: {
    background: 'var(--surface-sunk)',
    color: 'var(--text-muted)',
    borderColor: 'var(--border)'
  },
  solid: {
    background: 'var(--accent)',
    color: 'var(--accent-contrast)',
    borderColor: 'var(--accent)'
  },
  soft: {
    background: 'var(--accent-soft)',
    color: 'var(--accent-strong)',
    borderColor: 'var(--accent-border)'
  },
  glass: {
    background: 'var(--sidebar-glass)',
    color: 'var(--sidebar-text)',
    borderColor: 'var(--sidebar-border-strong)',
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)'
  },
  light: {
    background: '#ffffff',
    color: 'var(--ink-900)',
    borderColor: '#ffffff',
    fontWeight: 'var(--fw-semibold)'
  }
};
function Badge({
  children,
  variant = 'outline',
  size = 'md',
  icon = null,
  style = {},
  ...rest
}) {
  return /*#__PURE__*/React.createElement("span", _extends({
    style: {
      ...BASE,
      ...SIZES[size],
      ...VARIANTS[variant],
      ...style
    }
  }, rest), icon, children);
}
Object.assign(__ds_scope, { Badge });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Badge.jsx", error: String((e && e.message) || e) }); }

// components/core/Button.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * The primary action control. Mono label + pill shape is the brand's
 * "engineering signature". Variants map to the recruiting product's intent
 * hierarchy; sizes follow the 4px grid.
 */
const SIZES = {
  sm: {
    fontSize: '12px',
    padding: '7px 14px',
    gap: '6px'
  },
  md: {
    fontSize: '13px',
    padding: '10px 18px',
    gap: '7px'
  },
  lg: {
    fontSize: '14px',
    padding: '12px 24px',
    gap: '8px'
  }
};
const VARIANTS = {
  /* filled accent — the one primary action on a view */
  primary: {
    background: 'var(--accent)',
    color: 'var(--accent-contrast)',
    border: '1px solid var(--accent)'
  },
  /* dark ink — a strong secondary (e.g. on light toolbars) */
  ink: {
    background: 'var(--ink-900)',
    color: '#ffffff',
    border: '1px solid var(--ink-900)'
  },
  /* outlined — secondary action */
  outline: {
    background: 'var(--surface-card)',
    color: 'var(--text-body)',
    border: '1px solid var(--border-strong)'
  },
  /* quiet — tertiary, low-emphasis */
  ghost: {
    background: 'transparent',
    color: 'var(--text-muted)',
    border: '1px solid transparent'
  },
  /* destructive */
  danger: {
    background: 'var(--danger)',
    color: '#ffffff',
    border: '1px solid var(--danger)'
  }
};
function Button({
  children,
  variant = 'primary',
  size = 'md',
  iconLeft = null,
  iconRight = null,
  block = false,
  disabled = false,
  type = 'button',
  style = {},
  ...rest
}) {
  return /*#__PURE__*/React.createElement("button", _extends({
    type: type,
    disabled: disabled,
    style: {
      display: block ? 'flex' : 'inline-flex',
      width: block ? '100%' : 'auto',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'var(--font-mono)',
      fontWeight: 'var(--fw-semibold)',
      lineHeight: 1,
      whiteSpace: 'nowrap',
      borderRadius: 'var(--radius-pill)',
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.45 : 1,
      transition: 'transform var(--dur-fast) var(--ease-out), box-shadow var(--dur-fast) var(--ease-out), background var(--dur-fast) var(--ease-out), border-color var(--dur-fast) var(--ease-out)',
      ...SIZES[size],
      ...VARIANTS[variant],
      ...style
    },
    onMouseEnter: e => {
      if (!disabled) {
        e.currentTarget.style.transform = 'translateY(-1px)';
        e.currentTarget.style.boxShadow = 'var(--shadow-md)';
      }
    },
    onMouseLeave: e => {
      e.currentTarget.style.transform = 'none';
      e.currentTarget.style.boxShadow = 'none';
    }
  }, rest), iconLeft, children, iconRight);
}
Object.assign(__ds_scope, { Button });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Button.jsx", error: String((e && e.message) || e) }); }

// components/core/EntityTile.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * EntityTile — the one media primitive for "a thing in a list". IVE MERGE:
 * ApplicationRow and PositionCard each had their own copy of a rounded-square
 * company tile; this is now the single source.
 *
 *   type="person"  → a circular Avatar (initials or photo). People are round.
 *   type="company" → a rounded-square initials/logo tile. A company is not a
 *                    person, so it never takes a circular avatar.
 *
 * `src` is a photo (person) or logo (company). Sizes match the Avatar scale.
 */
const SIZES = {
  sm: 32,
  md: 40,
  lg: 44,
  xl: 56
};
function EntityTile({
  type = 'company',
  name = '',
  src,
  size = 'md',
  radius = 'var(--radius-md)',
  style = {},
  ...rest
}) {
  if (type === 'person') {
    return /*#__PURE__*/React.createElement(__ds_scope.Avatar, _extends({
      name: name,
      src: src,
      size: size,
      style: style
    }, rest));
  }
  const px = typeof size === 'number' ? size : SIZES[size] || 40;
  if (src) {
    return /*#__PURE__*/React.createElement("img", _extends({
      src: src,
      alt: "",
      style: {
        width: px,
        height: px,
        borderRadius: radius,
        objectFit: 'cover',
        flexShrink: 0,
        border: '1px solid var(--border)',
        ...style
      }
    }, rest));
  }
  const initials = (name || '?').split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase();
  return /*#__PURE__*/React.createElement("span", _extends({
    style: {
      width: px,
      height: px,
      borderRadius: radius,
      flexShrink: 0,
      display: 'grid',
      placeItems: 'center',
      background: 'var(--surface-sunk)',
      border: '1px solid var(--border)',
      fontFamily: 'var(--font-display)',
      fontWeight: 'var(--fw-semibold)',
      fontSize: Math.round(px * 0.32),
      color: 'var(--text-muted)',
      ...style
    }
  }, rest), initials);
}
Object.assign(__ds_scope, { EntityTile });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/EntityTile.jsx", error: String((e && e.message) || e) }); }

// components/core/Icon.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Feather-style line icons — the single icon system for myJob.
 * One 24×24 stroke grid, 1.8 stroke, round caps/joins. Inline SVG, currentColor.
 * Add new glyphs to PATHS (keep them on the same grid + weight).
 */
const PATHS = {
  /* ---- contact / identity ---- */
  phone: /*#__PURE__*/React.createElement("path", {
    d: "M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"
  }),
  mail: /*#__PURE__*/React.createElement("g", null, /*#__PURE__*/React.createElement("path", {
    d: "M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"
  }), /*#__PURE__*/React.createElement("polyline", {
    points: "22,6 12,13 2,6"
  })),
  pin: /*#__PURE__*/React.createElement("g", null, /*#__PURE__*/React.createElement("path", {
    d: "M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "12",
    cy: "10",
    r: "3"
  })),
  globe: /*#__PURE__*/React.createElement("g", null, /*#__PURE__*/React.createElement("circle", {
    cx: "12",
    cy: "12",
    r: "10"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "2",
    y1: "12",
    x2: "22",
    y2: "12"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"
  })),
  user: /*#__PURE__*/React.createElement("g", null, /*#__PURE__*/React.createElement("path", {
    d: "M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "12",
    cy: "7",
    r: "4"
  })),
  users: /*#__PURE__*/React.createElement("g", null, /*#__PURE__*/React.createElement("path", {
    d: "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "9",
    cy: "7",
    r: "4"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M23 21v-2a4 4 0 0 0-3-3.87"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M16 3.13a4 4 0 0 1 0 7.75"
  })),
  id: /*#__PURE__*/React.createElement("g", null, /*#__PURE__*/React.createElement("rect", {
    x: "3",
    y: "4",
    width: "18",
    height: "16",
    rx: "2",
    ry: "2"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "9",
    cy: "11",
    r: "2.5"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M5 18c.6-2 2.2-3 4-3s3.4 1 4 3"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "14.5",
    y1: "9",
    x2: "19",
    y2: "9"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "14.5",
    y1: "13",
    x2: "19",
    y2: "13"
  })),
  building: /*#__PURE__*/React.createElement("g", null, /*#__PURE__*/React.createElement("rect", {
    x: "4",
    y: "2",
    width: "16",
    height: "20",
    rx: "2"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M9 22v-4h6v4"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "8",
    y1: "6",
    x2: "8",
    y2: "6"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "12",
    y1: "6",
    x2: "12",
    y2: "6"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "16",
    y1: "6",
    x2: "16",
    y2: "6"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "8",
    y1: "10",
    x2: "8",
    y2: "10"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "12",
    y1: "10",
    x2: "12",
    y2: "10"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "16",
    y1: "10",
    x2: "16",
    y2: "10"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "8",
    y1: "14",
    x2: "8",
    y2: "14"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "12",
    y1: "14",
    x2: "12",
    y2: "14"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "16",
    y1: "14",
    x2: "16",
    y2: "14"
  })),
  /* ---- work / education ---- */
  briefcase: /*#__PURE__*/React.createElement("g", null, /*#__PURE__*/React.createElement("rect", {
    x: "2",
    y: "7",
    width: "20",
    height: "14",
    rx: "2",
    ry: "2"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"
  })),
  cap: /*#__PURE__*/React.createElement("g", null, /*#__PURE__*/React.createElement("path", {
    d: "M22 10L12 5 2 10l10 5 10-5z"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M6 12v5c3 3 9 3 12 0v-5"
  })),
  award: /*#__PURE__*/React.createElement("g", null, /*#__PURE__*/React.createElement("circle", {
    cx: "12",
    cy: "8",
    r: "7"
  }), /*#__PURE__*/React.createElement("polyline", {
    points: "8.21 13.89 7 23 12 20 17 23 15.79 13.88"
  })),
  book: /*#__PURE__*/React.createElement("g", null, /*#__PURE__*/React.createElement("path", {
    d: "M4 19.5A2.5 2.5 0 0 1 6.5 17H20"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"
  })),
  code: /*#__PURE__*/React.createElement("g", null, /*#__PURE__*/React.createElement("polyline", {
    points: "16 18 22 12 16 6"
  }), /*#__PURE__*/React.createElement("polyline", {
    points: "8 6 2 12 8 18"
  })),
  zap: /*#__PURE__*/React.createElement("polygon", {
    points: "13 2 3 14 12 14 11 22 21 10 12 10 13 2"
  }),
  /* ---- documents ---- */
  file: /*#__PURE__*/React.createElement("g", null, /*#__PURE__*/React.createElement("path", {
    d: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"
  }), /*#__PURE__*/React.createElement("polyline", {
    points: "14 2 14 8 20 8"
  })),
  fileText: /*#__PURE__*/React.createElement("g", null, /*#__PURE__*/React.createElement("path", {
    d: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"
  }), /*#__PURE__*/React.createElement("polyline", {
    points: "14 2 14 8 20 8"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "8",
    y1: "13",
    x2: "16",
    y2: "13"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "8",
    y1: "17",
    x2: "13",
    y2: "17"
  })),
  paperclip: /*#__PURE__*/React.createElement("path", {
    d: "M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"
  }),
  download: /*#__PURE__*/React.createElement("g", null, /*#__PURE__*/React.createElement("path", {
    d: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"
  }), /*#__PURE__*/React.createElement("polyline", {
    points: "7 10 12 15 17 10"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "12",
    y1: "15",
    x2: "12",
    y2: "3"
  })),
  upload: /*#__PURE__*/React.createElement("g", null, /*#__PURE__*/React.createElement("path", {
    d: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"
  }), /*#__PURE__*/React.createElement("polyline", {
    points: "17 8 12 3 7 8"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "12",
    y1: "3",
    x2: "12",
    y2: "15"
  })),
  external: /*#__PURE__*/React.createElement("g", null, /*#__PURE__*/React.createElement("path", {
    d: "M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"
  }), /*#__PURE__*/React.createElement("polyline", {
    points: "15 3 21 3 21 9"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "10",
    y1: "14",
    x2: "21",
    y2: "3"
  })),
  /* ---- navigation / app chrome ---- */
  home: /*#__PURE__*/React.createElement("g", null, /*#__PURE__*/React.createElement("path", {
    d: "M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"
  }), /*#__PURE__*/React.createElement("polyline", {
    points: "9 22 9 12 15 12 15 22"
  })),
  inbox: /*#__PURE__*/React.createElement("g", null, /*#__PURE__*/React.createElement("polyline", {
    points: "22 12 16 12 14 15 10 15 8 12 2 12"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"
  })),
  grid: /*#__PURE__*/React.createElement("g", null, /*#__PURE__*/React.createElement("rect", {
    x: "3",
    y: "3",
    width: "7",
    height: "7"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "14",
    y: "3",
    width: "7",
    height: "7"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "14",
    y: "14",
    width: "7",
    height: "7"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "3",
    y: "14",
    width: "7",
    height: "7"
  })),
  columns: /*#__PURE__*/React.createElement("g", null, /*#__PURE__*/React.createElement("rect", {
    x: "3",
    y: "4",
    width: "5.5",
    height: "16",
    rx: "1"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "9.25",
    y: "4",
    width: "5.5",
    height: "16",
    rx: "1"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "15.5",
    y: "4",
    width: "5.5",
    height: "16",
    rx: "1"
  })),
  list: /*#__PURE__*/React.createElement("g", null, /*#__PURE__*/React.createElement("line", {
    x1: "8",
    y1: "6",
    x2: "21",
    y2: "6"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "8",
    y1: "12",
    x2: "21",
    y2: "12"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "8",
    y1: "18",
    x2: "21",
    y2: "18"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "3",
    y1: "6",
    x2: "3.01",
    y2: "6"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "3",
    y1: "12",
    x2: "3.01",
    y2: "12"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "3",
    y1: "18",
    x2: "3.01",
    y2: "18"
  })),
  search: /*#__PURE__*/React.createElement("g", null, /*#__PURE__*/React.createElement("circle", {
    cx: "11",
    cy: "11",
    r: "8"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "21",
    y1: "21",
    x2: "16.65",
    y2: "16.65"
  })),
  filter: /*#__PURE__*/React.createElement("polygon", {
    points: "22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"
  }),
  sliders: /*#__PURE__*/React.createElement("g", null, /*#__PURE__*/React.createElement("line", {
    x1: "4",
    y1: "21",
    x2: "4",
    y2: "14"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "4",
    y1: "10",
    x2: "4",
    y2: "3"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "12",
    y1: "21",
    x2: "12",
    y2: "12"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "12",
    y1: "8",
    x2: "12",
    y2: "3"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "20",
    y1: "21",
    x2: "20",
    y2: "16"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "20",
    y1: "12",
    x2: "20",
    y2: "3"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "1",
    y1: "14",
    x2: "7",
    y2: "14"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "9",
    y1: "8",
    x2: "15",
    y2: "8"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "17",
    y1: "16",
    x2: "23",
    y2: "16"
  })),
  bell: /*#__PURE__*/React.createElement("g", null, /*#__PURE__*/React.createElement("path", {
    d: "M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M13.73 21a2 2 0 0 1-3.46 0"
  })),
  settings: /*#__PURE__*/React.createElement("g", null, /*#__PURE__*/React.createElement("circle", {
    cx: "12",
    cy: "12",
    r: "3"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"
  })),
  menu: /*#__PURE__*/React.createElement("g", null, /*#__PURE__*/React.createElement("line", {
    x1: "3",
    y1: "12",
    x2: "21",
    y2: "12"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "3",
    y1: "6",
    x2: "21",
    y2: "6"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "3",
    y1: "18",
    x2: "21",
    y2: "18"
  })),
  more: /*#__PURE__*/React.createElement("g", null, /*#__PURE__*/React.createElement("circle", {
    cx: "12",
    cy: "12",
    r: "1"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "19",
    cy: "12",
    r: "1"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "5",
    cy: "12",
    r: "1"
  })),
  moreV: /*#__PURE__*/React.createElement("g", null, /*#__PURE__*/React.createElement("circle", {
    cx: "12",
    cy: "12",
    r: "1"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "12",
    cy: "5",
    r: "1"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "12",
    cy: "19",
    r: "1"
  })),
  /* ---- arrows / chevrons ---- */
  chevronDown: /*#__PURE__*/React.createElement("polyline", {
    points: "6 9 12 15 18 9"
  }),
  chevronUp: /*#__PURE__*/React.createElement("polyline", {
    points: "18 15 12 9 6 15"
  }),
  chevronRight: /*#__PURE__*/React.createElement("polyline", {
    points: "9 18 15 12 9 6"
  }),
  chevronLeft: /*#__PURE__*/React.createElement("polyline", {
    points: "15 18 9 12 15 6"
  }),
  arrowRight: /*#__PURE__*/React.createElement("g", null, /*#__PURE__*/React.createElement("line", {
    x1: "5",
    y1: "12",
    x2: "19",
    y2: "12"
  }), /*#__PURE__*/React.createElement("polyline", {
    points: "12 5 19 12 12 19"
  })),
  arrowLeft: /*#__PURE__*/React.createElement("g", null, /*#__PURE__*/React.createElement("line", {
    x1: "19",
    y1: "12",
    x2: "5",
    y2: "12"
  }), /*#__PURE__*/React.createElement("polyline", {
    points: "12 19 5 12 12 5"
  })),
  arrowUpRight: /*#__PURE__*/React.createElement("g", null, /*#__PURE__*/React.createElement("line", {
    x1: "7",
    y1: "17",
    x2: "17",
    y2: "7"
  }), /*#__PURE__*/React.createElement("polyline", {
    points: "7 7 17 7 17 17"
  })),
  /* ---- actions / state ---- */
  plus: /*#__PURE__*/React.createElement("g", null, /*#__PURE__*/React.createElement("line", {
    x1: "12",
    y1: "5",
    x2: "12",
    y2: "19"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "5",
    y1: "12",
    x2: "19",
    y2: "12"
  })),
  x: /*#__PURE__*/React.createElement("g", null, /*#__PURE__*/React.createElement("line", {
    x1: "18",
    y1: "6",
    x2: "6",
    y2: "18"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "6",
    y1: "6",
    x2: "18",
    y2: "18"
  })),
  check: /*#__PURE__*/React.createElement("polyline", {
    points: "20 6 9 17 4 12"
  }),
  checkCircle: /*#__PURE__*/React.createElement("g", null, /*#__PURE__*/React.createElement("path", {
    d: "M22 11.08V12a10 10 0 1 1-5.93-9.14"
  }), /*#__PURE__*/React.createElement("polyline", {
    points: "22 4 12 14.01 9 11.01"
  })),
  xCircle: /*#__PURE__*/React.createElement("g", null, /*#__PURE__*/React.createElement("circle", {
    cx: "12",
    cy: "12",
    r: "10"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "15",
    y1: "9",
    x2: "9",
    y2: "15"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "9",
    y1: "9",
    x2: "15",
    y2: "15"
  })),
  alert: /*#__PURE__*/React.createElement("g", null, /*#__PURE__*/React.createElement("path", {
    d: "M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "12",
    y1: "9",
    x2: "12",
    y2: "13"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "12",
    y1: "17",
    x2: "12.01",
    y2: "17"
  })),
  info: /*#__PURE__*/React.createElement("g", null, /*#__PURE__*/React.createElement("circle", {
    cx: "12",
    cy: "12",
    r: "10"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "12",
    y1: "16",
    x2: "12",
    y2: "12"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "12",
    y1: "8",
    x2: "12.01",
    y2: "8"
  })),
  edit: /*#__PURE__*/React.createElement("g", null, /*#__PURE__*/React.createElement("path", {
    d: "M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"
  })),
  trash: /*#__PURE__*/React.createElement("g", null, /*#__PURE__*/React.createElement("polyline", {
    points: "3 6 5 6 21 6"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"
  })),
  star: /*#__PURE__*/React.createElement("polygon", {
    points: "12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"
  }),
  bookmark: /*#__PURE__*/React.createElement("path", {
    d: "M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"
  }),
  eye: /*#__PURE__*/React.createElement("g", null, /*#__PURE__*/React.createElement("path", {
    d: "M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "12",
    cy: "12",
    r: "3"
  })),
  send: /*#__PURE__*/React.createElement("g", null, /*#__PURE__*/React.createElement("line", {
    x1: "22",
    y1: "2",
    x2: "11",
    y2: "13"
  }), /*#__PURE__*/React.createElement("polygon", {
    points: "22 2 15 22 11 13 2 9 22 2"
  })),
  message: /*#__PURE__*/React.createElement("path", {
    d: "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"
  }),
  clock: /*#__PURE__*/React.createElement("g", null, /*#__PURE__*/React.createElement("circle", {
    cx: "12",
    cy: "12",
    r: "10"
  }), /*#__PURE__*/React.createElement("polyline", {
    points: "12 6 12 12 16 14"
  })),
  calendar: /*#__PURE__*/React.createElement("g", null, /*#__PURE__*/React.createElement("rect", {
    x: "3",
    y: "4",
    width: "18",
    height: "18",
    rx: "2",
    ry: "2"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "16",
    y1: "2",
    x2: "16",
    y2: "6"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "8",
    y1: "2",
    x2: "8",
    y2: "6"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "3",
    y1: "10",
    x2: "21",
    y2: "10"
  })),
  tag: /*#__PURE__*/React.createElement("g", null, /*#__PURE__*/React.createElement("path", {
    d: "M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "7",
    y1: "7",
    x2: "7.01",
    y2: "7"
  })),
  trend: /*#__PURE__*/React.createElement("g", null, /*#__PURE__*/React.createElement("polyline", {
    points: "23 6 13.5 15.5 8.5 10.5 1 18"
  }), /*#__PURE__*/React.createElement("polyline", {
    points: "17 6 23 6 23 12"
  })),
  thumbsUp: /*#__PURE__*/React.createElement("path", {
    d: "M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"
  }),
  heart: /*#__PURE__*/React.createElement("path", {
    d: "M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"
  }),
  logout: /*#__PURE__*/React.createElement("g", null, /*#__PURE__*/React.createElement("path", {
    d: "M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"
  }), /*#__PURE__*/React.createElement("polyline", {
    points: "16 17 21 12 16 7"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "21",
    y1: "12",
    x2: "9",
    y2: "12"
  })),
  /* ---- social ---- */
  linkedin: /*#__PURE__*/React.createElement("g", null, /*#__PURE__*/React.createElement("path", {
    d: "M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "2",
    y: "9",
    width: "4",
    height: "12"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "4",
    cy: "4",
    r: "2"
  })),
  github: /*#__PURE__*/React.createElement("path", {
    d: "M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"
  })
};

/* Filled silhouettes for the nav icons — rendered when `solid` is set, so an
   active tab/rail item fills in (iOS .fill / Android selected), inactive stays
   outline. Only the navigation glyphs need a solid twin; everything without an
   entry falls back to the outline glyph. */
const SOLID = {
  home: /*#__PURE__*/React.createElement("path", {
    d: "M11.3 3.26a1 1 0 0 1 1.4 0l8.5 7.92A1 1 0 0 1 20.5 13H19v6.5a1.5 1.5 0 0 1-1.5 1.5H15a1 1 0 0 1-1-1v-4a1 1 0 0 0-1-1h-2a1 1 0 0 0-1 1v4a1 1 0 0 1-1 1H6.5A1.5 1.5 0 0 1 5 19.5V13H3.5a1 1 0 0 1-.7-1.82l8.5-7.92z"
  }),
  users: /*#__PURE__*/React.createElement("path", {
    d: "M9 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm8.5-1a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM9 14c-4.2 0-7 2.1-7 4.8V20a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-1.2C16 16.1 13.2 14 9 14zm8.5 0c-.5 0-1 .03-1.46.1C17.5 15.3 18 16.9 18 18.8V21h4a1 1 0 0 0 1-1v-.9c0-2.7-2.4-5.1-5.5-5.1z"
  }),
  briefcase: /*#__PURE__*/React.createElement("g", null, /*#__PURE__*/React.createElement("path", {
    d: "M9 4a2 2 0 0 0-2 2v1.5h2V6h6v1.5h2V6a2 2 0 0 0-2-2H9z"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M3 9a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v3.6a1 1 0 0 1-.62.92l-7.4 3a3 3 0 0 1-1.96 0l-7.4-3A1 1 0 0 1 3 12.6V9z"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M21 15.9l-7 2.84a4 4 0 0 1-2 0L3 15.9V18a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-2.1z"
  })),
  search: /*#__PURE__*/React.createElement("g", null, /*#__PURE__*/React.createElement("circle", {
    cx: "10.5",
    cy: "10.5",
    r: "7"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M16.32 14.9l4.39 4.39a1 1 0 0 1-1.42 1.42l-4.39-4.39 1.42-1.42z"
  })),
  columns: /*#__PURE__*/React.createElement("g", null, /*#__PURE__*/React.createElement("rect", {
    x: "3",
    y: "4",
    width: "5.2",
    height: "16",
    rx: "1.2"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "9.4",
    y: "4",
    width: "5.2",
    height: "16",
    rx: "1.2"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "15.8",
    y: "4",
    width: "5.2",
    height: "16",
    rx: "1.2"
  })),
  send: /*#__PURE__*/React.createElement("path", {
    d: "M21.7 2.3a1 1 0 0 0-1.05-.24L2.9 8.6a1 1 0 0 0 .06 1.9l7.05 2.15a.5.5 0 0 1 .33.33l2.15 7.05a1 1 0 0 0 1.9.06l6.54-17.74a1 1 0 0 0-.23-1.05z"
  }),
  fileText: /*#__PURE__*/React.createElement("path", {
    d: "M6 2a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8.5L13.5 2H6zm7 1.5L18.5 9H14a1 1 0 0 1-1-1V3.5z"
  })
};
function Icon({
  name,
  size = 16,
  strokeWidth = 1.8,
  solid = false,
  style = {},
  ...rest
}) {
  const useSolid = solid && SOLID[name];
  const glyph = useSolid ? SOLID[name] : PATHS[name];
  return /*#__PURE__*/React.createElement("svg", _extends({
    viewBox: "0 0 24 24",
    width: size,
    height: size,
    fill: useSolid ? 'currentColor' : 'none',
    stroke: useSolid ? 'none' : 'currentColor',
    strokeWidth: strokeWidth,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": "true",
    style: {
      display: 'block',
      flexShrink: 0,
      ...style
    }
  }, rest), glyph || null);
}

/** All available glyph names (for documentation / pickers). */
const ICON_NAMES = Object.keys(PATHS);
Object.assign(__ds_scope, { Icon, ICON_NAMES });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Icon.jsx", error: String((e && e.message) || e) }); }

// components/app/AppShell.jsx
try { (() => {
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
function Logomark({
  size = 34
}) {
  return /*#__PURE__*/React.createElement("svg", {
    width: size,
    height: size,
    viewBox: "0 0 256 256",
    style: {
      flexShrink: 0,
      display: 'block',
      borderRadius: size * 0.23,
      boxShadow: '0 6px 16px -6px rgba(54, 84, 224, 0.55)'
    },
    "aria-label": "myJob Logo"
  }, /*#__PURE__*/React.createElement("defs", null, /*#__PURE__*/React.createElement("linearGradient", {
    id: "mjNowSplitTile",
    x1: "0",
    y1: "0",
    x2: "1",
    y2: "1"
  }, /*#__PURE__*/React.createElement("stop", {
    offset: "0",
    stopColor: "#3D5CF5"
  }), /*#__PURE__*/React.createElement("stop", {
    offset: "1",
    stopColor: "#2941B8"
  }))), /*#__PURE__*/React.createElement("rect", {
    width: "256",
    height: "256",
    rx: "60",
    fill: "url(#mjNowSplitTile)"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "50",
    y: "96",
    width: "60",
    height: "72",
    rx: "17",
    fill: "#ffffff"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "146",
    y: "96",
    width: "60",
    height: "72",
    rx: "17",
    fill: "none",
    stroke: "rgba(255,255,255,0.8)",
    strokeWidth: "7",
    strokeDasharray: "15 13",
    strokeLinecap: "round"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "123",
    y: "80",
    width: "10",
    height: "104",
    rx: "5",
    fill: "#FF5320"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "128",
    cy: "62",
    r: "13",
    fill: "#FF5320"
  }));
}
function Wordmark({
  product
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      lineHeight: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-display)',
      fontWeight: 700,
      fontSize: '19px',
      color: 'var(--rail-text)',
      letterSpacing: '-0.02em',
      display: 'flex',
      alignItems: 'baseline',
      gap: '6px'
    }
  }, /*#__PURE__*/React.createElement("span", null, "my", /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--live)'
    }
  }, "Job")), product === 'recruit' && /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-display)',
      fontSize: '12.5px',
      fontWeight: 600,
      color: 'var(--rail-soft)'
    }
  }, "Recruit")), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: '9px',
      letterSpacing: '0.14em',
      textTransform: 'uppercase',
      color: 'var(--rail-soft)',
      marginTop: '4px'
    }
  }, product === 'recruit' ? 'Vermittler-Workspace' : 'Für Bewerber:innen'));
}
function RailNavItem({
  item,
  active,
  onClick
}) {
  const [hover, setHover] = React.useState(false);
  return /*#__PURE__*/React.createElement("button", {
    onClick: onClick,
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false),
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: '11px',
      width: '100%',
      padding: '10px 14px',
      borderRadius: 'var(--radius-pill)',
      border: 'none',
      cursor: 'pointer',
      fontFamily: 'var(--font-body)',
      fontSize: '13.5px',
      fontWeight: active ? 600 : 500,
      color: active ? 'var(--accent-contrast)' : 'var(--rail-muted)',
      background: active ? 'var(--accent)' : hover ? 'var(--rail-glass)' : 'transparent',
      boxShadow: active ? 'var(--shadow-accent)' : 'none',
      textAlign: 'left',
      transform: hover && !active ? 'translateX(2px)' : 'none',
      transition: 'background var(--dur-fast) var(--ease-out), color var(--dur-fast) var(--ease-out), transform var(--dur-med) var(--ease-spring), box-shadow var(--dur-fast) var(--ease-out)'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: item.icon,
    size: 17,
    solid: active,
    style: {
      color: 'currentColor'
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1
    }
  }, item.label), item.badge != null && item.badge > 0 && /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: '10px',
      fontWeight: 700,
      color: active ? 'var(--accent-strong)' : 'var(--live-contrast)',
      background: active ? '#ffffff' : 'var(--live)',
      borderRadius: 'var(--radius-pill)',
      padding: '2px 7px',
      minWidth: '18px',
      textAlign: 'center'
    }
  }, item.badge));
}
function Topbar({
  title,
  subtitle,
  search,
  searchPlaceholder,
  onSearch,
  searchValue,
  actions
}) {
  return /*#__PURE__*/React.createElement("header", {
    style: {
      minHeight: 'var(--app-topbar-h)',
      flexShrink: 0,
      display: 'flex',
      alignItems: 'center',
      gap: '16px',
      padding: '4px 6px 14px 6px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("h1", {
    style: {
      fontFamily: 'var(--font-display)',
      fontSize: '24px',
      fontWeight: 600,
      color: 'var(--text-heading)',
      margin: 0,
      letterSpacing: '-0.015em',
      whiteSpace: 'nowrap'
    }
  }, title), subtitle && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '12px',
      color: 'var(--text-soft)',
      marginTop: '2px',
      whiteSpace: 'nowrap'
    }
  }, subtitle)), /*#__PURE__*/React.createElement("div", {
    style: {
      marginLeft: 'auto',
      display: 'flex',
      alignItems: 'center',
      gap: '10px'
    }
  }, search && /*#__PURE__*/React.createElement("label", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      background: 'var(--surface-card)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-pill)',
      padding: '0 16px',
      width: '250px',
      boxShadow: 'var(--shadow-xs)'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "search",
    size: 15,
    style: {
      color: 'var(--text-soft)'
    }
  }), /*#__PURE__*/React.createElement("input", {
    value: searchValue || '',
    onChange: e => onSearch && onSearch(e.target.value),
    placeholder: searchPlaceholder || 'Suchen …',
    style: {
      flex: 1,
      minWidth: 0,
      border: 'none',
      outline: 'none',
      background: 'transparent',
      fontFamily: 'var(--font-body)',
      fontSize: '13px',
      color: 'var(--text-heading)',
      padding: '10px 0'
    }
  })), /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'relative',
      display: 'inline-flex'
    }
  }, /*#__PURE__*/React.createElement("button", {
    title: "Benachrichtigungen",
    style: {
      width: '40px',
      height: '40px',
      display: 'grid',
      placeItems: 'center',
      borderRadius: 'var(--radius-pill)',
      border: '1px solid var(--border)',
      background: 'var(--surface-card)',
      cursor: 'pointer',
      color: 'var(--text-muted)',
      boxShadow: 'var(--shadow-xs)'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "bell",
    size: 16
  })), /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      top: '0px',
      right: '0px',
      width: '9px',
      height: '9px',
      borderRadius: '50%',
      background: 'var(--live)',
      border: '2px solid var(--surface-app)'
    }
  })), actions));
}
function RailShell({
  product,
  nav,
  active,
  onNav,
  account,
  settingsLabel,
  title,
  subtitle,
  search,
  searchPlaceholder,
  onSearch,
  searchValue,
  actions,
  detail,
  children
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      height: '100%',
      minHeight: 0,
      overflow: 'hidden',
      background: 'var(--app-bg)',
      padding: '14px',
      gap: '16px',
      boxSizing: 'border-box'
    }
  }, /*#__PURE__*/React.createElement("aside", {
    style: {
      width: 'var(--app-nav-width)',
      flexShrink: 0,
      display: 'flex',
      flexDirection: 'column',
      background: 'var(--rail-bg)',
      border: '1px solid var(--rail-border)',
      borderRadius: 'var(--radius-2xl)',
      boxShadow: 'var(--shadow-md)',
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '20px 18px 16px',
      display: 'flex',
      alignItems: 'center',
      gap: '12px'
    }
  }, /*#__PURE__*/React.createElement(Logomark, {
    size: 38
  }), /*#__PURE__*/React.createElement(Wordmark, {
    product: product
  })), /*#__PURE__*/React.createElement("nav", {
    style: {
      padding: '6px 12px',
      display: 'flex',
      flexDirection: 'column',
      gap: '4px',
      flex: 1,
      overflowY: 'auto'
    }
  }, nav.map(n => /*#__PURE__*/React.createElement(RailNavItem, {
    key: n.id,
    item: n,
    active: active === n.id,
    onClick: () => onNav && onNav(n.id)
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '8px 12px 12px',
      display: 'flex',
      flexDirection: 'column',
      gap: '4px',
      borderTop: '1px solid var(--rail-border)'
    }
  }, /*#__PURE__*/React.createElement(RailNavItem, {
    item: {
      id: '__settings',
      label: settingsLabel || 'Einstellungen',
      icon: 'sliders'
    },
    active: active === '__settings',
    onClick: () => onNav && onNav('__settings')
  }), account && /*#__PURE__*/React.createElement("button", {
    onClick: () => onNav && onNav('__account'),
    style: {
      marginTop: '4px',
      padding: '9px 11px',
      borderRadius: 'var(--radius-xl)',
      cursor: 'pointer',
      textAlign: 'left',
      background: 'var(--rail-glass)',
      border: '1px solid var(--rail-border)',
      display: 'flex',
      alignItems: 'center',
      gap: '10px'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Avatar, {
    name: account.name,
    src: account.src,
    size: "sm",
    ring: true
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'block',
      fontSize: '12.5px',
      fontWeight: 600,
      color: 'var(--rail-text)',
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis'
    }
  }, account.name), account.meta && /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'block',
      fontFamily: 'var(--font-mono)',
      fontSize: '10px',
      color: 'var(--rail-soft)'
    }
  }, account.meta)), /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "chevronRight",
    size: 14,
    style: {
      color: 'var(--rail-soft)'
    }
  })))), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement(Topbar, {
    title: title,
    subtitle: subtitle,
    search: search,
    searchPlaceholder: searchPlaceholder,
    onSearch: onSearch,
    searchValue: searchValue,
    actions: actions
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      display: 'flex',
      minHeight: 0,
      gap: '16px'
    }
  }, /*#__PURE__*/React.createElement("main", {
    style: {
      flex: 1,
      overflowY: 'auto',
      padding: '2px 6px 8px 6px',
      minWidth: 0
    }
  }, children), detail && /*#__PURE__*/React.createElement("aside", {
    style: {
      width: '360px',
      flexShrink: 0,
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-2xl)',
      background: 'var(--surface-card)',
      boxShadow: 'var(--shadow-md)',
      overflowY: 'auto'
    }
  }, detail))));
}
function TabsShell({
  product,
  nav,
  active,
  onNav,
  account,
  title,
  actions,
  children
}) {
  const tabs = nav.slice(0, 5);
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      minHeight: 0,
      background: 'var(--app-bg)'
    }
  }, /*#__PURE__*/React.createElement("header", {
    style: {
      flexShrink: 0,
      height: '56px',
      display: 'flex',
      alignItems: 'center',
      gap: '11px',
      padding: '0 16px',
      background: 'var(--rail-bg)',
      color: 'var(--rail-text)',
      borderBottom: '1px solid var(--rail-border)'
    }
  }, /*#__PURE__*/React.createElement(Logomark, {
    size: 28
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-display)',
      fontSize: '17px',
      fontWeight: 600,
      letterSpacing: '-0.015em',
      flex: 1,
      minWidth: 0,
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis'
    }
  }, title), actions, /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'relative',
      display: 'inline-flex'
    }
  }, /*#__PURE__*/React.createElement("button", {
    title: "Benachrichtigungen",
    style: {
      width: '36px',
      height: '36px',
      display: 'grid',
      placeItems: 'center',
      borderRadius: 'var(--radius-pill)',
      border: '1px solid var(--rail-border)',
      background: 'var(--rail-glass)',
      cursor: 'pointer',
      color: 'var(--rail-text)'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "bell",
    size: 16
  })), /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      top: '0',
      right: '0',
      width: '8px',
      height: '8px',
      borderRadius: '50%',
      background: 'var(--live)'
    }
  })), account && /*#__PURE__*/React.createElement(__ds_scope.Avatar, {
    name: account.name,
    src: account.src,
    size: "sm",
    ring: true
  })), /*#__PURE__*/React.createElement("main", {
    style: {
      flex: 1,
      overflowY: 'auto',
      padding: '16px 14px 20px',
      minHeight: 0
    }
  }, children), /*#__PURE__*/React.createElement("nav", {
    style: {
      flexShrink: 0,
      display: 'grid',
      gridTemplateColumns: `repeat(${tabs.length}, 1fr)`,
      background: 'var(--rail-bg)',
      borderTop: '1px solid var(--rail-border)',
      paddingBottom: 'env(safe-area-inset-bottom)'
    }
  }, tabs.map(n => {
    const on = active === n.id;
    return /*#__PURE__*/React.createElement("button", {
      key: n.id,
      onClick: () => onNav && onNav(n.id),
      style: {
        border: 'none',
        background: 'transparent',
        cursor: 'pointer',
        padding: '9px 4px 10px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '4px',
        color: on ? 'var(--accent-strong)' : 'var(--rail-soft)'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '56px',
        height: '30px',
        borderRadius: 'var(--radius-pill)',
        background: on ? 'var(--accent)' : 'transparent',
        color: on ? 'var(--accent-contrast)' : 'currentColor',
        transition: 'background var(--dur-med) var(--ease-spring)'
      }
    }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
      name: n.icon,
      size: 21,
      solid: on,
      strokeWidth: on ? 2.1 : 1.8
    }), n.badge != null && n.badge > 0 && /*#__PURE__*/React.createElement("span", {
      style: {
        position: 'absolute',
        top: '-5px',
        right: '-8px',
        fontFamily: 'var(--font-mono)',
        fontSize: '9px',
        fontWeight: 700,
        color: 'var(--live-contrast)',
        background: 'var(--live)',
        borderRadius: 'var(--radius-pill)',
        padding: '0 4px',
        minWidth: '15px',
        textAlign: 'center',
        lineHeight: '15px'
      }
    }, n.badge)), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: '10px',
        fontWeight: on ? 600 : 500,
        letterSpacing: '0.01em',
        whiteSpace: 'nowrap'
      }
    }, n.label));
  })));
}
function AppShell({
  posture = 'rail',
  ...props
}) {
  return posture === 'tabs' ? /*#__PURE__*/React.createElement(TabsShell, props) : /*#__PURE__*/React.createElement(RailShell, props);
}
Object.assign(__ds_scope, { Logomark, AppShell });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/app/AppShell.jsx", error: String((e && e.message) || e) }); }

// components/core/IconButton.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * A square, icon-only button for toolbars and row actions.
 * Tones mirror Button but optimised for a single glyph. Always pass `label`
 * for accessibility (title + aria-label).
 */
const SIZES = {
  sm: {
    width: '30px',
    height: '30px',
    icon: 15,
    radius: 'var(--radius-sm)'
  },
  md: {
    width: '36px',
    height: '36px',
    icon: 17,
    radius: 'var(--radius-md)'
  },
  lg: {
    width: '44px',
    height: '44px',
    icon: 20,
    radius: 'var(--radius-md)'
  }
};
const VARIANTS = {
  outline: {
    background: 'var(--surface-card)',
    color: 'var(--text-muted)',
    border: '1px solid var(--border-strong)'
  },
  ghost: {
    background: 'transparent',
    color: 'var(--text-soft)',
    border: '1px solid transparent'
  },
  ink: {
    background: 'var(--ink-900)',
    color: '#ffffff',
    border: '1px solid var(--ink-900)'
  },
  glass: {
    background: 'var(--sidebar-glass)',
    color: '#ffffff',
    border: '1px solid var(--sidebar-border-strong)'
  },
  accent: {
    background: 'var(--accent)',
    color: 'var(--accent-contrast)',
    border: '1px solid var(--accent)'
  }
};
function IconButton({
  icon,
  label,
  variant = 'outline',
  size = 'md',
  disabled = false,
  style = {},
  ...rest
}) {
  const s = SIZES[size];
  return /*#__PURE__*/React.createElement("button", _extends({
    type: "button",
    title: label,
    "aria-label": label,
    disabled: disabled,
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: s.width,
      height: s.height,
      borderRadius: s.radius,
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.4 : 1,
      transition: 'background var(--dur-fast) var(--ease-out), border-color var(--dur-fast) var(--ease-out), color var(--dur-fast) var(--ease-out)',
      ...VARIANTS[variant],
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: icon,
    size: s.icon
  }));
}
Object.assign(__ds_scope, { IconButton });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/IconButton.jsx", error: String((e && e.message) || e) }); }

// components/core/MetaPill.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * MetaPill — a metadata value (date, location, salary, count) with a leading
 * icon. IVE MERGE: this is now a thin PRESET of <Badge> (the one label-token
 * primitive), not its own chip — same shape, same type, tabular numerals.
 * Kept as a named export so existing call-sites keep working.
 *
 *   tone="default" → subtle Badge   ·   tone="accent" → soft Badge
 */
function MetaPill({
  children,
  icon = 'calendar',
  tone = 'default',
  style = {},
  ...rest
}) {
  return /*#__PURE__*/React.createElement(__ds_scope.Badge, _extends({
    variant: tone === 'accent' ? 'soft' : 'subtle',
    icon: icon ? /*#__PURE__*/React.createElement(__ds_scope.Icon, {
      name: icon,
      size: 12
    }) : null,
    style: {
      fontVariantNumeric: 'tabular-nums',
      ...style
    }
  }, rest), children);
}
Object.assign(__ds_scope, { MetaPill });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/MetaPill.jsx", error: String((e && e.message) || e) }); }

// components/data/Card.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * The base surface container. A white sheet with a hairline border and a
 * subtle shadow. Optional `title` + `action` header and `pad` control.
 */
function Card({
  title,
  subtitle,
  action,
  pad = true,
  children,
  style = {},
  bodyStyle = {},
  ...rest
}) {
  return /*#__PURE__*/React.createElement("section", _extends({
    style: {
      background: 'var(--surface-card)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-lg)',
      boxShadow: 'var(--shadow-sm)',
      overflow: 'hidden',
      ...style
    }
  }, rest), (title || action) && /*#__PURE__*/React.createElement("header", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '12px',
      padding: '14px 18px',
      borderBottom: '1px solid var(--border)'
    }
  }, /*#__PURE__*/React.createElement("div", null, title && /*#__PURE__*/React.createElement("h3", {
    style: {
      fontFamily: 'var(--font-display)',
      fontSize: 'var(--fs-lg)',
      fontWeight: 'var(--fw-bold)',
      color: 'var(--text-heading)',
      margin: 0,
      letterSpacing: '-0.01em'
    }
  }, title), subtitle && /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: '12.5px',
      color: 'var(--text-soft)',
      margin: '3px 0 0'
    }
  }, subtitle)), action), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: pad ? '18px' : 0,
      ...bodyStyle
    }
  }, children));
}
Object.assign(__ds_scope, { Card });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/data/Card.jsx", error: String((e && e.message) || e) }); }

// components/data/MatchIndicator.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * MatchIndicator — the candidate-FIT signal, and the brand's ownable idea.
 *
 * Deliberately RADIAL (a conic ring) so it can never be confused with the
 * linear neutral ProgressBar that shows mandate *fill / completion*. It rides
 * the accent. Optional two-tier breakdown (Pflicht- vs Bonus-Skills) is what
 * makes the score legible: "9/10 must-haves, 3/6 bonus" beats a bare 74%.
 *
 *   variant="ring"  full ring (+ optional tiers beside it)   — profiles, detail panels
 *   variant="chip"  compact pill "● 74% Match"               — list rows
 *   variant="bare"  ring only, no caption                    — tight spots
 */
const SIZES = {
  sm: {
    ring: 40,
    hole: 28,
    font: '11px',
    stroke: 6
  },
  md: {
    ring: 58,
    hole: 42,
    font: '13px',
    stroke: 8
  },
  lg: {
    ring: 76,
    hole: 56,
    font: '16px',
    stroke: 10
  }
};
function MatchIndicator({
  value = 0,
  tiers,
  variant = 'ring',
  size = 'md',
  label = 'Match',
  style = {},
  ...rest
}) {
  const pct = Math.max(0, Math.min(100, Math.round(value)));
  if (variant === 'chip') {
    // The chip is an ASSESSMENT, not an action, so it must not wear the accent
    // (that role belongs to the card's one primary CTA). A strong fit reads as
    // "good news" in success green; anything below is neutral meta.
    const strong = pct >= 80;
    const tone = strong ? {
      color: 'var(--success-strong)',
      background: 'var(--success-soft)',
      border: 'var(--success-border)',
      dot: 'var(--success)'
    } : {
      color: 'var(--text-body)',
      background: 'var(--surface-sunk)',
      border: 'var(--border)',
      dot: 'var(--text-soft)'
    };
    return /*#__PURE__*/React.createElement("span", _extends({
      style: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        fontFamily: 'var(--font-body)',
        fontSize: '12px',
        fontWeight: 'var(--fw-semibold)',
        color: tone.color,
        background: tone.background,
        border: `1px solid ${tone.border}`,
        borderRadius: 'var(--radius-pill)',
        padding: '3px 10px 3px 8px',
        whiteSpace: 'nowrap',
        ...style
      }
    }, rest), /*#__PURE__*/React.createElement("span", {
      style: {
        width: '7px',
        height: '7px',
        borderRadius: '50%',
        background: tone.dot,
        flexShrink: 0
      }
    }), /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: 'var(--font-mono)',
        fontVariantNumeric: 'tabular-nums'
      }
    }, pct, "%"), label && /*#__PURE__*/React.createElement("span", {
      style: {
        color: 'var(--text-muted)',
        fontWeight: 'var(--fw-medium)'
      }
    }, label));
  }
  const sz = SIZES[size] || SIZES.md;
  const ring = /*#__PURE__*/React.createElement("div", {
    style: {
      width: sz.ring,
      height: sz.ring,
      borderRadius: '50%',
      flexShrink: 0,
      display: 'grid',
      placeItems: 'center',
      background: `conic-gradient(var(--match) ${pct}%, var(--match-track) 0)`
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: sz.hole,
      height: sz.hole,
      borderRadius: '50%',
      background: 'var(--surface-card)',
      display: 'grid',
      placeItems: 'center'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontVariantNumeric: 'tabular-nums',
      fontWeight: 'var(--fw-semibold)',
      fontSize: sz.font,
      color: 'var(--match-strong)'
    }
  }, pct)));
  if (variant === 'bare' || !tiers || tiers.length === 0) {
    return /*#__PURE__*/React.createElement("div", _extends({
      style: {
        display: 'inline-flex',
        ...style
      }
    }, rest), ring);
  }
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: '16px',
      ...style
    }
  }, rest), ring, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
      flex: 1,
      minWidth: 0
    }
  }, tiers.map((t, i) => {
    const tp = t.max ? Math.round(t.value / t.max * 100) : Math.max(0, Math.min(100, t.value));
    const bonus = i > 0;
    return /*#__PURE__*/React.createElement("div", {
      key: i,
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: '10px'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: '12px',
        color: 'var(--text-muted)',
        width: '92px',
        flexShrink: 0
      }
    }, t.label), /*#__PURE__*/React.createElement("span", {
      style: {
        flex: 1,
        height: '7px',
        borderRadius: 'var(--radius-pill)',
        background: 'var(--match-track)',
        overflow: 'hidden'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        display: 'block',
        height: '100%',
        width: `${tp}%`,
        borderRadius: 'var(--radius-pill)',
        background: bonus ? 'var(--match-bonus)' : 'var(--match)',
        transition: 'width var(--dur-med) var(--ease-out)'
      }
    })), /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: 'var(--font-mono)',
        fontSize: '11px',
        color: 'var(--text-soft)',
        fontVariantNumeric: 'tabular-nums',
        width: '38px',
        textAlign: 'right',
        flexShrink: 0
      }
    }, t.max ? `${t.value}/${t.max}` : `${tp}%`));
  })));
}
Object.assign(__ds_scope, { MatchIndicator });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/data/MatchIndicator.jsx", error: String((e && e.message) || e) }); }

// components/data/ProgressBar.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * A thin progress / score bar. `value` 0–100. `tone` picks the fill color;
 * pass a status key to tie it to a pipeline stage.
 */
const TONES = {
  accent: 'var(--accent)',
  success: 'var(--success)',
  warning: 'var(--warning)',
  danger: 'var(--danger)',
  new: 'var(--status-new)',
  review: 'var(--status-review)',
  interview: 'var(--status-interview)',
  offer: 'var(--status-offer)',
  hired: 'var(--status-hired)'
};
function ProgressBar({
  value = 0,
  tone = 'accent',
  height = 6,
  showValue = false,
  label,
  style = {},
  ...rest
}) {
  const pct = Math.max(0, Math.min(100, value));
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: '6px',
      ...style
    }
  }, rest), (label || showValue) && /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      fontFamily: 'var(--font-mono)',
      fontSize: '11px',
      color: 'var(--text-soft)'
    }
  }, /*#__PURE__*/React.createElement("span", null, label), showValue && /*#__PURE__*/React.createElement("span", {
    style: {
      fontVariantNumeric: 'tabular-nums',
      color: 'var(--text-muted)'
    }
  }, pct, "%")), /*#__PURE__*/React.createElement("div", {
    style: {
      width: '100%',
      height: `${height}px`,
      borderRadius: 'var(--radius-pill)',
      background: 'var(--surface-sunk)',
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: `${pct}%`,
      height: '100%',
      borderRadius: 'var(--radius-pill)',
      background: TONES[tone] || tone,
      transition: 'width var(--dur-med) var(--ease-out)'
    }
  })));
}
Object.assign(__ds_scope, { ProgressBar });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/data/ProgressBar.jsx", error: String((e && e.message) || e) }); }

// components/data/StatCard.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * A KPI tile for the dashboard — big number, label, an optional delta trend,
 * and an accent icon. Delta `dir` colors the change green/red.
 */
function StatCard({
  label,
  value,
  delta,
  dir = 'up',
  icon,
  style = {},
  ...rest
}) {
  const deltaColor = dir === 'down' ? 'var(--danger)' : 'var(--success)';
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      background: 'var(--surface-card)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-lg)',
      boxShadow: 'var(--shadow-sm)',
      padding: '18px 20px',
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: '10.5px',
      letterSpacing: 'var(--ls-wide)',
      textTransform: 'uppercase',
      color: 'var(--text-soft)'
    }
  }, label), icon && /*#__PURE__*/React.createElement("span", {
    style: {
      width: '30px',
      height: '30px',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 'var(--radius-md)',
      background: 'var(--accent-soft)',
      color: 'var(--accent-strong)'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: icon,
    size: 16
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'flex-end',
      gap: '10px'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-display)',
      fontSize: 'var(--fs-4xl)',
      fontWeight: 'var(--fw-bold)',
      color: 'var(--text-heading)',
      lineHeight: 1,
      letterSpacing: 'var(--ls-tight)',
      fontVariantNumeric: 'tabular-nums'
    }
  }, value), delta != null && /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '3px',
      fontFamily: 'var(--font-mono)',
      fontSize: '12px',
      fontWeight: 'var(--fw-semibold)',
      color: deltaColor,
      paddingBottom: '3px'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: dir === 'down' ? 'chevronDown' : 'chevronUp',
    size: 13,
    strokeWidth: 2.4
  }), delta)));
}
Object.assign(__ds_scope, { StatCard });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/data/StatCard.jsx", error: String((e && e.message) || e) }); }

// components/data/StatusBadge.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * The pipeline-stage chip — the most-used status indicator in the recruiting
 * product. Maps a stage key to its German label + status color (a leading dot
 * over a soft fill). Use `dot={false}` for a flat label.
 */
const STAGES = {
  new: {
    label: 'Neu',
    color: 'var(--status-new)',
    soft: 'var(--status-new-soft)',
    border: 'var(--status-new-border)',
    strong: 'var(--status-new-strong)'
  },
  review: {
    label: 'Sichtung',
    color: 'var(--status-review)',
    soft: 'var(--status-review-soft)',
    border: 'var(--status-review-border)',
    strong: 'var(--status-review-strong)'
  },
  interview: {
    label: 'Interview',
    color: 'var(--status-interview)',
    soft: 'var(--status-interview-soft)',
    border: 'var(--status-interview-border)',
    strong: 'var(--status-interview-strong)'
  },
  offer: {
    label: 'Angebot',
    color: 'var(--status-offer)',
    soft: 'var(--status-offer-soft)',
    border: 'var(--status-offer-border)',
    strong: 'var(--status-offer-strong)'
  },
  hired: {
    label: 'Eingestellt',
    color: 'var(--status-hired)',
    soft: 'var(--status-hired-soft)',
    border: 'var(--status-hired-border)',
    strong: 'var(--status-hired-strong)'
  },
  rejected: {
    label: 'Absage',
    color: 'var(--status-rejected)',
    soft: 'var(--status-rejected-soft)',
    border: 'var(--status-rejected-border)',
    strong: 'var(--status-rejected-strong)'
  }
};
function StatusBadge({
  status = 'new',
  label,
  dot = true,
  size = 'md',
  style = {},
  ...rest
}) {
  const s = STAGES[status] || STAGES.new;
  const sz = size === 'sm' ? {
    fontSize: '10.5px',
    padding: '2px 8px'
  } : {
    fontSize: '11.5px',
    padding: '4px 10px'
  };
  return /*#__PURE__*/React.createElement("span", _extends({
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '6px',
      fontFamily: 'var(--font-mono)',
      fontWeight: 'var(--fw-semibold)',
      letterSpacing: '0.02em',
      whiteSpace: 'nowrap',
      borderRadius: 'var(--radius-pill)',
      background: s.soft,
      color: s.strong,
      border: `1px solid ${s.border}`,
      ...sz,
      ...style
    }
  }, rest), dot && /*#__PURE__*/React.createElement("span", {
    style: {
      width: '6px',
      height: '6px',
      borderRadius: '50%',
      background: s.color,
      flexShrink: 0
    }
  }), label || s.label);
}
Object.assign(__ds_scope, { STAGES, StatusBadge });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/data/StatusBadge.jsx", error: String((e && e.message) || e) }); }

// components/data/ApplicationRow.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * ApplicationRow — the canonical "one application" row for the applicant app
 * (myJob ▸ Bewerbungen). Absorbs karriere's rich list and bewerber's weaker
 * copy into one home.
 *
 * Mono-detox in practice: the POSITION is the single hero signal (display
 * font), company + location are humanist sans, and mono is reserved for the
 * application ID, the match %, and the timestamp. The match score is a chip
 * (radial language), never confused with a mandate-fill bar.
 *
 * A company gets a rounded-square initials tile (imagery is people-only; a
 * company is not a person, so it never takes a circular Avatar).
 */

function ApplicationRow({
  position,
  company,
  location,
  appId,
  logo,
  match,
  status = 'new',
  when,
  selected = false,
  onClick,
  style = {},
  ...rest
}) {
  const [hover, setHover] = React.useState(false);
  return /*#__PURE__*/React.createElement("div", _extends({
    onClick: onClick,
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false),
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: '14px',
      padding: '13px 16px',
      cursor: onClick ? 'pointer' : 'default',
      background: selected ? 'var(--accent-soft)' : hover ? 'var(--surface-subtle)' : 'transparent',
      borderLeft: `3px solid ${selected ? 'var(--accent)' : 'transparent'}`,
      borderBottom: '1px solid var(--border)',
      transition: 'background var(--dur-fast) var(--ease-out)',
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement(__ds_scope.EntityTile, {
    type: "company",
    name: company,
    src: logo,
    size: "md"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      minWidth: 0,
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-display)',
      fontSize: 'var(--fs-md)',
      fontWeight: 'var(--fw-semibold)',
      color: 'var(--text-heading)',
      letterSpacing: 'var(--ls-tight)',
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis'
    }
  }, position), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      marginTop: '2px',
      minWidth: 0,
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 'var(--fs-xs)',
      color: 'var(--text-muted)',
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      minWidth: 0
    }
  }, company, location ? ` · ${location}` : ''), appId && /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 'var(--fs-3xs)',
      color: 'var(--text-soft)',
      flexShrink: 0,
      whiteSpace: 'nowrap'
    }
  }, appId))), /*#__PURE__*/React.createElement("div", {
    style: {
      flexShrink: 0,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'flex-end',
      gap: '6px'
    }
  }, match != null && /*#__PURE__*/React.createElement(__ds_scope.MatchIndicator, {
    value: match,
    variant: "chip"
  }), /*#__PURE__*/React.createElement(__ds_scope.StatusBadge, {
    status: status,
    size: "sm"
  }), when && /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '4px',
      fontFamily: 'var(--font-mono)',
      fontSize: 'var(--fs-3xs)',
      color: 'var(--text-soft)',
      whiteSpace: 'nowrap'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "clock",
    size: 11
  }), when)));
}
Object.assign(__ds_scope, { ApplicationRow });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/data/ApplicationRow.jsx", error: String((e && e.message) || e) }); }

// components/data/CandidateRow.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * The core list row of the recruiting product: candidate avatar + name + role,
 * the position applied for, a match score, the pipeline status and a meta
 * timestamp. Hover lifts the background. Whole row is clickable.
 */
function CandidateRow({
  name,
  role,
  position,
  src,
  status = 'new',
  score,
  when,
  selected = false,
  onClick,
  style = {},
  ...rest
}) {
  const [hover, setHover] = React.useState(false);
  return /*#__PURE__*/React.createElement("div", _extends({
    onClick: onClick,
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false),
    style: {
      display: 'grid',
      gridTemplateColumns: 'minmax(0,1.6fr) minmax(0,1.2fr) 78px 116px 96px',
      alignItems: 'center',
      gap: '14px',
      padding: '10px 16px',
      minHeight: 'var(--row-h)',
      cursor: onClick ? 'pointer' : 'default',
      background: selected ? 'var(--accent-soft)' : hover ? 'var(--surface-subtle)' : 'transparent',
      borderLeft: `3px solid ${selected ? 'var(--accent)' : 'transparent'}`,
      borderBottom: '1px solid var(--border)',
      transition: 'background var(--dur-fast) var(--ease-out)',
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Avatar, {
    name: name,
    src: src,
    size: "md"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-display)',
      fontSize: 'var(--fs-sm)',
      fontWeight: 'var(--fw-bold)',
      color: 'var(--text-heading)',
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis'
    }
  }, name), role && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '12px',
      color: 'var(--text-soft)',
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis'
    }
  }, role))), /*#__PURE__*/React.createElement("div", {
    style: {
      minWidth: 0,
      fontSize: '12.5px',
      color: 'var(--text-muted)',
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis'
    }
  }, position), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: '13px',
      fontWeight: 'var(--fw-semibold)',
      color: score >= 80 ? 'var(--success)' : 'var(--text-muted)',
      fontVariantNumeric: 'tabular-nums'
    }
  }, score != null ? `${score}%` : '—'), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(__ds_scope.StatusBadge, {
    status: status,
    size: "sm"
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'flex-end',
      gap: '6px',
      fontFamily: 'var(--font-mono)',
      fontSize: '11px',
      color: 'var(--text-soft)'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "clock",
    size: 12
  }), when));
}
Object.assign(__ds_scope, { CandidateRow });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/data/CandidateRow.jsx", error: String((e && e.message) || e) }); }

// components/data/PositionCard.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * PositionCard — the "Stelle" object: the trackable job posting, and the thing
 * the recruiter applies a candidate TO. This is the entity the system was
 * missing — it carries the description, the skill requirements, and (crucially
 * for the DACH market) its COUNTRY and SOURCE as first-class fields, so Swiss
 * postings (jobs.ch / jobup.ch / job-room.ch, CHF, Pensum %) are modelled, not
 * bolted on.
 *
 * Two contexts:
 *   • plain — a posting in the Stellen list (no candidate).
 *   • matched — shown against a candidate: a MatchIndicator chip appears and
 *     each required skill is marked met (✓) or missing, and the primary action
 *     becomes "<Name> bewerben" (apply on the candidate's behalf).
 */

const FLAGS = {
  DE: /*#__PURE__*/React.createElement("g", null, /*#__PURE__*/React.createElement("rect", {
    width: "22",
    height: "5.33",
    y: "0",
    fill: "#000"
  }), /*#__PURE__*/React.createElement("rect", {
    width: "22",
    height: "5.34",
    y: "5.33",
    fill: "#DD0000"
  }), /*#__PURE__*/React.createElement("rect", {
    width: "22",
    height: "5.33",
    y: "10.67",
    fill: "#FFCE00"
  })),
  AT: /*#__PURE__*/React.createElement("g", null, /*#__PURE__*/React.createElement("rect", {
    width: "22",
    height: "5.33",
    y: "0",
    fill: "#ED2939"
  }), /*#__PURE__*/React.createElement("rect", {
    width: "22",
    height: "5.34",
    y: "5.33",
    fill: "#fff"
  }), /*#__PURE__*/React.createElement("rect", {
    width: "22",
    height: "5.33",
    y: "10.67",
    fill: "#ED2939"
  })),
  CH: /*#__PURE__*/React.createElement("g", null, /*#__PURE__*/React.createElement("rect", {
    width: "22",
    height: "16",
    fill: "#D52B1E"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "9.2",
    y: "3.4",
    width: "3.6",
    height: "9.2",
    fill: "#fff"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "6.4",
    y: "6.2",
    width: "9.2",
    height: "3.6",
    fill: "#fff"
  }))
};
const COUNTRY_LABEL = {
  DE: 'Deutschland',
  AT: 'Österreich',
  CH: 'Schweiz'
};
function Flag({
  country
}) {
  const f = FLAGS[country];
  if (!f) return null;
  return /*#__PURE__*/React.createElement("span", {
    title: COUNTRY_LABEL[country],
    style: {
      display: 'inline-flex',
      width: '18px',
      height: '13px',
      borderRadius: '3px',
      overflow: 'hidden',
      flexShrink: 0,
      boxShadow: 'inset 0 0 0 1px rgba(0,0,0,.08)'
    }
  }, /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 22 16",
    width: "18",
    height: "13",
    preserveAspectRatio: "none"
  }, f));
}
function SkillTag({
  name,
  met
}) {
  // met === undefined → neutral requirement; true → candidate has it; false → gap.
  const known = met !== undefined;
  const has = met === true;
  return /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '5px',
      fontFamily: 'var(--font-mono)',
      fontSize: 'var(--fs-2xs)',
      fontWeight: 'var(--fw-medium)',
      padding: '3px 9px',
      borderRadius: 'var(--radius-pill)',
      whiteSpace: 'nowrap',
      border: '1px solid',
      ...(has
      // a met skill is "good news" — success-soft, not accent (the accent is
      // reserved for the card's single primary CTA)
      ? {
        background: 'var(--success-soft)',
        borderColor: 'var(--success-border)',
        color: 'var(--success-strong)'
      } : known ? {
        background: 'transparent',
        borderColor: 'var(--border-strong)',
        color: 'var(--text-soft)'
      } : {
        background: 'var(--surface-sunk)',
        borderColor: 'var(--border)',
        color: 'var(--text-muted)'
      })
    }
  }, known && /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: has ? 'check' : 'x',
    size: 11
  }), name);
}
function PositionCard({
  title,
  company,
  logo,
  location,
  country,
  source,
  origin = 'source',
  pensum,
  salary,
  posted,
  skills = [],
  match,
  status,
  applyLabel,
  onApply,
  onView,
  selected = false,
  onClick,
  style = {},
  ...rest
}) {
  const [hover, setHover] = React.useState(false);
  const matched = match != null;
  return /*#__PURE__*/React.createElement("div", _extends({
    onClick: onClick,
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false),
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: '14px',
      padding: '18px 20px',
      background: 'var(--surface-card)',
      border: `1px solid ${selected ? 'var(--accent-border)' : 'var(--border)'}`,
      borderRadius: 'var(--radius-lg)',
      boxShadow: hover || selected ? 'var(--shadow-md)' : 'var(--shadow-sm)',
      cursor: onClick ? 'pointer' : 'default',
      transition: 'box-shadow var(--dur-fast) var(--ease-out), border-color var(--dur-fast)',
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'flex-start',
      gap: '13px'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.EntityTile, {
    type: "company",
    name: company,
    src: logo,
    size: "lg"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      minWidth: 0,
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-display)',
      fontSize: 'var(--fs-lg)',
      fontWeight: 'var(--fw-semibold)',
      color: 'var(--text-heading)',
      letterSpacing: 'var(--ls-tight)',
      lineHeight: 1.25
    }
  }, title), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: '7px',
      marginTop: '3px',
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 'var(--fs-sm)',
      color: 'var(--text-muted)',
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis'
    }
  }, company, location ? ` · ${location}` : ''), country && /*#__PURE__*/React.createElement(Flag, {
    country: country
  }))), matched ? /*#__PURE__*/React.createElement(__ds_scope.MatchIndicator, {
    value: match,
    variant: "chip"
  }) : status ? /*#__PURE__*/React.createElement(__ds_scope.StatusBadge, {
    status: status,
    size: "sm"
  }) : null), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexWrap: 'wrap',
      gap: '7px'
    }
  }, origin === 'manual' && /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '6px',
      fontFamily: 'var(--font-mono)',
      fontSize: 'var(--fs-2xs)',
      fontWeight: 'var(--fw-semibold)',
      color: 'var(--ink-700)',
      background: 'var(--surface-sunk)',
      border: '1px dashed var(--text-soft)',
      borderRadius: 'var(--radius-pill)',
      padding: '3px 9px'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "edit",
    size: 12
  }), "Created manually"), source && /*#__PURE__*/React.createElement(__ds_scope.MetaPill, {
    icon: "search"
  }, source), pensum && /*#__PURE__*/React.createElement(__ds_scope.MetaPill, {
    icon: "briefcase"
  }, pensum), salary && /*#__PURE__*/React.createElement(__ds_scope.MetaPill, {
    icon: "tag"
  }, salary), posted && /*#__PURE__*/React.createElement(__ds_scope.MetaPill, {
    icon: "clock"
  }, posted)), skills.length > 0 && /*#__PURE__*/React.createElement("div", null, matched && /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 'var(--fs-3xs)',
      letterSpacing: 'var(--ls-wide)',
      textTransform: 'uppercase',
      color: 'var(--text-soft)',
      marginBottom: '8px'
    }
  }, "Skill match"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexWrap: 'wrap',
      gap: '6px'
    }
  }, skills.map((s, i) => /*#__PURE__*/React.createElement(SkillTag, {
    key: i,
    name: typeof s === 'string' ? s : s.name,
    met: typeof s === 'string' ? undefined : s.met
  })))), (onView || onApply) && /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      marginTop: '2px',
      paddingTop: '14px',
      borderTop: '1px solid var(--border)'
    }
  }, onView && /*#__PURE__*/React.createElement("button", {
    onClick: e => {
      e.stopPropagation();
      onView();
    },
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '7px',
      fontFamily: 'var(--font-body)',
      fontSize: 'var(--fs-sm)',
      fontWeight: 'var(--fw-medium)',
      color: 'var(--text-muted)',
      background: 'transparent',
      border: '1px solid var(--border-strong)',
      borderRadius: 'var(--radius-md)',
      padding: '8px 13px',
      cursor: 'pointer'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "fileText",
    size: 15
  }), "Job description"), onApply && /*#__PURE__*/React.createElement("button", {
    onClick: e => {
      e.stopPropagation();
      onApply();
    },
    style: {
      marginLeft: 'auto',
      display: 'inline-flex',
      alignItems: 'center',
      gap: '7px',
      fontFamily: 'var(--font-body)',
      fontSize: 'var(--fs-sm)',
      fontWeight: 'var(--fw-semibold)',
      color: 'var(--accent-contrast)',
      background: 'var(--accent)',
      border: '1px solid var(--accent)',
      borderRadius: 'var(--radius-md)',
      padding: '8px 15px',
      cursor: 'pointer'
    }
  }, applyLabel || 'Apply candidate', /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "arrowRight",
    size: 15
  }))));
}
Object.assign(__ds_scope, { PositionCard });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/data/PositionCard.jsx", error: String((e && e.message) || e) }); }

// components/data/Tabs.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Underline tab bar. `tabs` is [{id,label,count?}]. Controlled via `value` +
 * `onChange`. The active tab carries the accent underline.
 */
function Tabs({
  tabs = [],
  value,
  onChange,
  style = {},
  ...rest
}) {
  return /*#__PURE__*/React.createElement("div", _extends({
    role: "tablist",
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: '4px',
      borderBottom: '1px solid var(--border)',
      ...style
    }
  }, rest), tabs.map(t => {
    const active = t.id === value;
    return /*#__PURE__*/React.createElement("button", {
      key: t.id,
      role: "tab",
      "aria-selected": active,
      onClick: () => onChange && onChange(t.id),
      style: {
        appearance: 'none',
        background: 'transparent',
        border: 'none',
        cursor: 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '7px',
        padding: '11px 14px',
        marginBottom: '-1px',
        fontFamily: 'var(--font-body)',
        fontSize: 'var(--fs-sm)',
        fontWeight: 'var(--fw-semibold)',
        color: active ? 'var(--text-heading)' : 'var(--text-soft)',
        borderBottom: `2px solid ${active ? 'var(--accent)' : 'transparent'}`,
        transition: 'color var(--dur-fast) var(--ease-out), border-color var(--dur-fast) var(--ease-out)'
      }
    }, t.label, t.count != null && /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: 'var(--font-mono)',
        fontSize: '10.5px',
        fontWeight: 'var(--fw-semibold)',
        color: active ? 'var(--accent-strong)' : 'var(--text-soft)',
        background: active ? 'var(--accent-soft)' : 'var(--surface-sunk)',
        border: `1px solid ${active ? 'var(--accent-border)' : 'var(--border)'}`,
        borderRadius: 'var(--radius-pill)',
        padding: '1px 7px',
        fontVariantNumeric: 'tabular-nums'
      }
    }, t.count));
  }));
}
Object.assign(__ds_scope, { Tabs });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/data/Tabs.jsx", error: String((e && e.message) || e) }); }

// components/forms/Checkbox.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Checkbox with a label. Controlled via `checked` + `onChange`.
 */
function Checkbox({
  label,
  checked = false,
  onChange,
  disabled = false,
  style = {},
  ...rest
}) {
  return /*#__PURE__*/React.createElement("label", _extends({
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '10px',
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.5 : 1,
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("span", {
    onClick: () => !disabled && onChange && onChange(!checked),
    style: {
      width: '18px',
      height: '18px',
      flexShrink: 0,
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 'var(--radius-xs)',
      border: `1.5px solid ${checked ? 'var(--accent)' : 'var(--border-strong)'}`,
      background: checked ? 'var(--accent)' : 'var(--surface-card)',
      color: 'var(--accent-contrast)',
      transition: 'background var(--dur-fast) var(--ease-out), border-color var(--dur-fast) var(--ease-out)'
    }
  }, checked && /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "check",
    size: 13,
    strokeWidth: 2.6
  })), label && /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 'var(--fs-sm)',
      color: 'var(--text-body)'
    }
  }, label));
}
Object.assign(__ds_scope, { Checkbox });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Checkbox.jsx", error: String((e && e.message) || e) }); }

// components/forms/Input.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Text input with an optional leading icon and label. Focus draws the accent
 * border + soft glow. Error swaps to the danger color.
 */
function Input({
  label,
  icon,
  hint,
  error,
  type = 'text',
  style = {},
  wrapStyle = {},
  ...rest
}) {
  const [focus, setFocus] = React.useState(false);
  const borderColor = error ? 'var(--danger)' : focus ? 'var(--accent)' : 'var(--border-strong)';
  return /*#__PURE__*/React.createElement("label", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: '6px',
      ...wrapStyle
    }
  }, label && /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: '10.5px',
      letterSpacing: 'var(--ls-wide)',
      textTransform: 'uppercase',
      color: 'var(--text-soft)'
    }
  }, label), /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: '9px',
      background: 'var(--surface-card)',
      border: `1px solid ${borderColor}`,
      borderRadius: 'var(--radius-md)',
      padding: '0 12px',
      boxShadow: focus ? '0 0 0 3px var(--accent-soft)' : 'none',
      transition: 'border-color var(--dur-fast) var(--ease-out), box-shadow var(--dur-fast) var(--ease-out)'
    }
  }, icon && /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: icon,
    size: 16,
    style: {
      color: 'var(--text-soft)'
    }
  }), /*#__PURE__*/React.createElement("input", _extends({
    type: type,
    onFocus: () => setFocus(true),
    onBlur: () => setFocus(false),
    style: {
      flex: 1,
      minWidth: 0,
      appearance: 'none',
      border: 'none',
      outline: 'none',
      background: 'transparent',
      fontFamily: 'var(--font-body)',
      fontSize: 'var(--fs-sm)',
      color: 'var(--text-heading)',
      padding: '10px 0',
      ...style
    }
  }, rest))), (hint || error) && /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: '11.5px',
      color: error ? 'var(--danger)' : 'var(--text-soft)'
    }
  }, error || hint));
}
Object.assign(__ds_scope, { Input });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Input.jsx", error: String((e && e.message) || e) }); }

// components/forms/Select.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Styled native select with a custom chevron. Pass `options` as
 * [{value,label}] or plain strings.
 */
function Select({
  label,
  options = [],
  value,
  onChange,
  style = {},
  wrapStyle = {},
  ...rest
}) {
  const [focus, setFocus] = React.useState(false);
  const opts = options.map(o => typeof o === 'string' ? {
    value: o,
    label: o
  } : o);
  return /*#__PURE__*/React.createElement("label", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: '6px',
      ...wrapStyle
    }
  }, label && /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: '10.5px',
      letterSpacing: 'var(--ls-wide)',
      textTransform: 'uppercase',
      color: 'var(--text-soft)'
    }
  }, label), /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'relative',
      display: 'flex',
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement("select", _extends({
    value: value,
    onChange: onChange,
    onFocus: () => setFocus(true),
    onBlur: () => setFocus(false),
    style: {
      appearance: 'none',
      WebkitAppearance: 'none',
      width: '100%',
      border: `1px solid ${focus ? 'var(--accent)' : 'var(--border-strong)'}`,
      borderRadius: 'var(--radius-md)',
      background: 'var(--surface-card)',
      fontFamily: 'var(--font-body)',
      fontSize: 'var(--fs-sm)',
      color: 'var(--text-heading)',
      padding: '10px 38px 10px 13px',
      outline: 'none',
      cursor: 'pointer',
      boxShadow: focus ? '0 0 0 3px var(--accent-soft)' : 'none',
      transition: 'border-color var(--dur-fast) var(--ease-out), box-shadow var(--dur-fast) var(--ease-out)',
      ...style
    }
  }, rest), opts.map(o => /*#__PURE__*/React.createElement("option", {
    key: o.value,
    value: o.value
  }, o.label))), /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "chevronDown",
    size: 15,
    style: {
      position: 'absolute',
      right: '12px',
      color: 'var(--text-soft)',
      pointerEvents: 'none'
    }
  })));
}
Object.assign(__ds_scope, { Select });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Select.jsx", error: String((e && e.message) || e) }); }

// components/forms/Switch.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * On/off switch. Controlled via `checked` + `onChange`. Track fills with the
 * accent when on.
 */
function Switch({
  label,
  checked = false,
  onChange,
  disabled = false,
  style = {},
  ...rest
}) {
  return /*#__PURE__*/React.createElement("label", _extends({
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '10px',
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.5 : 1,
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("span", {
    onClick: () => !disabled && onChange && onChange(!checked),
    style: {
      position: 'relative',
      width: '38px',
      height: '22px',
      flexShrink: 0,
      borderRadius: 'var(--radius-pill)',
      background: checked ? 'var(--accent)' : 'var(--border-strong)',
      transition: 'background var(--dur-med) var(--ease-out)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      top: '2px',
      left: checked ? '18px' : '2px',
      width: '18px',
      height: '18px',
      borderRadius: '50%',
      background: '#ffffff',
      boxShadow: '0 1px 2px rgba(0,0,0,0.25)',
      transition: 'left var(--dur-med) var(--ease-out)'
    }
  })), label && /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 'var(--fs-sm)',
      color: 'var(--text-body)'
    }
  }, label));
}
Object.assign(__ds_scope, { Switch });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Switch.jsx", error: String((e && e.message) || e) }); }

// components/forms/Textarea.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Multiline text input. Same focus treatment as <Input>. Auto-sizes to `rows`.
 */
function Textarea({
  label,
  hint,
  rows = 4,
  style = {},
  wrapStyle = {},
  ...rest
}) {
  const [focus, setFocus] = React.useState(false);
  return /*#__PURE__*/React.createElement("label", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: '6px',
      ...wrapStyle
    }
  }, label && /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: '10.5px',
      letterSpacing: 'var(--ls-wide)',
      textTransform: 'uppercase',
      color: 'var(--text-soft)'
    }
  }, label), /*#__PURE__*/React.createElement("textarea", _extends({
    rows: rows,
    onFocus: () => setFocus(true),
    onBlur: () => setFocus(false),
    style: {
      appearance: 'none',
      border: `1px solid ${focus ? 'var(--accent)' : 'var(--border-strong)'}`,
      borderRadius: 'var(--radius-md)',
      background: 'var(--surface-card)',
      fontFamily: 'var(--font-body)',
      fontSize: 'var(--fs-sm)',
      lineHeight: 1.6,
      color: 'var(--text-heading)',
      padding: '11px 13px',
      resize: 'vertical',
      outline: 'none',
      boxShadow: focus ? '0 0 0 3px var(--accent-soft)' : 'none',
      transition: 'border-color var(--dur-fast) var(--ease-out), box-shadow var(--dur-fast) var(--ease-out)',
      ...style
    }
  }, rest)), hint && /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: '11.5px',
      color: 'var(--text-soft)'
    }
  }, hint));
}
Object.assign(__ds_scope, { Textarea });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Textarea.jsx", error: String((e && e.message) || e) }); }

// data/talent-pool.js
try { (() => {
/* Seed talent pool for myJob. Suhay Sevinc is candidate #1 with his REAL CV
   (verbatim from the source résumé) so the recruiter never re-enters it — but
   he is just a normal candidate in the list, not special-cased anywhere.
   Other candidates are lighter, realistic fillers.
   Exposed as window.MyJobTalents. */
(function () {
  const suhay = {
    id: 'me',
    name: 'Suhay Sevinc',
    photo: '../assets/img/suhay-photo-sm.jpg',
    role: 'M.Sc. Software Engineer',
    headline: 'C++ / C#-.NET · Echtzeit- & verteilte Systeme',
    location: 'Blumberg, DE',
    workPermit: 'G — Grenzgänger Schweiz',
    available: 'sofort',
    salaryTarget: 'CHF 120–140k',
    seniority: 'Senior',
    years: 7,
    contact: {
      phone: '+49 176 91407840',
      mail: 'suhay.sevinc@gmail.com',
      address: ['Achdorfer Straße 25', '78176 Blumberg, DE'],
      linkedin: 'linkedin.com/in/suhay-sevinc',
      github: 'github.com/NexusHero'
    },
    personal: [['Nationalität', 'Deutsch'], ['Geburtsdatum', '07.05.1991'], ['Bewilligung', 'G (Grenzgänger CH)']],
    languages: [['Deutsch', 'Muttersprache'], ['Türkisch', 'Muttersprache'], ['Englisch', 'Verhandlungssicher']],
    about: 'Software Engineer (M.Sc.) mit über 7 Jahren Erfahrung und tiefgehendem Expertenwissen in der hardwarenahen, verteilten und geschäftskritischen Softwareentwicklung (C++ und C#/.NET). Erfahren in der Konzeption komplexer Systemarchitekturen, modernen DevOps-Praktiken (CI/CD) und agilen Methoden. Bewährt in technologisch anspruchsvollen und sicherheitskritischen Branchen wie der Verteidigungsindustrie und der industriellen Lasertechnik.',
    summary: ['Design & Entwicklung moderner C++ Echtzeitsysteme', 'Microservices, Vernetzung & komplexe API-Integration', 'DevOps-Praktiken, Gitflow & CI/CD'],
    /* flat list used by the matcher — the headline skills first */
    skills: ['C++20', 'C# / .NET', 'Python', 'Qt / QML', 'Microservices', 'gRPC', 'Protobuf', 'OPC-UA', 'REST', 'MQTT', 'Docker', 'Clean Architecture', 'CI/CD', 'GTest'],
    skillGroups: [{
      label: 'Sprachen',
      strong: true,
      items: ['C++20', 'C# / .NET 10', 'Python']
    }, {
      label: 'Frameworks & Bibliotheken',
      items: ['Qt / QML 6', 'Boost', 'OpenCV', 'ASP.NET Core', 'NumPy', 'TensorFlow']
    }, {
      label: 'Architektur',
      items: ['Microservices', 'Clean Architecture', 'DDD', 'MVVM', 'ISAQB / Arc42']
    }, {
      label: 'Protokolle & APIs',
      items: ['gRPC', 'Protobuf', 'OPC-UA', 'REST', 'MQTT']
    }, {
      label: 'DevOps & Build',
      items: ['Docker', 'Azure DevOps', 'Jenkins', 'GitLab CI', 'Conan']
    }, {
      label: 'Testing & Qualität',
      items: ['GTest', 'GMock', 'xUnit', 'Sonarcloud']
    }],
    interests: ['Home Assistant', 'Raspberry Pi', 'MQTT Sensing', 'Basketball'],
    experience: [{
      title: 'Software Engineer',
      company: 'Rheinmetall Air Defence AG',
      location: 'Zürich (CH)',
      period: '11/2024 — heute',
      current: true,
      tech: ['C++20', 'QML', 'REST', 'Protobuf', 'TCP/IP', 'Boost', 'GTest'],
      bullets: ['Entwickelte zentrale Steuersoftware der Oerlikon Skynex® Software für Control Nodes und Feuerleitgeräte', 'Implementierte taktische Kommunikationsprotokolle (TCP, REST, Protobuf) zur Vernetzung von Sensorsystemen, Effektoren und Simulationen', 'Setzte QML-Oberflächen als Kernbedienoberfläche des Systems um', 'Verantwortete Requirements Engineering inkl. Testkonzepten und Stakeholder-Abstimmung', 'Führte Gitflow samt modernem Entwicklungsprozess (Code Reviews, automatisierte Tests) teamweit ein']
    }, {
      title: 'Software Engineer C++ / C#',
      company: 'TRUMPF SE + Co. KG',
      location: 'Schramberg (DE)',
      period: '03/2019 — 10/2024 · 5 J. 8 M.',
      tech: ['C++17', 'C#', '.NET 8', 'Python', 'Qt', 'gRPC', 'OPC-UA', 'MQTT', 'OpenCV', 'Docker', 'Azure DevOps'],
      bullets: ['Visionsystem: C++-Visionsystem (Debian Realtime) weiterentwickelt, Kameraplattform für OEM-Kunden gebaut, Performance der Kameraanbindung von 60 auf 280 FPS gesteigert', 'Quality Data Store: .NET-System zur Kundendaten-Ablage mit gRPC-Client-Server-Kommunikation entwickelt', 'CAD/CAM-Microservice mit domänenspezifischer Sprache (LionWeb) in C# implementiert', 'Scrum Master für ein 5-köpfiges Team; OPC-UA/gRPC-Integration entwickelt', 'Durchgängige Softwarequalität via Gitflow, Clean Code (SOLID), CI/CD (Azure DevOps), Sonarcloud']
    }],
    certs: [{
      title: 'ISAQB CPSA-Advanced-Level — Certified Professional for Software Architecture',
      year: '2026',
      progress: '1 von 3 Modulen',
      highlight: true
    }, {
      title: 'ISAQB Foundation Level — Software Architecture',
      year: '2022'
    }, {
      title: 'Clean Code C++17',
      year: '2021'
    }],
    education: [{
      title: 'M.Sc. Informatik',
      school: 'Hochschule Furtwangen',
      period: '10/2017 — 03/2019',
      grade: '1.9'
    }, {
      title: 'B.Sc. Allgemeine Informatik',
      school: 'Hochschule Furtwangen',
      period: '03/2014 — 08/2017',
      grade: '2.2'
    }]
  };

  /* Other candidates — ordinary fillers so the pool is a real pool. */
  const others = [{
    id: 't2',
    name: 'Lena Bauer',
    role: 'Senior Frontend Engineer',
    headline: 'React · TypeScript · Design Systems',
    location: 'München, DE',
    available: 'in 2 Monaten',
    salaryTarget: '€ 85–95k',
    seniority: 'Senior',
    years: 6,
    skills: ['React', 'TypeScript', 'CSS Architecture', 'Vue', 'Testing', 'Node.js'],
    about: 'Frontend-Spezialistin mit Fokus auf skalierbare Design-Systeme und Performance.'
  }, {
    id: 't3',
    name: 'Milan Ebert',
    role: 'Backend Engineer',
    headline: 'Go · Kubernetes · verteilte Systeme',
    photo: '../assets/img/candidate-portrait-sm.jpg',
    location: 'Berlin, DE',
    available: 'sofort',
    salaryTarget: '€ 80–92k',
    seniority: 'Mid',
    years: 4,
    skills: ['Go', 'Kubernetes', 'PostgreSQL', 'gRPC', 'Docker', 'REST'],
    about: 'Backend-Engineer mit Schwerpunkt Cloud-native Infrastruktur.'
  }, {
    id: 't4',
    name: 'Nora Vogt',
    role: 'Product Designer',
    headline: 'Produkt · Interaction · Research',
    location: 'Hamburg, DE',
    available: 'in 1 Monat',
    salaryTarget: '€ 70–82k',
    seniority: 'Senior',
    years: 7,
    skills: ['Figma', 'Design Systems', 'User Research', 'Prototyping', 'Interaction Design'],
    about: 'Produktdesignerin mit Research-Hintergrund und System-Denken.'
  }];
  window.MyJobTalents = {
    me: suhay,
    all: [suhay, ...others],
    /* skill overlap between a candidate and a list of required skills */
    match: function (cand, required) {
      if (!required || !required.length) return {
        pct: 0,
        met: 0,
        total: 0
      };
      const have = (cand.skills || []).map(s => s.toLowerCase());
      const met = required.filter(r => have.includes(r.toLowerCase())).length;
      return {
        pct: Math.round(met / required.length * 100),
        met,
        total: required.length
      };
    }
  };
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "data/talent-pool.js", error: String((e && e.message) || e) }); }

__ds_ns.Logomark = __ds_scope.Logomark;

__ds_ns.AppShell = __ds_scope.AppShell;

__ds_ns.Avatar = __ds_scope.Avatar;

__ds_ns.Badge = __ds_scope.Badge;

__ds_ns.Button = __ds_scope.Button;

__ds_ns.EntityTile = __ds_scope.EntityTile;

__ds_ns.Icon = __ds_scope.Icon;

__ds_ns.ICON_NAMES = __ds_scope.ICON_NAMES;

__ds_ns.IconButton = __ds_scope.IconButton;

__ds_ns.MetaPill = __ds_scope.MetaPill;

__ds_ns.ApplicationRow = __ds_scope.ApplicationRow;

__ds_ns.CandidateRow = __ds_scope.CandidateRow;

__ds_ns.Card = __ds_scope.Card;

__ds_ns.MatchIndicator = __ds_scope.MatchIndicator;

__ds_ns.PositionCard = __ds_scope.PositionCard;

__ds_ns.ProgressBar = __ds_scope.ProgressBar;

__ds_ns.StatCard = __ds_scope.StatCard;

__ds_ns.STAGES = __ds_scope.STAGES;

__ds_ns.StatusBadge = __ds_scope.StatusBadge;

__ds_ns.Tabs = __ds_scope.Tabs;

__ds_ns.Checkbox = __ds_scope.Checkbox;

__ds_ns.Input = __ds_scope.Input;

__ds_ns.Select = __ds_scope.Select;

__ds_ns.Switch = __ds_scope.Switch;

__ds_ns.Textarea = __ds_scope.Textarea;

})();
