# Navigation taxonomy (#201)

A short rationale for how the recruiting rail groups its destinations. Not an ADR
(no architecture changes) — the routing `id`s are unchanged; only the labels and
grouping express the taxonomy. Lives next to `RecruitRail.jsx`.

## Sections

| Section       | Items                                                        |
| ------------- | ------------------------------------------------------------ |
| **Work**      | Workspace · Mandates · **Matching** · Applications · Placements |
| **People**    | Talent Pool                                                  |
| **Insights**  | Reports                                                      |
| **Assistant** | CoRecruiter                                                  |

## Why

- **Matching moved from PEOPLE → WORK.** It read oddly under PEOPLE: Matching is
  not a way to browse people, it's an **action on the work** — "fill this
  role" — whose output is an application. Placed between **Mandates** and
  **Applications** it completes the funnel the recruiter actually walks:
  Workspace (overview) → Mandates (the roles) → Matching (find fits) →
  Applications (submissions) → Placements (won). Object-vs-action was the tell:
  the other WORK items are things you act on; Talent Pool is the roster you
  browse. Matching is an act, so it belongs with the work.
- **PEOPLE = Talent Pool only.** A single-item section is fine — it names the one
  place you manage the roster you represent. Keeping Matching out of it removes
  the "why is a role-finder under People?" double-take.
- **AI → Assistant.** "AI" labelled a *category*, not a *place*; nav sections
  should name where you're going. **Assistant** is the surface; the product name
  **CoRecruiter** stays on the item.

## Constraints kept

- English throughout; the mono uppercase section-label styling is unchanged.
- Routing `id`s (`uebersicht`, `mandate`, `matching`, `bewerbungen`,
  `platzierungen`, `pool`, `berichte`, `assistant`) are **stable** — `app.jsx`
  keys off them, so relabelling/regrouping can't break routing or state.
