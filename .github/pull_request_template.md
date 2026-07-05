<!--
Thanks for contributing to the Résumé / myJob suite!
Keep the PR focused — one logical change per PR. Fill in the sections below.
-->

## Summary

<!-- What does this PR do, and why? Link the issue it closes. -->

Closes #

## Type of change

<!-- Tick all that apply. Matches the Conventional Commit type used in your commits. -->

- [ ] `feat` — new feature
- [ ] `fix` — bug fix
- [ ] `docs` — documentation only
- [ ] `test` — adding or fixing tests
- [ ] `refactor` — no behaviour change
- [ ] `chore` / `ci` / `build` — tooling, deps, pipeline

## How was this tested?

<!-- Commands run, scenarios covered, manual verification. -->

## Checklist

- [ ] `./test.sh` passes locally (format check + lint + tests)
- [ ] New logic is covered by at least one test
- [ ] Commits follow [Conventional Commits](https://www.conventionalcommits.org) in English — `type(scope): summary`
- [ ] New tests use the `Subject_StateUnderTest_ExpectedBehaviour` naming convention (AAA structure)
- [ ] TypeScript compiles (`npm run typecheck`) with no new `any`; no API keys or personal data committed
- [ ] Every source file the change depends on is committed — `git status` shows no needed file untracked
- [ ] Docs updated where behaviour, a building block, or a runtime flow changed (`docs/architecture.md` + the relevant `docs/umls/*.puml` re-rendered to `.svg`)
- [ ] `Closes #` above links a real issue — every PR traces back to one (see [CONTRIBUTING.md](../CONTRIBUTING.md#ways-of-working))
- [ ] If this PR introduces/swaps a technology or changes a cross-cutting architecture pattern, it ships a new or updated [ADR](../docs/adr/README.md) — otherwise N/A
- [ ] I have read and agree to abide by the [Code of Conduct](../CODE_OF_CONDUCT.md)

## Quality gates (required for merge)

> All CI checks must be green — none skipped, none red: `verify — Node.js`, `commit messages`,
> CodeQL, and the security workflow. The branch must be up to date with the base branch with no
> merge conflicts, and all review threads resolved. We merge **only via PR** — no direct pushes.
