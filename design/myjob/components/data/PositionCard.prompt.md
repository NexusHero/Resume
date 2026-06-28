**PositionCard** — the "Stelle" object. This is the entity the system was missing: a *trackable job posting* that the recruiter applies a candidate to. It holds the description, the skill requirements, and — crucially for the DACH market — **country and source as first-class fields**, so Swiss postings are modelled natively rather than bolted on.

```jsx
{/* a Swiss posting in the Stellen list */}
<PositionCard
  title="Senior Frontend Engineer"
  company="Helvetia Digital AG" location="Zürich" country="CH"
  source="jobs.ch" pensum="80–100%" salary="CHF 110–130k" posted="vor 2 Tagen"
  skills={['React', 'TypeScript', 'GraphQL']}
  onView={() => openDescription(job)}
/>

{/* the same posting matched against a candidate — the apply-on-behalf moment */}
<PositionCard
  title="Senior Frontend Engineer" company="Helvetia Digital AG"
  location="Zürich" country="CH" source="jobs.ch" pensum="80–100%"
  match={88}
  skills={[{name:'React',met:true},{name:'TypeScript',met:true},{name:'GraphQL',met:false}]}
  applyLabel="Suhay bewerben"
  onApply={() => applyOnBehalf(candidate, job)}
  onView={() => openDescription(job)}
/>
```

- **Country + source are not decoration — they're the DACH model.** `country` drives the flag chip (🇩🇪 🇨🇭 🇦🇹); `source` names the board (jobs.ch / jobup.ch / job-room.ch / LinkedIn). Without these two fields there is no Swiss market — that was the gap.
- **Two contexts, one component.** Plain = a posting (shows `status` if it has an application). Matched = pass `match` + per-skill `met`: a `MatchIndicator` chip appears, skills show ✓ / gap, and the primary action becomes "**\<Name\> bewerben**" — the recruiter applying on the candidate's behalf.
- Mono carries the data signals only (source, Pensum, salary, posted via `MetaPill`); the title is the display-font hero. Salary uses the `accent` MetaPill tone — it's the figure recruiters scan for.
- Pair the matched variant with `MatchIndicator` (the radial fit signal) — same accent language, so "fit" reads consistently between the candidate and the position.
