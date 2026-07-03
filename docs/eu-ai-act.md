# myJob & the EU AI Act — a one-page compliance brief

> For prospects and their data-protection officers. myJob is a recruiting suite
> whose AI features are built to be **transparent, auditable and optional** —
> the properties the EU AI Act (Regulation (EU) 2024/1689) expects of AI used in
> employment. This brief maps what myJob does to those obligations. It is
> descriptive, not legal advice; your own deployment and use determine your
> obligations as provider/deployer.

## Why recruiting AI is in scope

AI systems "intended to be used for the recruitment or selection of natural
persons, in particular to place targeted job advertisements, to analyse and
filter job applications, and to evaluate candidates" are listed as **high-risk**
in Annex III of the Act. myJob's matching, ranking and screening features fall in
this area, which is exactly why the product was designed around evidence and
human control from the start.

## How myJob supports the obligations

| EU AI Act expectation (high-risk / transparency)                        | What myJob provides                                                                                                                                                                                                   | Where              |
| ----------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------ |
| **Human oversight** (Art. 14) — a person can review and override the AI | Every AI output is **staged for a recruiter to accept, edit or dismiss**; the CoRecruiter agent never sends anything outward on its own, and its top "autopilot" gear only _proposes_ a packet for one-click approval | ADR-0013, ADR-0019 |
| **Transparency & record-keeping / logging** (Art. 12, 13)               | A per-call **KI-Audit-Trail**: which model, for which feature, when, and at what token cost — exportable as CSV                                                                                                       | ADR-0018           |
| **Accuracy & robustness** (Art. 15)                                     | A deterministic **grounding self-check** flags any generated claim the candidate's CV and the job ad do not support, before a human acts on it                                                                        | ADR-0009           |
| **Graceful degradation / no silent dependence on a model**              | Every AI feature has a **deterministic template fallback**; the suite runs fully with **no LLM key at all**                                                                                                           | ADR-0005           |
| **Data governance** (Art. 10) & **GDPR** (Art. 5, 15, 17)               | **First-party data only** — no scraping of third-party profiles; DSGVO export, erasure, anonymisation and **automatic retention deadlines** are first-class flows                                                     | ADR-0006, ADR-0018 |
| **Data minimisation / locality**                                        | Matching runs on **local embeddings, fully offline**; fonts and UI assets are self-hosted, so no third-party request leaves the browser                                                                               | ADR-0017           |
| **Cost & processing transparency to the operator**                      | Each AI response shows its **token count and estimated cost**; settings aggregate spend per provider and per feature                                                                                                  | —                  |

## What this means in practice

- **Nothing is a black box.** For any AI-assisted decision, a recruiter can see
  which model produced it, what it cost, and which claims are unverified — and
  can override it before it has any effect.
- **The AI is assistive, not autonomous.** myJob stages suggestions; a human
  approves outcomes. Even the autopilot stops at "ready to send."
- **It works without AI.** Turning the AI off degrades to deterministic
  templates rather than breaking — useful for the most conservative buyers.

## Boundaries (what this brief is not)

This is a description of product capabilities that _support_ compliance, not a
certification. The Act assigns duties to the **provider** and the **deployer**
of a high-risk system; conformity assessment, a risk-management system,
instructions-for-use and post-market monitoring remain the responsibility of the
organisation deploying myJob. We are happy to support a customer's assessment
with the technical documentation referenced above.

_References: Regulation (EU) 2024/1689 (EU AI Act), Annex III(4); Arts. 9–15;
GDPR (EU) 2016/679. Internal design records: `docs/adr/`._
