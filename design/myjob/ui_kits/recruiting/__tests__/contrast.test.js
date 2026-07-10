/* WCAG AA contrast guard for the design-system token contract (#198).
 *
 * Enumerates every foreground×background token pair the kit paints (the
 * manifest in tokens/contrast-pairs.mjs), resolves each token's var() chain to a
 * concrete colour from tokens/colors.css, and fails if any pair drops below its
 * WCAG floor (4.5:1 text, 3:1 UI). This is the regression gate the user-test
 * design review asked for: a token edit that dims text below AA breaks the
 * build. Structured over THEMES so the dark mode (#196) is one more fixture. */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { parseTokens, auditPairs, contrastRatio } from '../../../tokens/contrast-audit.mjs';
import { PAIRS, THEMES } from '../../../tokens/contrast-pairs.mjs';

const tokensDir = join(dirname(fileURLToPath(import.meta.url)), '../../../tokens');
const baseTokens = parseTokens(readFileSync(join(tokensDir, 'colors.css'), 'utf8'));

describe('Design tokens — WCAG AA contrast contract (#198)', () => {
  for (const theme of THEMES) {
    it(`TokenPairs_${theme.name.replace(/\W+/g, '')}_AllMeetTheirWcagFloor`, () => {
      const { results, failures } = auditPairs(PAIRS, baseTokens, theme.overrides);
      // every manifest pair resolved to a real colour (no typos / dangling vars)
      for (const r of results) {
        expect(r.fg, `${r.note}: foreground did not resolve`).toMatch(/^#/);
        expect(r.bg, `${r.note}: background did not resolve`).toMatch(/^#/);
      }
      const report = failures
        .map((f) => `  ✗ ${f.note}: ${f.fg} on ${f.bg} = ${f.ratio}:1 (need ${f.min}:1)`)
        .join('\n');
      expect(failures, `Contrast failures in "${theme.name}":\n${report}`).toHaveLength(0);
    });
  }

  it('Guard_CatchesARegression_WhenATokenIsDimmedBelowAA', () => {
    // Sanity-check the guard itself: force --text-soft to a near-invisible grey
    // and confirm the audit reports the failure it is meant to catch.
    const broken = new Map([['--text-soft', '#c7ced9']]);
    const { failures } = auditPairs(PAIRS, baseTokens, broken);
    expect(failures.some((f) => f.fg === '#c7ced9')).toBe(true);
  });

  it('ContrastRatio_KnownValues_MatchWcagReference', () => {
    // black on white is the canonical 21:1; white on white is 1:1
    expect(Math.round(contrastRatio('#000000', '#ffffff'))).toBe(21);
    expect(contrastRatio('#ffffff', '#ffffff')).toBeCloseTo(1, 5);
  });
});
