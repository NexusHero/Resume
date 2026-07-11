---
name: myjob-design
description: Use this skill to generate well-branded interfaces and assets for myJob — a German-market (DACH) recruiting suite (a single recruiter-facing ATS: Workspace, Talent-Pool, Stellen + Matching, Pipeline) — either for production or throwaway prototypes/mocks/etc. Contains essential design guidelines, colors, type, fonts, assets, and UI kit components for prototyping.
user-invocable: true
---

Read the readme.md file within this skill, and explore the other available files.
If creating visual artifacts (slides, mocks, throwaway prototypes, etc), copy assets out and create static HTML files for the user to view. If working on production code, you can copy assets and read the rules here to become an expert in designing with this brand.
If the user invokes this skill without any other guidance, ask them what they want to build or design, ask some questions, and act as an expert designer who outputs HTML artifacts _or_ production code, depending on the need.

Quick orientation:
- `styles.css` is the single global entry point — link it and you get every token + the four webfonts. Accent default is **Royal** (Königsblau); swap with `data-theme="ember|blueprint|signal|graphite"` on any wrapper. `data-mode="dark"` flips to the conserved ink „Klassik" look. Splash sting: `screens/Splash.html`.
- Components live under `components/` and are bundled to `window.MyJobDesignSystem_5611b7` (load `_ds_bundle.js`). Each has a `.prompt.md` with usage. Mount in an HTML file via a `<script type="text/babel">` block after React + the bundle.
- Full-screen recreations are under `screens/` (Workspace, Talent-Pool, Matching, CV-Builder, Bewerbung-vorbereiten, Settings). Copy one as a starting point for a product screen.
- Brand essentials: floating white nav rail on a cool light canvas (Dark Mode = the conserved ink+orange „Klassik" look via `data-mode="dark"` + `data-theme="ember"`); Royal Königsblau #3654E0 accent + theme-independent Live-Orange #FF5320 for everything happening JETZT; the Now-Split logo (shared 1:1 with myDevTime); Clash Display (display) / Inter (body) / JetBrains Mono; große Formen (radii up to 28px, pill buttons/nav); People-Palette (8 vivid colors) for avatars; feather line icons only (no emoji); German, gender-inclusive, calm copy. **Mono has a job, not a costume** — it is reserved for numbers, dates, IDs, currency, `%`, tech-tags and the small brand kicker, NOT for labels/nav/badges. The six pipeline stages are fixed (Neu · Sichtung · Interview · Angebot · Eingestellt · Absage), collapsing to three hues (neutral / green / red) across themes.
