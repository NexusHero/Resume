# ADR-0051 — NestJS for composition + HTTP (Awilix and hand-built Express app retired)

- **Status:** Accepted
- **Supersedes:** ADR-0002 (Awilix DI composition root)
- **Relates to:** ADR-0001 (hexagonal core), ADR-0042 (server ESM/NodeNext), ADR-0012 (zod boundary + RFC-9457), ADR-0043 (Better-Auth engine)

## Context

The backend used **Awilix** as its IoC container (ADR-0002) with a single
hand-written `container.ts` (111 registrations) and a hand-built Express
composition in `http/create-app.ts` (101 routes wired by hand). This works and is
fully DI'd, but the wiring is bespoke: new engineers have to learn our container
and route-wiring conventions rather than a framework they already know, and we
re-implement — as one-off middleware — things a mainstream framework gives for
free (guards, pipes, exception filters, health, throttling, OpenAPI generation).

The team chose to adopt **NestJS** for a conventional, onboardable structure and
its ecosystem. The decision is a **big-bang cutover** (no permanent Express/Nest
coexistence) that **keeps the hexagonal core**: the domain, the 42 ports, the 90
adapters, **zod** validation and **Drizzle**/fs stores are framework-agnostic and
stay. NestJS replaces only the **composition root** and the **HTTP layer**.

The material risk was **ESM**: the server is native ESM/NodeNext (ADR-0042) and
Nest relies on `reflect-metadata` + decorator metadata, which `esbuild`/`tsx` does
**not** emit. A spike proved the path end-to-end (a Nest app booting under ESM,
resolving both a concrete provider and an interface-via-token) once the runtime
emits decorator metadata.

## Decision

- **Adopt NestJS 11** (`@nestjs/platform-express`, atop the existing Express 5)
  for the composition root and HTTP layer. Retire `container.ts` and
  `http/create-app.ts`.
- **Keep the hexagonal core unchanged.** Domain, ports, adapters, zod and Drizzle
  stay. Because ports are runtime-erased TS interfaces, each becomes a Nest
  **injection token** (`Symbol`), bound in a module with `{ provide: TOKEN,
useClass: … }` and consumed via `@Inject(TOKEN)`. Services keep their
  constructor-injection shape.
- **Boundary primitives map to Nest:** zod validation via a `ZodValidationPipe`
  (we keep zod, not class-validator); RFC-9457 `problem+json` via a global
  exception filter; authentication (Better-Auth, ADR-0043) via a guard;
  team-scope via a param decorator; per-user AI rate limiting via a guard/module.
- **Runtime emits decorator metadata on every path:** dev runs under
  **`@swc-node/register`** (SWC, ESM, `decoratorMetadata: true`); prod builds with
  the Nest/tsc compiler and runs the compiled JS; tests run under `ts-jest`
  (which emits metadata). `tsx` is dropped for the server entrypoint.

## Consequences

- Structure and ergonomics become mainstream: `@Module`/`@Controller`/`@Injectable`,
  guards, pipes, interceptors and exception filters replace bespoke middleware and
  the hand-built container — lower onboarding cost, richer ecosystem (Swagger gen,
  Throttler, Terminus health) available behind the same ports.
- One-time cost is large and touches every HTTP entrypoint: 27 controllers / 101
  routes re-decorated, 42 ports tokenized, ~84 test files rewired (unit tests that
  construct services directly are unaffected; acceptance/integration move to
  `Test.createTestingModule`).
- `experimentalDecorators` + `emitDecoratorMetadata` are enabled and the server no
  longer runs under `tsx`. The hexagonal boundary means the domain/adapters are
  unaffected and remain testable in isolation — the framework stays at the edge.
- ADR-0002 is superseded; ADR-0042 (ESM) is preserved — the SWC/tsc runtime is how
  ESM and Nest's metadata coexist.
