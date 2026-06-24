/* @ds-bundle: {"format":3,"namespace":"BewerbungstoolDesignSystem_a75119","components":[{"name":"Avatar","sourcePath":"components/core/Avatar.jsx"},{"name":"Badge","sourcePath":"components/core/Badge.jsx"},{"name":"Button","sourcePath":"components/core/Button.jsx"},{"name":"Icon","sourcePath":"components/core/Icon.jsx"},{"name":"ICON_NAMES","sourcePath":"components/core/Icon.jsx"},{"name":"IconButton","sourcePath":"components/core/IconButton.jsx"},{"name":"MetaPill","sourcePath":"components/core/MetaPill.jsx"},{"name":"CandidateRow","sourcePath":"components/data/CandidateRow.jsx"},{"name":"Card","sourcePath":"components/data/Card.jsx"},{"name":"ProgressBar","sourcePath":"components/data/ProgressBar.jsx"},{"name":"StatCard","sourcePath":"components/data/StatCard.jsx"},{"name":"STAGES","sourcePath":"components/data/StatusBadge.jsx"},{"name":"StatusBadge","sourcePath":"components/data/StatusBadge.jsx"},{"name":"Tabs","sourcePath":"components/data/Tabs.jsx"},{"name":"Checkbox","sourcePath":"components/forms/Checkbox.jsx"},{"name":"Input","sourcePath":"components/forms/Input.jsx"},{"name":"Select","sourcePath":"components/forms/Select.jsx"},{"name":"Switch","sourcePath":"components/forms/Switch.jsx"},{"name":"Textarea","sourcePath":"components/forms/Textarea.jsx"}],"sourceHashes":{"components/core/Avatar.jsx":"be544725a790","components/core/Badge.jsx":"587e11e83ce2","components/core/Button.jsx":"c599138c513c","components/core/Icon.jsx":"e0a5eb759f8c","components/core/IconButton.jsx":"bddaf1dfefaa","components/core/MetaPill.jsx":"b99f31f6e87c","components/data/CandidateRow.jsx":"636370c8d577","components/data/Card.jsx":"d9336b6dae72","components/data/ProgressBar.jsx":"cb537e860275","components/data/StatCard.jsx":"3f5fee7e6433","components/data/StatusBadge.jsx":"a90276d82a1c","components/data/Tabs.jsx":"d7895fd812a5","components/forms/Checkbox.jsx":"3ff388154f50","components/forms/Input.jsx":"7bf1885f9285","components/forms/Select.jsx":"4e2274926081","components/forms/Switch.jsx":"798cb097d1f9","components/forms/Textarea.jsx":"a49a73a5a3fb","ui_kits/bewerber/app.jsx":"388a47ffb23d","ui_kits/bewerber/data.js":"91427a20b9be","ui_kits/recruiting/AppShell.jsx":"b02a5e503073","ui_kits/recruiting/CandidateDetail.jsx":"89b36d0aa79d","ui_kits/recruiting/PipelineBoard.jsx":"ced88b2c9dc9","ui_kits/recruiting/VermittlerViews.jsx":"e576ca88a864","ui_kits/recruiting/Views.jsx":"21261edd2eb9","ui_kits/recruiting/app.jsx":"1f13a0e0eb29","ui_kits/recruiting/data.js":"40e92a2972c5"},"inlinedExternals":[],"unexposedExports":[]} */

(() => {

const __ds_ns = (window.BewerbungstoolDesignSystem_a75119 = window.BewerbungstoolDesignSystem_a75119 || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// components/core/Avatar.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Candidate / user avatar. Circle by default (app chrome); pass a square
 * radius for document portraits. Renders an initials fallback behind the image
 * so a broken/empty src still reads as a person.
 */
function initialsFrom(name = '') {
  return name.trim().split(/\s+/).slice(0, 2).map(w => w[0] || '').join('').toUpperCase();
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
      background: 'linear-gradient(155deg, var(--ink-700) 0%, var(--ink-900) 100%)',
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
 * A small label chip. `outline`/`solid` for the light surfaces, `glass`/`light`
 * for the dark app shell. Mono type — used for skills, tags, counts.
 */
const BASE = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '5px',
  fontFamily: 'var(--font-mono)',
  fontWeight: 'var(--fw-medium)',
  lineHeight: 1.4,
  whiteSpace: 'nowrap',
  borderRadius: 'var(--radius-sm)',
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

// components/core/Icon.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Feather-style line icons — the single icon system for the Bewerbungstool.
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
function Icon({
  name,
  size = 16,
  strokeWidth = 1.8,
  style = {},
  ...rest
}) {
  const glyph = PATHS[name];
  return /*#__PURE__*/React.createElement("svg", _extends({
    viewBox: "0 0 24 24",
    width: size,
    height: size,
    fill: "none",
    stroke: "currentColor",
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
 * A rounded pill for a metadata value — a date, location, salary band, or
 * count — with an optional leading icon. Mono, tabular numerals.
 */
function MetaPill({
  children,
  icon = 'calendar',
  tone = 'default',
  style = {},
  ...rest
}) {
  const tones = {
    default: {
      background: 'var(--surface-sunk)',
      borderColor: 'var(--border)',
      color: 'var(--text-soft)'
    },
    accent: {
      background: 'var(--accent-soft)',
      borderColor: 'var(--accent-border)',
      color: 'var(--accent-strong)'
    }
  };
  return /*#__PURE__*/React.createElement("span", _extends({
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '6px',
      fontFamily: 'var(--font-mono)',
      fontSize: '12px',
      fontWeight: 'var(--fw-medium)',
      whiteSpace: 'nowrap',
      fontVariantNumeric: 'tabular-nums',
      padding: '3px 9px',
      borderRadius: 'var(--radius-pill)',
      border: '1px solid',
      ...tones[tone],
      ...style
    }
  }, rest), icon && /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: icon,
    size: 12
  }), children);
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
 * border. Use inside <Field> or pass `label` directly.
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

// ui_kits/bewerber/app.jsx
try { (() => {
/* __kit_guard__ */
(function () {
  var __s = document.currentScript;
  if (__s && /_ds_bundle\.js/.test(__s.src || '')) return;
  /* Bewerber app — applicant home (applications) + Bewerbungsmappe composer. */
  const B = window.BewerbungstoolDesignSystem_a75119;
  function Header({
    tab,
    setTab
  }) {
    return /*#__PURE__*/React.createElement("header", {
      style: {
        background: 'linear-gradient(165deg, var(--ink-850), var(--ink-900))',
        color: '#fff',
        padding: '22px 36px 0'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: '14px'
      }
    }, /*#__PURE__*/React.createElement("img", {
      src: "../../assets/logo/myjob-mark.svg",
      width: "34",
      height: "34",
      alt: ""
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: 'var(--font-display)',
        fontWeight: 700,
        fontSize: '18px',
        letterSpacing: '-0.02em'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        color: 'var(--accent-on-dark)'
      }
    }, "my"), "Job"), /*#__PURE__*/React.createElement(B.Badge, {
      variant: "glass",
      size: "sm"
    }, "f\xFCr Bewerber:innen"), /*#__PURE__*/React.createElement("div", {
      style: {
        marginLeft: 'auto',
        display: 'flex',
        alignItems: 'center',
        gap: '12px'
      }
    }, /*#__PURE__*/React.createElement(B.IconButton, {
      icon: "bell",
      label: "Benachrichtigungen",
      variant: "glass"
    }), /*#__PURE__*/React.createElement(B.Avatar, {
      name: window.ME.name,
      src: window.ME.src,
      size: "sm"
    }))), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: '17px',
        margin: '22px 0 18px'
      }
    }, /*#__PURE__*/React.createElement(B.Avatar, {
      name: window.ME.name,
      src: window.ME.src,
      size: 58,
      radius: "var(--radius-lg)"
    }), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: 'var(--font-display)',
        fontSize: '26px',
        fontWeight: 700,
        letterSpacing: '-0.025em'
      }
    }, window.ME.name), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: '13.5px',
        color: 'var(--sidebar-muted)',
        marginTop: '2px'
      }
    }, window.ME.role, " \xB7 ", window.ME.location))), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        gap: '4px'
      }
    }, [['mappe', 'Meine Bewerbungen'], ['neu', 'Neue Mappe erstellen']].map(([id, lbl]) => /*#__PURE__*/React.createElement("button", {
      key: id,
      onClick: () => setTab(id),
      style: {
        appearance: 'none',
        background: 'transparent',
        border: 'none',
        cursor: 'pointer',
        padding: '11px 16px',
        marginBottom: '-1px',
        fontFamily: 'var(--font-body)',
        fontSize: '14px',
        fontWeight: 600,
        color: tab === id ? '#fff' : 'var(--sidebar-soft)',
        borderBottom: `2px solid ${tab === id ? 'var(--accent-on-dark)' : 'transparent'}`
      }
    }, lbl))));
  }

  /* ---------- Applications list ---------- */
  function ApplicationsView() {
    const apps = window.APPLICATIONS;
    const active = apps.filter(a => a.status !== 'rejected' && a.status !== 'hired').length;
    return /*#__PURE__*/React.createElement("div", {
      style: {
        maxWidth: '880px',
        margin: '0 auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '18px'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '14px'
      }
    }, /*#__PURE__*/React.createElement(B.StatCard, {
      label: "Aktive Bewerbungen",
      value: String(active),
      icon: "send"
    }), /*#__PURE__*/React.createElement(B.StatCard, {
      label: "Im Gespr\xE4ch",
      value: String(apps.filter(a => a.status === 'interview').length),
      icon: "message"
    }), /*#__PURE__*/React.createElement(B.StatCard, {
      label: "Angebote",
      value: String(apps.filter(a => a.status === 'offer').length),
      delta: "+1",
      dir: "up",
      icon: "award"
    })), /*#__PURE__*/React.createElement(B.Card, {
      pad: false,
      title: "Verlauf",
      action: /*#__PURE__*/React.createElement(B.Button, {
        size: "sm",
        variant: "outline",
        iconLeft: /*#__PURE__*/React.createElement(B.Icon, {
          name: "download",
          size: 14
        })
      }, "Export")
    }, apps.map(a => /*#__PURE__*/React.createElement("div", {
      key: a.id,
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: '15px',
        padding: '15px 18px',
        borderBottom: '1px solid var(--border)'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: '42px',
        height: '42px',
        flexShrink: 0,
        borderRadius: 'var(--radius-md)',
        background: 'var(--surface-sunk)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--text-muted)'
      }
    }, /*#__PURE__*/React.createElement(B.Icon, {
      name: "building",
      size: 20
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        minWidth: 0
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: 'var(--font-display)',
        fontSize: '15px',
        fontWeight: 700,
        color: 'var(--text-heading)'
      }
    }, a.firma), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: '12.5px',
        color: 'var(--text-muted)',
        marginTop: '1px'
      }
    }, a.stelle, " \xB7 ", a.ort)), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
        gap: '6px'
      }
    }, /*#__PURE__*/React.createElement(B.StatusBadge, {
      status: a.status,
      size: "sm"
    }), /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: 'var(--font-mono)',
        fontSize: '11px',
        color: 'var(--text-soft)'
      }
    }, a.next))))));
  }

  /* ---------- Bewerbungsmappe composer ---------- */
  function ComposerView() {
    const [docs, setDocs] = React.useState(window.DOCS);
    const move = (i, dir) => {
      setDocs(d => {
        const n = [...d];
        const j = i + dir;
        if (j < 0 || j >= n.length) return n;
        [n[i], n[j]] = [n[j], n[i]];
        return n;
      });
    };
    const remove = id => setDocs(d => d.filter(x => x.id !== id));
    return /*#__PURE__*/React.createElement("div", {
      style: {
        maxWidth: '880px',
        margin: '0 auto',
        display: 'grid',
        gridTemplateColumns: '1.3fr 1fr',
        gap: '18px',
        alignItems: 'start'
      }
    }, /*#__PURE__*/React.createElement(B.Card, {
      title: "Empf\xE4nger",
      subtitle: "An wen geht die Mappe?"
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '13px'
      }
    }, /*#__PURE__*/React.createElement(B.Input, {
      label: "Firma",
      icon: "building",
      defaultValue: "Aurora Systems GmbH"
    }), /*#__PURE__*/React.createElement(B.Input, {
      label: "Stelle",
      icon: "briefcase",
      defaultValue: "Senior C++ Engineer"
    }), /*#__PURE__*/React.createElement(B.Input, {
      label: "Ansprechpartner:in",
      icon: "user",
      defaultValue: "Personalabteilung"
    }), /*#__PURE__*/React.createElement(B.Input, {
      label: "Referenz",
      defaultValue: "REF-2026-481"
    }), /*#__PURE__*/React.createElement(B.Input, {
      label: "Stra\xDFe & Nr.",
      icon: "pin",
      defaultValue: "Lichtstra\xDFe 12"
    }), /*#__PURE__*/React.createElement(B.Input, {
      label: "PLZ & Ort",
      defaultValue: "10115 Berlin"
    }))), /*#__PURE__*/React.createElement(B.Card, {
      title: "Dokumente",
      subtitle: "Reihenfolge der finalen PDF"
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: '8px'
      }
    }, docs.map((d, i) => /*#__PURE__*/React.createElement("div", {
      key: d.id,
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: '11px',
        padding: '10px 12px',
        border: `1px solid ${d.pinned ? 'var(--accent-border)' : 'var(--border)'}`,
        borderRadius: 'var(--radius-md)',
        background: d.pinned ? 'var(--accent-soft)' : 'var(--surface-card)'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: 'var(--font-mono)',
        fontSize: '11px',
        fontWeight: 600,
        color: '#fff',
        background: 'var(--ink-900)',
        width: '20px',
        height: '20px',
        borderRadius: '50%',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0
      }
    }, i + 1), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        minWidth: 0
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: '13px',
        fontWeight: 600,
        color: 'var(--text-heading)'
      }
    }, d.name, /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: 'var(--font-mono)',
        fontSize: '10px',
        color: 'var(--accent-strong)',
        marginLeft: '7px'
      }
    }, d.tag)), /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: 'var(--font-mono)',
        fontSize: '11px',
        color: 'var(--text-soft)'
      }
    }, d.sub)), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        gap: '3px'
      }
    }, /*#__PURE__*/React.createElement(B.IconButton, {
      icon: "chevronUp",
      label: "Hoch",
      variant: "ghost",
      size: "sm",
      onClick: () => move(i, -1),
      disabled: i === 0
    }), /*#__PURE__*/React.createElement(B.IconButton, {
      icon: "chevronDown",
      label: "Runter",
      variant: "ghost",
      size: "sm",
      onClick: () => move(i, 1),
      disabled: i === docs.length - 1
    }), /*#__PURE__*/React.createElement(B.IconButton, {
      icon: "trash",
      label: "Entfernen",
      variant: "ghost",
      size: "sm",
      onClick: () => remove(d.id),
      disabled: d.pinned
    }))))), /*#__PURE__*/React.createElement("div", {
      style: {
        marginTop: '12px',
        border: '2px dashed var(--border-strong)',
        borderRadius: 'var(--radius-md)',
        padding: '18px',
        textAlign: 'center'
      }
    }, /*#__PURE__*/React.createElement(B.Button, {
      variant: "ink",
      size: "sm",
      iconLeft: /*#__PURE__*/React.createElement(B.Icon, {
        name: "upload",
        size: 14
      })
    }, "PDF hinzuf\xFCgen"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: '12px',
        color: 'var(--text-soft)',
        marginTop: '8px'
      }
    }, "oder Dateien hierher ziehen")), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: '16px'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: 'var(--font-mono)',
        fontSize: '12px',
        color: 'var(--text-muted)'
      }
    }, docs.length, " Dokumente"), /*#__PURE__*/React.createElement(B.Button, {
      variant: "primary",
      iconRight: /*#__PURE__*/React.createElement(B.Icon, {
        name: "arrowRight",
        size: 15
      })
    }, "Mappe erstellen"))));
  }
  function BewerberApp() {
    const [tab, setTab] = React.useState('mappe');
    return /*#__PURE__*/React.createElement("div", {
      style: {
        minHeight: '100vh',
        background: 'var(--surface-app)'
      }
    }, /*#__PURE__*/React.createElement(Header, {
      tab: tab,
      setTab: setTab
    }), /*#__PURE__*/React.createElement("main", {
      style: {
        padding: '28px 36px 60px'
      }
    }, tab === 'mappe' ? /*#__PURE__*/React.createElement(ApplicationsView, null) : /*#__PURE__*/React.createElement(ComposerView, null)));
  }
  ReactDOM.createRoot(document.getElementById('root')).render(/*#__PURE__*/React.createElement(BewerberApp, null));
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/bewerber/app.jsx", error: String((e && e.message) || e) }); }

