The primary action control — mono uppercase-feel label on a pill, the brand's engineering signature. Use exactly one `primary` per view.

```jsx
<Button variant="primary" iconLeft={<Icon name="plus" size={15} />}>Stelle anlegen</Button>
<Button variant="outline" size="sm">Filter</Button>
<Button variant="ink">Mappe erstellen</Button>
```

- `variant`: `primary` (accent fill, one per view) · `ink` (dark, strong secondary) · `outline` (secondary) · `ghost` (tertiary) · `danger` (destructive).
- `size`: `sm` / `md` / `lg`. `block` stretches full width.
- Hover lifts 1px + shadow automatically. Pass `iconLeft`/`iconRight` as `<Icon/>`.
