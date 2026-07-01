# ADR-0002 — Awilix DI with a single composition root

- **Status:** Accepted
- **Relates to:** ADR-0001

## Context

Hexagonal code needs a place that wires ports to adapters. We wanted dependency
injection without decorators / `reflect-metadata` (which couple domain code to a DI
framework and complicate the TypeScript build).

## Decision

Use **Awilix** in `PROXY` injection mode. Dependencies are declared as destructured
constructor parameters and resolved **by name**. There is exactly one composition root,
`server/src/container.ts`, that registers every port implementation.

## Consequences

- Domain and service code stays framework-free — a class just names what it needs.
- **Registration discipline is load-bearing:** a new dependency must be registered in
  `container.ts` (not only in a persistence factory), or the real server fails at boot
  with `AwilixResolutionError`. Unit tests pass regardless because they build their own
  container, so this class of error only surfaces in the e2e boot — treat `container.ts`
  as part of "done" for any new port.
- `container.ts` imports ESM-only adapters (e.g. Puppeteer) and is therefore excluded
  from the Jest transform; verify wiring via the e2e boot, not a unit test.
