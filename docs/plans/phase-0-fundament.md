# Phase 0 — Aufräumen & Fundament (Implementierungsplan)

Issue #309 · Branch `claude/app-matching-bugs-d0crk0` · Entscheidung: [ADR-0057](../adr/0057-produkt-schwenk-bewerbungsservice.md) · Rahmen: [Orchestrierungs-Prompt](bewerbungsservice-orchestration-prompt.md) (Phase 0, AK-0.1 bis AK-0.8)

Stand: Plan zur Review (G1/G2). Es gibt noch keinen Code und keine Tests. Alle Pfade sind relativ zur Repo-Wurzel; `UI/` steht für `design/myjob/ui_kits/recruiting/`.

---

## 1. Ziel

Nach Phase 0 ist myJob ein Bewerbungsservice mit einer klaren, ehrlichen Oberfläche, auf der die späteren Phasen (Stellen, Bewerbung, Magic Pen, Abschluss, Agent) aufbauen:

1. **Workspace-Schalter `vermittlung`** (Standard aus, pro Workspace, nur von Workspace-Admins umlegbar). Aus bedeutet: alle Vermittler-Routen antworten 404 `problem+json`, die Navigation zeigt nur Workspace, Mandanten, Stellen, Bewerbungen und Einstellungen, geplante Vermittler-Jobs überspringen den Workspace. Die Daten bleiben unberührt.
2. **Neue Begriffe in der gesamten UI** (Mandant, Suchauftrag, Workspace, Stelle, Bewerbung), belegt durch einen Test gegen eine Verbotsliste.
3. **KI nur über einen zentralen Server-Key** (`ANTHROPIC_API_KEY`, optional `GEMINI_API_KEY`), **ohne Ersatz-Text**: ohne Key antwortet jede KI-Route mit 503 `ai-not-configured`, jeder KI-Button zeigt „KI nicht eingerichtet“ und sendet nichts. Ein Anbieterfehler ist ein 502, nie ein stiller Template-Text.
4. **Per-User-API-Keys entfallen** (Routen, Store, Verschlüsselung, UI), bestehende Keys werden idempotent gelöscht (fs und sql).
5. **Doku**: ADR 0057 (liegt vor), Requirements, Architektur (+UML), OpenAPI, Changelog.

## 2. Nicht-Ziele

Ausdrücklich **nicht** Teil von Phase 0:

- Die Entität `JobPosting` / „Stelle speichern“, Stellen-Liste, „Stelle einfügen“ per URL oder Text (Phase 1). Der Menüpunkt **Stellen** zeigt in Phase 0 die bestehende Stellensuche (`Matching`), nur umbenannt und umverdrahtet.
- Bewerbung = Stelle × Mandant, Dokumentkopie, Bewerbungs-Editor, Entfernen des `ApplyModal` (Phase 2). Das `ApplyModal` bekommt nur die neuen Begriffe und die KI-Sperre.
- Magic Pen, Mappe als ZIP/PDF mit neuem Dateinamen, Statusverlauf, Chat-Agent (Phasen 3 bis 5).
- Weiterentwicklung der Vermittler-Funktionen. Erlaubt sind nur: der Schalter (Guard, Dekorator, Test-Setup), die Vokabular-Änderung in ihren UI-Texten und die KI-Policy (kein Template, 503/502), soweit sie dieselben Services nutzen.
- Kein Umbenennen von Code-Bezeichnern, Routen (`/mandates`, `/talents`), Dateien oder Datenbankspalten. Nur die UI-Texte und die Doku ändern sich. Eine Ausnahme sind neue Dateien, die in der neuen Sprache heißen (`workspace-settings`).
- Kein Pro/Free-Umbau (ADR-0021 bleibt: Pro-Routen bleiben Pro), kein neues Metering-Modell (Metering bleibt pro Nutzer), kein neuer Auth-Mechanismus.
- Keine Änderung der Retention-/DSGVO-Routen, der Mitglieder-/Einladungs-/Super-Admin-Routen, der Bewerbungs-Routen (`/applications`), der Job-Suche (`/jobs`, `/searches`), der Dokument-Routen außer den KI-Routen, der deterministischen ATS-Analyse (`POST /ats`).
- Kein Umbenennen der Dateien/Ordner unter `design/myjob/` außerhalb von `ui_kits/recruiting/` (`screens/`, `templates/`, `decisions/` sind Design-Archiv und werden nicht ausgeliefert; die gemeinsame Design-System-Komponente `AppShell` ist ausgenommen, siehe Abschnitt 3.6).
- Keine Änderung der Coverage-Schwellen (Jest 90 %), keine Abschwächung bestehender Tests.

---

## 3. Betroffene Dateien

Legende: **neu**, **ändern**, **löschen**. Die Reihenfolge in 3.9 ist die Umsetzungsreihenfolge.

### 3.1 Domain (`server/src/domain/`)

| Datei                             | Aktion  | Inhalt                                                                                                                                                                                                                                                                                                                                       |
| --------------------------------- | ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `workspace-settings.ts`           | **neu** | `WorkspaceSettings { vermittlung: boolean }`, `DEFAULT_WORKSPACE_SETTINGS = { vermittlung: false }`, `updateWorkspaceSettingsSchema` (zod, `.strict()`, mindestens ein Feld), `withDefaults(stored)`.                                                                                                                                        |
| `errors.ts`                       | ändern  | `AiNotConfiguredError` (Status 503, Typ `ai-not-configured`, Titel „AI not configured“). `UpstreamProviderError` (502) existiert bereits und wird jetzt auch für unbrauchbare Provider-Antworten genutzt.                                                                                                                                    |
| `document-ai.ts`                  | ändern  | `fallbackSummary`, `fallbackLetter` löschen (Prompt-Builder und Parser bleiben).                                                                                                                                                                                                                                                             |
| `application-tailor.ts`           | ändern  | `fallbackTailor` löschen.                                                                                                                                                                                                                                                                                                                    |
| `ats-ai.ts`                       | ändern  | `fallbackAts` löschen.                                                                                                                                                                                                                                                                                                                       |
| `candidate-pitch.ts`              | ändern  | `fallbackPitch` löschen.                                                                                                                                                                                                                                                                                                                     |
| `outreach.ts`                     | ändern  | `fallbackOutreach` löschen.                                                                                                                                                                                                                                                                                                                  |
| `match-explain.ts`                | ändern  | `fallbackExplanation` löschen.                                                                                                                                                                                                                                                                                                               |
| `interview-kit.ts`                | ändern  | `fallbackInterviewKit` löschen.                                                                                                                                                                                                                                                                                                              |
| `candidate-prep.ts`               | ändern  | `fallbackPrep` ist heute zugleich Datengerüst (`base`) für die Antwort. Beim Umsetzen prüfen: reine Textbausteine löschen, den faktischen Teil (Anforderungen, Archetyp, Beobachtungen aus `company-archetype`) in eine neutrale Funktion `prepFacts` umbenennen, falls der Prompt ihn braucht. Kein Template-Text darf ausgeliefert werden. |
| `document-parse.ts`               | ändern  | `fallbackParsed` löschen (siehe Frage Q2).                                                                                                                                                                                                                                                                                                   |
| `cover-letter.ts`                 | ändern  | `coverLetterTemplate` löschen (Request-Schema und Prompt bleiben).                                                                                                                                                                                                                                                                           |
| `user.ts`                         | —       | unverändert (`llmProvider` bleibt, ADR-0011 Teil „Provider-Wahl“).                                                                                                                                                                                                                                                                           |
| `usage.ts`                        | —       | unverändert (Metering bleibt pro Nutzer).                                                                                                                                                                                                                                                                                                    |
| Antwort-Typen aller KI-Ergebnisse | ändern  | `provider: LlmProviderId \| 'template'` wird zu `provider: LlmProviderId` (in den Services, siehe 3.3).                                                                                                                                                                                                                                      |

### 3.2 Ports (`server/src/ports/`)

| Datei                         | Aktion  | Inhalt                                                                                                                                                         |
| ----------------------------- | ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `workspace-settings-store.ts` | **neu** | `get(workspaceId): Promise<WorkspaceSettings \| null>`, `set(workspaceId, settings): Promise<void>` (Schlüssel = Scope/Tenant-ID, wie `RetentionPolicyStore`). |
| `api-key-store.ts`            | löschen | Port der Per-User-Keys entfällt.                                                                                                                               |
| `llm-provider.ts`             | ändern  | `LlmGenerateInput.apiKey` (Per-Call-Override) entfernen.                                                                                                       |

### 3.3 Services (`server/src/services/`, decorator-frei)

| Datei                           | Aktion  | Änderung                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| ------------------------------- | ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `workspace-settings-service.ts` | **neu** | `get(scope)` (Defaults, wenn nichts gespeichert), `update(scope, patch)`, `isVermittlungEnabled(scope)`, `filterVermittlungEnabled(scopes)` (für die Scheduler).                                                                                                                                                                                                                                                                                   |
| `llm-service.ts`                | ändern  | `hasAvailableProvider()`; `resolve(preferred?)`: bevorzugter Provider, wenn verfügbar, sonst konfigurierter Standard, sonst irgendein verfügbarer (Claude zuerst), sonst `null`; `settings()` liefert zusätzlich `configured: boolean`. Eine Wahl, die nicht verfügbar ist, wird nie still verworfen: sie wird beim Setzen mit 400 abgelehnt (3.5), beim Auflösen durch den nächsten verfügbaren ersetzt.                                          |
| `llm-feature-runner.ts`         | ändern  | Abhängigkeit `apiKeyStore` entfernen. `resolveProvider(userId)` wirft `AiNotConfiguredError` statt `null`. `run()` wirft `AiNotConfiguredError` bzw. `UpstreamProviderError` (Provider-Fehler, Zeitüberschreitung), kein `null` mehr. `parseReply()` wirft `UpstreamProviderError` bei Schemaverletzung. `runFeature()` verliert `fallback` und liefert `{ content, provider, usage }`. `withGrounding()` bleibt. `provider: 'template'` entfällt. |
| `cover-letter-service.ts`       | ändern  | Kein `override`-Parameter, kein Template; nutzt `LlmService.resolve(...)`, wirft `AiNotConfiguredError`/`UpstreamProviderError`; meldet Nutzung wie bisher.                                                                                                                                                                                                                                                                                        |
| `document-assist-service.ts`    | ändern  | `suggest`, `tailorForMandate`, `translateDocuments` ohne Fallback; der Sonderfall „Translation needs an AI provider. Add your … key“ entfällt (der Runner wirft den einheitlichen Fehler).                                                                                                                                                                                                                                                         |
| `cv-parse-service.ts`           | ändern  | `parse`/`parsePdf` ohne `fallbackParsed`.                                                                                                                                                                                                                                                                                                                                                                                                          |
| `ats-ai-service.ts`             | ändern  | ohne `fallbackAts`.                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `outreach-ai-service.ts`        | ändern  | `pitch`, `outreach` ohne Fallback.                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `match-ai-service.ts`           | ändern  | `explain`, `interviewKit`, `prep` ohne Fallback.                                                                                                                                                                                                                                                                                                                                                                                                   |
| `document-ai-service.ts`        | ändern  | Facade-Typen (`provider`) anpassen.                                                                                                                                                                                                                                                                                                                                                                                                                |
| `talent-import-service.ts`      | ändern  | Prüft den Provider **einmal vor** der Schleife (wirft `AiNotConfiguredError`), damit nicht jede Datei einzeln scheitert und das Ergebnis als „erfolgreich ohne Inhalt“ erscheint. Fehler einzelner Dateien bleiben Einzelergebnisse (`ok:false`).                                                                                                                                                                                                  |
| `application-builder.ts`        | ändern  | Typen (`provider`); der Fehler aus dem Tailoring wird nicht verschluckt.                                                                                                                                                                                                                                                                                                                                                                           |
| `autopilot-service.ts`          | ändern  | Der `try/catch` um `builder.build` darf `AiNotConfiguredError` nicht schlucken (wird weitergeworfen), andere Fehler pro Stelle bleiben „überspringen und loggen“.                                                                                                                                                                                                                                                                                  |
| `assistant-service.ts`          | ändern  | Keine Logikänderung außer: Der Fehler aus dem Autopilot-Schritt propagiert, ohne `lastRunAt` zu setzen. Modi `suggest`/`act` bleiben deterministisch und brauchen keinen Key.                                                                                                                                                                                                                                                                      |
| `account-service.ts`            | prüfen  | Löschschritt „api-keys“ liegt in `registries.module.ts` (3.4); der Service selbst bleibt.                                                                                                                                                                                                                                                                                                                                                          |

### 3.4 Adapter (`server/src/adapters/`) — fs und sql

