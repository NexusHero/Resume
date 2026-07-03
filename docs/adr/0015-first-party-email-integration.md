# ADR-0015 — First-party email integration (send + envelope-only reply detection)

- **Status:** Accepted
- **Relates to:** ADR-0006, ADR-0014

## Context

The outcome loop (ADR-0014) captures what became of every generated outreach —
but in v1 the recruiter had to stamp `replied` by hand, and the drafted email
still left the app via copy-paste or a `mailto:` hand-off. Both gaps sit on
the same channel: email. Closing them makes the loop self-feeding, which is
the whole point of collecting outcomes.

## Decision

Own the email leg end to end, with the lightest possible footprint:

- **Sending** reuses the existing `Mailer` port (console in dev, SMTP in
  production): `POST /talents/:id/outreach/send` delivers the drafted subject
  and body to the talent's stored address. No new transport, no address
  guessing — a talent without an email gets a 400, not a heuristic.
- **Reply detection** is a new `InboxSource` port with an IMAP adapter
  (imapflow), enabled iff `MAIL_IMAP_HOST` is set. The server polls on a
  schedule (`MAIL_IMAP_POLL_MINUTES`, default 15) and a manual
  `POST /mail/sync-replies` exists for the impatient. A pending email
  outreach flips to `replied` when a message from the talent's address
  arrives after the outreach was generated; the earliest such message
  provides `outcomeAt`.
- **Envelopes only.** Reply matching reads sender, date and subject — message
  bodies never enter the application. This keeps the DSGVO surface flat
  (no stored correspondence, nothing new to erase) and mirrors the outcome
  log's "the fate matters, not the text" rule.
- **Pure matching, thin adapter.** The matcher (`domain/mail-sync`) is pure
  and fully unit-tested; the IMAP adapter contains no logic beyond fetching
  and is exercised by deployment rather than unit-covered — the same split
  as the LLM and job-board adapters.

## Consequences

- The loop closes without manual stamping for the email channel; LinkedIn
  outreach still needs the one-click stamp (no API worth polling).
- Sender matching is by address: a talent replying from a different address
  is not detected and stays `pending` — the honest default, since `no-reply`
  is only ever stamped by a human.
- The server holds mailbox credentials; deployments that don't want that
  simply leave `MAIL_IMAP_*` unset and keep manual stamping.
- Polling day-granular IMAP `SINCE` over-fetches slightly; the exact-time
  re-filter happens in the pure domain, which also makes the cutoff testable.
