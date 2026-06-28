Underline tab bar with optional count pills.

```jsx
const tabs = [
  { id: 'all', label: 'Alle', count: 42 },
  { id: 'new', label: 'Neu', count: 6 },
  { id: 'interview', label: 'Interview' },
];
<Tabs tabs={tabs} value={tab} onChange={setTab} />
```

- Controlled — keep `value` in state. Active tab gets the accent underline + tinted count pill.
