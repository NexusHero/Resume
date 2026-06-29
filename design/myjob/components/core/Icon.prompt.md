One line-icon system for the whole product — 24×24 Feather-style strokes, inherits `currentColor`.

```jsx
<Icon name="briefcase" size={18} />
<span style={{ color: 'var(--accent)' }}><Icon name="award" size={20} /></span>
```

- `name` — pick from `ICON_NAMES` (exported alongside). Common: `home`, `briefcase`, `users`, `columns`, `award`, `inbox`, `search`, `bell`, `chevronRight`, `plus`, `check`, `clock`, `trend`.
- Color is inherited (`stroke: currentColor`) — set `color` on the icon or a wrapper.
- `size` defaults to 16; `strokeWidth` to 1.8. Bump strokeWidth to ~2.4 for tiny check/chevron glyphs.
