# Phase 0 — Aufräumen & Fundament

> Implementierungsplan (G1). Gehört zu ADR 0057 „Produkt-Schwenk:
> Bewerbungsservice zuerst“. Branch `claude/app-matching-bugs-d0crk0`, Basis
> `origin/main` (5d93036).

---

## 1. Ziel

Phase 0 legt das Fundament für den Bewerbungsservice, ohne bereits Stellen,
Bewerbungen oder Magic Pen zu bauen. Drei Dinge werden geliefert:

1. **Workspace-Schalter `vermittlung`** (Standard **aus**), persistiert in **fs und
   sql**. Ist er aus, sind die Vermittler-Funktionen (Suchaufträge, Pipeline,
   Platzierungen, Performance, Postfach, CoRecruiter) in Navigation **und** API
   unsichtbar; ihre Daten bleiben erhalten.
2. **Neue Begriffe in der ganzen UI** (Mandant, Suchauftrag, Workspace) mit einem
   Test, der die UI-Strings gegen eine Verbotsliste prüft.
3. **Zentraler KI-Key ohne Ersatz-Text**: KI läuft nur noch über
   `ANTHROPIC_API_KEY` (Standard) / `GEMINI_API_KEY` (optional). Ohne Key antwortet
   jede **generative** KI-Route mit `503 problem+json` (`ai-not-configured`) und
   die UI zeigt „KI nicht eingerichtet“. Per-User-Keys werden entfernt (inkl.
   idempotenter Migration) und die Template-Fallbacks für nutzersichtbare
   Generierung entfallen. Deterministische, regelbasierte Funktionen (offline
   Matching, AGG-Check/-Rewrite, ATS-Gap, Grounding, Taxonomie) bleiben
   **unverändert offline verfügbar**.

Dazu: **ADR 0057** (dieser Plan referenziert ihn), Requirements-Update,
Architektur-/Glossar-/CHANGELOG-/OpenAPI-Anpassung — alle in **demselben PR** wie
die Umsetzung, nicht in diesem Plan-Schritt.

## 2. Nicht-Ziele

- **Keine** `JobPosting`-Entität (Phase 1), **kein** Bewerbungs-Editor (Phase 2),
  **kein** Magic Pen (Phase 3), **kein** Mappen-Download-Statuswechsel (Phase 4),
  **kein** Chat-Agent (Phase 5). Die Nav-Einträge „Stellen“ und „Bewerbungen“
  existieren in Phase 0 als **ehrliche Leerzustände** (keine toten Buttons) und
  werden erst in Phase 1/2 gefüllt.
- **Kein** Umbenennen von Code-Bezeichnern (`Talent`, `Mandate`, `Tenant`) —
  nur UI-Texte und Doku. Der `Tenant`-Code wird nur dort angefasst, wo der Schalter
  ihn betrifft (neues Settings-Store, kein Rename).
- **Keine** Weiterentwicklung an den eingefrorenen Vermittler-Funktionen außer dem
  Schalter selbst.
- **Keine** Änderung der deterministischen Nicht-Generierungs-Logik: offline
  Matching (ADR-0007), Grounding (ADR-0009), Skill-Taxonomie (ADR-0008),
  **AGG-Check/-Rewrite** (`domain/agg-check.ts`, regelbasiert), **ATS-Gap**
  (`/api/v1/ats`, `domain/ats.ts`). Diese bleiben unangetastet und bekommen
  **kein** KI-Gate.
- **Kein** Ändern der Coverage-Schwellen; `./test.sh` bleibt grün (≥ 90 %).

## 3. Betroffene Dateien

Legende: _(neu)_ = anzulegen, _(del)_ = zu löschen, sonst ändern.

### 3.1 Domain

| Datei                                             | Änderung                                                                                                                                                     |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `server/src/domain/errors.ts`                     | Neu: `AiNotConfiguredError` (`status = 503`, `type = 'ai-not-configured'`).                                                                                  |
| `server/src/domain/workspace-settings.ts` _(neu)_ | Typ `WorkspaceSettings { vermittlung: boolean }`, Default `{ vermittlung: false }`, zod-Schema `updateWorkspaceSettingsSchema { vermittlung: z.boolean() }`. |
| `server/src/domain/user.ts`                       | Feld `llmProvider` und den `LlmProviderId`-Import aus dem `User`-Interface entfernen (Per-User-Provider-Choice, ADR-0011).                                   |

### 3.2 Ports

| Datei                                                  | Änderung                                                                                                                                                  |
| ------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `server/src/ports/workspace-settings-store.ts` _(neu)_ | `WorkspaceSettingsStore { get(ownerId): Promise<WorkspaceSettings\|null>; set(ownerId, settings): Promise<void> }` — Muster wie `AssistantSettingsStore`. |
| `server/src/ports/api-key-store.ts` _(del)_            | Per-User-Key-Store entfällt vollständig.                                                                                                                  |
| `server/src/ports/user-repository.ts`                  | Methode `setLlmProvider(id, provider)` aus dem Interface entfernen (ADR-0011).                                                                            |

### 3.3 fs-Adapter

| Datei                                                        | Änderung                                                                                                                           |
| ------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------- |
| `server/src/adapters/fs-workspace-settings-store.ts` _(neu)_ | Datei `archive/bewerbungen/workspace-settings.json`, Objekt `{ [ownerId]: { vermittlung } }` (Muster `fs-assistant-store.ts`).     |
| `server/src/adapters/fs-migrations.ts` _(neu)_               | Idempotente Boot-Migration `runFsMigrations(config)`: löscht `archive/bewerbungen/api-keys.json` (`fs.rm(file, { force: true })`). |
| `server/src/adapters/fs-api-key-store.ts` _(del)_            | entfällt.                                                                                                                          |
| `server/src/adapters/fs-user-repository.ts`                  | `setLlmProvider`-Implementierung entfernen.                                                                                        |

### 3.4 sql-Adapter

| Datei                                                             | Änderung                                                                                                                                                                                                                                                                                                                  |
| ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `server/src/adapters/sql/sql-workspace-settings-store.ts` _(neu)_ | Tabelle `workspace_settings`, Spalte `settings jsonb` (Muster `sql-assistant-store.ts`).                                                                                                                                                                                                                                  |
| `server/src/adapters/sql/db.ts`                                   | Idempotente DDL: `CREATE TABLE IF NOT EXISTS workspace_settings (owner_id text PRIMARY KEY, settings jsonb NOT NULL);` · `DROP TABLE IF EXISTS api_keys;` · `ALTER TABLE users DROP COLUMN IF EXISTS llm_provider;` · Zeile `ALTER TABLE users ADD COLUMN IF NOT EXISTS llm_provider text;` aus der Frisch-DDL entfernen. |
| `server/src/adapters/sql/schema.ts`                               | Tabelle `workspaceSettings` ergänzen; `apiKeys`-Definition entfernen; Spalte `users.llmProvider` entfernen.                                                                                                                                                                                                               |
| `server/src/adapters/sql/sql-api-key-store.ts` _(del)_            | entfällt.                                                                                                                                                                                                                                                                                                                 |
| `server/src/adapters/sql/sql-user-repository.ts`                  | `setLlmProvider`-Implementierung entfernen.                                                                                                                                                                                                                                                                               |
| `server/src/adapters/sql/mappers.ts`                              | `llmProvider` aus `rowToUser`/`userToRow` entfernen.                                                                                                                                                                                                                                                                      |

