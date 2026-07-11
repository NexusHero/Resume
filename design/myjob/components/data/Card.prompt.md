The base surface container — white sheet, hairline border, soft shadow.

```jsx
<Card title="Aktive Mandate" subtitle in="6 offen" action={<Button size="sm" variant="outline">Alle</Button>}>
  …
</Card>

<Card pad={false}>{rows}</Card>   {/* flush body for lists/tables */}
```

- Header renders only if `title` or `action` is set.
- `pad={false}` removes body padding (use for `CandidateRow` lists).
