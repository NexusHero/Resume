/* @ds-bundle: {"format":3,"namespace":"BewerbungstoolDesignSystem_a75119","components":[{"name":"Avatar","sourcePath":"components/core/Avatar.jsx"},{"name":"Badge","sourcePath":"components/core/Badge.jsx"},{"name":"Button","sourcePath":"components/core/Button.jsx"},{"name":"Icon","sourcePath":"components/core/Icon.jsx"},{"name":"ICON_NAMES","sourcePath":"components/core/Icon.jsx"},{"name":"IconButton","sourcePath":"components/core/IconButton.jsx"},{"name":"MetaPill","sourcePath":"components/core/MetaPill.jsx"},{"name":"CandidateRow","sourcePath":"components/data/CandidateRow.jsx"},{"name":"Card","sourcePath":"components/data/Card.jsx"},{"name":"ProgressBar","sourcePath":"components/data/ProgressBar.jsx"},{"name":"StatCard","sourcePath":"components/data/StatCard.jsx"},{"name":"STAGES","sourcePath":"components/data/StatusBadge.jsx"},{"name":"StatusBadge","sourcePath":"components/data/StatusBadge.jsx"},{"name":"Tabs","sourcePath":"components/data/Tabs.jsx"},{"name":"Checkbox","sourcePath":"components/forms/Checkbox.jsx"},{"name":"Input","sourcePath":"components/forms/Input.jsx"},{"name":"Select","sourcePath":"components/forms/Select.jsx"},{"name":"Switch","sourcePath":"components/forms/Switch.jsx"},{"name":"Textarea","sourcePath":"components/forms/Textarea.jsx"}],"sourceHashes":{"components/core/Avatar.jsx":"be544725a790","components/core/Badge.jsx":"587e11e83ce2","components/core/Button.jsx":"c599138c513c","components/core/Icon.jsx":"e0a5eb759f8c","components/core/IconButton.jsx":"bddaf1dfefaa","components/core/MetaPill.jsx":"b99f31f6e87c","components/data/CandidateRow.jsx":"636370c8d577","components/data/Card.jsx":"d9336b6dae72","components/data/ProgressBar.jsx":"cb537e860275","components/data/StatCard.jsx":"3f5fee7e6433","components/data/StatusBadge.jsx":"a90276d82a1c","components/data/Tabs.jsx":"d7895fd812a5","components/forms/Checkbox.jsx":"3ff388154f50","components/forms/Input.jsx":"7bf1885f9285","components/forms/Select.jsx":"4e2274926081","components/forms/Switch.jsx":"798cb097d1f9","components/forms/Textarea.jsx":"a49a73a5a3fb","ui_kits/recruiting/AppShell.jsx":"da025417f654","ui_kits/recruiting/Editor.jsx":"957a7f4715f6","ui_kits/recruiting/MappeModal.jsx":"c05e833e6402","ui_kits/recruiting/PipelineBoard.jsx":"7a4cfbb0e9a4","ui_kits/recruiting/TalentProfile.jsx":"59a4fed83883","ui_kits/recruiting/VermittlerViews.jsx":"9aaeb1ae5f3f","ui_kits/recruiting/Workspace.jsx":"a8a10519694a","ui_kits/recruiting/app.jsx":"240cb64ea42c","ui_kits/recruiting/data.js":"434436425a0d"},"inlinedExternals":[],"unexposedExports":[]} */

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

// ui_kits/recruiting/AppShell.jsx
try { (() => {
/* AppShell — dark nav rail + sticky topbar. One coherent product, no role toggle. */
const {
  Icon,
  IconButton,
  Avatar,
  Badge
} = window.BewerbungstoolDesignSystem_a75119;
const NAV = [{
  id: 'uebersicht',
  label: 'Übersicht',
  icon: 'home'
}, {
  id: 'mandate',
  label: 'Mandate',
  icon: 'briefcase'
}, {
  id: 'pool',
  label: 'Talent-Pool',
  icon: 'users'
}, {
  id: 'bewerbungen',
  label: 'Bewerbungen',
  icon: 'columns'
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
function NavItem({
  item,
  active,
  onClick,
  badge
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
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1
    }
  }, item.label), badge != null && /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: '10px',
      fontWeight: 600,
      color: active ? '#fff' : 'var(--sidebar-soft)',
      background: active ? 'var(--accent)' : 'var(--sidebar-glass)',
      borderRadius: 'var(--radius-pill)',
      padding: '1px 7px',
      minWidth: '18px',
      textAlign: 'center'
    }
  }, badge));
}
function AppShell({
  active,
  onNav,
  me,
  talentCount,
  search,
  onSearch,
  title,
  subtitle,
  badges = {},
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
  }, NAV.map(n => /*#__PURE__*/React.createElement(NavItem, {
    key: n.id,
    item: n,
    active: active === n.id,
    onClick: () => onNav(n.id),
    badge: badges[n.id]
  }))), /*#__PURE__*/React.createElement("button", {
    onClick: () => onNav('talente'),
    style: {
      margin: '0 14px 10px',
      padding: '11px 13px',
      borderRadius: 'var(--radius-md)',
      cursor: 'pointer',
      textAlign: 'left',
      background: 'var(--sidebar-glass)',
      border: '1px solid var(--sidebar-border)',
      display: 'flex',
      alignItems: 'center',
      gap: '10px'
    }
  }, /*#__PURE__*/React.createElement(Avatar, {
    name: me.name,
    src: me.src,
    size: "sm",
    ring: true
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
  }, me.name), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: '10px',
      color: 'var(--sidebar-soft)'
    }
  }, "Ich \xB7 +", talentCount - 1, " Talente")), /*#__PURE__*/React.createElement(Icon, {
    name: "chevronRight",
    size: 14,
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
    placeholder: "Talente, Firmen, Stellen \u2026",
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
  AppShell
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/recruiting/AppShell.jsx", error: String((e && e.message) || e) }); }

// ui_kits/recruiting/Editor.jsx
try { (() => {
/* Editor — the document workbench: form on the left, live document preview on the
   right. Two documents per talent: Lebenslauf (dark-header resume) and Anschreiben.
   This is the "richtig bearbeiten, wie vorher, mit dem Header" experience. */
const ED = window.BewerbungstoolDesignSystem_a75119;

/* ---------------- live preview: Lebenslauf ---------------- */
function SectionHead({
  children
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      margin: '0 0 12px'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: '14px',
      height: '2px',
      background: 'var(--accent)',
      borderRadius: '2px'
    }
  }), /*#__PURE__*/React.createElement("h4", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: '10.5px',
      fontWeight: 600,
      letterSpacing: '0.16em',
      textTransform: 'uppercase',
      color: 'var(--accent-strong)',
      margin: 0
    }
  }, children));
}
function ResumeDoc({
  contact,
  resume
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      width: '720px',
      background: '#fff',
      borderRadius: 'var(--radius-md)',
      overflow: 'hidden',
      boxShadow: 'var(--shadow-page)',
      display: 'flex',
      minHeight: '940px'
    }
  }, /*#__PURE__*/React.createElement("aside", {
    style: {
      width: '38%',
      background: 'linear-gradient(168deg, var(--ink-800) 0%, var(--ink-950) 100%)',
      color: '#fff',
      padding: '34px 26px'
    }
  }, /*#__PURE__*/React.createElement(ED.Avatar, {
    name: contact.name,
    src: contact.src,
    size: 104,
    radius: "var(--radius-lg)"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-display)',
      fontSize: '25px',
      fontWeight: 700,
      letterSpacing: '-0.02em',
      lineHeight: 1.1,
      marginTop: '18px'
    }
  }, contact.name), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '13px',
      color: 'var(--accent-on-dark)',
      fontWeight: 600,
      marginTop: '5px'
    }
  }, contact.role), /*#__PURE__*/React.createElement("div", {
    style: {
      height: '1px',
      background: 'var(--sidebar-border)',
      margin: '24px 0'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: '10px',
      letterSpacing: '0.16em',
      textTransform: 'uppercase',
      color: 'var(--sidebar-soft)',
      marginBottom: '13px'
    }
  }, "Kontakt"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: '11px'
    }
  }, [['mail', contact.email], ['phone', contact.phone], ['pin', contact.location], ['linkedin', contact.linkedin]].filter(([, v]) => v).map(([ic, v]) => /*#__PURE__*/React.createElement("div", {
    key: ic,
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: '10px'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: '26px',
      height: '26px',
      flexShrink: 0,
      borderRadius: 'var(--radius-sm)',
      background: 'var(--sidebar-glass)',
      border: '1px solid var(--sidebar-border)',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: 'var(--accent-on-dark)'
    }
  }, /*#__PURE__*/React.createElement(ED.Icon, {
    name: ic,
    size: 13
  })), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: '11.5px',
      color: 'var(--sidebar-muted)',
      wordBreak: 'break-word'
    }
  }, v)))), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: '10px',
      letterSpacing: '0.16em',
      textTransform: 'uppercase',
      color: 'var(--sidebar-soft)',
      margin: '26px 0 13px'
    }
  }, "Kompetenzen"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: '13px'
    }
  }, resume.skillGroups.map((g, i) => /*#__PURE__*/React.createElement("div", {
    key: i
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '11px',
      color: 'var(--sidebar-soft)',
      marginBottom: '6px'
    }
  }, g.label), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexWrap: 'wrap',
      gap: '5px'
    }
  }, g.items.map((s, j) => /*#__PURE__*/React.createElement("span", {
    key: j,
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: '10.5px',
      color: '#fff',
      background: 'var(--sidebar-glass)',
      border: '1px solid var(--sidebar-border-strong)',
      borderRadius: 'var(--radius-sm)',
      padding: '3px 7px'
    }
  }, s))))))), /*#__PURE__*/React.createElement("main", {
    style: {
      flex: 1,
      padding: '34px 30px'
    }
  }, /*#__PURE__*/React.createElement("section", {
    style: {
      marginBottom: '26px'
    }
  }, /*#__PURE__*/React.createElement(SectionHead, null, "Profil"), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: '13px',
      lineHeight: 1.65,
      color: 'var(--text-body)',
      margin: 0
    }
  }, resume.summary)), /*#__PURE__*/React.createElement("section", {
    style: {
      marginBottom: '26px'
    }
  }, /*#__PURE__*/React.createElement(SectionHead, null, "Berufserfahrung"), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      paddingLeft: '20px'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      left: '4px',
      top: '5px',
      bottom: '5px',
      width: '1.5px',
      background: 'var(--border-strong)'
    }
  }), resume.experience.map((e, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      position: 'relative',
      marginBottom: i === resume.experience.length - 1 ? 0 : '18px'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      left: '-20px',
      top: '4px',
      width: '9px',
      height: '9px',
      borderRadius: '50%',
      background: i === 0 ? 'var(--accent)' : '#fff',
      border: `2px solid ${i === 0 ? 'var(--accent)' : 'var(--border-strong)'}`
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'baseline',
      gap: '10px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-display)',
      fontSize: '14.5px',
      fontWeight: 700,
      color: 'var(--text-heading)'
    }
  }, e.role), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: '10.5px',
      color: 'var(--text-soft)',
      whiteSpace: 'nowrap'
    }
  }, e.period)), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '12.5px',
      color: 'var(--accent-strong)',
      fontWeight: 600,
      margin: '2px 0 7px'
    }
  }, e.company, e.location ? ' · ' + e.location : ''), /*#__PURE__*/React.createElement("ul", {
    style: {
      margin: 0,
      paddingLeft: '16px',
      display: 'flex',
      flexDirection: 'column',
      gap: '3px'
    }
  }, e.bullets.filter(Boolean).map((b, j) => /*#__PURE__*/React.createElement("li", {
    key: j,
    style: {
      fontSize: '12.5px',
      lineHeight: 1.5,
      color: 'var(--text-body)'
    }
  }, b))))))), /*#__PURE__*/React.createElement("section", null, /*#__PURE__*/React.createElement(SectionHead, null, "Ausbildung"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: '11px'
    }
  }, resume.education.map((e, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      gap: '12px'
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '13.5px',
      fontWeight: 700,
      color: 'var(--text-heading)'
    }
  }, e.degree), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '12px',
      color: 'var(--text-muted)',
      marginTop: '1px'
    }
  }, e.school, e.note ? ' · ' + e.note : '')), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: '10.5px',
      color: 'var(--text-soft)',
      whiteSpace: 'nowrap'
    }
  }, e.period)))))));
}

