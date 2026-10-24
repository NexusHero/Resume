# Phase 6 — Vorzeigbar: Goldener Pfad, Klick-Audit, KI-Einwilligung, Live-Demo (Implementierungsplan)

Issue #328 · Branch wird vom Orchestrator neu von `origin/main` gestartet · Entscheidung: [ADR-0063](../adr/0063-ki-einwilligung-consent-gate.md) · Rahmen: [Orchestrierungs-Prompt](bewerbungsservice-orchestration-prompt.md) (Phase 6, AK-6.1 bis AK-6.7)

Stand: Plan (G1). Es gibt noch keinen Code und keine Tests. Alle Pfade sind relativ zur Repo-Wurzel; `UI/` steht für `design/myjob/ui_kits/recruiting/`.

---

## 1. Ziel und Nicht-Ziele

### 1.1 Ziel

Phase 6 macht den Bewerbungs-Hauptweg **vorzeigbar** — auf einer echten Instanz,
ohne tote Buttons, ohne Konsolen-Fehler, mit nachweisbarer Einwilligung vor der
ersten KI-Übermittlung. Konkret:

1. **Goldener Pfad als automatisiertes e2e** (AK-6.1, §5): der vollständige
   Ablauf aus §1.8 (Mandant anlegen + CV hochladen → Stelle übernehmen/einfügen →
   Bewerbung erstellen → KI-Anschreiben → CV per Magic Pen → Mappe laden → Status
   „versendet") als **ein** Playwright-Flow, LLM **gemockt**, auf **Desktop und
   Mobil (393 px)**. Zusätzlich eine **Agent-Variante**: eine skriptete
   Tool-Loop/SSE erzeugt denselben Endzustand (einen `draft`-Entwurf).
2. **Tote-Buttons-Audit als automatisierter Test** (AK-6.2, §4): ein
   Playwright-Lauf enumeriert **jede** erreichbare Ansicht (Vermittlung **aus**)
   und prüft für jeden sichtbaren Button/`[role=button]`: entweder eine sichtbare
   Wirkung (Navigation, Dialog, Toast, Statusänderung, Download/Fetch) **oder**
   `disabled` mit `title`/`aria-label`-Begründung. Keine Konsolen-Fehler, keine
   Axe-Verstöße.
3. **Datenschutz-Hinweis/Einwilligung** (AK, §3, ADR-0063): vor der **ersten**
   KI-Übermittlung zeigt die UI einen deutschen, EU-AI-Act-konformen
   Einwilligungs-Dialog; die Einwilligung wird als `WorkspaceSettings.aiConsent`
   persistiert (fs + sql) und serverseitig per 403 `ai-consent-required` erzwungen.
4. **Demo-Workspace-Seeding** (AK-6.6, §6): ein idempotentes Skript
   (`npm run seed:demo`) legt einen Demo-Mandanten, eine Demo-Stelle und eine
   Demo-Bewerbung aus **synthetischen** Daten an (kein echtes PII).
5. **Live-Instanz-Vorbereitung** (AK-6.5/6.7, §7): eine Deployment-Checkliste
   (ENV-Set, `STORE=sql`, `APP_SECRET`, `NODE_ENV=production`, echter KI-Key) plus
   ein README-Abschnitt „Vorzeigbar in 10 Minuten" und ein <5-Minuten-Live-Protokoll.
6. **Qualitätshürden** (AK-6.4): Lighthouse (Desktop) ≥ 90 für Performance,
   Accessibility und Best Practices auf den Hauptansichten, gemessen und im PR
   dokumentiert.

### 1.2 Nicht-Ziele

- **Keine neue Produktfunktion.** Es entsteht keine neue Entität, kein neuer
  Schreibpfad des Hauptwegs, keine neue KI-Route (`AI_ROUTES` bleibt bei **19**,
  K01–K19). Phase 6 ist Abschluss-/Qualitätsarbeit auf Phase 0–5.
- **Keine Vermittler-Features.** `MandateService`, `CandidacyService`,
  `AutopilotService`, `MatchAiService.explainMatch`, `MailService`,
  `AssistantService`, `PipelineBoard` und ADR-0013/0019 bleiben **eingefroren**.
  Der Audit läuft ausdrücklich mit `vermittlung: false` und prüft **nur** die
  Hauptweg-Ansichten.
- **Kein Umbau des `LlmProvider`/`AgentLlmProvider`.** Die Mocking-Strategie
  (Playwright `page.route` an der HTTP-Grenze, Muster Phase 5) und der bestehende
  Dev-`FakeAgentLlmProvider` (ADR-0062 §3.6) werden **wiederverwendet**, nicht
  erweitert.
- **Kein Grandfathering der Einwilligung** (ADR-0063 §Decision 1): bestehende
  Workspaces erben `aiConsent: false`. Kein automatischer Backfill.
- **Keine Änderung der Coverage-Schwellen** (Jest ≥ 90 %), kein Big-Bang-Rename,
  keine echten Personendaten/Secrets im Diff (Repo-Regel §4).

---

## 2. Betroffene Dateien/Module

Legende: **neu**, **ändern**, **prüfen**. `scope` = `ownerId` (ADR-0010/0033). `UI/`
= `design/myjob/ui_kits/recruiting/`.

### 2.1 Domain (`server/src/domain/`)

| Datei                   | Aktion | Inhalt                                                                                                                                                                                                                                                                                            |
| ----------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `workspace-settings.ts` | ändern | Interface `aiConsent: boolean`; `DEFAULT_WORKSPACE_SETTINGS` um `aiConsent: false`; `updateWorkspaceSettingsSchema` um `aiConsent: z.boolean().optional()`; Konstante `AI_CONSENT_REQUIRED_DETAIL = 'AI-Verarbeitung wurde für diesen Workspace noch nicht freigegeben.'`. Keine neue Store-Datei. |
| `errors.ts`             | ändern | `AiConsentRequiredError extends DomainError` (`status = 403`, `type = 'ai-consent-required'`, Name `AiConsentRequired`); `mapErrorToProblem` behandelt `DomainError` generisch → **kein** Filter-Change (Muster `FrozenError`).                                                                    |
| `usage.ts`              | prüfen | **Kein** neues `UsageFeature` (Phase 6 erzeugt keine KI-Route).                                                                                                                                                                                                                                   |

### 2.2 Ports (`server/src/ports/`)

| Datei                          | Aktion | Inhalt                                                                                                                                                              |
| ------------------------------ | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `workspace-settings-store.ts`  | prüfen | **Unverändert** — die Schnittstelle ist generisch über `WorkspaceSettings`; das neue Feld reist im bestehenden Shape mit.                                           |

### 2.3 Services (`server/src/services/`, decorator-frei)

| Datei                            | Aktion  | Inhalt                                                                                                                                                                                                                                                                                                                                                                                   |
| -------------------------------- | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `workspace-settings-service.ts`  | ändern  | `isAiConsentGranted(scope): Promise<boolean>` (liest `get(scope).aiConsent`); `grantAiConsent`/`revokeAiConsent` sind reine `update`-Wrapper (fakultativ).                                                                                                                                                                                                                             |
| `talent-parse-service.ts` (o. ä. Parse-Pfad, T01–T03) | ändern | **Konditionale** Consent-Prüfung (ADR-0063 §Decision 4): vor dem AI-Modus (`mode: 'ai'`, d. h. `llm.hasAvailableProvider()`) prüft der Service `isAiConsentGranted(scope)`; ohne Consent → `AiConsentRequiredError` (403); ohne Key läuft die Text-Übernahme unverändert (keine Übermittlung). Exakter Dateiname beim Umsetzen gegen den bestehenden Parse-Service (Muster `parse-document`-Pfad) verifizieren. |

### 2.4 Adapter (`server/src/adapters/`)

| Datei                          | Aktion | Inhalt                                                                                                                                                          |
| ------------------------------ | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `fs-workspace-settings-store.ts` | prüfen | **Unverändert** (JSON-Objekt keyed by owner; `aiConsent` ist ein weiteres Feld).                                                                                |
| `sql/sql-workspace-settings-store.ts` | prüfen | **Unverändert** (`settings`-`jsonb` trägt das ganze `WorkspaceSettings`-Shape).                                                                                |
| `sql/schema.ts` / `db.ts`      | prüfen | **Keine DDL** (ADR-0063: kein neues Feld in einer Spalte, nur im `settings`-Objekt).                                                                           |

### 2.5 Nest (`server/src/nest/`)

| Datei                                    | Aktion | Inhalt                                                                                                                                                                                                                                                                                                                                                                             |
| ---------------------------------------- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ai-consent.guard.ts`                    | **neu** | `REQUIRES_AI_CONSENT = 'requires:ai-consent'`; `RequiresAiConsent = () => SetMetadata(…)`; `AiConsentGuard` (Reflector + `WORKSPACE_SETTINGS_SERVICE`), liest `currentScope(req)`, wirft `AiConsentRequiredError` ohne Consent (Muster `VermittlungGuard`).                                                                                                                          |
| `workspace/workspace.module.ts`          | ändern  | `GET`/`PATCH /settings/workspace` reichen `aiConsent` durch (Schema erweitert, Rolle unverändert admin-only via Role-Authorizer); Log-Zeile um `aiConsent` ergänzen.                                                                                                                                                                                                               |
| KI-Controller (5–6 Dateien, s. u.)       | ändern  | `@RequiresAiConsent()` **zusätzlich** zu `@RequiresAi()` auf jeder generativen Methode; `AiConsentGuard` in die Klassen-`@UseGuards`-Kette **hinter** `AiConfiguredGuard`. Dateien: `ai/documents-ai.controller.ts` (K01–K05), `match-ai/match-ai.module.ts` (K06–K08), `llm/llm.module.ts` (K09), `job-postings/job-postings.module.ts` (K12), `job-applications/job-applications.module.ts` (K13–K18), `agent/agent.module.ts` (K19). |
| `app.module.ts`                          | ändern  | `AiConsentGuard` global als Provider registrieren (kein Modul nötig; Muster `AiConfiguredGuard`).                                                                                                                                                                                                                                                                                  |

### 2.6 OpenAPI und Frontend

| Datei                                                    | Aktion | Inhalt                                                                                                                                                                                                                                                                                                                                                                                      |
| -------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `server/openapi.yaml`                                    | ändern | `WorkspaceSettings`-Schema um `aiConsent`; Fehler-Komponente `AiConsentRequired` (403) an den generativen Routen.                                                                                                                                                                                                                                                                            |
| `server/__tests__/unit/openapi-contract.test.ts`         | ändern | Drift-Wächter für `aiConsent` + 403-Komponente (§8).                                                                                                                                                                                                                                                                                                                                         |
| `UI/workspace-settings.js`                               | ändern | Store trägt zusätzlich `aiConsent` (Default `false` bei `unknown`/`error`), `refresh`/`set` mappen das Feld; `get()`/`subscribe` unverändert.                                                                                                                                                                                                                                               |
| `UI/data.js`                                             | ändern | `requireAi()` bleibt (Key-Check); neu `requireAiConsent()` bzw. ein kombinierter Check, der `requireAi()` **und** `aiConsent` prüft und bei fehlender Einwilligung eine unterscheidbare `{ code: 'ai-consent-required' }`-Ablehnung liefert; `getWorkspaceSettings`/`updateWorkspaceSettings` sind bereits generisch (kein Endpunkt-Neu).                                                        |
| `UI/AiGate.jsx`                                          | ändern | Neu `AiConsentDialog` (deutscher Text, §3.4) + `AiConsentBanner`; `AiButton` zeigt bei `aiConsent === false` statt der KI-Aktion den Dialog und **keinen** Request; Ablehnung → klare Meldung; Zustimmen → `updateWorkspaceSettings({ aiConsent: true })`.                                                                                                                                     |
| `UI/BewerbungsEditor.jsx`                                | ändern | `generateLetter`/`runAll`/Magic-Pen-Einstieg prüfen `aiConsent` vor dem ersten Request (über `AiConsentDialog`); dieselbe Prüfung für die `pen.*`-Seam.                                                                                                                                                                                                                                       |
| `UI/Editor.jsx`                                          | ändern | Basis-Editor-KI-Aktionen („KI anpassen" = `suggestDocument`) laufen durch denselben Consent-Gate.                                                                                                                                                                                                                                                                                            |
| `UI/ChatPanel.jsx`                                       | ändern | `agentChat` prüft Consent vor dem ersten Senden.                                                                                                                                                                                                                                                                                                                                             |
| `UI/SettingsView.jsx` / `UI/app.jsx`                     | ändern | Einstellungen zeigen den Consent-Zustand im Abschnitt „KI-Anbindung" mit **Widerruf** (`aiConsent: false`) und Hinweis auf EU AI Act; App-Shell reicht den Zustand an die Einstiegspunkte durch.                                                                                                                                                                                               |
| `UI/__tests__/*`, `e2e/*`                                | ändern | Neue Tests (§8); bestehende Vitest/e2e an das zusätzliche Settings-Feld anpassen (Mocks liefern `aiConsent: true`, wo KI geprüft wird).                                                                                                                                                                                                                                                       |

### 2.7 Dokumentation

- `docs/requirements.md`: FR-105 bis FR-109 (neu, §1.1) + NFR-15 (Lighthouse-Gate, §7).
- `docs/architecture.md`: Abschnitte „KI-Einwilligung" (Guard-Kette, `aiConsent`), „Klick-Audit" (View-Enumeration) und „Demo-Seeding".
- `docs/umls/`: Sequenz „KI-Einwilligung vor der ersten Übermittlung" und „Klick-Audit je Ansicht"; Baustein-Diagramm um `AiConsentGuard`.
- `docs/eu-ai-act.md`: Zeile „informierte Einwilligung vor der ersten Übermittlung" (Art. 13/14) mit Verweis auf ADR-0063.
- `CHANGELOG.md`: Added (Consent-Gate, Golden-Path-e2e, Klick-Audit, `seed:demo`, README-Vorzeigbar), Changed (`WorkspaceSettings` um `aiConsent`, Settings-UI).
- `docs/adr/README.md`: Zeile 0063 (bereits ergänzt).
- `README.md`: Abschnitt „Vorzeigbar in 10 Minuten" (§7.3).

### 2.8 Test-Infrastruktur (`server/__tests__/support/`)

| Datei                | Aktion | Inhalt                                                                                                                                                                                                                              |
| -------------------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `route-inventory.ts` | ändern | Neue Mengen: `AI_CONSENT_ROUTES: string[]` (K01–K19) und `AI_CONSENT_CONDITIONAL = ['T01','T02','T03']` (verbindlich, kein „ggf."). Drift-Tests: (a) **jede** `AI_ROUTES`-Id ist in `AI_CONSENT_ROUTES` enthalten (eine KI-Route ohne Consent-Guard fällt durch); (b) **Disjunktheit**: `AI_CONSENT_CONDITIONAL ∩ AI_CONSENT_ROUTES = ∅` — T01–T03 stehen **nicht** in `AI_CONSENT_ROUTES`, ihre Sperre ist konditional und je Route durch einen `ParseService_WithKey_*`-Test gepinnt (§8.1). |
| `fakes.ts` / `nest-app.ts` | ändern | `InMemoryWorkspaceSettingsStore`/Acceptance-Bundle liefern `aiConsent` im Settings-Fake; Seed-Helfer `grantAiConsent(scope)` für die Consent-Acceptance-Tests.                                                                        |

### 2.9 Demo-Seed (neu)

| Datei                       | Aktion | Inhalt                                                                                                                     |
| --------------------------- | ------ | -------------------------------------------------------------------------------------------------------------------------- |
| `tools/seed-demo.cjs`       | **neu** | Idempotentes Demo-Seeding (§6), über die bestehende Persistence-Schicht (Muster `persistence-factory.ts`), `STORE`-bewusst. |
| `package.json`              | ändern | Script `"seed:demo": "node tools/seed-demo.cjs"`.                                                                            |

### 2.10 Umsetzungsreihenfolge (Tests zuerst, dann Code, dann Doku)

1. Testgerüst: `fakes.ts` (`aiConsent` im Settings-Fake), rote Unit-Tests (`workspace-settings.ts`, `errors.ts`), rote Acceptance-Tests `nest-ai-consent.test.ts` (403 je K-Route), `route-inventory.ts`-Drift-Test.
2. Domain: `workspace-settings.ts` (`aiConsent`), `errors.ts` (`AiConsentRequiredError`).
3. Services: `workspace-settings-service.ts` (`isAiConsentGranted`), Parse-Service (konditionale Prüfung, T01–T03).
4. Nest: `ai-consent.guard.ts`, Verdrahtung der 6 KI-Controller (`@RequiresAiConsent()`), `workspace.module.ts` (Schema/Log), `app.module.ts`.
5. OpenAPI + `openapi-contract.test.ts`; `route-inventory.ts`-Drift-Test grün.
6. Frontend: `workspace-settings.js`, `data.js` (Consent-Check), `AiGate.jsx` (`AiConsentDialog`), `BewerbungsEditor.jsx`/`Editor.jsx`/`ChatPanel.jsx`/`SettingsView.jsx`; Vitest.
7. Golden-Path-e2e (`e2e/golden-path.spec.ts`) und Klick-Audit (`e2e/button-audit.spec.ts`), Desktop + Mobil; `./test.sh` grün.
8. Demo-Seed (`tools/seed-demo.cjs` + `seed:demo`) + Seed-Test.
9. Doku, UML-SVG, Changelog, README-Vorzeigbar, `eu-ai-act.md`; manuelles Protokoll (§9) mit `STORE=sql` und `STORE=fs`; Lighthouse-Messung (§7.2) dokumentieren.

---

## 3. Datenschutz-Hinweis / KI-Einwilligung (ADR-0063)

### 3.1 Wo genau

**Einmal pro Workspace, vor der ersten Übermittlung** — nicht je Aktion. Die
Einwilligung ist ein `WorkspaceSettings`-Feld (nicht nutzerbezogen), weil die
übermittelten Daten dem Mandanten gehören und der Workspace-Betreiber die
KI-Politik entscheidet (ADR-0063 §Context 1). Die **UI-Einstiegspunkte**, die den
Dialog auslösen, sind alle KI-Übermittlungs-Stellen:

1. **Bewerbungs-Editor** — „Anschreiben generieren", „Alles für diese Stelle
   anpassen", jeder Magic-Pen-Knopf (`pen.headline/summary/experience/skills`).
2. **Basis-Editor** (`Editor.jsx`) — „KI anpassen" (`suggestDocument`, K01).
3. **Chat-Panel** — „Agent" (`POST /agent/chat`, K19).
4. **Stellen** — „Felder extrahieren" per Text/URL (K12) und CV-Import im AI-Modus
   (T01–T03, konditional).

Sobald `aiConsent === true` gilt, fragt **keiner** dieser Punkte mehr. Der
Dialog ist also nicht pro Button, sondern der eine, geteilte Gate vor dem ersten
Request (die Server-Sperre bleibt zusätzlich bei jedem Request aktiv).

### 3.2 Serverseitige Sperre (entschieden)

- **Alle 19 generativen Routen (K01–K19)** antworten ohne `aiConsent` mit
  **403 `ai-consent-required`** (`AiConsentRequiredError`). Begründung 403 statt
  409/404: s. ADR-0063 §Decision 2.
- **CV-Import (T01–T03) konditional**: nur der **AI-Modus** (Key gesetzt)
  übermittelt und wird gesperrt; ohne Key läuft die benannte Text-Übernahme
  (kein Übermitteln, keine Einwilligung nötig).
- **Guard-Reihenfolge (verbindlich, je Route-Familie):**
  `Auth → [VermittlungGuard 404 auf Vermittler-KI-Routen] → AiConfiguredGuard (503) → AiConsentGuard (403) → AiRateLimitGuard (429) → PlanGuard (402)`.
  Konkret: die **Vermittler-KI-Routen** (`documents-ai` K01–K05, `match-ai`
  K06–K08, `assistant` K10/K11) tragen `VermittlungGuard` **vor** `AiConfiguredGuard`
  und antworten bei ausgeschalteter Vermittlung mit **404, nicht 403** (AK-0.2
  bleibt intakt); die **Hauptweg-KI-Routen** (K09 `cover-letter`, K12 `extract`,
  K13–K18 `letter`/`pen`, K19 `agent/chat`) haben **keinen** `VermittlungGuard`.
  Der `AiConsentGuard` läuft auf **beiden** Familien an derselben Stelle: nach
  `AiConfiguredGuard` (503) und vor `AiRateLimitGuard` (429).

### 3.3 Persistenz

`WorkspaceSettings.aiConsent: boolean` (Default `false`), im bestehenden
scope-keyed `WorkspaceSettingsStore` (fs: `archive/bewerbungen/workspace-settings.json`;
sql: Tabelle `workspace_settings`, Spalte `settings jsonb`). **Keine neue DDL,
keine Migration** — das Feld reist im vorhandenen `settings`-Objekt mit;
`withDefaults` defaultet Alt-Records ohne Feld auf `false`.

### 3.4 UI-Text (deutsch, EU-AI-Act-konform)

Titel: **„KI-Verarbeitung zustimmen"**

> Dein Workspace verwendet KI (Anthropic Claude bzw. Google Gemini), um den
> Lebenslauf des Mandanten und den Text der Stellenanzeige zu verarbeiten. Die
> Inhalte werden dafür an den konfigurierten Anbieter übermittelt. Diese
> Verarbeitung gilt nach dem EU AI Act (Anhang III) als Hochrisiko-KI im Bereich
> Beschäftigung — sie dient nur der **Unterstützung**: Du prüfst jeden Vorschlag
> und übernimmst ihn ausdrücklich selbst. Jede Übermittlung wird im KI-Audit-Trail
> (Modell, Zeitpunkt, Kosten) protokolliert. Die Einwilligung gilt für diesen
> Workspace und kann jederzeit in den Einstellungen widerrufen werden.

Aktionen: **„Zustimmen"** (PATCH `aiConsent: true`) · **„Abbrechen"** (kein
Request; Hinweis „KI-Aktion abgebrochen — ohne Einwilligung wird nichts
übermittelt."). Für Nicht-Admins: statt „Zustimmen" der Hinweis „Bitte deinen
Workspace-Admin um Freigabe (Einstellungen → KI-Anbindung)."

### 3.5 Bezug zu `docs/eu-ai-act.md`

Das bestehende Dokument hat bereits die Zeilen „Transparenz & Logging" (Art. 12/13)
und „menschliche Aufsicht" (Art. 14). Phase 6 ergänzt eine **neue Zeile**
„Informierte Einwilligung vor der ersten Übermittlung" (Art. 13/14) und verlinkt
ADR-0063; der Absatz „The AI is assistive, not autonomous" wird um den Consent
als erste Hürde ergänzt.

---

## 4. Tote-Buttons-Audit (AK-6.2)

### 4.1 Technisches Design

**View-Enumeration + Audit-Map** (Muster `route-inventory.ts`): ein neuer
Playwright-Lauf `e2e/button-audit.spec.ts` enumeriert die Hauptweg-Ansichten bei
`vermittlung: false` (gemockte API, `serviceWorkers: 'block'` wie alle e2e) und
prüft je Ansicht **jeden sichtbaren** `button, [role="button"]` (plus
`a[href]`-Aktionen, die als Button agieren). Regel je Element:

- **`disabled`** → muss einen Grund tragen (`title` oder `aria-label`), sonst
  **Audit-Fehler**.
- **aktiv** → entweder (a) in der deklarierten **Audit-Map** der Ansicht als
  „bekannt mit Wirkung X" geführt, **oder** (b) der Audit **klickt** das Element
  und beobachtet eine sichtbare Wirkung (URL-/Tab-Wechsel, Dialog erscheint, Toast,
  Status-/DOM-Änderung, `download`-Event, getrackter `fetch`/Route). Keine
  Wirkung → **Audit-Fehler** mit Button-Label + Ansicht.

Die Audit-Map ist eine **deklarative Drift-Schranke**: Ein neuer Button ohne
deklarierte Wirkung (und ohne `disabled`+`title`) lässt den Test rot werden —
exakt die „kein toter Button"-Garantie, die der Owner will, ohne dass jeder
Einzel-Klick handgeschrieben werden muss.

**Umgang mit Seiteneffekten (Determinismus):**

- Jede Ansicht wird in **zwei Zuständen** geprüft: **leer** und **befüllt**
  (gemockt), damit Leerzustände („Noch keine …") und befüllte Zustände beide
  tote Buttons offenlegen.
- **Navigation/Tabs** (Rail, Unter-Tabs): Wirkung = Wechsel der aktiven Ansicht
  bzw. des `aria-selected`/URL. **Dialoge** (Modal/Sheet): Wirkung = `role="dialog"`
  erscheint; der Audit schließt per `Escape` und fährt fort.
- **Destruktive Aktionen** (Löschen, Statuswechsel): laufen gegen einen
  **disposablen, in-memory gemockten Zustand** (Muster `mockBewerbungen` aus
  `ui.spec.ts`); die Zustandsänderung ist die Wirkung, danach wird neu gemountet.
- **Downloads** (Mappe PDF/ZIP, Export): Wirkung = `page.waitForEvent('download')`
  bzw. ein getrackter Route-Zähler; kein echter Dateizugriff.
- **Konsolen-Fehler**: je Ansicht ein `page.on('console')`-/`page.on('pageerror')`-
  Sammler; am Ende assert `[]` (AK-6.2 „Keine Konsolen-Fehler").
- **Accessibility**: je Ansicht ein `axe-core`-Scan (bereits in `devDependencies`,
  Injektion über `page.addScriptTag`/`axe.min.js`); Verstöße → Audit-Fehler
  (Teil von AK-6.4).

### 4.2 Enumeration (Vermittlung aus)

| # | Ansicht           | Zustände                          | Bekannte Knackpunkte (prüfen/fixen)                                                                  |
| - | ----------------- | --------------------------------- | --------------------------------------------------------------------------------------------------- |
| 1 | Workspace         | leer                            | Begrüßungs-/KPI-Bereich ohne Daten — keine dekorativen Buttons ohne Wirkung                          |
| 2 | Mandanten         | leer, befüllt                   | „Lebenslauf anlegen/bearbeiten", Anhang-/Export-Buttons (Basis-Export)                              |
| 3 | Mandant-Profil    | befüllt                         | alte **Mappe-/Export-Buttons** (Basis-CV) — entweder wirkend oder `disabled`+`title`                 |
| 4 | Stellen           | leer, befüllt, Detail           | „Stelle übernehmen", „Stelle einfügen" (Text/URL), „Text ergänzen", Löschen/Undo                     |
| 5 | Bewerbungen       | leer, befüllt (Filter)          | **Pipeline-Sub-Tab** (bei aus **nicht** vorhanden, schon durch Phase 0/2 getestet)                   |
| 6 | Bewerbungs-Editor | draft, sent                     | Status-Pills, „Anschreiben generieren", „Alles anpassen", Magic Pen, Mappe, Anhänge, Einfrier-Dialog |
| 7 | Einstellungen     | admin, non-admin                | „KI-Anbindung" (Consent-Zustand/Widerruf), „Daten & Datenschutz", „Vermittlung"-Toggle (nur admin)   |
| 8 | Chat-Agent        | leer                            | Send/Abort bei leerem Input deaktiviert mit Grund                                                      |

**Bekannte Kandidaten aus der Pflichtlektüre:** alte Mappe-Buttons im
Mandant-Profil/Basis-Editor (entweder auf die Basis-Export-Route verdrahtet und
damit wirkend, oder entfernt/deaktiviert), Pipeline-Sub-Tab bei aus (bereits
unsichtbar + getestet), CoRecruiter bei aus (bereits unsichtbar + getestet). Die
Aufgabe des Audits ist, **weitere** tote Buttons deterministisch zu finden und in
dieser Phase zu fixen (kein Produkt-Feature, reine Wirkungs-/Disable-Fixes).

### 4.3 Testnamen

`e2e/button-audit.spec.ts` (Desktop; der Mobile-Smoke deckt die 393-px-Reichbarkeit,
der vollständige Klick je Ansicht läuft Desktop — bewusste Kosten-/Flake-Abgrenzung):

- `ButtonAudit_WorkspaceView_EveryButtonActsOrDisabled`
- `ButtonAudit_MandantenView_EveryButtonActsOrDisabled`
- `ButtonAudit_TalentProfileView_EveryButtonActsOrDisabled`
- `ButtonAudit_StellenView_EveryButtonActsOrDisabled`
- `ButtonAudit_BewerbungenView_EveryButtonActsOrDisabled`
- `ButtonAudit_BewerbungsEditorView_EveryButtonActsOrDisabled`
- `ButtonAudit_EinstellungenView_EveryButtonActsOrDisabled`
- `ButtonAudit_ChatPanel_EveryButtonActsOrDisabled`
- `ButtonAudit_AllViews_NoConsoleErrors`
- `ButtonAudit_AllViews_AxeNoViolations`

---

## 5. Goldener-Pfad-e2e (AK-6.1)

### 5.1 Mocking-Strategie (Muster Phase 5)

Die e2e mocks an der **HTTP-Grenze** mit `page.route` gegen einen in-memory
Zustand (Muster `mockBewerbungen`/`mockPhase4` in `e2e/ui.spec.ts`). „LLM gemockt"
heißt: die KI-Routen (`letter`, `pen/*`, `agent/chat`) liefern **deterministische
Fixtures**; es wird **kein** echter Provider gerufen. **Der Einwilligungs-Zustand
ist explizit festgelegt (verbindlich, G2-Reviewer B):** die Golden-Path-Mocks
liefern `aiConsent: true` über `GET /settings/workspace`; der Einwilligungs-Flow
selbst ist **nicht** Teil des Golden-Path-e2e, sondern separat durch `ConsentFlow_*`
(§8.2) und das Protokoll (Schritte 3–5) gedeckt. Der Golden-Path prüft damit
ausschließlich die §1.8-Schritte, nicht den Consent-Dialog (klare
Zuständigkeitstrennung, kein doppelter Test desselben Gates). Für die
**Agent-Variante**
liefert `POST /agent/chat` ein skriptetes SSE-Transkript (Tool-Calls
`save_job`→`create_application`→`generate_letter`→`tailor_all`), dessen
`drafts`-Event denselben Endzustand erzeugt. Die serverseitige
`FakeAgentLlmProvider`-Schleife ist bereits durch die Phase-5-Szenarien-Suite
gedeckt — hier wird die **UI** gegen das mockte SSE getestet (Schichten sauber
getrennt, kein doppelter Server-Test).

### 5.2 Schritte (exakt §1.8)

1. **Mandant anlegen + CV-PDF hochladen** — Mandant „Tobias Wirth" anlegen; CV
   über den Import-Weg laden (AI-Modus, Key gemockt gesetzt); der Basis-CV liegt.
2. **Stelle übernehmen** (oder einfügen) — aus der Portal-Suche „Stelle
   übernehmen" (gemockte `/jobs` + `/job-postings/adopt`); alternativ „Stelle
   einfügen per Text" (`/job-postings/extract`). Volltext gespeichert.
3. **Bewerbung erstellen (Mandant wählen)** — `createJobApplication`; der
   Bewerbungs-Editor öffnet mit der **Kopie** (AK-2.1).
4. **KI-Anschreiben** — „Anschreiben generieren" (mock `/letter`), Vorschlag
   gestaged; „Übernehmen".
5. **CV per Magic Pen anpassen** — ein Abschnitt (`pen/summary`) → Diff →
   „Übernehmen" (nur die Kopie wird geschrieben, AK-2.3/3.1).
6. **Mappe herunterladen** — Anhang wählen (`/attachments`), „Mappe als PDF"/ZIP
   (mock `/dossier/*`).
7. **Status „versendet"** — `changeJobApplicationStatus`; nach Reload weiterhin
   „Versendet".

### 5.3 Testnamen

`e2e/golden-path.spec.ts`:

- `GoldenPath_Manual_Desktop_EndToEnd` (Schritte 1–7 in einem Flow)
- `GoldenPath_Manual_Mobile_EndToEnd` (393 px, Schritte 1–7; der Mobile-Smoke
  stellt zusätzlich die Reichbarkeit jedes Schritts sicher)
- `GoldenPath_Agent_Desktop_EndToEnd` (Chat → skriptete Tool-Loop → `drafts`-Link →
  Editor zeigt den Entwurf; Endzustand = `draft`-Bewerbung mit befüllter Kopie)

Der **<5-Minuten-Lauf** ist Teil des manuellen Protokolls (§9, AK-6.7), nicht des
CI-Laufs (CI-Dauer ist nicht aussagekräftig für die Live-Abnahme).

---

## 6. Demo-Seeding (AK-6.6)

### 6.1 Skript

`npm run seed:demo` → `node tools/seed-demo.cjs` (CommonJS, Muster
`tools/log-application.cjs`/`tools/store.cjs`). Es komponiert die **dieselbe
Persistence-Schicht wie die App** (fs- und sql-Adapter über die bestehende
Factory, `STORE`/`DATABASE_URL`-bewusst), statt JSON von Hand zu schreiben —
dadurch fs/sql-symmetrisch und idempotent (feste IDs, `upsert` statt `create`).

Erzeugt wird im Default-Scope (bzw. dem Workspace der Wahl) mit **festen,
deterministischen IDs**:

- **1 Demo-Mandant** `demo-mandant-1` „Max Mustermann", M.Sc. Software Engineer,
  synthetischer Basis-CV (fiktive Arbeitgeber „Beispiel GmbH", synthetische Daten).
- **1 Demo-Stelle** `demo-stelle-1` (Quelle `text`), synthetischer Volltext.
- **1 Demo-Bewerbung** `demo-bewerbung-1` (Status `draft`) mit Kopie.

### 6.2 Daten-Synthese-Regeln (verbindlich)

- **Kein echtes PII:** keine echten Namen, E-Mails, Telefonnummern, Adressen,
  Firmen oder Kennzahlen. Alle Felder sind sichtbar fiktiv und mit einem
  `demo-`-Präfix oder offensichtlich generischem Inhalt markiert.
- **Kein `rawText` mit Fremddaten**, keine `archive/bewerbungen/*`-Laufzeitdaten
  und keine Fremdordner im Diff. Der Seed schreibt **nur zur Laufzeit** in
  `archive/` (gitignored); es werden **keine** Fixture-Dateien committet — die
  Synthese-Regeln leben als Code im Skript.
- **Idempotent:** erneutes Ausführen legt keine Duplikate an (feste IDs + Lookup).
- **`aiConsent` bleibt bewusst unset** (Owner-Entscheidung OQ4, ADR-0063
  §Consequences): Der 5-Minuten-Rundgang führt die Einwilligung als **echten
  Schritt** vor. Ein `--with-consent`-Flag überschreibt das (`aiConsent: true`
  vorsetzen), wenn ein reiner Golden-Path ohne Dialog gewünscht ist.

### 6.3 Test

- `SeedDemo_Idempotent_NoDuplicates` (Unit, gegen InMemory/fs-Store): zweimal
  ausführen → je genau 1 Mandant/Stelle/Bewerbung.
- `SeedDemo_Synthetic_NoRealPii` (Unit): Assert über eine Verbotsliste
  (kein `@`-Lookup echter Domains, kein bekannter Personenname im Fixture-Satz).
- `SeedDemo_Default_LeavesAiConsentUnset` (Unit, OQ4): ohne Flag ist `aiConsent`
  `false`.
- `SeedDemo_WithConsentFlag_PresetsAiConsentTrue` (Unit, OQ4): `--with-consent`
  setzt `aiConsent: true`.

---

## 7. Live-Instanz-Vorbereitung (AK-6.5/6.7)

### 7.1 Deployment-Checkliste

Der bestehende Weg (`docker compose up --build` → `STORE=sql` auf
<http://localhost:4178>) bleibt der Einstieg. Für die **vorzeigbare** Instanz gilt
zusätzlich (im `deployment.md`/`deployment-blueprint.md` dokumentiert):

| Muss gesetzt sein (`NODE_ENV=production` bootet sonst nicht) | Warum                                                                                     |
| ------------------------------------------------------------ | ----------------------------------------------------------------------------------------- |
| `STORE=sql` + `DATABASE_URL`                                 | Dateisystem-Store ist single-instance und verliert Daten bei Redeploy (ADR-0029).        |
| `APP_SECRET` (stark, stabil)                                | Signiert/verschlüsselt den Auth-Store; der Dev-Default ist öffentlich.                    |
| `ANTHROPIC_API_KEY` (oder `GEMINI_API_KEY`)                 | Echter Key für den Golden-Path-Live-Lauf; ohne Key 503 `ai-not-configured`.               |
| `NODE_ENV=production`                                        | Secure-Cookies, Fail-fast-Readiness, keine Dev-Fakes (`AGENT_FAKE` gesperrt).             |

Empfohlen: `MAIL_TRANSPORT=smtp` + `SMTP_*` + öffentliches `APP_BASE_URL`
(sonst loggt der Console-Transport Reset-/Verifizierungs-Links nur); TLS am
Reverse-Proxy terminiert; `CORS_ORIGINS` nur bei anderem Origin; Volume für
`/app/archive` (PDF-Archiv ist file-backed) bzw. `PDF_ARCHIVE=s3`.

### 7.2 Lighthouse (AK-6.4, Desktop) — Owner-Entscheidung OQ3, verbindlich

**Nur Messlauf, keine CI-Schwelle.** Ein dokumentierter Lauf:
`npx lighthouse <baseURL>/design/myjob/ui_kits/recruiting/dist/index.html
--preset=desktop --only-categories=performance,accessibility,best-practices` für
die Hauptansichten (Workspace, Mandanten, Stellen, Bewerbungen, Einstellungen),
gegen einen echt gestarteten Server. Ziel **≥ 90** je Kategorie; das Ergebnis wird
als Tabelle im PR dokumentiert (Muster AK-3.3: Messung separat, nicht CI). Die
**CI-seitige** Absicherung der Accessibility läuft über den **Axe-Scan** im
Klick-Audit (`ButtonAudit_AllViews_AxeNoViolations`, §4.1) — Lighthouse wird
bewusst **nicht** als CI-Gate geführt (Umgebungsvarianz).

### 7.3 README „Vorzeigbar in 10 Minuten"

Neuer Abschnitt mit exakt diesem Pfad:

1. `docker compose up --build` (oder Image + Prod-ENV aus §7.1).
2. Einloggen; Workspace anlegen; ggf. Key prüfen (Einstellungen → KI-Anbindung).
3. `npm run seed:demo` (Demo-Mandant/-Stelle/-Bewerbung, synthetisch).
4. Einwilligung erteilen (Dialog erscheint bei der ersten KI-Aktion).
5. Goldenen Pfad in < 5 min durchlaufen (Mandant → Stelle → Bewerbung →
   Anschreiben → Magic Pen → Mappe → „versendet"), Konsolen-Error-frei.

---

## 8. Testplan

Namensschema `Subject_StateUnderTest_ExpectedBehaviour`, AAA. Schwellen unverändert
(≥ 90 %); sql-Adapter in der Coverage-Ausschlussliste (Integrationstests decken sie).

### 8.1 Unit (`server/__tests__/unit/`)

**`workspace-settings.test.ts`** (ändern, ADR-0063)

- `WithDefaults_MissingAiConsent_DefaultsFalse` (OQ2: kein Backfill — Alt-Records ohne Feld defaulten auf `false`)
- `UpdateWorkspaceSettingsSchema_AcceptsAiConsent`
- `UpdateWorkspaceSettingsSchema_RejectsUnknownKeys` (strict bleibt)

**`problem.test.ts`** (ändern)

- `MapErrorToProblem_AiConsentRequired_403AiConsentRequired`

**`route-inventory.test.ts`** (ändern, Drift-Wächter §2.8)

- `AiConsentRoutes_CoversEveryAiRoute` (jede `AI_ROUTES`-Id ∈ `AI_CONSENT_ROUTES`)
- `AiConsentRoutes_DisjointFromConditional` (verbindlich, Reviewer A: `AI_CONSENT_ROUTES ∩ AI_CONSENT_CONDITIONAL = ∅`; T01–T03 stehen **nicht** in `AI_CONSENT_ROUTES`)

**`talent-parse-service.test.ts`** (ändern, ADR-0063 §Decision 4, konditional)

- `ParseService_NoKey_TextModeSucceedsWithoutConsent`
- `ParseService_WithKey_NoConsent_ThrowsAiConsentRequired`
- `ParseService_WithKey_WithConsent_UsesAiMode`

**Seed** (`seed-demo.test.ts`, neu)

- `SeedDemo_Idempotent_NoDuplicates`
- `SeedDemo_Synthetic_NoRealPii`

**Frontend (Vitest, `UI/__tests__/`)**

`consent-ui.test.jsx` (neu)

- `AiConsentDialog_NotGranted_ShowsGermanText`
- `AiConsentDialog_Accept_CallsUpdateWorkspaceSettings`
- `AiConsentDialog_Reject_SendsNoAiRequest`
- `AiConsentDialog_NonAdmin_ShowsAskAdminHint` (OQ1: Nicht-Admin sieht „Bitte deinen Workspace-Admin um Freigabe", kein Konsens-Dialog)
- `AiButton_NoConsent_ShowsDialogInsteadOfCallingHandler`
- `ChatPanel_NoConsent_BlocksSend`
- `SettingsView_ShowsConsentStateAndRevoke`

`workspace-settings.test.js` (ändern)

- `WorkspaceSettings_Get_DefaultsAiConsentFalse`
- `WorkspaceSettings_Set_MapsAiConsent`

### 8.2 Integration

**Acceptance (Nest, `makeNestApp`) — `nest-ai-consent.test.ts`** (neu, ADR-0063)

- `AiConsent_NoConsent_GenerativeRoute_Returns403` (stellvertretend `POST …/letter`, K13)
- `AiConsent_WithConsent_GenerativeRoute_Returns200`
- `AiConsent_NoKey_Returns503BeforeConsent` (Guard-Reihenfolge: 503 > 403)
- `AiConsent_AllGenerativeRoutes_Gated` (Drift: iteriere `AI_ROUTES`, jede **ohne** Consent 403; auf den Vermittler-KI-Routen K01–K08/K10/K11 wird dabei zugleich assertet, dass bei `vermittlung: false` **404 vor 403** kommt — Regression von AK-0.2 verhindern)
- `AiConsent_VermittlerKiRoutes_VermittlungOff_Returns404Before403` (explizit: `documents/ai` K01 und `match-ai` K06 antworten bei Vermittlung aus mit 404 `not-enabled`, **nicht** 403, unabhängig vom Consent-Stand)
- `AiConsent_TwoWorkspaces_ConsentIsScoped` (Workspace A consented, B nicht → B 403)
- `AiConsent_CvImport_NoKey_TextModeSucceeds` (T01–T03 ohne Key, kein Consent nötig)
- `AiConsent_CvImport_WithKey_NoConsent_Returns403`
- `AiConsent_Settings_NonAdmin_Forbidden` (OQ1: PATCH `aiConsent` als non-admin → 403, Role-Authorizer, Muster vermittlung-Toggle)

**Postgres (`server/__tests__/integration/`, `DATABASE_URL`-gated)**

- `SqlWorkspaceSettings_AiConsent_RoundTrips` (das `settings`-`jsonb` trägt `aiConsent`)

**Playwright**

- `e2e/golden-path.spec.ts` (§5.3): `GoldenPath_Manual_Desktop_EndToEnd`,
  `GoldenPath_Manual_Mobile_EndToEnd`, `GoldenPath_Agent_Desktop_EndToEnd`.
- `e2e/button-audit.spec.ts` (§4.3): `ButtonAudit_*`.
- Consent-Flow (in `e2e/ui.spec.ts` oder `e2e/consent.spec.ts`):
  - `ConsentFlow_FirstAiAction_ShowsBannerAndAccepts`
  - `ConsentFlow_NoConsent_ServerReturns403`
  - `ConsentFlowMobile_BannerReachable` (393 px)

### 8.3 Manuell

Abschnitt 9 (echt gestarteter Server, `STORE=sql` und `STORE=fs`, echter Key).
Der <5-Minuten-Golden-Pfad (AK-6.7) und der Owner-Rundgang (AK-6.3) sind dort
verankert.

---

## 9. Manuelles Testprotokoll

Gegen einen **echt gestarteten** Server (`npm run build && STORE=sql …` gegen
lokales Postgres, und einmal `STORE=fs`). **Ein echter KI-Key steht bereit
(OQ5)**: die KI-Schritte (5–7, 12) laufen gegen das echte Modell; die
Consent-Schritte (3–5, 9) sind zusätzlich ohne Key prüfbar (503/403). **Zeitstopp**
für den Golden-Pfad notieren (AK-6.7: < 5 min). Konsolen-/Page-Error-Prüfung nach
jedem Schritt.

| # | Schritt                                                                                      | Erwartet                                                                                                              | ok |
| - | -------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- | -- |
| 1 | Frischen Workspace öffnen (Vermittlung aus)                                                   | Nur Workspace/Mandanten/Stellen/Bewerbungen/Einstellungen sichtbar; keine Konsolen-Fehler                             |    |
| 2 | `npm run seed:demo` ausführen                                                                | Demo-Mandant/-Stelle/-Bewerbung erscheinen (synthetisch, kein PII); erneut ausführen → keine Duplikate                  |    |
| 3 | Erste KI-Aktion auslösen (z. B. „Anschreiben generieren")                                    | Einwilligungs-Dialog (deutscher Text, Empfänger/Zweck/Widerruf) erscheint; **kein** Request vor Zustimmung             |    |
| 4 | „Abbrechen" im Dialog                                                                        | Keine Übermittlung; klare Meldung; Server hätte 403 `ai-consent-required` geantwortet                                  |    |
| 5 | „Zustimmen" (admin), dann KI-Aktion                                                          | Aktion läuft; keine weitere Consent-Frage; Zustand in Einstellungen sichtbar                                           |    |
| 6 | Goldenen Pfad (Mandant → Stelle → Bewerbung → Anschreiben → Magic Pen → Mappe → versendet)   | Jeder Schritt wirkt; Mappe lädt; Status „Versendet" überlebt Reload; **< 5 min**                                       |    |
| 7 | Goldenen Pfad per Agent (Chat)                                                               | Agent legt denselben Entwurf an (draft + Kopie), Draft-Link öffnet den Editor                                          |    |
| 8 | Jede Ansicht durchklicken (Klick-Audit-Pfad)                                                  | Kein toter Button; jeder wirkt oder ist deaktiviert mit Tooltip-Grund; keine Konsolen-Fehler                           |    |
| 9 | Einstellungen → Widerruf der Einwilligung; erneute KI-Aktion                                 | 403 `ai-consent-required`; UI zeigt den Dialog erneut                                                                   |    |
| 10 | Mobil (393 px) denselben Golden-Pfad                                                          | Alle Schritte erreichbar; keine horizontalen Body-Scrolls; keine Konsolen-Fehler                                        |    |
| 11 | `STORE=fs` wiederholen (Schritte 1–9)                                                         | Identisches Verhalten (fs/sql-Symmetrie)                                                                                |    |
| 12 | Lighthouse (Desktop) für die Hauptansichten                                                  | Performance/Accessibility/Best Practices **≥ 90** (Ergebnis dokumentieren)                                             |    |

---

## 10. AK-Matrix

| AK     | Kriterium (Kurzform)                                                                                        | Beleg                                                                                                                                                                                          |
| ------ | ----------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AK-6.1 | Goldener Pfad manuell + per Agent (LLM gemockt), Desktop **und** Mobil (393 px)                              | Playwright `GoldenPath_Manual_Desktop_EndToEnd`, `GoldenPath_Manual_Mobile_EndToEnd`, `GoldenPath_Agent_Desktop_EndToEnd`; Protokoll 6, 7, 10                                                |
| AK-6.2 | Klick-Audit (Vermittlung aus): jeder Button wirkt oder `disabled`+Tooltip; keine Konsolen-Fehler             | `ButtonAudit_*` (§4.3), `ButtonAudit_AllViews_NoConsoleErrors`; Protokoll 8                                                                                                                 |
| AK-6.3 | Manueller Owner-Rundgang ohne offene Funde                                                                   | Protokoll 8 (Owner führt aus); Reviewer-Urteil „freigegeben"                                                                                                                               |
| AK-6.4 | Lighthouse (Desktop) P/A/BP ≥ 90                                                                             | Lighthouse-Messlauf (§7.2) dokumentiert im PR; `ButtonAudit_AllViews_AxeNoViolations` (CI-Teil)                                                                                           |
| AK-6.5 | Live-Instanz über Docker/Compose, `STORE=sql`, HTTPS, echte Secrets, echter Key; ein Befehl; dokumentiert    | §7.1 Checkliste + `deployment.md`/`deployment-blueprint.md` + README-Abschnitt „Vorzeigbar in 10 Minuten"; Protokoll 1–12 (echter Key, OQ5)                                                          |
| AK-6.6 | Demo-Workspace mit Demo-Mandant aus synthetischen Daten                                                      | `npm run seed:demo` (§6); Unit `SeedDemo_Idempotent_NoDuplicates`, `SeedDemo_Synthetic_NoRealPii`, `SeedDemo_Default_LeavesAiConsentUnset`, `SeedDemo_WithConsentFlag_PresetsAiConsentTrue` (OQ4); Protokoll 2                                                                             |
| AK-6.7 | Goldener Pfad live **< 5 min**, fehlerfrei, ohne Konsolen-Errors (Owner-Abnahme)                             | Protokoll 6 (Zeitstopp, echter Key OQ5) + 8/10 (Console-Error-Prüfung)                                                                                                                                    |

Zusätzlich (nicht als eigene AK, aber verbindlich): die Einwilligung ist durch
`AiConsent_*`-Acceptance-Tests (inkl. `AiConsent_Settings_NonAdmin_Forbidden`,
OQ1), den Consent-Flow-e2e und Protokoll 3–5/9 belegt (FR-105); „kein Backfill"
(OQ2) durch `WithDefaults_MissingAiConsent_DefaultsFalse`.

---

## 11. Risiken und offene Fragen

### 11.1 Entschieden vom Owner (verbindlich)

- **OQ1 — Einwilligung nur durch den Workspace-Admin.** `aiConsent` setzt nur der
  Workspace-Admin (403 `forbidden` für andere, Muster `vermittlung`-Toggle). Ein
  Nicht-Admin, der eine KI-Aktion ohne Einwilligung auslöst, sieht in der UI
  „Bitte deinen Workspace-Admin um Freigabe" statt des Konsens-Dialogs. Belegt
  durch `AiConsent_Settings_NonAdmin_Forbidden` (Acceptance) und
  `AiConsentDialog_NonAdmin_ShowsAskAdminHint` (Vitest).
- **OQ2 — Kein Backfill.** Bestehende Workspaces starten mit `aiConsent: false`
  (Default, kein automatischer Backfill; konsistent zu ADR-0057 „default off").
  Belegt durch `WithDefaults_MissingAiConsent_DefaultsFalse`.
- **OQ3 — Lighthouse nur Messlauf.** Lighthouse wird als **dokumentierter
  Messlauf** geführt (Ziel ≥ 90 je Kategorie, Ergebnis im PR), **keine**
  CI-Schwelle; die Accessibility-Absicherung läuft in CI über den Axe-Scan
  (`ButtonAudit_AllViews_AxeNoViolations`, §4.1/§7.2).
- **OQ4 — Demo-Seed `aiConsent` unset.** Der Seed lässt `aiConsent` auf `false`
  (die Einwilligung wird im Rundgang vorgeführt); ein `--with-consent`-Flag
  überschreibt auf `true`. Belegt durch `SeedDemo_Default_LeavesAiConsentUnset`
  und `SeedDemo_WithConsentFlag_PresetsAiConsentTrue`.
- **OQ5 — Echter KI-Key verfügbar.** Für AK-6.5/6.7 steht ein echter
  `ANTHROPIC_API_KEY` (oder `GEMINI_API_KEY`) auf der Vorführ-Instanz bereit. Die
  Live-Schritte (§9 Schritt 5–7, 12) sind als **durchführbar** geplant, nicht als
  blockiert; der <5-Minuten-Lauf (AK-6.7) läuft mit echtem Key.

### 11.2 Offene Punkte (Implementierung, keine Owner-Entscheidung)

1. **Audit-Determinismus vs. Seiteneffekte.** Ein vollautomatischer
   „klicke alles"-Lauf ist ohne Disziplin flaky. Gegenmittel: deklarative
   Audit-Map + disposabler gemockter Zustand + `Escape`-Schließen von Dialogen +
   `serviceWorkers: 'block'` (§4.1). **Watch-Item:** Falls einzelne Ansichten
   unverhältnismäßig flaky werden, wird der betroffene Button über die Audit-Map
   als „bekannt, durch eigenen e2e gedeckt" deklariert (nie: Test abschwächen).
2. **Wo genau der Parse-Service heißt.** Der konditionale Consent-Check (§2.3)
   muss beim Umsetzen gegen den tatsächlichen Parse-Service-Dateinamen verifiziert
   werden (Muster `parse-document`-Pfad, T01–T03); der Plan nennt den Ort
   strukturell, nicht den finalen Dateinamen.

### 11.3 Bewusst abgegrenzt

- **Audit-False-Positives** bei versteckten/dekorativen Buttons: die Enumeration
  zählt **nur sichtbare** Elemente; rein dekorative Buttons **ohne** Wirkung sind
  per Definition ein Audit-Fund und werden gefixt (disabled+`title`) — kein
  stilles „Allow-listen".
- **Demo-Daten vs. DSGVO:** Der Seed erzeugt nur synthetische, klar fiktive Daten
  (§6.2) und schreibt ausschließlich Laufzeit-Daten nach `archive/`; es werden
  keine Fixture-Dateien mit Personendaten committet.