### 3.5 Services

| Datei                                                       | Änderung                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| ----------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `server/src/services/llm-feature-runner.ts`                 | `ApiKeyStore`/`userRepository.llmProvider`-Pfad entfernen; `resolveProvider` nutzt nur Server-Credentials (`llm.active()`) und wirft `AiNotConfiguredError` bei `null`; `run()` wirft bei Generationsfehler `UpstreamProviderError` (502) statt `catch → null`; `parseReply()` wirft `UpstreamProviderError` (502) statt `null`; `runFeature()` verliert den `fallback`-Parameter und liefert nie mehr `provider: 'template'`, `accept`-Ablehnung wirft `UpstreamProviderError`. `withGrounding` bleibt (Grounding ist deterministisch). |
| `server/src/services/llm-service.ts`                        | Komfort-Methode `isConfigured(): boolean` (= `active() !== null`) ergänzen.                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| `server/src/services/cover-letter-service.ts`               | `override { provider, apiKey }`-Pfad entfernen; ohne Server-Key `AiNotConfiguredError` werfen.                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| `server/src/services/document-assist-service.ts`            | `suggest` (Fallback-Zweig `fallbackSummary`/`fallbackLetter`) und `tailorForMandate` (`fallback: () => fallbackTailor(...)`) entfernen → Fehler propagieren. `translateDocuments` wirft künftig via `resolveProvider` `AiNotConfiguredError` statt `ValidationError`.                                                                                                                                                                                                                                                                    |
| `server/src/services/cv-parse-service.ts`                   | `parse` (`fallbackParsed`) entfernen → ohne Provider 503. `parsePdf`: Leer-Text-Zweig (gescanntes PDF) bleibt als **ehrlicher Leerzustand** (kein KI-Text), aber `provider: 'template'` → `provider: 'none'` — **greift nur mit Key** (ohne Key antwortet `AiConfiguredGuard` zuvor mit 503).                                                                                                                                                                                                                                            |
| `server/src/services/ats-ai-service.ts`                     | `scoreAgainstJob` (`fallback: () => fallbackAts(...)`) entfernen → Fehler propagieren.                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| `server/src/services/outreach-ai-service.ts`                | `pitchForMandate` (`fallbackPitch`) und `outreach` (`fallbackOutreach`) entfernen → Fehler propagieren.                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `server/src/services/match-ai-service.ts`                   | `explainMatch` (`fallbackExplanation`), `interviewKit` (`fallbackInterviewKit`) entfernen. `candidatePrep`: `fallback: () => base` entfällt; die deterministische `base` (Company-Profil + Anforderungen + Stärken, Flywheel ADR-0006) bleibt **nur als Prompt-Grundlage** für `prepPrompt` und wird nicht mehr als Ergebnis ausgeliefert; ohne Key wirft die Route 503 wie jede generative Route (§5.3).                                                                                                                                |
| `server/src/services/workspace-settings-service.ts` _(neu)_ | `get(scope): Promise<{ vermittlung: boolean }>` (Default `false`) und `setVermittlung(scope, vermittlung)` über das Store.                                                                                                                                                                                                                                                                                                                                                                                                               |
| `server/src/services/autopilot-service.ts`                  | `propose` darf `AiNotConfiguredError` **nicht** mehr verschlucken: der `catch { logger.warn(...); continue; }` (Z. 124–132) reicht `AiNotConfiguredError`/`UpstreamProviderError` hoch, damit `/assistant/run` ohne Key `503` antwortet (Owner-Entscheidung §9-6); sonstige Build-Fehler weiterhin loggen + skippen.                                                                                                                                                                                                                     |

> **Fehlerpfad-Regel (verbindlich):** Ohne Provider/Key → `AiNotConfiguredError`
> (503). Provider vorhanden, aber Upstream wirft (Timeout/5xx) oder liefert
> ungültiges/leeres JSON → `UpstreamProviderError` (502). Es wird **nie** mehr
> Template-Text mit `provider: 'template'` ausgeliefert (ADR 0057, FR-43).

### 3.6 Nest-Module / Controller / Guards

| Datei                                                                     | Änderung                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| ------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `server/src/nest/tokens.ts`                                               | Neu: `WORKSPACE_SETTINGS_STORE`, `WORKSPACE_SETTINGS_SERVICE`; `API_KEY_STORE` entfernen.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| `server/src/nest/persistence.module.ts`                                   | `[WORKSPACE_SETTINGS_STORE, 'workspaceSettingsStore']` in `REPO_BINDINGS`; `API_KEY_STORE`-Zeile entfernen.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| `server/src/adapters/persistence-factory.ts`                              | `workspaceSettingsStore` (fs + sql) verdrahten; `apiKeyStore` entfernen. Damit **toten Code entfernen**: `SecretCipher`-Import (Z. 48), `const secretCipher = new SecretCipher({ config })` (Z. 108) und die `secretCipher`-Argumente der beiden Api-Key-Stores (Z. 126/151).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `server/src/adapters/secret-cipher.ts` _(del)_                            | Wird nach dem `apiKeyStore`-Entfernen nirgends mehr referenziert (nur `fs-api-key-store`/`sql-api-key-store`/`persistence-factory`); samt Unit-Test `server/__tests__/unit/secret-cipher.test.ts` löschen. `config.security.encryptionSecret` **bleibt** — Better-Auth nutzt ihn weiter (`index.ts` Z. 41, `infra.module.ts` Z. 60).                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `server/src/nest/vermittlung.guard.ts` _(neu)_                            | `VermittlungGuard` (CanActivate): liest Scope via `currentScope(req)`, lädt `WorkspaceSettingsStore`, wirft `NotFoundError` (404) wenn `vermittlung === false`. Läuft **nach** `AuthGuard`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| `server/src/nest/ai-configured.guard.ts` _(neu)_                          | `AiConfiguredGuard` (CanActivate): wirft `AiNotConfiguredError` (503) wenn `LlmService.isConfigured() === false`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| `server/src/nest/workspace-settings/workspace-settings.module.ts` _(neu)_ | `WorkspaceSettingsController` unter `/api/v1/settings/workspace` (Details §5.1).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `server/src/nest/ai/ai.module.ts`                                         | `AiConfiguredGuard` als Provider; `API_KEY_STORE`-Dependency aus `LLM_FEATURE_RUNNER`-Factory entfernen.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| `server/src/nest/ai/documents-ai.controller.ts`                           | Guards **per Route** setzen (Nest führt Klassen-Guards **vor** Methoden-Guards aus): Klassen-Level bleibt `@UseGuards(AuthGuard, AiRateLimitGuard, PlanGuard)` + `@RequiresPlan('pro')`; die 5 Nicht-Vermittler-Routen (`ai`, `parse`, `parse-pdf`, `ats`, `translate`) bekommen `@UseGuards(AiConfiguredGuard)`; die 2 Vermittler-Routen (`pitch`, `outreach`) bekommen `@UseGuards(VermittlungGuard, AiConfiguredGuard)` — **in dieser Reihenfolge**, damit „Vermittlung aus“ **404 vor** 503 kommt. **Kein** `AiConfiguredGuard` auf Klassen-Level. Reihenfolge damit: `AuthGuard → AiRateLimitGuard → PlanGuard/RequiresPlan('pro') → VermittlungGuard → AiConfiguredGuard`; ein Free-Plan-User bekommt bei Vermittlung aus daher **402 vor 404** (Pro-Gate hat Vorrang — gewollt, Owner §9-8). |
| `server/src/nest/llm/llm.module.ts`                                       | `settings/keys`-Routen (GET/PUT/DELETE) entfernen; `PUT settings/llm` und `storedProvider()` (Per-User-Provider) entfernen, `GET settings/llm` auf reinen Server-Status reduzieren; `/cover-letter` bekommt `AiConfiguredGuard`; `API_KEY_STORE`-Dependency entfernen.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| `server/src/nest/registries.module.ts`                                    | `api-keys`-Registrierung in der Personal-Data-Registry entfernen.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| `server/src/nest/app.module.ts`                                           | `WorkspaceSettingsModule` in `FEATURE_MODULES`; `VermittlungGuard`/`AiConfiguredGuard` global verfügbar machen.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| Vermittler-Controller                                                     | `VermittlungGuard` ergänzen: `mandates`, `candidacies`, `match`, `match-ai`, `observations`, `placements`, `forecast`, `mail`, `assistant`, `applications`, `searches` (§5.4, Liste).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| `server/src/index.ts`                                                     | `runFsMigrations(config)` beim Boot aufrufen (idempotent).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |

### 3.7 OpenAPI / Doku / Config

| Datei                  | Änderung                                                                                                                                                                                                    |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `server/openapi.yaml`  | Neue `settings/workspace`-Routen; `settings/keys` und `PUT settings/llm` entfernen; `ai-not-configured` (503) und Vermittler-404 dokumentieren; `cover-letter`/generative Routen ohne Fallback beschreiben. |
| `server/src/config.ts` | `apiKeysFile` entfernen; kein neuer Config-Key nötig (`vermittlung` ist persistiert, nicht env).                                                                                                            |
| `docs/requirements.md` | Neue FR für den Bewerbungs-Flow (goldener Pfad), FR „Workspace-Schalter Vermittlung“, NFR „kein stiller KI-Fallback“; FR-30/31/43 anpassen (Fallback/Per-User-Keys entfallen).                              |
| `docs/architecture.md` | §9-ADR-Tabelle um 0057; §12-Glossar (Mandant/Suchauftrag/Workspace); KI-Kapitel (zentraler Key, kein Fallback).                                                                                             |
| `CHANGELOG.md`         | Eintrag Phase 0.                                                                                                                                                                                            |

### 3.8 UI-Komponenten & `data.js`

Die Navigation rendert über `A.AppShell` (Prop `nav` = Rail-Einträge aus `NAV`),
zwei Fold-in-`subTabs` (Matching unter „Mandate“, Platzierungen unter „Performance“)
und eine Topbar-Action („CoRecruiter“); „Einstellungen“ ist ein Fuß-Utility der
Shell (nicht im `NAV`-Array). Konkret:

| Datei                                                                                                                                                                                                          | Änderung                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `design/myjob/ui_kits/recruiting/app.jsx`                                                                                                                                                                      | `NAV`: Rail-Eintrag `pool` → Label „Mandanten“ (war „Talent-Pool“); neue Rail-Einträge `stellen` → „Stellen“ (Leerzustand) und „Bewerbungen“ (Leerzustand) statt des alten Pipeline-Rail-Eintrags. `TITLES`/`activeNavId`/`subTabs`/`actions`/`renderShell`: Vermittler-Ziele (`mandate`/Suchaufträge, Pipeline, `berichte`/Performance, `postfach`), die `subTabs` (Matching, Platzierungen) und die „CoRecruiter“-Topbar-Action nur rendern, wenn `vermittlung` an. „Einstellungen“ bleibt Fuß-Utility. |
| `design/myjob/ui_kits/recruiting/Workspace.jsx`                                                                                                                                                                | Texte: „Talent“→„Mandant“, „Mandat“→„Suchauftrag“; Dashboard-/Onboarding-Texte umstellen.                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `design/myjob/ui_kits/recruiting/SettingsView.jsx`                                                                                                                                                             | Per-User-Key-UI (`ProviderRow` mit „Schlüssel speichern“) entfernen; neue Karte „KI-Einrichtung“ (Status „KI nicht eingerichtet“ + Link) und „Workspace“-Karte mit `vermittlung`-Schalter (nur Admin sichtbar). Super-Admin-Console: „Mandant“→„Workspace“ (Z. 336/407/415).                                                                                                                                                                                                                              |
| `design/myjob/ui_kits/recruiting/data.js`                                                                                                                                                                      | `RecruitApi`: `getWorkspaceSettings()` / `setWorkspaceSettings({ vermittlung })`; `getApiKeyStatus`/`setApiKey`/`removeApiKey`/`setLlmProvider` entfernen.                                                                                                                                                                                                                                                                                                                                                |
| `design/myjob/ui_kits/recruiting/TalentProfile.jsx`, `Matching.jsx`, `MandatePipeline.jsx`, `PipelineBoard.jsx`, `AssistantView.jsx`, `Editor*.jsx`, `RecordFormModal.jsx`, `ApplyModal.jsx`, `DataStates.jsx` | UI-Texte auf neue Begriffe; KI-Buttons: ohne Key „KI nicht eingerichtet“ + Link zu Einstellungen, keine Anfrage (AK-0.6).                                                                                                                                                                                                                                                                                                                                                                                 |
| `design/myjob/screens/*.html`, `design/myjob/components/**`                                                                                                                                                    | **Vollständig** umstellen (Owner-Entscheidung §9-3): auch hier „Talent“→„Mandant“, „Mandat“→„Suchauftrag“, Workspace-„Mandant“→„Workspace“. Die Verbotslisten-Prüfung (AK-0.4) scannt diese Bereiche mit (§6.5).                                                                                                                                                                                                                                                                                          |

### 3.9 Test-Support

**Neu (für die „mit Key“-Acceptance-Fälle):**

| Datei                                           | Änderung                                                                                                                                                |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `server/__tests__/support/fakes.ts`             | `InMemoryApiKeyStore` (Import Z.45, Klasse Z.603) entfernen; `FakeLlmProvider`/`FakeLlmService` (liefert feste Antwort, `available = true`) ergänzen.   |
| `server/__tests__/support/nest-app.ts`          | `API_KEY_STORE`-Provider (Import Z.41/79, Provider Z.151) entfernen; optionale Injektion eines Fake-`LlmService` (bzw. Fake-Provider) in `makeNestApp`. |
| `server/__tests__/support/build-document-ai.ts` | `apiKeyStore`-Dependency (Z.10/28/40) entfernen.                                                                                                        |

**Bereinigen (alle Referenzen auf den gelöschten Code `ApiKeyStore`/`SecretCipher`/`config.apiKeysFile`):**