/* ---------------- live preview: Anschreiben ---------------- */
function LetterDoc({
  contact,
  letter
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      width: '720px',
      background: '#fff',
      borderRadius: 'var(--radius-md)',
      overflow: 'hidden',
      boxShadow: 'var(--shadow-page)',
      minHeight: '940px',
      display: 'flex',
      flexDirection: 'column'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      background: 'linear-gradient(168deg, var(--ink-800), var(--ink-950))',
      color: '#fff',
      padding: '28px 44px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between'
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-display)',
      fontSize: '24px',
      fontWeight: 700,
      letterSpacing: '-0.02em'
    }
  }, contact.name), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '12.5px',
      color: 'var(--accent-on-dark)',
      fontWeight: 600,
      marginTop: '3px'
    }
  }, contact.role)), /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: 'right',
      fontFamily: 'var(--font-mono)',
      fontSize: '10.5px',
      color: 'var(--sidebar-muted)',
      lineHeight: 1.7
    }
  }, /*#__PURE__*/React.createElement("div", null, contact.email), /*#__PURE__*/React.createElement("div", null, contact.phone), /*#__PURE__*/React.createElement("div", null, contact.location))), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      padding: '38px 44px',
      fontFamily: 'var(--font-body)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      gap: '20px',
      marginBottom: '34px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '13px',
      lineHeight: 1.6,
      color: 'var(--text-body)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 600,
      color: 'var(--text-heading)'
    }
  }, letter.firma), /*#__PURE__*/React.createElement("div", null, letter.ansprechpartner), /*#__PURE__*/React.createElement("div", null, letter.strasse), /*#__PURE__*/React.createElement("div", null, letter.plzOrt)), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: '11.5px',
      color: 'var(--text-muted)',
      whiteSpace: 'nowrap'
    }
  }, contact.location, ", ", new Date().toLocaleDateString('de-DE'))), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '14px',
      fontWeight: 700,
      color: 'var(--text-heading)',
      marginBottom: '20px'
    }
  }, letter.betreff), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '13px',
      color: 'var(--text-body)',
      marginBottom: '14px'
    }
  }, letter.anrede), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: '13px'
    }
  }, letter.absaetze.filter(Boolean).map((p, i) => /*#__PURE__*/React.createElement("p", {
    key: i,
    style: {
      fontSize: '13px',
      lineHeight: 1.7,
      color: 'var(--text-body)',
      margin: 0
    }
  }, p))), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: '26px',
      fontSize: '13px',
      color: 'var(--text-body)'
    }
  }, letter.gruss), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-display)',
      fontSize: '20px',
      fontWeight: 700,
      color: 'var(--text-heading)',
      marginTop: '8px',
      letterSpacing: '-0.01em'
    }
  }, contact.name)));
}

