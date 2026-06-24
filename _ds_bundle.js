/* @ds-bundle: {"format":3,"namespace":"SevincCVDesignSystem_3a0c8f","components":[{"name":"Avatar","sourcePath":"components/core/Avatar.jsx"},{"name":"Badge","sourcePath":"components/core/Badge.jsx"},{"name":"Icon","sourcePath":"components/core/Icon.jsx"},{"name":"MetaPill","sourcePath":"components/core/MetaPill.jsx"},{"name":"CertItem","sourcePath":"components/cv/CertItem.jsx"},{"name":"ContactItem","sourcePath":"components/cv/ContactItem.jsx"},{"name":"EduItem","sourcePath":"components/cv/EduItem.jsx"},{"name":"JobCard","sourcePath":"components/cv/JobCard.jsx"},{"name":"SectionHeading","sourcePath":"components/cv/SectionHeading.jsx"},{"name":"SideTitle","sourcePath":"components/cv/SideTitle.jsx"},{"name":"SkillGroup","sourcePath":"components/cv/SkillGroup.jsx"},{"name":"Timeline","sourcePath":"components/cv/Timeline.jsx"}],"sourceHashes":{"components/core/Avatar.jsx":"483b242ea016","components/core/Badge.jsx":"cc9883dbd182","components/core/Icon.jsx":"f90217787639","components/core/MetaPill.jsx":"2e8990953af0","components/cv/CertItem.jsx":"bc3f6e1490cf","components/cv/ContactItem.jsx":"5f3a419fc17c","components/cv/EduItem.jsx":"df9cd3fd1b04","components/cv/JobCard.jsx":"dea052b207d4","components/cv/SectionHeading.jsx":"8d138f538edd","components/cv/SideTitle.jsx":"063be0f73dff","components/cv/SkillGroup.jsx":"2655100a70b1","components/cv/Timeline.jsx":"fadddc616ecf","ui_kits/cover-letter/CoverLetter.jsx":"b44726f5f2e5","ui_kits/cv/Resume.jsx":"c8662d340d6a","ui_kits/cv/ResumeMain.jsx":"096592670d50","ui_kits/cv/ResumeSidebar.jsx":"c93aaa4020a4","ui_kits/cv/resume-data.js":"25236ac2acbc"},"inlinedExternals":[],"unexposedExports":[]} */

(() => {

const __ds_ns = (window.SevincCVDesignSystem_3a0c8f = window.SevincCVDesignSystem_3a0c8f || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// components/core/Avatar.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Framed profile image with an initials fallback behind it.
 * Rounded-square by default (the resume portrait); pass radius="999px" for a circle.
 */
function Avatar({
  src,
  initials = '',
  alt = '',
  size = 257,
  radius = 'var(--radius-lg)',
  objectPosition = 'center 15%',
  zoom = 1.25,
  style = {},
  ...rest
}) {
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      position: 'relative',
      width: typeof size === 'number' ? `${size}px` : size,
      height: typeof size === 'number' ? `${size}px` : size,
      borderRadius: radius,
      border: '1px solid var(--sidebar-border-strong)',
      background: 'var(--sidebar-glass)',
      overflow: 'hidden',
      isolation: 'isolate',
      boxShadow: 'var(--shadow-dark-sm), var(--shadow-dark-md)',
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
      fontSize: '54px',
      fontWeight: 'var(--fw-bold)',
      letterSpacing: 'var(--ls-tighter)',
      color: '#ffffff',
      background: 'radial-gradient(120% 80% at 20% 10%, color-mix(in oklch, var(--accent) 28%, transparent) 0%, transparent 60%), linear-gradient(160deg, var(--ink-700) 0%, var(--ink-900) 100%)',
      zIndex: 0
    }
  }, initials), src && /*#__PURE__*/React.createElement("img", {
    src: src,
    alt: alt,
    onError: e => {
      e.currentTarget.style.display = 'none';
    },
    style: {
      position: 'relative',
      zIndex: 1,
      width: '100%',
      height: '100%',
      objectFit: 'cover',
      objectPosition,
      display: 'block',
      transform: `scale(${zoom})`,
      transformOrigin: 'center 18%'
    }
  }));
}
Object.assign(__ds_scope, { Avatar });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Avatar.jsx", error: String((e && e.message) || e) }); }

// components/core/Badge.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const BASE = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '5px',
  fontFamily: 'var(--font-mono)',
  fontWeight: 'var(--fw-medium)',
  lineHeight: 1.4,
  whiteSpace: 'nowrap',
  borderRadius: 'var(--radius-sm)',
  border: '1px solid transparent',
  transition: 'background var(--dur-fast) var(--ease-out), border-color var(--dur-fast) var(--ease-out), color var(--dur-fast) var(--ease-out), transform var(--dur-fast) var(--ease-out)'
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
  /* light main column — outlined chip */
  outline: {
    background: 'var(--surface-card)',
    color: 'var(--text-muted)',
    borderColor: 'var(--border-strong)'
  },
  /* filled accent — a highlighted / primary skill */
  solid: {
    background: 'var(--accent)',
    color: 'var(--accent-contrast)',
    borderColor: 'var(--accent)'
  },
  /* translucent glass on the dark sidebar */
  glass: {
    background: 'var(--sidebar-glass)',
    color: 'var(--sidebar-text)',
    borderColor: 'var(--sidebar-border-strong)',
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)'
  },
  /* solid light chip on the dark sidebar — a key/primary language */
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

// components/core/Icon.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Feather-style line icons used across the resume system.
 * Single 24×24 stroke grid, 1.8 stroke, round caps/joins — matches the
 * source CV exactly. Add new glyphs to PATHS.
 */
