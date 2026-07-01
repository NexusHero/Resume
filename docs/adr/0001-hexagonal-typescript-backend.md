# ADR-0001 — Hexagonal TypeScript backend

- **Status:** Accepted
- **Requirements:** NFR-01, NFR-02, NFR-03

## Context

The suite started as ad-hoc Node scripts. To grow it into a product — auth, multi-user
recruiting, AI features — we needed a codebase that stays testable and changeable as
surface area explodes, and that an AI pair-programmer can navigate safely.

## Decision

Rewrite the backend in **TypeScript (strict)** with a **hexagonal / ports-and-adapters**
architecture, strictly layered so dependencies point inward only:

```
domain (pure)  →  ports (interfaces)  →  services (business rules)  →  http (controllers/routes)
                                          ↑
                       adapters (fs / sql / puppeteer / llm) implement ports
```

- **Domain** holds types + zod schemas + invariants, no I/O.
- **Services** are the only place business rules live; they depend on ports, never on
  concrete adapters.
- **Adapters** implement the ports (filesystem, Postgres, Puppeteer, LLM providers).

## Consequences

- Tests substitute in-memory fakes for ports and never touch git, Chromium or a network.
- The ≥ 90 % coverage gate (NFR-01) is achievable because logic is isolated from I/O.
- More files/indirection than a flat app — justified by change-safety at this size.
- Type safety is enforced separately (`npm run typecheck`) from the transpile-only test
  runner, so both stay fast.
