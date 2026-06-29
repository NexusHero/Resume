The pipeline-stage chip — the signature status indicator of the recruiting product. Dot + soft fill, German labels baked in.

```jsx
<StatusBadge status="interview" />        {/* → "Interview" */}
<StatusBadge status="hired" size="sm" />  {/* → "Eingestellt" */}
<StatusBadge status="review" dot={false} label="In Prüfung" />
```

- Stages: `new` Neu · `review` Sichtung · `interview` Interview · `offer` Angebot · `hired` Eingestellt · `rejected` Absage.
- Each stage owns a fixed status color in every accent theme. Import `STAGES` for Kanban column headers and dots.
