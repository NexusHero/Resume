# myJob Design System

The design system behind **myJob** — a job-application & recruiting suite for the German
(DACH) market. It spans two products that share one visual DNA:

- **myJob Workspace** — the recruiting side (an ATS / agency platform): mandates, a talent
  pool, an applications pipeline, placements and reports.
- **myJob für Bewerber:innen** — the applicant side: an applications tracker and a
  Bewerbungsmappe (application-bundle) composer.

It also carries the **document side** of the same DNA: a self-contained interactive
**résumé / CV** (the artifact the whole suite was originally built around — for *Suhay
Sevinc*).

The signature is an **engineering-instrument** aesthetic: a dark "ink" app shell against
light "paper" working surfaces, **Space Grotesk** display + **Inter** body + **JetBrains
Mono** for every date, tag, count and kicker (the "mono signature"). Three swappable
accents — **Blueprint** (steel blue, default), **Signal** (amber), **Graphite** (slate) —
plus a fixed six-stage pipeline status palette.

## Index / manifest

**Foundations**
- `styles.css` — the single entry point consumers link. `@import` manifest only.
- `tokens/` — `colors.css`, `typography.css`, `spacing.css`, `effects.css`, `themes.css`,
  `modes.css`, `base.css`.

**Components** (namespace `window.MyJobDesignSystem_f3658e`, compiled into `_ds_bundle.js`)
- `core/` — `Icon` (+ `ICON_NAMES`), `Button`, `IconButton`, `Badge`, `Avatar`, `MetaPill`.
- `data/` — `Card`, `StatCard`, `ProgressBar`, `StatusBadge` (+ `STAGES`), `Tabs`,
  `CandidateRow`.
- `forms/` — `Input`, `Textarea`, `Select`, `Checkbox`, `Switch`.

**UI kits** (`ui_kits/`) — open through the served bundle, not `file://`
- `recruiting/` — **myJob Workspace** (ATS). Dark nav rail + topbar, overview KPIs,
  pipeline board, talent profile, résumé/cover-letter editor, Bewerbungsmappe modal.
- `bewerber/` — **myJob für Bewerber:innen**. Applications tracker + Mappe composer.
- `karriere/` — **myJob · Karriere**. Personal career tracker — applications sent, work
  history & lifetime earnings; light/dark + two layout directions.
- `cv/` — **Interactive Résumé**. Fully self-contained single file; EN/DE toggle, accent
  themes, PDF export. Defaults to the Signal accent.

**Assets** (`assets/`) — `logo/` (mark on ink + light), `img/` (candidate + résumé
portraits).

> The compiler generates `_ds_bundle.js`, `_ds_manifest.json` and `_adherence.oxlintrc.json`
> — never edit those by hand. The local mirror carries the compiled bundle only; the
> `components/**` and `foundations/**` design-system source live in the Claude Design project
> (projectId `f3658e6d-299c-4aba-a5fb-fa12cdcd17dd`).