// ui_kits/bewerber/data.js
try { (() => {
/* __kit_guard__ */
(function () {
  var __s = document.currentScript;
  if (__s && /_ds_bundle\.js/.test(__s.src || '')) return;
  /* Bewerber-side sample data — the applicant's own applications (myJob für Bewerber). */
  const ME = {
    name: 'Suhay Sevinc',
    role: 'M.Sc. Software Engineer',
    src: '../../assets/img/candidate-portrait-sm.jpg',
    location: 'Berlin'
  };

  /* status reuses the pipeline keys so StatusBadge labels match */
  const APPLICATIONS = [{
    id: 'a1',
    firma: 'Aurora Systems GmbH',
    stelle: 'Senior C++ Engineer',
    ort: 'Berlin',
    date: '12.06.2026',
    status: 'interview',
    next: 'Tech-Interview · 24.06.',
    docs: 3
  }, {
    id: 'a2',
    firma: 'Nordlicht Software',
    stelle: 'Backend Engineer',
    ort: 'Hamburg',
    date: '09.06.2026',
    status: 'review',
    next: 'In Sichtung',
    docs: 3
  }, {
    id: 'a3',
    firma: 'Falk & Partner',
    stelle: 'Plattform-Engineer',
    ort: 'München',
    date: '05.06.2026',
    status: 'offer',
    next: 'Angebot erhalten',
    docs: 4
  }, {
    id: 'a4',
    firma: 'Meridian Labs',
    stelle: 'Distributed Systems Eng.',
    ort: 'Remote',
    date: '02.06.2026',
    status: 'new',
    next: 'Eingereicht',
    docs: 3
  }, {
    id: 'a5',
    firma: 'Hansa Digital',
    stelle: 'C++ Tech Lead',
    ort: 'Bremen',
    date: '28.05.2026',
    status: 'rejected',
    next: 'Leider abgesagt',
    docs: 3
  }];
  const DOCS = [{
    id: 'd1',
    name: 'Lebenslauf',
    tag: 'CV',
    sub: 'Aktualisiert · 1 Seite',
    pinned: true
  }, {
    id: 'd2',
    name: 'Anschreiben',
    tag: 'Letter',
    sub: 'Pro Stelle angepasst',
    pinned: true
  }, {
    id: 'd3',
    name: 'Arbeitszeugnis — Aurora',
    tag: 'PDF',
    sub: '2 Seiten'
  }, {
    id: 'd4',
    name: 'M.Sc. Zeugnis',
    tag: 'PDF',
    sub: '1 Seite'
  }, {
    id: 'd5',
    name: 'Zertifikat — Kubernetes',
    tag: 'PDF',
    sub: '1 Seite'
  }];
  Object.assign(window, {
    ME,
    APPLICATIONS,
    DOCS
  });
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/bewerber/data.js", error: String((e && e.message) || e) }); }

// ui_kits/recruiting/AppShell.jsx
try { (() => {
/* __kit_guard__ */
(function () {
  var __s = document.currentScript;
  if (__s && /_ds_bundle\.js/.test(__s.src || '')) return;
  /* AppShell — the dark navigation rail + sticky topbar that wraps every screen. */
  const {
    Icon,
    IconButton,
    Avatar,
    Badge
  } = window.BewerbungstoolDesignSystem_a75119;
  const HR_NAV = [{
    id: 'pipeline',
    label: 'Pipeline',
    icon: 'columns'
  }, {
    id: 'stellen',
    label: 'Stellen',
    icon: 'briefcase'
  }, {
    id: 'talente',
    label: 'Talente',
    icon: 'users'
  }, {
    id: 'berichte',
    label: 'Berichte',
    icon: 'trend'
  }, {
    id: 'postfach',
    label: 'Postfach',
    icon: 'inbox'
  }];
  function NavItem({
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
        padding: '9px 11px',
        borderRadius: 'var(--radius-md)',
        border: 'none',
        cursor: 'pointer',
        fontFamily: 'var(--font-body)',
        fontSize: '13.5px',
        fontWeight: active ? 600 : 500,
        color: active ? '#fff' : 'var(--sidebar-muted)',
        background: active ? 'var(--sidebar-glass-strong)' : hover ? 'var(--sidebar-glass)' : 'transparent',
        textAlign: 'left',
        transition: 'background var(--dur-fast), color var(--dur-fast)'
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      name: item.icon,
      size: 17,
      style: {
        color: active ? 'var(--accent-on-dark)' : 'currentColor'
      }
    }), item.label);
  }
  function AppShell({
    active,
    onNav,
    navItems = HR_NAV,
    role,
    onRole,
    search,
    onSearch,
    title,
    subtitle,
    actions,
    children
  }) {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        height: '100vh',
        overflow: 'hidden',
        background: 'var(--surface-app)'
      }
    }, /*#__PURE__*/React.createElement("aside", {
      style: {
        width: 'var(--app-nav-width)',
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        background: 'linear-gradient(165deg, var(--ink-850) 0%, var(--ink-900) 100%)',
        borderRight: '1px solid var(--sidebar-border)'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        padding: '20px 18px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: '11px'
      }
    }, /*#__PURE__*/React.createElement("img", {
      src: "../../assets/logo/myjob-mark.svg",
      width: "34",
      height: "34",
      alt: ""
    }), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: 'var(--font-display)',
        fontWeight: 700,
        fontSize: '18px',
        color: '#fff',
        letterSpacing: '-0.02em',
        lineHeight: 1
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        color: 'var(--accent-on-dark)'
      }
    }, "my"), "Job"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: 'var(--font-mono)',
        fontSize: '9px',
        letterSpacing: '0.14em',
        textTransform: 'uppercase',
        color: 'var(--sidebar-soft)',
        marginTop: '3px'
      }
    }, "Bewerbungstool"))), /*#__PURE__*/React.createElement("nav", {
      style: {
        padding: '8px 12px',
        display: 'flex',
        flexDirection: 'column',
        gap: '3px',
        flex: 1
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: 'var(--font-mono)',
        fontSize: '9px',
        letterSpacing: '0.14em',
        textTransform: 'uppercase',
        color: 'var(--sidebar-soft)',
        padding: '8px 11px 6px'
      }
    }, role === 'hr' ? 'Arbeitsbereich' : 'Agentur'), navItems.map(n => /*#__PURE__*/React.createElement(NavItem, {
      key: n.id,
      item: n,
      active: active === n.id,
      onClick: () => onNav(n.id)
    }))), /*#__PURE__*/React.createElement("div", {
      style: {
        padding: '14px 14px 10px',
        borderTop: '1px solid var(--sidebar-border)'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: 'var(--font-mono)',
        fontSize: '9px',
        letterSpacing: '0.14em',
        textTransform: 'uppercase',
        color: 'var(--sidebar-soft)',
        marginBottom: '8px'
      }
    }, "Ansicht"), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        background: 'var(--sidebar-glass)',
        borderRadius: 'var(--radius-md)',
        padding: '3px',
        border: '1px solid var(--sidebar-border)'
      }
    }, [['hr', 'HR'], ['vermittler', 'Vermittler']].map(([id, lbl]) => /*#__PURE__*/React.createElement("button", {
      key: id,
      onClick: () => onRole(id),
      style: {
        flex: 1,
        padding: '6px 8px',
        border: 'none',
        cursor: 'pointer',
        borderRadius: 'var(--radius-sm)',
        fontFamily: 'var(--font-mono)',
        fontSize: '11px',
        fontWeight: 600,
        background: role === id ? 'var(--accent)' : 'transparent',
        color: role === id ? '#fff' : 'var(--sidebar-muted)',
        transition: 'background var(--dur-fast)'
      }
    }, lbl)))), /*#__PURE__*/React.createElement("div", {
      style: {
        padding: '10px 14px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: '10px'
      }
    }, /*#__PURE__*/React.createElement(Avatar, {
      name: role === 'hr' ? 'Petra Voss' : 'Karl Mertens',
      size: "sm"
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        minWidth: 0
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: '12.5px',
        fontWeight: 600,
        color: '#fff',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis'
      }
    }, role === 'hr' ? 'Petra Voss' : 'Karl Mertens'), /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: 'var(--font-mono)',
        fontSize: '10px',
        color: 'var(--sidebar-soft)'
      }
    }, role === 'hr' ? 'Recruiting · Acme' : 'Vermittler · TalentBridge')), /*#__PURE__*/React.createElement(Icon, {
      name: "logout",
      size: 15,
      style: {
        color: 'var(--sidebar-soft)'
      }
    }))), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        minWidth: 0
      }
    }, /*#__PURE__*/React.createElement("header", {
      style: {
        height: 'var(--app-topbar-h)',
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        padding: '0 28px',
        background: 'color-mix(in oklch, var(--paper) 88%, transparent)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        borderBottom: '1px solid var(--border)',
        position: 'sticky',
        top: 0,
        zIndex: 5
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        minWidth: 0
      }
    }, /*#__PURE__*/React.createElement("h1", {
      style: {
        fontFamily: 'var(--font-display)',
        fontSize: '18px',
        fontWeight: 700,
        color: 'var(--text-heading)',
        margin: 0,
        letterSpacing: '-0.015em'
      }
    }, title), subtitle && /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: '11.5px',
        color: 'var(--text-soft)',
        marginTop: '1px'
      }
    }, subtitle)), /*#__PURE__*/React.createElement("div", {
      style: {
        marginLeft: 'auto',
        display: 'flex',
        alignItems: 'center',
        gap: '10px'
      }
    }, /*#__PURE__*/React.createElement("label", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        background: 'var(--surface-card)',
        border: '1px solid var(--border-strong)',
        borderRadius: 'var(--radius-md)',
        padding: '0 11px',
        width: '220px'
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "search",
      size: 15,
      style: {
        color: 'var(--text-soft)'
      }
    }), /*#__PURE__*/React.createElement("input", {
      value: search,
      onChange: e => onSearch(e.target.value),
      placeholder: "Suchen \u2026",
      style: {
        flex: 1,
        minWidth: 0,
        border: 'none',
        outline: 'none',
        background: 'transparent',
        fontFamily: 'var(--font-body)',
        fontSize: '13px',
        color: 'var(--text-heading)',
        padding: '8px 0'
      }
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        position: 'relative'
      }
    }, /*#__PURE__*/React.createElement(IconButton, {
      icon: "bell",
      label: "Benachrichtigungen",
      variant: "outline"
    }), /*#__PURE__*/React.createElement("span", {
      style: {
        position: 'absolute',
        top: '-3px',
        right: '-3px',
        width: '8px',
        height: '8px',
        borderRadius: '50%',
        background: 'var(--signal-500)',
        border: '2px solid var(--paper)'
      }
    })), actions)), /*#__PURE__*/React.createElement("main", {
      style: {
        flex: 1,
        overflowY: 'auto',
        padding: 'var(--pad-app)'
      }
    }, children)));
  }
  Object.assign(window, {
    AppShell,
    HR_NAV
  });
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/recruiting/AppShell.jsx", error: String((e && e.message) || e) }); }