const PATHS = {
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
  cap: /*#__PURE__*/React.createElement("g", null, /*#__PURE__*/React.createElement("path", {
    d: "M22 10L12 5 2 10l10 5 10-5z"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M6 12v5c3 3 9 3 12 0v-5"
  })),
  code: /*#__PURE__*/React.createElement("g", null, /*#__PURE__*/React.createElement("polyline", {
    points: "16 18 22 12 16 6"
  }), /*#__PURE__*/React.createElement("polyline", {
    points: "8 6 2 12 8 18"
  })),
  user: /*#__PURE__*/React.createElement("g", null, /*#__PURE__*/React.createElement("path", {
    d: "M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "12",
    cy: "7",
    r: "4"
  })),
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
  award: /*#__PURE__*/React.createElement("g", null, /*#__PURE__*/React.createElement("circle", {
    cx: "12",
    cy: "8",
    r: "7"
  }), /*#__PURE__*/React.createElement("polyline", {
    points: "8.21 13.89 7 23 12 20 17 23 15.79 13.88"
  })),
  heart: /*#__PURE__*/React.createElement("path", {
    d: "M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"
  }),
  book: /*#__PURE__*/React.createElement("g", null, /*#__PURE__*/React.createElement("path", {
    d: "M4 19.5A2.5 2.5 0 0 1 6.5 17H20"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"
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
  zap: /*#__PURE__*/React.createElement("polygon", {
    points: "13 2 3 14 12 14 11 22 21 10 12 10 13 2"
  }),
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
  external: /*#__PURE__*/React.createElement("g", null, /*#__PURE__*/React.createElement("path", {
    d: "M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"
  }), /*#__PURE__*/React.createElement("polyline", {
    points: "15 3 21 3 21 9"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "10",
    y1: "14",
    x2: "21",
    y2: "3"
  }))
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
Object.assign(__ds_scope, { Icon });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Icon.jsx", error: String((e && e.message) || e) }); }

// components/core/MetaPill.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * A small pill for a date range or status, with an optional leading icon.
 * Used on job headers, education rows and certificates.
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

// components/cv/CertItem.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * A certificate / training card: an accent icon tile beside a title and body.
 * `highlight` draws the accent border (use for an in-progress / featured cert).
 */
function CertItem({
  icon = 'award',
  title,
  children,
  highlight = false,
  style = {},
  ...rest
}) {
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      position: 'relative',
      display: 'flex',
      gap: '14px',
      alignItems: 'flex-start',
      padding: 'var(--pad-card)',
      background: 'var(--surface-card)',
      border: `1px solid ${highlight ? 'var(--accent)' : 'var(--border)'}`,
      borderRadius: 'var(--radius-lg)',
      breakInside: 'avoid',
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("span", {
    style: {
      width: '38px',
      height: '38px',
      flexShrink: 0,
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: highlight ? 'var(--accent)' : 'var(--text-heading)',
      color: '#ffffff',
      borderRadius: '9px'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: icon,
    size: 18
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("strong", {
    style: {
      display: 'block',
      fontFamily: 'var(--font-display)',
      fontSize: 'var(--fs-md)',
      fontWeight: 'var(--fw-bold)',
      color: 'var(--text-heading)',
      marginBottom: '2px',
      letterSpacing: '-0.005em'
    }
  }, title), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 'var(--fs-sm)',
      color: 'var(--text-muted)',
      lineHeight: 1.55
    }
  }, children)));
}
Object.assign(__ds_scope, { CertItem });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/cv/CertItem.jsx", error: String((e && e.message) || e) }); }

// components/cv/ContactItem.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * A contact row on the dark sidebar: a glass icon chip beside a value
 * (optionally a link).
 */
function ContactItem({
  icon,
  href,
  children,
  target,
  style = {},
  ...rest
}) {
  const value = href ? /*#__PURE__*/React.createElement("a", {
    href: href,
    target: target,
    style: {
      color: 'var(--sidebar-text)',
      wordBreak: 'break-word'
    }
  }, children) : /*#__PURE__*/React.createElement("span", {
    style: {
      wordBreak: 'break-word'
    }
  }, children);
  return /*#__PURE__*/React.createElement("li", _extends({
    style: {
      display: 'flex',
      alignItems: 'flex-start',
      gap: '11px',
      fontSize: 'var(--fs-sm)',
      color: 'var(--sidebar-muted)',
      lineHeight: 1.45,
      listStyle: 'none',
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("span", {
    style: {
      width: '28px',
      height: '28px',
      flexShrink: 0,
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--sidebar-glass)',
      border: '1px solid var(--sidebar-border)',
      borderRadius: '7px',
      marginTop: '1px',
      color: '#ffffff'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: icon,
    size: 14
  })), /*#__PURE__*/React.createElement("span", {
    style: {
      paddingTop: '5px'
    }
  }, value));
}
Object.assign(__ds_scope, { ContactItem });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/cv/ContactItem.jsx", error: String((e && e.message) || e) }); }

// components/cv/EduItem.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * An education entry as a bordered card: header (degree + school + date),
 * optional tech-stack strip and accent-marked bullets.
 */
function EduItem({
  title,
  school,
  period,
  tech = [],
  bullets = [],
  style = {},
  ...rest
}) {
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      padding: 'var(--pad-card)',
      background: 'var(--surface-card)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-lg)',
      breakInside: 'avoid',
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
      alignItems: 'baseline',
      gap: '8px'
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h3", {
    style: {
      fontFamily: 'var(--font-display)',
      fontSize: 'var(--fs-lg)',
      fontWeight: 'var(--fw-bold)',
      color: 'var(--text-heading)',
      margin: 0,
      letterSpacing: '-0.01em'
    }
  }, title), school && /*#__PURE__*/React.createElement("p", {
    style: {
      color: 'var(--text-muted)',
      fontWeight: 'var(--fw-medium)',
      fontSize: 'var(--fs-sm)',
      margin: '3px 0 0'
    }
  }, school)), period && /*#__PURE__*/React.createElement(__ds_scope.MetaPill, null, period)), tech.length > 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      margin: '12px 0 0',
      display: 'flex',
      alignItems: 'flex-start',
      gap: '10px',
      flexWrap: 'wrap'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '5px',
      fontFamily: 'var(--font-mono)',
      fontSize: '10.5px',
      fontWeight: 'var(--fw-semibold)',
      letterSpacing: 'var(--ls-wider)',
      textTransform: 'uppercase',
      color: 'var(--text-soft)',
      paddingTop: '5px',
      flexShrink: 0
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "zap",
    size: 12
  }), " Tech Stack"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexWrap: 'wrap',
      gap: 'var(--gap-badge)'
    }
  }, tech.map((t, i) => /*#__PURE__*/React.createElement(__ds_scope.Badge, {
    key: i,
    size: "sm"
  }, t)))), bullets.length > 0 && /*#__PURE__*/React.createElement("ul", {
    style: {
      margin: '10px 0 0',
      paddingLeft: '18px'
    }
  }, bullets.map((b, i) => /*#__PURE__*/React.createElement("li", {
    key: i,
    style: {
      color: 'var(--accent)',
      marginBottom: '3px',
      fontSize: '14px',
      lineHeight: 1.55
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--text-body)'
    }
  }, b)))));
}
Object.assign(__ds_scope, { EduItem });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/cv/EduItem.jsx", error: String((e && e.message) || e) }); }

// components/cv/JobCard.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * A single experience entry on the <Timeline>. Renders its own rail node,
 * a header (title · company + date pill), an optional tech-stack strip and
 * a bullet list (pass <li> children).
 */
