/* WCAG contrast audit for the design-system token contract (#198).
 *
 * Pure, dependency-free helpers used by the contrast guard test (and runnable
 * standalone). They parse the `:root` custom properties out of a tokens CSS
 * file, resolve `var()` chains down to concrete colours, and compute WCAG 2.1
 * relative-luminance contrast ratios. Structured so a second theme (dark mode,
 * #196) is just another override map layered on the base — see auditPairs().
 */

/** Parse `--name: value;` declarations from every `:root { … }` block. */
export function parseTokens(cssText) {
  const map = new Map();
  const rootBlocks = cssText.match(/:root\s*\{([^}]*)\}/gs) || [];
  for (const block of rootBlocks) {
    const body = block.replace(/^:root\s*\{/, '').replace(/\}$/, '');
    for (const decl of body.split(';')) {
      const m = decl.match(/(--[\w-]+)\s*:\s*(.+)\s*$/s);
      if (m) map.set(m[1].trim(), m[2].trim());
    }
  }
  return map;
}

/** Resolve a token (or raw value) to a concrete colour string, following
 *  `var(--x, fallback)` chains. Returns null if it can't resolve to a colour. */
export function resolveColor(value, map, seen = new Set()) {
  let v = String(value).trim();
  // strip a trailing inline comment if any slipped through
  v = v.replace(/\/\*.*?\*\//gs, '').trim();
  // a bare token name (`--x`) is shorthand for `var(--x)`
  if (/^--[\w-]+$/.test(v)) v = `var(${v})`;
  const varMatch = v.match(/^var\(\s*(--[\w-]+)\s*(?:,\s*(.+))?\)$/s);
  if (varMatch) {
    const name = varMatch[1];
    if (seen.has(name)) return null;
    seen.add(name);
    if (map.has(name)) return resolveColor(map.get(name), map, seen);
    if (varMatch[2]) return resolveColor(varMatch[2], map, seen);
    return null;
  }
  if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(v)) return v;
  if (/^rgba?\(/i.test(v)) return v;
  return null;
}

/** #rgb / #rrggbb → [r,g,b] 0–255. */
export function hexToRgb(hex) {
  let h = hex.replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
}

/** WCAG relative luminance of an #rrggbb colour. */
export function relativeLuminance(hex) {
  const [r, g, b] = hexToRgb(hex).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG contrast ratio between two solid #rrggbb colours (1–21). */
export function contrastRatio(hexA, hexB) {
  const la = relativeLuminance(hexA);
  const lb = relativeLuminance(hexB);
  const [hi, lo] = la >= lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

/**
 * Audit an array of {fg, bg, min, note} pairs against a resolved token map.
 * `overrides` (a Map) lets a theme fixture replace specific tokens before the
 * pairs are evaluated. Returns { results, failures }.
 */
export function auditPairs(pairs, baseMap, overrides = new Map()) {
  const map = new Map(baseMap);
  for (const [k, v] of overrides) map.set(k, v);
  const results = pairs.map((p) => {
    const fg = resolveColor(p.fg, map);
    const bg = resolveColor(p.bg, map);
    const ok = fg && bg && /^#/.test(fg) && /^#/.test(bg);
    const ratio = ok ? contrastRatio(fg, bg) : 0;
    return { ...p, fg, bg, ratio: Math.round(ratio * 100) / 100, pass: ok && ratio >= p.min };
  });
  return { results, failures: results.filter((r) => !r.pass) };
}