| Datei                                                               | Anpassungspunkt                                                                                                               |
| ------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `server/__tests__/acceptance/nest-ops.test.ts`                      | `API_KEY_STORE`/`InMemoryApiKeyStore` (Z.45/68/124) entfernen.                                                                |
| `server/__tests__/acceptance/nest-ai-routes.test.ts`                | `API_KEY_STORE`/`InMemoryApiKeyStore` (Z.36/50/104) entfernen.                                                                |
| `server/__tests__/acceptance/nest-llm.test.ts`                      | `API_KEY_STORE`/`InMemoryApiKeyStore` (Z.19/24/48) entfernen.                                                                 |
| `server/__tests__/acceptance/nest-talents.test.ts`                  | `API_KEY_STORE` (Z.22/63) entfernen.                                                                                          |
| `server/__tests__/integration/sql-repositories.integration.test.ts` | `SqlApiKeyStore`/`SecretCipher`-Block (Z.12/15/289/290) entfernen.                                                            |
| `server/__tests__/unit/persistence-factory.test.ts`                 | `FsApiKeyStore`/`SqlApiKeyStore`-Imports und `p.apiKeyStore`-Assertions (Z.19/20/39/53) entfernen.                            |
| `server/__tests__/unit/secret-cipher.test.ts` _(del)_               | löschen (bereits §3.6).                                                                                                       |
| `server/__tests__/unit/account-service.test.ts`                     | `InMemoryApiKeyStore` (Z.8/35/46/48/49/91) und den „personal keys erased“-Erase-Schritt samt Assertion (Z.204/222) entfernen. |
| `server/__tests__/unit/assistant.test.ts`                           | `InMemoryApiKeyStore` (Z.42/168) entfernen.                                                                                   |
| `server/__tests__/unit/talent-import-service.test.ts`               | `InMemoryApiKeyStore` (Z.16/70) entfernen.                                                                                    |
| `server/__tests__/unit/fs-adapters.test.ts`                         | `FsApiKeyStore`-`describe` (Z.240–287), `SecretCipher`-Import (Z.29) und `apiKeysFile`-Feld (Z.59) entfernen.                 |
| `server/__tests__/unit/document-ai-service.test.ts`                 | `InMemoryApiKeyStore` (Z.13/56/94) entfernen.                                                                                 |
| `server/__tests__/unit/nest-ai-module.test.ts`                      | `API_KEY_STORE` (Z.11/38) entfernen.                                                                                          |

> Ohne diese Bereinigung kompiliert die Test-Suite nicht mehr (`./test.sh` rot,
> TS/ESLint `noUnusedLocals`). Jede Datei verliert nur die Api-Key-/Cipher-Bezüge;
> die übrigen Assertions bleiben unverändert.

## 4. Datenmodell + Migration

### 4.1 Neues Persistenzmodell: `WorkspaceSettings`

- **Shape:** `{ vermittlung: boolean }`. Default beim Fehlen eines Datensatzes:
  `{ vermittlung: false }` (frischer Workspace = aus, AK-0.1).
- **Schlüssel:** `ownerId` = Scope/Tenant (`CurrentScope`, Default `'team'`). Bewusst
  **nicht** ans `Tenant`-Record gebunden (das implizite `DEFAULT_TENANT` hat keine
  Zeile und soll den Schalter trotzdem speichern können) — gleiches Muster wie
  `assistant_settings` und `retention_policies`.

### 4.2 fs

- Datei `archive/bewerbungen/workspace-settings.json`, Objekt
  `{ "<ownerId>": { "vermittlung": false } }`. Lesen: fehlende Datei/fehlender Key →
  `null` → Service liefert Default. Schreiben: `mkdir -p` + `writeFile`
  (Muster `fs-assistant-store.ts`).

### 4.3 sql (idempotente DDL in `server/src/adapters/sql/db.ts`)

```sql
CREATE TABLE IF NOT EXISTS workspace_settings (
  owner_id text PRIMARY KEY,
  settings  jsonb NOT NULL
);
DROP TABLE IF EXISTS api_keys;
ALTER TABLE users DROP COLUMN IF EXISTS llm_provider;
```

Zusätzlich wird die Zeile `ALTER TABLE users ADD COLUMN IF NOT EXISTS llm_provider
text;` aus der Frisch-DDL entfernt (neue Installationen legen die Spalte gar nicht
mehr an). Die `apiKeys`-Drizzle-Definition in `schema.ts` entfällt; `db.ts` führt
`DROP TABLE IF EXISTS api_keys` weiterhin aus, damit auch Alt-Datenbanken bereinigt
werden.

### 4.4 Migration Per-User-Keys (fs)

- `runFsMigrations(config)` in `server/src/adapters/fs-migrations.ts`, beim Boot aus
  `server/src/index.ts` aufgerufen: löscht `archive/bewerbungen/api-keys.json`
  (`fs.rm(file, { force: true })` — idempotent). Das Feld `config.apiKeysFile`
  entfällt; der Pfad wird aus `config.storeDir` abgeleitet. Automatisiert getestet
  in `server/__tests__/unit/fs-migrations.test.ts` (§6.1).

### 4.5 Kein Datenverlust der Vermittler-Daten

Der Schalter versteckt die Vermittler-**Routen** (404) und **Nav-Einträge**; er
löscht **keine** Mandate/Candidacies/Platzierungen/etc. Nach dem Einschalten sind
alle Daten unverändert vorhanden (AK-0.2).

## 5. API

### 5.1 Neu: Workspace-Einstellungen

| Methode | Route                        | zod-Schema                     | Erfolg                         | Fehler                                                                                         |
| ------- | ---------------------------- | ------------------------------ | ------------------------------ | ---------------------------------------------------------------------------------------------- |
| `GET`   | `/api/v1/settings/workspace` | —                              | `200 { vermittlung: boolean }` | `401` ohne Session                                                                             |
| `PATCH` | `/api/v1/settings/workspace` | `{ vermittlung: z.boolean() }` | `200 { vermittlung: boolean }` | `401` ohne Session · `403` Nicht-Admin · `400` ungültiger Body (`vermittlung` fehlt/kein bool) |

- Beide Routen: `AuthGuard`. `PATCH` zusätzlich `RolesGuard` + `@Can('workspace', 'update')`.
- `RoleAuthorizer`-Policy: `workspace: { update: ['admin'] }` ergänzen (AK-0.3).

### 5.2 Entfernt: Per-User-Keys & Provider-Choice

- `GET/PUT/DELETE /api/v1/settings/keys[/:provider]` → entfernt.
- `PUT /api/v1/settings/llm` → entfernt; `GET /api/v1/settings/llm` liefert nur noch
  den Server-Status (welcher Provider zentral konfiguriert ist, `available`), ohne
  Per-User-`current`.

### 5.3 Generative KI-Routen: 503 `ai-not-configured` (AK-0.5)

Alle **generativen** KI-Routen erhalten `AiConfiguredGuard` (wirft
`AiNotConfiguredError`). Ohne `ANTHROPIC_API_KEY` **und** ohne `GEMINI_API_KEY`
antworten sie mit:

```json
{
  "type": "about:blank#ai-not-configured",
  "title": "AiNotConfiguredError",
  "status": 503,
  "detail": "KI nicht eingerichtet — konfiguriere ANTHROPIC_API_KEY (oder GEMINI_API_KEY) in den Server-Umgebungsvariablen."
}
```

Betroffene Routen (aus dem Code abgeleitet — nur LLM-token-verbrauchende Routen):