| Datei                                                                 | Aktion  | Änderung                                                                                                                                                                                                                                                                     |
| --------------------------------------------------------------------- | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `fs-workspace-settings-store.ts`                                      | **neu** | JSON-Objekt `{ "<workspaceId>": WorkspaceSettings }` in `archive/bewerbungen/workspace-settings.json` (Muster: `fs-retention-policy-store.ts`). Defekte/fehlende Datei ergibt `null`.                                                                                        |
| `sql/sql-workspace-settings-store.ts`                                 | **neu** | Drizzle, Upsert per `onConflictDoUpdate` auf `workspace_id` (Muster: `sql-retention-policy-store.ts`).                                                                                                                                                                       |
| `legacy-cleanup.ts`                                                   | **neu** | `removeLegacyApiKeysFile(file: string): Promise<boolean>` — `fs.rm(file, { force: true })`, gibt zurück, ob eine Datei entfernt wurde. Idempotent.                                                                                                                           |
| `sql/schema.ts`                                                       | ändern  | `workspaceSettings` (Tabelle `workspace_settings`) hinzufügen; `apiKeys` entfernen.                                                                                                                                                                                          |
| `sql/db.ts`                                                           | ändern  | In `runMigrationDdl`: `CREATE TABLE IF NOT EXISTS workspace_settings (...)` hinzufügen, den `CREATE TABLE IF NOT EXISTS api_keys`-Block durch `DROP TABLE IF EXISTS api_keys;` ersetzen (siehe 4).                                                                           |
| `persistence-factory.ts`                                              | ändern  | `apiKeyStore` und `SecretCipher` entfernen; `workspaceSettingsStore` (fs und sql) ergänzen.                                                                                                                                                                                  |
| `fs-api-key-store.ts`, `sql/sql-api-key-store.ts`, `secret-cipher.ts` | löschen | Per-User-Keys und ihre Verschlüsselung (`SecretCipher` wird nur dafür benutzt; `config.security.encryptionSecret` bleibt, weil Better-Auth es als Signatur-Secret erhält, siehe `index.ts`).                                                                                 |
| `anthropic-llm-provider.ts`, `gemini-llm-provider.ts`                 | ändern  | `apiKey`-Override aus `generate()` entfernen; Zeitüberschreitung und HTTP-Fehler bleiben Ausnahmen, die der Runner in `UpstreamProviderError` übersetzt.                                                                                                                     |
| `../config.ts`                                                        | ändern  | `workspaceSettingsFile` ergänzen; `apiKeysFile` zu `legacyApiKeysFile` umbenennen (nur noch fürs Löschen); Kommentar an `security.encryptionSecret` anpassen (kein „encrypts API keys“ mehr).                                                                                |
| `../config-validation.ts`                                             | ändern  | Fehlertext zum `APP_SECRET` anpassen („signiert Sitzungen“). Neue **Warnung** (kein Fehler): kein `ANTHROPIC_API_KEY` und kein `GEMINI_API_KEY` gesetzt, KI-Funktionen antworten mit 503.                                                                                    |
| `../index.ts`                                                         | ändern  | Vor dem Nest-Start `removeLegacyApiKeysFile(config.legacyApiKeysFile)` (beide Store-Modi); die drei Scheduler-Ticks (Assistent, Reply-Sync) verwenden `workspaceSettingsService.filterVermittlungEnabled(await tenantScopes())`; die Retention-Automatik bleibt unverändert. |

### 3.5 Nest-Module, Controller, Guards (`server/src/nest/`)

| Datei                                              | Aktion  | Änderung                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| -------------------------------------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `tokens.ts`                                        | ändern  | `WORKSPACE_SETTINGS_STORE`, `WORKSPACE_SETTINGS_SERVICE` ergänzen; `API_KEY_STORE` entfernen.                                                                                                                                                                                                                                                                                                                                                                                                                             |
| `persistence.module.ts`                            | ändern  | Mapping `[WORKSPACE_SETTINGS_STORE, 'workspaceSettingsStore']`; `API_KEY_STORE` entfernen.                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `vermittlung.guard.ts`                             | **neu** | `RequiresVermittlung()` (SetMetadata) und `VermittlungGuard` (Mechanismus: siehe 5.3).                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `ai-configured.guard.ts`                           | **neu** | `AiConfiguredGuard` (Mechanismus: siehe 5.4).                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| `workspace/workspace.module.ts`                    | **neu** | `WorkspaceSettingsController` (`GET`/`PATCH /api/v1/settings/workspace`), Provider `WORKSPACE_SETTINGS_SERVICE`. In `app.module.ts` zu `FEATURE_MODULES` hinzufügen. `WORKSPACE_SETTINGS_SERVICE` wird `@Global` exportiert, weil Guards und `AuthController` ihn injizieren.                                                                                                                                                                                                                                             |
| `authorization.ts` / `adapters/role-authorizer.ts` | ändern  | Policy-Eintrag `workspace: {}` (wie `retention: {}`): die Aktion `configure` bleibt absichtlich ungelistet, also nur Admin; `GET` braucht nur `AuthGuard`.                                                                                                                                                                                                                                                                                                                                                                |
| `auth/auth.controller.ts`                          | ändern  | `GET /auth/me` liefert zusätzlich `workspace: { vermittlung }` (nur bei angemeldetem Nutzer).                                                                                                                                                                                                                                                                                                                                                                                                                             |
| `llm/llm.module.ts`                                | ändern  | Routen `GET /settings/keys`, `PUT/DELETE /settings/keys/:provider` und die Override-Logik in `POST /cover-letter` löschen; `PUT /settings/llm` lehnt nicht verfügbare Provider mit 400 ab; `POST /cover-letter` bekommt `AiConfiguredGuard`; `GET /settings/llm` liefert `configured`.                                                                                                                                                                                                                                    |
| `ai/documents-ai.controller.ts`                    | ändern  | `AiConfiguredGuard` nach `AuthGuard` (Klassenebene); `pitch` und `outreach` zusätzlich `VermittlungGuard` + `@RequiresVermittlung()` (Methodenebene).                                                                                                                                                                                                                                                                                                                                                                     |
| `ai/ai.module.ts`                                  | ändern  | `LlmFeatureRunner` ohne `apiKeyStore`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `match-ai/match-ai.module.ts`                      | ändern  | Klassenebene `VermittlungGuard` + `AiConfiguredGuard`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `talents/talent-import.module.ts`                  | ändern  | `AiConfiguredGuard` (Methode `import`).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| `registries.module.ts`                             | ändern  | `USER_ERASURE_STEPS`: Schritt „api-keys“ und die Abhängigkeit `ApiKeyStore` entfernen.                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| Vermittler-Controller (Liste in 5.2)               | ändern  | `VermittlungGuard` in `@UseGuards(...)` direkt nach `AuthGuard`, plus `@RequiresVermittlung()`: `mandates/mandates.controller.ts`, `match/match.module.ts`, `match-ai/match-ai.module.ts`, `observations/observations.module.ts`, `candidacies/candidacies.module.ts`, `placements/placements.module.ts`, `forecast/forecast.module.ts`, `artifacts/artifacts.module.ts`, `mail/mail.module.ts`, `assistant/assistant.module.ts`, `compliance/compliance.module.ts`, `ai/documents-ai.controller.ts` (nur zwei Methoden). |
| `ai-rate-limit.guard.ts`, `plan.guard.ts`          | —       | unverändert (Reihenfolge siehe 5.4).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| `problem-json.filter.ts`, `http/problem.ts`        | —       | unverändert; `AiNotConfiguredError` wird über `DomainError` zu `about:blank#ai-not-configured` gemappt.                                                                                                                                                                                                                                                                                                                                                                                                                   |

### 3.6 OpenAPI und Frontend

| Datei                                                                                                                                                     | Aktion  | Änderung                                                                                                                                                                                                                                                                                                                                                                                    |
| --------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `server/openapi.yaml`                                                                                                                                     | ändern  | Pfade `/settings/workspace` (GET, PATCH) neu; `/settings/keys` und `/settings/keys/{provider}` entfernen; `LlmSettings.configured`; Schema `WorkspaceSettings`, `UpdateWorkspaceSettingsInput`; Antwort-Komponenten `AiNotConfigured` (503) und `FeatureNotEnabled` (404) und deren `$ref` an den 13 KI- bzw. 37 Vermittler-Routen; `/auth/me` mit `workspace`; `/ats`-Beschreibung bleibt. |
| `server/__tests__/unit/openapi-contract.test.ts`                                                                                                          | ändern  | Drift-Wächter für `UpdateWorkspaceSettingsInput` und die neuen Antworten (5.7).                                                                                                                                                                                                                                                                                                             |
| `UI/ai-status.js`                                                                                                                                         | **neu** | Kleiner Store (wie `toast.js`): `window.AiStatus = { get, subscribe, refresh }`, lädt `GET /settings/llm` und hält `{ loading, configured, current, providers }`.                                                                                                                                                                                                                           |
| `UI/use-ai-status.jsx`                                                                                                                                    | **neu** | `window.useAiStatus()` (React-Binding, wie `use-toast.jsx`).                                                                                                                                                                                                                                                                                                                                |
| `UI/AiGate.jsx`                                                                                                                                           | **neu** | `window.AiButton` (Button, der bei fehlender KI den Hinweis zeigt und `onClick` nicht ausführt) und `window.AiNotConfiguredHint` („KI nicht eingerichtet“ + Link „Einstellungen“). Barrierefrei (`role="status"`, Link ist ein echter `<button>`/`<a>`, der `myjob:navigate` auslöst).                                                                                                      |
| `UI/main.jsx`                                                                                                                                             | ändern  | Die drei neuen Module vor `Workspace.jsx` importieren (Lade-Reihenfolge wie die übrigen `window.*`-Hooks).                                                                                                                                                                                                                                                                                  |
| `UI/data.js`                                                                                                                                              | ändern  | `getApiKeyStatus`, `setApiKey`, `removeApiKey` löschen; `getWorkspaceSettings`, `updateWorkspaceSettings` ergänzen; `_jsonOrThrow` wirft für 503 `ai-not-configured` einen Fehler mit `code: 'ai-not-configured'`; `authMe` reicht `workspace` durch; `computeApplicationKpis(apps)` ergänzen; alle UI-Texte in `computeVermittlerKpis`/`deriveReportClients` auf die neuen Begriffe.       |
| `UI/app.jsx`                                                                                                                                              | ändern  | Navigation und Titel (5.5), `useResource(fetcher, { enabled })`, Vermittlungs-Zustand, Fallback bei verstecktem Ziel, Gate für `CoRecruiter`-Aktion, Platzierungs-/Performance-Tabs, `mandateFromJob`/`applyFromMatching`-Weitergabe nur bei `vermittlung`, neue Begriffe in allen Texten.                                                                                                  |
| `UI/Workspace.jsx`                                                                                                                                        | ändern  | `Dashboard` (Prop `vermittlung`, Bewerbungs-KPIs, Onboarding „Mandant anlegen → Stelle finden → Bewerbung erstellen“), `TalentGrid` zu „Mandanten“, `Inbox` nur Vermittlung.                                                                                                                                                                                                                |
| `UI/AgencyViews.jsx`                                                                                                                                      | ändern  | Texte: Suchaufträge, Mandant statt Talent in der Platzierungstabelle.                                                                                                                                                                                                                                                                                                                       |
| `UI/MandatePipeline.jsx`, `UI/MandatePipelineModals.jsx`                                                                                                  | ändern  | Texte; Buttons „Warum passt …“, „Interview-Kit“, „Vorbereitung“ als `AiButton`.                                                                                                                                                                                                                                                                                                             |
| `UI/Matching.jsx`                                                                                                                                         | ändern  | Texte; „Aus einem Suchauftrag vorbefüllen“ und „Suchauftrag anlegen“ erscheinen nur, wenn `mandates`/`onCreateMandate` übergeben werden (bei `vermittlung` aus nicht der Fall).                                                                                                                                                                                                             |
| `UI/TalentProfile.jsx`, `UI/RecordFormModal.jsx`, `UI/EditorModals.jsx`, `UI/Editor.jsx`, `UI/EditorDocs.jsx`, `UI/EditorShared.jsx`, `UI/ApplyModal.jsx` | ändern  | Texte; alle KI-Buttons als `AiButton` (Editor: KI anpassen, Übersetzen, Import-Parse; ATS; ApplyModal: Zusammenfassung/Anschreiben); „Kandidat:in-Pitch“ und „Ansprache“ nur mit `vermittlung`.                                                                                                                                                                                             |
| `UI/AssistantView.jsx`                                                                                                                                    | ändern  | Texte; „Lauf starten“ als `AiButton` im Autopilot-Modus (nur über Vermittlung erreichbar).                                                                                                                                                                                                                                                                                                  |
| `UI/SettingsView.jsx`                                                                                                                                     | ändern  | Karte „KI-Modelle & API-Schlüssel“ und `ProviderRow` (Schlüsseleingabe) löschen; neue Karte **„KI-Anbindung“** (Status, aktiver Anbieter, Auswahl nur unter verfügbaren, Hinweis für Betreiber auf die Umgebungsvariablen); neue Karte **„Workspace“** mit dem Schalter „Vermittlung“ (nur für Admins); Super-Admin-Karte: „Mandant“ wird „Workspace“.                                      |
| `UI/Login.jsx`                                                                                                                                            | ändern  | Werbetexte auf Bewerbungsservice und neue Begriffe.                                                                                                                                                                                                                                                                                                                                         |
| `design/myjob/components/app/AppShell.jsx` und `design/myjob/_ds_bundle.js`                                                                               | ändern  | Wortmarken-Zusatz `Vermittler-Workspace` wird `Bewerbungsservice` (beide Stellen identisch halten; das Bundle ist generiert, siehe Frage Q7).                                                                                                                                                                                                                                               |
| `UI/__tests__/*.test.jsx`, `UI/__tests__/data.test.js`                                                                                                    | ändern  | Bestehende Tests, die alte Begriffe/Navigation/Key-UI prüfen, anpassen (Liste in 6.4); neue Tests aus 6.                                                                                                                                                                                                                                                                                    |
| `e2e/ui.spec.ts`, `e2e/mobile.spec.ts`                                                                                                                    | ändern  | Gemockte `/auth/me`-Antworten bekommen `workspace`, Tests für Vermittler-Ansichten setzen `vermittlung: true`; neue Tests aus 6.2.                                                                                                                                                                                                                                                          |