// ui_kits/recruiting/CandidateDetail.jsx
try { (() => {
/* __kit_guard__ */
(function () {
  var __s = document.currentScript;
  if (__s && /_ds_bundle\.js/.test(__s.src || '')) return;
  /* CandidateDetail — slide-in panel with full candidate profile + stage actions. */
  const D = window.BewerbungstoolDesignSystem_a75119;
  function Field({
    icon,
    label,
    value
  }) {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: '10px'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        width: '30px',
        height: '30px',
        flexShrink: 0,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 'var(--radius-md)',
        background: 'var(--surface-sunk)',
        color: 'var(--text-soft)'
      }
    }, /*#__PURE__*/React.createElement(D.Icon, {
      name: icon,
      size: 15
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        minWidth: 0
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: 'var(--font-mono)',
        fontSize: '9.5px',
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
        color: 'var(--text-soft)'
      }
    }, label), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: '13px',
        color: 'var(--text-heading)',
        fontWeight: 500,
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis'
      }
    }, value)));
  }
  function SectionLabel({
    icon,
    children
  }) {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        fontFamily: 'var(--font-mono)',
        fontSize: '10px',
        fontWeight: 600,
        letterSpacing: '0.14em',
        textTransform: 'uppercase',
        color: 'var(--text-soft)',
        margin: '22px 0 12px'
      }
    }, /*#__PURE__*/React.createElement(D.Icon, {
      name: icon,
      size: 13
    }), children);
  }
  function CandidateDetail({
    c,
    onClose,
    onAdvance,
    onReject
  }) {
    if (!c) return null;
    const stageOrder = window.STAGES_ORDER;
    const idx = stageOrder.indexOf(c.status);
    const nextStage = idx >= 0 && idx < stageOrder.length - 1 ? D.STAGES[stageOrder[idx + 1]] : null;
    return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
      onClick: onClose,
      style: {
        position: 'fixed',
        inset: 0,
        background: 'rgba(8,11,18,0.42)',
        backdropFilter: 'blur(2px)',
        zIndex: 40,
        animation: 'fadeIn .2s ease'
      }
    }), /*#__PURE__*/React.createElement("aside", {
      style: {
        position: 'fixed',
        top: 0,
        right: 0,
        bottom: 0,
        width: 'min(480px, 92vw)',
        zIndex: 41,
        background: 'var(--surface-card)',
        boxShadow: 'var(--shadow-lg)',
        display: 'flex',
        flexDirection: 'column',
        animation: 'slideIn .26s cubic-bezier(0.16,1,0.3,1)'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        padding: '20px 22px',
        borderBottom: '1px solid var(--border)',
        background: 'linear-gradient(165deg, var(--ink-850), var(--ink-900))',
        color: '#fff'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        justifyContent: 'flex-end',
        marginBottom: '6px'
      }
    }, /*#__PURE__*/React.createElement(D.IconButton, {
      icon: "x",
      label: "Schlie\xDFen",
      variant: "glass",
      size: "sm",
      onClick: onClose
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        gap: '15px',
        alignItems: 'center'
      }
    }, /*#__PURE__*/React.createElement(D.Avatar, {
      name: c.name,
      src: c.src,
      size: 64,
      radius: "var(--radius-lg)"
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        minWidth: 0
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: 'var(--font-display)',
        fontSize: '22px',
        fontWeight: 700,
        letterSpacing: '-0.02em'
      }
    }, c.name), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: '13px',
        color: 'var(--sidebar-muted)',
        marginTop: '2px'
      }
    }, c.role), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        gap: '8px',
        marginTop: '10px',
        alignItems: 'center'
      }
    }, /*#__PURE__*/React.createElement(D.StatusBadge, {
      status: c.status
    }), /*#__PURE__*/React.createElement(D.Badge, {
      variant: "glass",
      size: "sm",
      icon: /*#__PURE__*/React.createElement(D.Icon, {
        name: "trend",
        size: 11
      })
    }, c.score, "% Match"))))), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        overflowY: 'auto',
        padding: '20px 22px'
      }
    }, /*#__PURE__*/React.createElement("p", {
      style: {
        fontSize: '13.5px',
        lineHeight: 1.6,
        color: 'var(--text-body)',
        margin: 0
      }
    }, c.summary), /*#__PURE__*/React.createElement(SectionLabel, {
      icon: "id"
    }, "Kontakt & Eckdaten"), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '14px'
      }
    }, /*#__PURE__*/React.createElement(Field, {
      icon: "mail",
      label: "E-Mail",
      value: c.email
    }), /*#__PURE__*/React.createElement(Field, {
      icon: "phone",
      label: "Telefon",
      value: c.phone
    }), /*#__PURE__*/React.createElement(Field, {
      icon: "pin",
      label: "Standort",
      value: c.location
    }), /*#__PURE__*/React.createElement(Field, {
      icon: "briefcase",
      label: "Beworben auf",
      value: c.position
    }), /*#__PURE__*/React.createElement(Field, {
      icon: "trend",
      label: "Gehaltswunsch",
      value: c.salary
    }), /*#__PURE__*/React.createElement(Field, {
      icon: "clock",
      label: "K\xFCndigungsfrist",
      value: c.notice
    })), /*#__PURE__*/React.createElement(SectionLabel, {
      icon: "zap"
    }, "Skills"), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexWrap: 'wrap',
        gap: '6px'
      }
    }, c.skills.map((s, i) => /*#__PURE__*/React.createElement(D.Badge, {
      key: i,
      variant: i === 0 ? 'soft' : 'outline',
      size: "sm"
    }, s))), /*#__PURE__*/React.createElement(SectionLabel, {
      icon: "fileText"
    }, "Dokumente"), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: '8px'
      }
    }, ['Lebenslauf.pdf', 'Anschreiben.pdf', 'Zeugnisse.pdf'].map((f, i) => /*#__PURE__*/React.createElement("div", {
      key: i,
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: '11px',
        padding: '10px 13px',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-md)',
        background: 'var(--surface-subtle)'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        width: '30px',
        height: '30px',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 'var(--radius-sm)',
        background: 'var(--accent-soft)',
        color: 'var(--accent-strong)'
      }
    }, /*#__PURE__*/React.createElement(D.Icon, {
      name: "fileText",
      size: 15
    })), /*#__PURE__*/React.createElement("span", {
      style: {
        flex: 1,
        fontSize: '13px',
        fontWeight: 500,
        color: 'var(--text-heading)'
      }
    }, f), /*#__PURE__*/React.createElement(D.IconButton, {
      icon: "download",
      label: "Herunterladen",
      variant: "ghost",
      size: "sm"
    })))), c.timeline && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(SectionLabel, {
      icon: "clock"
    }, "Verlauf"), /*#__PURE__*/React.createElement("div", {
      style: {
        position: 'relative',
        paddingLeft: '20px'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        position: 'absolute',
        left: '5px',
        top: '6px',
        bottom: '6px',
        width: '1.5px',
        background: 'var(--border-strong)'
      }
    }), c.timeline.map((e, i) => /*#__PURE__*/React.createElement("div", {
      key: i,
      style: {
        position: 'relative',
        marginBottom: '14px'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        position: 'absolute',
        left: '-19px',
        top: '3px',
        width: '10px',
        height: '10px',
        borderRadius: '50%',
        background: i === c.timeline.length - 1 ? 'var(--accent)' : '#fff',
        border: `2px solid ${i === c.timeline.length - 1 ? 'var(--accent)' : 'var(--border-strong)'}`
      }
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: '13px',
        fontWeight: 600,
        color: 'var(--text-heading)'
      }
    }, e.t), /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: 'var(--font-mono)',
        fontSize: '11px',
        color: 'var(--text-soft)',
        marginTop: '1px'
      }
    }, e.d, " \xB7 ", e.who)))))), /*#__PURE__*/React.createElement("div", {
      style: {
        padding: '14px 22px',
        borderTop: '1px solid var(--border)',
        display: 'flex',
        gap: '10px',
        background: 'var(--surface-subtle)'
      }
    }, /*#__PURE__*/React.createElement(D.Button, {
      variant: "outline",
      iconLeft: /*#__PURE__*/React.createElement(D.Icon, {
        name: "x",
        size: 15
      }),
      onClick: () => onReject(c.id)
    }, "Absagen"), nextStage ? /*#__PURE__*/React.createElement(D.Button, {
      variant: "primary",
      block: true,
      iconRight: /*#__PURE__*/React.createElement(D.Icon, {
        name: "arrowRight",
        size: 15
      }),
      onClick: () => onAdvance(c.id)
    }, "Weiter zu ", nextStage.label) : /*#__PURE__*/React.createElement(D.Button, {
      variant: "primary",
      block: true,
      iconLeft: /*#__PURE__*/React.createElement(D.Icon, {
        name: "check",
        size: 15
      }),
      disabled: true
    }, "Eingestellt"))));
  }
  Object.assign(window, {
    CandidateDetail
  });
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/recruiting/CandidateDetail.jsx", error: String((e && e.message) || e) }); }

