# Security Policy

## Supported versions

This project follows a rolling-release model: only the latest release on `main`
receives security fixes.

| Version         | Supported          |
| --------------- | ------------------ |
| latest (`main`) | :white_check_mark: |
| older tags      | :x:                |

## Reporting a vulnerability

Please **do not** open a public issue for security problems.

Report privately via a
[GitHub Security Advisory](https://github.com/NexusHero/Resume/security/advisories/new).
You can expect an acknowledgement within **72 hours** and a status update within
**7 days**. Once a fix is available we will coordinate a disclosure timeline with you.

## Scope & notes

- The REST API ships **without authentication by design** — it is intended to run
  locally / within a trusted personal domain. Do not expose it directly to the
  public internet without putting your own authentication and rate limiting in front of it.
- Never commit API keys, tokens, or personal data. `.env` files are git-ignored.