`UI/data.js` enthält die Mappings `mapTalent` / `mapMandate` mit ihren Code-Namen; sie bleiben unverändert.

### 3.7 Test-Infrastruktur (`server/__tests__/support/`)

| Datei                  | Aktion  | Änderung                                                                                                                                                                                                                                                       |
| ---------------------- | ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `fakes.ts`             | ändern  | `InMemoryWorkspaceSettingsStore` (mit Option `defaultVermittlung`) ergänzen; `InMemoryApiKeyStore` entfernen; `FakeLlmProvider` (steuerbar: Antworttexte pro Aufruf, wirft auf Wunsch, zählt Aufrufe) ergänzen.                                                |
| `nest-app.ts`          | ändern  | `NestTestAppOptions` um `vermittlung?: boolean` (Standard **false**, wie in Produktion) und `llmProviders?: LlmProvider[]` (Standard: **keine**, also „KI nicht eingerichtet“) erweitern; `WORKSPACE_SETTINGS_STORE` bereitstellen; `API_KEY_STORE` entfernen. |
| `route-inventory.ts`   | **neu** | Die Tabellen aus 5.2 (`VERMITTLER_ROUTES`, 37 Einträge) und 5.1 (`AI_ROUTES`, 13 Einträge) als Daten: `{ id, method, path, body?, status-on? }`. Einzige Quelle für die tabellengetriebenen Acceptance-Tests und den Drift-Wächter.                            |
| `build-document-ai.ts` | ändern  | `apiKeyStore` aus dem Aufbau entfernen.                                                                                                                                                                                                                        |

### 3.8 Dokumentation

`docs/requirements.md` (FR-30, FR-31, FR-43 neu gefasst; neue FR-70 bis FR-73, NFR-14; Begriffe), `docs/architecture.md` (Abschnitte 1, 3, 4, 5, 6, 8, 9, 12; KI ist nicht mehr „optional throughout“), `docs/umls/05_building_blocks.puml` (+`.svg`), `docs/umls/06_seq_ai_generation.puml` (+`.svg`), `docs/umls/usecases/uc14_byo_key_cost.puml` (+`.svg`; wird zu „zentraler Key, Kosten pro Nutzer“ umgebaut und umbenannt), `docs/use-cases.md`, `docs/deployment.md` und `docs/deployment-blueprint.md` (`APP_SECRET`-Beschreibung, KI-Keys als Betriebsparameter), `docs/security.md` (Abschnitt Per-User-Keys), `docs/eu-ai-act.md` (Zeile „Graceful degradation“), `README.md` (Zeilen zu Fallback, Per-User-Keys, Routentabelle), `CHANGELOG.md` (Added/Changed/Removed, inklusive Upgrade-Hinweis „Vermittlung standardmäßig aus“), `docs/adr/0005-…md` und `docs/adr/0011-…md` (Statuszeile „Teilweise abgelöst durch ADR-0057“; Inhalt bleibt unverändert, die Historie wird nicht umgeschrieben).

SVGs werden aus den `.puml` gerendert (`plantuml -tsvg -nometadata docs/umls docs/umls/usecases`). `docs:check` prüft nur, dass zu jeder `.puml` eine `.svg` existiert; die Byte-Frische prüft der CI-Job `docs.yml` (Risiko RI9).

### 3.9 Umsetzungsreihenfolge (Tests zuerst, dann Code, dann Doku)

1. Testgerüst: `fakes.ts`, `nest-app.ts`, `route-inventory.ts`; rote Tests für Schalter-Guard, Workspace-Einstellungen, KI-Guard, Runner ohne Fallback, Migration.
2. Domain + Ports + Adapter (fs, sql) + Migration + Config.
3. Services (Runner, Cover-Letter, KI-Services, Import, Autopilot).
4. Nest: Tokens, Guards, Workspace-Modul, Dekoration der Vermittler-Controller, Entfernen der Key-Routen, `auth/me`, `settings/llm`.
5. Bestehende Server-Tests migrieren (6.4), `npm test` grün.
6. OpenAPI und Drift-Tests.
7. Frontend: `ai-status`, `AiGate`, `data.js`, Navigation, Dashboard, Einstellungen, Begriffe, Terminologie-Test, Vitest grün.
8. Playwright (Desktop und Mobil), `./test.sh` grün.
9. Doku, UML-SVG, Changelog; manuelles Protokoll (8) mit `STORE=sql` und `STORE=fs`.

---

## 4. Datenmodell + Migration (fs und sql, idempotent)

### 4.1 Workspace-Einstellungen

```ts
// server/src/domain/workspace-settings.ts
export interface WorkspaceSettings {
  /** Recruiter functions (Suchaufträge, pipeline, placements, …) are reachable. Default off. */
  vermittlung: boolean;
}
export const DEFAULT_WORKSPACE_SETTINGS: WorkspaceSettings = { vermittlung: false };
```

- **Schlüssel** ist die Scope-ID des Workspaces (`req.tenantId`, im Einzel-Tenant-Betrieb `team`). Eine Spalte an `tenants` reicht nicht: der implizite Standard-Workspace `team` hat keine Zeile in `tenants` (der `TenantService` synthetisiert sie nur). Deshalb eine eigene, nach Scope geschlüsselte Struktur, wie `retention_policies` und `assistant_settings`.
- **Lesen** ist `{ ...DEFAULT_WORKSPACE_SETTINGS, ...stored }`: Fehlt der Eintrag oder ein Feld, gilt der Standard. Neue Felder in späteren Phasen brauchen deshalb keine Migration.
- **fs:** `archive/bewerbungen/workspace-settings.json`, Inhalt `{ "team": { "vermittlung": true } }`. Pfad aus `config.workspaceSettingsFile`. Fehlende oder defekte Datei ergibt `null` (Standard).
- **sql:** in `server/src/adapters/sql/db.ts`, innerhalb von `runMigrationDdl` (also unter dem Advisory-Lock):

  ```sql
  CREATE TABLE IF NOT EXISTS workspace_settings (
    workspace_id text PRIMARY KEY,
    settings jsonb NOT NULL
  );
  ```

  und in `schema.ts` `workspaceSettings = pgTable('workspace_settings', { workspaceId: text('workspace_id').primaryKey(), settings: jsonb('settings').$type<WorkspaceSettings>().notNull() })`.

- **Bestehende Workspaces:** kein Backfill. Es gibt keinen Eintrag, also gilt „aus“, auch für Installationen mit vorhandenen Suchaufträgen. Die Daten bleiben erhalten und erscheinen nach dem Einschalten unverändert (AK-0.2). Das ist eine bewusste Folge von „Standard aus“ (Frage Q1) und steht im Changelog.

### 4.2 Löschen der Per-User-Keys (AK-0.7)

Ab dem ersten Request liest kein Code mehr Keys (Store und Port existieren nicht mehr): sie werden **ignoriert**. Zusätzlich werden sie gelöscht:

| Store | Migration                                                                                                                                                                                                                                                                                                   | Idempotenz                                                                                                       |
| ----- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| fs    | `removeLegacyApiKeysFile(config.legacyApiKeysFile)` in `server/src/index.ts` **vor** `NestFactory.create`, bei jedem Start, in beiden Store-Modi (billig und deckt auch einen Wechsel von fs zu sql ab). Löscht `archive/bewerbungen/api-keys.json`. Meldung per `console.info`, wenn etwas entfernt wurde. | `fs.rm(..., { force: true })` fehlt nicht, wenn die Datei fehlt; zweiter Start entfernt nichts und wirft nichts. |
| sql   | `DROP TABLE IF EXISTS api_keys;` am Ende von `runMigrationDdl` (unter dem bestehenden Advisory-Lock). Der alte `CREATE TABLE IF NOT EXISTS api_keys`-Block entfällt, sonst würde er die Tabelle bei jedem Start neu anlegen.                                                                                | `IF EXISTS`; mehrere Instanzen laufen nacheinander durch den Lock.                                               |

Weitere Folgen:

- Die Spalte `users.llm_provider` (Provider-Wahl, ADR-0011) bleibt und wird weiter geschrieben/gelesen. Eine gespeicherte Wahl, die nicht verfügbar ist, wird beim Auflösen übersprungen (3.3, `LlmService.resolve`).
- Der Löschschritt `api-keys` in `USER_ERASURE_STEPS` (DSGVO-Löschung eines Kontos) entfällt, weil es nichts mehr zu löschen gibt; der Export enthielt nie Schlüssel.
- Rollout: Während einer Rolling-Deploy-Überlappung lesen alte Instanzen die entfernte Tabelle und scheitern bei **KI-Aufrufen** (nicht bei anderen Routen). Kurzes Überlappungsfenster, siehe RI6.

### 4.3 Entfernte Konfiguration

`APP_SECRET` bleibt Pflicht in Produktion (Better-Auth-Signatur), seine Beschreibung ändert sich. Neu dokumentiert: `ANTHROPIC_API_KEY` (Standard), `GEMINI_API_KEY` (optional), `LLM_PROVIDER` (Standard-Anbieter, wenn beide gesetzt sind).

---

## 5. API

Alle Fehler sind RFC-9457 `application/problem+json` über den bestehenden `ProblemJsonFilter`. `type` hat die vorhandene Form `about:blank#<kurzname>`.

### 5.1 KI-Routen (503 ohne Key) — 13 Routen

KI-Route heißt: die Route erzeugt Text oder strukturierte Inhalte mit dem Sprachmodell. Nicht dazu gehören deterministische Analysen (`POST /ats`, `POST /compliance/agg-check`, `POST /compliance/agg-rewrite` ist regelbasiert, auch wenn ein Kommentar im Controller „LLM“ sagt; der Kommentar wird korrigiert) und `GET /assistant/suggestions/:id/dossier.pdf` (rendert nur ein gespeichertes Paket).

| ID  | Methode + Pfad                                                 | Zusätzlich                      | Prüfung ohne Key                                                 |
| --- | -------------------------------------------------------------- | ------------------------------- | ---------------------------------------------------------------- |
| K01 | `POST /api/v1/talents/:id/documents/ai`                        | Pro, Rate-Limit                 | Guard                                                            |
| K02 | `POST /api/v1/talents/:id/documents/parse`                     | Pro, Rate-Limit                 | Guard                                                            |
| K03 | `POST /api/v1/talents/:id/documents/parse-pdf`                 | Pro, Rate-Limit                 | Guard                                                            |
| K04 | `POST /api/v1/talents/:id/documents/ats`                       | Pro, Rate-Limit                 | Guard                                                            |
| K05 | `POST /api/v1/talents/:id/documents/pitch`                     | Pro, Rate-Limit, **Vermittler** | Guard (404 vor 503)                                              |
| K06 | `POST /api/v1/talents/:id/documents/outreach`                  | Pro, Rate-Limit, **Vermittler** | Guard (404 vor 503)                                              |
| K07 | `POST /api/v1/talents/:id/documents/translate`                 | Pro, Rate-Limit                 | Guard                                                            |
| K08 | `POST /api/v1/talents/import`                                  | Pro, Rate-Limit                 | Guard                                                            |
| K09 | `POST /api/v1/mandates/:id/candidates/:talentId/explain`       | Pro, Rate-Limit, **Vermittler** | Guard (404 vor 503)                                              |
| K10 | `POST /api/v1/mandates/:id/candidates/:talentId/interview-kit` | Pro, Rate-Limit, **Vermittler** | Guard (404 vor 503)                                              |
| K11 | `POST /api/v1/mandates/:id/candidates/:talentId/prep`          | Pro, Rate-Limit, **Vermittler** | Guard (404 vor 503)                                              |
| K12 | `POST /api/v1/cover-letter`                                    | Pro, Rate-Limit, Soft-Auth      | Guard (auch ohne Login 503)                                      |
| K13 | `POST /api/v1/assistant/run` (nur im Modus `autopilot`)        | **Vermittler**                  | Service wirft (kein Guard möglich, der Modus steht im Workspace) |

K13 ist bedingt: in den Modi `suggest` und `act` ist der Lauf deterministisch und antwortet auch ohne Key mit 200 (`AssistantRun_SuggestModeWithoutKey_Returns200`). Der geplante Assistentenlauf (Scheduler) überspringt einen Autopilot-Lauf ohne Key mit einer Warnung im Log.

**Fehlerantworten aller KI-Routen**

| Status | `type`                          | Wann                                                                                                                                                                                       |
| ------ | ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 401    | `about:blank#unauthorized`      | kein gültiges Login (außer K12, Soft-Auth)                                                                                                                                                 |
| 404    | `about:blank#not-found`         | Vermittler-Route bei ausgeschalteter Vermittlung; oder Mandant/Suchauftrag unbekannt                                                                                                       |
| 503    | `about:blank#ai-not-configured` | kein `ANTHROPIC_API_KEY` und kein `GEMINI_API_KEY` am Server. Titel „AI not configured“, `detail`: „No AI provider is configured on this server. Set ANTHROPIC_API_KEY or GEMINI_API_KEY.“ |
| 429    | `about:blank#rate-limit`        | Rate-Limit (unverändert)                                                                                                                                                                   |
| 402    | `about:blank#plan-required`     | Pro erforderlich (unverändert)                                                                                                                                                             |
| 400    | `about:blank#validation-error`  | ungültige Eingabe (zod, unverändert)                                                                                                                                                       |
| 502    | `about:blank#upstream-provider` | Anbieter nicht erreichbar, Zeitüberschreitung, HTTP-Fehler oder unbrauchbare/abgeschnittene Antwort                                                                                        |