// ui_kits/recruiting/PipelineBoard.jsx
try { (() => {
/* __kit_guard__ */
(function () {
  var __s = document.currentScript;
  if (__s && /_ds_bundle\.js/.test(__s.src || '')) return;
  /* PipelineBoard — Kanban columns by pipeline stage. */
  const {
    Icon: PIcon,
    Avatar: PAvatar,
    Badge: PBadge,
    STAGES
  } = window.BewerbungstoolDesignSystem_a75119;
  function KanbanCard({
    c,
    onOpen
  }) {
    const [hover, setHover] = React.useState(false);
    return /*#__PURE__*/React.createElement("div", {
      onClick: () => onOpen(c.id),
      onMouseEnter: () => setHover(true),
      onMouseLeave: () => setHover(false),
      style: {
        background: 'var(--surface-card)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-md)',
        padding: '12px 13px',
        cursor: 'pointer',
        boxShadow: hover ? 'var(--shadow-md)' : 'var(--shadow-xs)',
        transform: hover ? 'translateY(-2px)' : 'none',
        transition: 'box-shadow var(--dur-fast), transform var(--dur-fast)'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        marginBottom: '10px'
      }
    }, /*#__PURE__*/React.createElement(PAvatar, {
      name: c.name,
      src: c.src,
      size: "sm"
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        minWidth: 0,
        flex: 1
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: 'var(--font-display)',
        fontSize: '13px',
        fontWeight: 700,
        color: 'var(--text-heading)',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis'
      }
    }, c.name), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: '11.5px',
        color: 'var(--text-soft)',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis'
      }
    }, c.role))), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: '7px',
        fontFamily: 'var(--font-mono)',
        fontSize: '11px',
        color: 'var(--text-muted)',
        marginBottom: '10px'
      }
    }, /*#__PURE__*/React.createElement(PIcon, {
      name: "briefcase",
      size: 12,
      style: {
        color: 'var(--text-soft)'
      }
    }), /*#__PURE__*/React.createElement("span", {
      style: {
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis'
      }
    }, c.position)), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }
    }, /*#__PURE__*/React.createElement(PBadge, {
      variant: "subtle",
      size: "sm",
      icon: /*#__PURE__*/React.createElement(PIcon, {
        name: "tag",
        size: 10
      })
    }, c.source), /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: 'var(--font-mono)',
        fontSize: '12px',
        fontWeight: 600,
        color: c.score >= 80 ? 'var(--success)' : 'var(--text-muted)',
        fontVariantNumeric: 'tabular-nums'
      }
    }, c.score, "%")));
  }
  function PipelineBoard({
    candidates,
    onOpen
  }) {
    const order = window.STAGES_ORDER;
    return /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'grid',
        gridTemplateColumns: `repeat(${order.length}, minmax(220px, 1fr))`,
        gap: '14px',
        alignItems: 'start',
        height: '100%'
      }
    }, order.map(stage => {
      const list = candidates.filter(c => c.status === stage);
      const meta = STAGES[stage];
      return /*#__PURE__*/React.createElement("div", {
        key: stage,
        style: {
          display: 'flex',
          flexDirection: 'column',
          gap: '11px',
          minWidth: 0
        }
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '4px 2px'
        }
      }, /*#__PURE__*/React.createElement("span", {
        style: {
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          background: meta.color
        }
      }), /*#__PURE__*/React.createElement("span", {
        style: {
          fontFamily: 'var(--font-mono)',
          fontSize: '11px',
          fontWeight: 600,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: 'var(--text-muted)'
        }
      }, meta.label), /*#__PURE__*/React.createElement("span", {
        style: {
          fontFamily: 'var(--font-mono)',
          fontSize: '11px',
          fontWeight: 600,
          color: 'var(--text-soft)',
          background: 'var(--surface-sunk)',
          borderRadius: 'var(--radius-pill)',
          padding: '1px 8px',
          marginLeft: 'auto'
        }
      }, list.length)), /*#__PURE__*/React.createElement("div", {
        style: {
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          background: 'var(--surface-app)',
          borderRadius: 'var(--radius-md)'
        }
      }, list.map(c => /*#__PURE__*/React.createElement(KanbanCard, {
        key: c.id,
        c: c,
        onOpen: onOpen
      })), list.length === 0 && /*#__PURE__*/React.createElement("div", {
        style: {
          border: '1.5px dashed var(--border-strong)',
          borderRadius: 'var(--radius-md)',
          padding: '18px',
          textAlign: 'center',
          fontFamily: 'var(--font-mono)',
          fontSize: '11px',
          color: 'var(--text-soft)'
        }
      }, "leer")));
    }));
  }
  Object.assign(window, {
    PipelineBoard
  });
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/recruiting/PipelineBoard.jsx", error: String((e && e.message) || e) }); }

