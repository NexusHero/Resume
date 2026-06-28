# Design brief / prompt for the myJob Design System

Paste this into the claude.ai Design project as context before asking for screen
or component work. It states the current problem and the target direction so the
design tool has a grounded foundation instead of iterating screen-by-screen.

---

You are the lead product designer for **myJob**, a job-application + recruiting
product family built on a shared design-token system (the "myJob Design System").
There are three runnable UI kits today — `recruiting` (ATS for recruiters/agencies),
`karriere` (an applicant's career tracker) and `bewerber` (an applicant
application/dossier app) — plus a self-contained interactive `cv`.

I need you to help restructure this from a set of similar-looking screens into a
coherent, two-app product. Here is the honest current state, the problems, and
where we want to go. Work from this.

## What's wrong today (be ruthless, this is the brief)

**1. Three apps, but only two real personas.** `bewerber` and `karriere` both serve
the *applicant* — in two different shells (top tabs vs. left rail). They overlap
heavily. Only `recruiting` is a genuinely separate persona.

**2. Screen-level redundancy (not component reuse — that part is fine):**
- The **identical KPI strip** (Active mandates / Talents in pool / Placements Q2 /
  Fees Q2) appears verbatim on **three** recruiter screens: Overview, Reports and
  Placements. Reports and Placements are essentially "same header + one
  table/chart."
- A **"list of applications"** exists 3–4 times in different costumes: recruiting
  Applications (kanban), karriere Bewerbungen (the rich, best one), bewerber My
  applications (a weaker copy), plus dashboard summaries. Same entity, many views.
- Two near-identical **dashboards** (recruiting Overview, karriere Übersicht): greeting
  + KPIs + two summary lists.

**3. UI/UX issues to fix system-wide:**
- **Monospace overuse.** Mono + uppercase + letter-spacing is used for almost every
  label, badge, pill, timestamp and nav subtitle. It reads like a code editor, hurts
  scannability, and fights the humanist body font. Mono should be reserved for code,
  tech tags, IDs and currency — not the default for labels.
- **Flat-busy hierarchy.** Many similarly-weighted small texts compete per row; the
  most important signal (the match %) is small and styled like a link. Each row needs
  one dominant "hero" signal.
- **Ambiguous "%".** The same percentage pill means different things in different
  places — candidate *match* (74–90%) vs mandate *fill/progress* (20–24%). A match
  score and a progress score must be visually distinct tokens.
- **Rainbow status colors.** The pipeline funnel colors a neutral "In review" stage
  **red** (= error/danger). Status color must be semantic: neutral stages on a
  blue/grey scale; green = success; amber = warning; red only for real problems
  (rejection, overdue).
- **Mixed languages (DE/EN) within single screens.** e.g. the dossier builder mixes
  "Recipient/Company/Position" (EN) with "Dokumente / Reihenfolge der finalen PDF /
  2 Seiten / oder Dateien hierher ziehen" (DE); applicant status pills are DE with EN
  captions. One language per session — full audit needed.
- **Half-empty screens.** Lists hug the top; 50–70% of the viewport is empty below
  the fold. Either use a right-side detail panel, or constrain to a centered column.
- **Inconsistent app shells** (left rail vs top tabs) across the family.
- **No mobile / no real interaction states** (loading is a fake skeleton that doesn't
  match row density); weak affordances (rows look clickable but the primary action is
  unclear; the global search field appears everywhere but does nothing).
- **Generic brand.** Default product-blue; the only personality is the (overused)
  mono-tech look, applied as decoration rather than concept.

## Where we want to go (target direction)

**Two apps, one shared shell, each destination earns its place, shared content lives
exactly once.**

**A. myJob Recruit (recruiter persona) — left rail, 6 destinations**
Overview (the *only* home of the KPI strip) · Mandates · Talent Pool · **Pipeline**
(renamed from Applications) · **Performance** (merge Reports + Placements as tabs:
Funnel · Fees · Placements) · Inbox.

**B. myJob (applicant persona) — same shell, 6 destinations** (fold `bewerber` into
`karriere`)
Dashboard · **Job search** (the two-tier skill-match feature — our differentiator) ·
**Applications** (the rich list; absorb bewerber's My-applications) · **Documents**
(CV/docs + the dossier builder as a task, not a top tab) · **Career** (work history /
positions / earnings) · Inbox. Job sources → Settings ▸ Sources. The CV is a shared
**export artifact**, not a nav screen.

**Cross-cutting principles to apply to tokens + components:**
1. One app-shell for both apps (desktop left rail → mobile bottom tab bar / drawer).
2. Shared content has one home; canonical `ApplicationRow`, `KpiTile`, match indicator.
3. Distinct tokens for *match* vs *progress* percentages.
4. Monospace only for code/tech-tags/IDs/currency; labels move to the sans.
5. Semantic status colors (no red for neutral stages).
6. One language per session; fix all DE/EN mixing.
7. Right-side detail panel for talent/application/job detail so lists aren't empty.
8. One hero signal per row (the match %).
9. Responsive from the start; define mobile behavior.
10. Give the brand one ownable idea beyond "mono = technical."

## Open questions (decide with me, don't assume)
- "Meine Stellen / Career": work history (keep) or saved jobs (fold into Job search)?
- One account with an applicant/recruiter mode switch, or two separate products?
- Where does Settings live (none exists today)?
- Is the applicant app mobile-first while Recruit stays desktop-first?

## What to produce
Start at the system level, not screen-by-screen: (1) confirm the two sitemaps above,
(2) propose the unified app-shell, (3) revise the type/label system (mono detox) and
the status/percentage color tokens, (4) then redesign the ~12 surviving destinations
to these principles. Flag every place the old screens collapse or merge.