Reihenfolge der Prüfungen: **401 → 404 (Vermittlung) → 503 (Key) → 429 → 402 → 400 (Body) → 404 (Ressource) → Handler → 502**. 503 kommt vor 400, damit „KI nicht eingerichtet“ auch bei einem leeren Formular erscheint, und vor 402/429, weil eine fehlende Server-Konfiguration nicht dem Nutzer zuzurechnen ist.

Erfolgsantworten ändern sich nur dadurch, dass `provider` nie mehr `'template'` ist (Wertebereich `claude | gemini`); `usage` ist immer gesetzt.

### 5.2 Vermittler-Routen (404 bei ausgeschalteter Vermittlung) — 37 Routen

Antwort bei aus: **404** `about:blank#not-found`, Titel `NotFoundError`, `detail`: „This feature is not enabled for this workspace.“ Anonyme Aufrufer sehen 401 (Auth-Guard läuft zuerst), damit der Schalter nichts verrät.

| ID  | Methode + Pfad                                                 | Controller (Datei unter `server/src/nest/`)         |
| --- | -------------------------------------------------------------- | --------------------------------------------------- |
| R01 | `GET /api/v1/mandates`                                         | `mandates/mandates.controller.ts`                   |
| R02 | `POST /api/v1/mandates`                                        | `mandates/mandates.controller.ts`                   |
| R03 | `PATCH /api/v1/mandates/:id`                                   | `mandates/mandates.controller.ts`                   |
| R04 | `DELETE /api/v1/mandates/:id`                                  | `mandates/mandates.controller.ts`                   |
| R05 | `POST /api/v1/mandates/:id/match`                              | `match/match.module.ts`                             |
| R06 | `POST /api/v1/mandates/:id/candidates/:talentId/explain`       | `match-ai/match-ai.module.ts` (auch K09)            |
| R07 | `POST /api/v1/mandates/:id/candidates/:talentId/interview-kit` | `match-ai/match-ai.module.ts` (auch K10)            |
| R08 | `POST /api/v1/mandates/:id/candidates/:talentId/prep`          | `match-ai/match-ai.module.ts` (auch K11)            |
| R09 | `GET /api/v1/mandates/:id/observations`                        | `observations/observations.module.ts`               |
| R10 | `POST /api/v1/mandates/:id/observations`                       | `observations/observations.module.ts`               |
| R11 | `GET /api/v1/mandates/:id/candidacies`                         | `candidacies/candidacies.module.ts`                 |
| R12 | `POST /api/v1/mandates/:id/candidacies`                        | `candidacies/candidacies.module.ts`                 |
| R13 | `GET /api/v1/talents/:id/candidacies`                          | `candidacies/candidacies.module.ts`                 |
| R14 | `PATCH /api/v1/candidacies/:id`                                | `candidacies/candidacies.module.ts`                 |
| R15 | `DELETE /api/v1/candidacies/:id`                               | `candidacies/candidacies.module.ts`                 |
| R16 | `GET /api/v1/placements`                                       | `placements/placements.module.ts`                   |
| R17 | `POST /api/v1/placements`                                      | `placements/placements.module.ts`                   |
| R18 | `PATCH /api/v1/placements/:id`                                 | `placements/placements.module.ts`                   |
| R19 | `DELETE /api/v1/placements/:id`                                | `placements/placements.module.ts`                   |
| R20 | `GET /api/v1/forecast`                                         | `forecast/forecast.module.ts`                       |
| R21 | `GET /api/v1/artifacts`                                        | `artifacts/artifacts.module.ts`                     |
| R22 | `GET /api/v1/artifacts/stats`                                  | `artifacts/artifacts.module.ts`                     |
| R23 | `POST /api/v1/artifacts/:id/outcome`                           | `artifacts/artifacts.module.ts`                     |
| R24 | `POST /api/v1/talents/:id/outreach/send`                       | `mail/mail.module.ts`                               |
| R25 | `POST /api/v1/mail/sync-replies`                               | `mail/mail.module.ts`                               |
| R26 | `GET /api/v1/mail/status`                                      | `mail/mail.module.ts`                               |
| R27 | `GET /api/v1/assistant`                                        | `assistant/assistant.module.ts`                     |
| R28 | `PUT /api/v1/assistant`                                        | `assistant/assistant.module.ts`                     |
| R29 | `POST /api/v1/assistant/run`                                   | `assistant/assistant.module.ts` (auch K13)          |
| R30 | `GET /api/v1/assistant/suggestions`                            | `assistant/assistant.module.ts`                     |
| R31 | `POST /api/v1/assistant/suggestions/:id/accept`                | `assistant/assistant.module.ts`                     |
| R32 | `POST /api/v1/assistant/suggestions/:id/dismiss`               | `assistant/assistant.module.ts`                     |
| R33 | `GET /api/v1/assistant/suggestions/:id/dossier.pdf`            | `assistant/assistant.module.ts`                     |
| R34 | `POST /api/v1/talents/:id/documents/pitch`                     | `ai/documents-ai.controller.ts` (Methode; auch K05) |
| R35 | `POST /api/v1/talents/:id/documents/outreach`                  | `ai/documents-ai.controller.ts` (Methode; auch K06) |
| R36 | `POST /api/v1/compliance/agg-check`                            | `compliance/compliance.module.ts`                   |
| R37 | `POST /api/v1/compliance/agg-rewrite`                          | `compliance/compliance.module.ts`                   |

Bewusst **nicht** gesperrt (bleiben im Bewerbungsservice): `/talents` (CRUD, Import), `/talents/:id/documents/*` außer `pitch`/`outreach`, `/talents/:id/attachments`, `/attachments/:id`, `/talents/:id/dossier/*`, `/applications*`, `/history`, `/jobs`, `/searches*`, `POST /ats`, `/cover-letter`, `/settings/*`, `/members*`, `/admin/tenants*`, `/retention/*`, `/talents/:id/anonymize`, `/account*`, `/auth/*`, `/compliance` ausgenommen R36/R37, `/health`. Die Zuordnung steht in Frage Q3 zur Bestätigung (Pitch/Outreach, AGG-Prüfung, Saved Searches, Artefakt-Log).

### 5.3 Mechanismus der Vermittlungs-Sperre

- `server/src/nest/vermittlung.guard.ts`:

  ```ts
  export const REQUIRES_VERMITTLUNG = 'requires:vermittlung';
  export const RequiresVermittlung = () => SetMetadata(REQUIRES_VERMITTLUNG, true);

  @Injectable()
  export class VermittlungGuard implements CanActivate {
    constructor(
      private readonly reflector: Reflector,
      @Inject(WORKSPACE_SETTINGS_SERVICE) private readonly settings: WorkspaceSettingsService,
    ) {}
    async canActivate(ctx: ExecutionContext): Promise<boolean> {
      const required = this.reflector.getAllAndOverride<boolean | undefined>(REQUIRES_VERMITTLUNG, [
        ctx.getHandler(),
        ctx.getClass(),
      ]);
      if (!required) return true;
      const req = ctx.switchToHttp().getRequest<Request>();
      if (!(await this.settings.isVermittlungEnabled(currentScope(req)))) {
        throw new NotFoundError('This feature is not enabled for this workspace.');
      }
      return true;
    }
  }
  ```

- **Pro Request** liest der Guard die Einstellung des Workspace aus dem Store (fs: JSON-Datei, sql: Primärschlüssel-Lookup). Kein Cache, damit ein Umlegen sofort in allen Instanzen wirkt.
- **Kein globaler Guard (`APP_GUARD`)**: globale Guards laufen vor den Controller-Guards, also bevor `AuthGuard` `req.tenantId` gesetzt hat. Deshalb steht `VermittlungGuard` **explizit hinter `AuthGuard`** in `@UseGuards(AuthGuard, VermittlungGuard, …)` jedes betroffenen Controllers. Bei gemischten Controllern (`DocumentsAiController`) steht `AuthGuard` an der Klasse und `VermittlungGuard` + `@RequiresVermittlung()` an den Methoden `pitch` und `outreach`.
- **Drift-Wächter** (`RouteInventory_*`, 6.1): ein Unit-Test liest per `Reflect.getMetadata` (Nest-Konstanten `PATH_METADATA`, `METHOD_METADATA`, `GUARDS_METADATA`) alle Controller aus `FEATURE_MODULES` und prüft: (a) jede Route aus `VERMITTLER_ROUTES` existiert und trägt `RequiresVermittlung`, (b) keine andere Route trägt es, (c) in jeder dieser Routen steht `VermittlungGuard` nach `AuthGuard` und vor `AiConfiguredGuard`. Wer künftig eine Vermittler-Route vergisst oder eine neue ungelistet markiert, bekommt einen roten Test.
- **Scheduler**: `WorkspaceSettingsService.filterVermittlungEnabled(scopes)` in `index.ts` für `assistant` und `reply-sync`. Die Retention-Automatik (DSGVO) läuft unabhängig vom Schalter.
- **Ausschalten löscht nichts.** Es gibt keinen Code, der bei `PATCH` Daten anfasst (Test `VermittlungSwitch_OffThenOn_DataIsUnchanged`).

### 5.4 Mechanismus der KI-Sperre

- `server/src/nest/ai-configured.guard.ts`: `AiConfiguredGuard.canActivate` ruft `LlmService.hasAvailableProvider()` (rein aus der Config, kein I/O) und wirft sonst `AiNotConfiguredError`. Reihenfolge in `@UseGuards`: `AuthGuard` (oder `OptionalAuthGuard`), `VermittlungGuard` (falls Vermittler), **`AiConfiguredGuard`**, `AiRateLimitGuard`, `PlanGuard`.
- **Zweite Schicht im Service** (Verteidigung in der Tiefe, auch für Scheduler und Autopilot): `LlmFeatureRunner.resolveProvider` wirft `AiNotConfiguredError`. Kein Pfad liefert Text, wenn die Auflösung scheitert.
- **Provider-Auflösung** (`LlmService.resolve(preferred)`): 1. gespeicherte Wahl des Nutzers, wenn der Anbieter einen Server-Key hat; 2. der konfigurierte Standard (`LLM_PROVIDER`, sonst `claude`), wenn verfügbar; 3. jeder andere verfügbare Anbieter. Damit gilt „Key gesetzt, aber still ungenutzt“ nicht mehr.
- **Fehler des Anbieters** (HTTP-Fehler, Zeitüberschreitung, nicht parsebare/abgeschnittene Antwort) werden im Runner zu `UpstreamProviderError` (502). Es gibt keine Rückfall-Texte.

### 5.5 Neue und geänderte Routen im Detail

**`GET /api/v1/settings/workspace`**

- Guards: `AuthGuard`. Jede Rolle. Workspace = `currentScope(req)`.
- 200: `{ "vermittlung": false }`.
- 401: kein Login.

**`PATCH /api/v1/settings/workspace`**

- Guards: `AuthGuard`, `RolesGuard` mit `@Can('workspace', 'configure')` (nur Rolle `admin`; Super-Admin ohne Tenant-Rolle `admin` ist **nicht** berechtigt, siehe Frage Q6).
- Body (zod, `server/src/domain/workspace-settings.ts`):

  ```ts
  export const updateWorkspaceSettingsSchema = z
    .object({ vermittlung: z.boolean() })
    .partial()
    .strict()
    .refine((v) => Object.keys(v).length > 0, 'at least one setting is required');
  ```

- 200: `{ "vermittlung": true }` (neuer Gesamtzustand).
- 400 `validation-error`: leerer Body, falscher Typ (`"yes"`), unbekanntes Feld.
- 401: kein Login. 403 `forbidden`: Rolle `recruiter`.
- Nebenwirkung: `logger.info({ scope, userId, vermittlung }, 'workspace setting changed')`. Kein Audit-Eintrag (der Audit-Port ist bewerbungsspezifisch, Frage Q5).

**`GET /api/v1/auth/me`** (geändert): bei angemeldetem Nutzer zusätzlich `"workspace": { "vermittlung": false }`; ohne Login unverändert `{ "user": null, … }`. Die UI liest daraus den Anfangszustand der Navigation ohne zweiten Request.

**`GET /api/v1/settings/llm`** (geändert, Soft-Auth): `{ current, providers: [{ id, label, available }], configured: boolean }`; `configured` ist wahr, wenn mindestens ein Anbieter einen Server-Key hat. Dient dem UI-Status (AK-0.6).

**`PUT /api/v1/settings/llm`** (geändert): 400 `validation-error` bei unbekanntem **oder nicht verfügbarem** Anbieter (`detail`: „Provider is not configured on this server.“).

**Entfernt:** `GET /api/v1/settings/keys`, `PUT /api/v1/settings/keys/:provider`, `DELETE /api/v1/settings/keys/:provider`. Sie antworten künftig wie jeder unbekannte Pfad (404 `about:blank#not-found`, „Unknown endpoint.“).

