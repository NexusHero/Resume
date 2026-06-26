---
name: myjob-design
description: Use this skill to generate well-branded interfaces and assets for myJob — a German-market job-application & recruiting suite (recruiting ATS + applicant app + interactive résumé) — either for production or throwaway prototypes/mocks/etc. Contains essential design guidelines, colors, type, fonts, assets, and UI kit components for prototyping.
user-invocable: true
---

Read the README.md file within this skill, and explore the other available files.
If creating visual artifacts (slides, mocks, throwaway prototypes, etc), copy assets out and create static HTML files for the user to view. If working on production code, you can copy assets and read the rules here to become an expert in designing with this brand.
If the user invokes this skill without any other guidance, ask them what they want to build or design, ask some questions, and act as an expert designer who outputs HTML artifacts _or_ production code, depending on the need.

Quick orientation:
- `styles.css` is the single global entry point — link it and you get every token + the three webfonts. Set `data-theme="blueprint|signal|graphite"` on any wrapper to swap the accent (default Blueprint).
- Components live under `components/` and are bundled to `window.MyJobDesignSystem_f3658e` (load `_ds_bundle.js`). Each has a `.prompt.md` with usage. Mount in an HTML file via a `<script type="text/babel">` block after React + the bundle.
- Full-screen recreations are under `ui_kits/` (recruiting ATS, applicant app, interactive résumé). Copy one as a starting point for a product screen.
- Brand essentials: ink-dark shell + paper-light surfaces; Space Grotesk / Inter / JetBrains Mono (every number & label is mono); pill buttons; feather line icons only (no emoji); German, gender-inclusive, calm copy. The six pipeline stages and their colors are fixed across themes.