| Methode | Route                                                     | Feature                                          | Service                                    | Vermittler-KI? |
| ------- | --------------------------------------------------------- | ------------------------------------------------ | ------------------------------------------ | -------------- |
| `POST`  | `/api/v1/talents/:id/documents/ai`                        | Zusammenfassung/Anschreiben (`summary`/`letter`) | `DocumentAssistService.suggest`            | nein           |
| `POST`  | `/api/v1/talents/:id/documents/parse`                     | CV-Parse (Text)                                  | `CvParseService.parse`                     | nein           |
| `POST`  | `/api/v1/talents/:id/documents/parse-pdf`                 | CV-Parse (PDF)                                   | `CvParseService.parsePdf`                  | nein           |
| `POST`  | `/api/v1/talents/:id/documents/ats`                       | ATS-Bewertung (LLM)                              | `AtsAiService.scoreAgainstJob`             | nein           |
| `POST`  | `/api/v1/talents/:id/documents/translate`                 | Übersetzung                                      | `DocumentAssistService.translateDocuments` | nein           |
| `POST`  | `/api/v1/cover-letter`                                    | Anschreiben (Mandant)                            | `CoverLetterService.generate`              | nein           |
| `POST`  | `/api/v1/talents/:id/documents/pitch`                     | Pitch                                            | `OutreachAiService.pitchForMandate`        | ja             |
| `POST`  | `/api/v1/talents/:id/documents/outreach`                  | Ansprache                                        | `OutreachAiService.outreach`               | ja             |
| `POST`  | `/api/v1/mandates/:id/candidates/:talentId/explain`       | Match-Erklärung                                  | `MatchAiService.explainMatch`              | ja             |
| `POST`  | `/api/v1/mandates/:id/candidates/:talentId/interview-kit` | Interview-Kit                                    | `MatchAiService.interviewKit`              | ja             |
| `POST`  | `/api/v1/mandates/:id/candidates/:talentId/prep`          | Vorbereitung                                     | `MatchAiService.candidatePrep`             | ja             |

**Ausdrücklich NICHT generativ** (deterministisch, regelbasiert, **kein** KI-Gate,
bleiben offline verfügbar — FR-40/FR-41, NFR-08):

- `POST /api/v1/ats` → `AtsService.analyze` → `domain/ats.ts analyzeGap`
  (Skill-Extractor + Kandidatenprofil, kein LLM).
- `POST /api/v1/compliance/agg-check` → `domain/agg-check.ts checkAgg` (regelbasiert).
- `POST /api/v1/compliance/agg-rewrite` → `domain/agg-check.ts rewriteAgg`
  (regelbasiert, kein LLM).
- `POST /api/v1/mandates/:id/match` → offline Matching (ADR-0007).

Guard-Reihenfolge auf Vermittler-KI-Routen (pitch/outreach): Klassen-Level
`AuthGuard, AiRateLimitGuard, PlanGuard` → Methoden-Level `VermittlungGuard,
AiConfiguredGuard` (siehe §3.6). Bei ausgeschalteter Vermittlung kommt zuerst
`404` (VermittlungGuard vor AiConfiguredGuard); bei eingeschalteter, aber
fehlendem Key `503`. Der Klassen-Level `PlanGuard`/`@RequiresPlan('pro')` läuft
**vor** `VermittlungGuard` — ein Free-Plan-User bekommt bei Vermittlung aus
**402 vor 404** (Pro-Gate hat Vorrang, gewollt — Owner §9-8).

**CoRecruiter/Assistant** (`/assistant/run`, `/assistant/suggestions/*`): Der
Autopilot baut Bewerbungs-Pakete über `ApplicationBuilder` →
`DocumentAssistService.tailorForMandate` (→ `runFeature('tailor')`) und ist damit
**generativ**, bekommt aber **kein** eigenständiges `AiConfiguredGuard` — er hat
zusätzlich deterministische Schritte (Shortlists, Nudges, Datenlücken).
**Entscheidung (Owner, §9-6):** `AutopilotService.propose` verschluckt
`AiNotConfiguredError`/`UpstreamProviderError` **nicht** mehr (bisher
`catch { logger.warn(...); continue; }`, `autopilot-service.ts` Z. 124–132);
der Fehler wird hochgereicht, sodass `/assistant/run` **ohne Key mit `503`
antwortet** (kein stiller Fehlschlag, ADR-0047). Bei ausgeschalteter Vermittlung
404-en diese Routen ohnehin zuerst.

### 5.4 Vermittler-Routen: 404 bei ausgeschalteter Vermittlung (AK-0.2)

`VermittlungGuard` antwortet mit `404 problem+json` (`about:blank#not-found`), als
existiere die Route in diesem Workspace nicht. Vollständige Liste:

| Modul                        | Routen                                                                                                                                                                      |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `mandates`                   | `GET/POST /mandates`, `PATCH/DELETE /mandates/:id`                                                                                                                          |
| `candidacies`                | `GET/POST /mandates/:id/candidacies`, `GET /talents/:id/candidacies`, `PATCH/DELETE /candidacies/:id`                                                                       |
| `match`                      | `POST /mandates/:id/match`                                                                                                                                                  |
| `match-ai`                   | `POST /mandates/:id/candidates/:talentId/{explain,interview-kit,prep}`                                                                                                      |
| `observations`               | `GET/POST /mandates/:id/observations`                                                                                                                                       |
| `placements`                 | `GET/POST /placements`, `PATCH/DELETE /placements/:id`                                                                                                                      |
| `forecast`                   | `GET /forecast`                                                                                                                                                             |
| `mail`                       | `POST /talents/:id/outreach/send`, `POST /mail/sync-replies`, `GET /mail/status`                                                                                            |
| `assistant`                  | `GET/PUT /assistant`, `POST /assistant/run`, `GET /assistant/suggestions`, `POST /assistant/suggestions/:id/{accept,dismiss}`, `GET /assistant/suggestions/:id/dossier.pdf` |
| `applications`               | `GET/POST /applications`, `GET /history`, `POST /applications/build`, `PATCH/DELETE /applications/:id`                                                                      |
| `searches`                   | `GET/POST /searches`, `DELETE /searches/:id`, `GET /searches/:id/run`                                                                                                       |
| `documents` (pitch/outreach) | `POST /talents/:id/documents/pitch`, `POST /talents/:id/documents/outreach`                                                                                                 |

**Nicht** versteckt: `talents`/`documents`/`attachments` (Mandant + CV), `jobs`
(Stellen-Suche), `ats`/`compliance` (deterministische AI-Hilfen),
`retention`/`account`/`auth`/`members`/`invites`/`tenant-admin`/`settings/usage`/
`settings/workspace`.

## 6. Testplan

Testnamen im Format `Subject_StateUnderTest_ExpectedBehaviour` (Arrange–Act–Assert).
KI in Unit-Tests immer über einen Fake-`LlmService`/`FakeLlmProvider`.

### 6.0 Vollständige Liste: Dateien mit Referenzen auf entfernten Code

**Verbindlich (Owner-Entscheidung §9-7, Runde-3-Befund 1).** Alle Dateien, die auf
gelöschte Ports/Stores/Fallbacks (`api-key-store.ts`, `secret-cipher.ts`,
`API_KEY_STORE`, `setLlmProvider`, Template-Fallbacks, `settings/keys`-Routen)
referenzieren, werden angepasst oder entfernt. §6.1/§6.2 listen die _neuen_
Tests; diese Liste ergänzt sie um die _Bestands_-Dateien:

| Datei                                                               | Änderung                                                                                                                                                                                                                                                                                                                                                                                           |
| ------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `server/__tests__/support/fakes.ts`                                 | `InMemoryApiKeyStore` (Referenz auf gelöschtes `ports/api-key-store.ts`) entfernen; `apiKeyStore`-Dependencies raus                                                                                                                                                                                                                                                                                |
| `server/__tests__/support/nest-app.ts`                              | `API_KEY_STORE`-Provider und `InMemoryApiKeyStore`-Import entfernen; `LlmService` ohne Key-Store bauen                                                                                                                                                                                                                                                                                             |
| `server/__tests__/support/build-document-ai.ts`                     | `ApiKeyStore`-Dependency entfernen                                                                                                                                                                                                                                                                                                                                                                 |
| `server/__tests__/unit/secret-cipher.test.ts`                       | **löschen** (mit `adapters/secret-cipher.ts`)                                                                                                                                                                                                                                                                                                                                                      |
| `server/__tests__/unit/persistence-factory.test.ts`                 | `API_KEY_STORE`-Registrierung entfernen                                                                                                                                                                                                                                                                                                                                                            |
| `server/__tests__/unit/nest-ai-module.test.ts`                      | `API_KEY_STORE`/`InMemoryApiKeyStore`-Referenzen entfernen                                                                                                                                                                                                                                                                                                                                         |
| `server/__tests__/unit/account-service.test.ts`                     | `apiKeyStore`-Erase-Purger aus dem Account-Lösch-Flow entfernen                                                                                                                                                                                                                                                                                                                                    |
| `server/__tests__/unit/assistant.test.ts`                           | `apiKeyStore`-Dependencies entfernen                                                                                                                                                                                                                                                                                                                                                               |
| `server/__tests__/unit/document-ai-service.test.ts`                 | Fallback-/`setLlmProvider`-Referenzen anpassen (kein `template`-Fallback mehr)                                                                                                                                                                                                                                                                                                                     |
| `server/__tests__/unit/talent-import-service.test.ts`               | `NoProvider_FallsBackToPlaceholderName` (Template-Parse-Fallback) umstellen → `NoProvider_ImportReportsFailureAndRollsBack`                                                                                                                                                                                                                                                                        |
| `server/__tests__/acceptance/api.test.ts`                           | `ApiKeys_Unauthenticated_Returns401` · `ApiKeys_SetStatusRemove_Flow` · `ApiKeys_UnknownProvider_Returns400` **entfernen** (Routen weg); `CoverLetter_Post_FallsBackToTemplate` **entfernen** (ohne Key jetzt 503 — abgedeckt durch `Ai_CoverLetter_NoKey_Returns503` in `nest-llm.test.ts`); `PUT /settings/llm`-400-Test entfernen (`PUT settings/llm` entfällt, `GET` bleibt als Server-Status) |
| `server/__tests__/acceptance/nest-ops.test.ts`                      | `parsePdf`-Erwartung `provider: 'template'` → `provider: 'none'` (§3.5)                                                                                                                                                                                                                                                                                                                            |
| `server/__tests__/acceptance/nest-talents.test.ts`                  | LLM-Fallback-Erwartungen auf die neuen Fehlerpfade umstellen                                                                                                                                                                                                                                                                                                                                       |
| `server/__tests__/integration/sql-repositories.integration.test.ts` | Referenzen auf `api_keys`-Tabelle / `users.llm_provider`-Spalte entfernen (der Abbau selbst ist durch §6.3 abgedeckt)                                                                                                                                                                                                                                                                              |

### 6.1 Unit (Jest, `server/__tests__/unit/`)

| Datei                                        | Testname(n)                                                                                                                                                                                                  |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `workspace-settings-service.test.ts` _(neu)_ | `WorkspaceSettingsService_GetMissingRow_ReturnsVermittlungFalse` · `WorkspaceSettingsService_SetVermittlung_PersistsThroughStore`                                                                            |
| `fs-adapters.test.ts` (erweitern)            | `FsWorkspaceSettingsStore_SetGet_RoundTrip` · `FsWorkspaceSettingsStore_GetMissingOwner_ReturnsNull`                                                                                                         |
| `fs-migrations.test.ts` _(neu)_              | `FsMigrations_Run_RemovesLegacyApiKeysFile` · `FsMigrations_Run_NoFile_IsIdempotent`                                                                                                                         |
| `llm.test.ts` (erweitern)                    | `LlmFeatureRunner_ResolveProvider_NoProviderConfigured_ThrowsAiNotConfigured` · `LlmFeatureRunner_Run_GenerationFails_ThrowsUpstreamProvider` · `LlmFeatureRunner_RunFeature_NoFallback_ReturnsProviderOnly` |
| `llm.test.ts` (erweitern)                    | `CoverLetterService_Generate_NoProviderConfigured_ThrowsAiNotConfigured`                                                                                                                                     |
| `problem.test.ts` (erweitern)                | `MapErrorToProblem_AiNotConfiguredError_Returns503ProblemJson`                                                                                                                                               |
| `role-authorizer.test.ts` (erweitern)        | `RoleAuthorizer_Check_WorkspaceUpdateByRecruiter_ReturnsFalse` · `RoleAuthorizer_Check_WorkspaceUpdateByAdmin_ReturnsTrue`                                                                                   |

### 6.2 Integration — Acceptance (Nest, `server/__tests__/acceptance/`)

| Datei                                     | Testname(n)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| ----------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `nest-workspace-settings.test.ts` _(neu)_ | `WorkspaceSettings_GetWithoutSession_Returns401` · `WorkspaceSettings_PatchAsAdmin_SetsVermittlung` · `WorkspaceSettings_PatchAsRecruiter_Returns403` · `WorkspaceSettings_PatchInvalidBody_Returns400` · `WorkspaceSettings_PatchInWorkspaceA_DoesNotLeakToWorkspaceB`                                                                                                                                                                                                                                                                                                                        |
| `nest-vermittlung.test.ts` _(neu)_        | Für **jede** Route aus §5.4 je ein Test `Vermittlung_<Route>_WhenOff_Returns404`, plus `Vermittlung_Mandates_WhenOn_ReturnsExistingData` (Daten nach Einschalten unverändert) und `Vermittlung_GuardWithoutSession_Returns401`. Zusätzlich `Ai_DocumentsPitch_WhenOffWithoutKey_Returns404Not503` (Vermittler-KI-Route: Vermittlung aus **und** ohne Key → 404, nicht 503 — belegt die Guard-Reihenfolge §3.6).                                                                                                                                                                                |
| `nest-ai-routes.test.ts` (umstellen)      | Für **jede** generative Route aus §5.3 (ohne Vermittler): `Ai_<Route>_NoKey_Returns503AiNotConfigured` (prüft zusätzlich: **kein** Template-Text im Body). Für Vermittler-KI-Routen: bei aus → `404`, bei an + ohne Key → `503`. `Ai_MatchExplain_WhenOffWithoutKey_Returns404Not503` (symmetrisch zu pitch/outreach: Match-ai-Routen bekommen ebenfalls `VermittlungGuard` **vor** `AiConfiguredGuard`). `Ai_AssistantRun_WhenOnWithoutKey_Returns503` (Vermittlung an + ohne Key → `/assistant/run` 503, Owner §9-6). Mit Fake-`LlmService`: `Ai_DocumentsAi_WithKey_ReturnsProviderResult`. |

> **Globale Test-Regel:** Alle „bei aus → 404“-Vermittler-Tests laufen **ohne Key**
> (keine `ANTHROPIC_API_KEY`/`GEMINI_API_KEY`), damit der 404-Vorrang gegenüber 503
> durchgängig belegt ist — für pitch/outreach **und** match-ai (explain/interview-kit/prep).
> | `nest-llm.test.ts` (umstellen) | Keys-Routen entfernt → `Settings_KeysRoute_Returns404`; `Settings_Llm_ReturnsServerStatusOnly`. Neu: `Ai_CoverLetter_NoKey_Returns503` · `Ai_CoverLetter_WithKey_ReturnsProviderResult` (AK-0.8). |
> | `nest-team-admin.test.ts` / `nest-auth.test.ts` | Regressions: Super-Admin-Console-„Workspace“-Begriffe; `auth/me`-Form unverändert (kein Scope-Leak). |