function JobCard({
  title,
  company,
  period,
  current = false,
  tech = [],
  bullets = [],
  children,
  style = {},
  ...rest
}) {
  return /*#__PURE__*/React.createElement("article", _extends({
    style: {
      position: 'relative',
      marginBottom: '32px',
      breakInside: 'avoid',
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true",
    style: {
      position: 'absolute',
      left: '-30px',
      top: '7px',
      width: '13.5px',
      height: '13.5px',
      borderRadius: '50%',
      background: current ? 'var(--accent)' : '#ffffff',
      border: `2px solid ${current ? 'var(--accent)' : 'var(--text-heading)'}`,
      boxShadow: '0 0 0 4px #ffffff, 0 0 0 5px var(--border)',
      zIndex: 1
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
      alignItems: 'baseline',
      gap: '10px',
      marginBottom: '4px'
    }
  }, /*#__PURE__*/React.createElement("h3", {
    style: {
      fontFamily: 'var(--font-display)',
      fontSize: '16.5px',
      fontWeight: 'var(--fw-bold)',
      color: 'var(--text-heading)',
      margin: 0,
      letterSpacing: '-0.01em'
    }
  }, title, company && /*#__PURE__*/React.createElement(React.Fragment, null, ' · ', /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--text-muted)',
      fontWeight: 'var(--fw-semibold)'
    }
  }, company))), period && /*#__PURE__*/React.createElement(__ds_scope.MetaPill, {
    tone: current ? 'accent' : 'default'
  }, period)), tech.length > 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      margin: '12px 0 14px',
      display: 'flex',
      alignItems: 'flex-start',
      gap: '10px',
      flexWrap: 'wrap'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '5px',
      fontFamily: 'var(--font-mono)',
      fontSize: '10.5px',
      fontWeight: 'var(--fw-semibold)',
      letterSpacing: 'var(--ls-wider)',
      textTransform: 'uppercase',
      color: 'var(--text-soft)',
      paddingTop: '5px',
      flexShrink: 0
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "zap",
    size: 12
  }), " Tech Stack"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexWrap: 'wrap',
      gap: 'var(--gap-badge)'
    }
  }, tech.map((t, i) => /*#__PURE__*/React.createElement(__ds_scope.Badge, {
    key: i,
    size: "sm"
  }, t)))), (bullets.length > 0 || children) && /*#__PURE__*/React.createElement("ul", {
    style: {
      margin: '8px 0 0',
      paddingLeft: '18px'
    }
  }, bullets.map((b, i) =>
  /*#__PURE__*/
  /* li color sets the ::marker; span restores body color for the text */
  React.createElement("li", {
    key: i,
    style: {
      color: 'var(--accent)',
      marginBottom: '4px',
      fontSize: '14px',
      lineHeight: 1.6
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--text-body)'
    }
  }, b))), children));
}
Object.assign(__ds_scope, { JobCard });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/cv/JobCard.jsx", error: String((e && e.message) || e) }); }

// components/cv/SectionHeading.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Main-column section header: a small mono kicker (with icon) above a large
 * display heading underlined by a hairline rule.
 */
function SectionHeading({
  kicker,
  icon,
  children,
  style = {},
  ...rest
}) {
  return /*#__PURE__*/React.createElement("header", _extends({
    style: {
      ...style
    }
  }, rest), kicker && /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      fontFamily: 'var(--font-mono)',
      fontSize: '11px',
      fontWeight: 'var(--fw-semibold)',
      letterSpacing: 'var(--ls-wider)',
      textTransform: 'uppercase',
      color: 'var(--text-soft)',
      margin: '0 0 8px'
    }
  }, icon && /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: icon,
    size: 14
  }), kicker), /*#__PURE__*/React.createElement("h2", {
    style: {
      fontFamily: 'var(--font-display)',
      fontSize: 'var(--fs-3xl)',
      fontWeight: 'var(--fw-bold)',
      letterSpacing: 'var(--ls-tight)',
      color: 'var(--text-heading)',
      margin: '0 0 22px',
      paddingBottom: '14px',
      borderBottom: '1px solid var(--border)'
    }
  }, children));
}
Object.assign(__ds_scope, { SectionHeading });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/cv/SectionHeading.jsx", error: String((e && e.message) || e) }); }

// components/cv/SideTitle.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Sidebar section title: uppercase mono label with a leading icon and an
 * underline rule. Sits on the dark sidebar.
 */
function SideTitle({
  icon,
  children,
  style = {},
  ...rest
}) {
  return /*#__PURE__*/React.createElement("h2", _extends({
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      fontFamily: 'var(--font-mono)',
      fontSize: '11px',
      fontWeight: 'var(--fw-semibold)',
      letterSpacing: 'var(--ls-wider)',
      textTransform: 'uppercase',
      color: '#ffffff',
      margin: '0 0 14px',
      paddingBottom: '10px',
      borderBottom: '1px solid var(--sidebar-border)',
      ...style
    }
  }, rest), icon && /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: icon,
    size: 14,
    style: {
      opacity: 0.9
    }
  }), children);
}
Object.assign(__ds_scope, { SideTitle });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/cv/SideTitle.jsx", error: String((e && e.message) || e) }); }

// components/cv/SkillGroup.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * A labelled cluster of skill tags. Pass <Badge> children.
 * `onDark` styles the heading for the sidebar.
 */
function SkillGroup({
  label,
  children,
  onDark = true,
  style = {},
  ...rest
}) {
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      marginBottom: '18px',
      ...style
    }
  }, rest), label && /*#__PURE__*/React.createElement("h3", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: '11px',
      fontWeight: 'var(--fw-semibold)',
      color: onDark ? '#ffffff' : 'var(--text-soft)',
      opacity: onDark ? 0.85 : 1,
      margin: '0 0 9px',
      letterSpacing: 'var(--ls-wide)',
      textTransform: 'uppercase'
    }
  }, label), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexWrap: 'wrap',
      gap: 'var(--gap-badge)'
    }
  }, children));
}
Object.assign(__ds_scope, { SkillGroup });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/cv/SkillGroup.jsx", error: String((e && e.message) || e) }); }

// components/cv/Timeline.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Vertical timeline rail. Place <JobCard> children inside; each renders its
 * own node on the rail.
 */
function Timeline({
  children,
  style = {},
  ...rest
}) {
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      position: 'relative',
      paddingLeft: '30px',
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true",
    style: {
      position: 'absolute',
      left: '6px',
      top: '8px',
      bottom: '8px',
      width: '1.5px',
      background: 'linear-gradient(to bottom, var(--border) 0%, var(--border-strong) 20%, var(--border-strong) 80%, var(--border) 100%)'
    }
  }), children);
}
Object.assign(__ds_scope, { Timeline });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/cv/Timeline.jsx", error: String((e && e.message) || e) }); }