// ui_kits/recruiting/VermittlerViews.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/* __kit_guard__ */
(function () {
  var __s = document.currentScript;
  if (__s && /_ds_bundle\.js/.test(__s.src || '')) return;
  /* VermittlerViews — the agency workflow: Mandate, Talent-Pool, Platzierungen, Berichte. */
  const W = window.BewerbungstoolDesignSystem_a75119;
  const PRIORITY = {
    hoch: {
      label: 'Hoch',
      bg: 'var(--status-rejected-soft)',
      bd: 'var(--status-rejected-border)',
      fg: 'var(--status-rejected-strong)',
      dot: 'var(--status-rejected)'
    },
    mittel: {
      label: 'Mittel',
      bg: 'var(--status-review-soft)',
      bd: 'var(--status-review-border)',
      fg: 'var(--status-review-strong)',
      dot: 'var(--status-review)'
    },
    niedrig: {
      label: 'Niedrig',
      bg: 'var(--surface-sunk)',
      bd: 'var(--border)',
      fg: 'var(--text-soft)',
      dot: 'var(--neutral-400)'
    }
  };
  function Pill({
    p
  }) {
    return /*#__PURE__*/React.createElement("span", {
      style: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: '5px',
        fontFamily: 'var(--font-mono)',
        fontSize: '10.5px',
        fontWeight: 600,
        padding: '2px 8px',
        borderRadius: 'var(--radius-pill)',
        background: p.bg,
        color: p.fg,
        border: `1px solid ${p.bd}`
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        width: '6px',
        height: '6px',
        borderRadius: '50%',
        background: p.dot
      }
    }), p.label);
  }
  const PLACEMENT_STATUS = {
    'Bezahlt': {
      tone: 'hired'
    },
    'In Rechnung': {
      tone: 'offer'
    },
    'Probezeit': {
      tone: 'interview'
    }
  };

  /* ---------- Mandate: client mandates grouped by Kunde ---------- */
  function MandateView({
    clients,
    mandates,
    onOpen
  }) {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: '16px'
      }
    }, clients.map(k => {
      const ms = mandates.filter(m => m.clientId === k.id);
      if (ms.length === 0) return null;
      return /*#__PURE__*/React.createElement(W.Card, {
        key: k.id,
        pad: false
      }, /*#__PURE__*/React.createElement("header", {
        style: {
          display: 'flex',
          alignItems: 'center',
          gap: '13px',
          padding: '15px 18px',
          borderBottom: '1px solid var(--border)'
        }
      }, /*#__PURE__*/React.createElement("span", {
        style: {
          width: '40px',
          height: '40px',
          borderRadius: 'var(--radius-md)',
          background: 'var(--ink-900)',
          color: '#fff',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center'
        }
      }, /*#__PURE__*/React.createElement(W.Icon, {
        name: "building",
        size: 19
      })), /*#__PURE__*/React.createElement("div", {
        style: {
          flex: 1
        }
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          fontFamily: 'var(--font-display)',
          fontSize: '16px',
          fontWeight: 700,
          color: 'var(--text-heading)',
          letterSpacing: '-0.01em'
        }
      }, k.name), /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: '12px',
          color: 'var(--text-soft)',
          marginTop: '1px'
        }
      }, k.industry, " \xB7 ", k.location, " \xB7 Kunde seit ", k.since)), /*#__PURE__*/React.createElement(W.Badge, {
        variant: "subtle",
        size: "sm"
      }, ms.length, " Mandate")), ms.map(m => /*#__PURE__*/React.createElement("div", {
        key: m.id,
        onClick: () => onOpen && onOpen(m),
        style: {
          display: 'grid',
          gridTemplateColumns: 'minmax(0,1.5fr) 96px 100px 120px 120px',
          alignItems: 'center',
          gap: '14px',
          padding: '13px 18px',
          borderBottom: '1px solid var(--border)',
          cursor: onOpen ? 'pointer' : 'default'
        }
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          minWidth: 0
        }
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: '14px',
          fontWeight: 600,
          color: 'var(--text-heading)'
        }
      }, m.role), /*#__PURE__*/React.createElement("div", {
        style: {
          display: 'flex',
          alignItems: 'center',
          gap: '5px',
          fontFamily: 'var(--font-mono)',
          fontSize: '11px',
          color: 'var(--text-soft)',
          marginTop: '2px'
        }
      }, /*#__PURE__*/React.createElement(W.Icon, {
        name: "pin",
        size: 11
      }), m.location)), /*#__PURE__*/React.createElement(Pill, {
        p: PRIORITY[m.priority]
      }), /*#__PURE__*/React.createElement("div", {
        style: {
          display: 'flex',
          flexDirection: 'column'
        }
      }, /*#__PURE__*/React.createElement("span", {
        style: {
          fontFamily: 'var(--font-mono)',
          fontSize: '14px',
          fontWeight: 600,
          color: 'var(--accent-strong)',
          fontVariantNumeric: 'tabular-nums'
        }
      }, m.fee), /*#__PURE__*/React.createElement("span", {
        style: {
          fontFamily: 'var(--font-mono)',
          fontSize: '10.5px',
          color: 'var(--text-soft)'
        }
      }, m.feeValue)), /*#__PURE__*/React.createElement("div", {
        style: {
          fontFamily: 'var(--font-mono)',
          fontSize: '12px',
          color: 'var(--text-muted)'
        }
      }, /*#__PURE__*/React.createElement(W.Icon, {
        name: "users",
        size: 12,
        style: {
          display: 'inline',
          verticalAlign: '-2px',
          marginRight: '4px'
        }
      }), m.submitted, " \xB7 ", m.interviews, " Int."), /*#__PURE__*/React.createElement("div", {
        style: {
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          justifyContent: 'flex-end'
        }
      }, /*#__PURE__*/React.createElement("span", {
        style: {
          fontFamily: 'var(--font-mono)',
          fontSize: '11px',
          color: m.status === 'aktiv' ? 'var(--success)' : 'var(--text-soft)',
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.06em'
        }
      }, m.status), /*#__PURE__*/React.createElement(W.Icon, {
        name: "chevronRight",
        size: 15,
        style: {
          color: 'var(--text-soft)'
        }
      })))));
    }));
  }

  /* ---------- Talent-Pool: the agency roster ---------- */
  function PoolView({
    pool,
    candidates,
    onOpen
  }) {
    const byId = Object.fromEntries(candidates.map(c => [c.id, c]));
    return /*#__PURE__*/React.createElement(W.Card, {
      pad: false,
      title: "Talent-Pool",
      subtitle: "Kandidat:innen der Agentur und ihre Verf\xFCgbarkeit"
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'grid',
        gridTemplateColumns: 'minmax(0,1.5fr) 110px minmax(0,1.3fr) 70px 90px',
        gap: '14px',
        padding: '11px 18px',
        fontFamily: 'var(--font-mono)',
        fontSize: '9.5px',
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
        color: 'var(--text-soft)',
        borderBottom: '1px solid var(--border)',
        background: 'var(--surface-subtle)'
      }
    }, /*#__PURE__*/React.createElement("span", null, "Talent"), /*#__PURE__*/React.createElement("span", null, "Verf\xFCgbar"), /*#__PURE__*/React.createElement("span", null, "Vorgeschlagen bei"), /*#__PURE__*/React.createElement("span", null, "Match"), /*#__PURE__*/React.createElement("span", {
      style: {
        textAlign: 'right'
      }
    }, "Phase")), pool.map(p => {
      const c = byId[p.id];
      if (!c) return null;
      return /*#__PURE__*/React.createElement("div", {
        key: p.id,
        onClick: () => onOpen(c.id),
        style: {
          display: 'grid',
          gridTemplateColumns: 'minmax(0,1.5fr) 110px minmax(0,1.3fr) 70px 90px',
          gap: '14px',
          alignItems: 'center',
          padding: '11px 18px',
          borderBottom: '1px solid var(--border)',
          cursor: 'pointer'
        }
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          display: 'flex',
          alignItems: 'center',
          gap: '11px',
          minWidth: 0
        }
      }, /*#__PURE__*/React.createElement(W.Avatar, {
        name: c.name,
        src: c.src,
        size: "md"
      }), /*#__PURE__*/React.createElement("div", {
        style: {
          minWidth: 0
        }
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          fontFamily: 'var(--font-display)',
          fontSize: '13.5px',
          fontWeight: 700,
          color: 'var(--text-heading)',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis'
        }
      }, c.name), /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: '12px',
          color: 'var(--text-soft)',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis'
        }
      }, c.role))), /*#__PURE__*/React.createElement("span", {
        style: {
          fontFamily: 'var(--font-mono)',
          fontSize: '11.5px',
          fontWeight: 600,
          color: p.availability === 'sofort' ? 'var(--success)' : 'var(--text-muted)'
        }
      }, p.availability), /*#__PURE__*/React.createElement("div", {
        style: {
          display: 'flex',
          gap: '5px',
          flexWrap: 'wrap'
        }
      }, p.submittedTo.map((s, i) => /*#__PURE__*/React.createElement(W.Badge, {
        key: i,
        variant: "subtle",
        size: "sm"
      }, s))), /*#__PURE__*/React.createElement("span", {
        style: {
          fontFamily: 'var(--font-mono)',
          fontSize: '13px',
          fontWeight: 600,
          color: c.score >= 80 ? 'var(--success)' : 'var(--text-muted)',
          fontVariantNumeric: 'tabular-nums'
        }
      }, c.score, "%"), /*#__PURE__*/React.createElement("div", {
        style: {
          display: 'flex',
          justifyContent: 'flex-end'
        }
      }, /*#__PURE__*/React.createElement(W.StatusBadge, {
        status: c.status,
        size: "sm"
      })));
    }));
  }

  /* ---------- Platzierungen: booked placements + fees ---------- */
  function PlatzierungenView({
    placements,
    candidates,
    kpis
  }) {
    const byId = Object.fromEntries(candidates.map(c => [c.id, c]));
    return /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: '18px'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '14px'
      }
    }, kpis.map((k, i) => /*#__PURE__*/React.createElement(W.StatCard, _extends({
      key: i
    }, k)))), /*#__PURE__*/React.createElement(W.Card, {
      pad: false,
      title: "Platzierungen",
      subtitle: "Erfolgreiche Vermittlungen und Provision"
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'grid',
        gridTemplateColumns: 'minmax(0,1.4fr) minmax(0,1.2fr) 110px 110px 110px',
        gap: '14px',
        padding: '11px 18px',
        fontFamily: 'var(--font-mono)',
        fontSize: '9.5px',
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
        color: 'var(--text-soft)',
        borderBottom: '1px solid var(--border)',
        background: 'var(--surface-subtle)'
      }
    }, /*#__PURE__*/React.createElement("span", null, "Talent"), /*#__PURE__*/React.createElement("span", null, "Kunde \xB7 Rolle"), /*#__PURE__*/React.createElement("span", null, "Start"), /*#__PURE__*/React.createElement("span", null, "Provision"), /*#__PURE__*/React.createElement("span", {
      style: {
        textAlign: 'right'
      }
    }, "Status")), placements.map(p => {
      const c = byId[p.candId];
      return /*#__PURE__*/React.createElement("div", {
        key: p.id,
        style: {
          display: 'grid',
          gridTemplateColumns: 'minmax(0,1.4fr) minmax(0,1.2fr) 110px 110px 110px',
          gap: '14px',
          alignItems: 'center',
          padding: '13px 18px',
          borderBottom: '1px solid var(--border)'
        }
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          display: 'flex',
          alignItems: 'center',
          gap: '11px',
          minWidth: 0
        }
      }, /*#__PURE__*/React.createElement(W.Avatar, {
        name: c ? c.name : '?',
        src: c && c.src,
        size: "sm"
      }), /*#__PURE__*/React.createElement("span", {
        style: {
          fontFamily: 'var(--font-display)',
          fontSize: '13.5px',
          fontWeight: 700,
          color: 'var(--text-heading)'
        }
      }, c ? c.name : '—')), /*#__PURE__*/React.createElement("div", {
        style: {
          minWidth: 0
        }
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: '13px',
          fontWeight: 600,
          color: 'var(--text-heading)',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis'
        }
      }, p.client), /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: '11.5px',
          color: 'var(--text-soft)'
        }
      }, p.role)), /*#__PURE__*/React.createElement("span", {
        style: {
          fontFamily: 'var(--font-mono)',
          fontSize: '12px',
          color: 'var(--text-muted)'
        }
      }, p.start), /*#__PURE__*/React.createElement("span", {
        style: {
          fontFamily: 'var(--font-mono)',
          fontSize: '14px',
          fontWeight: 600,
          color: 'var(--accent-strong)',
          fontVariantNumeric: 'tabular-nums'
        }
      }, p.fee), /*#__PURE__*/React.createElement("div", {
        style: {
          display: 'flex',
          justifyContent: 'flex-end'
        }
      }, /*#__PURE__*/React.createElement(W.StatusBadge, {
        status: PLACEMENT_STATUS[p.status].tone,
        label: p.status,
        size: "sm"
      })));
    })));
  }

  /* ---------- Berichte (agency): provision per client + mandate health ---------- */
  function VermittlerReports({
    clients,
    mandates,
    placements,
    kpis
  }) {
    const feeNum = s => parseInt(String(s).replace(/[^0-9]/g, ''), 10) || 0;
    const perClient = clients.map(k => ({
      name: k.name,
      sum: placements.filter(p => p.client === k.name).reduce((a, p) => a + feeNum(p.fee), 0)
    })).filter(x => x.sum > 0).sort((a, b) => b.sum - a.sum);
    const maxFee = Math.max(...perClient.map(x => x.sum), 1);
    const active = mandates.filter(m => m.status === 'aktiv').length;
    const fmt = n => n.toLocaleString('de-DE');
    return /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: '18px'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '14px'
      }
    }, kpis.map((k, i) => /*#__PURE__*/React.createElement(W.StatCard, _extends({
      key: i
    }, k)))), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'grid',
        gridTemplateColumns: '1.4fr 1fr',
        gap: '16px'
      }
    }, /*#__PURE__*/React.createElement(W.Card, {
      title: "Provision je Kunde",
      subtitle: "Gebuchte Vermittlungen"
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: '13px'
      }
    }, perClient.map(x => /*#__PURE__*/React.createElement("div", {
      key: x.name
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        justifyContent: 'space-between',
        fontSize: '12.5px',
        marginBottom: '5px'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        color: 'var(--text-body)',
        fontWeight: 500
      }
    }, x.name), /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: 'var(--font-mono)',
        color: 'var(--accent-strong)',
        fontWeight: 600
      }
    }, fmt(x.sum), " \u20AC")), /*#__PURE__*/React.createElement("div", {
      style: {
        height: '8px',
        background: 'var(--surface-sunk)',
        borderRadius: 'var(--radius-pill)',
        overflow: 'hidden'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: `${x.sum / maxFee * 100}%`,
        height: '100%',
        background: 'var(--accent)',
        borderRadius: 'var(--radius-pill)'
      }
    })))))), /*#__PURE__*/React.createElement(W.Card, {
      title: "Mandate",
      subtitle: "Status der Suchauftr\xE4ge"
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: '14px'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'baseline',
        gap: '10px'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: 'var(--font-display)',
        fontSize: '34px',
        fontWeight: 700,
        color: 'var(--text-heading)'
      }
    }, active), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: '13px',
        color: 'var(--text-muted)'
      }
    }, "aktive Mandate")), /*#__PURE__*/React.createElement(W.ProgressBar, {
      value: Math.round(active / mandates.length * 100),
      tone: "interview",
      showValue: true,
      label: "Auslastung"
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        marginTop: '4px'
      }
    }, mandates.map(m => /*#__PURE__*/React.createElement("div", {
      key: m.id,
      style: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        fontSize: '12.5px'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        color: 'var(--text-body)',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        marginRight: '8px'
      }
    }, m.role), /*#__PURE__*/React.createElement(Pill, {
      p: PRIORITY[m.priority]
    }))))))));
  }
  Object.assign(window, {
    MandateView,
    PoolView,
    PlatzierungenView,
    VermittlerReports
  });
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/recruiting/VermittlerViews.jsx", error: String((e && e.message) || e) }); }

