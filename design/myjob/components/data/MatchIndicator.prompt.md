**MatchIndicator** — the candidate-FIT signal, and the one thing the brand truly owns. Radial on purpose: it must never be mistaken for the linear neutral `ProgressBar` that shows mandate *fill / completion*. Match rides the accent; progress stays slate.

```jsx
{/* list row — compact pill, one hero signal per row */}
<MatchIndicator value={88} variant="chip" />

{/* profile / detail panel — dial + two-tier breakdown */}
<MatchIndicator
  value={74}
  tiers={[
    { label: 'Pflicht-Skills', value: 9, max: 10 },
    { label: 'Bonus-Skills',   value: 3, max: 6 },
  ]}
/>
```

- **Match vs progress is a shape rule:** ring + accent = *how well someone fits*; bar + slate (`ProgressBar`) = *how far something is*. Never the same form for both.
- The two tiers carry meaning: Pflicht-Skills (must-haves) in `--match`, Bonus-Skills in the lighter `--match-bonus`. A `9/10 · 3/6` breakdown explains a score a bare `74%` can't.
- `chip` is the only variant that belongs in a dense list. Use `ring` in detail panels and profiles; `bare` where space is tight.
- The number is mono + tabular; everything else (label) is the humanist sans.
