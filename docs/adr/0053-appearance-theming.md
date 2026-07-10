# ADR-0053 — Appearance theming (light/dark) as a token-attribute layer

- **Status:** Accepted
- **Relates to:** ADR-0004 (strict CSP), ADR-0023 (recruiting kit web tests), ADR-0028 (PWA shell), ADR-0052 (single-source document rendering)

## Context

The recruiting app shipped dark-only: `index.html` hard-set
`<html data-mode="dark">`. Apple's HIG (and every peer tool — Linear, Slack,
Notion) expects an appearance choice, and a recruiter working in a bright office
for eight hours has a legitimate need for a light canvas.

The architecture was already ready for it. Every colour in the kit runs through
CSS custom properties, and the token layer already carried **both** worlds:
`tokens/colors.css` `:root` is the light set, `tokens/modes.css`
`[data-mode="dark"]` flips the semantic aliases (surfaces, text, borders, chip
tints, shadows). So this is a token-selection layer, not a redesign — no
component markup needs to change.

Two constraints shaped the design:

1. **Strict CSP (ADR-0004):** `script-src 'self'` forbids an inline `<script>`,
   so the usual "set the theme before first paint" trick isn't available.
2. **Brand recognisability:** a light mode must still read as _this_ product.

## Decision

**Theme = one attribute on `<html>`.** `data-mode="light|dark"` selects the token
set. A small same-origin module (`theme.js`) owns that attribute: it resolves the
initial mode, applies it, and persists an explicit choice. It is imported
**first** in `main.jsx` (before React), and the dark boot splash already covers
the pre-hydration window — so there is no flash despite the CSP forbidding an
inline script.

**Resolution order:** an explicit saved choice (localStorage `myjob-appearance`)
wins; otherwise follow the OS `prefers-color-scheme`. A React binding
(`window.useTheme`) re-renders on change and, while the user is still on the
system default, tracks OS flips; an explicit choice is sticky. The choice is
surfaced in Settings (Light / Dark / System) and as a one-click toggle in the
rail footer.

**Brand anchor rule.** The ink navigation rail and the auth brand panel stay
**ink-dark in both themes** — they read the `--sidebar-*` / `--ink-*` tokens,
which `modes.css` deliberately does **not** flip. Only the _working canvas_
(`--surface-*`, `--app-bg`, `--text-*`, `--border*`) changes. This is the
same anchor Slack and Linear keep in their light modes: the dark frame is the
recognisable brand; the light surfaces are where the work happens.

**Documents are exempt.** The editor's live preview and the exported PDF are
paper and stay white in both themes — `documentsToHtml` (ADR-0052) owns its own
styles and never reads the app tokens, so appearance can't bleed into an export.

**Contrast holds in both themes.** The `#198` token-contrast guard now runs a
**dark fixture** (the `modes.css` overrides layered on the base) alongside the
light one, so WCAG AA is enforced for both. Bringing the app's dark mode under
the guard surfaced that the softest dark text needed lightening
(`--text-soft` #6b7e96 → #8193aa) to clear AA on the lightest dark surface.

## Consequences

- Adding a third appearance (e.g. high-contrast) or a new accent is one more
  token override block + one fixture in the contrast guard — no component churn.
- The first paint uses the resolved mode; the splash masks the hand-off. A user
  with no saved choice now sees light or dark per their OS, where before everyone
  got dark.
- Because theming is pure token selection, the design-system components, the
  `_ds_bundle.js` runtime, and every view inherit both themes for free; the work
  was wiring (resolve/persist/apply), the toggle UI, the ADR, and the guard.

## Alternatives considered

- **Inline pre-paint script** (the standard no-flash approach) — rejected: it
  violates the strict CSP (ADR-0004), and the boot splash already removes the
  flash.
- **A React context provider** instead of a DOM attribute — rejected: the tokens
  key off a CSS attribute selector, so the attribute _is_ the state; a provider
  would duplicate it and couldn't style pre-React paint.
- **Per-component light variants** — rejected: the tokens already invert
  centrally; per-component colours would fork the design system and rot.