/* ---------------- left form ---------------- */
function FormGroup({
  title,
  children,
  onAdd
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: '22px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: '11px'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: '10px',
      letterSpacing: '0.14em',
      textTransform: 'uppercase',
      color: 'var(--text-muted)'
    }
  }, title), onAdd && /*#__PURE__*/React.createElement(ED.IconButton, {
    icon: "plus",
    label: "Hinzuf\xFCgen",
    variant: "ghost",
    size: "sm",
    onClick: onAdd
  })), children);
}
function Editor({
  talent,
  onClose,
  onCreateMappe
}) {
  const [doc, setDoc] = React.useState('lebenslauf');
  const previewRef = React.useRef(null);
  const [scale, setScale] = React.useState(1);
  React.useEffect(() => {
    const el = previewRef.current;
    if (!el) return;
    const fit = () => {
      const w = el.clientWidth - 56;
      setScale(Math.min(1, w / 720));
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const [contact, setContact] = React.useState({
    name: talent.name,
    role: talent.role,
    email: talent.email,
    phone: talent.phone,
    location: talent.location,
    linkedin: talent.linkedin || '',
    src: talent.src
  });
  const [resume, setResume] = React.useState(() => JSON.parse(JSON.stringify(talent.resume || {
    summary: '',
    experience: [],
    education: [],
    skillGroups: []
  })));
  const [letter, setLetter] = React.useState(() => JSON.parse(JSON.stringify(talent.letter || {
    firma: '',
    ansprechpartner: '',
    strasse: '',
    plzOrt: '',
    betreff: '',
    anrede: 'Sehr geehrte Damen und Herren,',
    absaetze: [''],
    gruss: 'Mit freundlichen Grüßen'
  })));
  const setC = (k, v) => setContact(s => ({
    ...s,
    [k]: v
  }));
  const setExp = (i, k, v) => setResume(s => {
    const e = [...s.experience];
    e[i] = {
      ...e[i],
      [k]: v
    };
    return {
      ...s,
      experience: e
    };
  });
  const setEdu = (i, k, v) => setResume(s => {
    const e = [...s.education];
    e[i] = {
      ...e[i],
      [k]: v
    };
    return {
      ...s,
      education: e
    };
  });
  const addExp = () => setResume(s => ({
    ...s,
    experience: [{
      role: 'Neue Position',
      company: '',
      period: '',
      location: '',
      bullets: [''],
      skills: []
    }, ...s.experience]
  }));
  const delExp = i => setResume(s => ({
    ...s,
    experience: s.experience.filter((_, j) => j !== i)
  }));
  const setPara = (i, v) => setLetter(s => {
    const a = [...s.absaetze];
    a[i] = v;
    return {
      ...s,
      absaetze: a
    };
  });
  const addPara = () => setLetter(s => ({
    ...s,
    absaetze: [...s.absaetze, '']
  }));
  const seg = (id, label) => /*#__PURE__*/React.createElement("button", {
    onClick: () => setDoc(id),
    style: {
      flex: 1,
      padding: '8px 10px',
      border: 'none',
      cursor: 'pointer',
      borderRadius: 'var(--radius-sm)',
      fontFamily: 'var(--font-mono)',
      fontSize: '12px',
      fontWeight: 600,
      background: doc === id ? 'var(--surface-card)' : 'transparent',
      color: doc === id ? 'var(--text-heading)' : 'var(--text-soft)',
      boxShadow: doc === id ? 'var(--shadow-xs)' : 'none'
    }
  }, label);
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      gap: '14px'
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: onClose,
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '7px',
      alignSelf: 'flex-start',
      background: 'none',
      border: 'none',
      cursor: 'pointer',
      fontFamily: 'var(--font-mono)',
      fontSize: '12px',
      color: 'var(--text-muted)',
      padding: 0
    }
  }, /*#__PURE__*/React.createElement(ED.Icon, {
    name: "arrowLeft",
    size: 14
  }), " Zur\xFCck zum Profil"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '380px 1fr',
      gap: '20px',
      flex: 1,
      minHeight: 0,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      minHeight: 0,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: '4px',
      background: 'var(--surface-sunk)',
      borderRadius: 'var(--radius-md)',
      padding: '4px',
      marginBottom: '16px'
    }
  }, seg('lebenslauf', 'Lebenslauf'), seg('anschreiben', 'Anschreiben')), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      overflowY: 'auto',
      paddingRight: '8px'
    }
  }, /*#__PURE__*/React.createElement(FormGroup, {
    title: "Kontakt / Header"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: '10px'
    }
  }, /*#__PURE__*/React.createElement(ED.Input, {
    label: "Name",
    value: contact.name,
    onChange: e => setC('name', e.target.value),
    wrapStyle: {
      gridColumn: '1 / -1'
    }
  }), /*#__PURE__*/React.createElement(ED.Input, {
    label: "Rolle",
    value: contact.role,
    onChange: e => setC('role', e.target.value),
    wrapStyle: {
      gridColumn: '1 / -1'
    }
  }), /*#__PURE__*/React.createElement(ED.Input, {
    label: "E-Mail",
    value: contact.email,
    onChange: e => setC('email', e.target.value)
  }), /*#__PURE__*/React.createElement(ED.Input, {
    label: "Telefon",
    value: contact.phone,
    onChange: e => setC('phone', e.target.value)
  }), /*#__PURE__*/React.createElement(ED.Input, {
    label: "Ort",
    value: contact.location,
    onChange: e => setC('location', e.target.value)
  }), /*#__PURE__*/React.createElement(ED.Input, {
    label: "LinkedIn",
    value: contact.linkedin,
    onChange: e => setC('linkedin', e.target.value)
  }))), doc === 'lebenslauf' ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(FormGroup, {
    title: "Profil"
  }, /*#__PURE__*/React.createElement(ED.Textarea, {
    rows: 4,
    value: resume.summary,
    onChange: e => setResume(s => ({
      ...s,
      summary: e.target.value
    }))
  })), /*#__PURE__*/React.createElement(FormGroup, {
    title: "Berufserfahrung",
    onAdd: addExp
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: '12px'
    }
  }, resume.experience.map((e, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-md)',
      padding: '12px',
      background: 'var(--surface-subtle)',
      display: 'flex',
      flexDirection: 'column',
      gap: '9px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'flex-end',
      marginBottom: '-4px'
    }
  }, /*#__PURE__*/React.createElement(ED.IconButton, {
    icon: "trash",
    label: "Entfernen",
    variant: "ghost",
    size: "sm",
    onClick: () => delExp(i)
  })), /*#__PURE__*/React.createElement(ED.Input, {
    label: "Position",
    value: e.role,
    onChange: ev => setExp(i, 'role', ev.target.value)
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: '9px'
    }
  }, /*#__PURE__*/React.createElement(ED.Input, {
    label: "Firma",
    value: e.company,
    onChange: ev => setExp(i, 'company', ev.target.value)
  }), /*#__PURE__*/React.createElement(ED.Input, {
    label: "Zeitraum",
    value: e.period,
    onChange: ev => setExp(i, 'period', ev.target.value)
  })), /*#__PURE__*/React.createElement(ED.Textarea, {
    label: "Aufgaben (eine pro Zeile)",
    rows: 3,
    value: e.bullets.join('\n'),
    onChange: ev => setExp(i, 'bullets', ev.target.value.split('\n'))
  }))))), /*#__PURE__*/React.createElement(FormGroup, {
    title: "Ausbildung"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: '10px'
    }
  }, resume.education.map((e, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: '9px',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-md)',
      padding: '12px',
      background: 'var(--surface-subtle)'
    }
  }, /*#__PURE__*/React.createElement(ED.Input, {
    label: "Abschluss",
    value: e.degree,
    onChange: ev => setEdu(i, 'degree', ev.target.value),
    wrapStyle: {
      gridColumn: '1 / -1'
    }
  }), /*#__PURE__*/React.createElement(ED.Input, {
    label: "Institution",
    value: e.school,
    onChange: ev => setEdu(i, 'school', ev.target.value)
  }), /*#__PURE__*/React.createElement(ED.Input, {
    label: "Zeitraum",
    value: e.period,
    onChange: ev => setEdu(i, 'period', ev.target.value)
  })))))) : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(FormGroup, {
    title: "Empf\xE4nger"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: '10px'
    }
  }, /*#__PURE__*/React.createElement(ED.Input, {
    label: "Firma",
    value: letter.firma,
    onChange: e => setLetter(s => ({
      ...s,
      firma: e.target.value
    })),
    wrapStyle: {
      gridColumn: '1 / -1'
    }
  }), /*#__PURE__*/React.createElement(ED.Input, {
    label: "Ansprechpartner:in",
    value: letter.ansprechpartner,
    onChange: e => setLetter(s => ({
      ...s,
      ansprechpartner: e.target.value
    })),
    wrapStyle: {
      gridColumn: '1 / -1'
    }
  }), /*#__PURE__*/React.createElement(ED.Input, {
    label: "Stra\xDFe",
    value: letter.strasse,
    onChange: e => setLetter(s => ({
      ...s,
      strasse: e.target.value
    }))
  }), /*#__PURE__*/React.createElement(ED.Input, {
    label: "PLZ & Ort",
    value: letter.plzOrt,
    onChange: e => setLetter(s => ({
      ...s,
      plzOrt: e.target.value
    }))
  }))), /*#__PURE__*/React.createElement(FormGroup, {
    title: "Inhalt"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: '10px'
    }
  }, /*#__PURE__*/React.createElement(ED.Input, {
    label: "Betreff",
    value: letter.betreff,
    onChange: e => setLetter(s => ({
      ...s,
      betreff: e.target.value
    }))
  }), /*#__PURE__*/React.createElement(ED.Input, {
    label: "Anrede",
    value: letter.anrede,
    onChange: e => setLetter(s => ({
      ...s,
      anrede: e.target.value
    }))
  }))), /*#__PURE__*/React.createElement(FormGroup, {
    title: "Abs\xE4tze",
    onAdd: addPara
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: '9px'
    }
  }, letter.absaetze.map((p, i) => /*#__PURE__*/React.createElement(ED.Textarea, {
    key: i,
    rows: 3,
    value: p,
    onChange: e => setPara(i, e.target.value)
  }))))))), /*#__PURE__*/React.createElement("div", {
    style: {
      background: 'var(--surface-page)',
      borderRadius: 'var(--radius-lg)',
      border: '1px solid var(--border)',
      display: 'flex',
      flexDirection: 'column',
      minHeight: 0,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '12px 16px',
      borderBottom: '1px solid var(--border)',
      flexShrink: 0
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '8px',
      fontFamily: 'var(--font-mono)',
      fontSize: '11px',
      color: 'var(--text-muted)'
    }
  }, /*#__PURE__*/React.createElement(ED.Icon, {
    name: "eye",
    size: 14
  }), " Live-Vorschau \xB7 ", doc === 'lebenslauf' ? 'Lebenslauf' : 'Anschreiben'), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: '8px'
    }
  }, /*#__PURE__*/React.createElement(ED.Button, {
    size: "sm",
    variant: "outline",
    iconLeft: /*#__PURE__*/React.createElement(ED.Icon, {
      name: "download",
      size: 14
    })
  }, "PDF"), /*#__PURE__*/React.createElement(ED.Button, {
    size: "sm",
    variant: "primary",
    iconRight: /*#__PURE__*/React.createElement(ED.Icon, {
      name: "arrowRight",
      size: 14
    }),
    onClick: onCreateMappe
  }, "Zur Mappe"))), /*#__PURE__*/React.createElement("div", {
    ref: previewRef,
    style: {
      flex: 1,
      overflowY: 'auto',
      padding: '28px',
      display: 'flex',
      justifyContent: 'center'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      zoom: scale
    }
  }, doc === 'lebenslauf' ? /*#__PURE__*/React.createElement(ResumeDoc, {
    contact: contact,
    resume: resume
  }) : /*#__PURE__*/React.createElement(LetterDoc, {
    contact: contact,
    letter: letter
  }))))));
}
Object.assign(window, {
  Editor
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/recruiting/Editor.jsx", error: String((e && e.message) || e) }); }

// ui_kits/recruiting/MappeModal.jsx
try { (() => {
/* MappeModal — assemble a Bewerbungsmappe: recipient + Lebenslauf + Anhänge + Anschreiben.
   This is the flow the old "3 Kacheln" should have been. */
const MM = window.BewerbungstoolDesignSystem_a75119;
function MappeModal({
  talent,
  onClose
}) {
  const [picked, setPicked] = React.useState(() => new Set(talent.attachments.map(a => a.id)));
  const [letter, setLetter] = React.useState(true);
  const toggle = id => setPicked(s => {
    const n = new Set(s);
    n.has(id) ? n.delete(id) : n.add(id);
    return n;
  });
  const count = (talent.resume ? 1 : 0) + (letter ? 1 : 0) + picked.size;
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    onClick: onClose,
    style: {
      position: 'fixed',
      inset: 0,
      background: 'rgba(8,11,18,0.45)',
      backdropFilter: 'blur(2px)',
      zIndex: 50,
      animation: 'fadeIn .2s ease'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'fixed',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      zIndex: 51,
      width: 'min(880px, 94vw)',
      maxHeight: '90vh',
      display: 'flex',
      flexDirection: 'column',
      background: 'var(--surface-card)',
      borderRadius: 'var(--radius-xl)',
      boxShadow: 'var(--shadow-lg)',
      overflow: 'hidden',
      animation: 'popIn .24s cubic-bezier(0.16,1,0.3,1)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: '13px',
      padding: '18px 22px',
      borderBottom: '1px solid var(--border)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: '38px',
      height: '38px',
      borderRadius: 'var(--radius-md)',
      background: 'var(--accent)',
      color: '#fff',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center'
    }
  }, /*#__PURE__*/React.createElement(MM.Icon, {
    name: "send",
    size: 18
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-display)',
      fontSize: '17px',
      fontWeight: 700,
      color: 'var(--text-heading)'
    }
  }, "Bewerbungsmappe erstellen"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '12.5px',
      color: 'var(--text-soft)'
    }
  }, "f\xFCr ", talent.name)), /*#__PURE__*/React.createElement(MM.IconButton, {
    icon: "x",
    label: "Schlie\xDFen",
    variant: "ghost",
    onClick: onClose
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      overflowY: 'auto',
      padding: '20px 22px',
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: '20px',
      alignItems: 'start'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: '13px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: '10px',
      letterSpacing: '0.12em',
      textTransform: 'uppercase',
      color: 'var(--text-soft)'
    }
  }, "Empf\xE4nger"), /*#__PURE__*/React.createElement(MM.Input, {
    label: "Firma",
    icon: "building",
    defaultValue: "Aurora Systems GmbH"
  }), /*#__PURE__*/React.createElement(MM.Input, {
    label: "Stelle",
    icon: "briefcase",
    defaultValue: "Senior C++ Engineer"
  }), /*#__PURE__*/React.createElement(MM.Input, {
    label: "Ansprechpartner:in",
    icon: "user",
    defaultValue: "Personalabteilung"
  }), /*#__PURE__*/React.createElement(MM.Input, {
    label: "PLZ & Ort",
    icon: "pin",
    defaultValue: "10115 Berlin"
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: '13px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: '10px',
      letterSpacing: '0.12em',
      textTransform: 'uppercase',
      color: 'var(--text-soft)'
    }
  }, "Inhalt der Mappe"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: '11px',
      padding: '11px 13px',
      border: '1px solid var(--accent-border)',
      borderRadius: 'var(--radius-md)',
      background: 'var(--accent-soft)'
    }
  }, /*#__PURE__*/React.createElement(MM.Icon, {
    name: "fileText",
    size: 17,
    style: {
      color: 'var(--accent-strong)'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '13px',
      fontWeight: 600,
      color: 'var(--text-heading)'
    }
  }, "Lebenslauf"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: '10.5px',
      color: 'var(--accent-strong)'
    }
  }, "immer enthalten")), /*#__PURE__*/React.createElement(MM.Icon, {
    name: "check",
    size: 16,
    strokeWidth: 2.6,
    style: {
      color: 'var(--accent-strong)'
    }
  })), /*#__PURE__*/React.createElement("label", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: '11px',
      padding: '11px 13px',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-md)',
      cursor: 'pointer'
    }
  }, /*#__PURE__*/React.createElement(MM.Icon, {
    name: "edit",
    size: 17,
    style: {
      color: 'var(--text-muted)'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '13px',
      fontWeight: 600,
      color: 'var(--text-heading)'
    }
  }, "Anschreiben"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: '10.5px',
      color: 'var(--text-soft)'
    }
  }, "auf die Stelle zugeschnitten")), /*#__PURE__*/React.createElement(MM.Switch, {
    checked: letter,
    onChange: setLetter
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: '10px',
      letterSpacing: '0.1em',
      textTransform: 'uppercase',
      color: 'var(--text-soft)',
      marginTop: '2px'
    }
  }, "Anh\xE4nge verkn\xFCpfen"), talent.attachments.map(a => {
    const on = picked.has(a.id);
    return /*#__PURE__*/React.createElement("label", {
      key: a.id,
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: '11px',
        padding: '10px 13px',
        border: `1px solid ${on ? 'var(--accent-border)' : 'var(--border)'}`,
        borderRadius: 'var(--radius-md)',
        background: on ? 'var(--accent-soft)' : 'var(--surface-card)',
        cursor: 'pointer'
      }
    }, /*#__PURE__*/React.createElement(MM.Checkbox, {
      checked: on,
      onChange: () => toggle(a.id)
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        minWidth: 0
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: '13px',
        fontWeight: 500,
        color: 'var(--text-heading)',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis'
      }
    }, a.name), /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: 'var(--font-mono)',
        fontSize: '10.5px',
        color: 'var(--text-soft)'
      }
    }, a.tag)));
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '14px 22px',
      borderTop: '1px solid var(--border)',
      background: 'var(--surface-subtle)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: '12px',
      color: 'var(--text-muted)'
    }
  }, count, " Dokumente \xB7 1 PDF"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: '10px'
    }
  }, /*#__PURE__*/React.createElement(MM.Button, {
    variant: "ghost",
    onClick: onClose
  }, "Abbrechen"), /*#__PURE__*/React.createElement(MM.Button, {
    variant: "primary",
    iconRight: /*#__PURE__*/React.createElement(MM.Icon, {
      name: "arrowRight",
      size: 15
    }),
    onClick: onClose
  }, "Mappe senden")))));
}
Object.assign(window, {
  MappeModal
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/recruiting/MappeModal.jsx", error: String((e && e.message) || e) }); }

// ui_kits/recruiting/PipelineBoard.jsx
try { (() => {
/* PipelineBoard — Kanban of BEWERBUNGEN (applications) by stage. */
const PB = window.BewerbungstoolDesignSystem_a75119;
function KanbanCard({
  app,
  talent,
  onOpen
}) {
  const [hover, setHover] = React.useState(false);
  return /*#__PURE__*/React.createElement("div", {
    onClick: () => onOpen(talent.id),
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
      gap: '8px',
      marginBottom: '9px'
    }
  }, /*#__PURE__*/React.createElement(PB.Icon, {
    name: "building",
    size: 14,
    style: {
      color: 'var(--text-soft)'
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-display)',
      fontSize: '13.5px',
      fontWeight: 700,
      color: 'var(--text-heading)',
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis'
    }
  }, app.company)), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '12px',
      color: 'var(--text-muted)',
      marginBottom: '11px',
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis'
    }
  }, app.role), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: '7px',
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement(PB.Avatar, {
    name: talent.name,
    src: talent.src,
    size: "xs"
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: '11px',
      color: 'var(--text-soft)',
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis'
    }
  }, talent.me ? 'Ich' : talent.name.split(' ')[0])), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: '12px',
      fontWeight: 600,
      color: app.score >= 80 ? 'var(--success)' : 'var(--text-muted)'
    }
  }, app.score, "%")));
}
function PipelineBoard({
  apps,
  talents,
  onOpen
}) {
  const order = window.STAGES_ORDER;
  const byId = Object.fromEntries(talents.map(t => [t.id, t]));
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: `repeat(${order.length}, minmax(210px, 1fr))`,
      gap: '14px',
      alignItems: 'start',
      height: '100%'
    }
  }, order.map(stage => {
    const list = apps.filter(a => a.status === stage);
    const meta = PB.STAGES[stage];
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
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
        color: 'var(--text-muted)'
      }
    }, window.STAGE_LABELS[stage]), /*#__PURE__*/React.createElement("span", {
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
        gap: '10px'
      }
    }, list.map(a => /*#__PURE__*/React.createElement(KanbanCard, {
      key: a.id,
      app: a,
      talent: byId[a.talentId],
      onOpen: onOpen
    })), list.length === 0 && /*#__PURE__*/React.createElement("div", {
      style: {
        border: '1.5px dashed var(--border-strong)',
        borderRadius: 'var(--radius-md)',
        padding: '16px',
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
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/recruiting/PipelineBoard.jsx", error: String((e && e.message) || e) }); }

// ui_kits/recruiting/TalentProfile.jsx
try { (() => {
/* TalentProfile — the core screen. A talent (Ich first) with three tabs:
   Lebenslauf (editable CV) · Anhänge (linkable docs) · Bewerbungen. */
const TP = window.BewerbungstoolDesignSystem_a75119;
function EditableSection({
  icon,
  title,
  onEdit,
  children
}) {
  const [hover, setHover] = React.useState(false);
  return /*#__PURE__*/React.createElement("section", {
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false),
    style: {
      marginBottom: '26px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: '9px',
      marginBottom: '14px'
    }
  }, /*#__PURE__*/React.createElement(TP.Icon, {
    name: icon,
    size: 15,
    style: {
      color: 'var(--accent)'
    }
  }), /*#__PURE__*/React.createElement("h3", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: '11px',
      fontWeight: 600,
      letterSpacing: '0.14em',
      textTransform: 'uppercase',
      color: 'var(--text-muted)',
      margin: 0
    }
  }, title), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1,
      height: '1px',
      background: 'var(--border)'
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      opacity: hover ? 1 : 0,
      transition: 'opacity var(--dur-fast)'
    }
  }, /*#__PURE__*/React.createElement(TP.IconButton, {
    icon: "edit",
    label: "Bearbeiten",
    variant: "ghost",
    size: "sm",
    onClick: onEdit
  }))), children);
}

