# ADR-0064 — English-only UI vocabulary

- **Status:** Accepted
- **Requirements:** FR-42 (document language — now defaults to `en`), FR-73 (UI vocabulary — English Begriffskarte)
- **Relates to:** ADR-0057 §Decision 3 (the German Begriffskarte; this ADR adds the "English" column), ADR-0052 (single-source document rendering), ADR-0063 (the AI-consent detail string)

## Context

ADR-0057 §Decision 3 fixed a German UI vocabulary — _Mandant_ (the applicant),
_Suchauftrag_ (the client assignment), _Stelle_ (the saved posting), _Bewerbung_
(Stelle × Mandant) — while the code, routes and tables keep their German-derived
names (`Talent`, `Mandate`, `JobPosting`, `JobApplication`, `/talents`,
`/mandates`). The UI, the server `problem+json` details, the document defaults and
the README were all still German.

The owner decided the product is **English-only**. The translation **is** the
change: every user-visible string becomes English, with no i18n infrastructure —
no `locale` field, no catalogues, no runtime switch. The terminology scanner
(which already deny-lists the pre-ADR-0057 code names) becomes the anti-regression
guard that fails if any German UI fragment returns.

Five owner decisions (OQ1–OQ5) resolve the remaining ambiguities:

- **OQ1** — the super-admin "Mandant" (the tenant) becomes **Workspace**, so the
  word "Mandant" disappears from the UI entirely (person → `Candidate`, tenant →
  `Workspace`); the scanner's super-admin exception is removed.
- **OQ2** — the CV section headings are **parameterised** (EN/DE via
  `detectLanguage`), not left hard-German.
- **OQ3** — agent texts (`chat-agent.ts summarizeRun`, the fake provider
  transcript) are **fixed English**; generated artifacts still follow the ad
  language (FR-42).
- **OQ4** — demo seed names become English-sounding (`Jamie Carter`,
  `Example Ltd.`); German detection is covered by dedicated `language.test.ts`
  cases, not by German-sounding seed data.
- **OQ5** — the previously-frozen agency/intermediary views are translated in the
  same pass; there is no German copy anywhere in the shipped bundle.

## Decision

1. **English-only UI.** All UI copy in the recruiting kit — nav, views, dialogs,
   ARIA labels, `title` hints — is English. No i18n library, no `locale` field on
   `WorkspaceSettings`/`User`, no catalogues, no feature flags (a flag for
   "English" would itself be i18n infrastructure, contradicting OQ-3).
2. **English Begriffskarte** (extends ADR-0057 §Decision 3, which keeps the code
   column):

   | German (before)               | Code (unchanged) | English          | Nav label      |
   | ----------------------------- | ---------------- | ---------------- | -------------- |
   | Mandant (the person)          | `Talent`         | **Candidate**    | "Candidates"   |
   | Suchauftrag                   | `Mandate`        | **Mandate**      | "Mandates"     |
   | Stelle                        | `JobPosting`     | **Job posting**  | "Jobs"         |
   | Bewerbung                     | `JobApplication` | **Application**  | "Applications" |
   | Vermittlung-Schalter          | `vermittlung`    | **Agency**       | "Agency"       |
   | Mandant (tenant, super-admin) | `Tenant`         | **Workspace**    | "Workspace"    |
   | (Bewerbungs-)Mappe            | —                | **Dossier**      | —              |
   | Anschreiben                   | —                | **Cover letter** | —              |
   | Lebenslauf                    | —                | **CV / résumé**  | —              |

   Status labels (`New/Review/Interview/Offer/Hired/Rejected`), dashboard KPIs
   (`Sent/Interview/Offer/Hired`, `Active mandates/Candidates in pool/Placements/
Fee`) and the imported-CV attachment name (`Original CV (import).pdf`) follow
   the same mapping.

3. **Server `problem+json` details are English**, and the AI-consent detail is
   **one** canonical string across all three sources — `errors.ts`
   (`AiConsentRequiredError`), `workspace-settings.ts`
   (`AI_CONSENT_REQUIRED_DETAIL`) and the client (`data.js` `AI_CONSENT_REQUIRED`):
   `AI processing has not been approved for this workspace yet.` Consent/freeze
   **detection** stays on `type`/`code` (never on the detail string); the
   byte-identity is pinned by a hygiene test, not a flow guard.
4. **Document default `en`.** `detectLanguage` fallbacks and the letter defaults
   (server `emptyLetter` + the editor's `Editor.jsx` defaults, byte-identical)
   are English. CV section headings follow `detectLanguage` (EN/DE). Document
   **content** still follows the ad language (FR-42) — a German ad produces a
   German document, unchanged.
5. **Agent texts fixed English.** `summarizeRun` and the `AGENT_FAKE` transcript
   are English; generated artifacts follow the ad language (FR-42).
6. **README + screenshots English**, re-captured from the English UI; demo seed
   names English-sounding.
7. **New documentation is English** (this ADR, changed `requirements.md`
   sections, the CHANGELOG entry). Existing German ADRs (0045–0063) and the
   German phase plans stay as historical decision records — a retrospective
   translation would be a reviewer-intensive diff with no product value.

## Consequences

- **Two vocabularies coexist, deliberately.** The UI is English while the code,
  routes and tables stay German-derived (`Talent`, `Mandate`, `/talents`,
  `/mandates`). The mapping lives here and in `docs/requirements.md` FR-73, and the
  terminology scanner guards the boundary: it collects only JSX text and string
  literals (never identifiers), so an accidental "translation" of a code key
  (`STAGE_LABELS.new`, route paths) is out of its reach and still caught by the
  existing key-stability tests.
- **Anti-regression guard.** The scanner's deny-list grows to the German UI word
  list plus an umlaut/eszett catch-all, and pins the English nav labels — a German
  fragment cannot return without turning the test red. The escape hatch
  (`terminology-allowlist.json`) stays for justified exceptions, each needing a
  PR rationale.
- **One consent string, three sources.** A single canonical English consent detail
  removes the prior AI/KI divergence between server and client; the byte-identity
  test prevents silent copy drift without changing the flow (which runs on
  `type`/`code`).
- **No i18n machinery to maintain.** The cost of "English-only" is a one-time
  translation pass; there is no runtime locale state, no catalogues, no new
  dependency. Reversal is a large but mechanical re-translation, not an
  architecture change.
- **Conscious non-changes (deliberately left German/untranslated).** Three things
  are **not** translated because they are either test data or format conventions,
  not UI copy: (1) the proper-noun mock names in the e2e specs (`Tobias Wirth`,
  `Nordwind Logistik AG`, `Helio GmbH`, `Hamburg · Remote`) are synthetic test
  data, not copy; (2) the existing German ADRs (0045–0063) and phase plans stay as
  historical decision records (a retrospective translation is out of scope); and
  (3) currency/number formatting (`€`/`T€`, the `de-DE` number locale) stays as a
  European convention, not part of the Begriffskarte. Everything else — including
  the dossier ZIP/PDF artifact names (`Application.pdf`,
  `Application_<Candidate>_<Company>.<ext>`) — is English.
