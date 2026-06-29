/* @ds-bundle: {"format":3,"namespace":"MyJobDesignSystem_f3658e","components":[{"name":"AppShell","sourcePath":"components/app/AppShell.jsx"},{"name":"Avatar","sourcePath":"components/core/Avatar.jsx"},{"name":"Badge","sourcePath":"components/core/Badge.jsx"},{"name":"Button","sourcePath":"components/core/Button.jsx"},{"name":"Icon","sourcePath":"components/core/Icon.jsx"},{"name":"ICON_NAMES","sourcePath":"components/core/Icon.jsx"},{"name":"IconButton","sourcePath":"components/core/IconButton.jsx"},{"name":"MetaPill","sourcePath":"components/core/MetaPill.jsx"},{"name":"EntityTile","sourcePath":"components/core/EntityTile.jsx"},{"name":"ApplicationRow","sourcePath":"components/data/ApplicationRow.jsx"},{"name":"CandidateRow","sourcePath":"components/data/CandidateRow.jsx"},{"name":"Card","sourcePath":"components/data/Card.jsx"},{"name":"MatchIndicator","sourcePath":"components/data/MatchIndicator.jsx"},{"name":"PositionCard","sourcePath":"components/data/PositionCard.jsx"},{"name":"ProgressBar","sourcePath":"components/data/ProgressBar.jsx"},{"name":"StatCard","sourcePath":"components/data/StatCard.jsx"},{"name":"STAGES","sourcePath":"components/data/StatusBadge.jsx"},{"name":"StatusBadge","sourcePath":"components/data/StatusBadge.jsx"},{"name":"Tabs","sourcePath":"components/data/Tabs.jsx"},{"name":"Checkbox","sourcePath":"components/forms/Checkbox.jsx"},{"name":"Input","sourcePath":"components/forms/Input.jsx"},{"name":"Select","sourcePath":"components/forms/Select.jsx"},{"name":"Switch","sourcePath":"components/forms/Switch.jsx"},{"name":"Textarea","sourcePath":"components/forms/Textarea.jsx"}],"sourceHashes":{"components/app/AppShell.jsx":"6b32504bc1a6","components/core/Avatar.jsx":"0cf7c71ffef7","components/core/Badge.jsx":"c65e71a1747c","components/core/Button.jsx":"5f9cb3122052","components/core/Icon.jsx":"7acd36c8049a","components/core/IconButton.jsx":"11c416bbf004","components/core/MetaPill.jsx":"127e09c1b1d7","components/core/EntityTile.jsx":"c6e7448180b1","components/data/ApplicationRow.jsx":"2c61c6905714","components/data/CandidateRow.jsx":"d1f314f43799","components/data/Card.jsx":"6ecddbff63e5","components/data/MatchIndicator.jsx":"1ebb5863ed2a","components/data/PositionCard.jsx":"2cd31ced0b3a","components/data/ProgressBar.jsx":"39c4ae9bb2b5","components/data/StatCard.jsx":"afa0089bbae3","components/data/StatusBadge.jsx":"9e218736fd5f","components/data/Tabs.jsx":"d7895fd812a5","components/forms/Checkbox.jsx":"3ff388154f50","components/forms/Input.jsx":"d4c959e866f5","components/forms/Select.jsx":"c4da8171f3d4","components/forms/Switch.jsx":"798cb097d1f9","components/forms/Textarea.jsx":"a49a73a5a3fb"},"inlinedExternals":[],"unexposedExports":[],"localRebuild":"esbuild — canonical bundle exceeds DesignSync 256KiB get_file cap"} */