### 5.6 OpenAPI

`server/openapi.yaml`: neue Pfade und Schemas wie in 3.6; `$ref` auf `AiNotConfigured` (503) und `UpstreamError` (502) an K01 bis K13, auf `FeatureNotEnabled` (404) an R01 bis R37; die entfernten Pfade verschwinden. Wo die Beschreibung „deterministic fallback“ oder „Template“ sagt, wird sie korrigiert.

### 5.7 Vertrags-Wächter

`server/__tests__/unit/openapi-contract.test.ts` bekommt: Feldabgleich für `UpdateWorkspaceSettingsInput`, und Prüfungen, dass jede Route aus `VERMITTLER_ROUTES` ein `404` und jede aus `AI_ROUTES` ein `503` im Vertrag dokumentiert (Text-Scan der YAML wie bisher, ohne neue Abhängigkeit) und dass `/settings/keys` nicht mehr vorkommt.

---

## 6. Testplan

Namensschema `Subject_StateUnderTest_ExpectedBehaviour`, AAA. Tabellengetriebene Tests hängen die Routen-ID in Klammern an den Titel (`… (R07 POST /api/v1/…)`), damit jede Route ein eigener, benannter Testfall ist.

### 6.1 Unit

**`server/__tests__/unit/workspace-settings-service.test.ts`** (neu)

- `WorkspaceSettingsService_NoStoredSettings_ReturnsVermittlungOff`
- `WorkspaceSettingsService_UpdateVermittlung_PersistsAndReturnsNewState`
- `WorkspaceSettingsService_UpdateInOneWorkspace_DoesNotAffectAnother`
- `WorkspaceSettingsService_StoredPartialObject_MergesDefaults`
- `WorkspaceSettingsService_FilterVermittlungEnabled_KeepsOnlyEnabledScopes`

**`server/__tests__/unit/workspace-settings.test.ts`** (neu, Domain)

- `UpdateWorkspaceSettingsSchema_EmptyBody_IsRejected`
- `UpdateWorkspaceSettingsSchema_NonBooleanVermittlung_IsRejected`
- `UpdateWorkspaceSettingsSchema_UnknownKey_IsRejected`
- `UpdateWorkspaceSettingsSchema_BooleanVermittlung_IsAccepted`

**`server/__tests__/unit/vermittlung-guard.test.ts`** (neu)

- `VermittlungGuard_SwitchOff_ThrowsNotFound`
- `VermittlungGuard_SwitchOn_AllowsRequest`
- `VermittlungGuard_RouteWithoutMetadata_AllowsRequest`
- `VermittlungGuard_SwitchOnOnlyForOtherWorkspace_ThrowsNotFound`
- `VermittlungGuard_MethodMetadataOnMixedController_GatesOnlyThatMethod`

**`server/__tests__/unit/ai-configured-guard.test.ts`** (neu)

- `AiConfiguredGuard_NoProviderAvailable_ThrowsAiNotConfigured`
- `AiConfiguredGuard_OnlyAnthropicKey_AllowsRequest`
- `AiConfiguredGuard_OnlyGeminiKey_AllowsRequest`

**`server/__tests__/unit/route-inventory.test.ts`** (neu, Drift-Wächter)

- `RouteInventory_EveryDeclaredVermittlerRoute_ExistsAndCarriesTheMarker`
- `RouteInventory_RouteNotDeclaredAsVermittler_DoesNotCarryTheMarker`
- `RouteInventory_EveryDeclaredAiRoute_ExistsAndHasTheAiGuard`
- `RouteInventory_VermittlerAndAiRoutes_GuardOrderIsAuthThenVermittlungThenAi`
- `RouteInventory_VermittlerRoutes_CountIs37AndAiRoutesCountIs13` (Absicherung gegen stilles Schrumpfen der Tabelle)

**`server/__tests__/unit/llm.test.ts`** (ändern)

- `LlmService_NoKeysConfigured_ResolveReturnsNull`
- `LlmService_PreferredProviderAvailable_ResolveReturnsIt`
- `LlmService_PreferredProviderUnavailable_ResolveReturnsConfiguredProvider`
- `LlmService_DefaultUnavailableOtherAvailable_ResolveReturnsOther`
- `LlmService_Settings_ReportsConfiguredFlag`

**`server/__tests__/unit/llm-feature-runner.test.ts`** (neu; die Runner-Fälle liegen heute in `document-ai-service.test.ts`)

- `LlmFeatureRunner_NoProvider_ThrowsAiNotConfiguredAndMakesNoCall`
- `LlmFeatureRunner_ProviderThrows_ThrowsUpstreamProviderError`
- `LlmFeatureRunner_ReplyViolatesSchema_ThrowsUpstreamProviderError`
- `LlmFeatureRunner_ReplyTruncated_ThrowsUpstreamProviderError`
- `LlmFeatureRunner_Success_MetersUsageAndReturnsProviderId`
- `LlmFeatureRunner_MeteringFails_StillReturnsResult`

**`server/__tests__/unit/document-ai-service.test.ts`** (umschreiben statt abschwächen: jeder Template-Fall wird zum Fehlerfall; die Erfolgsfälle bleiben)

- `DocumentAiService_SuggestSummaryWithoutProvider_ThrowsAiNotConfigured`
- `DocumentAiService_SuggestLetterWithoutProvider_ThrowsAiNotConfigured`
- `DocumentAiService_ParseWithoutProvider_ThrowsAiNotConfigured`
- `DocumentAiService_ParsePdfWithoutProvider_ThrowsAiNotConfigured`
- `DocumentAiService_AtsWithoutProvider_ThrowsAiNotConfigured`
- `DocumentAiService_PitchWithoutProvider_ThrowsAiNotConfigured`
- `DocumentAiService_OutreachWithoutProvider_ThrowsAiNotConfigured`
- `DocumentAiService_TranslateWithoutProvider_ThrowsAiNotConfigured`
- `DocumentAiService_TailorForMandateWithoutProvider_ThrowsAiNotConfigured`
- `DocumentAiService_ParseProviderReturnsGarbage_ThrowsUpstreamProviderError`
- `DocumentAiService_SuggestWithProvider_ReturnsProviderTagNeverTemplate`

**Weitere Service-Tests** (ändern): `match-ai`-Fälle (`MatchAiService_ExplainWithoutProvider_ThrowsAiNotConfigured`, `…InterviewKit…`, `…Prep…`), `talent-import-service.test.ts` (`TalentImportService_NoProvider_ThrowsAiNotConfiguredBeforeProcessingAnyFile`, `TalentImportService_OneFileFails_OthersStillSucceed`), `assistant.test.ts` (`AutopilotService_NoProvider_ThrowsAiNotConfiguredAndStagesNothing`, `AssistantService_SuggestModeWithoutProvider_RunsDeterministicPlaybook`, `AssistantService_AutopilotWithoutProvider_DoesNotSetLastRunAt`), neuer Cover-Letter-Test (`CoverLetterService_NoProvider_ThrowsAiNotConfiguredAndReturnsNoText`, `CoverLetterService_ProviderFails_ThrowsUpstreamProviderError`, `CoverLetterService_WithProvider_ReturnsTextAndMetersUsage`).

**Domain-Tests**: Tests der gelöschten Fallback-Funktionen entfallen zusammen mit dem Code (`document-ai.test.ts`, `ats-ai.test.ts`, `candidate-pitch.test.ts`, `outreach.test.ts`, `match-explain.test.ts`, `interview-kit.test.ts`, `candidate-prep.test.ts`, `document-parse.test.ts`, `application-tailor.test.ts`; es bleiben die Tests für Prompt-Builder und Parser). `secret-cipher.test.ts` entfällt.

**Adapter/Config/Problem** (`fs-adapters.test.ts`, `config.test.ts`, `problem.test.ts`, `config-validation.test.ts`)

- `FsWorkspaceSettingsStore_UnknownWorkspace_ReturnsNull`
- `FsWorkspaceSettingsStore_SetThenGet_RoundTrips`
- `FsWorkspaceSettingsStore_TwoWorkspaces_AreIsolated`
- `FsWorkspaceSettingsStore_CorruptFile_ReturnsNull`
- `LegacyCleanup_ApiKeysFilePresent_DeletesItAndReturnsTrue`
- `LegacyCleanup_FileMissing_ReturnsFalseAndDoesNotThrow`
- `LegacyCleanup_RunTwice_IsIdempotent`
- `Config_NoLlmKeys_ReportsEmptyKeys` / `Config_WorkspaceSettingsFile_IsInsideStoreDir`
- `ConfigValidation_NoAiKey_AddsWarningNotError`
- `Problem_AiNotConfiguredError_MapsTo503WithTypeAiNotConfigured`
- `Problem_UpstreamProviderError_MapsTo502`

**Persistence-Fabrik** (`persistence-factory.test.ts`): `PersistenceFactory_Fs_ProvidesWorkspaceSettingsStoreAndNoApiKeyStore`, `PersistenceFactory_Sql_ProvidesWorkspaceSettingsStoreAndNoApiKeyStore`. `account-service.test.ts` und `registries`-Tests: den Löschschritt „api-keys“ entfernen.

**OpenAPI-Vertrag** (`openapi-contract.test.ts`): `OpenApi_UpdateWorkspaceSettingsInput_DocumentsEveryZodField`, `OpenApi_VermittlerRoutes_Document404`, `OpenApi_AiRoutes_Document503`, `OpenApi_KeyRoutes_AreRemoved`.

**Frontend (Vitest + Testing Library, `UI/__tests__/`)**

`terminology.test.js` (neu, AK-0.4)

- `UiStrings_AllShippedKitFiles_ContainNoForbiddenTerms`
- `UiStrings_Scanner_FlagsSeededPersonTalentMandateAndWorkspaceMandant` (Selbsttest des Scanners mit eingebetteten Quelltexten)
- `UiStrings_Scanner_IgnoresIdentifiersApiPathsAndComments`
- `UiStrings_RenderedViews_ContainNoForbiddenTerms` (rendert Dashboard, Mandanten-Raster, Suchaufträge, Platzierungen, Stellen, Bewerbungen, Einstellungen, Login und prüft `textContent`, `placeholder`, `title`, `aria-label`)

Verfahren des Scanners: TypeScript-Compiler-API (`typescript` ist bereits Dev-Abhängigkeit) parst jede Nicht-Test-Datei von `UI/` (`*.jsx`, `*.js`, `index.html`-Texte entfallen, da keine UI-Strings enthalten), sammelt `JsxText`, String-, Template-Literale (ohne Imports, Property-Namen, Kommentare) und prüft sie gegen die Verbotsliste:

| Muster                                                                                                         | Bedeutung                                                       | Hinweis                                                                       |
| -------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| `/\bTalent/`                                                                                                   | „Talent“ für die Person (inkl. Talente, Talent-Pool, Talent:in) | Groß geschriebenes „Talent“; Bezeichner und API-Pfade sind klein geschrieben. |
| `/\bMandat/`                                                                                                   | „Mandat“ für den Firmenauftrag (inkl. Mandate, Mandatsfrist)    | „Mandant“ trifft nicht (anderer Stamm).                                       |
| `/\bSuchmandat/`                                                                                               | Altbegriff                                                      | —                                                                             |
| `/\bMandant(en)?\b/` **innerhalb** der Funktionen `SuperAdminCard`, `TenantMembers`, `TeamCard`, `InvitesCard` | „Mandant“ für den Workspace                                     | Kontext aus dem AST; sonst ist „Mandant“ der neue Begriff für die Person.     |
| `/Vermittler-Workspace/`                                                                                       | Altbezeichnung der Wortmarke                                    | auch in `_ds_bundle.js` und `AppShell.jsx` geprüft.                           |

Eine Ausnahmeliste `terminology-allowlist.json` existiert nur mit `{ file, text, reason }` je Eintrag und sollte leer bleiben; ein Test (`UiStrings_Allowlist_HasNoStaleEntries`) schlägt an, wenn ein Eintrag nichts mehr trifft.

`app-navigation.test.jsx` (neu, AK-0.1)

- `Navigation_VermittlungOff_ShowsOnlyWorkspaceMandantenStellenBewerbungenEinstellungen`
- `Navigation_VermittlungOn_AddsSuchauftraegePerformancePostfach`
- `Navigation_VermittlungOff_DoesNotRequestVermittlerResources` (`listMandates`, `listPlacements` werden nicht aufgerufen)
- `Navigation_VermittlungOff_ShowsNoCoRecruiterAction`
- `Navigation_ActiveViewBecomesHidden_FallsBackToWorkspace`
- `Navigation_VermittlungTurnedOnInSettings_ShowsEntriesWithoutReload`
- `Dashboard_VermittlungOff_ShowsApplicationKpisAndNoSuchauftragCard`
- `Dashboard_VermittlungOn_ShowsSuchauftragCard`
- `Dashboard_FreshWorkspace_ShowsOnboardingMandantStelleBewerbung`

`workspace-settings-ui.test.jsx` (neu, AK-0.3 UI)

- `WorkspaceCard_Admin_ShowsVermittlungToggle`
- `WorkspaceCard_Recruiter_DoesNotShowToggle`
- `WorkspaceCard_AdminTurnsOn_CallsApiAndNotifiesParent`
- `WorkspaceCard_ApiReturns403_ShowsErrorAndRevertsToggle`
- `WorkspaceCard_TurnOff_StatesThatDataIsKept`

