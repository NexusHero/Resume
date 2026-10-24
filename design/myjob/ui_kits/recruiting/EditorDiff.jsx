/* EditorDiff — a thin, pure before/after diff renderer for the Magic Pen,
   backed by the `diff` (jsdiff ^9) library (ADR-0060 §8). It runs only in the
   browser (Vite bundle) and Vitest — never on the server. `diffWords` renders
   inline word diffs for headline/summary; `diffArrays` with a case-insensitive
   comparator renders line diffs for bullets/absätze/skill items, and collapses a
   pure reorder into a position change instead of a spurious content edit. */
import { diffWords, diffArrays } from 'diff';

const str = (v) => String(v ?? '');
const ciEqual = (a, b) => str(a).toLowerCase() === str(b).toLowerCase();
const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Inline word diff for a text field (headline/summary). */
export function diffTextParts(before, after) {
  return diffWords(str(before), str(after));
}

/**
 * Line diff for an array field (bullets/absätze/skill items). A case-insensitive
 * comparator keeps "React" vs "react" from being a spurious edit; a removed line
 * later matched by an equal added line is treated as a move, so a pure reorder
 * renders no `<ins>`/`<del>` at all.
 */
export function diffArrayParts(before, after) {
  const b = Array.isArray(before) ? before : [];
  const a = Array.isArray(after) ? after : [];
  const parts = diffArrays(b, a, { comparator: ciEqual });
  const pending = [];
  const out = [];
  for (const p of parts) {
    const value = p.value[0];
    if (p.removed) {
      pending.push(value);
    } else if (p.added) {
      const idx = pending.findIndex((r) => ciEqual(r, value));
      if (idx >= 0) {
        pending.splice(idx, 1);
        out.push({ value, added: false, removed: false });
      } else {
        out.push({ value, added: true, removed: false });
      }
    } else {
      out.push({ value, added: false, removed: false });
    }
  }
  // Whatever was never matched by a later add is a genuine removal.
  for (const r of pending) out.push({ value: r, added: false, removed: true });
  return out;
}

/** Split `text` into segments, marking the ones that are unsupported claims. */
function highlightSegments(text, unsupported) {
  const terms = (unsupported || []).map((u) => u.text).filter(Boolean);
  const raw = str(text);
  if (!terms.length) return [{ text: raw, marked: false }];
  const pattern = new RegExp(`(${terms.map(escapeRegExp).join('|')})`, 'gi');
  const lowers = new Set(terms.map((t) => t.toLowerCase()));
  return raw
    .split(pattern)
    .filter((p) => p !== '')
    .map((p) => ({ text: p, marked: lowers.has(p.toLowerCase()) }));
}

/** Render text, wrapping unsupported claims in `<mark>` (AK-3.4). */
function Marked({ text, unsupported }) {
  return highlightSegments(text, unsupported).map((seg, i) =>
    seg.marked ? <mark key={i}>{seg.text}</mark> : <span key={i}>{seg.text}</span>,
  );
}

function TextDiff({ before, after, unsupported }) {
  const parts = diffTextParts(before, after);
  return (
    <div data-testid="editor-diff">
      {parts.map((p, i) => {
        if (p.added) return <ins key={i}>{<Marked text={p.value} unsupported={unsupported} />}</ins>;
        if (p.removed) return <del key={i}>{p.value}</del>;
        return <span key={i}>{p.value}</span>;
      })}
    </div>
  );
}

function ArrayDiff({ before, after, unsupported }) {
  const parts = diffArrayParts(before, after);
  return (
    <div data-testid="editor-diff">
      {parts.map((p, i) => {
        if (p.added)
          return (
            <div key={i}>
              <ins>{<Marked text={p.value} unsupported={unsupported} />}</ins>
            </div>
          );
        if (p.removed)
          return (
            <div key={i}>
              <del>{p.value}</del>
            </div>
          );
        return <div key={i}>{p.value}</div>;
      })}
    </div>
  );
}

function SkillsDiff({ after, unsupported }) {
  const groups = Array.isArray(after) ? after : [];
  return (
    <div data-testid="editor-diff-skills">
      {groups.map((g, i) => (
        <div key={i} data-testid="skill-group">
          <div className="skill-group-label">{g.label}</div>
          <ul>
            {(g.items || []).map((item, j) => (
              <li key={j}>{<Marked text={item} unsupported={unsupported} />}</li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

/** The shared diff renderer: dispatch by the section's content shape. */
function EditorDiff({ before, after, kind, unsupported }) {
  if (kind === 'skills') return <SkillsDiff after={after} unsupported={unsupported} />;
  if (kind === 'text') return <TextDiff before={before} after={after} unsupported={unsupported} />;
  return <ArrayDiff before={before} after={after} unsupported={unsupported} />;
}

Object.assign(window, { EditorDiff, diffTextParts, diffArrayParts });
