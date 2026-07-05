# Contributing

Thanks for taking the time to contribute!

This project follows a [Code of Conduct](CODE_OF_CONDUCT.md) — by participating you are
expected to uphold it. Pull requests use the [PR template](.github/pull_request_template.md);
its checklist mirrors the quality gates below.

## Ways of working

- **We merge only via Pull Request — no direct pushes to `main`.** `main` is protected.
- One logical change per PR. For larger changes, open an issue first to discuss the approach.
- Every PR must be green on all CI checks and have its review threads resolved before merge.
- **Every task gets a GitHub issue, and every PR links it** (`Closes #123` in the PR
  description — see the [PR template](.github/pull_request_template.md)). This is what keeps the
  change history traceable after the fact; a PR with no linked issue is missing context a
  reviewer has no other way to recover.
- **Every technology choice or architecture decision gets an ADR, in the same PR.** If a change
  introduces or swaps a library/framework, changes a cross-cutting pattern (auth, data access,
  module boundaries, build/deploy shape), or reverses a prior ADR, it ships a new or updated file
  under [`docs/adr/`](docs/adr/README.md) alongside the code — not as a follow-up. Routine
  dependency bumps and plain bug fixes don't need one.

## Setup

```bash
npm install

# Install the git hooks (pre-commit runs format + lint + tests;
# commit-msg enforces Conventional Commits). One-time:
npm run hooks:install
```

Run the full local gate before opening a PR — this is exactly what CI runs:

```bash
./test.sh
```

## Branching & commits

```bash
git switch -c feat/short-description     # or fix/, docs/, chore/, refactor/, test/, ci/
# ... work, commit ...
git push -u origin feat/short-description
# open a PR against main
```

Commit messages follow [Conventional Commits](https://www.conventionalcommits.org) in English:

```
feat(api): add GET /api/v1/applications pagination
fix(render): wait for web fonts before printing the cover letter
docs(arc42): add system-context diagram
```

Types: `feat` · `fix` · `docs` · `test` · `refactor` · `chore` · `ci` · `build` · `perf` · `style` · `revert`

## Tests

New logic ships with tests. Name tests `Subject_StateUnderTest_ExpectedBehaviour` and follow
Arrange–Act–Assert. We aim for **≥ 90 %** coverage on core logic. The DATABASE_URL-gated SQL
integration tests run against Postgres in CI.

## Documentation

Architecture is documented with [arc42](https://arc42.org) in [`docs/architecture.md`](docs/architecture.md).
The modeling language is **UML**, authored in **PlantUML** under `docs/umls/` and rendered to `.svg`.
If you change a building block or a runtime flow, update the prose and re-render the affected diagram.

## Questions?

Open a [Discussion](https://github.com/NexusHero/Resume/discussions) or ask in the issue thread.
