Rounded mono pill for a single metadata value — date range, location, salary, count.

```jsx
<MetaPill icon="calendar">2021 — heute</MetaPill>
<MetaPill icon="pin">Berlin</MetaPill>
<MetaPill icon="zap" tone="accent">92% Match</MetaPill>
```

- `icon` defaults to `calendar`; pass `null` for no icon.
- `tone`: `default` (sunk grey) or `accent` (tinted). Numerals are tabular.