/* ---- Lebenslauf tab ---- */
function ResumeTab({
  talent,
  onEdit,
  onCreateMappe
}) {
  const r = talent.resume;
  if (!r) {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        textAlign: 'center',
        padding: '60px 20px',
        color: 'var(--text-soft)'
      }
    }, /*#__PURE__*/React.createElement(TP.Icon, {
      name: "fileText",
      size: 28,
      style: {
        color: 'var(--border-strong)',
        margin: '0 auto 12px'
      }
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: '14px',
        fontWeight: 600,
        color: 'var(--text-muted)'
      }
    }, "Noch kein Lebenslauf hinterlegt"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: '13px',
        marginTop: '4px',
        marginBottom: '16px'
      }
    }, "Lege f\xFCr ", talent.name.split(' ')[0], " einen Lebenslauf an."), /*#__PURE__*/React.createElement(TP.Button, {
      variant: "primary",
      size: "sm",
      iconLeft: /*#__PURE__*/React.createElement(TP.Icon, {
        name: "plus",
        size: 15
      }),
      onClick: onEdit
    }, "Lebenslauf anlegen"));
  }
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1fr 300px',
      gap: '24px',
      alignItems: 'start'
    }
  }, /*#__PURE__*/React.createElement(TP.Card, {
    style: {
      padding: '32px 34px'
    },
    bodyStyle: {
      padding: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '32px 34px'
    }
  }, /*#__PURE__*/React.createElement(EditableSection, {
    icon: "user",
    title: "Profil",
    onEdit: onEdit
  }, /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: '14.5px',
      lineHeight: 1.65,
      color: 'var(--text-body)',
      margin: 0
    }
  }, r.summary)), /*#__PURE__*/React.createElement(EditableSection, {
    icon: "briefcase",
    title: "Berufserfahrung",
    onEdit: onEdit
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      paddingLeft: '22px'
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
  }), r.experience.map((e, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      position: 'relative',
      marginBottom: i === r.experience.length - 1 ? 0 : '20px'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      left: '-21px',
      top: '4px',
      width: '10px',
      height: '10px',
      borderRadius: '50%',
      background: i === 0 ? 'var(--accent)' : '#fff',
      border: `2px solid ${i === 0 ? 'var(--accent)' : 'var(--border-strong)'}`
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'baseline',
      gap: '10px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-display)',
      fontSize: '15.5px',
      fontWeight: 700,
      color: 'var(--text-heading)'
    }
  }, e.role), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: '11px',
      color: 'var(--text-soft)',
      whiteSpace: 'nowrap'
    }
  }, e.period)), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '13px',
      color: 'var(--accent-strong)',
      fontWeight: 600,
      margin: '2px 0 8px'
    }
  }, e.company, " \xB7 ", e.location), /*#__PURE__*/React.createElement("ul", {
    style: {
      margin: '0 0 9px',
      paddingLeft: '17px',
      display: 'flex',
      flexDirection: 'column',
      gap: '4px'
    }
  }, e.bullets.map((b, j) => /*#__PURE__*/React.createElement("li", {
    key: j,
    style: {
      fontSize: '13.5px',
      lineHeight: 1.55,
      color: 'var(--text-body)'
    }
  }, b))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: '6px',
      flexWrap: 'wrap'
    }
  }, e.skills.map((s, j) => /*#__PURE__*/React.createElement(TP.Badge, {
    key: j,
    variant: "subtle",
    size: "sm"
  }, s))))))), /*#__PURE__*/React.createElement(EditableSection, {
    icon: "cap",
    title: "Ausbildung",
    onEdit: onEdit
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: '12px'
    }
  }, r.education.map((e, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      gap: '12px'
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '14px',
      fontWeight: 700,
      color: 'var(--text-heading)'
    }
  }, e.degree), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '12.5px',
      color: 'var(--text-muted)',
      marginTop: '1px'
    }
  }, e.school, " \xB7 ", e.note)), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: '11px',
      color: 'var(--text-soft)',
      whiteSpace: 'nowrap'
    }
  }, e.period))))), /*#__PURE__*/React.createElement("section", null, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: '9px',
      marginBottom: '14px'
    }
  }, /*#__PURE__*/React.createElement(TP.Icon, {
    name: "zap",
    size: 15,
    style: {
      color: 'var(--accent)'
    }
  }), /*#__PURE__*/React.createElement("h3", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: '11px',
      fontWeight: 600,
      letterSpacing: '0.14em',
      textTransform: 'uppercase',
      color: 'var(--text-muted)',
      margin: 0
    }
  }, "Kompetenzen"), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1,
      height: '1px',
      background: 'var(--border)'
    }
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: '12px'
    }
  }, r.skillGroups.map((g, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      display: 'flex',
      gap: '12px',
      alignItems: 'baseline'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: '78px',
      flexShrink: 0,
      fontFamily: 'var(--font-mono)',
      fontSize: '11px',
      color: 'var(--text-soft)'
    }
  }, g.label), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: '6px',
      flexWrap: 'wrap'
    }
  }, g.items.map((s, j) => /*#__PURE__*/React.createElement(TP.Badge, {
    key: j,
    variant: j === 0 ? 'soft' : 'outline',
    size: "sm"
  }, s))))))))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: '14px',
      position: 'sticky',
      top: 0
    }
  }, /*#__PURE__*/React.createElement(TP.Card, null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: '10px',
      letterSpacing: '0.12em',
      textTransform: 'uppercase',
      color: 'var(--text-soft)',
      marginBottom: '10px'
    }
  }, "Lebenslauf"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: '8px'
    }
  }, /*#__PURE__*/React.createElement(TP.Button, {
    variant: "primary",
    block: true,
    iconLeft: /*#__PURE__*/React.createElement(TP.Icon, {
      name: "send",
      size: 15
    }),
    onClick: onCreateMappe
  }, "Bewerbungsmappe erstellen"), /*#__PURE__*/React.createElement(TP.Button, {
    variant: "outline",
    block: true,
    iconLeft: /*#__PURE__*/React.createElement(TP.Icon, {
      name: "edit",
      size: 15
    }),
    onClick: onEdit
  }, "Lebenslauf bearbeiten"), /*#__PURE__*/React.createElement(TP.Button, {
    variant: "ghost",
    block: true,
    iconLeft: /*#__PURE__*/React.createElement(TP.Icon, {
      name: "download",
      size: 15
    })
  }, "Als PDF exportieren"))), /*#__PURE__*/React.createElement(TP.Card, null, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: '10px'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: '10px',
      letterSpacing: '0.12em',
      textTransform: 'uppercase',
      color: 'var(--text-soft)'
    }
  }, "Verkn\xFCpfte Anh\xE4nge"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: '11px',
      color: 'var(--text-soft)'
    }
  }, talent.attachments.length)), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: '7px'
    }
  }, talent.attachments.map(a => /*#__PURE__*/React.createElement("div", {
    key: a.id,
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: '9px',
      padding: '8px 10px',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-md)',
      background: 'var(--surface-subtle)'
    }
  }, /*#__PURE__*/React.createElement(TP.Icon, {
    name: "paperclip",
    size: 14,
    style: {
      color: 'var(--accent)'
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1,
      fontSize: '12px',
      fontWeight: 500,
      color: 'var(--text-heading)',
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis'
    }
  }, a.name)))))));
}

