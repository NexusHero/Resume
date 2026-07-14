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

The signature (since the **2026 „Vivid“ redesign**) is **lebhaft & modern**: a light,
cool working canvas with a **floating white nav rail**, big soft shapes (radii up to 28px),
the **Royal** Königsblau accent `#3654E0` (the logo tile) for trust and structure, and the
theme-independent **Live orange** `#FF5320` (the logo playhead) for everything happening
*jetzt*. Type is **Clash Display** (display) + **Inter** (body) + **JetBrains Mono** for
every date, tag, count and kicker. Recruiting is people, so people are colorful: the
**People palette** (8 vivid categorical colors) drives avatar tiles deterministically.
The pipeline status palette stays fixed (six stages collapsed to three hues — neutral /
green / red). The **classic ink-dark look with the orange accent lives on as the Dark
Mode** (`data-mode="dark"` + `data-theme="ember"`) — conserved, not redesigned. The
brand mark is the **Now-Split** logo, shared 1:1 with the sister product myDevTime
(identical mark for both products — owner decision, July 2026): a royal tile split into a
solid „actual“ block and a dashed „ghost“ block by the live-orange playhead. The splash
sting (`screens/Splash.html`) animates it.

## Sources

This system was ported from the **NexusHero/Resume** repository
(<https://github.com/NexusHero/Resume>) — the "Bewerbungs-Suite" codebase — specifically its
`design/myjob/` recruiting design system (tokens, components, foundations, screens) and the
shared self-hosted webfonts under `design/fonts/`. Both were plain HTML/CSS/React over a
shared token layer. No external Figma. Explore that repository (especially `docs/`, `docs/adr/`
and `design/myjob/`) to build myJob designs with deeper fidelity. The pre-restructure Vite SPA
under `design/myjob/ui_kits/recruiting/` was **not** ported here (it needs a bundler + npm and
cannot render standalone) — the renderable `screens/` recreations replace it.

The **2026 „Vivid“ redesign** additionally ports from **NexusHero/myDevTime**
(<https://github.com/NexusHero/myDevTime>), the sister product's repo: the **Now-Split logo
family** (`docs/design-system/assets/logo/` → `assets/logo/`, wordmark re-set to „myJob“),
**Clash Display** webfonts (`docs/design-system/fonts/`), the Royal/Live color duo, the
spring motion language and the splash-sting choreography
(`docs/design-system/guidelines/brand-splash.html`). Explore that repo — especially
`docs/design-system/readme.md` and `docs/design/ux-vision.md` — for the family DNA.

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

**Ehrliche Aktionen (Demo-Regel).** Ein Button, der real nichts tut (Demo, coming soon,
nicht verdrahtet), darf nie wie eine echte Aktion aussehen. `Button demo` rendert ihn
gedämpft mit gestrichelter Border, `cursor:help` und Tooltip „Demo — noch nicht
verdrahtet“; der Klick wird unterdrückt.

**Nav-Regel für Sub-Flows.** Screens, die einen Unter-Schritt eines Bereichs zeigen
(z. B. „Bewerbung vorbereiten“ unter Matching), behalten den ELTERN-Eintrag als aktiven
Nav-Zustand — es gibt keine eigenen Nav-Einträge für Sub-Flows.

**Mono-Grenzfall MetaPill.** Seniority-Pills („Senior“, „Mid“) zählen als Tech-Tags und
dürfen Mono tragen — das ist die dokumentierte Ausnahme zur „Mono nie für Wort-Labels“-Regel.

**CV-Dokument-Palette.** Das weiße CV-Blatt (CV-Builder) führt bewusst eine eigene
Mini-Palette; `--cv-accent`-Default #2A6FDB ist der Legacy-Dokumentakzent, kein App-Token. Regel stammt aus dem Nutzertest (Erwartung
gebrochen, wenn Demo-Buttons wie primäre Aktionen aussehen).

**Two structural worlds — rebalanced in 2026.** LIGHT (default): everything floats on a
cool light canvas (`--surface-app` #f2f4fa) — the nav rail is a **floating white rounded
card** (`--rail-*` tokens, radius `--radius-2xl`, soft shadow), the topbar is transparent,
content sits in white `--surface-card` sheets. DARK („Klassik“): the conserved ink world —
`--rail-*` flips to the 165° ink gradient, surfaces invert, one accent glow on the canvas.
AppShell reads only `--rail-*`; never hardcode ink in chrome.

**Color.** Cool slate-neutral base; saturated color has exactly four jobs.
- **Accent** swaps by setting `data-theme="royal|ember|blueprint|signal|graphite"` on any
  wrapper — the default `:root` is **Royal** (#3654E0). Components read `--accent`,
  `--accent-strong`, `--accent-soft`, `--accent-border`, `--accent-on-dark` and
  `--accent-contrast` — never raw palette values. Blueprint/Signal/Graphite are legacy.
- **Live / Jetzt** (`--live` #FF5320 + `-strong/-soft/-border/-on-dark`) is
  theme-independent: heute anstehende Interviews, laufende Gespräche, the notification dot,
  the logo playhead, the splash. Never decoration, never status, never chrome.
- **People palette** (`--people-1…8` + `-soft`): 8 vivid categorical colors for avatar
  tiles, skill tags, calendar chips. `Avatar` assigns deterministically (name hash). The
  only other saturated color on screen.
- **AI signature** (`--ai-grad`, blue→violet→orange): only on KI output (Matching-KI,
  Anschreiben-Entwürfe) — the „KI schlägt vor, du entscheidest“ marker. Deterministic UI
  never wears it.
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

**Contrast contract (WCAG AA, guarded).** Text tokens must clear **4.5:1** on every light
surface they land on — including the sunk grey `--surface-sunk` #f1f5f9, not just white; the
softest text `--text-soft` is tuned to that floor (a hair darker than `--neutral-500`, which
stays for non-text UI). Chip/badge `-strong` text on its `-soft` fill and the filled-accent
label are held to 4.5:1 too. Non-text UI is **3:1**, but on the *interactive* state that
conveys it: resting borders (`--border`, `--border-strong`) are deliberately subtle — the
calm, light identity depends on it — and the 3:1 affordance is carried by the **focus ring**
(`--accent`) and icon strokes, not the hairline (WCAG 1.4.11). The pairs are enumerated in
`tokens/contrast-pairs.mjs`, resolved and scored by `tokens/contrast-audit.mjs`, and gated by
`contrast.test.js` (runs in `npm run test:web` / `./test.sh`) so a token edit can't silently
drop below AA. Adding a theme (e.g. dark mode) is one more fixture in `THEMES`, not a second
audit.

**Type.** Display = **Clash Display** (500/600/700, tight tracking on big sizes; Space
Grotesk remains via `--font-display-legacy` for the Blueprint-era look and stays untouched
in the CV document sheet, which uses its own `--cv-font` variables); Body = Inter at 15px /
1.6; Mono = JetBrains Mono. Scale runs `--fs-2xs` 11 → `--fs-7xl` 64. Headings always
display; body always Inter. **Mono has a job, not a costume:**
it is reserved for numbers, dates, IDs, currency, `%`, tech-tags and code — plus the small
brand kicker. It is *not* the default for labels, badges, nav subtitles or timestamps-as-
decoration (the old „mono signature“ over-reached and read like a code editor). The thing
the brand truly owns is the **match signal** (`MatchIndicator`), not the typeface.

**Spacing.** 4px base grid (`--space-1` 2 → `--space-13` 64). App geometry tokens:
`--app-nav-width` 244, `--app-topbar-h` 60, `--pad-app`, `--row-h` 60. Document geometry:
`--sidebar-width` 360, `--page-max` 1180.

**Backgrounds.** Flat surfaces. The permitted gradients: (1) the Royal hero band on the
Workspace (130° royal + one live-orange radial glow), (2) the dark-mode canvas glow, (3)
the splash's radial night gradient, (4) the AI signature. No mesh gradients, no patterns.
The logo's oversized ghost/actual blocks may appear once as hero texture at low opacity.

**Borders & radii — große Formen.** Hairline `1px var(--border)` on light; `--border-strong`
for inputs/controls. Radii stepped up in 2026: controls `--radius-md` 12; cards `--radius-xl`
22; hero surfaces / rail / detail panel `--radius-2xl` 28; **all buttons, badges, pills,
status chips and nav items are fully rounded** `--radius-pill`.

**Cards.** White surface, `1px var(--border)`, `--radius-lg`, `--shadow-sm`. Optional
header (display title + soft subtitle) divided by a hairline. The floating document/résumé
sheet uses the heavier `--shadow-page` over `--surface-page`. Shadows are soft and
low-contrast (slate-tinted, never black); elevation is `sm → md → lg → page`.

**Elevation on dark.** `--shadow-dark-sm/-md` for elements that float on the ink shell;
glass chips use `--sidebar-glass` + `backdrop-filter: blur(8px)`.

**Transparency & blur.** Used sparingly and only on chrome: the sticky topbar is
`color-mix(paper 88%, transparent)` + `blur(10px)`; sidebar "glass" chips and the avatar
ring. Working surfaces stay opaque.

**Motion — lebhaft, aber physisch.** Two curves: `--ease-out` (calm chrome — hovers,
fades) and `--ease-spring` cubic-bezier(0.34,1.56,0.64,1) (gentle overshoot — entrance
rises, KPI-tile lifts, tile-grid settles, the splash sting). Durations `--dur-fast` 0.14s /
`--dur-med` 0.22s / `--dur-slow` 0.32s. Staggered entrance (`rise` + 60–70ms steps) on
landing content, gated behind `prefers-reduced-motion`. The only infinite loops: the live
dot pulse and the demo splash.

**Hover states.** Buttons lift 1px (`translateY(-1px)`) + gain `--shadow-md`; KPI tiles
and talent tiles lift 2–3px with the spring. Vivid CTAs and active nav items carry a colored
glow (`--shadow-accent` / `--shadow-live`). List rows fade to `--surface-subtle`. Nothing
scales up.

**Press / active & selection.** Selection is shown by an **accent-soft fill + a 3px accent
left-bar** (candidate rows) or an accent underline (tabs). Inputs on focus draw an accent
border + a `0 0 0 3px var(--accent-soft)` glow ring. Text selection is accent-on-white.

**Imagery — people, prominently.** Candidate/user portraits are the imagery. `Avatar`
(circle in chrome, rounded-square for document portraits) with a **People-palette initials
fallback** (deterministic name→color) so a missing photo still reads as a person. The
Talent-Pool leads with **Foto-Kacheln** (photo tiles); rows use `md` avatars, profiles `88px`.
No stock illustration, no 3D, no icons-as-illustration.

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
- The **logo** is the **Now-Split mark** (`assets/logo/` — `icon.svg` royal tile,
  `icon-light.svg`, `icon-mono.svg` currentColor, `mark-glyph.svg` untiled, `favicon.svg`,
  `splash.svg`, plus `wordmark.svg`/`lockup-horizontal.svg` re-set to „myJob“): a solid
  „actual“ block and a dashed „ghost“ block split by the live-orange playhead, shared 1:1
  with myDevTime. Wordmark: **my** in ink/white + **Job** in `--live`, Clash Display 700,
  over a mono „Vermittler-Workspace“ kicker. The old 3-bar mark is retired.

---

## Index / manifest

**Foundations**
- `styles.css` — the single entry point consumers link. `@import` manifest only.
- `tokens/` — `colors.css`, `typography.css`, `spacing.css`, `effects.css`, `themes.css`,
  `base.css`.
- `foundations/` — specimen cards (Colors, Type, Spacing, Brand) shown on the Design
  System tab.

**Components** (`components/`, namespace `window.MyJobDesignSystem_5611b7`)
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

**Screens** (`screens/`) — full-surface recreations of myJob Recruit, each a
self-contained HTML file (CDN React + Babel + the compiled bundle) that renders on the
Design System tab and seeds new designs as a Starting Point. Open through the served
bundle, not `file://`.
- `Workspace.html` — the Recruit landing: Royal hero with Jetzt-Chip, bunte KPI-Tiles,
  „Braucht Aufmerksamkeit“, active applications, quick-access detail panel.
- `Talent-Pool.html` — Foto-Kachel-Grid (People-Palette), Klick öffnet das volle Profil;
  „Ich“ as talent #1.
- `Splash.html` — the animated Now-Split logo sting (loops for demo; runs once in-app).
- `Matching.html` / `Matching-Ive.html` — find/create a Stelle and apply a candidate on
  their behalf (two-tier skill overlap); the `-Ive` file is the visual-reduction pass.
- `CV-Builder.html` — résumé editor inside a candidate profile.
- `Bewerbung-vorbereiten.html` — cover letter + assemble the Bewerbungsmappe.
- `Settings.html` — Darstellung (Hell „Vivid“ / Dunkel „Klassik“, echtes Umschalten), KI,
  Agentic-Modus.

**Templates** (`templates/`) — starting points the picker offers consuming projects:
`pitch-deck/` (10-slide customer pitch, Royal look, EN, deck-stage), `workspace/`,
`talent-pool/`, `matching/`, `splash/` (the four app screens re-rooted one level deeper).
Components also export `Logomark` (Now-Split mark), `Sparkle` (AI signature) and
`CountryFlag` (DE/AT/CH) — screens import these instead of local copies.

**Decisions** (`decisions/`) — the restructure/gap rationale docs (reference only, not
cards).

**Assets** (`assets/`) — `logo/` (the Now-Split family, wordmark re-set to „myJob“),
`img/` (candidate + résumé portraits).

**Other** — `SKILL.md` (Agent-Skills wrapper), this `readme.md`.

> The compiler generates `_ds_bundle.js`, `_ds_manifest.json` and `_adherence.oxlintrc.json`
> — never edit those by hand.