`ai-gate.test.jsx` (neu, AK-0.6)

- `AiButton_NotConfigured_ShowsHintWithSettingsLinkAndDoesNotCallHandler`
- `AiButton_Configured_CallsHandlerOnClick`
- `AiButton_StatusLoading_IsDisabled`
- `AiStatus_Refresh_UpdatesSubscribers`
- `AiNotConfiguredHint_SettingsLink_NavigatesToSettings`
- Je KI-Einstieg ein Test `<Komponente>_<Aktion>NotConfigured_ShowsHintAndSendsNoRequest` für: Editor (KI anpassen, Übersetzen), CV-Import (Text, PDF), ATS-Dialog, ApplyModal (Zusammenfassung, Anschreiben), Mandanten-Import (`importCvs`), Pitch-/Ansprache-Dialog, Match-Erklärung/Interview-Kit/Vorbereitung, Assistent-Lauf. Jeder Test prüft, dass das gemockte `RecruitApi`-Objekt **nicht** aufgerufen wurde.
- `RecruitApi_Response503AiNotConfigured_ThrowsErrorWithCode` (`data.test.js`)
- `Editor_Server502_ShowsErrorWithRetry` (FR-44 bleibt)

`settings-ai-ui.test.jsx` (neu/ändern, AK-0.7 UI)

- `SettingsView_Rendered_HasNoApiKeyInput`
- `SettingsView_Rendered_DoesNotCallRemovedKeyEndpoints`
- `AiStatusCard_NotConfigured_ShowsOperatorHintWithEnvNames`
- `AiStatusCard_Configured_ShowsActiveProvider`
- `AiStatusCard_ProviderChoice_ListsOnlyAvailableProviders`
- `RecruitApi_KeyMethods_AreRemoved` und `RecruitApi_WorkspaceSettings_UsesGetAndPatch` (`data.test.js`)
- `computeApplicationKpis_CountsSentInterviewOfferHired` (`data.test.js`)

### 6.2 Integration

**Acceptance (Nest, `makeNestApp`, in-memory-Fakes) — `server/__tests__/acceptance/`**

`nest-workspace-settings.test.ts` (neu, AK-0.3)

- `WorkspaceSettings_FreshWorkspace_GetReportsVermittlungOff`
- `WorkspaceSettings_AdminEnablesVermittlung_ReturnsOnAndPersists`
- `WorkspaceSettings_AdminDisablesVermittlung_ReturnsOff`
- `WorkspaceSettings_RecruiterGet_Returns200WithFlag`
- `WorkspaceSettings_RecruiterPatch_Returns403`
- `WorkspaceSettings_PatchWithoutLogin_Returns401`
- `WorkspaceSettings_GetWithoutLogin_Returns401`
- `WorkspaceSettings_InvalidBody_Returns400` (`it.each`: `{}`, `{"vermittlung":"yes"}`, `{"foo":true}`)
- `WorkspaceSettings_TwoWorkspaces_AreIndependent` (`SELF_SERVE_TENANTS=true`, zwei Admins)
- `AuthMe_LoggedIn_ReportsWorkspaceVermittlungFlag`

`nest-vermittlung-switch.test.ts` (neu, AK-0.2) — `describe.each(VERMITTLER_ROUTES)`, 37 Fälle je Test

- `VermittlerRoute_VermittlungOff_Returns404ProblemJson (Rnn …)` (prüft Status 404, `content-type: application/problem+json`, `type` endet auf `not-found`, `detail` „not enabled“; **eine Zeile pro Route**)
- `VermittlerRoute_NoLoginAndVermittlungOff_Returns401 (Rnn …)`
- `VermittlerRoute_VermittlungOn_IsNotBlockedByTheSwitch (Rnn …)` (Status ist nicht das 404 des Schalters)
- `VermittlerRoute_RecruiterRoleAndVermittlungOff_Returns404 (Rnn …)` (Schalter gilt für alle Rollen)
- `VermittlungSwitch_OffThenOn_DataIsUnchanged` (legt Suchauftrag, Candidacy, Platzierung, Beobachtung an; schaltet aus, bestätigt 404; schaltet ein; vergleicht die Listen tief mit dem Zustand davor)
- `VermittlungSwitch_OnInOneWorkspace_OtherWorkspaceStillGets404`
- `VermittlungSwitch_Off_ApplicationServiceRoutesStillWork` (200/201 für `/talents`, `/applications`, `/jobs`, `/talents/:id/documents`, `/ats`, `/settings/usage`, `/members`, `/account/export`)
- `VermittlungSwitch_Off_AccountExportStillContainsMandates` (DSGVO-Daten bleiben vollständig)

`nest-ai-not-configured.test.ts` (neu, AK-0.5) — `describe.each(AI_ROUTES)`, App ohne Provider

- `AiRoute_NoKeyConfigured_Returns503AiNotConfigured (Knn …)` (Status 503, `application/problem+json`, `type` endet auf `ai-not-configured`)
- `AiRoute_NoKeyConfigured_ResponseContainsNoGeneratedText (Knn …)` (Body besteht genau aus den Problem-Feldern `type, title, status, detail`; es fehlen `text`, `paragraphs`, `summary`, `message`, `pitch`, `ats`, `suggestion`, `parsed`, `translation`; der Body enthält weder `template` noch einen Anschreiben-Satz)
- `AiRoute_NoKeyConfigured_NeverCallsAProvider (Knn …)` (`FakeLlmProvider.calls === 0`)
- `AiRoute_NoLoginAndNoKey_Returns401 (Knn …)` (außer K12: dort 503)
- `AiRoute_NoKeyAndInvalidBody_Returns503 (Knn …)` (Guard vor Validierung)
- `AiRoute_FakeProviderConfigured_ReturnsContentTaggedWithProvider (Knn …)` (200/201, `provider` ist `claude`, nie `template`, Nutzung gemessen)
- `AiRoute_OnlyGeminiKeyConfigured_UsesGemini (Knn …)` (Auswahl der Auflösungsregel)
- `AiRoute_ProviderThrows_Returns502UpstreamProvider (Knn …)`
- `AiRoute_ProviderReturnsGarbageJson_Returns502UpstreamProvider` (für die JSON-Routen K02 bis K04, K09 bis K11, K05, K06)
- `AssistantRun_AutopilotWithoutKey_Returns503` (K13), `AssistantRun_SuggestModeWithoutKey_Returns200`
- `CoverLetter_AnonymousWithoutKey_Returns503`
- `SettingsLlm_NoKey_ReportsConfiguredFalse`, `SettingsLlm_WithKey_ReportsConfiguredTrue`
- `SettingsLlm_PutUnavailableProvider_Returns400`
- `SettingsKeys_GetPutDelete_AreGone` (je 404 „Unknown endpoint.“)

**Bestehende Acceptance-Dateien** (ändern, nicht abschwächen): `api.test.ts` (rund 20 Template-Bezüge werden zu Fehler-/Provider-Fällen), `nest-ai-routes.test.ts`, `nest-llm.test.ts` (Key-Tests entfallen, siehe oben), `nest-ops.test.ts`, `nest-documents.test.ts`, `nest-talents.test.ts`, und alle Dateien, die Vermittler-Routen nutzen (`nest-mandates`, `nest-candidacies`, `nest-placements`, `nest-insights`, `nest-ai-routes`, Teile von `api.test.ts`, `nest-ops`): `makeNestApp(config, { vermittlung: true })` bzw. `llmProviders: [new FakeLlmProvider(...)]`.

**Postgres (`server/__tests__/integration/*.integration.test.ts`, mit `DATABASE_URL`)**

`sql-repositories.integration.test.ts` (ändern: `SqlApiKeyStore`-Tests entfernen, neue ergänzen)

- `SqlWorkspaceSettingsStore_UnknownWorkspace_ReturnsNull`
- `SqlWorkspaceSettingsStore_SetThenGet_RoundTrips`
- `SqlWorkspaceSettingsStore_SetTwice_UpdatesInPlace`
- `SqlWorkspaceSettingsStore_TwoWorkspaces_AreIsolated`

`sql-migration.integration.test.ts` (neu, AK-0.7)

- `Migrate_LegacyApiKeysTableWithRows_DropsTableAndRows`
- `Migrate_RunTwice_IsIdempotent`
- `Migrate_RunConcurrentlyFromTwoPools_BothSucceed`
- `Migrate_FreshDatabase_CreatesWorkspaceSettingsTable`
- `Migrate_UsersLlmProviderColumn_IsPreserved`

**Playwright (`e2e/ui.spec.ts`, `e2e/mobile.spec.ts`, API gemockt)**

- `FreshWorkspace_Navigation_ShowsOnlyFiveEntries` (Desktop-Rail: Workspace, Mandanten, Stellen, Bewerbungen + Fuß „Einstellungen“) — AK-0.1
- `FreshWorkspaceMobile_TabBar_ShowsNoVermittlerEntries` (393 px) — AK-0.1
- `AdminTogglesVermittlung_NavigationGainsAndLosesEntries` — AK-0.1/0.3
- `RecruiterRole_SettingsHasNoVermittlungSwitch` — AK-0.3
- `NoAiKey_AiButtonShowsNotConfiguredHintAndSendsNoRequest` (Route-Handler schlägt fehl, wenn `/documents/ai` angefragt wird) — AK-0.6
- `NoAiKey_SettingsShowNotConfiguredStatusAndNoKeyInput` — AK-0.6/0.7
- `ConfiguredKey_AiSummaryAndLetterAreShown` — AK-0.8 (gemockter Provider-Aufruf)
- `AllViews_VermittlungOnAndOff_ContainNoForbiddenTerms` (liest `document.body.innerText` jeder Ansicht) — AK-0.4
- Bestehende Tests, die Mandate/Pipeline/Platzierungen/Postfach zeigen, setzen `workspace.vermittlung: true` in der gemockten `/auth/me`-Antwort und verwenden die neuen Begriffe.

Ausführung: lokal mit einer nicht eingecheckten `playwright.local.config.ts` (`use.launchOptions.executablePath: '/opt/pw-browsers/chromium'`), danach löschen; nie `playwright install`.

### 6.3 Manuell

Siehe Abschnitt 8 (`STORE=sql` und `STORE=fs`, Server wirklich gestartet, weil NestJS bei DI-Fehlern still beendet; deshalb prüft Schritt 1 den Start und `GET /api/v1/health`).

### 6.4 Bestehende Tests, die der Plan anfasst (damit nichts überrascht)

| Bereich                    | Betroffene Tests                                                                                                                                                                                                                                                                                                                                                                                        | Behandlung                                                                                     |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Template-Fallback          | `document-ai-service.test.ts` (31 Bezüge), `api.test.ts` (20), `llm.test.ts`, `assistant.test.ts`, `artifact.test.ts`, `talent-import-service.test.ts`, Domain-Tests der Fallback-Funktionen                                                                                                                                                                                                            | Zu Fehlerfällen umschreiben bzw. mit dem gelöschten Code entfernen; Erfolgsfälle bleiben.      |
| Per-User-Keys              | `nest-llm.test.ts`, `account-service.test.ts`, `fs-adapters.test.ts`, `persistence-factory.test.ts`, `secret-cipher.test.ts`, `sql-repositories.integration.test.ts`, `fakes.ts`, `nest-app.ts`                                                                                                                                                                                                         | Entfernen bzw. durch die Tests aus 6.1/6.2 ersetzen.                                           |
| Vermittler-Routen          | `nest-mandates`, `nest-candidacies`, `nest-placements`, `nest-insights`, `nest-ai-routes`, `nest-ops`, `api.test.ts` (Teile)                                                                                                                                                                                                                                                                            | `vermittlung: true` im Test-Setup.                                                             |
| UI-Begriffe und Navigation | `dashboard.test.jsx`, `responsive-views.test.jsx`, `responsive-settings.test.jsx`, `responsive-assistant.test.jsx`, `mandate-pipeline-board.test.jsx`, `mandate-pipeline-modals.test.jsx`, `matching-apply.test.jsx`, `matching-accent.test.jsx`, `invite-ui.test.jsx`, `super-admin-ui.test.jsx`, `record-form-modal.test.jsx`, `editor-ai-tailor.test.jsx`, `a11y-axe.test.jsx`, `data.test.js` u. a. | Texte und Mocks anpassen (`getApiKeyStatus` entfällt, neue Begriffe, `workspace` in `authMe`). |
| E2E                        | `e2e/ui.spec.ts`, `e2e/mobile.spec.ts`                                                                                                                                                                                                                                                                                                                                                                  | Mocks und Erwartungen anpassen.                                                                |

---

## 7. AK-Matrix