// ui_kits/cover-letter/CoverLetter.jsx
try { (() => {
/* Cover letter (Anschreiben) — dark sidebar + letter body, from DS components. */
(function () {
  const DS = window.SevincCVDesignSystem_3a0c8f;
  const {
    Avatar,
    SideTitle,
    ContactItem
  } = DS;
  const LETTER = {
    recipient: ['[Unternehmensname]', '[Ansprechpartner / Personalabteilung]', '[Straße und Hausnummer]', '[PLZ Ort]'],
    place: 'Blumberg, 11. Juni 2026',
    subject: 'Bewerbung als [Stellenbezeichnung] — Referenz: [Referenznummer, falls vorhanden]',
    salutation: 'Sehr geehrte Damen und Herren,',
    body: [/*#__PURE__*/React.createElement(React.Fragment, null, "mit gro\xDFem Interesse habe ich Ihre Stellenausschreibung als ", /*#__PURE__*/React.createElement("strong", null, "[Stellenbezeichnung]"), " gelesen. Als Software Engineer (M.Sc.) mit \xFCber 7 Jahren Erfahrung in der hardwarenahen, verteilten und sicherheitskritischen Softwareentwicklung \u2014 vorwiegend in C++ und C#/.NET \u2014 bringe ich genau das technische Profil und die Leidenschaft mit, die Ihre Stelle erfordert."), /*#__PURE__*/React.createElement(React.Fragment, null, "In meiner aktuellen T\xE4tigkeit bei der Rheinmetall Air Defence AG in Z\xFCrich entwickle ich Steuersoftware f\xFCr das Oerlikon Skynex\xAE-Luftverteidigungssystem. Dabei verantworte ich die Implementierung taktischer Kommunikationsprotokolle (TCP, REST, Protobuf), QML-Bedieneroberfl\xE4chen sowie Unit- und Integrationstests. Zuvor habe ich bei der TRUMPF SE + Co. KG \xFCber f\xFCnf Jahre hinweg Visionsysteme, Microservices und CAD/CAM-L\xF6sungen entwickelt und dabei Architektur, CI/CD-Pipelines und Qualit\xE4tsprozesse ma\xDFgeblich mitgestaltet."), /*#__PURE__*/React.createElement(React.Fragment, null, "Was mich an Ihrem Unternehmen besonders anspricht, ist [individuell erg\xE4nzen: z. B. der Fokus auf X, die Innovationskultur, das Produktportfolio etc.]. Ich bin davon \xFCberzeugt, mit meinem Know-how in moderner C++-Entwicklung, Systemarchitektur und DevOps einen sp\xFCrbaren Beitrag zu Ihrem Team leisten zu k\xF6nnen."), /*#__PURE__*/React.createElement(React.Fragment, null, "Ich freue mich auf ein pers\xF6nliches Gespr\xE4ch, in dem wir gemeinsam er\xF6rtern k\xF6nnen, wie ich Ihre Ziele tatkr\xE4ftig unterst\xFCtzen kann. Meine Gehaltsvorstellung und der fr\xFChestm\xF6gliche Eintrittstermin bespreche ich gerne in einem pers\xF6nlichen Gespr\xE4ch.")],
    closing: 'Mit freundlichen Grüßen,',
    signature: 'Suhay Sevinc',
    attachments: ['Lebenslauf', 'Hochschulzeugnisse (B.Sc. & M.Sc.)', 'Arbeitszeugnisse', 'ISAQB-Zertifikate']
  };
  function CoverLetter({
    data,
    theme
  }) {
    return /*#__PURE__*/React.createElement("div", {
      className: "cl-page",
      "data-theme": theme
    }, /*#__PURE__*/React.createElement("div", {
      className: "cl-layout"
    }, /*#__PURE__*/React.createElement("aside", {
      className: "cv-sidebar"
    }, /*#__PURE__*/React.createElement("div", {
      className: "cv-profile",
      style: {
        marginBottom: 28,
        paddingBottom: 24
      }
    }, /*#__PURE__*/React.createElement(Avatar, {
      className: "cv-avatar",
      src: "../../assets/suhay-photo.jpg",
      initials: data.profile.initials,
      alt: data.profile.name,
      size: 180
    }), /*#__PURE__*/React.createElement("h1", {
      className: "cv-name",
      style: {
        fontSize: 30
      }
    }, data.profile.name), /*#__PURE__*/React.createElement("span", {
      className: "cv-role"
    }, data.profile.role)), /*#__PURE__*/React.createElement("section", {
      className: "cv-side-section"
    }, /*#__PURE__*/React.createElement(SideTitle, {
      icon: "user"
    }, "Kontakt"), /*#__PURE__*/React.createElement("ul", {
      style: {
        listStyle: 'none',
        margin: 0,
        padding: 0,
        display: 'flex',
        flexDirection: 'column',
        gap: 11
      }
    }, data.contact.map((c, i) => /*#__PURE__*/React.createElement(ContactItem, {
      key: i,
      icon: c.icon,
      href: c.href,
      target: c.href && c.href.startsWith('http') ? '_blank' : undefined
    }, Array.isArray(c.text) ? c.text.map((t, j) => /*#__PURE__*/React.createElement(React.Fragment, {
      key: j
    }, t, j < c.text.length - 1 ? /*#__PURE__*/React.createElement("br", null) : null)) : c.text)))), /*#__PURE__*/React.createElement("section", {
      className: "cv-side-section"
    }, /*#__PURE__*/React.createElement(SideTitle, {
      icon: "id"
    }, "Personalien"), /*#__PURE__*/React.createElement("ul", {
      style: {
        listStyle: 'none',
        margin: 0,
        padding: 0,
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--gap-list)',
        fontSize: 'var(--fs-sm)',
        color: 'var(--sidebar-muted)'
      }
    }, data.personal.map((p, i) => /*#__PURE__*/React.createElement("li", {
      key: i,
      style: {
        display: 'flex',
        alignItems: 'baseline',
        gap: 10
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        width: 4,
        height: 4,
        borderRadius: '50%',
        background: 'var(--sidebar-soft)',
        flexShrink: 0,
        transform: 'translateY(-2px)'
      }
    }), /*#__PURE__*/React.createElement("span", null, /*#__PURE__*/React.createElement("strong", {
      style: {
        color: '#fff',
        fontWeight: 600
      }
    }, p[0]), " ", p[1])))))), /*#__PURE__*/React.createElement("main", {
      className: "cl-body"
    }, /*#__PURE__*/React.createElement("div", {
      className: "cl-meta"
    }, /*#__PURE__*/React.createElement("div", {
      className: "cl-recipient"
    }, /*#__PURE__*/React.createElement("strong", null, LETTER.recipient[0]), LETTER.recipient.slice(1).map((r, i) => /*#__PURE__*/React.createElement(React.Fragment, {
      key: i
    }, r, /*#__PURE__*/React.createElement("br", null)))), /*#__PURE__*/React.createElement("div", {
      className: "cl-date"
    }, LETTER.place)), /*#__PURE__*/React.createElement("p", {
      className: "cl-subject"
    }, LETTER.subject), /*#__PURE__*/React.createElement("p", {
      className: "cl-salutation"
    }, LETTER.salutation), /*#__PURE__*/React.createElement("div", null, LETTER.body.map((p, i) => /*#__PURE__*/React.createElement("p", {
      className: "cl-para",
      key: i
    }, p))), /*#__PURE__*/React.createElement("div", {
      className: "cl-closing"
    }, LETTER.closing), /*#__PURE__*/React.createElement("div", {
      className: "cl-sign"
    }, LETTER.signature), /*#__PURE__*/React.createElement("div", {
      className: "cl-att"
    }, /*#__PURE__*/React.createElement("strong", null, "Anlagen"), /*#__PURE__*/React.createElement("ul", null, LETTER.attachments.map((a, i) => /*#__PURE__*/React.createElement("li", {
      key: i
    }, a)))))));
  }
  window.CoverLetter = CoverLetter;
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/cover-letter/CoverLetter.jsx", error: String((e && e.message) || e) }); }

// ui_kits/cv/Resume.jsx
try { (() => {
/* Full resume page — composes the sidebar + main columns inside the page shell. */
(function () {
  function Resume({
    data,
    theme
  }) {
    return /*#__PURE__*/React.createElement("div", {
      className: "cv-page",
      "data-theme": theme
    }, /*#__PURE__*/React.createElement("div", {
      className: "cv-layout"
    }, /*#__PURE__*/React.createElement(window.ResumeSidebar, {
      data: data
    }), /*#__PURE__*/React.createElement(window.ResumeMain, {
      data: data
    })));
  }
  window.Resume = Resume;
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/cv/Resume.jsx", error: String((e && e.message) || e) }); }

// ui_kits/cv/ResumeMain.jsx
try { (() => {
/* Resume main (light column) — composed from design-system components. */
(function () {
  const DS = window.SevincCVDesignSystem_3a0c8f;
  const {
    SectionHeading,
    Timeline,
    JobCard,
    CertItem,
    EduItem
  } = DS;
  function bulletNode(b) {
    if (typeof b === 'string') return b;
    return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("strong", null, b.strong), b.text);
  }
  function CertProgress({
    p
  }) {
    return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        marginTop: 8
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: 'var(--font-mono)',
        fontSize: 11,
        fontWeight: 600,
        color: 'var(--accent-strong)',
        background: 'var(--accent-soft)',
        border: '1px solid var(--accent-border)',
        padding: '2px 8px',
        borderRadius: 999
      }
    }, p.label), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 12,
        color: 'var(--text-soft)'
      }
    }, p.note)), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        gap: 6,
        marginTop: 8
      }
    }, Array.from({
      length: p.total
    }).map((_, i) => /*#__PURE__*/React.createElement("div", {
      key: i,
      style: {
        width: 36,
        height: 5,
        borderRadius: 3,
        background: i < p.done ? 'var(--text-heading)' : 'var(--neutral-200)'
      }
    }))));
  }
  function ResumeMain({
    data
  }) {
    const L = data.labels;
    return /*#__PURE__*/React.createElement("main", {
      className: "cv-main"
    }, /*#__PURE__*/React.createElement("section", {
      className: "cv-main-section"
    }, /*#__PURE__*/React.createElement(SectionHeading, {
      kicker: L.about,
      icon: "user"
    }, L.profile), /*#__PURE__*/React.createElement("p", {
      style: {
        fontSize: 16,
        lineHeight: 1.75,
        color: 'var(--text-body)',
        margin: 0,
        maxWidth: '68ch'
      }
    }, data.about)), /*#__PURE__*/React.createElement("section", {
      className: "cv-main-section"
    }, /*#__PURE__*/React.createElement(SectionHeading, {
      kicker: L.experience,
      icon: "briefcase"
    }, L.experienceHeading), /*#__PURE__*/React.createElement(Timeline, null, data.jobs.map((j, i) => /*#__PURE__*/React.createElement(JobCard, {
      key: i,
      title: j.title,
      company: j.company,
      period: j.period,
      current: j.current,
      tech: j.tech,
      bullets: j.bullets.map(bulletNode),
      style: i === data.jobs.length - 1 ? {
        marginBottom: 0
      } : undefined
    })))), /*#__PURE__*/React.createElement("section", {
      className: "cv-main-section"
    }, /*#__PURE__*/React.createElement(SectionHeading, {
      kicker: L.certs,
      icon: "award"
    }, L.certsHeading), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: 22
      }
    }, data.certs.map((c, i) => /*#__PURE__*/React.createElement(CertItem, {
      key: i,
      icon: c.icon,
      title: c.title,
      highlight: c.highlight
    }, /*#__PURE__*/React.createElement("p", {
      style: {
        margin: 0
      }
    }, c.desc), c.progress && /*#__PURE__*/React.createElement(CertProgress, {
      p: c.progress
    }))))), /*#__PURE__*/React.createElement("section", {
      className: "cv-main-section"
    }, /*#__PURE__*/React.createElement(SectionHeading, {
      kicker: L.academic,
      icon: "cap"
    }, L.education), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: 22
      }
    }, data.education.map((e, i) => /*#__PURE__*/React.createElement(EduItem, {
      key: i,
      title: e.title,
      school: e.school,
      period: e.period,
      tech: e.tech,
      bullets: e.bullets.map(bulletNode)
    })))));
  }
  window.ResumeMain = ResumeMain;
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/cv/ResumeMain.jsx", error: String((e && e.message) || e) }); }

