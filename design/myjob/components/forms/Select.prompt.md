Styled native select with a custom chevron.

```jsx
<Select label="Status" value={s} onChange={e => set(e.target.value)}
  options={[{ value: 'new', label: 'Neu' }, { value: 'review', label: 'Sichtung' }]} />
<Select label="Standort" options={['Berlin', 'München', 'Remote']} />
```

- `options` accepts plain strings or `{value,label}`. It's a real `<select>` — fully keyboard/native.
