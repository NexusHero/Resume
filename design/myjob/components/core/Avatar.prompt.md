Candidate / user avatar. Initials are drawn behind the photo, so a missing or broken `src` still reads as a person.

```jsx
<Avatar name="Suhay Sevinc" src="assets/img/suhay-photo-sm.jpg" size="md" />
<Avatar name="Lena Bauer" size="sm" ring />
<Avatar name="Suhay Sevinc" size={120} radius="var(--radius-lg)" />  {/* square doc portrait */}
```

- `size`: `xs` 24 · `sm` 32 · `md` 40 · `lg` 56 · `xl` 72, or any pixel number.
- `ring` adds an accent focus ring (used for "me" in the nav).