// ui_kits/recruiting/Views.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/* __kit_guard__ */
(function () {
  var __s = document.currentScript;
  if (__s && /_ds_bundle\.js/.test(__s.src || '')) return;
  /* Views — Talente list, Stellen, Berichte, Postfach. */
  const V = window.BewerbungstoolDesignSystem_a75119;

  /* ---------- Talente: candidate list ---------- */
  function CandidateList({
    candidates,
    onOpen
  }) {
    const [tab, setTab] = React.useState('alle');
    const counts = s => candidates.filter(c => s === 'alle' ? true : c.status === s).length;
    const tabs = [{
      id: 'alle',
      label: 'Alle',
      count: counts('alle')
    }, {
      id: 'new',
      label: 'Neu',
      count: counts('new')
    }, {
      id: 'review',
      label: 'Sichtung',
      count: counts('review')
    }, {
      id: 'interview',
      label: 'Interview',
      count: counts('interview')
    }, {
      id: 'offer',
      label: 'Angebot',
      count: counts('offer')
    }];
    const rows = candidates.filter(c => tab === 'alle' ? true : c.status === tab);
    return /*#__PURE__*/React.createElement(V.Card, {
      pad: false
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        padding: '6px 16px 0'
      }
    }, /*#__PURE__*/React.createElement(V.Tabs, {
      value: tab,
      onChange: setTab,
      tabs: tabs
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'grid',
        gridTemplateColumns: 'minmax(0,1.6fr) minmax(0,1.2fr) 78px 116px 96px',
        gap: '14px',
        padding: '11px 16px',
        fontFamily: 'var(--font-mono)',
        fontSize: '9.5px',
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
        color: 'var(--text-soft)',
        borderBottom: '1px solid var(--border)',
        background: 'var(--surface-subtle)'
      }
    }, /*#__PURE__*/React.createElement("span", null, "Kandidat:in"), /*#__PURE__*/React.createElement("span", null, "Stelle"), /*#__PURE__*/React.createElement("span", null, "Match"), /*#__PURE__*/React.createElement("span", null, "Phase"), /*#__PURE__*/React.createElement("span", {
      style: {
        textAlign: 'right'
      }
    }, "Aktiv.")), rows.map(c => /*#__PURE__*/React.createElement(V.CandidateRow, {
      key: c.id,
      name: c.name,
      role: c.role,
      position: c.position,
      src: c.src,
      status: c.status,
      score: c.score,
      when: c.when,
      onClick: () => onOpen(c.id)
    })));
  }

  /* ---------- Stellen: job openings ---------- */
  function JobsView({
    jobs,
    candidates,
    onOpen
  }) {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
        gap: '16px'
      }
    }, jobs.map(j => {
      const apps = candidates.filter(c => c.jobId === j.id);
      const interview = apps.filter(c => c.status === 'interview' || c.status === 'offer').length;
      return /*#__PURE__*/React.createElement(V.Card, {
        key: j.id,
        style: {
          cursor: 'pointer'
        },
        onClick: () => apps[0] && onOpen(apps[0].id)
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: '10px'
        }
      }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h3", {
        style: {
          fontFamily: 'var(--font-display)',
          fontSize: '17px',
          fontWeight: 700,
          color: 'var(--text-heading)',
          margin: 0,
          letterSpacing: '-0.01em'
        }
      }, j.title), /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: '12.5px',
          color: 'var(--text-muted)',
          marginTop: '3px'
        }
      }, j.team)), /*#__PURE__*/React.createElement(V.Badge, {
        variant: "soft",
        size: "sm"
      }, j.type)), /*#__PURE__*/React.createElement("div", {
        style: {
          display: 'flex',
          gap: '8px',
          margin: '14px 0',
          flexWrap: 'wrap'
        }
      }, /*#__PURE__*/React.createElement(V.MetaPill, {
        icon: "pin"
      }, j.location), /*#__PURE__*/React.createElement(V.MetaPill, {
        icon: "users",
        tone: "accent"
      }, apps.length, " Bewerbungen")), /*#__PURE__*/React.createElement(V.ProgressBar, {
        value: Math.round(interview / Math.max(apps.length, 1) * 100),
        tone: "interview"
      }), /*#__PURE__*/React.createElement("div", {
        style: {
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginTop: '12px'
        }
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          display: 'flex'
        }
      }, apps.slice(0, 4).map((c, i) => /*#__PURE__*/React.createElement("div", {
        key: c.id,
        style: {
          marginLeft: i === 0 ? 0 : '-9px',
          border: '2px solid var(--surface-card)',
          borderRadius: '50%'
        }
      }, /*#__PURE__*/React.createElement(V.Avatar, {
        name: c.name,
        src: c.src,
        size: "xs"
      })))), /*#__PURE__*/React.createElement("span", {
        style: {
          display: 'inline-flex',
          alignItems: 'center',
          gap: '5px',
          fontFamily: 'var(--font-mono)',
          fontSize: '11px',
          color: 'var(--accent-strong)',
          fontWeight: 600
        }
      }, "Pipeline ", /*#__PURE__*/React.createElement(V.Icon, {
        name: "arrowRight",
        size: 13
      }))));
    }));
  }

  /* ---------- Berichte: funnel + sources ---------- */
  function ReportsView({
    candidates,
    kpis
  }) {
    const order = window.STAGES_ORDER;
    const max = Math.max(...order.map(s => candidates.filter(c => c.status === s).length), 1);
    const sources = {};
    candidates.forEach(c => {
      sources[c.source] = (sources[c.source] || 0) + 1;
    });
    return /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: '18px'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '14px'
      }
    }, kpis.map((k, i) => /*#__PURE__*/React.createElement(V.StatCard, _extends({
      key: i
    }, k)))), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'grid',
        gridTemplateColumns: '1.5fr 1fr',
        gap: '16px'
      }
    }, /*#__PURE__*/React.createElement(V.Card, {
      title: "Funnel",
      subtitle: "Kandidat:innen je Phase"
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: '12px'
      }
    }, order.map(s => {
      const n = candidates.filter(c => c.status === s).length;
      const meta = V.STAGES[s];
      return /*#__PURE__*/React.createElement("div", {
        key: s,
        style: {
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }
      }, /*#__PURE__*/React.createElement("span", {
        style: {
          width: '88px',
          fontFamily: 'var(--font-mono)',
          fontSize: '11px',
          color: 'var(--text-muted)',
          flexShrink: 0
        }
      }, meta.label), /*#__PURE__*/React.createElement("div", {
        style: {
          flex: 1,
          height: '24px',
          background: 'var(--surface-sunk)',
          borderRadius: 'var(--radius-sm)',
          overflow: 'hidden'
        }
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          width: `${n / max * 100}%`,
          height: '100%',
          background: meta.color,
          borderRadius: 'var(--radius-sm)',
          minWidth: '6px',
          transition: 'width var(--dur-med)'
        }
      })), /*#__PURE__*/React.createElement("span", {
        style: {
          width: '22px',
          fontFamily: 'var(--font-mono)',
          fontSize: '13px',
          fontWeight: 600,
          color: 'var(--text-heading)',
          textAlign: 'right',
          fontVariantNumeric: 'tabular-nums'
        }
      }, n));
    }))), /*#__PURE__*/React.createElement(V.Card, {
      title: "Quellen",
      subtitle: "Woher kommen Bewerbungen"
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: '13px'
      }
    }, Object.entries(sources).sort((a, b) => b[1] - a[1]).map(([src, n]) => /*#__PURE__*/React.createElement("div", {
      key: src
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        justifyContent: 'space-between',
        fontSize: '12.5px',
        marginBottom: '5px'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        color: 'var(--text-body)',
        fontWeight: 500
      }
    }, src), /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: 'var(--font-mono)',
        color: 'var(--text-soft)'
      }
    }, n)), /*#__PURE__*/React.createElement(V.ProgressBar, {
      value: n / candidates.length * 100,
      tone: "accent",
      height: 5
    })))))));
  }

  /* ---------- Postfach: inbox ---------- */
  function Inbox({
    candidates,
    onOpen
  }) {
    const msgs = [{
      id: 'c1',
      text: 'Vielen Dank für die Einladung — der Termin am 24.06. passt mir gut.',
      when: 'vor 2 Std.',
      unread: true
    }, {
      id: 'c6',
      text: 'Anbei wie besprochen meine Arbeitsproben zur Research-Methodik.',
      when: 'vor 5 Std.',
      unread: true
    }, {
      id: 'c7',
      text: 'Ich habe das Angebot erhalten und melde mich bis Freitag zurück.',
      when: 'gestern',
      unread: false
    }, {
      id: 'c5',
      text: 'Gerne stehe ich für ein weiteres Gespräch zur Verfügung.',
      when: 'vor 2 Tagen',
      unread: false
    }];
    const byId = Object.fromEntries(candidates.map(c => [c.id, c]));
    return /*#__PURE__*/React.createElement(V.Card, {
      pad: false
    }, msgs.map(m => {
      const c = byId[m.id];
      if (!c) return null;
      return /*#__PURE__*/React.createElement("div", {
        key: m.id,
        onClick: () => onOpen(c.id),
        style: {
          display: 'flex',
          alignItems: 'center',
          gap: '13px',
          padding: '14px 18px',
          borderBottom: '1px solid var(--border)',
          cursor: 'pointer',
          background: m.unread ? 'var(--accent-soft)' : 'transparent'
        }
      }, /*#__PURE__*/React.createElement(V.Avatar, {
        name: c.name,
        src: c.src,
        size: "md"
      }), /*#__PURE__*/React.createElement("div", {
        style: {
          flex: 1,
          minWidth: 0
        }
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }
      }, /*#__PURE__*/React.createElement("span", {
        style: {
          fontFamily: 'var(--font-display)',
          fontSize: '14px',
          fontWeight: 700,
          color: 'var(--text-heading)'
        }
      }, c.name), m.unread && /*#__PURE__*/React.createElement("span", {
        style: {
          width: '7px',
          height: '7px',
          borderRadius: '50%',
          background: 'var(--accent)'
        }
      }), /*#__PURE__*/React.createElement(V.StatusBadge, {
        status: c.status,
        size: "sm"
      })), /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: '13px',
          color: 'var(--text-muted)',
          marginTop: '2px',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis'
        }
      }, m.text)), /*#__PURE__*/React.createElement("span", {
        style: {
          fontFamily: 'var(--font-mono)',
          fontSize: '11px',
          color: 'var(--text-soft)',
          flexShrink: 0
        }
      }, m.when));
    }));
  }
  Object.assign(window, {
    CandidateList,
    JobsView,
    ReportsView,
    Inbox
  });
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/recruiting/Views.jsx", error: String((e && e.message) || e) }); }

