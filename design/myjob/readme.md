# myJob Design System

The design system behind **myJob** — a recruiting suite for the German (DACH) market.
**One product, one operator: the Vermittler (recruiter).**

There is a single app — **myJob Recruit**, desktop-first (ink left rail + topbar +
detail panel). The recruiter is the operator; a candidate is the *object of the work*,
never a separate logged-in app. (The earlier applicant-facing build, *myJob für
Bewerber:innen*, has been **retired** — see below.) Core destinations consolidate to a
few: **Workspace** (the landing — what needs attention today), **Talent-Pool** (candidates
incl. "Me", each with their full CV + applications *inside* the profile), **Stellen +
Matching** (find/create a posting, apply a candidate on their behalf), plus Pipeline and a
Postfach utility.

Everything that used to be its own top-level destination — CV builder, Anschreiben,
Applications, Dossier — now lives *inside* a candidate or a posting, not as a separate
page. The guiding rule: **everything is either a candidate or a Stelle.**

The CV builder, dual search (manual + automatic skill-overlap), apply-on-behalf and
per-position dossiers all live recruiter-side. A job posting is a first-class **Stelle**
object (`PositionCard`) carrying country + source, which is how the DACH market —
including Swiss boards like jobs.ch / job-room.ch (CHF, Pensum %) — is modelled.

The legacy `ui_kits/` (`recruiting`, `karriere`) are *pre-restructure* screens, kept only
until they migrate. The `bewerber` applicant app has been **removed** (one product,
recruiter is operator). `AppShell` still ships a `tabs` (mobile) posture as a component
option, but the product ships only the `rail` posture.

It also carries the **document side** of the same DNA: a self-contained interactive
**résumé / CV** (the artifact the whole suite was originally built around — for *Suhay
Sevinc*).

The signature is an **engineering-instrument** aesthetic: a dark "ink" app shell against
light "paper" working surfaces, **Space Grotesk** display + **Inter** body + **JetBrains
Mono** for every date, tag, count and kicker (the "mono signature"). Three swappable
accents — **Blueprint** (steel blue, default), **Signal** (amber), **Graphite** (slate) —
plus a fixed pipeline status palette (six stages collapsed to three hues — neutral / green / red).

## Sources

This system was derived from the **Bewerbungs-Suite** codebase (`Resume/`, attached
read-only via the local-folder mount), specifically its `myjob/` recruiting design system
and the root CV design system. Both were plain HTML/CSS/React over a shared token layer.
No external Figma. If you have the original repo, the relevant trees were:
`Resume/myjob/{tokens,ui_kits,_ds_bundle.js}` and `Resume/{tokens,components,ui_kits/cv}`.

---

## Content fundamentals

**Language.** German-first product domain. Recruiting/funnel and applicant copy are German
and **gender-inclusive** with the colon form: *Bewerber:innen, Kandidat:innen, Vermittler*.
The recruiting *workspace chrome* (nav, some headers) carries a few English labels
(Overview, Mandates, Talent Pool) — a pragmatic bilingual reality, not a target; prefer
German for anything user-facing and new. Address the user informally (**du-Form**) on the
applicant side.

**Domain vocabulary (use these exact terms).** *Mandat* (a hiring brief), *Talent /
Talent-Pool*, *Bewerbung* (application), *Bewerbungsmappe* (the assembled bundle:
Anschreiben + Lebenslauf + Zeugnisse), *Sichtung* (screening), *Platzierung* (placement),
*Absage* (rejection). The six pipeline stages are fixed: **Neu · Sichtung · Interview ·
Angebot · Eingestellt · Absage**.

**Tone.** Calm, precise, administrative-but-human. State facts and next steps; never hype.

- Yes: *„Bewerbung eingegangen — wir melden uns in 5 Tagen."* · *„3 Talente passen zu
  diesem Mandat."* · *„Mappe erstellt. Jetzt herunterladen?"*
- No: *„Wow! Deine Bewerbung ist raus! 🚀"* · *„Revolutioniere dein Recruiting!"* · bare
  *„Ein Fehler ist aufgetreten."* (say what to do next).

**Casing.** Sentence case for headings and buttons. **Mono + UPPERCASE + wide tracking**
only for small kickers and KPI captions (`--ls-wide`/`--ls-wider`). Field labels and nav
items are humanist sans, **not** mono. Never all-caps a full sentence.

**Numbers.** Always set in JetBrains Mono with `font-variant-numeric: tabular-nums`.
German formatting: `78.000 €`, `92%`, `+12%`.