// ui_kits/cv/ResumeSidebar.jsx
try { (() => {
/* Resume sidebar (dark column) — composed from design-system components. */
(function () {
  const DS = window.SevincCVDesignSystem_3a0c8f;
  const {
    Avatar,
    Badge,
    SideTitle,
    ContactItem,
    SkillGroup,
    Icon
  } = DS;
  function SideList({
    items
  }) {
    // items: array of [strong, rest] or plain strings
    return /*#__PURE__*/React.createElement("ul", {
      style: {
        listStyle: 'none',
        margin: 0,
        padding: 0,
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--gap-list)',
        fontSize: 'var(--fs-sm)',
        color: 'var(--sidebar-muted)'
      }
    }, items.map((it, i) => /*#__PURE__*/React.createElement("li", {
      key: i,
      style: {
        display: 'flex',
        alignItems: 'baseline',
        gap: '10px'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        display: 'inline-block',
        width: 4,
        height: 4,
        borderRadius: '50%',
        background: 'var(--sidebar-soft)',
        flexShrink: 0,
        transform: 'translateY(-2px)'
      }
    }), /*#__PURE__*/React.createElement("span", null, Array.isArray(it) ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("strong", {
      style: {
        color: '#fff',
        fontWeight: 600
      }
    }, it[0]), it[1] ? /*#__PURE__*/React.createElement(React.Fragment, null, " \u2014 ", it[1]) : null) : it))));
  }
  function ResumeSidebar({
    data
  }) {
    const L = data.labels;
    return /*#__PURE__*/React.createElement("aside", {
      className: "cv-sidebar"
    }, /*#__PURE__*/React.createElement("div", {
      className: "cv-profile"
    }, /*#__PURE__*/React.createElement(Avatar, {
      className: "cv-avatar",
      src: "../../assets/suhay-photo.jpg",
      initials: data.profile.initials,
      alt: data.profile.name,
      size: 257
    }), /*#__PURE__*/React.createElement("h1", {
      className: "cv-name"
    }, data.profile.name), /*#__PURE__*/React.createElement("span", {
      className: "cv-role"
    }, data.profile.role), /*#__PURE__*/React.createElement("div", {
      style: {
        marginTop: 14
      }
    }, /*#__PURE__*/React.createElement(SideList, {
      items: data.profile.summary
    }))), /*#__PURE__*/React.createElement("section", {
      className: "cv-side-section"
    }, /*#__PURE__*/React.createElement(SideTitle, {
      icon: "user"
    }, L.contact), /*#__PURE__*/React.createElement("ul", {
      style: {
        listStyle: 'none',
        margin: 0,
        padding: 0,
        display: 'flex',
        flexDirection: 'column',
        gap: 11
      }
    }, data.contact.map((c, i) => /*#__PURE__*/React.createElement(ContactItem, {
      key: i,
      icon: c.icon,
      href: c.href,
      target: c.href && c.href.startsWith('http') ? '_blank' : undefined
    }, Array.isArray(c.text) ? c.text.map((t, j) => /*#__PURE__*/React.createElement(React.Fragment, {
      key: j
    }, t, j < c.text.length - 1 ? /*#__PURE__*/React.createElement("br", null) : null)) : c.text)))), /*#__PURE__*/React.createElement("section", {
      className: "cv-side-section"
    }, /*#__PURE__*/React.createElement(SideTitle, {
      icon: "id"
    }, L.personal), /*#__PURE__*/React.createElement(SideList, {
      items: data.personal
    })), /*#__PURE__*/React.createElement("section", {
      className: "cv-side-section"
    }, /*#__PURE__*/React.createElement(SideTitle, {
      icon: "globe"
    }, L.languages), /*#__PURE__*/React.createElement(SideList, {
      items: data.languages
    })), /*#__PURE__*/React.createElement("section", {
      className: "cv-side-section"
    }, /*#__PURE__*/React.createElement(SideTitle, {
      icon: "code"
    }, L.skills), data.skills.map((g, i) => /*#__PURE__*/React.createElement(SkillGroup, {
      key: i,
      label: g.label,
      style: i === data.skills.length - 1 ? {
        marginBottom: 0
      } : undefined
    }, g.items.map((it, j) => /*#__PURE__*/React.createElement(Badge, {
      key: j,
      variant: g.strong ? 'light' : 'glass'
    }, it))))), /*#__PURE__*/React.createElement("section", {
      className: "cv-side-section"
    }, /*#__PURE__*/React.createElement(SideTitle, {
      icon: "heart"
    }, L.interests), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexWrap: 'wrap',
        gap: 'var(--gap-badge)'
      }
    }, data.interests.map((it, i) => /*#__PURE__*/React.createElement(Badge, {
      key: i,
      variant: "glass"
    }, it)))));
  }
  window.ResumeSidebar = ResumeSidebar;
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/cv/ResumeSidebar.jsx", error: String((e && e.message) || e) }); }