(() => {
  // ../../../../private/tmp/claude-501/-Users-suhaysevinc-source-Resume/f6df762b-e23f-48da-af79-719841f50a62/scratchpad/react-shim.js
  var R = window.React;
  var react_shim_default = R;
  var useState = R.useState;
  var useEffect = R.useEffect;
  var useRef = R.useRef;
  var useMemo = R.useMemo;
  var useCallback = R.useCallback;
  var useContext = R.useContext;
  var useReducer = R.useReducer;
  var useLayoutEffect = R.useLayoutEffect;
  var Fragment = R.Fragment;
  var createElement = R.createElement;
  var Children = R.Children;
  var cloneElement = R.cloneElement;
  var forwardRef = R.forwardRef;

  // design/myjob/components/core/Icon.jsx
  var PATHS = {
    /* ---- contact / identity ---- */
    phone: /* @__PURE__ */ react_shim_default.createElement("path", { d: "M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" }),
    mail: /* @__PURE__ */ react_shim_default.createElement("g", null, /* @__PURE__ */ react_shim_default.createElement("path", { d: "M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" }), /* @__PURE__ */ react_shim_default.createElement("polyline", { points: "22,6 12,13 2,6" })),
    pin: /* @__PURE__ */ react_shim_default.createElement("g", null, /* @__PURE__ */ react_shim_default.createElement("path", { d: "M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" }), /* @__PURE__ */ react_shim_default.createElement("circle", { cx: "12", cy: "10", r: "3" })),
    globe: /* @__PURE__ */ react_shim_default.createElement("g", null, /* @__PURE__ */ react_shim_default.createElement("circle", { cx: "12", cy: "12", r: "10" }), /* @__PURE__ */ react_shim_default.createElement("line", { x1: "2", y1: "12", x2: "22", y2: "12" }), /* @__PURE__ */ react_shim_default.createElement("path", { d: "M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" })),
    user: /* @__PURE__ */ react_shim_default.createElement("g", null, /* @__PURE__ */ react_shim_default.createElement("path", { d: "M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" }), /* @__PURE__ */ react_shim_default.createElement("circle", { cx: "12", cy: "7", r: "4" })),
    users: /* @__PURE__ */ react_shim_default.createElement("g", null, /* @__PURE__ */ react_shim_default.createElement("path", { d: "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" }), /* @__PURE__ */ react_shim_default.createElement("circle", { cx: "9", cy: "7", r: "4" }), /* @__PURE__ */ react_shim_default.createElement("path", { d: "M23 21v-2a4 4 0 0 0-3-3.87" }), /* @__PURE__ */ react_shim_default.createElement("path", { d: "M16 3.13a4 4 0 0 1 0 7.75" })),
    id: /* @__PURE__ */ react_shim_default.createElement("g", null, /* @__PURE__ */ react_shim_default.createElement("rect", { x: "3", y: "4", width: "18", height: "16", rx: "2", ry: "2" }), /* @__PURE__ */ react_shim_default.createElement("circle", { cx: "9", cy: "11", r: "2.5" }), /* @__PURE__ */ react_shim_default.createElement("path", { d: "M5 18c.6-2 2.2-3 4-3s3.4 1 4 3" }), /* @__PURE__ */ react_shim_default.createElement("line", { x1: "14.5", y1: "9", x2: "19", y2: "9" }), /* @__PURE__ */ react_shim_default.createElement("line", { x1: "14.5", y1: "13", x2: "19", y2: "13" })),
    building: /* @__PURE__ */ react_shim_default.createElement("g", null, /* @__PURE__ */ react_shim_default.createElement("rect", { x: "4", y: "2", width: "16", height: "20", rx: "2" }), /* @__PURE__ */ react_shim_default.createElement("path", { d: "M9 22v-4h6v4" }), /* @__PURE__ */ react_shim_default.createElement("line", { x1: "8", y1: "6", x2: "8", y2: "6" }), /* @__PURE__ */ react_shim_default.createElement("line", { x1: "12", y1: "6", x2: "12", y2: "6" }), /* @__PURE__ */ react_shim_default.createElement("line", { x1: "16", y1: "6", x2: "16", y2: "6" }), /* @__PURE__ */ react_shim_default.createElement("line", { x1: "8", y1: "10", x2: "8", y2: "10" }), /* @__PURE__ */ react_shim_default.createElement("line", { x1: "12", y1: "10", x2: "12", y2: "10" }), /* @__PURE__ */ react_shim_default.createElement("line", { x1: "16", y1: "10", x2: "16", y2: "10" }), /* @__PURE__ */ react_shim_default.createElement("line", { x1: "8", y1: "14", x2: "8", y2: "14" }), /* @__PURE__ */ react_shim_default.createElement("line", { x1: "12", y1: "14", x2: "12", y2: "14" }), /* @__PURE__ */ react_shim_default.createElement("line", { x1: "16", y1: "14", x2: "16", y2: "14" })),
    /* ---- work / education ---- */
    briefcase: /* @__PURE__ */ react_shim_default.createElement("g", null, /* @__PURE__ */ react_shim_default.createElement("rect", { x: "2", y: "7", width: "20", height: "14", rx: "2", ry: "2" }), /* @__PURE__ */ react_shim_default.createElement("path", { d: "M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" })),
    cap: /* @__PURE__ */ react_shim_default.createElement("g", null, /* @__PURE__ */ react_shim_default.createElement("path", { d: "M22 10L12 5 2 10l10 5 10-5z" }), /* @__PURE__ */ react_shim_default.createElement("path", { d: "M6 12v5c3 3 9 3 12 0v-5" })),
    award: /* @__PURE__ */ react_shim_default.createElement("g", null, /* @__PURE__ */ react_shim_default.createElement("circle", { cx: "12", cy: "8", r: "7" }), /* @__PURE__ */ react_shim_default.createElement("polyline", { points: "8.21 13.89 7 23 12 20 17 23 15.79 13.88" })),
    book: /* @__PURE__ */ react_shim_default.createElement("g", null, /* @__PURE__ */ react_shim_default.createElement("path", { d: "M4 19.5A2.5 2.5 0 0 1 6.5 17H20" }), /* @__PURE__ */ react_shim_default.createElement("path", { d: "M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" })),
    code: /* @__PURE__ */ react_shim_default.createElement("g", null, /* @__PURE__ */ react_shim_default.createElement("polyline", { points: "16 18 22 12 16 6" }), /* @__PURE__ */ react_shim_default.createElement("polyline", { points: "8 6 2 12 8 18" })),
    zap: /* @__PURE__ */ react_shim_default.createElement("polygon", { points: "13 2 3 14 12 14 11 22 21 10 12 10 13 2" }),
    /* ---- documents ---- */
    file: /* @__PURE__ */ react_shim_default.createElement("g", null, /* @__PURE__ */ react_shim_default.createElement("path", { d: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" }), /* @__PURE__ */ react_shim_default.createElement("polyline", { points: "14 2 14 8 20 8" })),
    fileText: /* @__PURE__ */ react_shim_default.createElement("g", null, /* @__PURE__ */ react_shim_default.createElement("path", { d: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" }), /* @__PURE__ */ react_shim_default.createElement("polyline", { points: "14 2 14 8 20 8" }), /* @__PURE__ */ react_shim_default.createElement("line", { x1: "8", y1: "13", x2: "16", y2: "13" }), /* @__PURE__ */ react_shim_default.createElement("line", { x1: "8", y1: "17", x2: "13", y2: "17" })),
    paperclip: /* @__PURE__ */ react_shim_default.createElement("path", { d: "M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" }),
    download: /* @__PURE__ */ react_shim_default.createElement("g", null, /* @__PURE__ */ react_shim_default.createElement("path", { d: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" }), /* @__PURE__ */ react_shim_default.createElement("polyline", { points: "7 10 12 15 17 10" }), /* @__PURE__ */ react_shim_default.createElement("line", { x1: "12", y1: "15", x2: "12", y2: "3" })),
    upload: /* @__PURE__ */ react_shim_default.createElement("g", null, /* @__PURE__ */ react_shim_default.createElement("path", { d: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" }), /* @__PURE__ */ react_shim_default.createElement("polyline", { points: "17 8 12 3 7 8" }), /* @__PURE__ */ react_shim_default.createElement("line", { x1: "12", y1: "3", x2: "12", y2: "15" })),
    external: /* @__PURE__ */ react_shim_default.createElement("g", null, /* @__PURE__ */ react_shim_default.createElement("path", { d: "M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" }), /* @__PURE__ */ react_shim_default.createElement("polyline", { points: "15 3 21 3 21 9" }), /* @__PURE__ */ react_shim_default.createElement("line", { x1: "10", y1: "14", x2: "21", y2: "3" })),
    /* ---- navigation / app chrome ---- */
    home: /* @__PURE__ */ react_shim_default.createElement("g", null, /* @__PURE__ */ react_shim_default.createElement("path", { d: "M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" }), /* @__PURE__ */ react_shim_default.createElement("polyline", { points: "9 22 9 12 15 12 15 22" })),
    inbox: /* @__PURE__ */ react_shim_default.createElement("g", null, /* @__PURE__ */ react_shim_default.createElement("polyline", { points: "22 12 16 12 14 15 10 15 8 12 2 12" }), /* @__PURE__ */ react_shim_default.createElement("path", { d: "M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" })),
    grid: /* @__PURE__ */ react_shim_default.createElement("g", null, /* @__PURE__ */ react_shim_default.createElement("rect", { x: "3", y: "3", width: "7", height: "7" }), /* @__PURE__ */ react_shim_default.createElement("rect", { x: "14", y: "3", width: "7", height: "7" }), /* @__PURE__ */ react_shim_default.createElement("rect", { x: "14", y: "14", width: "7", height: "7" }), /* @__PURE__ */ react_shim_default.createElement("rect", { x: "3", y: "14", width: "7", height: "7" })),
    columns: /* @__PURE__ */ react_shim_default.createElement("g", null, /* @__PURE__ */ react_shim_default.createElement("rect", { x: "3", y: "4", width: "5.5", height: "16", rx: "1" }), /* @__PURE__ */ react_shim_default.createElement("rect", { x: "9.25", y: "4", width: "5.5", height: "16", rx: "1" }), /* @__PURE__ */ react_shim_default.createElement("rect", { x: "15.5", y: "4", width: "5.5", height: "16", rx: "1" })),
    list: /* @__PURE__ */ react_shim_default.createElement("g", null, /* @__PURE__ */ react_shim_default.createElement("line", { x1: "8", y1: "6", x2: "21", y2: "6" }), /* @__PURE__ */ react_shim_default.createElement("line", { x1: "8", y1: "12", x2: "21", y2: "12" }), /* @__PURE__ */ react_shim_default.createElement("line", { x1: "8", y1: "18", x2: "21", y2: "18" }), /* @__PURE__ */ react_shim_default.createElement("line", { x1: "3", y1: "6", x2: "3.01", y2: "6" }), /* @__PURE__ */ react_shim_default.createElement("line", { x1: "3", y1: "12", x2: "3.01", y2: "12" }), /* @__PURE__ */ react_shim_default.createElement("line", { x1: "3", y1: "18", x2: "3.01", y2: "18" })),
    search: /* @__PURE__ */ react_shim_default.createElement("g", null, /* @__PURE__ */ react_shim_default.createElement("circle", { cx: "11", cy: "11", r: "8" }), /* @__PURE__ */ react_shim_default.createElement("line", { x1: "21", y1: "21", x2: "16.65", y2: "16.65" })),
    filter: /* @__PURE__ */ react_shim_default.createElement("polygon", { points: "22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" }),
    sliders: /* @__PURE__ */ react_shim_default.createElement("g", null, /* @__PURE__ */ react_shim_default.createElement("line", { x1: "4", y1: "21", x2: "4", y2: "14" }), /* @__PURE__ */ react_shim_default.createElement("line", { x1: "4", y1: "10", x2: "4", y2: "3" }), /* @__PURE__ */ react_shim_default.createElement("line", { x1: "12", y1: "21", x2: "12", y2: "12" }), /* @__PURE__ */ react_shim_default.createElement("line", { x1: "12", y1: "8", x2: "12", y2: "3" }), /* @__PURE__ */ react_shim_default.createElement("line", { x1: "20", y1: "21", x2: "20", y2: "16" }), /* @__PURE__ */ react_shim_default.createElement("line", { x1: "20", y1: "12", x2: "20", y2: "3" }), /* @__PURE__ */ react_shim_default.createElement("line", { x1: "1", y1: "14", x2: "7", y2: "14" }), /* @__PURE__ */ react_shim_default.createElement("line", { x1: "9", y1: "8", x2: "15", y2: "8" }), /* @__PURE__ */ react_shim_default.createElement("line", { x1: "17", y1: "16", x2: "23", y2: "16" })),
    bell: /* @__PURE__ */ react_shim_default.createElement("g", null, /* @__PURE__ */ react_shim_default.createElement("path", { d: "M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" }), /* @__PURE__ */ react_shim_default.createElement("path", { d: "M13.73 21a2 2 0 0 1-3.46 0" })),
    settings: /* @__PURE__ */ react_shim_default.createElement("g", null, /* @__PURE__ */ react_shim_default.createElement("circle", { cx: "12", cy: "12", r: "3" }), /* @__PURE__ */ react_shim_default.createElement("path", { d: "M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" })),
    menu: /* @__PURE__ */ react_shim_default.createElement("g", null, /* @__PURE__ */ react_shim_default.createElement("line", { x1: "3", y1: "12", x2: "21", y2: "12" }), /* @__PURE__ */ react_shim_default.createElement("line", { x1: "3", y1: "6", x2: "21", y2: "6" }), /* @__PURE__ */ react_shim_default.createElement("line", { x1: "3", y1: "18", x2: "21", y2: "18" })),
    more: /* @__PURE__ */ react_shim_default.createElement("g", null, /* @__PURE__ */ react_shim_default.createElement("circle", { cx: "12", cy: "12", r: "1" }), /* @__PURE__ */ react_shim_default.createElement("circle", { cx: "19", cy: "12", r: "1" }), /* @__PURE__ */ react_shim_default.createElement("circle", { cx: "5", cy: "12", r: "1" })),
    moreV: /* @__PURE__ */ react_shim_default.createElement("g", null, /* @__PURE__ */ react_shim_default.createElement("circle", { cx: "12", cy: "12", r: "1" }), /* @__PURE__ */ react_shim_default.createElement("circle", { cx: "12", cy: "5", r: "1" }), /* @__PURE__ */ react_shim_default.createElement("circle", { cx: "12", cy: "19", r: "1" })),
    /* ---- arrows / chevrons ---- */
    chevronDown: /* @__PURE__ */ react_shim_default.createElement("polyline", { points: "6 9 12 15 18 9" }),
    chevronUp: /* @__PURE__ */ react_shim_default.createElement("polyline", { points: "18 15 12 9 6 15" }),
    chevronRight: /* @__PURE__ */ react_shim_default.createElement("polyline", { points: "9 18 15 12 9 6" }),
    chevronLeft: /* @__PURE__ */ react_shim_default.createElement("polyline", { points: "15 18 9 12 15 6" }),
    arrowRight: /* @__PURE__ */ react_shim_default.createElement("g", null, /* @__PURE__ */ react_shim_default.createElement("line", { x1: "5", y1: "12", x2: "19", y2: "12" }), /* @__PURE__ */ react_shim_default.createElement("polyline", { points: "12 5 19 12 12 19" })),
    arrowLeft: /* @__PURE__ */ react_shim_default.createElement("g", null, /* @__PURE__ */ react_shim_default.createElement("line", { x1: "19", y1: "12", x2: "5", y2: "12" }), /* @__PURE__ */ react_shim_default.createElement("polyline", { points: "12 19 5 12 12 5" })),
    arrowUpRight: /* @__PURE__ */ react_shim_default.createElement("g", null, /* @__PURE__ */ react_shim_default.createElement("line", { x1: "7", y1: "17", x2: "17", y2: "7" }), /* @__PURE__ */ react_shim_default.createElement("polyline", { points: "7 7 17 7 17 17" })),
    /* ---- actions / state ---- */
    plus: /* @__PURE__ */ react_shim_default.createElement("g", null, /* @__PURE__ */ react_shim_default.createElement("line", { x1: "12", y1: "5", x2: "12", y2: "19" }), /* @__PURE__ */ react_shim_default.createElement("line", { x1: "5", y1: "12", x2: "19", y2: "12" })),
    x: /* @__PURE__ */ react_shim_default.createElement("g", null, /* @__PURE__ */ react_shim_default.createElement("line", { x1: "18", y1: "6", x2: "6", y2: "18" }), /* @__PURE__ */ react_shim_default.createElement("line", { x1: "6", y1: "6", x2: "18", y2: "18" })),
    check: /* @__PURE__ */ react_shim_default.createElement("polyline", { points: "20 6 9 17 4 12" }),
    checkCircle: /* @__PURE__ */ react_shim_default.createElement("g", null, /* @__PURE__ */ react_shim_default.createElement("path", { d: "M22 11.08V12a10 10 0 1 1-5.93-9.14" }), /* @__PURE__ */ react_shim_default.createElement("polyline", { points: "22 4 12 14.01 9 11.01" })),
    xCircle: /* @__PURE__ */ react_shim_default.createElement("g", null, /* @__PURE__ */ react_shim_default.createElement("circle", { cx: "12", cy: "12", r: "10" }), /* @__PURE__ */ react_shim_default.createElement("line", { x1: "15", y1: "9", x2: "9", y2: "15" }), /* @__PURE__ */ react_shim_default.createElement("line", { x1: "9", y1: "9", x2: "15", y2: "15" })),
    alert: /* @__PURE__ */ react_shim_default.createElement("g", null, /* @__PURE__ */ react_shim_default.createElement("path", { d: "M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" }), /* @__PURE__ */ react_shim_default.createElement("line", { x1: "12", y1: "9", x2: "12", y2: "13" }), /* @__PURE__ */ react_shim_default.createElement("line", { x1: "12", y1: "17", x2: "12.01", y2: "17" })),
    info: /* @__PURE__ */ react_shim_default.createElement("g", null, /* @__PURE__ */ react_shim_default.createElement("circle", { cx: "12", cy: "12", r: "10" }), /* @__PURE__ */ react_shim_default.createElement("line", { x1: "12", y1: "16", x2: "12", y2: "12" }), /* @__PURE__ */ react_shim_default.createElement("line", { x1: "12", y1: "8", x2: "12.01", y2: "8" })),
    edit: /* @__PURE__ */ react_shim_default.createElement("g", null, /* @__PURE__ */ react_shim_default.createElement("path", { d: "M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" }), /* @__PURE__ */ react_shim_default.createElement("path", { d: "M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" })),
    trash: /* @__PURE__ */ react_shim_default.createElement("g", null, /* @__PURE__ */ react_shim_default.createElement("polyline", { points: "3 6 5 6 21 6" }), /* @__PURE__ */ react_shim_default.createElement("path", { d: "M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" })),
    star: /* @__PURE__ */ react_shim_default.createElement("polygon", { points: "12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" }),
    bookmark: /* @__PURE__ */ react_shim_default.createElement("path", { d: "M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" }),
    eye: /* @__PURE__ */ react_shim_default.createElement("g", null, /* @__PURE__ */ react_shim_default.createElement("path", { d: "M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" }), /* @__PURE__ */ react_shim_default.createElement("circle", { cx: "12", cy: "12", r: "3" })),
    send: /* @__PURE__ */ react_shim_default.createElement("g", null, /* @__PURE__ */ react_shim_default.createElement("line", { x1: "22", y1: "2", x2: "11", y2: "13" }), /* @__PURE__ */ react_shim_default.createElement("polygon", { points: "22 2 15 22 11 13 2 9 22 2" })),
    message: /* @__PURE__ */ react_shim_default.createElement("path", { d: "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" }),
    clock: /* @__PURE__ */ react_shim_default.createElement("g", null, /* @__PURE__ */ react_shim_default.createElement("circle", { cx: "12", cy: "12", r: "10" }), /* @__PURE__ */ react_shim_default.createElement("polyline", { points: "12 6 12 12 16 14" })),
    calendar: /* @__PURE__ */ react_shim_default.createElement("g", null, /* @__PURE__ */ react_shim_default.createElement("rect", { x: "3", y: "4", width: "18", height: "18", rx: "2", ry: "2" }), /* @__PURE__ */ react_shim_default.createElement("line", { x1: "16", y1: "2", x2: "16", y2: "6" }), /* @__PURE__ */ react_shim_default.createElement("line", { x1: "8", y1: "2", x2: "8", y2: "6" }), /* @__PURE__ */ react_shim_default.createElement("line", { x1: "3", y1: "10", x2: "21", y2: "10" })),
    tag: /* @__PURE__ */ react_shim_default.createElement("g", null, /* @__PURE__ */ react_shim_default.createElement("path", { d: "M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" }), /* @__PURE__ */ react_shim_default.createElement("line", { x1: "7", y1: "7", x2: "7.01", y2: "7" })),
    trend: /* @__PURE__ */ react_shim_default.createElement("g", null, /* @__PURE__ */ react_shim_default.createElement("polyline", { points: "23 6 13.5 15.5 8.5 10.5 1 18" }), /* @__PURE__ */ react_shim_default.createElement("polyline", { points: "17 6 23 6 23 12" })),
    thumbsUp: /* @__PURE__ */ react_shim_default.createElement("path", { d: "M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" }),
    heart: /* @__PURE__ */ react_shim_default.createElement("path", { d: "M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" }),
    logout: /* @__PURE__ */ react_shim_default.createElement("g", null, /* @__PURE__ */ react_shim_default.createElement("path", { d: "M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" }), /* @__PURE__ */ react_shim_default.createElement("polyline", { points: "16 17 21 12 16 7" }), /* @__PURE__ */ react_shim_default.createElement("line", { x1: "21", y1: "12", x2: "9", y2: "12" })),
    /* ---- social ---- */
    linkedin: /* @__PURE__ */ react_shim_default.createElement("g", null, /* @__PURE__ */ react_shim_default.createElement("path", { d: "M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" }), /* @__PURE__ */ react_shim_default.createElement("rect", { x: "2", y: "9", width: "4", height: "12" }), /* @__PURE__ */ react_shim_default.createElement("circle", { cx: "4", cy: "4", r: "2" })),
    github: /* @__PURE__ */ react_shim_default.createElement("path", { d: "M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" })
  };
  var SOLID = {
    home: /* @__PURE__ */ react_shim_default.createElement("path", { d: "M11.3 3.26a1 1 0 0 1 1.4 0l8.5 7.92A1 1 0 0 1 20.5 13H19v6.5a1.5 1.5 0 0 1-1.5 1.5H15a1 1 0 0 1-1-1v-4a1 1 0 0 0-1-1h-2a1 1 0 0 0-1 1v4a1 1 0 0 1-1 1H6.5A1.5 1.5 0 0 1 5 19.5V13H3.5a1 1 0 0 1-.7-1.82l8.5-7.92z" }),
    users: /* @__PURE__ */ react_shim_default.createElement("path", { d: "M9 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm8.5-1a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM9 14c-4.2 0-7 2.1-7 4.8V20a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-1.2C16 16.1 13.2 14 9 14zm8.5 0c-.5 0-1 .03-1.46.1C17.5 15.3 18 16.9 18 18.8V21h4a1 1 0 0 0 1-1v-.9c0-2.7-2.4-5.1-5.5-5.1z" }),
    briefcase: /* @__PURE__ */ react_shim_default.createElement("g", null, /* @__PURE__ */ react_shim_default.createElement("path", { d: "M9 4a2 2 0 0 0-2 2v1.5h2V6h6v1.5h2V6a2 2 0 0 0-2-2H9z" }), /* @__PURE__ */ react_shim_default.createElement("path", { d: "M3 9a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v3.6a1 1 0 0 1-.62.92l-7.4 3a3 3 0 0 1-1.96 0l-7.4-3A1 1 0 0 1 3 12.6V9z" }), /* @__PURE__ */ react_shim_default.createElement("path", { d: "M21 15.9l-7 2.84a4 4 0 0 1-2 0L3 15.9V18a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-2.1z" })),
    search: /* @__PURE__ */ react_shim_default.createElement("g", null, /* @__PURE__ */ react_shim_default.createElement("circle", { cx: "10.5", cy: "10.5", r: "7" }), /* @__PURE__ */ react_shim_default.createElement("path", { d: "M16.32 14.9l4.39 4.39a1 1 0 0 1-1.42 1.42l-4.39-4.39 1.42-1.42z" })),
    columns: /* @__PURE__ */ react_shim_default.createElement("g", null, /* @__PURE__ */ react_shim_default.createElement("rect", { x: "3", y: "4", width: "5.2", height: "16", rx: "1.2" }), /* @__PURE__ */ react_shim_default.createElement("rect", { x: "9.4", y: "4", width: "5.2", height: "16", rx: "1.2" }), /* @__PURE__ */ react_shim_default.createElement("rect", { x: "15.8", y: "4", width: "5.2", height: "16", rx: "1.2" })),
    send: /* @__PURE__ */ react_shim_default.createElement("path", { d: "M21.7 2.3a1 1 0 0 0-1.05-.24L2.9 8.6a1 1 0 0 0 .06 1.9l7.05 2.15a.5.5 0 0 1 .33.33l2.15 7.05a1 1 0 0 0 1.9.06l6.54-17.74a1 1 0 0 0-.23-1.05z" }),
    fileText: /* @__PURE__ */ react_shim_default.createElement("path", { d: "M6 2a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8.5L13.5 2H6zm7 1.5L18.5 9H14a1 1 0 0 1-1-1V3.5z" })
  };
  function Icon({ name, size = 16, strokeWidth = 1.8, solid = false, style = {}, ...rest }) {
    const useSolid = solid && SOLID[name];
    const glyph = useSolid ? SOLID[name] : PATHS[name];
    return /* @__PURE__ */ react_shim_default.createElement(
      "svg",
      {
        viewBox: "0 0 24 24",
        width: size,
        height: size,
        fill: useSolid ? "currentColor" : "none",
        stroke: useSolid ? "none" : "currentColor",
        strokeWidth,
        strokeLinecap: "round",
        strokeLinejoin: "round",
        "aria-hidden": "true",
        style: { display: "block", flexShrink: 0, ...style },
        ...rest
      },
      glyph || null
    );
  }
  var ICON_NAMES = Object.keys(PATHS);

  // design/myjob/components/core/Avatar.jsx
  function initialsFrom(name = "") {
    return name.trim().split(/\s+/).slice(0, 2).map((w) => w[0] || "").join("").toUpperCase();
  }
  var SIZES = { xs: 24, sm: 32, md: 40, lg: 56, xl: 72 };
  function Avatar({ src, name = "", initials, size = "md", radius = "50%", ring = false, style = {}, ...rest }) {
    const px = typeof size === "number" ? size : SIZES[size] || 40;
    const ini = initials != null ? initials : initialsFrom(name);
    const fontSize = Math.round(px * 0.38);
    return /* @__PURE__ */ react_shim_default.createElement(
      "div",
      {
        title: name || void 0,
        style: {
          position: "relative",
          width: `${px}px`,
          height: `${px}px`,
          flexShrink: 0,
          borderRadius: radius,
          overflow: "hidden",
          isolation: "isolate",
          boxShadow: ring ? "0 0 0 2px var(--surface-card), 0 0 0 4px var(--accent)" : "none",
          ...style
        },
        ...rest
      },
      /* @__PURE__ */ react_shim_default.createElement(
        "div",
        {
          "aria-hidden": "true",
          style: {
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "var(--font-display)",
            fontSize: `${fontSize}px`,
            fontWeight: "var(--fw-semibold)",
            letterSpacing: "var(--ls-tight)",
            color: "#ffffff",
            background: "linear-gradient(155deg, var(--ink-700) 0%, var(--ink-900) 100%)",
            zIndex: 0
          }
        },
        ini
      ),
      src && /* @__PURE__ */ react_shim_default.createElement(
        "img",
        {
          src,
          alt: name,
          onError: (e) => {
            e.currentTarget.style.display = "none";
          },
          style: { position: "relative", zIndex: 1, width: "100%", height: "100%", objectFit: "cover", display: "block" }
        }
      )
    );
  }

  // design/myjob/components/app/AppShell.jsx
  function Logomark({ size = 30 }) {
    const bar = (h, o) => /* @__PURE__ */ react_shim_default.createElement("span", { style: { display: "block", width: Math.round(size * 0.13), background: "#fff", borderRadius: "1px", height: `${h}%`, opacity: o } });
    return /* @__PURE__ */ react_shim_default.createElement(
      "span",
      {
        style: {
          width: size,
          height: size,
          borderRadius: size * 0.28,
          background: "var(--accent)",
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "center",
          gap: Math.round(size * 0.07),
          padding: size * 0.22,
          flexShrink: 0,
          boxSizing: "border-box"
        }
      },
      bar(45, 0.55),
      bar(72, 0.8),
      bar(100, 1)
    );
  }
  function Wordmark({ product, onDark = true }) {
    const muted = onDark ? "var(--sidebar-soft)" : "var(--text-soft)";
    const ink = onDark ? "#fff" : "var(--text-heading)";
    return /* @__PURE__ */ react_shim_default.createElement("div", { style: { lineHeight: 1, minWidth: 0 } }, /* @__PURE__ */ react_shim_default.createElement("div", { style: { fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "18px", color: ink, letterSpacing: "-0.02em", display: "flex", alignItems: "baseline", gap: "6px" } }, /* @__PURE__ */ react_shim_default.createElement("span", null, /* @__PURE__ */ react_shim_default.createElement("span", { style: { color: "var(--accent-on-dark)" } }, "my"), "Job"), product === "recruit" && /* @__PURE__ */ react_shim_default.createElement("span", { style: { fontFamily: "var(--font-display)", fontSize: "13px", fontWeight: 600, color: "var(--accent-on-dark)" } }, "Recruit")), /* @__PURE__ */ react_shim_default.createElement("div", { style: { fontFamily: "var(--font-mono)", fontSize: "9px", letterSpacing: "0.14em", textTransform: "uppercase", color: muted, marginTop: "3px" } }, product === "recruit" ? "Vermittler-Workspace" : "F\xFCr Bewerber:innen"));
  }
  function RailNavItem({ item, active, onClick }) {
    const [hover, setHover] = react_shim_default.useState(false);
    return /* @__PURE__ */ react_shim_default.createElement(
      "button",
      {
        onClick,
        onMouseEnter: () => setHover(true),
        onMouseLeave: () => setHover(false),
        style: {
          display: "flex",
          alignItems: "center",
          gap: "11px",
          width: "100%",
          padding: "9px 11px",
          borderRadius: "var(--radius-md)",
          border: "none",
          cursor: "pointer",
          fontFamily: "var(--font-body)",
          fontSize: "13.5px",
          fontWeight: active ? 600 : 500,
          color: active ? "#fff" : "var(--sidebar-muted)",
          background: active ? "color-mix(in oklch, var(--accent) 24%, transparent)" : hover ? "var(--sidebar-glass)" : "transparent",
          textAlign: "left",
          transition: "background var(--dur-fast), color var(--dur-fast)"
        }
      },
      /* @__PURE__ */ react_shim_default.createElement(Icon, { name: item.icon, size: 17, solid: active, style: { color: active ? "var(--accent-on-dark)" : "currentColor" } }),
      /* @__PURE__ */ react_shim_default.createElement("span", { style: { flex: 1 } }, item.label),
      item.badge != null && item.badge > 0 && /* @__PURE__ */ react_shim_default.createElement("span", { style: { fontFamily: "var(--font-mono)", fontSize: "10px", fontWeight: 600, color: active ? "#fff" : "var(--sidebar-soft)", background: active ? "var(--accent)" : "var(--sidebar-glass)", borderRadius: "var(--radius-pill)", padding: "1px 7px", minWidth: "18px", textAlign: "center" } }, item.badge)
    );
  }
  function Topbar({ title, subtitle, search, searchPlaceholder, onSearch, searchValue, actions }) {
    return /* @__PURE__ */ react_shim_default.createElement("header", { style: {
      height: "var(--app-topbar-h)",
      flexShrink: 0,
      display: "flex",
      alignItems: "center",
      gap: "16px",
      padding: "0 24px",
      background: "color-mix(in oklch, var(--paper) 88%, transparent)",
      backdropFilter: "blur(10px)",
      WebkitBackdropFilter: "blur(10px)",
      borderBottom: "1px solid var(--border)",
      position: "sticky",
      top: 0,
      zIndex: 5
    } }, /* @__PURE__ */ react_shim_default.createElement("div", { style: { minWidth: 0 } }, /* @__PURE__ */ react_shim_default.createElement("h1", { style: { fontFamily: "var(--font-display)", fontSize: "18px", fontWeight: 700, color: "var(--text-heading)", margin: 0, letterSpacing: "-0.015em", whiteSpace: "nowrap" } }, title), subtitle && /* @__PURE__ */ react_shim_default.createElement("div", { style: { fontSize: "11.5px", color: "var(--text-soft)", marginTop: "1px", whiteSpace: "nowrap" } }, subtitle)), /* @__PURE__ */ react_shim_default.createElement("div", { style: { marginLeft: "auto", display: "flex", alignItems: "center", gap: "10px" } }, search && /* @__PURE__ */ react_shim_default.createElement("label", { style: { display: "flex", alignItems: "center", gap: "8px", background: "var(--surface-card)", border: "1px solid var(--border-strong)", borderRadius: "var(--radius-md)", padding: "0 11px", width: "230px" } }, /* @__PURE__ */ react_shim_default.createElement(Icon, { name: "search", size: 15, style: { color: "var(--text-soft)" } }), /* @__PURE__ */ react_shim_default.createElement(
      "input",
      {
        value: searchValue || "",
        onChange: (e) => onSearch && onSearch(e.target.value),
        placeholder: searchPlaceholder || "Suchen \u2026",
        style: { flex: 1, minWidth: 0, border: "none", outline: "none", background: "transparent", fontFamily: "var(--font-body)", fontSize: "13px", color: "var(--text-heading)", padding: "8px 0" }
      }
    )), /* @__PURE__ */ react_shim_default.createElement("span", { style: { position: "relative", display: "inline-flex" } }, /* @__PURE__ */ react_shim_default.createElement("button", { title: "Benachrichtigungen", style: { width: "36px", height: "36px", display: "grid", placeItems: "center", borderRadius: "var(--radius-md)", border: "1px solid var(--border-strong)", background: "var(--surface-card)", cursor: "pointer", color: "var(--text-muted)" } }, /* @__PURE__ */ react_shim_default.createElement(Icon, { name: "bell", size: 16 })), /* @__PURE__ */ react_shim_default.createElement("span", { style: { position: "absolute", top: "-2px", right: "-2px", width: "8px", height: "8px", borderRadius: "50%", background: "var(--signal-500)", border: "2px solid var(--paper)" } })), actions));
  }
  function RailShell({ product, nav, active, onNav, account, settingsLabel, title, subtitle, search, searchPlaceholder, onSearch, searchValue, actions, detail, children }) {
    return /* @__PURE__ */ react_shim_default.createElement("div", { style: { display: "flex", height: "100%", minHeight: 0, overflow: "hidden", background: "var(--surface-app)" } }, /* @__PURE__ */ react_shim_default.createElement("aside", { style: {
      width: "var(--app-nav-width)",
      flexShrink: 0,
      display: "flex",
      flexDirection: "column",
      background: "linear-gradient(165deg, var(--ink-850) 0%, var(--ink-900) 100%)",
      borderRight: "1px solid var(--sidebar-border)"
    } }, /* @__PURE__ */ react_shim_default.createElement("div", { style: { padding: "18px 16px 14px", display: "flex", alignItems: "center", gap: "11px" } }, /* @__PURE__ */ react_shim_default.createElement(Logomark, { size: 34 }), /* @__PURE__ */ react_shim_default.createElement(Wordmark, { product })), /* @__PURE__ */ react_shim_default.createElement("nav", { style: { padding: "6px 12px", display: "flex", flexDirection: "column", gap: "3px", flex: 1, overflowY: "auto" } }, nav.map((n) => /* @__PURE__ */ react_shim_default.createElement(RailNavItem, { key: n.id, item: n, active: active === n.id, onClick: () => onNav && onNav(n.id) }))), /* @__PURE__ */ react_shim_default.createElement("div", { style: { padding: "8px 12px 10px", display: "flex", flexDirection: "column", gap: "3px", borderTop: "1px solid var(--sidebar-border)" } }, /* @__PURE__ */ react_shim_default.createElement(RailNavItem, { item: { id: "__settings", label: settingsLabel || "Einstellungen", icon: "sliders" }, active: active === "__settings", onClick: () => onNav && onNav("__settings") }), account && /* @__PURE__ */ react_shim_default.createElement("button", { onClick: () => onNav && onNav("__account"), style: {
      marginTop: "4px",
      padding: "9px 11px",
      borderRadius: "var(--radius-md)",
      cursor: "pointer",
      textAlign: "left",
      background: "var(--sidebar-glass)",
      border: "1px solid var(--sidebar-border)",
      display: "flex",
      alignItems: "center",
      gap: "10px"
    } }, /* @__PURE__ */ react_shim_default.createElement(Avatar, { name: account.name, src: account.src, size: "sm", ring: true }), /* @__PURE__ */ react_shim_default.createElement("span", { style: { flex: 1, minWidth: 0 } }, /* @__PURE__ */ react_shim_default.createElement("span", { style: { display: "block", fontSize: "12.5px", fontWeight: 600, color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" } }, account.name), account.meta && /* @__PURE__ */ react_shim_default.createElement("span", { style: { display: "block", fontFamily: "var(--font-mono)", fontSize: "10px", color: "var(--sidebar-soft)" } }, account.meta)), /* @__PURE__ */ react_shim_default.createElement(Icon, { name: "chevronRight", size: 14, style: { color: "var(--sidebar-soft)" } })))), /* @__PURE__ */ react_shim_default.createElement("div", { style: { flex: 1, display: "flex", flexDirection: "column", minWidth: 0 } }, /* @__PURE__ */ react_shim_default.createElement(Topbar, { title, subtitle, search, searchPlaceholder, onSearch, searchValue, actions }), /* @__PURE__ */ react_shim_default.createElement("div", { style: { flex: 1, display: "flex", minHeight: 0 } }, /* @__PURE__ */ react_shim_default.createElement("main", { style: { flex: 1, overflowY: "auto", padding: "var(--pad-app)", minWidth: 0 } }, children), detail && /* @__PURE__ */ react_shim_default.createElement("aside", { style: { width: "360px", flexShrink: 0, borderLeft: "1px solid var(--border)", background: "var(--surface-card)", overflowY: "auto" } }, detail))));
  }
  function TabsShell({ product, nav, active, onNav, account, title, actions, children }) {
    const tabs = nav.slice(0, 5);
    return /* @__PURE__ */ react_shim_default.createElement("div", { style: { display: "flex", flexDirection: "column", height: "100%", minHeight: 0, background: "var(--surface-app)" } }, /* @__PURE__ */ react_shim_default.createElement("header", { style: {
      flexShrink: 0,
      height: "54px",
      display: "flex",
      alignItems: "center",
      gap: "11px",
      padding: "0 16px",
      background: "linear-gradient(165deg, var(--ink-850) 0%, var(--ink-900) 100%)",
      color: "#fff"
    } }, /* @__PURE__ */ react_shim_default.createElement(Logomark, { size: 26 }), /* @__PURE__ */ react_shim_default.createElement("span", { style: { fontFamily: "var(--font-display)", fontSize: "16px", fontWeight: 700, letterSpacing: "-0.015em", flex: 1, minWidth: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" } }, title), actions, /* @__PURE__ */ react_shim_default.createElement("span", { style: { position: "relative", display: "inline-flex" } }, /* @__PURE__ */ react_shim_default.createElement("button", { title: "Benachrichtigungen", style: { width: "34px", height: "34px", display: "grid", placeItems: "center", borderRadius: "var(--radius-md)", border: "1px solid var(--sidebar-border)", background: "var(--sidebar-glass)", cursor: "pointer", color: "#fff" } }, /* @__PURE__ */ react_shim_default.createElement(Icon, { name: "bell", size: 16 })), /* @__PURE__ */ react_shim_default.createElement("span", { style: { position: "absolute", top: "0", right: "0", width: "7px", height: "7px", borderRadius: "50%", background: "var(--signal-on-dark)" } })), account && /* @__PURE__ */ react_shim_default.createElement(Avatar, { name: account.name, src: account.src, size: "sm", ring: true })), /* @__PURE__ */ react_shim_default.createElement("main", { style: { flex: 1, overflowY: "auto", padding: "16px 14px 20px", minHeight: 0 } }, children), /* @__PURE__ */ react_shim_default.createElement("nav", { style: {
      flexShrink: 0,
      display: "grid",
      gridTemplateColumns: `repeat(${tabs.length}, 1fr)`,
      background: "var(--surface-card)",
      borderTop: "1px solid var(--border)",
      paddingBottom: "env(safe-area-inset-bottom)"
    } }, tabs.map((n) => {
      const on = active === n.id;
      return /* @__PURE__ */ react_shim_default.createElement("button", { key: n.id, onClick: () => onNav && onNav(n.id), style: {
        border: "none",
        background: "transparent",
        cursor: "pointer",
        padding: "9px 4px 10px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "4px",
        color: on ? "var(--accent-strong)" : "var(--text-soft)"
      } }, /* @__PURE__ */ react_shim_default.createElement("span", { style: { position: "relative", display: "inline-flex", alignItems: "center", justifyContent: "center", width: "54px", height: "28px", borderRadius: "var(--radius-pill)", background: on ? "var(--accent-soft)" : "transparent", transition: "background var(--dur-fast) var(--ease-out)" } }, /* @__PURE__ */ react_shim_default.createElement(Icon, { name: n.icon, size: 21, solid: on, strokeWidth: on ? 2.1 : 1.8 }), n.badge != null && n.badge > 0 && /* @__PURE__ */ react_shim_default.createElement("span", { style: { position: "absolute", top: "-5px", right: "-8px", fontFamily: "var(--font-mono)", fontSize: "9px", fontWeight: 700, color: "var(--accent-contrast)", background: "var(--accent)", borderRadius: "var(--radius-pill)", padding: "0 4px", minWidth: "15px", textAlign: "center", lineHeight: "15px" } }, n.badge)), /* @__PURE__ */ react_shim_default.createElement("span", { style: { fontSize: "10px", fontWeight: on ? 600 : 500, letterSpacing: "0.01em", whiteSpace: "nowrap" } }, n.label));
    })));
  }
  function AppShell({ posture = "rail", ...props }) {
    return posture === "tabs" ? /* @__PURE__ */ react_shim_default.createElement(TabsShell, { ...props }) : /* @__PURE__ */ react_shim_default.createElement(RailShell, { ...props });
  }

  // design/myjob/components/core/Badge.jsx
  var BASE = {
    display: "inline-flex",
    alignItems: "center",
    gap: "5px",
    fontFamily: "var(--font-mono)",
    fontWeight: "var(--fw-medium)",
    lineHeight: 1.4,
    whiteSpace: "nowrap",
    borderRadius: "var(--radius-pill)",
    border: "1px solid transparent"
  };
  var SIZES2 = {
    sm: { fontSize: "11px", padding: "3px 8px" },
    md: { fontSize: "12px", padding: "4px 10px" }
  };
  var VARIANTS = {
    outline: { background: "var(--surface-card)", color: "var(--text-muted)", borderColor: "var(--border-strong)" },
    subtle: { background: "var(--surface-sunk)", color: "var(--text-muted)", borderColor: "var(--border)" },
    solid: { background: "var(--accent)", color: "var(--accent-contrast)", borderColor: "var(--accent)" },
    soft: { background: "var(--accent-soft)", color: "var(--accent-strong)", borderColor: "var(--accent-border)" },
    glass: {
      background: "var(--sidebar-glass)",
      color: "var(--sidebar-text)",
      borderColor: "var(--sidebar-border-strong)",
      backdropFilter: "blur(8px)",
      WebkitBackdropFilter: "blur(8px)"
    },
    light: { background: "#ffffff", color: "var(--ink-900)", borderColor: "#ffffff", fontWeight: "var(--fw-semibold)" }
  };
  function Badge({ children, variant = "outline", size = "md", icon = null, style = {}, ...rest }) {
    return /* @__PURE__ */ react_shim_default.createElement("span", { style: { ...BASE, ...SIZES2[size], ...VARIANTS[variant], ...style }, ...rest }, icon, children);
  }

  // design/myjob/components/core/Button.jsx
  var SIZES3 = {
    sm: { fontSize: "12px", padding: "7px 14px", gap: "6px" },
    md: { fontSize: "13px", padding: "10px 18px", gap: "7px" },
    lg: { fontSize: "14px", padding: "12px 24px", gap: "8px" }
  };
  var VARIANTS2 = {
    /* filled accent — the one primary action on a view */
    primary: { background: "var(--accent)", color: "var(--accent-contrast)", border: "1px solid var(--accent)" },
    /* dark ink — a strong secondary (e.g. on light toolbars) */
    ink: { background: "var(--ink-900)", color: "#ffffff", border: "1px solid var(--ink-900)" },
    /* outlined — secondary action */
    outline: { background: "var(--surface-card)", color: "var(--text-body)", border: "1px solid var(--border-strong)" },
    /* quiet — tertiary, low-emphasis */
    ghost: { background: "transparent", color: "var(--text-muted)", border: "1px solid transparent" },
    /* destructive */
    danger: { background: "var(--danger)", color: "#ffffff", border: "1px solid var(--danger)" }
  };
  function Button({
    children,
    variant = "primary",
    size = "md",
    iconLeft = null,
    iconRight = null,
    block = false,
    disabled = false,
    type = "button",
    style = {},
    ...rest
  }) {
    return /* @__PURE__ */ react_shim_default.createElement(
      "button",
      {
        type,
        disabled,
        style: {
          display: block ? "flex" : "inline-flex",
          width: block ? "100%" : "auto",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "var(--font-mono)",
          fontWeight: "var(--fw-semibold)",
          lineHeight: 1,
          whiteSpace: "nowrap",
          borderRadius: "var(--radius-pill)",
          cursor: disabled ? "not-allowed" : "pointer",
          opacity: disabled ? 0.45 : 1,
          transition: "transform var(--dur-fast) var(--ease-out), box-shadow var(--dur-fast) var(--ease-out), background var(--dur-fast) var(--ease-out), border-color var(--dur-fast) var(--ease-out)",
          ...SIZES3[size],
          ...VARIANTS2[variant],
          ...style
        },
        onMouseEnter: (e) => {
          if (!disabled) {
            e.currentTarget.style.transform = "translateY(-1px)";
            e.currentTarget.style.boxShadow = "var(--shadow-md)";
          }
        },
        onMouseLeave: (e) => {
          e.currentTarget.style.transform = "none";
          e.currentTarget.style.boxShadow = "none";
        },
        ...rest
      },
      iconLeft,
      children,
      iconRight
    );
  }

  // design/myjob/components/core/IconButton.jsx
  var SIZES4 = {
    sm: { width: "30px", height: "30px", icon: 15, radius: "var(--radius-sm)" },
    md: { width: "36px", height: "36px", icon: 17, radius: "var(--radius-md)" },
    lg: { width: "44px", height: "44px", icon: 20, radius: "var(--radius-md)" }
  };
  var VARIANTS3 = {
    outline: { background: "var(--surface-card)", color: "var(--text-muted)", border: "1px solid var(--border-strong)" },
    ghost: { background: "transparent", color: "var(--text-soft)", border: "1px solid transparent" },
    ink: { background: "var(--ink-900)", color: "#ffffff", border: "1px solid var(--ink-900)" },
    glass: { background: "var(--sidebar-glass)", color: "#ffffff", border: "1px solid var(--sidebar-border-strong)" },
    accent: { background: "var(--accent)", color: "var(--accent-contrast)", border: "1px solid var(--accent)" }
  };
  function IconButton({ icon, label, variant = "outline", size = "md", disabled = false, style = {}, ...rest }) {
    const s = SIZES4[size];
    return /* @__PURE__ */ react_shim_default.createElement(
      "button",
      {
        type: "button",
        title: label,
        "aria-label": label,
        disabled,
        style: {
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: s.width,
          height: s.height,
          borderRadius: s.radius,
          cursor: disabled ? "not-allowed" : "pointer",
          opacity: disabled ? 0.4 : 1,
          transition: "background var(--dur-fast) var(--ease-out), border-color var(--dur-fast) var(--ease-out), color var(--dur-fast) var(--ease-out)",
          ...VARIANTS3[variant],
          ...style
        },
        ...rest
      },
      /* @__PURE__ */ react_shim_default.createElement(Icon, { name: icon, size: s.icon })
    );
  }

  // design/myjob/components/core/MetaPill.jsx
  function MetaPill({ children, icon = "calendar", tone = "default", style = {}, ...rest }) {
    return /* @__PURE__ */ react_shim_default.createElement(
      Badge,
      {
        variant: tone === "accent" ? "soft" : "subtle",
        icon: icon ? /* @__PURE__ */ react_shim_default.createElement(Icon, { name: icon, size: 12 }) : null,
        style: { fontVariantNumeric: "tabular-nums", ...style },
        ...rest
      },
      children
    );
  }

  // design/myjob/components/core/EntityTile.jsx
  var SIZES5 = { sm: 32, md: 40, lg: 44, xl: 56 };
  function EntityTile({ type = "company", name = "", src, size = "md", radius = "var(--radius-md)", style = {}, ...rest }) {
    if (type === "person") {
      return /* @__PURE__ */ react_shim_default.createElement(Avatar, { name, src, size, style, ...rest });
    }
    const px = typeof size === "number" ? size : SIZES5[size] || 40;
    if (src) {
      return /* @__PURE__ */ react_shim_default.createElement(
        "img",
        {
          src,
          alt: "",
          style: { width: px, height: px, borderRadius: radius, objectFit: "cover", flexShrink: 0, border: "1px solid var(--border)", ...style },
          ...rest
        }
      );
    }
    const initials = (name || "?").split(/\s+/).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
    return /* @__PURE__ */ react_shim_default.createElement(
      "span",
      {
        style: {
          width: px,
          height: px,
          borderRadius: radius,
          flexShrink: 0,
          display: "grid",
          placeItems: "center",
          background: "var(--surface-sunk)",
          border: "1px solid var(--border)",
          fontFamily: "var(--font-display)",
          fontWeight: "var(--fw-semibold)",
          fontSize: Math.round(px * 0.32),
          color: "var(--text-muted)",
          ...style
        },
        ...rest
      },
      initials
    );
  }

  // design/myjob/components/data/StatusBadge.jsx
  var STAGES = {
    new: { label: "Neu", color: "var(--status-new)", soft: "var(--status-new-soft)", border: "var(--status-new-border)", strong: "var(--status-new-strong)" },
    review: { label: "Sichtung", color: "var(--status-review)", soft: "var(--status-review-soft)", border: "var(--status-review-border)", strong: "var(--status-review-strong)" },
    interview: { label: "Interview", color: "var(--status-interview)", soft: "var(--status-interview-soft)", border: "var(--status-interview-border)", strong: "var(--status-interview-strong)" },
    offer: { label: "Angebot", color: "var(--status-offer)", soft: "var(--status-offer-soft)", border: "var(--status-offer-border)", strong: "var(--status-offer-strong)" },
    hired: { label: "Eingestellt", color: "var(--status-hired)", soft: "var(--status-hired-soft)", border: "var(--status-hired-border)", strong: "var(--status-hired-strong)" },
    rejected: { label: "Absage", color: "var(--status-rejected)", soft: "var(--status-rejected-soft)", border: "var(--status-rejected-border)", strong: "var(--status-rejected-strong)" }
  };
  function StatusBadge({ status = "new", label, dot = true, size = "md", style = {}, ...rest }) {
    const s = STAGES[status] || STAGES.new;
    const sz = size === "sm" ? { fontSize: "10.5px", padding: "2px 8px" } : { fontSize: "11.5px", padding: "4px 10px" };
    return /* @__PURE__ */ react_shim_default.createElement(
      "span",
      {
        style: {
          display: "inline-flex",
          alignItems: "center",
          gap: "6px",
          fontFamily: "var(--font-mono)",
          fontWeight: "var(--fw-semibold)",
          letterSpacing: "0.02em",
          whiteSpace: "nowrap",
          borderRadius: "var(--radius-pill)",
          background: s.soft,
          color: s.strong,
          border: `1px solid ${s.border}`,
          ...sz,
          ...style
        },
        ...rest
      },
      dot && /* @__PURE__ */ react_shim_default.createElement("span", { style: { width: "6px", height: "6px", borderRadius: "50%", background: s.color, flexShrink: 0 } }),
      label || s.label
    );
  }

  // design/myjob/components/data/MatchIndicator.jsx
  var SIZES6 = {
    sm: { ring: 40, hole: 28, font: "11px", stroke: 6 },
    md: { ring: 58, hole: 42, font: "13px", stroke: 8 },
    lg: { ring: 76, hole: 56, font: "16px", stroke: 10 }
  };
  function MatchIndicator({
    value = 0,
    tiers,
    variant = "ring",
    size = "md",
    label = "Match",
    style = {},
    ...rest
  }) {
    const pct = Math.max(0, Math.min(100, Math.round(value)));
    if (variant === "chip") {
      return /* @__PURE__ */ react_shim_default.createElement(
        "span",
        {
          style: {
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            fontFamily: "var(--font-body)",
            fontSize: "12px",
            fontWeight: "var(--fw-semibold)",
            color: "var(--match-strong)",
            background: "var(--match-soft)",
            border: "1px solid var(--accent-border)",
            borderRadius: "var(--radius-pill)",
            padding: "3px 10px 3px 8px",
            whiteSpace: "nowrap",
            ...style
          },
          ...rest
        },
        /* @__PURE__ */ react_shim_default.createElement("span", { style: { width: "7px", height: "7px", borderRadius: "50%", background: "var(--match)", flexShrink: 0 } }),
        /* @__PURE__ */ react_shim_default.createElement("span", { style: { fontFamily: "var(--font-mono)", fontVariantNumeric: "tabular-nums" } }, pct, "%"),
        label && /* @__PURE__ */ react_shim_default.createElement("span", { style: { color: "var(--text-muted)", fontWeight: "var(--fw-medium)" } }, label)
      );
    }
    const sz = SIZES6[size] || SIZES6.md;
    const ring = /* @__PURE__ */ react_shim_default.createElement(
      "div",
      {
        style: {
          width: sz.ring,
          height: sz.ring,
          borderRadius: "50%",
          flexShrink: 0,
          display: "grid",
          placeItems: "center",
          background: `conic-gradient(var(--match) ${pct}%, var(--match-track) 0)`
        }
      },
      /* @__PURE__ */ react_shim_default.createElement(
        "div",
        {
          style: {
            width: sz.hole,
            height: sz.hole,
            borderRadius: "50%",
            background: "var(--surface-card)",
            display: "grid",
            placeItems: "center"
          }
        },
        /* @__PURE__ */ react_shim_default.createElement(
          "span",
          {
            style: {
              fontFamily: "var(--font-mono)",
              fontVariantNumeric: "tabular-nums",
              fontWeight: "var(--fw-semibold)",
              fontSize: sz.font,
              color: "var(--match-strong)"
            }
          },
          pct
        )
      )
    );
    if (variant === "bare" || !tiers || tiers.length === 0) {
      return /* @__PURE__ */ react_shim_default.createElement("div", { style: { display: "inline-flex", ...style }, ...rest }, ring);
    }
    return /* @__PURE__ */ react_shim_default.createElement("div", { style: { display: "flex", alignItems: "center", gap: "16px", ...style }, ...rest }, ring, /* @__PURE__ */ react_shim_default.createElement("div", { style: { display: "flex", flexDirection: "column", gap: "8px", flex: 1, minWidth: 0 } }, tiers.map((t, i) => {
      const tp = t.max ? Math.round(t.value / t.max * 100) : Math.max(0, Math.min(100, t.value));
      const bonus = i > 0;
      return /* @__PURE__ */ react_shim_default.createElement("div", { key: i, style: { display: "flex", alignItems: "center", gap: "10px" } }, /* @__PURE__ */ react_shim_default.createElement("span", { style: { fontSize: "12px", color: "var(--text-muted)", width: "92px", flexShrink: 0 } }, t.label), /* @__PURE__ */ react_shim_default.createElement("span", { style: { flex: 1, height: "7px", borderRadius: "var(--radius-pill)", background: "var(--match-track)", overflow: "hidden" } }, /* @__PURE__ */ react_shim_default.createElement(
        "span",
        {
          style: {
            display: "block",
            height: "100%",
            width: `${tp}%`,
            borderRadius: "var(--radius-pill)",
            background: bonus ? "var(--match-bonus)" : "var(--match)",
            transition: "width var(--dur-med) var(--ease-out)"
          }
        }
      )), /* @__PURE__ */ react_shim_default.createElement("span", { style: { fontFamily: "var(--font-mono)", fontSize: "11px", color: "var(--text-soft)", fontVariantNumeric: "tabular-nums", width: "38px", textAlign: "right", flexShrink: 0 } }, t.max ? `${t.value}/${t.max}` : `${tp}%`));
    })));
  }

  // design/myjob/components/data/ApplicationRow.jsx
  function ApplicationRow({
    position,
    company,
    location,
    appId,
    logo,
    match,
    status = "new",
    when,
    selected = false,
    onClick,
    style = {},
    ...rest
  }) {
    const [hover, setHover] = react_shim_default.useState(false);
    return /* @__PURE__ */ react_shim_default.createElement(
      "div",
      {
        onClick,
        onMouseEnter: () => setHover(true),
        onMouseLeave: () => setHover(false),
        style: {
          display: "flex",
          alignItems: "center",
          gap: "14px",
          padding: "13px 16px",
          cursor: onClick ? "pointer" : "default",
          background: selected ? "var(--accent-soft)" : hover ? "var(--surface-subtle)" : "transparent",
          borderLeft: `3px solid ${selected ? "var(--accent)" : "transparent"}`,
          borderBottom: "1px solid var(--border)",
          transition: "background var(--dur-fast) var(--ease-out)",
          ...style
        },
        ...rest
      },
      /* @__PURE__ */ react_shim_default.createElement(EntityTile, { type: "company", name: company, src: logo, size: "md" }),
      /* @__PURE__ */ react_shim_default.createElement("div", { style: { minWidth: 0, flex: 1 } }, /* @__PURE__ */ react_shim_default.createElement(
        "div",
        {
          style: {
            fontFamily: "var(--font-display)",
            fontSize: "var(--fs-md)",
            fontWeight: "var(--fw-semibold)",
            color: "var(--text-heading)",
            letterSpacing: "var(--ls-tight)",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis"
          }
        },
        position
      ), /* @__PURE__ */ react_shim_default.createElement("div", { style: { display: "flex", alignItems: "center", gap: "8px", marginTop: "2px", minWidth: 0, overflow: "hidden" } }, /* @__PURE__ */ react_shim_default.createElement("span", { style: { fontSize: "var(--fs-xs)", color: "var(--text-muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", minWidth: 0 } }, company, location ? ` \xB7 ${location}` : ""), appId && /* @__PURE__ */ react_shim_default.createElement("span", { style: { fontFamily: "var(--font-mono)", fontSize: "var(--fs-3xs)", color: "var(--text-soft)", flexShrink: 0, whiteSpace: "nowrap" } }, appId))),
      /* @__PURE__ */ react_shim_default.createElement("div", { style: { flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "6px" } }, match != null && /* @__PURE__ */ react_shim_default.createElement(MatchIndicator, { value: match, variant: "chip" }), /* @__PURE__ */ react_shim_default.createElement(StatusBadge, { status, size: "sm" }), when && /* @__PURE__ */ react_shim_default.createElement("span", { style: { display: "inline-flex", alignItems: "center", gap: "4px", fontFamily: "var(--font-mono)", fontSize: "var(--fs-3xs)", color: "var(--text-soft)", whiteSpace: "nowrap" } }, /* @__PURE__ */ react_shim_default.createElement(Icon, { name: "clock", size: 11 }), when))
    );
  }

  // design/myjob/components/data/CandidateRow.jsx
  function CandidateRow({ name, role, position, src, status = "new", score, when, selected = false, onClick, style = {}, ...rest }) {
    const [hover, setHover] = react_shim_default.useState(false);
    return /* @__PURE__ */ react_shim_default.createElement(
      "div",
      {
        onClick,
        onMouseEnter: () => setHover(true),
        onMouseLeave: () => setHover(false),
        style: {
          display: "grid",
          gridTemplateColumns: "minmax(0,1.6fr) minmax(0,1.2fr) 78px 116px 96px",
          alignItems: "center",
          gap: "14px",
          padding: "10px 16px",
          minHeight: "var(--row-h)",
          cursor: onClick ? "pointer" : "default",
          background: selected ? "var(--accent-soft)" : hover ? "var(--surface-subtle)" : "transparent",
          borderLeft: `3px solid ${selected ? "var(--accent)" : "transparent"}`,
          borderBottom: "1px solid var(--border)",
          transition: "background var(--dur-fast) var(--ease-out)",
          ...style
        },
        ...rest
      },
      /* @__PURE__ */ react_shim_default.createElement("div", { style: { display: "flex", alignItems: "center", gap: "12px", minWidth: 0 } }, /* @__PURE__ */ react_shim_default.createElement(Avatar, { name, src, size: "md" }), /* @__PURE__ */ react_shim_default.createElement("div", { style: { minWidth: 0 } }, /* @__PURE__ */ react_shim_default.createElement(
        "div",
        {
          style: {
            fontFamily: "var(--font-display)",
            fontSize: "var(--fs-sm)",
            fontWeight: "var(--fw-bold)",
            color: "var(--text-heading)",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis"
          }
        },
        name
      ), role && /* @__PURE__ */ react_shim_default.createElement("div", { style: { fontSize: "12px", color: "var(--text-soft)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" } }, role))),
      /* @__PURE__ */ react_shim_default.createElement("div", { style: { minWidth: 0, fontSize: "12.5px", color: "var(--text-muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" } }, position),
      /* @__PURE__ */ react_shim_default.createElement(
        "div",
        {
          style: {
            fontFamily: "var(--font-mono)",
            fontSize: "13px",
            fontWeight: "var(--fw-semibold)",
            color: score >= 80 ? "var(--success)" : "var(--text-muted)",
            fontVariantNumeric: "tabular-nums"
          }
        },
        score != null ? `${score}%` : "\u2014"
      ),
      /* @__PURE__ */ react_shim_default.createElement("div", null, /* @__PURE__ */ react_shim_default.createElement(StatusBadge, { status, size: "sm" })),
      /* @__PURE__ */ react_shim_default.createElement(
        "div",
        {
          style: {
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            gap: "6px",
            fontFamily: "var(--font-mono)",
            fontSize: "11px",
            color: "var(--text-soft)"
          }
        },
        /* @__PURE__ */ react_shim_default.createElement(Icon, { name: "clock", size: 12 }),
        when
      )
    );
  }

  // design/myjob/components/data/Card.jsx
  function Card({ title, subtitle, action, pad = true, children, style = {}, bodyStyle = {}, ...rest }) {
    return /* @__PURE__ */ react_shim_default.createElement(
      "section",
      {
        style: {
          background: "var(--surface-card)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-lg)",
          boxShadow: "var(--shadow-sm)",
          overflow: "hidden",
          ...style
        },
        ...rest
      },
      (title || action) && /* @__PURE__ */ react_shim_default.createElement(
        "header",
        {
          style: {
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "12px",
            padding: "14px 18px",
            borderBottom: "1px solid var(--border)"
          }
        },
        /* @__PURE__ */ react_shim_default.createElement("div", null, title && /* @__PURE__ */ react_shim_default.createElement(
          "h3",
          {
            style: {
              fontFamily: "var(--font-display)",
              fontSize: "var(--fs-lg)",
              fontWeight: "var(--fw-bold)",
              color: "var(--text-heading)",
              margin: 0,
              letterSpacing: "-0.01em"
            }
          },
          title
        ), subtitle && /* @__PURE__ */ react_shim_default.createElement("p", { style: { fontSize: "12.5px", color: "var(--text-soft)", margin: "3px 0 0" } }, subtitle)),
        action
      ),
      /* @__PURE__ */ react_shim_default.createElement("div", { style: { padding: pad ? "18px" : 0, ...bodyStyle } }, children)
    );
  }

  // design/myjob/components/data/PositionCard.jsx
  var FLAGS = {
    DE: /* @__PURE__ */ react_shim_default.createElement("g", null, /* @__PURE__ */ react_shim_default.createElement("rect", { width: "22", height: "5.33", y: "0", fill: "#000" }), /* @__PURE__ */ react_shim_default.createElement("rect", { width: "22", height: "5.34", y: "5.33", fill: "#DD0000" }), /* @__PURE__ */ react_shim_default.createElement("rect", { width: "22", height: "5.33", y: "10.67", fill: "#FFCE00" })),
    AT: /* @__PURE__ */ react_shim_default.createElement("g", null, /* @__PURE__ */ react_shim_default.createElement("rect", { width: "22", height: "5.33", y: "0", fill: "#ED2939" }), /* @__PURE__ */ react_shim_default.createElement("rect", { width: "22", height: "5.34", y: "5.33", fill: "#fff" }), /* @__PURE__ */ react_shim_default.createElement("rect", { width: "22", height: "5.33", y: "10.67", fill: "#ED2939" })),
    CH: /* @__PURE__ */ react_shim_default.createElement("g", null, /* @__PURE__ */ react_shim_default.createElement("rect", { width: "22", height: "16", fill: "#D52B1E" }), /* @__PURE__ */ react_shim_default.createElement("rect", { x: "9.2", y: "3.4", width: "3.6", height: "9.2", fill: "#fff" }), /* @__PURE__ */ react_shim_default.createElement("rect", { x: "6.4", y: "6.2", width: "9.2", height: "3.6", fill: "#fff" }))
  };
  var COUNTRY_LABEL = { DE: "Deutschland", AT: "\xD6sterreich", CH: "Schweiz" };
  function Flag({ country }) {
    const f = FLAGS[country];
    if (!f) return null;
    return /* @__PURE__ */ react_shim_default.createElement(
      "span",
      {
        title: COUNTRY_LABEL[country],
        style: { display: "inline-flex", width: "18px", height: "13px", borderRadius: "3px", overflow: "hidden", flexShrink: 0, boxShadow: "inset 0 0 0 1px rgba(0,0,0,.08)" }
      },
      /* @__PURE__ */ react_shim_default.createElement("svg", { viewBox: "0 0 22 16", width: "18", height: "13", preserveAspectRatio: "none" }, f)
    );
  }
  function SkillTag({ name, met }) {
    const known = met !== void 0;
    const has = met === true;
    return /* @__PURE__ */ react_shim_default.createElement(
      "span",
      {
        style: {
          display: "inline-flex",
          alignItems: "center",
          gap: "5px",
          fontFamily: "var(--font-mono)",
          fontSize: "var(--fs-2xs)",
          fontWeight: "var(--fw-medium)",
          padding: "3px 9px",
          borderRadius: "var(--radius-pill)",
          whiteSpace: "nowrap",
          border: "1px solid",
          ...has ? { background: "var(--accent-soft)", borderColor: "var(--accent-border)", color: "var(--accent-strong)" } : known ? { background: "transparent", borderColor: "var(--border-strong)", color: "var(--text-soft)" } : { background: "var(--surface-sunk)", borderColor: "var(--border)", color: "var(--text-muted)" }
        }
      },
      known && /* @__PURE__ */ react_shim_default.createElement(Icon, { name: has ? "check" : "x", size: 11 }),
      name
    );
  }
  function PositionCard({
    title,
    company,
    logo,
    location,
    country,
    source,
    origin = "source",
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
    const [hover, setHover] = react_shim_default.useState(false);
    const matched = match != null;
    return /* @__PURE__ */ react_shim_default.createElement(
      "div",
      {
        onClick,
        onMouseEnter: () => setHover(true),
        onMouseLeave: () => setHover(false),
        style: {
          display: "flex",
          flexDirection: "column",
          gap: "14px",
          padding: "18px 20px",
          background: "var(--surface-card)",
          border: `1px solid ${selected ? "var(--accent-border)" : "var(--border)"}`,
          borderRadius: "var(--radius-lg)",
          boxShadow: hover || selected ? "var(--shadow-md)" : "var(--shadow-sm)",
          cursor: onClick ? "pointer" : "default",
          transition: "box-shadow var(--dur-fast) var(--ease-out), border-color var(--dur-fast)",
          ...style
        },
        ...rest
      },
      /* @__PURE__ */ react_shim_default.createElement("div", { style: { display: "flex", alignItems: "flex-start", gap: "13px" } }, /* @__PURE__ */ react_shim_default.createElement(EntityTile, { type: "company", name: company, src: logo, size: "lg" }), /* @__PURE__ */ react_shim_default.createElement("div", { style: { minWidth: 0, flex: 1 } }, /* @__PURE__ */ react_shim_default.createElement("div", { style: { fontFamily: "var(--font-display)", fontSize: "var(--fs-lg)", fontWeight: "var(--fw-semibold)", color: "var(--text-heading)", letterSpacing: "var(--ls-tight)", lineHeight: 1.25 } }, title), /* @__PURE__ */ react_shim_default.createElement("div", { style: { display: "flex", alignItems: "center", gap: "7px", marginTop: "3px", minWidth: 0 } }, /* @__PURE__ */ react_shim_default.createElement("span", { style: { fontSize: "var(--fs-sm)", color: "var(--text-muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" } }, company, location ? ` \xB7 ${location}` : ""), country && /* @__PURE__ */ react_shim_default.createElement(Flag, { country }))), matched ? /* @__PURE__ */ react_shim_default.createElement(MatchIndicator, { value: match, variant: "chip" }) : status ? /* @__PURE__ */ react_shim_default.createElement(StatusBadge, { status, size: "sm" }) : null),
      /* @__PURE__ */ react_shim_default.createElement("div", { style: { display: "flex", flexWrap: "wrap", gap: "7px" } }, origin === "manual" && /* @__PURE__ */ react_shim_default.createElement("span", { style: { display: "inline-flex", alignItems: "center", gap: "6px", fontFamily: "var(--font-mono)", fontSize: "var(--fs-2xs)", fontWeight: "var(--fw-semibold)", color: "var(--ink-700)", background: "var(--surface-sunk)", border: "1px dashed var(--text-soft)", borderRadius: "var(--radius-pill)", padding: "3px 9px" } }, /* @__PURE__ */ react_shim_default.createElement(Icon, { name: "edit", size: 12 }), "Manuell erstellt"), source && /* @__PURE__ */ react_shim_default.createElement(MetaPill, { icon: "search" }, source), pensum && /* @__PURE__ */ react_shim_default.createElement(MetaPill, { icon: "briefcase" }, pensum), salary && /* @__PURE__ */ react_shim_default.createElement(MetaPill, { icon: "tag", tone: "accent" }, salary), posted && /* @__PURE__ */ react_shim_default.createElement(MetaPill, { icon: "clock" }, posted)),
      skills.length > 0 && /* @__PURE__ */ react_shim_default.createElement("div", null, matched && /* @__PURE__ */ react_shim_default.createElement("div", { style: { fontFamily: "var(--font-mono)", fontSize: "var(--fs-3xs)", letterSpacing: "var(--ls-wide)", textTransform: "uppercase", color: "var(--text-soft)", marginBottom: "8px" } }, "Skill-Abgleich"), /* @__PURE__ */ react_shim_default.createElement("div", { style: { display: "flex", flexWrap: "wrap", gap: "6px" } }, skills.map((s, i) => /* @__PURE__ */ react_shim_default.createElement(SkillTag, { key: i, name: typeof s === "string" ? s : s.name, met: typeof s === "string" ? void 0 : s.met })))),
      (onView || onApply) && /* @__PURE__ */ react_shim_default.createElement("div", { style: { display: "flex", alignItems: "center", gap: "10px", marginTop: "2px", paddingTop: "14px", borderTop: "1px solid var(--border)" } }, onView && /* @__PURE__ */ react_shim_default.createElement(
        "button",
        {
          onClick: (e) => {
            e.stopPropagation();
            onView();
          },
          style: { display: "inline-flex", alignItems: "center", gap: "7px", fontFamily: "var(--font-body)", fontSize: "var(--fs-sm)", fontWeight: "var(--fw-medium)", color: "var(--text-muted)", background: "transparent", border: "1px solid var(--border-strong)", borderRadius: "var(--radius-md)", padding: "8px 13px", cursor: "pointer" }
        },
        /* @__PURE__ */ react_shim_default.createElement(Icon, { name: "fileText", size: 15 }),
        "Stellenbeschreibung"
      ), onApply && /* @__PURE__ */ react_shim_default.createElement(
        "button",
        {
          onClick: (e) => {
            e.stopPropagation();
            onApply();
          },
          style: { marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: "7px", fontFamily: "var(--font-body)", fontSize: "var(--fs-sm)", fontWeight: "var(--fw-semibold)", color: "var(--accent-contrast)", background: "var(--accent)", border: "1px solid var(--accent)", borderRadius: "var(--radius-md)", padding: "8px 15px", cursor: "pointer" }
        },
        applyLabel || "Bewerber bewerben",
        /* @__PURE__ */ react_shim_default.createElement(Icon, { name: "arrowRight", size: 15 })
      ))
    );
  }

  // design/myjob/components/data/ProgressBar.jsx
  var TONES = {
    accent: "var(--accent)",
    success: "var(--success)",
    warning: "var(--warning)",
    danger: "var(--danger)",
    new: "var(--status-new)",
    review: "var(--status-review)",
    interview: "var(--status-interview)",
    offer: "var(--status-offer)",
    hired: "var(--status-hired)"
  };
  function ProgressBar({ value = 0, tone = "accent", height = 6, showValue = false, label, style = {}, ...rest }) {
    const pct = Math.max(0, Math.min(100, value));
    return /* @__PURE__ */ react_shim_default.createElement("div", { style: { display: "flex", flexDirection: "column", gap: "6px", ...style }, ...rest }, (label || showValue) && /* @__PURE__ */ react_shim_default.createElement(
      "div",
      {
        style: {
          display: "flex",
          justifyContent: "space-between",
          fontFamily: "var(--font-mono)",
          fontSize: "11px",
          color: "var(--text-soft)"
        }
      },
      /* @__PURE__ */ react_shim_default.createElement("span", null, label),
      showValue && /* @__PURE__ */ react_shim_default.createElement("span", { style: { fontVariantNumeric: "tabular-nums", color: "var(--text-muted)" } }, pct, "%")
    ), /* @__PURE__ */ react_shim_default.createElement(
      "div",
      {
        style: {
          width: "100%",
          height: `${height}px`,
          borderRadius: "var(--radius-pill)",
          background: "var(--surface-sunk)",
          overflow: "hidden"
        }
      },
      /* @__PURE__ */ react_shim_default.createElement(
        "div",
        {
          style: {
            width: `${pct}%`,
            height: "100%",
            borderRadius: "var(--radius-pill)",
            background: TONES[tone] || tone,
            transition: "width var(--dur-med) var(--ease-out)"
          }
        }
      )
    ));
  }

  // design/myjob/components/data/StatCard.jsx
  function StatCard({ label, value, delta, dir = "up", icon, style = {}, ...rest }) {
    const deltaColor = dir === "down" ? "var(--danger)" : "var(--success)";
    return /* @__PURE__ */ react_shim_default.createElement(
      "div",
      {
        style: {
          background: "var(--surface-card)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-lg)",
          boxShadow: "var(--shadow-sm)",
          padding: "18px 20px",
          display: "flex",
          flexDirection: "column",
          gap: "12px",
          ...style
        },
        ...rest
      },
      /* @__PURE__ */ react_shim_default.createElement("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between" } }, /* @__PURE__ */ react_shim_default.createElement(
        "span",
        {
          style: {
            fontFamily: "var(--font-mono)",
            fontSize: "10.5px",
            letterSpacing: "var(--ls-wide)",
            textTransform: "uppercase",
            color: "var(--text-soft)"
          }
        },
        label
      ), icon && /* @__PURE__ */ react_shim_default.createElement(
        "span",
        {
          style: {
            width: "30px",
            height: "30px",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: "var(--radius-md)",
            background: "var(--accent-soft)",
            color: "var(--accent-strong)"
          }
        },
        /* @__PURE__ */ react_shim_default.createElement(Icon, { name: icon, size: 16 })
      )),
      /* @__PURE__ */ react_shim_default.createElement("div", { style: { display: "flex", alignItems: "flex-end", gap: "10px" } }, /* @__PURE__ */ react_shim_default.createElement(
        "span",
        {
          style: {
            fontFamily: "var(--font-display)",
            fontSize: "var(--fs-4xl)",
            fontWeight: "var(--fw-bold)",
            color: "var(--text-heading)",
            lineHeight: 1,
            letterSpacing: "var(--ls-tight)",
            fontVariantNumeric: "tabular-nums"
          }
        },
        value
      ), delta != null && /* @__PURE__ */ react_shim_default.createElement(
        "span",
        {
          style: {
            display: "inline-flex",
            alignItems: "center",
            gap: "3px",
            fontFamily: "var(--font-mono)",
            fontSize: "12px",
            fontWeight: "var(--fw-semibold)",
            color: deltaColor,
            paddingBottom: "3px"
          }
        },
        /* @__PURE__ */ react_shim_default.createElement(Icon, { name: dir === "down" ? "chevronDown" : "chevronUp", size: 13, strokeWidth: 2.4 }),
        delta
      ))
    );
  }

  // design/myjob/components/data/Tabs.jsx
  function Tabs({ tabs = [], value, onChange, style = {}, ...rest }) {
    return /* @__PURE__ */ react_shim_default.createElement(
      "div",
      {
        role: "tablist",
        style: { display: "flex", alignItems: "center", gap: "4px", borderBottom: "1px solid var(--border)", ...style },
        ...rest
      },
      tabs.map((t) => {
        const active = t.id === value;
        return /* @__PURE__ */ react_shim_default.createElement(
          "button",
          {
            key: t.id,
            role: "tab",
            "aria-selected": active,
            onClick: () => onChange && onChange(t.id),
            style: {
              appearance: "none",
              background: "transparent",
              border: "none",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "7px",
              padding: "11px 14px",
              marginBottom: "-1px",
              fontFamily: "var(--font-body)",
              fontSize: "var(--fs-sm)",
              fontWeight: "var(--fw-semibold)",
              color: active ? "var(--text-heading)" : "var(--text-soft)",
              borderBottom: `2px solid ${active ? "var(--accent)" : "transparent"}`,
              transition: "color var(--dur-fast) var(--ease-out), border-color var(--dur-fast) var(--ease-out)"
            }
          },
          t.label,
          t.count != null && /* @__PURE__ */ react_shim_default.createElement(
            "span",
            {
              style: {
                fontFamily: "var(--font-mono)",
                fontSize: "10.5px",
                fontWeight: "var(--fw-semibold)",
                color: active ? "var(--accent-strong)" : "var(--text-soft)",
                background: active ? "var(--accent-soft)" : "var(--surface-sunk)",
                border: `1px solid ${active ? "var(--accent-border)" : "var(--border)"}`,
                borderRadius: "var(--radius-pill)",
                padding: "1px 7px",
                fontVariantNumeric: "tabular-nums"
              }
            },
            t.count
          )
        );
      })
    );
  }

  // design/myjob/components/forms/Checkbox.jsx
  function Checkbox({ label, checked = false, onChange, disabled = false, style = {}, ...rest }) {
    return /* @__PURE__ */ react_shim_default.createElement(
      "label",
      {
        style: {
          display: "inline-flex",
          alignItems: "center",
          gap: "10px",
          cursor: disabled ? "not-allowed" : "pointer",
          opacity: disabled ? 0.5 : 1,
          ...style
        },
        ...rest
      },
      /* @__PURE__ */ react_shim_default.createElement(
        "span",
        {
          onClick: () => !disabled && onChange && onChange(!checked),
          style: {
            width: "18px",
            height: "18px",
            flexShrink: 0,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: "var(--radius-xs)",
            border: `1.5px solid ${checked ? "var(--accent)" : "var(--border-strong)"}`,
            background: checked ? "var(--accent)" : "var(--surface-card)",
            color: "var(--accent-contrast)",
            transition: "background var(--dur-fast) var(--ease-out), border-color var(--dur-fast) var(--ease-out)"
          }
        },
        checked && /* @__PURE__ */ react_shim_default.createElement(Icon, { name: "check", size: 13, strokeWidth: 2.6 })
      ),
      label && /* @__PURE__ */ react_shim_default.createElement("span", { style: { fontSize: "var(--fs-sm)", color: "var(--text-body)" } }, label)
    );
  }

  // design/myjob/components/forms/Input.jsx
  function Input({ label, icon, hint, error, type = "text", style = {}, wrapStyle = {}, ...rest }) {
    const [focus, setFocus] = react_shim_default.useState(false);
    const borderColor = error ? "var(--danger)" : focus ? "var(--accent)" : "var(--border-strong)";
    return /* @__PURE__ */ react_shim_default.createElement("label", { style: { display: "flex", flexDirection: "column", gap: "6px", ...wrapStyle } }, label && /* @__PURE__ */ react_shim_default.createElement("span", { style: { fontFamily: "var(--font-mono)", fontSize: "10.5px", letterSpacing: "var(--ls-wide)", textTransform: "uppercase", color: "var(--text-soft)" } }, label), /* @__PURE__ */ react_shim_default.createElement(
      "span",
      {
        style: {
          display: "flex",
          alignItems: "center",
          gap: "9px",
          background: "var(--surface-card)",
          border: `1px solid ${borderColor}`,
          borderRadius: "var(--radius-md)",
          padding: "0 12px",
          boxShadow: focus ? "0 0 0 3px var(--accent-soft)" : "none",
          transition: "border-color var(--dur-fast) var(--ease-out), box-shadow var(--dur-fast) var(--ease-out)"
        }
      },
      icon && /* @__PURE__ */ react_shim_default.createElement(Icon, { name: icon, size: 16, style: { color: "var(--text-soft)" } }),
      /* @__PURE__ */ react_shim_default.createElement(
        "input",
        {
          type,
          onFocus: () => setFocus(true),
          onBlur: () => setFocus(false),
          style: {
            flex: 1,
            minWidth: 0,
            appearance: "none",
            border: "none",
            outline: "none",
            background: "transparent",
            fontFamily: "var(--font-body)",
            fontSize: "var(--fs-sm)",
            color: "var(--text-heading)",
            padding: "10px 0",
            ...style
          },
          ...rest
        }
      )
    ), (hint || error) && /* @__PURE__ */ react_shim_default.createElement("span", { style: { fontSize: "11.5px", color: error ? "var(--danger)" : "var(--text-soft)" } }, error || hint));
  }

  // design/myjob/components/forms/Select.jsx
  function Select({ label, options = [], value, onChange, style = {}, wrapStyle = {}, ...rest }) {
    const [focus, setFocus] = react_shim_default.useState(false);
    const opts = options.map((o) => typeof o === "string" ? { value: o, label: o } : o);
    return /* @__PURE__ */ react_shim_default.createElement("label", { style: { display: "flex", flexDirection: "column", gap: "6px", ...wrapStyle } }, label && /* @__PURE__ */ react_shim_default.createElement("span", { style: { fontFamily: "var(--font-mono)", fontSize: "10.5px", letterSpacing: "var(--ls-wide)", textTransform: "uppercase", color: "var(--text-soft)" } }, label), /* @__PURE__ */ react_shim_default.createElement("span", { style: { position: "relative", display: "flex", alignItems: "center" } }, /* @__PURE__ */ react_shim_default.createElement(
      "select",
      {
        value,
        onChange,
        onFocus: () => setFocus(true),
        onBlur: () => setFocus(false),
        style: {
          appearance: "none",
          WebkitAppearance: "none",
          width: "100%",
          border: `1px solid ${focus ? "var(--accent)" : "var(--border-strong)"}`,
          borderRadius: "var(--radius-md)",
          background: "var(--surface-card)",
          fontFamily: "var(--font-body)",
          fontSize: "var(--fs-sm)",
          color: "var(--text-heading)",
          padding: "10px 38px 10px 13px",
          outline: "none",
          cursor: "pointer",
          boxShadow: focus ? "0 0 0 3px var(--accent-soft)" : "none",
          transition: "border-color var(--dur-fast) var(--ease-out), box-shadow var(--dur-fast) var(--ease-out)",
          ...style
        },
        ...rest
      },
      opts.map((o) => /* @__PURE__ */ react_shim_default.createElement("option", { key: o.value, value: o.value }, o.label))
    ), /* @__PURE__ */ react_shim_default.createElement(Icon, { name: "chevronDown", size: 15, style: { position: "absolute", right: "12px", color: "var(--text-soft)", pointerEvents: "none" } })));
  }

  // design/myjob/components/forms/Switch.jsx
  function Switch({ label, checked = false, onChange, disabled = false, style = {}, ...rest }) {
    return /* @__PURE__ */ react_shim_default.createElement(
      "label",
      {
        style: {
          display: "inline-flex",
          alignItems: "center",
          gap: "10px",
          cursor: disabled ? "not-allowed" : "pointer",
          opacity: disabled ? 0.5 : 1,
          ...style
        },
        ...rest
      },
      /* @__PURE__ */ react_shim_default.createElement(
        "span",
        {
          onClick: () => !disabled && onChange && onChange(!checked),
          style: {
            position: "relative",
            width: "38px",
            height: "22px",
            flexShrink: 0,
            borderRadius: "var(--radius-pill)",
            background: checked ? "var(--accent)" : "var(--border-strong)",
            transition: "background var(--dur-med) var(--ease-out)"
          }
        },
        /* @__PURE__ */ react_shim_default.createElement(
          "span",
          {
            style: {
              position: "absolute",
              top: "2px",
              left: checked ? "18px" : "2px",
              width: "18px",
              height: "18px",
              borderRadius: "50%",
              background: "#ffffff",
              boxShadow: "0 1px 2px rgba(0,0,0,0.25)",
              transition: "left var(--dur-med) var(--ease-out)"
            }
          }
        )
      ),
      label && /* @__PURE__ */ react_shim_default.createElement("span", { style: { fontSize: "var(--fs-sm)", color: "var(--text-body)" } }, label)
    );
  }

  // design/myjob/components/forms/Textarea.jsx
  function Textarea({ label, hint, rows = 4, style = {}, wrapStyle = {}, ...rest }) {
    const [focus, setFocus] = react_shim_default.useState(false);
    return /* @__PURE__ */ react_shim_default.createElement("label", { style: { display: "flex", flexDirection: "column", gap: "6px", ...wrapStyle } }, label && /* @__PURE__ */ react_shim_default.createElement("span", { style: { fontFamily: "var(--font-mono)", fontSize: "10.5px", letterSpacing: "var(--ls-wide)", textTransform: "uppercase", color: "var(--text-soft)" } }, label), /* @__PURE__ */ react_shim_default.createElement(
      "textarea",
      {
        rows,
        onFocus: () => setFocus(true),
        onBlur: () => setFocus(false),
        style: {
          appearance: "none",
          border: `1px solid ${focus ? "var(--accent)" : "var(--border-strong)"}`,
          borderRadius: "var(--radius-md)",
          background: "var(--surface-card)",
          fontFamily: "var(--font-body)",
          fontSize: "var(--fs-sm)",
          lineHeight: 1.6,
          color: "var(--text-heading)",
          padding: "11px 13px",
          resize: "vertical",
          outline: "none",
          boxShadow: focus ? "0 0 0 3px var(--accent-soft)" : "none",
          transition: "border-color var(--dur-fast) var(--ease-out), box-shadow var(--dur-fast) var(--ease-out)",
          ...style
        },
        ...rest
      }
    ), hint && /* @__PURE__ */ react_shim_default.createElement("span", { style: { fontSize: "11.5px", color: "var(--text-soft)" } }, hint));
  }

  // ../../../../private/tmp/claude-501/-Users-suhaysevinc-source-Resume/f6df762b-e23f-48da-af79-719841f50a62/scratchpad/bundle-entry.js
  window.MyJobDesignSystem_f3658e = { AppShell, Avatar, Badge, Button, Icon, ICON_NAMES, IconButton, MetaPill, EntityTile, ApplicationRow, CandidateRow, Card, MatchIndicator, PositionCard, ProgressBar, StatCard, STAGES, StatusBadge, Tabs, Checkbox, Input, Select, Switch, Textarea };
})();
