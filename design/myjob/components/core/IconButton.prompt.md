Square icon-only button for toolbars and row actions. Always pass `label` (tooltip + a11y name).

```jsx
<IconButton icon="bell" label="Benachrichtigungen" variant="outline" />
<IconButton icon="more" label="Mehr" variant="ghost" size="sm" />
<IconButton icon="settings" label="Einstellungen" variant="glass" />  {/* on the dark shell */}
```

- `variant`: `outline` (default, light toolbars) · `ghost` · `ink` · `glass` (dark sidebar/topbar) · `accent`.
- `size`: `sm` (30px) / `md` (36px) / `lg` (44px).
