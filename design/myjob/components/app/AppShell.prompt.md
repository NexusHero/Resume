**AppShell** — the one shell **both** products share. It ends the "left rail vs top tabs" inconsistency: there is now a single shell with two postures.

- **`posture="rail"`** (desktop-first, used by **myJob Recruit**): ink left rail + sticky topbar, with an optional right-side **`detail`** panel so a selected list row opens beside the list instead of leaving the page half-empty.
- **`posture="tabs"`** (mobile-first, used by **myJob**): the rail folds into a bottom tab bar (first 5 destinations); account + notifications move to the app bar.

```jsx
const recruitNav = [
  { id: 'overview', label: 'Overview', icon: 'home' },
  { id: 'mandate', label: 'Mandates', icon: 'briefcase' },
  { id: 'pool', label: 'Talent Pool', icon: 'users' },
  { id: 'pipeline', label: 'Pipeline', icon: 'columns' },
  { id: 'performance', label: 'Performance', icon: 'trend' },
  { id: 'inbox', label: 'Inbox', icon: 'inbox', badge: 3 },
];

<AppShell
  product="recruit" posture="rail"
  nav={recruitNav} active={view} onNav={setView}
  account={{ name: 'Suhay Sevinc', meta: 'Me · +3 Talente' }}
  title="Overview" subtitle="Dienstag, 27. Juni" search
  detail={<CandidateDetail … />}
>
  {screen}
</AppShell>
```

- **Settings is a utility, not a destination:** it lives at the rail foot above the account chip and reports via `onNav('__settings')`; the account chip reports `onNav('__account')`. Keep the 6 primary `nav` entries clean. (Job sources → Settings ▸ Sources.)
- Labels are humanist sans; mono is only the brand kicker and badge counts. No role toggle inside the shell — Recruit and myJob are separate builds that share this component, not one account with a mode switch.
- The logo is drawn inline (3-bar ascending mark), so the shell carries no asset-path dependency.
