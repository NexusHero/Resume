# ADR-0055 — The 2026 „Vivid" redesign + „alles ist Kandidat oder Stelle" IA restructure

- **Status:** Accepted (supersedes the Blueprint-era look; continues ADR-0053 appearance theming, ADR-0025/0026/0027 responsive, ADR-0051 shell)
- **Relates to:** ADR-0053 (light/dark token layer), ADR-0001 hexagonal core (unchanged), the myJob Design-System handoff (2026 „Vivid")

## Context

The recruiting suite shipped a dark-first „Blueprint" look (Space Grotesk display,
steel-blue accent, an ink left rail baked into the app) over a token layer. A
design handoff (`myJob Design System`, 2026 „Vivid" redesign) re-organised that
same system into a **light-first** identity and a **consolidated information
architecture**, and the owner asked to adopt it 1:1 — visuals **and** structure —
in the running recruiting SPA (`design/myjob/ui_kits/recruiting/`), keeping the
NestJS backend, the auth/DSGVO/applications hardening and the test suite.

Two things changed at once, which is why they share one ADR:

1. **A new design system** — new tokens, fonts, logo and a new component library
   under a new namespace (`MyJobDesignSystem_5611b7`, was `_f3658e`).
2. **A new IA** — „everything is either a candidate or a Stelle"; the CV builder,
   Anschreiben, Bewerbungen and Dossier stop being top-level pages and live
   inside a candidate profile or a posting; destinations collapse to six.

## Decision

### Visual — „Vivid"

- **Light-first.** The working canvas is a cool light surface (`--surface-app`
  `#f2f4fa`); the nav rail is a **floating white rounded card** (`--rail-*`), the
  topbar transparent. The conserved ink world becomes **Dark = „Klassik"**
  (`data-mode="dark"` + `data-theme="ember"`, live-orange accent) — `theme.js`
  now sets both attributes; light is `data-theme="royal"`.
- **Colour has four jobs.** **Royal** `#3654E0` is the default accent
  (`data-theme="royal"`); **Live** `#FF5320` is the theme-independent „jetzt"
  colour; the **People palette** (8 categorical) drives avatar tiles
  deterministically; the **AI signature** gradient marks KI output. Pipeline
  status is a separate fixed scale (six stages, three hue families).
- **Type.** Display = **Clash Display** (self-hosted); body = Inter; mono =
  JetBrains Mono for numbers/dates/kickers only. Space Grotesk stays as
  `--font-display-legacy` and for the CV document sheet (`--cv-*`, untouched).
- **Brand.** The **Now-Split logo** family (royal tile · actual block · dashed
  ghost · live-orange playhead), wordmark „my"(ink)·„Job"(live). The DS
  `AppShell`/`Logomark` draw it inline (no asset-path dependency).
- **Form.** Bigger radii (controls 12, cards 22, rail/hero 28); all buttons,
  badges, pills, status chips and nav items fully rounded. Spring motion
  (`--ease-spring`) on entrances/lifts, behind `prefers-reduced-motion`.
- **Signals.** **Match** (candidate fit) is a radial `MatchIndicator` that rides
  the accent; **Progress** (mandate fill) is a linear neutral `ProgressBar` —
  distinguished by _shape_ first so the difference survives the accent swap and
  colour-blindness.

### Structure — „alles ist Kandidat oder Stelle"

- **Shell.** The SPA's bespoke `RecruitRail` is replaced by the design-system
  **`AppShell`** (`posture="rail"` desktop, `"tabs"` on a phone). Settings and
  the account chip are rail-foot utilities (`onNav('__settings' | '__account')`),
  not destinations; the assistant (CoRecruiter) is a topbar action.
- **Six destinations:** **Workspace · Mandate · Talent-Pool · Pipeline ·
  Performance · Postfach.** Matching folds under Mandate (Stellensuche),
  Placements under Performance; the CV/Anschreiben editor and the
  Bewerbungsmappe open **inside** a candidate profile; the applications board is
  the **Pipeline**.
- **Language.** German-first, gender-inclusive (Kandidat:innen); domain vocab per
  the DS readme (Mandat, Sichtung, Platzierung, Absage). Stages: Neu · Sichtung ·
  Interview · Angebot · Eingestellt · Absage.

### What did NOT change

The hexagonal core, the REST API surface, auth/DSGVO, the job-source registry,
and the single-source document rendering (ADR-0052) are untouched — this is a
presentation-layer + IA change. The CV document sheet keeps its own `--cv-*`
styling and is never themed.

## Consequences

- One product, one operator (the Vermittler); the retired applicant app is not
  reintroduced. The shell ships only the `rail` posture on desktop and folds to
  `tabs` on a phone.
- The whole recruiting SPA re-points to `MyJobDesignSystem_5611b7`; because the
  kit already spoke the semantic token vocabulary (`--surface-*`, `--accent`,
  `--text-*`), swapping token _values_ re-skinned most views for free — the
  manual work was the shell, the logo, the German copy and adopting the signature
  components.
- Tests move with the redesign: the contrast fixtures cover the Vivid + Klassik
  themes, the a11y axe guard mounts the new bundle, and the desktop + mobile e2e
  assert the new German IA. The CV-render and backend tests are unaffected.
- Risk accepted: this is a large single change (one PR by owner request) rather
  than the incremental per-issue cadence used previously.

## Update — 2026-07 handoff refresh (v2)

A second design-system handoff was adopted **1:1** into `design/myjob/`. The
namespace is unchanged (`MyJobDesignSystem_5611b7`), so this is a non-breaking
refresh of the same system, not a re-migration. Deltas:

- **New components.** `Sparkle` (the AI/accent affordance) and `CountryFlag`
  (promoted from a private `PositionCard` helper to a public DS component).
- **`Button.demo`.** A dashed, non-interactive button state with a „Demo — noch
  nicht verdrahtet" tooltip, for affordances that are visible but not yet wired;
  clicks are suppressed. `onClick` is now an explicit prop.
- **Tokens.** A global `:focus-visible` outline joins the base layer, and the
  nav rail's badge/label font sizes move off a hard-coded `10px` onto the
  existing `--fs-3xs` token.
- **Docs in-repo.** The handoff's `templates/` (matching, pitch-deck, splash,
  talent-pool, workspace), refreshed `screens/`, `decisions/` and `readme.md`
  land in the repo as design documentation alongside the runtime bundle.
- **Cleanup.** The unused `candidate-portrait-sm` avatar asset is dropped (its
  references were removed in the handoff).

Because the recruiting SPA consumes the system through `_ds_bundle.js` and the
shared `styles.css`/tokens, the refresh propagates without SPA code changes;
`vite build` regenerates the served `dist/`. The single deliberate repo-local
delta from the raw handoff remains the shared-font import path in `styles.css`
(`../fonts/fonts.css`), because the webfonts live in `design/fonts/`.