// ui_kits/recruiting/app.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/* __kit_guard__ */
(function () {
  var __s = document.currentScript;
  if (__s && /_ds_bundle\.js/.test(__s.src || '')) return;
  /* app.jsx — orchestrates the myJob recruiting workspace for two roles. */
  const A = window.BewerbungstoolDesignSystem_a75119;
  const VERMITTLER_NAV = [{
    id: 'mandate',
    label: 'Mandate',
    icon: 'briefcase'
  }, {
    id: 'pool',
    label: 'Talent-Pool',
    icon: 'users'
  }, {
    id: 'platzierungen',
    label: 'Platzierungen',
    icon: 'award'
  }, {
    id: 'berichte',
    label: 'Berichte',
    icon: 'trend'
  }, {
    id: 'postfach',
    label: 'Postfach',
    icon: 'inbox'
  }];
  const TITLES = {
    hr: {
      pipeline: ['Pipeline', 'Alle Kandidat:innen über die Phasen ziehen'],
      talente: ['Talente', 'Durchsuchbare Liste aller Bewerbungen'],
      stellen: ['Stellen', 'Offene Positionen und ihre Pipelines'],
      berichte: ['Berichte', 'Funnel, Quellen und Kennzahlen'],
      postfach: ['Postfach', 'Nachrichten von Kandidat:innen']
    },
    vermittler: {
      mandate: ['Mandate', 'Suchaufträge je Kunde mit Provision und Frist'],
      pool: ['Talent-Pool', 'Eigener Kandidaten-Pool und Verfügbarkeit'],
      platzierungen: ['Platzierungen', 'Gebuchte Vermittlungen und Provision'],
      berichte: ['Berichte', 'Provision, Mandate und Auslastung'],
      postfach: ['Postfach', 'Nachrichten von Kandidat:innen']
    }
  };
  function App() {
    const [role, setRole] = React.useState('hr');
    const [nav, setNav] = React.useState('pipeline');
    const [search, setSearch] = React.useState('');
    const [selected, setSelected] = React.useState(null);
    const [candidates, setCandidates] = React.useState(window.CANDIDATES);
    const navItems = role === 'hr' ? window.HR_NAV : VERMITTLER_NAV;
    const switchRole = r => {
      setRole(r);
      setNav(r === 'hr' ? 'pipeline' : 'mandate');
      setSelected(null);
    };
    const visible = React.useMemo(() => {
      const q = search.trim().toLowerCase();
      if (!q) return candidates;
      return candidates.filter(c => (c.name + ' ' + c.role + ' ' + c.position).toLowerCase().includes(q));
    }, [candidates, search]);
    const open = id => setSelected(id);
    const close = () => setSelected(null);
    const advance = id => {
      setCandidates(cs => cs.map(c => {
        if (c.id !== id) return c;
        const i = window.STAGES_ORDER.indexOf(c.status);
        const next = window.STAGES_ORDER[Math.min(i + 1, window.STAGES_ORDER.length - 1)];
        return {
          ...c,
          status: next
        };
      }));
    };
    const reject = id => {
      setCandidates(cs => cs.map(c => c.id === id ? {
        ...c,
        status: 'rejected'
      } : c));
      close();
    };
    const cand = candidates.find(c => c.id === selected);
    const [title, subtitle] = TITLES[role][nav] || ['', ''];
    const ACTION_LABEL = {
      pipeline: 'Kandidat:in',
      stellen: 'Stelle anlegen',
      mandate: 'Mandat anlegen',
      pool: 'Talent hinzufügen',
      platzierungen: 'Platzierung buchen'
    };
    const actions = ACTION_LABEL[nav] ? /*#__PURE__*/React.createElement(A.Button, {
      variant: "primary",
      size: "sm",
      iconLeft: /*#__PURE__*/React.createElement(A.Icon, {
        name: "plus",
        size: 15
      })
    }, ACTION_LABEL[nav]) : null;
    return /*#__PURE__*/React.createElement(window.AppShell, {
      active: nav,
      onNav: setNav,
      navItems: navItems,
      role: role,
      onRole: switchRole,
      search: search,
      onSearch: setSearch,
      title: title,
      subtitle: subtitle,
      actions: actions
    }, role === 'hr' && nav === 'pipeline' && /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
        height: '100%'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '14px',
        flexShrink: 0
      }
    }, window.KPIS.map((k, i) => /*#__PURE__*/React.createElement(A.StatCard, _extends({
      key: i
    }, k)))), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        minHeight: 0
      }
    }, /*#__PURE__*/React.createElement(window.PipelineBoard, {
      candidates: visible,
      onOpen: open
    }))), role === 'hr' && nav === 'talente' && /*#__PURE__*/React.createElement(window.CandidateList, {
      candidates: visible,
      onOpen: open
    }), role === 'hr' && nav === 'stellen' && /*#__PURE__*/React.createElement(window.JobsView, {
      jobs: window.JOBS,
      candidates: candidates,
      onOpen: open
    }), role === 'hr' && nav === 'berichte' && /*#__PURE__*/React.createElement(window.ReportsView, {
      candidates: candidates,
      kpis: window.KPIS
    }), role === 'vermittler' && nav === 'mandate' && /*#__PURE__*/React.createElement(window.MandateView, {
      clients: window.CLIENTS,
      mandates: window.MANDATES
    }), role === 'vermittler' && nav === 'pool' && /*#__PURE__*/React.createElement(window.PoolView, {
      pool: window.POOL,
      candidates: candidates,
      onOpen: open
    }), role === 'vermittler' && nav === 'platzierungen' && /*#__PURE__*/React.createElement(window.PlatzierungenView, {
      placements: window.PLACEMENTS,
      candidates: candidates,
      kpis: window.VERMITTLER_KPIS
    }), role === 'vermittler' && nav === 'berichte' && /*#__PURE__*/React.createElement(window.VermittlerReports, {
      clients: window.CLIENTS,
      mandates: window.MANDATES,
      placements: window.PLACEMENTS,
      kpis: window.VERMITTLER_KPIS
    }), nav === 'postfach' && /*#__PURE__*/React.createElement(window.Inbox, {
      candidates: candidates,
      onOpen: open
    }), cand && /*#__PURE__*/React.createElement(window.CandidateDetail, {
      c: cand,
      onClose: close,
      onAdvance: advance,
      onReject: reject
    }));
  }
  ReactDOM.createRoot(document.getElementById('root')).render(/*#__PURE__*/React.createElement(App, null));
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/recruiting/app.jsx", error: String((e && e.message) || e) }); }

