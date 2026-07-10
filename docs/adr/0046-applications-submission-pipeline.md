# ADR-0046 — Applications pipeline wired to the board; apply from Matching

- **Status:** Accepted
- **Requirements:** FR-15, FR-16

## Context

The recruiting backend has always had an applications resource
(`GET/POST /api/v1/applications`, `ApplicationService`, `ApplicationRepository`),
but the recruiting workspace never used it: `app.jsx` hard-coded `const apps = []`,
so clicking **Applications** always showed an empty board. Separately, the
**Matching** view could rank live postings for a candidate and draft a client
mandate from one, but there was no way to actually **apply a candidate to a
role** — the view's own subtitle ("apply on a candidate's behalf") was
unimplemented. Recruiters expected a "+" action that submits the candidate and
carries the posting's company details into the application.

## Decision

Wire the existing applications resource into the workspace and add the
apply-from-Matching action:

- The workspace loads applications from `GET /api/v1/applications` (via
  `useResource`) and renders them on the **PipelineBoard**, mapping the domain
  statuses (`sent`/`screening`/…) onto the board's stage columns. The board
  tolerates an application whose candidate has left the pool, falling back to the
  name captured on the record.
- The `Application` domain gains optional **talent linkage**
  (`talentId`, `talentName`), persisted by both the file and SQL repositories, so
  an application knows which candidate it was filed for.
- Matching gains a per-posting **"Apply {candidate}"** button. It calls
  `POST /applications` with the posting's `company` and `position` and the
  selected candidate's linkage (`source: 'matching'`), then refreshes the board.
  The company/role details are captured on the submission; the recruiter then
  generates the tailored Bewerbungsmappe for that company through the existing
  dossier flow (`/talents/:id/dossier/pdf`, which addresses the cover letter to
  the chosen company).

## Consequences

- Applications is a working pipeline: submissions from Matching appear on the
  board, tied to the candidate they were filed for.
- Full cover-letter tailoring at apply-time is intentionally **not** bundled
  here — the application captures the company/role, and the established dossier
  flow renders the addressed cover letter — keeping this change additive and
  avoiding overwriting a candidate's stored letter.
- Applications remain instance-wide (not team-scoped) as they were; scoping them
  like the other recruiting records (ADR-0010) is a follow-up.
