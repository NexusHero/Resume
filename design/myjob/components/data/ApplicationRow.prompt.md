**ApplicationRow** — the canonical "one application" row for the applicant app (**myJob ▸ Bewerbungen**). It replaces three near-identical lists: karriere's rich `Bewerbungen`, bewerber's weaker `My applications`, and the dashboard summary. Shared content, one home.

```jsx
<ApplicationRow
  position="Senior Product Designer"
  company="Aurora Systems GmbH"
  location="München"
  appId="BEW-1042"
  match={88}
  status="interview"
  when="vor 2 Tagen"
  onClick={() => openDetail(app)}
  selected={selectedId === app.id}
/>
```

- **One hero signal per row:** the *position* in the display font. Company + location are humanist sans; mono is reserved for the `appId`, the match %, and the timestamp — the mono-detox, applied.
- The match score is a `MatchIndicator` **chip** (radial language) — never a bar, so it can't be read as mandate fill.
- A company gets a **rounded-square initials tile**, not a circular `Avatar` (imagery is people-only; a company is not a person). Pass `logo` for a real mark.
- `selected` draws the accent fill + 3px left bar — wire it to a **right-side detail panel** so the list is never a half-empty page.
- The recruiter equivalent is `CandidateRow` (candidate-centric). Use ApplicationRow on the applicant side.