// ui_kits/recruiting/data.js
try { (() => {
/* __kit_guard__ */
(function () {
  var __s = document.currentScript;
  if (__s && /_ds_bundle\.js/.test(__s.src || '')) return;
  /* Sample recruiting data for the myJob ATS UI kit. German, realistic. */
  const STAGES_ORDER = ['new', 'review', 'interview', 'offer', 'hired'];
  const STAGE_LABELS = {
    new: 'Neu',
    review: 'Sichtung',
    interview: 'Interview',
    offer: 'Angebot',
    hired: 'Eingestellt',
    rejected: 'Absage'
  };
  const JOBS = [{
    id: 'j1',
    title: 'Senior C++ Engineer',
    team: 'Plattform · Backend',
    location: 'Berlin · Hybrid',
    open: 24,
    type: 'Vollzeit'
  }, {
    id: 'j2',
    title: 'Product Designer:in',
    team: 'Design · UX',
    location: 'Remote (DE)',
    open: 31,
    type: 'Vollzeit'
  }, {
    id: 'j3',
    title: 'DevOps Engineer',
    team: 'Infrastructure',
    location: 'München · Vor Ort',
    open: 12,
    type: 'Vollzeit'
  }, {
    id: 'j4',
    title: 'Werkstudent:in Data',
    team: 'Analytics',
    location: 'Hamburg · Hybrid',
    open: 9,
    type: 'Werkstudent'
  }];
  const CANDIDATES = [{
    id: 'c1',
    name: 'Suhay Sevinc',
    role: 'M.Sc. Software Engineer',
    position: 'Senior C++ Engineer',
    jobId: 'j1',
    src: '../../assets/img/candidate-portrait-sm.jpg',
    status: 'interview',
    score: 88,
    when: '2 Tage',
    source: 'LinkedIn',
    location: 'Berlin',
    email: 'suhay.sevinc@example.de',
    phone: '+49 151 2345 6789',
    salary: '78.000 €',
    notice: '3 Monate',
    skills: ['C++', 'Rust', 'Distributed Systems', 'gRPC', 'Kubernetes', 'CMake'],
    summary: 'Backend-Engineer mit 6 Jahren Erfahrung in hochperformanten verteilten Systemen. Zuletzt Tech-Lead eines Matching-Teams.',
    timeline: [{
      t: 'Beworben',
      d: '12.06.2026',
      who: 'via LinkedIn'
    }, {
      t: 'In Sichtung verschoben',
      d: '13.06.2026',
      who: 'Petra Voss (HR)'
    }, {
      t: 'Telefon-Screening',
      d: '16.06.2026',
      who: 'Petra Voss'
    }, {
      t: 'Tech-Interview geplant',
      d: '24.06.2026',
      who: 'Plattform-Team'
    }]
  }, {
    id: 'c2',
    name: 'Lena Brandt',
    role: 'Product Designerin',
    position: 'Product Designer:in',
    jobId: 'j2',
    status: 'review',
    score: 81,
    when: '4 Tage',
    source: 'Empfehlung',
    location: 'Leipzig',
    email: 'lena.brandt@example.de',
    phone: '+49 160 1112 2334',
    salary: '64.000 €',
    notice: '6 Wochen',
    skills: ['Figma', 'Design Systems', 'Prototyping', 'User Research'],
    summary: 'Produktdesignerin mit Fokus auf B2B-SaaS und Design-Systeme.'
  }, {
    id: 'c3',
    name: 'Marco Adler',
    role: 'DevOps Engineer',
    position: 'DevOps Engineer',
    jobId: 'j3',
    status: 'new',
    score: 64,
    when: 'heute',
    source: 'Stellenportal',
    location: 'München',
    email: 'marco.adler@example.de',
    phone: '+49 170 5566 7788',
    salary: '72.000 €',
    notice: '3 Monate',
    skills: ['Terraform', 'AWS', 'CI/CD', 'Go'],
    summary: 'Plattform- und DevOps-Engineer mit Schwerpunkt Automatisierung.'
  }, {
    id: 'c4',
    name: 'Petra Nowak',
    role: 'Frontend Engineer',
    position: 'Senior C++ Engineer',
    jobId: 'j1',
    status: 'new',
    score: 58,
    when: 'heute',
    source: 'Stellenportal',
    location: 'Wien',
    email: 'petra.nowak@example.at',
    phone: '+43 660 1234 567',
    salary: '60.000 €',
    notice: '1 Monat',
    skills: ['TypeScript', 'React', 'WebGL'],
    summary: 'Frontend-Engineer mit Interesse an systemnaher Entwicklung.'
  }, {
    id: 'c5',
    name: 'Jonas Krüger',
    role: 'Senior Backend Engineer',
    position: 'Senior C++ Engineer',
    jobId: 'j1',
    status: 'review',
    score: 79,
    when: '3 Tage',
    source: 'LinkedIn',
    location: 'Köln',
    email: 'jonas.krueger@example.de',
    phone: '+49 152 9988 7766',
    salary: '82.000 €',
    notice: '3 Monate',
    skills: ['C++', 'Go', 'PostgreSQL', 'Kafka'],
    summary: 'Erfahrener Backend-Engineer aus dem Fintech-Umfeld.'
  }, {
    id: 'c6',
    name: 'Aylin Demir',
    role: 'UX Researcher',
    position: 'Product Designer:in',
    jobId: 'j2',
    status: 'interview',
    score: 84,
    when: '1 Tag',
    source: 'Empfehlung',
    location: 'Berlin',
    email: 'aylin.demir@example.de',
    phone: '+49 151 4433 2211',
    salary: '66.000 €',
    notice: '2 Monate',
    skills: ['User Research', 'Interviews', 'Figma', 'Survey'],
    summary: 'UX-Researcherin mit starkem qualitativen Hintergrund.'
  }, {
    id: 'c7',
    name: 'Tobias Frank',
    role: 'Cloud Engineer',
    position: 'DevOps Engineer',
    jobId: 'j3',
    status: 'offer',
    score: 90,
    when: '5 Tage',
    source: 'LinkedIn',
    location: 'Stuttgart',
    email: 'tobias.frank@example.de',
    phone: '+49 162 1010 2020',
    salary: '85.000 €',
    notice: '3 Monate',
    skills: ['AWS', 'Kubernetes', 'Terraform', 'Python'],
    summary: 'Cloud-Engineer mit Architektur-Erfahrung über mehrere Teams.'
  }, {
    id: 'c8',
    name: 'Sophie Lehmann',
    role: 'Junior Designer',
    position: 'Product Designer:in',
    jobId: 'j2',
    status: 'new',
    score: 52,
    when: 'gestern',
    source: 'Stellenportal',
    location: 'Hamburg',
    email: 'sophie.lehmann@example.de',
    phone: '+49 159 3030 4040',
    salary: '48.000 €',
    notice: 'sofort',
    skills: ['Figma', 'Illustration'],
    summary: 'Junior-Designerin mit starkem Portfolio.'
  }, {
    id: 'c9',
    name: 'Daniel Roth',
    role: 'Data Analyst',
    position: 'Werkstudent:in Data',
    jobId: 'j4',
    status: 'review',
    score: 71,
    when: '6 Tage',
    source: 'Uni-Portal',
    location: 'Hamburg',
    email: 'daniel.roth@example.de',
    phone: '+49 151 7070 8080',
    salary: '—',
    notice: 'flexibel',
    skills: ['Python', 'SQL', 'Pandas'],
    summary: 'Werkstudent mit Schwerpunkt Datenanalyse.'
  }, {
    id: 'c10',
    name: 'Mara Vogel',
    role: 'Engineering Manager',
    position: 'Senior C++ Engineer',
    jobId: 'j1',
    status: 'hired',
    score: 92,
    when: '8 Tage',
    source: 'Empfehlung',
    location: 'Berlin',
    email: 'mara.vogel@example.de',
    phone: '+49 151 6060 5050',
    salary: '95.000 €',
    notice: '—',
    skills: ['C++', 'Leadership', 'Architecture'],
    summary: 'Engineering-Managerin, Zusage erhalten und angenommen.'
  }, {
    id: 'c11',
    name: 'Felix Wagner',
    role: 'SRE',
    position: 'DevOps Engineer',
    jobId: 'j3',
    status: 'interview',
    score: 77,
    when: '2 Tage',
    source: 'LinkedIn',
    location: 'München',
    email: 'felix.wagner@example.de',
    phone: '+49 170 2323 4545',
    salary: '80.000 €',
    notice: '3 Monate',
    skills: ['SRE', 'Prometheus', 'Go', 'Linux'],
    summary: 'Site-Reliability-Engineer mit Observability-Fokus.'
  }, {
    id: 'c12',
    name: 'Hanna Schulz',
    role: 'Brand Designer',
    position: 'Product Designer:in',
    jobId: 'j2',
    status: 'offer',
    score: 86,
    when: '4 Tage',
    source: 'Empfehlung',
    location: 'Berlin',
    email: 'hanna.schulz@example.de',
    phone: '+49 151 1212 3434',
    salary: '70.000 €',
    notice: '6 Wochen',
    skills: ['Branding', 'Figma', 'Motion'],
    summary: 'Brand-Designerin mit Schnittstelle zu Produkt.'
  }];
  const KPIS = [{
    label: 'Neue Bewerbungen',
    value: '48',
    delta: '+12%',
    dir: 'up',
    icon: 'inbox'
  }, {
    label: 'Im Interview',
    value: '14',
    delta: '+3',
    dir: 'up',
    icon: 'users'
  }, {
    label: 'Offene Stellen',
    value: '7',
    delta: '+1',
    dir: 'up',
    icon: 'briefcase'
  }, {
    label: 'Time-to-Hire',
    value: '21 T',
    delta: '-3 T',
    dir: 'down',
    icon: 'clock'
  }];

  /* ===== Vermittler-Seite (Agentur "TalentBridge") =====
     The agency works mandates for several CLIENT companies, runs a shared
     candidate POOL, and books PLACEMENTS that earn a Provision (fee). */
  const CLIENTS = [{
    id: 'k1',
    name: 'Aurora Systems GmbH',
    industry: 'SaaS · Plattform',
    location: 'Berlin',
    since: '2024'
  }, {
    id: 'k2',
    name: 'Nordlicht Software',
    industry: 'Fintech',
    location: 'Hamburg',
    since: '2025'
  }, {
    id: 'k3',
    name: 'Falk & Partner',
    industry: 'Beratung',
    location: 'München',
    since: '2023'
  }, {
    id: 'k4',
    name: 'Meridian Labs',
    industry: 'KI · Research',
    location: 'Remote',
    since: '2026'
  }];
  const MANDATES = [{
    id: 'm1',
    clientId: 'k1',
    role: 'Senior C++ Engineer',
    location: 'Berlin · Hybrid',
    fee: '22%',
    feeValue: '17.160 €',
    deadline: '30.06.2026',
    priority: 'hoch',
    submitted: 4,
    interviews: 2,
    status: 'aktiv'
  }, {
    id: 'm2',
    clientId: 'k1',
    role: 'DevOps Engineer',
    location: 'Berlin',
    fee: '20%',
    feeValue: '14.000 €',
    deadline: '15.07.2026',
    priority: 'mittel',
    submitted: 2,
    interviews: 1,
    status: 'aktiv'
  }, {
    id: 'm3',
    clientId: 'k2',
    role: 'Backend Engineer',
    location: 'Hamburg',
    fee: '22%',
    feeValue: '16.500 €',
    deadline: '10.07.2026',
    priority: 'hoch',
    submitted: 3,
    interviews: 1,
    status: 'aktiv'
  }, {
    id: 'm4',
    clientId: 'k3',
    role: 'Plattform-Engineer',
    location: 'München',
    fee: '18%',
    feeValue: '12.200 €',
    deadline: '05.07.2026',
    priority: 'niedrig',
    submitted: 1,
    interviews: 0,
    status: 'pausiert'
  }, {
    id: 'm5',
    clientId: 'k4',
    role: 'Distributed Systems Eng.',
    location: 'Remote',
    fee: '24%',
    feeValue: '19.800 €',
    deadline: '20.07.2026',
    priority: 'mittel',
    submitted: 2,
    interviews: 1,
    status: 'aktiv'
  }];

  /* agency view of candidates: who's available + which clients they're submitted to */
  const POOL = [{
    id: 'c1',
    availability: 'sofort',
    rate: '650 €/Tag',
    submittedTo: ['Aurora Systems', 'Meridian Labs']
  }, {
    id: 'c5',
    availability: 'in 3 Mon.',
    rate: '—',
    submittedTo: ['Aurora Systems']
  }, {
    id: 'c11',
    availability: 'sofort',
    rate: '—',
    submittedTo: ['Aurora Systems', 'Falk & Partner']
  }, {
    id: 'c3',
    availability: 'in 3 Mon.',
    rate: '—',
    submittedTo: ['Aurora Systems']
  }, {
    id: 'c7',
    availability: 'in 1 Mon.',
    rate: '—',
    submittedTo: ['Meridian Labs']
  }, {
    id: 'c6',
    availability: 'sofort',
    rate: '—',
    submittedTo: ['Nordlicht Software']
  }, {
    id: 'c2',
    availability: 'in 6 Wo.',
    rate: '—',
    submittedTo: ['Nordlicht Software']
  }];
  const PLACEMENTS = [{
    id: 'p1',
    candId: 'c10',
    client: 'Aurora Systems GmbH',
    role: 'Engineering Manager',
    start: '01.07.2026',
    fee: '19.000 €',
    status: 'In Rechnung'
  }, {
    id: 'p2',
    candId: 'c12',
    client: 'Nordlicht Software',
    role: 'Brand Designer',
    start: '15.06.2026',
    fee: '12.600 €',
    status: 'Bezahlt'
  }, {
    id: 'p3',
    candId: 'c7',
    client: 'Meridian Labs',
    role: 'Cloud Engineer',
    start: '01.08.2026',
    fee: '17.000 €',
    status: 'Probezeit'
  }];
  const VERMITTLER_KPIS = [{
    label: 'Aktive Mandate',
    value: '5',
    delta: '+2',
    dir: 'up',
    icon: 'briefcase'
  }, {
    label: 'Im Talent-Pool',
    value: '42',
    delta: '+6',
    dir: 'up',
    icon: 'users'
  }, {
    label: 'Platzierungen Q2',
    value: '7',
    delta: '+3',
    dir: 'up',
    icon: 'award'
  }, {
    label: 'Provision Q2',
    value: '128 T€',
    delta: '+18%',
    dir: 'up',
    icon: 'trend'
  }];
  Object.assign(window, {
    STAGES_ORDER,
    STAGE_LABELS,
    JOBS,
    CANDIDATES,
    KPIS,
    CLIENTS,
    MANDATES,
    POOL,
    PLACEMENTS,
    VERMITTLER_KPIS
  });
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/recruiting/data.js", error: String((e && e.message) || e) }); }

__ds_ns.Avatar = __ds_scope.Avatar;

__ds_ns.Badge = __ds_scope.Badge;

__ds_ns.Button = __ds_scope.Button;

__ds_ns.Icon = __ds_scope.Icon;

__ds_ns.ICON_NAMES = __ds_scope.ICON_NAMES;

__ds_ns.IconButton = __ds_scope.IconButton;

__ds_ns.MetaPill = __ds_scope.MetaPill;

__ds_ns.CandidateRow = __ds_scope.CandidateRow;

__ds_ns.Card = __ds_scope.Card;

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