### 6.3 Integration — Postgres (`server/__tests__/integration/`, nur mit `DATABASE_URL`)

| Datei                                            | Testname(n)                                                                                                                                                                                                                                                                           |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `workspace-settings.integration.test.ts` _(neu)_ | `SqlWorkspaceSettingsStore_SetGet_RoundTrip` · `SqlWorkspaceSettingsStore_GetMissingOwner_ReturnsNull` · `SqlMigration_DropApiKeysAndLlmProvider_RemovesColumns` (verifiziert `DROP TABLE IF EXISTS api_keys` und `ALTER TABLE users DROP COLUMN IF EXISTS llm_provider` idempotent). |

### 6.4 Integration — Playwright (`e2e/ui.spec.ts`, `e2e/mobile.spec.ts`, gemockte API)

| Datei                | Testname(n)                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `e2e/ui.spec.ts`     | `Navigation_FreshWorkspace_ShowsOnlyFiveDestinations` (Rail = Workspace/Mandanten/Stellen/Bewerbungen + Einstellungen als Fuß-Utility; **keine** Suchaufträge/Pipeline/Performance/Postfach-Rail, **keine** CoRecruiter-Topbar-Action, **keine** Matching/Platzierungen-subTabs) · `Navigation_VermittlungOn_ShowsAgencyEntries` · `Settings_AsRecruiter_ToggleHidden` · `Settings_AsAdmin_ToggleTurnsOnAgency` · `AiButton_NoKey_ShowsNotConfiguredAndSendsNoRequest` |
| `e2e/mobile.spec.ts` | `MobileNav_FreshWorkspace_ShowsOnlyFiveDestinations` · `MobileAiButton_NoKey_ShowsNotConfigured`                                                                                                                                                                                                                                                                                                                                                                       |

### 6.5 UI-Unit (Vitest, `design/myjob/ui_kits/recruiting/__tests__/`)

AK-0.4 wird in **zwei kontextbezogene** Prüfungen zerlegt, weil „Mandant“ zugleich
neuer korrekter Begriff (Nav „Mandanten“) und alter verbotener Begriff (Workspace in
der Super-Admin-Console) ist:

| Datei                                 | Testname(n)                                                                                                                                                                                                                                                                                                                                                                                                          |
| ------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ui-strings.test.jsx` _(neu)_         | (a) `UiStrings_Global_TalentAndMandat_NoneFound` — scannt die aktiven UI-Quellen auf die eigenständigen Begriffe „Talent“ (Person) und „Mandat“ (Firmenauftrag), wortbasierend (Boundary). (b) `UiStrings_SuperAdmin_MandantAsWorkspace_NoneFound` — scannt **nur** den Super-Admin-Console-Kontext (`SettingsView.jsx` `SuperAdminCard`/`TenantMembers`) auf „Mandant/Mandanten“ im Workspace-Sinn (→ „Workspace“). |
| `workspace-nav.test.jsx` _(neu)_      | `Nav_FreshWorkspace_RendersOnlyFiveDestinations` · `Nav_VermittlungOn_RendersAgencyEntries`                                                                                                                                                                                                                                                                                                                          |
| `settings-workspace.test.jsx` _(neu)_ | `SettingsToggle_AsAdmin_RendersAndToggles` · `SettingsToggle_AsRecruiter_NotRendered`                                                                                                                                                                                                                                                                                                                                |
| `settings-ai.test.jsx` _(neu)_        | `AiSetupCard_NoKey_ShowsNotConfiguredWithLink` · `AiSetupCard_NoKey_NoKeyInputRendered`                                                                                                                                                                                                                                                                                                                              |

**Exakte Regex (verbindlich):** Stamm-Präfix mit Wortgrenze, damit Plural-/Flektionsformen
erfasst werden: `/(?<!\p{L})(Talent|Mandat)\w*/u` — deckt „Talent“, „Talente“, „Talenten“,
„Mandat“, „Mandate“, „Mandaten“. Für „Mandant im Workspace-Sinn“ (Prüfung b, nur
Super-Admin-Console): `/(?<!\p{L})Mandant\w*/u`.

**Scan-Bereich (fest, Owner-Entscheidung §9-3 — komplett):**
`design/myjob/ui_kits/recruiting/**/*.jsx`, `design/myjob/screens/*.html` **und**
`design/myjob/components/**`. Auch dort werden die alten Begriffe umgestellt
(§3.8); Prüfung (a) läuft global über alle drei Bereiche, Prüfung (b) bleibt
kontextbezogen auf die Super-Admin-Console (`SettingsView.jsx`).

### 6.6 Manuell

Siehe §8.

## 7. AK-Matrix

| AK     | Nachweis (Testname / Protokollschritt)                                                                                                                                    |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AK-0.1 | `Navigation_FreshWorkspace_ShowsOnlyFiveDestinations` (Playwright) + `Nav_FreshWorkspace_RendersOnlyFiveDestinations` (Vitest)                                            |
| AK-0.2 | `Vermittlung_<Route>_WhenOff_Returns404` je Route (Acceptance) + `Vermittlung_Mandates_WhenOn_ReturnsExistingData`                                                        |
| AK-0.3 | `WorkspaceSettings_PatchAsRecruiter_Returns403` + `SettingsToggle_AsRecruiter_NotRendered` + `RoleAuthorizer_Check_WorkspaceUpdateByRecruiter_ReturnsFalse`               |
| AK-0.4 | `UiStrings_Global_TalentAndMandat_NoneFound` + `UiStrings_SuperAdmin_MandantAsWorkspace_NoneFound` (Vitest)                                                               |
| AK-0.5 | `Ai_<Route>_NoKey_Returns503AiNotConfigured` je generativer Route (Acceptance, kein Template-Text)                                                                        |
| AK-0.6 | `AiButton_NoKey_ShowsNotConfiguredAndSendsNoRequest` (Playwright) + `AiSetupCard_NoKey_ShowsNotConfiguredWithLink` (Vitest)                                               |
| AK-0.7 | `SqlMigration_DropApiKeysAndLlmProvider_RemovesColumns` (Integration) + `FsMigrations_Run_RemovesLegacyApiKeysFile` (Unit) + `Settings_KeysRoute_Returns404` (Acceptance) |
| AK-0.8 | `Ai_DocumentsAi_WithKey_ReturnsProviderResult` + `Ai_CoverLetter_WithKey_ReturnsProviderResult` (Acceptance) + Protokoll §8 Schritte 9–11                                 |

## 8. Manuelles Testprotokoll

Gegen einen **echt gestarteten** Server: `npm run build`, dann einmal `STORE=sql`
(gegen lokales Postgres) und einmal `STORE=fs`. Ohne Key wird der
„KI nicht eingerichtet“-Pfad geprüft; mit Key (falls vorhanden) Zusammenfassung und
Anschreiben.

| #   | Aktion                                                                  | erwartetes Ergebnis                                                                                                                               |
| --- | ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `npm run build && STORE=fs node server/dist/index.js` starten           | Server bootet, `/api/v1/health` → `200 ok`                                                                                                        |
| 2   | Frischen Workspace öffnen                                               | Navigation zeigt nur: Workspace, Mandanten, Stellen, Bewerbungen + Einstellungen (Fuß) (AK-0.1)                                                   |
| 3   | Einstellungen öffnen (als Admin)                                        | „Workspace“-Karte mit Schalter „Vermittlung“ (aus); **keine** „Schlüssel speichern“-Zeile; Karte „KI-Einrichtung: KI nicht eingerichtet“ mit Link |
| 4   | Als Nicht-Admin einloggen, Einstellungen öffnen                         | Vermittlung-Schalter **nicht** sichtbar                                                                                                           |
| 5   | Ohne Key `POST /talents/:id/documents/ai` (Zusammenfassung)             | `503 problem+json`, Typ `ai-not-configured`, **kein** Template-Text                                                                               |
| 5b  | Ohne Key `POST /api/v1/ats` und `POST /api/v1/compliance/agg-rewrite`   | `200` — deterministische Offline-Features funktionieren weiter (NFR-08)                                                                           |
| 6   | `GET /mandates` (Vermittlung aus)                                       | `404 problem+json`                                                                                                                                |
| 7   | Vorher Mandate anlegen, Vermittlung aus → `GET /mandates`               | `404`; nach Einschalten (Admin) dieselben Mandate unverändert da (AK-0.2)                                                                         |
| 8   | `ls archive/bewerbungen/` (fs) bzw. `\d api_keys` / `\d users` (sql)    | `api-keys.json` gelöscht; Tabelle `api_keys` entfernt; Spalte `users.llm_provider` entfernt (AK-0.7)                                              |
| 9   | Mit `ANTHROPIC_API_KEY=…` Server neu starten                            | Einstellungen zeigen „KI eingerichtet“                                                                                                            |
| 10  | Zusammenfassung erzeugen (`documents/ai`, action `summary`)             | Echter KI-Text, `provider` gesetzt, kein „template“ (AK-0.8)                                                                                      |
| 11  | Anschreiben erzeugen (`documents/ai`, action `letter` / `cover-letter`) | Echtes Anschreiben in Sprache der Stelle                                                                                                          |
| 12  | Vermittlung einschalten, alle Nav-Einträge durchklicken                 | Keine toten Buttons; Suchaufträge/Pipeline/Platzierungen/Performance/Postfach/CoRecruiter erreichbar                                              |

Protokoll je Schritt als `erwartet | tatsächlich | ok/nicht ok` ausfüllen.

## 9. Risiken und Entscheidungen

**Risiken**

- **Guard-Reihenfolge.** `VermittlungGuard`/`AiConfiguredGuard` müssen nach
  `AuthGuard` laufen (sie lesen den gestempelten Scope). Falsche Reihenfolge → 404/503
  statt 401. Abgedeckt durch `Vermittlung_GuardWithoutSession_Returns401`.
- **Template-Fallback-Entfernung breit.** `LlmFeatureRunner.runFeature` wird von
  sieben Services genutzt; jeder Aufrufer muss den neuen Throw statt des Fallbacks
  verkraften. Die Unit-Tests (`LlmFeatureRunner_RunFeature_NoFallback_…`) decken das
  zentral ab; die Acceptance-Tests je Route sichern die Enden. `candidatePrep` ist
  der Sonderfall: die deterministische Basis (Flywheel ADR-0006) bleibt **nur als
  Prompt-Grundlage**, die Route wird ohne Key ganz gated (503) — siehe §5.3.
- **`parsePdf`-Leerzustand.** Ein gescanntes PDF (kein Textlayer) liefert **mit Key**
  weiter einen ehrlichen Leerzustand (kein KI-Text). **Ohne Key** antwortet die
  Route wegen des `AiConfiguredGuard` (läuft vor dem Service) mit `503` wie jede
  generative Route — der Leerzustand greift also nur, wenn ein Key konfiguriert ist.
- **Verbotslisten-Test (AK-0.4).** „Talent“/„Mandat“ global, „Mandant“ nur im
  Super-Admin-Kontext — die Zerlegung verhindert False-Positives auf dem korrekten
  Nav „Mandanten“. Der Scan-Bereich ist jetzt **komplett** (Owner §9-3):
  `ui_kits/recruiting/**` + `screens/*.html` + `components/**`.
- **`applications`-Modul.** Der alte „Bewerbungen“-Pipeline-Flow ist Vermittler und
  wird versteckt; die neue „Bewerbungen“-Nav ist in Phase 0 ein Leerzustand. Risiko
  einer Begriffsverwechslung — bewusst in §5.4 festgehalten.
- **`DEFAULT_TENANT` hat keine `tenants`-Zeile.** Deshalb wird der Schalter über ein
  eigenes `workspace_settings`-Store (nicht übers `Tenant`-Record) geführt — andernfalls
  ließe sich der Default-Workspace nicht schalten.

**Entscheidungen (Owner, verbindlich — alle früheren offenen Fragen sind entschieden)**

1. **`searches` + alte `applications` hinter den Schalter: JA.** Beides gilt als
   Vermittler-Funktion und steht bereits in §5.4; keine Änderung nötig.
2. **`settings/llm` GET behalten: JA.** Route bleibt als Quelle „KI eingerichtet“
   (`available` = Server-Key vorhanden), ohne Per-User-Keys (§5.2).
3. **Scan-Bereich AK-0.4: KOMPLETT.** `ui_kits/recruiting/**` **und**
   `screens/*.html` **und** `components/**` werden gescannt und umgestellt
   (§3.8, §6.5).
4. **`detail`-Text `ai-not-configured`:** der im Plan vorgeschlagene deutsche Text
   („KI nicht eingerichtet — konfiguriere ANTHROPIC_API_KEY (oder GEMINI_API_KEY)
   in den Server-Umgebungsvariablen.“, §5.3) wird übernommen.
5. **Migration-Zeitpunkt:** idempotente Boot-DDL in `db.ts` (Repo-Regel 2) —
   wie im Plan (§4.3) vorgesehen.
6. **Autopilot stiller Fehlschlag: `503` statt stillem Fehlschlag.**
   `AutopilotService.propose` verschluckt `AiNotConfiguredError`/`UpstreamProviderError`
   nicht mehr; `/assistant/run` antwortet ohne Key mit `503` (§3.5, §5.3, §6.2).
7. **Runde-3-Befund 1 (Test-/Support-Dateien): VOLLSTÄNDIGE LISTE.** Der Plan
   enumeriert alle Dateien, die gelöschten Code referenzieren, in §6.0 —
   einschließlich `api.test.ts` (ApiKeys-/Template-Fallback-Tests entfernen,
   `settings/llm`-PUT-Test entfernen) und der drei Support-Dateien.
8. **Runde-3-Befund 2 (Guard-Reihenfolge): PLAN BESTÄTIGT + PlanGuard-Nuance.**
   Die Reihenfolge `VermittlungGuard` **vor** `AiConfiguredGuard` auf
   pitch/outreach gilt wie in §3.6/§5.3; zusätzlich ist dokumentiert, dass der
   Klassen-Level `PlanGuard`/`@RequiresPlan('pro')` davor läuft (Free-Plan-User →
   `402` vor `404`). Kein weiterer Klärungsbedarf.

**Verbleibende offene Fragen:** keine. Damit ist der Plan freigegeben
(3-Runden-Limit erreicht → Owner hat entschieden, Orchestrierung Teil D Schritt 4).