| AK     | Kriterium (Kurzform)                                               | Beleg (Testnamen bzw. Protokollschritt)                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| ------ | ------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AK-0.1 | Frischer Workspace zeigt nur 5 Einträge                            | Vitest `Navigation_VermittlungOff_ShowsOnlyWorkspaceMandantenStellenBewerbungenEinstellungen`, `Navigation_VermittlungOff_DoesNotRequestVermittlerResources`, `Navigation_VermittlungOff_ShowsNoCoRecruiterAction`; Playwright `FreshWorkspace_Navigation_ShowsOnlyFiveEntries`, `FreshWorkspaceMobile_TabBar_ShowsNoVermittlerEntries`; Acceptance `WorkspaceSettings_FreshWorkspace_GetReportsVermittlungOff`; Protokoll 3, 17, 18                                                                            |
| AK-0.2 | Alle Vermittler-Routen 404; Daten bleiben                          | Acceptance `VermittlerRoute_VermittlungOff_Returns404ProblemJson` (37 Routen R01 bis R37), `VermittlerRoute_NoLoginAndVermittlungOff_Returns401`, `VermittlerRoute_VermittlungOn_IsNotBlockedByTheSwitch`, `VermittlungSwitch_OffThenOn_DataIsUnchanged`, `VermittlungSwitch_Off_AccountExportStillContainsMandates`; Unit `RouteInventory_*`; Protokoll 5, 8, 15                                                                                                                                               |
| AK-0.3 | Nur Admin schaltet; andere 403, Schalter unsichtbar                | Acceptance `WorkspaceSettings_RecruiterPatch_Returns403`, `WorkspaceSettings_AdminEnablesVermittlung_ReturnsOnAndPersists`, `WorkspaceSettings_PatchWithoutLogin_Returns401`, `WorkspaceSettings_InvalidBody_Returns400`, `WorkspaceSettings_TwoWorkspaces_AreIndependent`; Vitest `WorkspaceCard_Recruiter_DoesNotShowToggle`, `WorkspaceCard_Admin_ShowsVermittlungToggle`; Playwright `RecruiterRole_SettingsHasNoVermittlungSwitch`; Protokoll 6, 7                                                         |
| AK-0.4 | Keine verbotenen Begriffe in UI-Strings                            | Vitest `UiStrings_AllShippedKitFiles_ContainNoForbiddenTerms`, `UiStrings_Scanner_FlagsSeededPersonTalentMandateAndWorkspaceMandant`, `UiStrings_RenderedViews_ContainNoForbiddenTerms`; Playwright `AllViews_VermittlungOnAndOff_ContainNoForbiddenTerms`; Protokoll 17                                                                                                                                                                                                                                        |
| AK-0.5 | Jede KI-Route 503 `ai-not-configured`, kein Template               | Acceptance `AiRoute_NoKeyConfigured_Returns503AiNotConfigured` (K01 bis K12), `AssistantRun_AutopilotWithoutKey_Returns503` (K13), `AiRoute_NoKeyConfigured_ResponseContainsNoGeneratedText`, `AiRoute_NoKeyConfigured_NeverCallsAProvider`, `CoverLetter_AnonymousWithoutKey_Returns503`; Unit `LlmFeatureRunner_NoProvider_ThrowsAiNotConfiguredAndMakesNoCall`, `DocumentAiService_*WithoutProvider_ThrowsAiNotConfigured`, `CoverLetterService_NoProvider_…`; Protokoll 9                                   |
| AK-0.6 | Ohne Key: Hinweis „KI nicht eingerichtet“ + Link, keine Anfrage    | Vitest `AiButton_NotConfigured_ShowsHintWithSettingsLinkAndDoesNotCallHandler`, `AiNotConfiguredHint_SettingsLink_NavigatesToSettings`, je KI-Einstieg `…NotConfigured_ShowsHintAndSendsNoRequest`; Playwright `NoAiKey_AiButtonShowsNotConfiguredHintAndSendsNoRequest`, `NoAiKey_SettingsShowNotConfiguredStatusAndNoKeyInput`; Protokoll 10                                                                                                                                                                  |
| AK-0.7 | Per-User-Keys ignoriert, idempotent gelöscht (fs+sql), UI entfernt | Integration `Migrate_LegacyApiKeysTableWithRows_DropsTableAndRows`, `Migrate_RunTwice_IsIdempotent`, `Migrate_RunConcurrentlyFromTwoPools_BothSucceed`; Unit `LegacyCleanup_ApiKeysFilePresent_DeletesItAndReturnsTrue`, `LegacyCleanup_RunTwice_IsIdempotent`, `PersistenceFactory_*ProvidesWorkspaceSettingsStoreAndNoApiKeyStore`; Acceptance `SettingsKeys_GetPutDelete_AreGone`; Vitest `SettingsView_Rendered_HasNoApiKeyInput`, `SettingsView_Rendered_DoesNotCallRemovedKeyEndpoints`; Protokoll 11, 12 |
| AK-0.8 | Mit Key funktionieren Zusammenfassung und Anschreiben              | Protokoll 13, 14 (echter Key, manuell). Unterstützend, nicht ersetzend: Acceptance `AiRoute_FakeProviderConfigured_ReturnsContentTaggedWithProvider (K01, K12)`, Unit `CoverLetterService_WithProvider_ReturnsTextAndMetersUsage`, Playwright `ConfiguredKey_AiSummaryAndLetterAreShown`                                                                                                                                                                                                                        |

---

## 8. Manuelles Testprotokoll

Format je Schritt: **Aktion | erwartetes Ergebnis**; beim Durchlauf ergänzt der Implementer die Spalten **tatsächlich** und **ok** und fügt die Tabelle in die PR-Beschreibung ein. Alle Daten sind synthetisch (z. B. „Max Beispiel“, `admin@example.test`). Skripte und Cookie-Dateien liegen im Scratchpad, nicht im Repo.

### 8.0 Vorbereitung (einmal)

- `npm run build`.
- Sicherung/Aufräumen der fs-Daten: `archive/bewerbungen/` enthält getrackte Dateien (`history.jsonl`, `log.json`), die ein laufender fs-Server verändert. Vor dem fs-Durchlauf `git status` notieren, danach `git checkout -- archive/bewerbungen` und alle neuen Dateien dort löschen. Nie committen.
- Gemeinsam: `export APP_SECRET=<zufällig, nur lokal>`, `SELF_SERVE_TENANTS` bleibt aus (ein Workspace `team`, der erste Konto ist Admin, weitere sind `recruiter`).
- KI-Keys: Durchlauf A ohne `ANTHROPIC_API_KEY`/`GEMINI_API_KEY`; Durchlauf B (Schritte 13 und 14) mit echtem Key des Owners. Ist keiner verfügbar, werden 13/14 als „blockiert, Owner-Key nötig“ gemeldet und nicht als „ok“ markiert.

### 8.1 `STORE=sql`

Vorbereitung: `service postgresql start`; `psql -U postgres -c "create database myjob_phase0"`; Start mit `STORE=sql DATABASE_URL=postgres://postgres:postgres@localhost:5432/myjob_phase0 PORT=3100 npm start` (das ist `node server/dist/index.js`). Zum Schluss `drop database myjob_phase0`.

| #   | Aktion                                                                                                                                                                                                                                                                                                  | Erwartet                                                                                                                                                                                  |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Server starten (ohne KI-Key), Log beobachten, `curl /api/v1/health`                                                                                                                                                                                                                                     | Log „Application suite running“, Warnung „no AI key“; `{"status":"ok"}`. (Beweist, dass die DI-Verdrahtung des neuen Moduls nicht still scheitert.)                                       |
| 2   | `POST /api/v1/auth/register` (admin), dann `GET /api/v1/auth/me` mit Cookie                                                                                                                                                                                                                             | 201; `me` enthält Rolle `admin` und `workspace: { vermittlung: false }`.                                                                                                                  |
| 3   | UI im Browser öffnen, anmelden, Navigation ansehen                                                                                                                                                                                                                                                      | Rail: Workspace, Mandanten, Stellen, Bewerbungen; Fuß: Einstellungen. Keine Suchaufträge, Pipeline, Platzierungen, Performance, Postfach, kein „CoRecruiter“. (AK-0.1)                    |
| 4   | Mandant „Max Beispiel“ über die UI anlegen; Bewerbung erfassen                                                                                                                                                                                                                                          | Mandant erscheint im Raster; Bewerbung erscheint unter Bewerbungen; Texte nennen „Mandant“.                                                                                               |
| 5   | Skript ruft alle 37 Routen R01 bis R37 aus Abschnitt 5.2 mit Admin-Cookie auf und gibt Status + `content-type` + `type` aus                                                                                                                                                                             | Jede Zeile: 404, `application/problem+json`, `about:blank#not-found`. Ohne Cookie: jede Zeile 401. (AK-0.2)                                                                               |
| 6   | Zweites Konto registrieren (Rolle `recruiter`), anmelden (zweite Cookie-Datei); `PATCH /settings/workspace {"vermittlung":true}`; in der UI Einstellungen öffnen                                                                                                                                        | 403 `forbidden`; `GET /settings/workspace` 200 `{vermittlung:false}`; in den Einstellungen kein Schalter „Vermittlung“. (AK-0.3)                                                          |
| 7   | Admin: in den Einstellungen Schalter „Vermittlung“ einschalten                                                                                                                                                                                                                                          | UI bestätigt; Navigation zeigt zusätzlich Suchaufträge, Performance, Postfach (ohne Reload); `GET /settings/workspace` liefert `true`. (AK-0.2/0.3)                                       |
| 8   | Suchauftrag „Beispiel GmbH – Backend“ anlegen, Mandant in die Pipeline setzen, Platzierung anlegen. `GET`-Antworten von `/mandates`, `/mandates/:id/candidacies`, `/placements` als JSON sichern (`jq -S`, Hash). Schalter **aus**: alle drei → 404. Schalter **ein**: erneut abrufen, Hash vergleichen | Hash identisch: Daten unverändert. Nach „aus“ verschwinden die Navigationseinträge sofort. (AK-0.2)                                                                                       |
| 9   | Skript ruft K01 bis K12 (und K13 nach `PUT /assistant {"enabled":true,"mode":"autopilot"}`) mit Admin-Cookie und gültigem Body auf, Vermittlung **ein**, kein Key                                                                                                                                       | Jede Zeile: 503, `application/problem+json`, `about:blank#ai-not-configured`; Body hat nur `type,title,status,detail`; kein Text. K13 im Modus `suggest` liefert 200. (AK-0.5)            |
| 10  | UI ohne Key: jeden KI-Button betätigen (Editor „KI anpassen“, „Übersetzen“, CV-Import mit Text, ATS, Anschreiben/Zusammenfassung im Bewerbungsdialog, Mandanten-CV-Import, Match-Erklärung, Assistent-Lauf), Browser-Netzwerk-Log offen                                                                 | Jeder Button zeigt „KI nicht eingerichtet“ mit Link zu den Einstellungen; im Netzwerk-Log keine KI-Anfrage. (AK-0.6)                                                                      |
| 11  | Einstellungen ansehen; `GET/PUT/DELETE /api/v1/settings/keys`                                                                                                                                                                                                                                           | Keine Eingabe für API-Schlüssel; Karte „KI-Anbindung“ zeigt „nicht eingerichtet“ und nennt `ANTHROPIC_API_KEY`/`GEMINI_API_KEY`; die drei Routen antworten 404. (AK-0.7)                  |
| 12  | Server stoppen. In psql `create table api_keys (owner_id text, provider text, value text); insert into api_keys values ('u1','claude','x');`. Server starten. `\dt api_keys`. Server stoppen, erneut starten                                                                                            | Nach dem Start existiert `api_keys` nicht mehr; zweiter Start ohne Fehler, Tabelle weiter nicht vorhanden; `workspace_settings` ist vorhanden, `users.llm_provider` unverändert. (AK-0.7) |
| 13  | Mit `ANTHROPIC_API_KEY=<Owner-Key>` neu starten. UI: Mandant öffnen, Editor, „KI-Zusammenfassung“ erzeugen; „Anschreiben“ erzeugen; `POST /cover-letter` mit Beispiel-Eingabe                                                                                                                           | Text erscheint, Anbieter-Hinweis zeigt den Anbieter (nicht „Template“), keine Meldung „KI nicht eingerichtet“; `/cover-letter` 200. (AK-0.8)                                              |
| 14  | Einstellungen: Karte „KI-Anbindung“ und Nutzungskarte; `GET /settings/llm`                                                                                                                                                                                                                              | `configured: true`, aktiver Anbieter benannt; Nutzungszähler (Anfragen, Tokens) gestiegen. (AK-0.8)                                                                                       |
| 15  | Vermittlung ein, Assistent aktivieren (`PUT /assistant {"enabled":true,"intervalMinutes":15}`; ohne `lastRunAt` ist der erste Lauf beim nächsten Minuten-Tick fällig), **sofort** Vermittlung **aus**, 70 Sekunden warten, Log prüfen                                                                   | Kein „assistant run finished“ für den Workspace; Vermittlung wieder ein und weitere 70 s warten: der Lauf erscheint. (Scheduler-Gate, AK-0.2)                                             |
| 16  | Zweiter Workspace: Server mit `SELF_SERVE_TENANTS=true` starten, neues Konto registrieren (eigener Workspace), dort `GET /mandates`                                                                                                                                                                     | 404 (aus), obwohl der erste Workspace eingeschaltet ist; erster Workspace sieht seine Daten weiter. (Isolation)                                                                           |
| 17  | Playwright-Skript (lokale Config) öffnet jede Ansicht mit Vermittlung aus und ein, schreibt `document.body.innerText` in Dateien; `grep -E "Talent                                                                                                                                                      | Mandat                                                                                                                                                                                    | Vermittler-Workspace"` und Prüfung „Mandant“ nur für Personen | Keine Treffer in den Verbotsmustern; „Mandant“ erscheint nur im Sinn der Person. (AK-0.4) |
| 18  | Mobile (393 px): Tab-Leiste bei Vermittlung aus und ein                                                                                                                                                                                                                                                 | Aus: nur Anwendungs-Einträge, kein Überlauf; ein: zusätzliche Einträge erreichbar, kein horizontaler Scroll. (AK-0.1)                                                                     |
| 19  | Server mit SIGTERM beenden                                                                                                                                                                                                                                                                              | Sauberer Shutdown („shutting down“), Exit 0.                                                                                                                                              |

