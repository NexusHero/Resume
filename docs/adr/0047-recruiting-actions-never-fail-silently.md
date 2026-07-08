# ADR-0047 — Recruiting UI actions never fail silently; inputs are validated

- **Status:** Accepted
- **Requirements:** FR-17, FR-24, FR-44, NFR-05

## Context

Several recruiting actions failed in ways that looked like nothing happened, and
one input was stored without validation:

- **AI tailor** ("KI anpassen") in the document editor swallowed every error in
  an empty `catch`, so a failed suggestion (Pro gate, missing key, network) left
  the button apparently inert.
- **PDF export** opened the documents endpoint with `window.open()`, which is
  silently blocked under the app's strict CSP, the installed PWA and the
  Capacitor shell, so no file downloaded.
- **Placement fee** accepted any string (`fee: z.string()`), so free text like
  "lots" was stored as a monetary amount.
- **Placements could not be deleted** from the UI even though
  `DELETE /placements/:id` existed.

## Decision

Adopt two rules for recruiting UI actions and close the gaps:

1. **Never fail silently.** Every user-triggered action shows progress and, on
   failure, a visible error the recruiter can act on.
   - AI tailor surfaces the error (with a Retry) instead of discarding it.
   - PDF export **fetches the bytes and saves a file** (a download anchor that
     works across web/PWA/native), and shows an error if the render fails.
2. **Validate money at the boundary.** A placement `fee` must be empty or a
   monetary amount (currency symbol + digits + grouping) — enforced by a shared
   `moneyString` schema server-side and mirrored by the create-form modal.

Placement deletion is exposed: the edit modal gains a confirming **Delete**
action calling the existing `DELETE /placements/:id`.

## Consequences

- Actions communicate their outcome; a failure is explained rather than mistaken
  for a dead button — reinforcing the honesty stance (NFR-05).
- Placement fees are always parseable money, so fee sums and reports stay
  meaningful.
- The download path no longer depends on pop-up behaviour, so it is robust in the
  installed PWA and native wrapper (ADR-0028, ADR-0040).