/* ---- Anhänge tab — documents that link to applications ---- */
function AttachmentsTab({
  talent,
  apps
}) {
  const usage = atId => apps.filter(a => (a.attachments || []).includes(atId));
  return /*#__PURE__*/React.createElement(TP.Card, {
    pad: false
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '14px 18px',
      borderBottom: '1px solid var(--border)'
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-display)',
      fontSize: '15px',
      fontWeight: 700,
      color: 'var(--text-heading)'
    }
  }, "Dokumente & Anh\xE4nge"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '12px',
      color: 'var(--text-soft)',
      marginTop: '1px'
    }
  }, "Einmal hochladen, mit beliebigen Bewerbungen verkn\xFCpfen")), /*#__PURE__*/React.createElement(TP.Button, {
    variant: "ink",
    size: "sm",
    iconLeft: /*#__PURE__*/React.createElement(TP.Icon, {
      name: "upload",
      size: 14
    })
  }, "Hochladen")), talent.attachments.length === 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '40px',
      textAlign: 'center',
      fontSize: '13px',
      color: 'var(--text-soft)'
    }
  }, "Noch keine Anh\xE4nge."), talent.attachments.map(a => {
    const used = usage(a.id);
    return /*#__PURE__*/React.createElement("div", {
      key: a.id,
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: '14px',
        padding: '14px 18px',
        borderBottom: '1px solid var(--border)'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        width: '38px',
        height: '38px',
        flexShrink: 0,
        borderRadius: 'var(--radius-md)',
        background: 'var(--accent-soft)',
        color: 'var(--accent-strong)',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center'
      }
    }, /*#__PURE__*/React.createElement(TP.Icon, {
      name: "fileText",
      size: 18
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        minWidth: 0
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: '14px',
        fontWeight: 600,
        color: 'var(--text-heading)'
      }
    }, a.name, /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: 'var(--font-mono)',
        fontSize: '10px',
        color: 'var(--accent-strong)',
        marginLeft: '8px'
      }
    }, a.tag)), /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: 'var(--font-mono)',
        fontSize: '11px',
        color: 'var(--text-soft)',
        marginTop: '1px'
      }
    }, a.sub)), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        minWidth: 0
      }
    }, used.length === 0 ? /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: 'var(--font-mono)',
        fontSize: '11px',
        color: 'var(--text-soft)'
      }
    }, "nicht verkn\xFCpft") : used.map(u => /*#__PURE__*/React.createElement(TP.Badge, {
      key: u.id,
      variant: "subtle",
      size: "sm",
      icon: /*#__PURE__*/React.createElement(TP.Icon, {
        name: "paperclip",
        size: 10
      })
    }, u.company.split(' ')[0]))), /*#__PURE__*/React.createElement(TP.IconButton, {
      icon: "more",
      label: "Mehr",
      variant: "ghost",
      size: "sm"
    }));
  }));
}

/* ---- Bewerbungen tab ---- */
function TalentApplications({
  apps,
  onCreateMappe
}) {
  return /*#__PURE__*/React.createElement(TP.Card, {
    pad: false,
    title: "Bewerbungen",
    subtitle: "Alle Mappen dieses Talents",
    action: /*#__PURE__*/React.createElement(TP.Button, {
      size: "sm",
      variant: "primary",
      iconLeft: /*#__PURE__*/React.createElement(TP.Icon, {
        name: "plus",
        size: 14
      }),
      onClick: onCreateMappe
    }, "Neue Mappe")
  }, apps.length === 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '40px',
      textAlign: 'center',
      fontSize: '13px',
      color: 'var(--text-soft)'
    }
  }, "Noch keine Bewerbungen."), apps.map(a => /*#__PURE__*/React.createElement("div", {
    key: a.id,
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: '14px',
      padding: '14px 18px',
      borderBottom: '1px solid var(--border)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: '38px',
      height: '38px',
      flexShrink: 0,
      borderRadius: 'var(--radius-md)',
      background: 'var(--surface-sunk)',
      color: 'var(--text-muted)',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center'
    }
  }, /*#__PURE__*/React.createElement(TP.Icon, {
    name: "building",
    size: 18
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-display)',
      fontSize: '14.5px',
      fontWeight: 700,
      color: 'var(--text-heading)'
    }
  }, a.company), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '12.5px',
      color: 'var(--text-muted)',
      marginTop: '1px'
    }
  }, a.role, " \xB7 ", a.location)), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: '6px'
    }
  }, a.anschreiben && /*#__PURE__*/React.createElement(TP.Badge, {
    variant: "subtle",
    size: "sm",
    icon: /*#__PURE__*/React.createElement(TP.Icon, {
      name: "fileText",
      size: 10
    })
  }, "Anschreiben"), /*#__PURE__*/React.createElement(TP.Badge, {
    variant: "subtle",
    size: "sm",
    icon: /*#__PURE__*/React.createElement(TP.Icon, {
      name: "paperclip",
      size: 10
    })
  }, (a.attachments || []).length)), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'flex-end',
      gap: '5px',
      width: '150px'
    }
  }, /*#__PURE__*/React.createElement(TP.StatusBadge, {
    status: a.status,
    size: "sm"
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: '11px',
      color: 'var(--text-soft)'
    }
  }, a.next)))));
}
function TalentProfile({
  talent,
  apps,
  onBack,
  onEdit,
  onCreateMappe
}) {
  const [tab, setTab] = React.useState('lebenslauf');
  const tabs = [{
    id: 'lebenslauf',
    label: 'Lebenslauf'
  }, {
    id: 'anhaenge',
    label: 'Anhänge',
    count: talent.attachments.length
  }, {
    id: 'bewerbungen',
    label: 'Bewerbungen',
    count: apps.length
  }];
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: '18px'
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: onBack,
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '7px',
      alignSelf: 'flex-start',
      background: 'none',
      border: 'none',
      cursor: 'pointer',
      fontFamily: 'var(--font-mono)',
      fontSize: '12px',
      color: 'var(--text-muted)',
      padding: 0
    }
  }, /*#__PURE__*/React.createElement(TP.Icon, {
    name: "arrowLeft",
    size: 14
  }), " Talente"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: '18px',
      padding: '22px 26px',
      borderRadius: 'var(--radius-lg)',
      background: 'linear-gradient(160deg, var(--ink-850), var(--ink-900))',
      color: '#fff'
    }
  }, /*#__PURE__*/React.createElement(TP.Avatar, {
    name: talent.name,
    src: talent.src,
    size: 72,
    radius: "var(--radius-lg)",
    ring: talent.me
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: '10px'
    }
  }, /*#__PURE__*/React.createElement("h2", {
    style: {
      fontFamily: 'var(--font-display)',
      fontSize: '26px',
      fontWeight: 700,
      letterSpacing: '-0.025em',
      margin: 0
    }
  }, talent.name), talent.me && /*#__PURE__*/React.createElement(TP.Badge, {
    variant: "light",
    size: "sm"
  }, "Ich")), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '14px',
      color: 'var(--sidebar-muted)',
      marginTop: '3px'
    }
  }, talent.role, " \xB7 ", talent.headline), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: '8px',
      marginTop: '12px',
      flexWrap: 'wrap'
    }
  }, /*#__PURE__*/React.createElement(TP.Badge, {
    variant: "glass",
    size: "sm",
    icon: /*#__PURE__*/React.createElement(TP.Icon, {
      name: "pin",
      size: 11
    })
  }, talent.location), /*#__PURE__*/React.createElement(TP.Badge, {
    variant: "glass",
    size: "sm",
    icon: /*#__PURE__*/React.createElement(TP.Icon, {
      name: "clock",
      size: 11
    })
  }, talent.availability), /*#__PURE__*/React.createElement(TP.Badge, {
    variant: "glass",
    size: "sm",
    icon: /*#__PURE__*/React.createElement(TP.Icon, {
      name: "mail",
      size: 11
    })
  }, talent.email))), /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: 'right',
      flexShrink: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-display)',
      fontSize: '30px',
      fontWeight: 700,
      color: 'var(--accent-on-dark)',
      lineHeight: 1
    }
  }, talent.score, "%"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: '10px',
      letterSpacing: '0.1em',
      textTransform: 'uppercase',
      color: 'var(--sidebar-soft)',
      marginTop: '4px'
    }
  }, "Profil-St\xE4rke"))), /*#__PURE__*/React.createElement(TP.Tabs, {
    value: tab,
    onChange: setTab,
    tabs: tabs
  }), tab === 'lebenslauf' && /*#__PURE__*/React.createElement(ResumeTab, {
    talent: talent,
    onEdit: onEdit,
    onCreateMappe: onCreateMappe
  }), tab === 'anhaenge' && /*#__PURE__*/React.createElement(AttachmentsTab, {
    talent: talent,
    apps: apps
  }), tab === 'bewerbungen' && /*#__PURE__*/React.createElement(TalentApplications, {
    apps: apps,
    onCreateMappe: onCreateMappe
  }));
}
Object.assign(window, {
  TalentProfile
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/recruiting/TalentProfile.jsx", error: String((e && e.message) || e) }); }

// ui_kits/recruiting/VermittlerViews.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/* VermittlerViews — the agency backbone: Mandate, Platzierungen, Berichte. */
const VV = window.BewerbungstoolDesignSystem_a75119;
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
function PrioPill({
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
const PLACEMENT_TONE = {
  'Bezahlt': 'hired',
  'In Rechnung': 'offer',
  'Probezeit': 'interview'
};

/* ---------- Mandate: client search assignments ---------- */
function MandateView({
  clients,
  mandates
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
    return /*#__PURE__*/React.createElement(VV.Card, {
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
    }, /*#__PURE__*/React.createElement(VV.Icon, {
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
    }, k.industry, " \xB7 ", k.location, " \xB7 Kunde seit ", k.since)), /*#__PURE__*/React.createElement(VV.Badge, {
      variant: "subtle",
      size: "sm"
    }, ms.length, " Mandate")), ms.map(m => /*#__PURE__*/React.createElement("div", {
      key: m.id,
      style: {
        display: 'grid',
        gridTemplateColumns: 'minmax(0,1.5fr) 96px 104px 116px 116px',
        alignItems: 'center',
        gap: '14px',
        padding: '13px 18px',
        borderBottom: '1px solid var(--border)'
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
    }, /*#__PURE__*/React.createElement(VV.Icon, {
      name: "pin",
      size: 11
    }), m.location)), /*#__PURE__*/React.createElement(PrioPill, {
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
    }, /*#__PURE__*/React.createElement(VV.Icon, {
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
    }, m.status), /*#__PURE__*/React.createElement(VV.Icon, {
      name: "chevronRight",
      size: 15,
      style: {
        color: 'var(--text-soft)'
      }
    })))));
  }));
}

