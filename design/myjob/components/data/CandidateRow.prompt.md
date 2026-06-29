The signature list row of the recruiting product — one applicant per line. Composes `Avatar` + `StatusBadge`.

```jsx
<CandidateRow
  name="Lena Bauer" role="Senior Frontend Engineer"
  position="React Engineer · Acme" score={92} status="interview"
  when="vor 2 Std" selected={id === active} onClick={() => open(id)} />
```

- Five-column grid: identity · position · score · status · time. Drop several inside a `Card pad={false}`.
- `score ≥ 80` turns green. `selected` paints an accent fill + left bar.
