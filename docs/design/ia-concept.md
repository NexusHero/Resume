# myJob — IA & UX redesign concept

> **Status: concept only.** No code, no app changes. This is the information-
> architecture cut to make *before* any Phase 4 (Vite) build, so the existing
> screen redundancy isn't poured into production code.

## The core problem this fixes

Today there are **3 apps** (`recruiting`, `karriere`, `bewerber`) and **15 screens**,
but really only **2 personas** — and a lot of duplicated content:

- The **applicant** is served by *two* apps (`karriere` + `bewerber`) in two
  different shells. They overlap heavily.
- The **identical KPI strip** (Active mandates / Talents / Placements / Fees)
  appears verbatim on **3 recruiter screens** (Overview, Reports, Placements).
- A **"list of applications"** exists 3–4× (recruiting Pipeline, karriere
  Bewerbungen, bewerber My applications, plus dashboard summaries).

Component reuse (one card, one row, one KPI tile) is *good* — keep it. The problem
is **screen/IA-level** duplication. The fix: **2 apps, one shell, each destination
earns its place, shared content lives in exactly one home.**

---

## Target structure: two apps, one design system

### A. myJob Recruit — recruiter / agency persona (left rail, 6 destinations)

| # | Destination | Purpose | Absorbs |
| --- | --- | --- | --- |
| 1 | **Overview** | Greeting + KPI strip (the *only* place it lives) + "next steps" + active mandates | recruiting-overview |
| 2 | **Mandates** | Client briefs, fees, deadlines | recruiting-mandates |
| 3 | **Talent Pool** | People you represent | recruiting-talent-pool |
| 4 | **Pipeline** | Submissions across mandates (the kanban), renamed from "Applications" | recruiting-applications |
| 5 | **Performance** | Analytics. Tabs: **Funnel · Fees · Placements** (no repeated KPI strip) | recruiting-reports + recruiting-placements |
| 6 | **Inbox** | Messages | recruiting-inbox |

Net: 7 → 6 destinations, and the KPI strip stops appearing on 3 screens.

### B. myJob — applicant persona (left rail, 6 destinations)

The `bewerber` app folds into `karriere`; one applicant app, same shell as Recruit.

| # | Destination | Purpose | Absorbs |
| --- | --- | --- | --- |
| 1 | **Dashboard** | Greeting + status counts + "needs attention" follow-ups + next steps | karriere-uebersicht |
| 2 | **Job search** | Two-tier skill match — the differentiator | karriere-jobsuche |
| 3 | **Applications** | The rich, canonical applications list (tabs, follow-up banner, doc chips) | karriere-bewerbungen **+ bewerber-my-applications (cut as standalone)** |
| 4 | **Documents** | CV/docs management + "New dossier" builder as a task here | bewerber-create-dossier (demoted from top tab) |
| 5 | **Career** | Work history / positions / lifetime earnings | karriere-meine-stellen *(assumption — verify)* |
| 6 | **Inbox** | Messages | (applicant inbox) |

`Jobquellen` (connect job-board APIs) → **Settings ▸ Sources** (utility, not a primary
destination). The **CV** is a *shared rendered artifact* (export from Documents), not
a nav screen.

Net: 2 apps × 6 destinations. From 15 screens, ~3 are absorbed/demoted
(bewerber My-applications, the duplicate KPI strips, Create-dossier; CV becomes an
artifact).

---

## Screen migration map (old → new)

| Old screen | New home | Action |
| --- | --- | --- |
| recruiting-overview | Recruit ▸ Overview | keep (sole KPI home) |
| recruiting-mandates | Recruit ▸ Mandates | keep |
| recruiting-talent-pool | Recruit ▸ Talent Pool | keep |
| recruiting-applications | Recruit ▸ Pipeline | keep + rename |
| recruiting-placements | Recruit ▸ Performance ▸ Placements | merge (tab) |
| recruiting-reports | Recruit ▸ Performance ▸ Funnel/Fees | merge, drop KPI strip |
| recruiting-inbox | Recruit ▸ Inbox | keep |
| karriere-uebersicht | Applicant ▸ Dashboard | keep |
| karriere-jobsuche | Applicant ▸ Job search | keep |
| karriere-bewerbungen | Applicant ▸ Applications | keep (canonical) |
| karriere-jobquellen | Applicant ▸ Settings ▸ Sources | demote |
| karriere-meine-stellen | Applicant ▸ Career | keep (verify meaning) |
| bewerber-my-applications | Applicant ▸ Applications | **cut** (duplicate) |
| bewerber-create-dossier | Applicant ▸ Documents ▸ New dossier | demote to task |
| cv | shared export artifact | not a nav screen |

---

## Cross-cutting principles (carry the design critique into the rebuild)

1. **One app-shell** for both apps (left rail on desktop → bottom tab bar / drawer
   on mobile). No more rail-vs-top-tabs split.
2. **Shared content lives once.** KPI strip = Dashboard only. One canonical
   `ApplicationRow`, one `KpiTile`, one match indicator.
3. **Disambiguate the "%".** A *match* score and a *progress/fill* score are
   different metrics — different visual tokens, never the same pill.
4. **Mono detox.** Monospace only for code, tech tags, IDs and currency. Labels,
   metadata and nav move to the humanist sans.
5. **Semantic status colors.** Neutral pipeline stages = blue/grey scale; success =
   green; warning = amber; danger = red **only** for real problems (rejection,
   overdue). No red for "in review".
6. **One language per session.** Full i18n audit — today DE/EN are mixed within
   single screens (e.g. Create-dossier, the applicant status pills).
7. **Fill the canvas deliberately.** Use a right-side **detail panel** for
   talent/application/job detail (already partly slide-overs) so list screens stop
   looking half-empty; otherwise constrain to a centered column.
8. **Per row, one hero signal.** Make the match-% the visually dominant element of
   an application/job row; demote the secondary metadata.

---

## Open questions to resolve before building

- **"Meine Stellen"** — is it work history (→ Career, keep) or saved jobs (→ Job
  search ▸ Saved tab)? Confirm.
- **Personas truly separate, or one account, two modes?** If a person can be both
  applicant and recruiter, decide single login + mode switch vs two products.
- **Settings surface** — currently none; Sources/account/language need a home.
- **Mobile scope** — is the applicant app mobile-first (likely) while Recruit stays
  desktop-first? That changes the shell.

## Suggested sequence (still concept → then build)

1. Lock this IA + the two sitemaps (this doc).
2. Low-fi wireframes of the ~12 surviving destinations (no styling).
3. Apply the cross-cutting principles to the design tokens/components.
4. *Only then* Phase 4: build the unified shell in Vite and port screens.