/* ---------- Platzierungen: booked placements + fees ---------- */
function PlatzierungenView({
  placements,
  kpis
}) {
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
  }, kpis.map((k, i) => /*#__PURE__*/React.createElement(VV.StatCard, _extends({
    key: i
  }, k)))), /*#__PURE__*/React.createElement(VV.Card, {
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
  }, "Status")), placements.map(p => /*#__PURE__*/React.createElement("div", {
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
  }, /*#__PURE__*/React.createElement(VV.Avatar, {
    name: p.candName,
    size: "sm"
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-display)',
      fontSize: '13.5px',
      fontWeight: 700,
      color: 'var(--text-heading)'
    }
  }, p.candName)), /*#__PURE__*/React.createElement("div", {
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
  }, p.candRole)), /*#__PURE__*/React.createElement("span", {
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
  }, /*#__PURE__*/React.createElement(VV.StatusBadge, {
    status: PLACEMENT_TONE[p.status],
    label: p.status,
    size: "sm"
  }))))));
}

/* ---------- Berichte: provision per client + mandate health + funnel ---------- */
function ReportsView({
  clients,
  mandates,
  placements,
  apps,
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
  const order = window.STAGES_ORDER;
  const maxStage = Math.max(...order.map(s => apps.filter(a => a.status === s).length), 1);
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
  }, kpis.map((k, i) => /*#__PURE__*/React.createElement(VV.StatCard, _extends({
    key: i
  }, k)))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1.4fr 1fr',
      gap: '16px'
    }
  }, /*#__PURE__*/React.createElement(VV.Card, {
    title: "Provision je Kunde",
    subtitle: "Gebuchte Vermittlungen Q2"
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
  })))))), /*#__PURE__*/React.createElement(VV.Card, {
    title: "Bewerbungs-Funnel",
    subtitle: "Kandidat:innen je Phase"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: '10px'
    }
  }, order.map(s => {
    const n = apps.filter(a => a.status === s).length;
    const meta = VV.STAGES[s];
    return /*#__PURE__*/React.createElement("div", {
      key: s,
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: '12px'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        width: '74px',
        fontFamily: 'var(--font-mono)',
        fontSize: '10.5px',
        color: 'var(--text-muted)',
        flexShrink: 0
      }
    }, window.STAGE_LABELS[s]), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        height: '20px',
        background: 'var(--surface-sunk)',
        borderRadius: 'var(--radius-sm)',
        overflow: 'hidden'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: `${n / maxStage * 100}%`,
        height: '100%',
        background: meta.color,
        borderRadius: 'var(--radius-sm)',
        minWidth: '6px'
      }
    })), /*#__PURE__*/React.createElement("span", {
      style: {
        width: '20px',
        fontFamily: 'var(--font-mono)',
        fontSize: '12px',
        fontWeight: 600,
        color: 'var(--text-heading)',
        textAlign: 'right'
      }
    }, n));
  })))));
}
Object.assign(window, {
  MandateView,
  PlatzierungenView,
  ReportsView
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/recruiting/VermittlerViews.jsx", error: String((e && e.message) || e) }); }

// ui_kits/recruiting/Workspace.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/* Workspace — Übersicht (dashboard), Talente grid, Stellen, Postfach. */
const WS = window.BewerbungstoolDesignSystem_a75119;

/* ---------- Übersicht — agency-led, but my own applications stay front of mind ---------- */
function Dashboard({
  me,
  apps,
  vkpis,
  clients,
  mandates,
  onOpenTalent,
  onOpenPipeline,
  onOpenMandate
}) {
  const mine = apps.filter(a => a.talentId === 'me');
  const nextSteps = mine.filter(a => a.status === 'interview' || a.status === 'offer');
  const clientName = id => (clients.find(c => c.id === id) || {}).name || '';
  const topMandates = mandates.filter(m => m.status === 'aktiv').slice(0, 4);
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: '18px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: '16px',
      padding: '20px 24px',
      borderRadius: 'var(--radius-lg)',
      background: 'linear-gradient(160deg, var(--ink-850), var(--ink-900))',
      color: '#fff'
    }
  }, /*#__PURE__*/React.createElement(WS.Avatar, {
    name: me.name,
    src: me.src,
    size: 52,
    radius: "var(--radius-md)",
    ring: true
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-display)',
      fontSize: '20px',
      fontWeight: 700,
      letterSpacing: '-0.02em'
    }
  }, "Guten Tag, ", me.name.split(' ')[0], "."), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '13px',
      color: 'var(--sidebar-muted)',
      marginTop: '2px'
    }
  }, mandates.filter(m => m.status === 'aktiv').length, " aktive Mandate \xB7 ", nextSteps.length, " eigene Bewerbungen in Bewegung.")), /*#__PURE__*/React.createElement(WS.Button, {
    variant: "primary",
    iconLeft: /*#__PURE__*/React.createElement(WS.Icon, {
      name: "user",
      size: 15
    }),
    onClick: () => onOpenTalent('me')
  }, "Mein Profil")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(4, 1fr)',
      gap: '14px'
    }
  }, vkpis.map((k, i) => /*#__PURE__*/React.createElement(WS.StatCard, _extends({
    key: i
  }, k)))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: '16px',
      alignItems: 'start'
    }
  }, /*#__PURE__*/React.createElement(WS.Card, {
    title: "Aktive Mandate",
    subtitle: "Suchauftr\xE4ge mit Frist",
    action: /*#__PURE__*/React.createElement(WS.Button, {
      size: "sm",
      variant: "ghost",
      iconRight: /*#__PURE__*/React.createElement(WS.Icon, {
        name: "arrowRight",
        size: 14
      }),
      onClick: onOpenMandate
    }, "Alle"),
    pad: false
  }, topMandates.map(m => /*#__PURE__*/React.createElement("div", {
    key: m.id,
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: '13px',
      padding: '13px 18px',
      borderBottom: '1px solid var(--border)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: '36px',
      height: '36px',
      borderRadius: 'var(--radius-md)',
      background: 'var(--ink-900)',
      color: '#fff',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0
    }
  }, /*#__PURE__*/React.createElement(WS.Icon, {
    name: "briefcase",
    size: 16
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '13.5px',
      fontWeight: 700,
      color: 'var(--text-heading)',
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis'
    }
  }, m.role), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '11.5px',
      color: 'var(--text-soft)',
      marginTop: '1px'
    }
  }, clientName(m.clientId), " \xB7 ", m.submitted, " vorgeschlagen")), /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: 'right'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: '13px',
      fontWeight: 600,
      color: 'var(--accent-strong)'
    }
  }, m.fee), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: '10.5px',
      color: 'var(--text-soft)'
    }
  }, "bis ", m.deadline))))), /*#__PURE__*/React.createElement(WS.Card, {
    title: "Meine n\xE4chsten Schritte",
    subtitle: "Eigene Bewerbungen (Ich)",
    action: /*#__PURE__*/React.createElement(WS.Button, {
      size: "sm",
      variant: "ghost",
      iconRight: /*#__PURE__*/React.createElement(WS.Icon, {
        name: "arrowRight",
        size: 14
      }),
      onClick: onOpenPipeline
    }, "Pipeline"),
    pad: false
  }, nextSteps.map(a => /*#__PURE__*/React.createElement("div", {
    key: a.id,
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: '13px',
      padding: '13px 18px',
      borderBottom: '1px solid var(--border)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: '36px',
      height: '36px',
      borderRadius: 'var(--radius-md)',
      background: 'var(--surface-sunk)',
      color: 'var(--text-muted)',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0
    }
  }, /*#__PURE__*/React.createElement(WS.Icon, {
    name: "building",
    size: 17
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '14px',
      fontWeight: 700,
      color: 'var(--text-heading)'
    }
  }, a.company), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: '11px',
      color: 'var(--accent-strong)',
      marginTop: '1px'
    }
  }, a.next)), /*#__PURE__*/React.createElement(WS.StatusBadge, {
    status: a.status,
    size: "sm"
  }))), nextSteps.length === 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '30px',
      textAlign: 'center',
      fontSize: '13px',
      color: 'var(--text-soft)'
    }
  }, "Keine offenen Schritte."))));
}

/* ---------- Talente grid ---------- */
function TalentGrid({
  talents,
  apps,
  onOpen
}) {
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      marginBottom: '14px'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: '11px',
      letterSpacing: '0.1em',
      textTransform: 'uppercase',
      color: 'var(--text-soft)'
    }
  }, talents.length, " Talente"), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1
    }
  }), /*#__PURE__*/React.createElement(WS.Button, {
    size: "sm",
    variant: "outline",
    iconLeft: /*#__PURE__*/React.createElement(WS.Icon, {
      name: "plus",
      size: 14
    })
  }, "Talent hinzuf\xFCgen")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
      gap: '14px'
    }
  }, talents.map(t => {
    const n = apps.filter(a => a.talentId === t.id).length;
    return /*#__PURE__*/React.createElement(WS.Card, {
      key: t.id,
      style: {
        cursor: 'pointer',
        border: t.me ? '1px solid var(--accent-border)' : '1px solid var(--border)'
      },
      onClick: () => onOpen(t.id)
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: '13px'
      }
    }, /*#__PURE__*/React.createElement(WS.Avatar, {
      name: t.name,
      src: t.src,
      size: "lg",
      ring: t.me
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        minWidth: 0
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: '7px'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: 'var(--font-display)',
        fontSize: '16px',
        fontWeight: 700,
        color: 'var(--text-heading)'
      }
    }, t.name), t.me && /*#__PURE__*/React.createElement(WS.Badge, {
      variant: "soft",
      size: "sm"
    }, "Ich")), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: '12.5px',
        color: 'var(--text-muted)',
        marginTop: '1px',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis'
      }
    }, t.role))), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        gap: '6px',
        flexWrap: 'wrap',
        margin: '13px 0'
      }
    }, t.skills.slice(0, 3).map((s, i) => /*#__PURE__*/React.createElement(WS.Badge, {
      key: i,
      variant: "outline",
      size: "sm"
    }, s)), t.skills.length > 3 && /*#__PURE__*/React.createElement(WS.Badge, {
      variant: "subtle",
      size: "sm"
    }, "+", t.skills.length - 3)), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: '12px',
        borderTop: '1px solid var(--border)'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        fontFamily: 'var(--font-mono)',
        fontSize: '11px',
        color: 'var(--text-soft)'
      }
    }, /*#__PURE__*/React.createElement(WS.Icon, {
      name: "send",
      size: 12
    }), n, " Bewerbungen"), /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: 'var(--font-mono)',
        fontSize: '13px',
        fontWeight: 600,
        color: t.score >= 80 ? 'var(--success)' : 'var(--text-muted)'
      }
    }, t.score, "%")));
  })));
}

/* ---------- Stellen ---------- */
function JobsView({
  jobs
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
      gap: '16px'
    }
  }, jobs.map(j => /*#__PURE__*/React.createElement(WS.Card, {
    key: j.id
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
      fontSize: '16px',
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
  }, j.company)), /*#__PURE__*/React.createElement(WS.IconButton, {
    icon: "bookmark",
    label: "Merken",
    variant: j.saved ? 'accent' : 'ghost',
    size: "sm"
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: '8px',
      margin: '14px 0',
      flexWrap: 'wrap'
    }
  }, /*#__PURE__*/React.createElement(WS.MetaPill, {
    icon: "pin"
  }, j.location), /*#__PURE__*/React.createElement(WS.MetaPill, {
    icon: "trend",
    tone: "accent"
  }, j.salary)), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingTop: '12px',
      borderTop: '1px solid var(--border)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '6px',
      fontFamily: 'var(--font-mono)',
      fontSize: '12px',
      color: j.match >= 85 ? 'var(--success)' : 'var(--text-muted)',
      fontWeight: 600
    }
  }, /*#__PURE__*/React.createElement(WS.Icon, {
    name: "zap",
    size: 13
  }), j.match, "% Match"), /*#__PURE__*/React.createElement(WS.Button, {
    size: "sm",
    variant: "primary",
    iconRight: /*#__PURE__*/React.createElement(WS.Icon, {
      name: "arrowRight",
      size: 14
    })
  }, "Bewerben")))));
}

