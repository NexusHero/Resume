Dashboard KPI tile — big display number with a mono label, optional delta trend and accent icon.

```jsx
<StatCard label="Aktive Mandate" value="18" delta="+3" dir="up" icon="briefcase" />
<StatCard label="Absagequote" value="24%" delta="-2%" dir="down" icon="trend" />
```

- `dir="up"` colors the delta green, `"down"` red.
- Lay several in a `display:grid` row for a KPI strip.
