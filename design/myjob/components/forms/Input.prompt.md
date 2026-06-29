Labelled text input with optional leading icon, hint and error.

```jsx
<Input label="E-Mail" icon="mail" type="email" placeholder="name@firma.de" />
<Input label="Titel" value={v} onChange={e => set(e.target.value)} hint="Wird im Inserat angezeigt" />
<Input label="PLZ" error="Pflichtfeld" />
```

- Whole thing is a `<label>` — clicking the label focuses the field.
- `error` overrides `hint` and turns the border red. Width: set `wrapStyle={{ width: … }}` or let it fill a grid cell.