**Emoji.** None. Meaning is carried by line icons and the status palette, not emoji.

---

## Visual foundations

**Two structural worlds.** Every screen is a conversation between **ink** (the dark
sidebar / nav / app shell — `--ink-850 → --ink-900`, a 165° gradient) and **paper** (the
light working canvas `--surface-app` #f1f5f9 with white `--surface-card` sheets). Dark
chrome frames; light surfaces work.

**Color.** Restrained slate-neutral base; color is reserved for *accent* and *status*.
- Accents swap by setting `data-theme="blueprint|signal|graphite"` on any wrapper — the
  default `:root` is Blueprint. Components read `--accent`, `--accent-strong`,
  `--accent-soft`, `--accent-border`, `--accent-on-dark` (the lighter tint used on ink),
  and `--accent-contrast` (text on a filled accent) — never raw palette values.
- **Pipeline status** is a separate, fixed scale that does **not** change with the accent.
  IVE REDUCTION: the six stages now collapse to **three hues** — the *label* and board
  position carry the stage, not a sixth colour. **Neu · Sichtung · Interview** = one neutral
  slate ("in Bearbeitung"); **Angebot · Eingestellt** = green ("Erfolg"); **Absage** = red.
  Each stage still owns `--status-<stage>` (dot), `-soft` (chip bg), `-border`, `-strong`
  (chip text), so `StatusBadge` is unchanged — the token *values* just share three families.
  Red is reserved for a real problem (rejection/overdue) only.
- **Match vs progress** are two percentages that must never look alike. **Match** =
  candidate FIT — `--match*`, a RADIAL ring that rides the accent (`MatchIndicator`, the
  ownable signal, two-tier Pflicht/Bonus). **Progress** = completion / mandate fill —
  `--progress*`, a LINEAR neutral-slate bar (`ProgressBar`). Distinguished by *shape* first,
  colour second, so the difference survives the accent swap and colour-blindness.
- Semantic feedback: `--success` (green), `--warning` (amber), `--danger` (rose), `--info`
  (blue), each with a `-soft` tint.

**Type.** Display = Space Grotesk (tight tracking, `--ls-tight`/`--ls-tighter` on big
sizes); Body = Inter at 15px / 1.6; Mono = JetBrains Mono. Scale runs `--fs-2xs` 11 →
`--fs-5xl` 38. Headings always display; body always Inter. **Mono has a job, not a costume:**
it is reserved for numbers, dates, IDs, currency, `%`, tech-tags and code — plus the small
brand kicker. It is *not* the default for labels, badges, nav subtitles or timestamps-as-
decoration (the old „mono signature“ over-reached and read like a code editor). The thing
the brand truly owns is the **match signal** (`MatchIndicator`), not the typeface.

**Spacing.** 4px base grid (`--space-1` 2 → `--space-13` 64). App geometry tokens:
`--app-nav-width` 244, `--app-topbar-h` 60, `--pad-app`, `--row-h` 60. Document geometry:
`--sidebar-width` 360, `--page-max` 1180.

**Backgrounds.** Flat surfaces, no decorative imagery or texture. The *only* gradients are
(1) the ink sidebar/shell (subtle 165° ink-850→ink-900) and (2) the avatar initials
fallback. No mesh gradients, no patterns, no blur except the topbar/glass chrome.

**Borders & radii.** Hairline `1px var(--border)` (#e5e7eb) on light; `--border-strong`
for inputs/controls. On ink, borders are translucent white (`--sidebar-border`). Radii:
inputs/controls `--radius-md` 10; cards/sheets `--radius-lg` 12; **all buttons, badges,
pills and status chips are fully rounded** `--radius-pill`. Pill buttons + mono labels are
the core button signature.

**Cards.** White surface, `1px var(--border)`, `--radius-lg`, `--shadow-sm`. Optional
header (display title + soft subtitle) divided by a hairline. The floating document/résumé
sheet uses the heavier `--shadow-page` over `--surface-page`. Shadows are soft and
low-contrast (slate-tinted, never black); elevation is `sm → md → lg → page`.

**Elevation on dark.** `--shadow-dark-sm/-md` for elements that float on the ink shell;
glass chips use `--sidebar-glass` + `backdrop-filter: blur(8px)`.

**Transparency & blur.** Used sparingly and only on chrome: the sticky topbar is
`color-mix(paper 88%, transparent)` + `blur(10px)`; sidebar "glass" chips and the avatar
ring. Working surfaces stay opaque.

**Motion.** Quiet and functional. One easing — `--ease-out` cubic-bezier(0.16,1,0.3,1) —
and two durations — `--dur-fast` 0.15s, `--dur-med` 0.25s. Used for hover background/border
fades, switch/progress slides, and modal fade+pop-in (`scale(0.96)→1`). No bounces, no
infinite/decorative loops, no parallax.

**Hover states.** Buttons lift 1px (`translateY(-1px)`) + gain `--shadow-md`. List rows
and nav items fade to a subtle background (`--surface-subtle` / `--sidebar-glass`). Links
shift color/opacity. Nothing scales up.

**Press / active & selection.** Selection is shown by an **accent-soft fill + a 3px accent
left-bar** (candidate rows) or an accent underline (tabs). Inputs on focus draw an accent
border + a `0 0 0 3px var(--accent-soft)` glow ring. Text selection is accent-on-white.

**Imagery.** People only — candidate/user portraits, shown in `Avatar` (circle in chrome,
rounded-square for document portraits) with an initials-on-ink fallback so a missing photo
still reads as a person. No stock illustration, no 3D, no icons-as-illustration.

---

## Iconography

**One system: feather-style line icons**, hand-built into the `Icon` component
(`components/core/Icon.jsx`). 24×24 grid, **1.8 stroke**, round caps/joins, `currentColor`,
inline SVG. ~60 glyphs covering identity, work/education, documents, app chrome, arrows,
actions/state and social. The full list is exported as `ICON_NAMES`.

- Use these glyphs everywhere; set color via `color` on the icon or a wrapper. Bump
  `strokeWidth` to ~2.4 for tiny check/chevron marks.
- **No emoji. No icon font / CDN.** No multicolor or filled icon sets. If you need a glyph
  that isn't in `PATHS`, add it on the same 24px / 1.8-stroke grid rather than importing
  another set.
- The **logo** is a 3-bar ascending bar-chart mark in a rounded-square (`assets/logo/` —
  `myjob-mark.svg` on ink, `myjob-mark-light.svg` on light), paired with the **myJob**
  wordmark (Space Grotesk 700, the "my" in `--accent-on-dark`) over a mono "Application
  Suite" kicker.

---

## Index / manifest

**Foundations**
- `styles.css` — the single entry point consumers link. `@import` manifest only.
- `tokens/` — `colors.css`, `typography.css`, `spacing.css`, `effects.css`, `themes.css`,
  `base.css`.
- `foundations/` — specimen cards (Colors, Type, Spacing, Brand) shown on the Design
  System tab.

**Components** (`components/`, namespace `window.MyJobDesignSystem_f3658e`)
- `app/` — `AppShell` (the one shared shell; `posture="rail"` desktop / `"tabs"` mobile).
- `core/` — `Icon` (+ `ICON_NAMES`), `Button`, `IconButton`, `Avatar`, `EntityTile` (the
  one media primitive — circular for people, rounded-square for companies), and the **one
  label-token primitive `Badge`** (`MetaPill` and `StatusBadge` are thin presets of it; all
  chips share one pill shape). IVE CONSOLIDATION: radii collapsed to 3 steps + pill,
  shadows to 2 working elevations + page.
- `data/` — `Card`, `StatCard`, `ProgressBar`, `StatusBadge` (+ `STAGES`), `Tabs`,
  `CandidateRow` (recruiter row), `ApplicationRow` (canonical applicant row),
  `MatchIndicator` (the radial fit signal), `PositionCard` (the Stelle object —
  carries country + source as first-class fields, so Swiss postings are native).
- `forms/` — `Input`, `Textarea`, `Select`, `Checkbox`, `Switch`.
- Each component: `<Name>.jsx` + `<Name>.d.ts` + `<Name>.prompt.md`; one `*.card.html`
  thumbnail per directory.

**UI kits** (`ui_kits/`) — open through the served bundle, not `file://`
- `recruiting/` — **myJob Workspace** (ATS). Dark nav rail + topbar, overview KPIs,
  pipeline board, talent profile, résumé/cover-letter editor, Bewerbungsmappe modal.
- `cv/` — **Interactive Résumé**. Fully self-contained single file (CSS, React, components
  and photo embedded); EN/DE toggle, accent themes, PDF export. Defaults to the Signal
  accent.

**Assets** (`assets/`) — `logo/` (mark on ink + light), `img/` (candidate + résumé
portraits).

**Other** — `SKILL.md` (Agent-Skills wrapper), this `readme.md`.

> The compiler generates `_ds_bundle.js`, `_ds_manifest.json` and `_adherence.oxlintrc.json`
> — never edit those by hand.