// ui_kits/cv/resume-data.js
try { (() => {
/* Resume content — English & German. Content is verbatim from the source CVs;
   the design system only changes presentation. window.RESUME = { en, de } */
(function () {
  const en = {
    lang: 'en',
    profile: {
      name: 'Suhay Sevinc',
      role: 'M.Sc. Software Engineer',
      initials: 'SS',
      summary: ['Design & development of modern C++ real-time systems', 'Microservices, networking & complex API integration', 'DevOps practices, Gitflow & CI/CD']
    },
    labels: {
      contact: 'Contact',
      personal: 'Personal Details',
      languages: 'Languages',
      skills: 'Skills',
      interests: 'Interests',
      about: 'About Me',
      profile: 'Profile',
      experience: 'Experience',
      experienceHeading: 'Professional Experience',
      certs: 'Certifications',
      certsHeading: 'Certifications & Training',
      academic: 'Academic',
      education: 'Education',
      techStack: 'Tech Stack',
      present: '11/2024 — present'
    },
    contact: [{
      icon: 'phone',
      href: 'tel:+4917691407840',
      text: '+49 176 91407840'
    }, {
      icon: 'mail',
      href: 'mailto:suhay.sevinc@gmail.com',
      text: 'suhay.sevinc@gmail.com'
    }, {
      icon: 'pin',
      text: ['Achdorfer Straße 25', '78176 Blumberg, DE']
    }, {
      icon: 'linkedin',
      href: 'https://www.linkedin.com/in/suhay-sevinc-5b056913a',
      text: 'linkedin.com/in/suhay-sevinc'
    }, {
      icon: 'github',
      href: 'https://github.com/NexusHero',
      text: 'github.com/NexusHero'
    }],
    personal: [['Nationality', 'German'], ['Date of Birth', '07 May 1991'], ['Work Permit', 'G (Cross-border CH)']],
    languages: [['German', 'Native'], ['Turkish', 'Native'], ['English', 'Business fluent']],
    skills: [{
      label: 'Languages',
      strong: true,
      items: ['C++20', 'C# / .NET 10', 'Python']
    }, {
      label: 'Frameworks & Libraries',
      items: ['Qt / QML 6', 'Boost', 'OpenCV', 'ASP.NET Core', 'LINQ', 'NumPy', 'Pandas', 'Keras', 'TensorFlow', 'Jupyter']
    }, {
      label: 'Architecture',
      items: ['Microservices', 'Clean Architecture', 'DDD', 'MVVM', 'ISAQB / Arc42']
    }, {
      label: 'Protocols & APIs',
      items: ['gRPC', 'Protobuf', 'OPC-UA', 'REST', 'MQTT']
    }, {
      label: 'DevOps & Build',
      items: ['Docker', 'Azure DevOps', 'Jenkins', 'GitLab CI', 'Conan', 'NuGet']
    }, {
      label: 'Testing & Quality',
      items: ['GTest', 'GMock', 'xUnit', 'NUnit', 'Google Benchmark', 'Sonarcloud', 'Clang-Format']
    }, {
      label: 'Operating Systems',
      items: ['Linux', 'Windows']
    }],
    interests: ['Home Assistant', 'Raspberry Pi', 'MQTT Sensing', 'Basketball'],
    about: 'Software Engineer (M.Sc.) with over 7 years of experience and deep expertise in hardware-near, distributed, and business-critical software development (C++ and C#/.NET). Experienced in designing complex system architectures, modern DevOps practices (CI/CD), and agile methodologies. Proven track record in technologically demanding and safety-critical industries, including defence and industrial laser technology.',
    jobs: [{
      title: 'Software Engineer',
      company: 'Rheinmetall Air Defence AG, Zurich (CH)',
      period: '11/2024 — present',
      current: true,
      tech: ['C++20', 'QML', 'REST', 'Protobuf', 'TCP/IP', 'Boost', 'GTest'],
      bullets: ['Developed core control software for the Oerlikon Skynex® system, deployed in control nodes and fire control devices', 'Implemented tactical communication protocols (TCP, REST, Protobuf) for networking sensor systems, effectors and simulations', 'Implemented QML interfaces serving as the core operator UI of the system', 'Owned requirements engineering in technical refinements, including elaborating test concepts and aligning with stakeholders', 'Developed unit and integration tests using mocks to isolate system dependencies', 'Introduced Gitflow alongside a modern development process (code reviews, automated testing) for the entire team']
    }, {
      title: 'Software Engineer C++ / C#',
      company: 'TRUMPF SE + Co. KG, Schramberg (DE)',
      period: '03/2019 — 10/2024 · 5 yr 8 mo.',
      tech: ['C++17', 'C#', '.NET 8', 'Python', 'Qt', 'Boost', 'Conan', 'gRPC', 'OPC-UA', 'TCP', 'MQTT', 'OpenCV', 'GenICam', 'GTest', 'xUnit', 'CMake', 'Docker', 'Azure DevOps', 'Sonarcloud'],
      bullets: [{
        strong: 'Vision System:',
        text: ' Extended a C++ vision system (Debian Realtime), built a camera platform for OEM customers including driver software for industrial cameras, and established the CI/CD pipeline with test automation. Simultaneously boosted camera interface performance from 60 to 280 FPS through a driver-level architecture redesign'
      }, {
        strong: 'Quality Data Store:',
        text: ' Developed a .NET-based system for flexible customer data storage and implemented client-server communication via gRPC including versatile database integrations'
      }, {
        strong: 'CAD/CAM Microservice:',
        text: ' Implemented a CAD/CAM microservice leveraging a domain-specific language (LionWeb) with corresponding infrastructure in C#'
      }, {
        strong: 'Middleware & Sensor Integration:',
        text: ' Acted as Scrum Master for a 5-person team, responsible for sprint and capacity planning, while also developing features such as the OPC-UA/gRPC integration'
      }, {
        strong: 'Quality Assurance:',
        text: ' Maintained consistent software quality across all projects through structured development processes (Gitflow, code reviews), adherence to clean-code standards (SOLID), CI/CD pipelines (Azure DevOps), and static analysis (Sonarcloud)'
      }]
    }],
    certs: [{
      icon: 'book',
      highlight: true,
      title: 'ISAQB CPSA-Advanced-Level — Certified Professional for Software Architecture (2026)',
      desc: 'Advanced certification in software architecture methods and patterns. Completed module: Soft-Skills for Software Architects (SOFT).',
      progress: {
        label: 'In Progress',
        note: '1 of 3 modules completed',
        done: 1,
        total: 3
      }
    }, {
      icon: 'award',
      title: 'ISAQB Foundation Level — Certified Professional for Software Architecture (2022)',
      desc: 'Internationally recognised certification for software architecture — fundamentals, methodology and documentation of complex system architectures.'
    }, {
      icon: 'award',
      title: 'Clean Code C++17 (2021)',
      desc: 'Best practices for maintainable, long-lived and testable C++ code based on modern language features.'
    }],
    education: [{
      title: 'Master of Science — Computer Science',
      school: 'Hochschule Furtwangen University, Furtwangen (DE)',
      period: '10/2017 — 03/2019',
      tech: ['Machine Learning', 'Deep Learning', 'Python', 'NumPy', 'Pandas', 'Keras', 'TensorFlow', 'Jupyter', 'OpenCV', 'Git', 'Java'],
      bullets: [{
        strong: 'Focus:',
        text: ' Software Engineering.'
      }, {
        strong: 'Thesis:',
        text: ' Predicting component position using Machine Learning — development and optimisation of a deep neural network with Keras and TensorFlow for automated industrial position detection.'
      }, {
        strong: 'Grade:',
        text: ' 1.9 (German scale, 1.0 = best)'
      }]
    }, {
      title: 'Bachelor of Science — Computer Science',
      school: 'Hochschule Furtwangen University, Furtwangen (DE)',
      period: '03/2014 — 08/2017',
      tech: ['React', 'Node.js', 'C#', 'OPC UA', 'Lua', 'MQTT', 'Scrum', 'OpenCV', 'Git', 'Java'],
      bullets: [{
        strong: 'Thesis:',
        text: ' Industry 4.0 demonstrator — cloud based services (focus on IoT protocols, MQTT and cloud integration).'
      }, {
        strong: 'Grade:',
        text: ' 2.2 (German scale, 1.0 = best)'
      }]
    }]
  };
  const de = {
    lang: 'de',
    profile: {
      name: 'Suhay Sevinc',
      role: 'M.Sc. Software Engineer',
      initials: 'SS',
      summary: ['Design & Entwicklung moderner C++ Echtzeitsysteme', 'Microservices, Vernetzung & komplexe API-Integration', 'DevOps-Praktiken, Gitflow & CI/CD']
    },
    labels: {
      contact: 'Kontakt',
      personal: 'Personalien',
      languages: 'Sprachen',
      skills: 'Kompetenzen',
      interests: 'Interessen',
      about: 'Über mich',
      profile: 'Profil',
      experience: 'Erfahrung',
      experienceHeading: 'Berufserfahrung',
      certs: 'Nachweise',
      certsHeading: 'Zertifizierungen & Schulungen',
      academic: 'Akademisch',
      education: 'Bildungsweg',
      techStack: 'Tech Stack',
      present: '11/2024 — heute'
    },
    contact: [{
      icon: 'phone',
      href: 'tel:+4917691407840',
      text: '+49 176 91407840'
    }, {
      icon: 'mail',
      href: 'mailto:suhay.sevinc@gmail.com',
      text: 'suhay.sevinc@gmail.com'
    }, {
      icon: 'pin',
      text: ['Achdorfer Straße 25', '78176 Blumberg, DE']
    }, {
      icon: 'linkedin',
      href: 'https://www.linkedin.com/in/suhay-sevinc-5b056913a',
      text: 'linkedin.com/in/suhay-sevinc'
    }, {
      icon: 'github',
      href: 'https://github.com/NexusHero',
      text: 'github.com/NexusHero'
    }],
    personal: [['Nationalität', 'Deutsch'], ['Geburtsdatum', '07.05.1991'], ['Bewilligung', 'G (Grenzgänger Schweiz)']],
    languages: [['Deutsch', 'Muttersprache'], ['Türkisch', 'Muttersprache'], ['Englisch', 'Verhandlungssicher']],
    skills: [{
      label: 'Sprachen',
      strong: true,
      items: ['C++20', 'C# / .NET 10', 'Python']
    }, {
      label: 'Frameworks & Bibliotheken',
      items: ['Qt / QML 6', 'Boost', 'OpenCV', 'ASP.NET Core', 'LINQ', 'NumPy', 'Pandas', 'Keras', 'TensorFlow', 'Jupyter']
    }, {
      label: 'Architektur',
      items: ['Microservices', 'Clean Architecture', 'DDD', 'MVVM', 'ISAQB / Arc42']
    }, {
      label: 'Protokolle & APIs',
      items: ['gRPC', 'Protobuf', 'OPC-UA', 'REST', 'MQTT']
    }, {
      label: 'DevOps & Build',
      items: ['Docker', 'Azure DevOps', 'Jenkins', 'GitLab CI', 'Conan', 'NuGet']
    }, {
      label: 'Testing & Qualität',
      items: ['GTest', 'GMock', 'xUnit', 'NUnit', 'Google Benchmark', 'Sonarcloud', 'Clang-Format']
    }, {
      label: 'Betriebssysteme',
      items: ['Linux', 'Windows']
    }],
    interests: ['Home Assistant', 'Raspberry Pi', 'MQTT Sensing', 'Basketball'],
    about: 'Software Engineer (M.Sc.) mit über 7 Jahren Erfahrung und tiefgehendem Expertenwissen in der hardwarenahen, verteilten und geschäftskritischen Softwareentwicklung (C++ und C#/.NET). Erfahren in der Konzeption komplexer Systemarchitekturen, modernen DevOps-Praktiken (CI/CD) und agilen Methoden. Bewährt in technologisch anspruchsvollen und sicherheitskritischen Branchen wie der Verteidigungsindustrie und der industriellen Lasertechnik.',
    jobs: [{
      title: 'Software Engineer',
      company: 'Rheinmetall Air Defence AG, Zürich (CH)',
      period: '11/2024 — heute',
      current: true,
      tech: ['C++20', 'QML', 'REST', 'Protobuf', 'TCP/IP', 'Boost', 'GTest'],
      bullets: ['Entwickelte zentrale Steuersoftware der Oerlikon Skynex® Software, welche in Control Nodes und Feuerleitgeräten zum Einsatz kommt', 'Implementierte taktische Kommunikationsprotokolle (TCP, REST, Protobuf) zur Vernetzung von Sensorsystemen, Effektoren und Simulationen', 'Setzte QML-Oberflächen um, die als Kernbedienoberfläche des Systems eingesetzt werden', 'Verantwortete Requirements Engineering in technischen Refinements, inklusive Ausarbeitung von Testkonzepten und Abstimmung mit Stakeholdern', 'Entwickelte Unit- und Integrationstests mit Mocks zur Isolation von Systemabhängigkeiten', 'Führte Gitflow, begleitet von einem modernen Entwicklungsprozess (Code Reviews, automatisierte Tests), für das gesamte Team ein']
    }, {
      title: 'Software Engineer C++ / C#',
      company: 'TRUMPF SE + Co. KG, Schramberg (DE)',
      period: '03/2019 — 10/2024 · 5 J. 8 M.',
      tech: ['C++17', 'C#', '.NET 8', 'Python', 'Qt', 'Boost', 'Conan', 'gRPC', 'OPC-UA', 'TCP', 'MQTT', 'OpenCV', 'GenICam', 'GTest', 'xUnit', 'CMake', 'Docker', 'Azure DevOps', 'Sonarcloud'],
      bullets: [{
        strong: 'Visionsystem:',
        text: ' Entwickelte ein C++-Visionsystem (Debian Realtime) weiter, realisierte eine Kameraplattform für OEM-Kunden mit Treibersoftware für Industriekameras und etablierte die CI/CD-Pipeline inkl. Testautomatisierung. Steigerte parallel die Performance der Kameraanbindung durch ein Architektur-Redesign auf Treiberebene von 60 auf 280 FPS'
      }, {
        strong: 'Quality Data Store:',
        text: ' Entwickelte ein .NET-basiertes System zur flexiblen Kundendaten-Ablage und implementierte eine Client-Server-Kommunikation via gRPC inklusive vielseitiger Datenbank-Integrationen'
      }, {
        strong: 'CAD/CAM-Microservice:',
        text: ' Implementierte einen CAD/CAM-Microservice unter Nutzung einer domänenspezifischen Sprache (LionWeb) mit zugehöriger Infrastruktur in C#'
      }, {
        strong: 'Middleware & Sensoranbindung:',
        text: ' Agierte als Scrum Master für ein 5-köpfiges Team, verantwortete die Sprint- sowie Kapazitätsplanung. Dabei entwickelte ich auch Features wie die OPC-UA/gRPC-Integration'
      }, {
        strong: 'Qualitätssicherung:',
        text: ' Gewährleistete die durchgängige Softwarequalität über alle Projekte hinweg durch strukturierte Entwicklungsprozesse (Gitflow, Code Reviews), die Einhaltung von Clean-Code-Standards (SOLID), CI/CD-Pipelines (Azure DevOps) und statische Analyse (Sonarcloud)'
      }]
    }],
    certs: [{
      icon: 'book',
      highlight: true,
      title: 'ISAQB CPSA-Advanced-Level — Certified Professional for Software Architecture (2026)',
      desc: 'Vertiefende Zertifizierung in fortgeschrittenen Architekturmethoden und -mustern. Absolviertes Modul: Soft-Skills für Softwarearchitekten (SOFT).',
      progress: {
        label: 'In Bearbeitung',
        note: '1 von 3 Modulen absolviert',
        done: 1,
        total: 3
      }
    }, {
      icon: 'award',
      title: 'ISAQB Foundation Level — Certified Professional for Software Architecture (2022)',
      desc: 'International anerkannte Zertifizierung für Software-Architektur — Grundlagen, Methodik und Dokumentation komplexer Systemarchitekturen.'
    }, {
      icon: 'award',
      title: 'Clean Code C++17 (2021)',
      desc: 'Best Practices für wartbaren, langlebigen und testbaren C++-Code auf Basis moderner Sprachfeatures.'
    }],
    education: [{
      title: 'Master of Science — Informatik',
      school: 'Hochschule Furtwangen, Furtwangen (DE)',
      period: '10/2017 — 03/2019',
      tech: ['Machine Learning', 'Deep Learning', 'Python', 'NumPy', 'Pandas', 'Keras', 'TensorFlow', 'Jupyter', 'OpenCV', 'Git', 'Java'],
      bullets: [{
        strong: 'Schwerpunkt:',
        text: ' Software-Engineering.'
      }, {
        strong: 'Abschlussarbeit:',
        text: ' Vorhersage der Bauteillageposition durch Machine Learning — Entwicklung und Optimierung eines tiefen neuronalen Netzes mit Keras und TensorFlow zur automatisierten industriellen Positionserkennung.'
      }, {
        strong: 'Abschlussnote:',
        text: ' 1.9.'
      }]
    }, {
      title: 'Bachelor of Science — Allgemeine Informatik',
      school: 'Hochschule Furtwangen, Furtwangen (DE)',
      period: '03/2014 — 08/2017',
      tech: ['React', 'Node.js', 'C#', 'OPC UA', 'Lua', 'MQTT', 'Scrum', 'OpenCV', 'Git', 'Java'],
      bullets: [{
        strong: 'Abschlussarbeit:',
        text: ' Industry 4.0 demonstrator — cloud based services (Fokus auf IoT-Protokolle, MQTT und Cloud-Integration).'
      }, {
        strong: 'Abschlussnote:',
        text: ' 2.2.'
      }]
    }]
  };
  window.RESUME = {
    en,
    de
  };
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/cv/resume-data.js", error: String((e && e.message) || e) }); }

__ds_ns.Avatar = __ds_scope.Avatar;

__ds_ns.Badge = __ds_scope.Badge;

__ds_ns.Icon = __ds_scope.Icon;

__ds_ns.MetaPill = __ds_scope.MetaPill;

__ds_ns.CertItem = __ds_scope.CertItem;

__ds_ns.ContactItem = __ds_scope.ContactItem;

__ds_ns.EduItem = __ds_scope.EduItem;

__ds_ns.JobCard = __ds_scope.JobCard;

__ds_ns.SectionHeading = __ds_scope.SectionHeading;

__ds_ns.SideTitle = __ds_scope.SideTitle;

__ds_ns.SkillGroup = __ds_scope.SkillGroup;

__ds_ns.Timeline = __ds_scope.Timeline;

})();