/* ---------- Postfach ---------- */
function Inbox({
  messages,
  apps,
  talents,
  onOpenTalent
}) {
  const appById = Object.fromEntries(apps.map(a => [a.id, a]));
  const talById = Object.fromEntries(talents.map(t => [t.id, t]));
  return /*#__PURE__*/React.createElement(WS.Card, {
    pad: false
  }, messages.map(m => {
    const app = appById[m.appId];
    const tal = app && talById[app.talentId];
    return /*#__PURE__*/React.createElement("div", {
      key: m.id,
      onClick: () => tal && onOpenTalent(tal.id),
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: '13px',
        padding: '14px 18px',
        borderBottom: '1px solid var(--border)',
        cursor: 'pointer',
        background: m.unread ? 'var(--accent-soft)' : 'transparent'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        width: '40px',
        height: '40px',
        flexShrink: 0,
        borderRadius: 'var(--radius-md)',
        background: 'var(--ink-900)',
        color: '#fff',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center'
      }
    }, /*#__PURE__*/React.createElement(WS.Icon, {
      name: "building",
      size: 18
    })), /*#__PURE__*/React.createElement("div", {
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
    }, m.from), m.unread && /*#__PURE__*/React.createElement("span", {
      style: {
        width: '7px',
        height: '7px',
        borderRadius: '50%',
        background: 'var(--accent)'
      }
    }), tal && /*#__PURE__*/React.createElement(WS.Badge, {
      variant: "subtle",
      size: "sm"
    }, tal.me ? 'Ich' : tal.name.split(' ')[0])), /*#__PURE__*/React.createElement("div", {
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
  Dashboard,
  TalentGrid,
  JobsView,
  Inbox
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/recruiting/Workspace.jsx", error: String((e && e.message) || e) }); }

// ui_kits/recruiting/app.jsx
try { (() => {
/* app.jsx — orchestrates the unified myJob workspace. Define-only; render is in index.html. */
const A = window.BewerbungstoolDesignSystem_a75119;
const TITLES = {
  uebersicht: ['Übersicht', 'Vermittlung & eigene Bewerbungen auf einen Blick'],
  mandate: ['Mandate', 'Suchaufträge je Kunde mit Provision und Frist'],
  pool: ['Talent-Pool', 'Wen du vertrittst — Ich zuerst'],
  bewerbungen: ['Bewerbungen', 'Pipeline aller Vorschläge und eigenen Mappen'],
  platzierungen: ['Platzierungen', 'Gebuchte Vermittlungen und Provision'],
  berichte: ['Berichte', 'Provision, Funnel und Auslastung'],
  postfach: ['Postfach', 'Nachrichten von Kunden und Firmen']
};
function App() {
  const [nav, setNav] = React.useState('uebersicht');
  const [search, setSearch] = React.useState('');
  const [openTalent, setOpenTalent] = React.useState(null);
  const [mappeFor, setMappeFor] = React.useState(null);
  const [editing, setEditing] = React.useState(null);
  const talents = window.TALENTS;
  const apps = window.APPLICATIONS;
  const me = talents.find(t => t.me);
  const unread = window.MESSAGES.filter(m => m.unread).length;
  const badges = {
    bewerbungen: apps.filter(a => a.status !== 'rejected' && a.status !== 'hired').length,
    postfach: unread || undefined
  };
  const goTalent = id => setOpenTalent(id);
  const back = () => setOpenTalent(null);
  const talent = openTalent && talents.find(t => t.id === openTalent);
  const talentApps = id => apps.filter(a => a.talentId === id);
  const editTalent = editing && talents.find(t => t.id === editing);

  // editor takes over the whole canvas
  if (editTalent) {
    return /*#__PURE__*/React.createElement(window.AppShell, {
      active: "pool",
      onNav: n => {
        setEditing(null);
        setOpenTalent(null);
        setNav(n);
      },
      me: me,
      talentCount: talents.length,
      search: search,
      onSearch: setSearch,
      title: editTalent.me ? 'Meine Dokumente' : editTalent.name,
      subtitle: "Lebenslauf & Anschreiben bearbeiten",
      badges: badges
    }, /*#__PURE__*/React.createElement(window.Editor, {
      talent: editTalent,
      onClose: () => setEditing(null),
      onCreateMappe: () => {
        setMappeFor(editTalent);
      }
    }), mappeFor && /*#__PURE__*/React.createElement(window.MappeModal, {
      talent: mappeFor,
      onClose: () => setMappeFor(null)
    }));
  }

  // a talent profile takes over the whole canvas regardless of nav
  let title, subtitle, body;
  if (talent) {
    title = talent.me ? 'Mein Profil' : talent.name;
    subtitle = 'Lebenslauf, Anhänge und Bewerbungen';
    body = /*#__PURE__*/React.createElement(window.TalentProfile, {
      talent: talent,
      apps: talentApps(talent.id),
      onBack: back,
      onEdit: () => setEditing(talent.id),
      onCreateMappe: () => setMappeFor(talent)
    });
  } else {
    [title, subtitle] = TITLES[nav];
    if (nav === 'uebersicht') body = /*#__PURE__*/React.createElement(window.Dashboard, {
      me: me,
      apps: apps,
      vkpis: window.VERMITTLER_KPIS,
      clients: window.CLIENTS,
      mandates: window.MANDATES,
      onOpenTalent: goTalent,
      onOpenPipeline: () => setNav('bewerbungen'),
      onOpenMandate: () => setNav('mandate')
    });else if (nav === 'mandate') body = /*#__PURE__*/React.createElement(window.MandateView, {
      clients: window.CLIENTS,
      mandates: window.MANDATES
    });else if (nav === 'pool') body = /*#__PURE__*/React.createElement(window.TalentGrid, {
      talents: talents,
      apps: apps,
      onOpen: goTalent
    });else if (nav === 'bewerbungen') body = /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        height: '100%'
      }
    }, /*#__PURE__*/React.createElement(window.PipelineBoard, {
      apps: apps,
      talents: talents,
      onOpen: goTalent
    }));else if (nav === 'platzierungen') body = /*#__PURE__*/React.createElement(window.PlatzierungenView, {
      placements: window.PLACEMENTS,
      kpis: window.VERMITTLER_KPIS
    });else if (nav === 'berichte') body = /*#__PURE__*/React.createElement(window.ReportsView, {
      clients: window.CLIENTS,
      mandates: window.MANDATES,
      placements: window.PLACEMENTS,
      apps: apps,
      kpis: window.VERMITTLER_KPIS
    });else if (nav === 'postfach') body = /*#__PURE__*/React.createElement(window.Inbox, {
      messages: window.MESSAGES,
      apps: apps,
      talents: talents,
      onOpenTalent: goTalent
    });
  }
  const actions = !talent && (nav === 'bewerbungen' || nav === 'uebersicht') ? /*#__PURE__*/React.createElement(A.Button, {
    variant: "primary",
    size: "sm",
    iconLeft: /*#__PURE__*/React.createElement(A.Icon, {
      name: "plus",
      size: 15
    }),
    onClick: () => setMappeFor(me)
  }, "Bewerbung einpflegen") : !talent && nav === 'mandate' ? /*#__PURE__*/React.createElement(A.Button, {
    variant: "primary",
    size: "sm",
    iconLeft: /*#__PURE__*/React.createElement(A.Icon, {
      name: "plus",
      size: 15
    })
  }, "Mandat anlegen") : null;
  return /*#__PURE__*/React.createElement(window.AppShell, {
    active: talent ? 'pool' : nav,
    onNav: n => {
      setOpenTalent(null);
      setNav(n);
    },
    me: me,
    talentCount: talents.length,
    search: search,
    onSearch: setSearch,
    title: title,
    subtitle: subtitle,
    badges: badges,
    actions: actions
  }, body, mappeFor && /*#__PURE__*/React.createElement(window.MappeModal, {
    talent: mappeFor,
    onClose: () => setMappeFor(null)
  }));
}
Object.assign(window, {
  App
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/recruiting/app.jsx", error: String((e && e.message) || e) }); }

// ui_kits/recruiting/data.js
try { (() => {
/* myJob — candidate-centric data model.
   Core object = TALENT. "Ich" (me) is talent #1; representing others is the
   Vermittler extension. Each talent owns a Lebenslauf, Anhänge and Bewerbungen. */

const STAGES_ORDER = ['new', 'review', 'interview', 'offer', 'hired'];
const STAGE_LABELS = {
  new: 'Eingereicht',
  review: 'In Prüfung',
  interview: 'Interview',
  offer: 'Angebot',
  hired: 'Zusage',
  rejected: 'Absage'
};

/* ---------- Anhänge (documents) — shared library per talent ---------- */
const ME_ATTACHMENTS = [{
  id: 'at1',
  name: 'Arbeitszeugnis — Aurora Systems',
  tag: 'Zeugnis',
  sub: '2 Seiten · PDF',
  kind: 'zeugnis'
}, {
  id: 'at2',
  name: 'M.Sc. Zeugnis — TU Berlin',
  tag: 'Zeugnis',
  sub: '1 Seite · PDF',
  kind: 'zeugnis'
}, {
  id: 'at3',
  name: 'Zertifikat — CKA Kubernetes',
  tag: 'Zertifikat',
  sub: '1 Seite · PDF',
  kind: 'zertifikat'
}, {
  id: 'at4',
  name: 'Empfehlungsschreiben — M. Vogel',
  tag: 'Referenz',
  sub: '1 Seite · PDF',
  kind: 'referenz'
}];

/* ---------- Lebenslauf for "Ich" ---------- */
const ME_RESUME = {
  summary: 'Backend-Engineer mit 6 Jahren Erfahrung in hochperformanten, verteilten Systemen. Zuletzt Tech-Lead eines Matching-Teams. Schwerpunkte: C++/Rust, Systemdesign und Zuverlässigkeit im großen Maßstab.',
  experience: [{
    role: 'Tech Lead — Matching-Team',
    company: 'Aurora Systems GmbH',
    period: '2023 — heute',
    location: 'Berlin',
    bullets: ['Verantwortung für ein Echtzeit-Matching-System mit 40 Mio. Anfragen/Tag', 'Team von 5 Engineers fachlich geführt; Latenz um 38 % reduziert'],
    skills: ['C++', 'Rust', 'gRPC']
  }, {
    role: 'Senior Backend Engineer',
    company: 'Nordlicht Software',
    period: '2020 — 2023',
    location: 'Hamburg',
    bullets: ['Event-getriebene Plattform auf Kafka & Kubernetes aufgebaut', 'Migration eines Monolithen zu Services geleitet'],
    skills: ['Go', 'Kafka', 'Kubernetes']
  }, {
    role: 'Software Engineer',
    company: 'Falk & Partner',
    period: '2018 — 2020',
    location: 'München',
    bullets: ['Hochlast-APIs für den Beratungsbereich entwickelt'],
    skills: ['Python', 'PostgreSQL']
  }],
  education: [{
    degree: 'M.Sc. Informatik',
    school: 'TU Berlin',
    period: '2016 — 2018',
    note: 'Schwerpunkt Verteilte Systeme · 1,3'
  }, {
    degree: 'B.Sc. Informatik',
    school: 'Universität Hamburg',
    period: '2013 — 2016',
    note: '1,7'
  }],
  skillGroups: [{
    label: 'Sprachen',
    items: ['C++', 'Rust', 'Go', 'Python']
  }, {
    label: 'Systeme',
    items: ['gRPC', 'Kubernetes', 'Kafka', 'PostgreSQL']
  }, {
    label: 'Methoden',
    items: ['Systemdesign', 'Observability', 'Code Review']
  }]
};

/* ---------- Anschreiben for "Ich" (default, pro Stelle anpassbar) ---------- */
const ME_LETTER = {
  firma: 'Aurora Systems GmbH',
  ansprechpartner: 'Frau Dr. Petra Lindner',
  strasse: 'Lichtstraße 12',
  plzOrt: '10115 Berlin',
  betreff: 'Bewerbung als Senior C++ Engineer — Plattform-Team',
  anrede: 'Sehr geehrte Frau Dr. Lindner,',
  absaetze: ['mit großem Interesse habe ich Ihre Ausschreibung gelesen. Verteilte, latenzkritische Systeme sind seit sechs Jahren mein Handwerk — und Ihr Plattform-Team arbeitet genau an den Problemen, die mich antreiben.', 'Als Tech-Lead bei Aurora Systems verantworte ich ein Echtzeit-Matching-System mit 40 Mio. Anfragen pro Tag und habe die Latenz um 38 % gesenkt. Meine Schwerpunkte liegen in C++ und Rust, im sauberen Systemdesign und in der Zuverlässigkeit großer Dienste.', 'Gerne zeige ich Ihnen im Gespräch, wie ich diese Erfahrung bei Ihnen einbringen kann. Über eine Einladung freue ich mich sehr.'],
  gruss: 'Mit freundlichen Grüßen'
};

/* ---------- Talents (the pool) — "me" pinned first ---------- */
const TALENTS = [{
  id: 'me',
  me: true,
  name: 'Suhay Sevinc',
  role: 'M.Sc. Software Engineer',
  headline: 'Senior C++ / Distributed Systems',
  src: '../../assets/img/candidate-portrait-sm.jpg',
  location: 'Berlin',
  email: 'suhay.sevinc@example.de',
  phone: '+49 151 2345 6789',
  linkedin: 'linkedin.com/in/suhaysevinc',
  availability: 'in 3 Monaten',
  salary: '78.000 €',
  score: 88,
  skills: ['C++', 'Rust', 'Distributed Systems', 'gRPC', 'Kubernetes'],
  resume: ME_RESUME,
  letter: ME_LETTER,
  attachments: ME_ATTACHMENTS
}, {
  id: 't2',
  name: 'Lena Brandt',
  role: 'Product Designerin',
  headline: 'B2B-SaaS · Design Systems',
  location: 'Leipzig',
  email: 'lena.brandt@example.de',
  phone: '+49 160 1112 2334',
  availability: 'in 6 Wochen',
  salary: '64.000 €',
  score: 81,
  skills: ['Figma', 'Design Systems', 'Prototyping'],
  attachments: []
}, {
  id: 't3',
  name: 'Marco Adler',
  role: 'DevOps Engineer',
  headline: 'Cloud · Automatisierung',
  location: 'München',
  email: 'marco.adler@example.de',
  phone: '+49 170 5566 7788',
  availability: 'sofort',
  salary: '72.000 €',
  score: 74,
  skills: ['Terraform', 'AWS', 'CI/CD', 'Go'],
  attachments: []
}, {
  id: 't4',
  name: 'Aylin Demir',
  role: 'UX Researcher',
  headline: 'Qualitative Research',
  location: 'Berlin',
  email: 'aylin.demir@example.de',
  phone: '+49 151 4433 2211',
  availability: 'in 2 Monaten',
  salary: '66.000 €',
  score: 84,
  skills: ['User Research', 'Interviews', 'Figma'],
  attachments: []
}];

/* ---------- Bewerbungen (applications) — belong to a talent ---------- */
const APPLICATIONS = [{
  id: 'b1',
  talentId: 'me',
  company: 'Aurora Systems GmbH',
  role: 'Senior C++ Engineer',
  location: 'Berlin · Hybrid',
  status: 'interview',
  date: '12.06.2026',
  next: 'Tech-Interview · 24.06.',
  score: 88,
  attachments: ['at1', 'at3'],
  anschreiben: true
}, {
  id: 'b2',
  talentId: 'me',
  company: 'Meridian Labs',
  role: 'Distributed Systems Eng.',
  location: 'Remote',
  status: 'review',
  date: '09.06.2026',
  next: 'In Prüfung',
  score: 84,
  attachments: ['at1', 'at2'],
  anschreiben: true
}, {
  id: 'b3',
  talentId: 'me',
  company: 'Falk & Partner',
  role: 'Plattform-Engineer',
  location: 'München',
  status: 'offer',
  date: '05.06.2026',
  next: 'Angebot — Frist 28.06.',
  score: 90,
  attachments: ['at1', 'at2', 'at4'],
  anschreiben: true
}, {
  id: 'b4',
  talentId: 'me',
  company: 'Hansa Digital',
  role: 'C++ Tech Lead',
  location: 'Bremen',
  status: 'rejected',
  date: '28.05.2026',
  next: 'Leider abgesagt',
  score: 70,
  attachments: ['at1'],
  anschreiben: true
}, {
  id: 'b5',
  talentId: 'me',
  company: 'Nordlicht Software',
  role: 'Backend Engineer',
  location: 'Hamburg',
  status: 'new',
  date: '02.06.2026',
  next: 'Eingereicht',
  score: 80,
  attachments: ['at1', 'at3'],
  anschreiben: false
}, {
  id: 'b6',
  talentId: 't2',
  company: 'Aurora Systems GmbH',
  role: 'Product Designer:in',
  location: 'Berlin',
  status: 'interview',
  date: '10.06.2026',
  next: 'Portfolio-Call · 26.06.',
  score: 81,
  attachments: [],
  anschreiben: true
}, {
  id: 'b7',
  talentId: 't3',
  company: 'Meridian Labs',
  role: 'DevOps Engineer',
  location: 'Remote',
  status: 'new',
  date: 'heute',
  next: 'Eingereicht',
  score: 74,
  attachments: [],
  anschreiben: false
}, {
  id: 'b8',
  talentId: 't4',
  company: 'Nordlicht Software',
  role: 'UX Researcher',
  location: 'Hamburg',
  status: 'offer',
  date: '04.06.2026',
  next: 'Angebot erhalten',
  score: 84,
  attachments: [],
  anschreiben: true
}, {
  id: 'b9',
  talentId: 't2',
  company: 'Falk & Partner',
  role: 'Brand Designer:in',
  location: 'München',
  status: 'review',
  date: '07.06.2026',
  next: 'In Prüfung',
  score: 78,
  attachments: [],
  anschreiben: true
}];

/* ---------- Stellen (saved open positions) ---------- */
const JOBS = [{
  id: 'j1',
  title: 'Senior C++ Engineer',
  company: 'Aurora Systems GmbH',
  location: 'Berlin · Hybrid',
  type: 'Vollzeit',
  salary: '75–90 T€',
  match: 92,
  saved: true
}, {
  id: 'j2',
  title: 'Distributed Systems Eng.',
  company: 'Meridian Labs',
  location: 'Remote (DE)',
  type: 'Vollzeit',
  salary: '80–95 T€',
  match: 86,
  saved: true
}, {
  id: 'j3',
  title: 'Backend Engineer (Rust)',
  company: 'Hojo Tech',
  location: 'Berlin',
  type: 'Vollzeit',
  salary: '70–85 T€',
  match: 79,
  saved: false
}, {
  id: 'j4',
  title: 'Plattform-Engineer',
  company: 'Falk & Partner',
  location: 'München',
  type: 'Vollzeit',
  salary: '72–88 T€',
  match: 83,
  saved: true
}];
const MESSAGES = [{
  id: 'm1',
  appId: 'b1',
  from: 'Aurora Systems · Recruiting',
  text: 'Gerne laden wir Sie zum Tech-Interview am 24.06. um 14:00 ein.',
  when: 'vor 2 Std.',
  unread: true
}, {
  id: 'm2',
  appId: 'b3',
  from: 'Falk & Partner · HR',
  text: 'Anbei unser Angebot. Wir würden uns über eine Rückmeldung bis 28.06. freuen.',
  when: 'vor 5 Std.',
  unread: true
}, {
  id: 'm3',
  appId: 'b8',
  from: 'Nordlicht Software',
  text: 'Das Angebot für Aylin Demir ist raus — Details im Anhang.',
  when: 'gestern',
  unread: false
}, {
  id: 'm4',
  appId: 'b2',
  from: 'Meridian Labs',
  text: 'Vielen Dank für die Unterlagen, wir melden uns diese Woche.',
  when: 'vor 2 Tagen',
  unread: false
}];
const KPIS = [{
  label: 'Aktive Bewerbungen',
  value: '7',
  delta: '+2',
  dir: 'up',
  icon: 'send'
}, {
  label: 'Im Interview',
  value: '2',
  delta: '+1',
  dir: 'up',
  icon: 'message'
}, {
  label: 'Angebote',
  value: '2',
  delta: '+1',
  dir: 'up',
  icon: 'award'
}, {
  label: 'Antwortquote',
  value: '63%',
  delta: '+5%',
  dir: 'up',
  icon: 'trend'
}];

/* ===== Vermittler-Seite (du betreibst die Vermittlung selbst) =====
   Kunden (Auftraggeber) → Mandate (Suchaufträge mit Provision) → Platzierungen. */
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
  id: 'ma1',
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
  id: 'ma2',
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
  id: 'ma3',
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
  id: 'ma4',
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
  id: 'ma5',
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
const PLACEMENTS = [{
  id: 'pl1',
  candName: 'Mara Vogel',
  candRole: 'Engineering Manager',
  client: 'Aurora Systems GmbH',
  start: '01.07.2026',
  fee: '19.000 €',
  status: 'In Rechnung'
}, {
  id: 'pl2',
  candName: 'Lena Brandt',
  candRole: 'Brand Designer',
  client: 'Nordlicht Software',
  start: '15.06.2026',
  fee: '12.600 €',
  status: 'Bezahlt'
}, {
  id: 'pl3',
  candName: 'Aylin Demir',
  candRole: 'UX Researcher',
  client: 'Meridian Labs',
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
  label: 'Talente im Pool',
  value: '4',
  delta: '+1',
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
  TALENTS,
  APPLICATIONS,
  JOBS,
  MESSAGES,
  KPIS,
  CLIENTS,
  MANDATES,
  PLACEMENTS,
  VERMITTLER_KPIS
});
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
