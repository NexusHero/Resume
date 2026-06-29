Thin progress / match-score bar.

```jsx
<ProgressBar value={92} tone="hired" label="Match" showValue />
<ProgressBar value={40} />
```

- `value` 0–100. `tone`: semantic (`accent`/`success`/`warning`/`danger`) or a pipeline-stage key (`new`/`review`/`interview`/`offer`/`hired`), or any CSS color.
- Set `label` + `showValue` to draw the mono caption row.