### 8.2 `STORE=fs`

Vorbereitung: `git status` notieren; Start mit `STORE=fs PORT=3101 npm start` (Daten unter `archive/bewerbungen/`). Danach `git checkout -- archive/bewerbungen`, neu entstandene Dateien dort löschen.

| #   | Aktion                                                                                                                                                                                   | Erwartet                                                                                                              |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| F1  | Start (ohne Key), `GET /health`                                                                                                                                                          | Wie 1; Datei `workspace-settings.json` entsteht erst beim ersten Umlegen.                                             |
| F2  | Registrieren (Admin), `GET /auth/me`; UI-Navigation prüfen                                                                                                                               | Wie 2 und 3.                                                                                                          |
| F3  | Alle 37 Routen ohne und mit Cookie (Skript wie 5)                                                                                                                                        | 404 bzw. 401. (AK-0.2)                                                                                                |
| F4  | Recruiter-Konto: `PATCH /settings/workspace`                                                                                                                                             | 403; kein Schalter in der UI. (AK-0.3)                                                                                |
| F5  | Admin schaltet ein, legt Suchauftrag an, schaltet aus und ein; `archive/bewerbungen/mandates.json` vorher/nachher `sha256sum`                                                            | Hashes gleich; `workspace-settings.json` enthält `{"team":{"vermittlung":true}}`; nach „aus“ `false`. (AK-0.2)        |
| F6  | KI-Routen K01 bis K12 ohne Key                                                                                                                                                           | 503 `ai-not-configured`, kein Text. (AK-0.5)                                                                          |
| F7  | UI-KI-Buttons ohne Key                                                                                                                                                                   | Hinweis, keine Anfrage. (AK-0.6)                                                                                      |
| F8  | Server stoppen. Datei `archive/bewerbungen/api-keys.json` mit synthetischem Inhalt (`[{"ownerId":"u1","provider":"claude","value":"x"}]`) anlegen. Starten. Datei prüfen. Erneut starten | Datei ist nach dem Start gelöscht, Konsole meldet das Entfernen; zweiter Start ohne Meldung und ohne Fehler. (AK-0.7) |
| F9  | `GET/PUT/DELETE /settings/keys`; Einstellungen ansehen                                                                                                                                   | 404; keine Schlüsseleingabe. (AK-0.7)                                                                                 |
| F10 | Mit echtem Key starten, Zusammenfassung und Anschreiben erzeugen                                                                                                                         | Wie 13 und 14. (AK-0.8)                                                                                               |
| F11 | Aufräumen: `git status`; `git checkout -- archive/bewerbungen`; neue Dateien dort entfernen                                                                                              | Arbeitsbaum zeigt nur die Änderungen der Phase.                                                                       |

---

## 9. Risiken und offene Fragen

### 9.1 Risiken

| ID   | Risiko                                                                                                                                                                                                    | Gegenmaßnahme                                                                                                                                                                                |
| ---- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| RI1  | **Vergessene Vermittler-Route** bleibt offen (Scope-Leck der Produktentscheidung).                                                                                                                        | Tabelle `VERMITTLER_ROUTES` + Drift-Wächter über alle Controller (`RouteInventory_*`), Zählprüfung 37.                                                                                       |
| RI2  | **Reihenfolge der Guards**: ein globaler Guard liefe vor `AuthGuard` und kennt den Workspace nicht; falsche Reihenfolge verrät den Schalter an Anonyme.                                                   | Kein `APP_GUARD`; explizite Reihenfolge, getestet (`…GuardOrderIsAuthThenVermittlungThenAi`, `…NoLoginAndVermittlungOff_Returns401`).                                                        |
| RI3  | **Nest beendet bei DI-Fehlern still** (neues Modul, neuer Token, entfernter `API_KEY_STORE`).                                                                                                             | Manuelles Protokoll Schritt 1/F1 startet den echten Server; Acceptance baut `AppModule`-nahe Module; der Fabriktest `PersistenceFactory_*` deckt die Verdrahtung.                            |
| RI4  | **Grosser Testumbau**: rund 20 Template-Bezüge in `api.test.ts`, 31 in `document-ai-service.test.ts`, alle Vermittler-Tests brauchen `vermittlung: true`. Gefahr, Tests zu streichen statt umzuschreiben. | Erfolgs- und Fehlerfälle werden 1:1 umgeschrieben (Tabelle 6.4); der Reviewer vergleicht Test-Anzahl und Coverage vor/nach; gelöschter Code nimmt nur seine eigenen Tests mit.               |
| RI5  | **Coverage ≥ 90 %** (Schwellen unverändert). Neuer Code muss voll abgedeckt sein; die eingefrorene Vermittler-Logik bleibt in der Basis, ihre Tests laufen nur mit eingeschaltetem Schalter.              | `makeNestApp({ vermittlung: true })` in allen Vermittler-Dateien; neue Guards/Stores haben eigene Tests; gelöschte Adapter reduzieren Nenner und Zähler gleichermaßen.                       |
| RI6  | **Rolling Deploy**: `DROP TABLE api_keys` entfernt die Tabelle, während alte Instanzen noch laufen; deren KI-Aufrufe scheitern in der Überlappung.                                                        | Migration läuft vor dem Serven der neuen Instanz; Hinweis im Changelog und in `docs/deployment.md`; andere Routen bleiben unberührt.                                                         |
| RI7  | **Keys sind danach weg**: unwiederbringlich, kein Rollback der Löschung.                                                                                                                                  | In ADR 0057 und Changelog benannt; kein Datenverlust über Keys hinaus (Nutzer geben sie nicht mehr ein). Vor dem Rollout Backup des Postgres-Dumps empfehlen.                                |
| RI8  | **fs-Läufe verändern getrackte Dateien** unter `archive/bewerbungen/` (`history.jsonl`, `log.json`) und legen untrackte JSON-Dateien an.                                                                  | Protokoll 8.0/F11: `git checkout -- archive/bewerbungen` und untrackte Dateien löschen; vor jedem Commit `git status` und Diff prüfen.                                                       |
| RI9  | **UML-SVGs**: `docs:check` verlangt zu jeder `.puml` eine `.svg`; ohne PlantUML lokal können SVGs veraltet sein (Byte-Frische prüft nur der CI-Job `docs.yml`).                                           | Java ist vorhanden; PlantUML-Jar oder Docker-Image zum Rendern verwenden (`plantuml -tsvg -nometadata`). Fällt das aus, SVG per CI-Job rendern lassen und die Abweichung im PR benennen.     |
| RI10 | **Terminologie-Scanner** ist heuristisch (AST statt Laufzeit): er sieht keine dynamisch zusammengesetzten oder vom Server gelieferten Texte.                                                              | Zusätzlich Rendertests je Ansicht und das Playwright-Skript über alle Ansichten; Server-Fehlertexte sind Englisch und erscheinen nicht als UI-Text (die UI zeigt eigene deutsche Meldungen). |
| RI11 | **Doppelte Wahrheit des Namens**: API/Code bleiben `mandates`/`talents`, UI/Doku nutzen die neuen Begriffe; Verwechslungsgefahr für Entwickler.                                                           | Glossar in `docs/architecture.md` (Abschnitt 12) mit der Zuordnungstabelle, Hinweis im ADR; neue Dateien tragen die neue Sprache.                                                            |
| RI12 | **Dashboard/Onboarding** ohne Vermittlung: KPIs (`computeVermittlerKpis`) sind Vermittler-Kennzahlen; ohne Ersatz wirkt der Workspace leer.                                                               | `computeApplicationKpis(apps)` und neue Onboarding-Karten (Mandant, Stelle, Bewerbung); Test `Dashboard_VermittlungOff_ShowsApplicationKpisAndNoSuchauftragCard`.                            |
| RI13 | **Provider-Fehler sichtbar machen**: bisher fing der Template-Fallback auch Anbieter-Ausfälle ab; jetzt sieht der Nutzer 502.                                                                             | UI zeigt eine verständliche Meldung mit „Erneut versuchen“ (FR-44), Log-Eintrag mit Anbieter und Dauer; der Plan sieht keinen automatischen Retry vor.                                       |
| RI14 | **Voreingestellter Modellname** in `server/src/config.ts` (Default für `ANTHROPIC_MODEL`) widerspricht der Repo-Regel „keine Modell-Namen im Code“.                                                       | Nicht Teil dieses Plans (bestehender Zustand), wird aber bei der Berührung der Datei nicht erweitert; Frage Q8.                                                                              |

### 9.2 Offene Fragen an den Owner (Annahme im Plan, bitte bestätigen)

| ID  | Frage                                                                                                                                                                                                                                                                                                                                                                                      | Annahme im Plan                                                                                                                                              |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Q1  | **Bestehende Installationen**: Sollen Workspaces, die schon Suchaufträge/Platzierungen haben, beim Upgrade auf „Vermittlung an“ gesetzt werden, oder gilt „aus“ ausnahmslos?                                                                                                                                                                                                               | Ausnahmslos aus, kein Backfill (so im ADR). Die Daten bleiben, der Admin schaltet ein. Im Changelog als Upgrade-Hinweis.                                     |
| Q2  | **CV-Import und KI**: `parse`, `parse-pdf` und der Massenimport haben heute einen echten deterministischen Parser als Fallback. Ohne Key antworten sie künftig 503. Das macht „CV-PDF hochladen“ am Anfang des goldenen Pfads von einem Key abhängig. Soll es einen ehrlich benannten, nicht-KI „einfachen Import“ (Text-Extraktion in ein Gerüst, klar als solcher gekennzeichnet) geben? | Nein. AK-0.5 verlangt 503 für jede KI-Route. Der Nutzer kann den Mandanten ohne Key manuell anlegen und den CV im Editor eintippen.                          |
| Q3  | **Zuordnung der Grenzfälle**: Sind `documents/pitch` und `documents/outreach` (Kunden-Pitch, Erstansprache), `compliance/agg-check                                                                                                                                                                                                                                                         | rewrite`(AGG-Prüfung einer Kundenanzeige) und`artifacts*`(Outcome-Log) Vermittler? Sind`searches*`(gespeicherte Jobsuchen) und`POST /ats` Bewerbungsservice? | Pitch/Outreach/AGG/Artefakte = Vermittler (R21 bis R23, R34 bis R37); `searches*`, `POST /ats`, `/cover-letter` = Bewerbungsservice. |
| Q4  | **„Pipeline“ in der Navigation**: Der heutige Menüpunkt „Pipeline“ (id `bewerbungen`) ist die Bewerbungs-Stufentafel (`sent` bis `hired`, ADR-0046), nicht die Suchauftrags-Pipeline. AK-0.1 listet „Pipeline“ als unsichtbar und „Bewerbungen“ als sichtbar.                                                                                                                              | Der Menüpunkt wird zu „Bewerbungen“ umbenannt und bleibt immer sichtbar; die Suchauftrags-Pipeline (`MandatePipeline`) hängt unter „Suchaufträge“.           |
| Q5  | **Audit der Schalter-Änderung**: Soll das Umlegen im Audit-Log stehen? Der vorhandene `AuditLog`-Port ist bewerbungsspezifisch.                                                                                                                                                                                                                                                            | Nur `logger.info`, kein Audit-Eintrag in Phase 0.                                                                                                            |
| Q6  | **Super-Admin und Schalter**: Darf ein Instanz-Super-Admin ohne Tenant-Rolle `admin` den Schalter eines fremden Workspaces umlegen?                                                                                                                                                                                                                                                        | Nein (AK-0.3: nur Workspace-Admin). Der Super-Admin verwaltet Mitglieder und Sperren, nicht Produktschalter.                                                 |
| Q7  | **Design-System-Bundle**: `_ds_bundle.js` ist generiert (Design-Handoff). Darf die Wortmarke dort direkt (und in `components/app/AppShell.jsx`) geändert werden?                                                                                                                                                                                                                           | Ja, beide identisch ändern; bei einer Neu-Generierung aus dem Handoff geht die Änderung sonst verloren und muss dort nachgezogen werden.                     |
| Q8  | **Modell-Standardwert** in `config.ts` (siehe RI14): jetzt bereinigen oder später?                                                                                                                                                                                                                                                                                                         | Später, außerhalb von Phase 0.                                                                                                                               |
| Q9  | **Provider-Wahl pro Nutzer** (ADR-0011) behalten oder ganz streichen, da es einen zentralen Key gibt?                                                                                                                                                                                                                                                                                      | Behalten, begrenzt auf verfügbare Anbieter; Streichen wäre ein weiterer Schnitt in `users.llm_provider` ohne Produktnutzen jetzt.                            |
| Q10 | **Echter KI-Key für Protokoll 13/14 und F10**: steht in der Sandbox ein Key zur Verfügung?                                                                                                                                                                                                                                                                                                 | Nein bekannt. Ohne Key bleiben 13/14/F10 „blockiert“ und werden dem Owner zur Abnahme übergeben (AK-0.8 ist per Definition manuell).                         |
