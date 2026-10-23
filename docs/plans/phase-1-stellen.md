# Phase 1 — Stellen (Implementierungsplan)

Issue #316 · Branch wird vom Orchestrator neu von `origin/main` gestartet · Entscheidung: [ADR-0058](../adr/0058-stellen-jobposting-speichern.md) · Rahmen: [Orchestrierungs-Prompt](bewerbungsservice-orchestration-prompt.md) (Phase 1, AK-1.1 bis AK-1.8)

Stand: Plan (G1). Es gibt noch keinen Code und keine Tests. Alle Pfade sind relativ zur Repo-Wurzel; `UI/` steht für `design/myjob/ui_kits/recruiting/`.

---

## 1. Ziel und Nicht-Ziele

### 1.1 Ziel

Nach Phase 1 ist eine **Stelle** (`JobPosting`) eine dauerhaft gespeicherte, workspace-gebundene Entität mit drei Eintrittswegen und einer Liste mit Detailansicht:

1. **„Stelle übernehmen“** aus der bestehenden Portal-Suche speichert die Stelle **ohne KI** mit Quelle, Firma, Titel, Ort, URL und vollem Anzeigentext (AK-1.1). Der volle Text kommt pro Quelle aus der Suche oder einem Detail-Abruf; Quellen ohne Volltext werden als „Anzeigentext unvollständig“ gespeichert und bieten „Text ergänzen“ (AK-1.2).
2. **„Stelle einfügen per Text“** extrahiert Firma, Titel, Ort, Land und Anforderungen mit dem zentralen KI-Key aus dem eingefügten Text; alle Felder sind vor dem Speichern editierbar (AK-1.3).
3. **„Stelle einfügen per URL“** ruft die URL **SSRF-geschützt** ab (private/loopback/link-local-Adressen, IPv4-mapped/IPv6/Decimal-Sonderformen, `file://`, Redirects auf solche Ziele abgelehnt; Größen-, Zeit- und Redirect-Limit getestet, AK-1.4) und extrahiert die Felder; Seiten ohne extrahierbaren Text melden „Bitte Anzeigentext einfügen“ statt einer leeren Stelle (AK-1.5).
4. **Duplikate** (gleiche Quelle+`sourceId` oder gleiche URL im selben Workspace) erzeugen keinen zweiten Eintrag; die UI zeigt „Bereits gespeichert → öffnen“ (AK-1.6).
5. **Stellen-Liste** ist durchsuchbar, **löschbar mit Undo** (Muster #200) und hat eine **Detailansicht** mit vollem Text (AK-1.7). Die Sichtbarkeit bleibt unabhängig vom Vermittlung-Schalter (AK-0.2 läuft bereits: `/jobs` ist nicht gesperrt; die neuen `/job-postings`-Routen ebenso wenig).
6. **Workspace-Isolation**: ein Workspace sieht keine Stellen eines anderen (AK-1.8).
7. **Scope-Fix `/searches` (RI15, Owner Q6):** die gespeicherten Suchen (`SavedSearch`) werden workspace-gebunden (`ownerId`), wie jede andere Entität — ein Workspace sieht, löscht und startet nur die eigenen Suchen (ADR-0010/0033). Damit wird die von Phase 0 offen gelassene Scope-Lücke geschlossen, bevor die Suche in der Stellen-Ansicht sichtbar wird.

### 1.2 Nicht-Ziele

Ausdrücklich **nicht** Teil von Phase 1:

- **Kein Bewerbungs-Editor, kein Magic Pen, keine Bewerbungs-Entität.** „Bewerbung = Stelle × Mandant“, Dokumentkopie, `ApplyModal`-Ersatz (Phase 2) und Magic Pen (Phase 3) bleiben unberührt. Das bestehende `ApplyModal` bleibt wie in Phase 0.
- **Keine Weiterentwicklung der Vermittler-Funktionen** außer der bestehenden Portal-Suche-Anbindung (`Matching` bekommt nur den „Übernehmen“-Button). Kein Antasten der eingefrorenen Routen.
- **Kein „manuell anlegen“-Formular** als vierter Eintrittsweg (entschieden Q1: 503 statt Formular). Der bearbeitbare Feld-Satz nach der Extraktion ist der einzige Editier-Punkt.
- **Keine Quellen-übergreifende Duplikaterkennung** (dieselbe Anzeige bei zwei Boards). Nur gleiche Quelle+`sourceId` oder gleiche URL im selben Workspace (ADR-0058, RI4).
- **Keine Änderung der Job-Suche selbst** (`/jobs`, `/searches`, `JobSearchService`, `Job`-Shape, Matching-Scoring). Der volle Text für „Übernehmen“ läuft über den neuen, optionalen Port-Ansatz, nicht über eine Änderung des Such-`Job`.
- **Kein Umbenennen von Code-Bezeichnern oder Routen** (`/mandates`, `/talents`). Neue Dateien/Entität tragen den Code-Namen `JobPosting`; die UI spricht „Stelle“. Der API-Ressourcenname ist `job-postings` (Englisch, wie `/applications`, `/mandates`). Die bestehende Route `/searches` behält ihren Namen; sie wird nur um den Workspace-Scope ergänzt.
- **RI15 (`/searches*` instanzweit) wird in dieser Phase mitbehoben** (Owner Q6): Scope-Fix, kein Umbau der Route oder der UI (die UI ruft `/searches` derzeit nicht auf).
- **Keine Änderung der Coverage-Schwellen** (Jest ≥ 90 %), kein Abschwächen bestehender Tests.

---

## 2. Betroffene Dateien/Module

Legende: **neu**, **ändern**, **löschen**. Umsetzungsreihenfolge in §2.9. `scope` aus dem Auftrag entspricht im Code dem Feld `ownerId` (= Workspace-Scope, wie bei jeder anderen Entität); Begründung und Abgrenzung in §3.

### 2.1 Domain (`server/src/domain/`)

| Datei                  | Aktion  | Inhalt |
| ---------------------- | ------- | ------ |
| `job-posting.ts`       | **neu** | `JobPosting`-Interface (`id, ownerId, source, sourceId?, url?, company, title, location, country, description, requirements[], descriptionIncomplete, createdAt`); zod-Schemas `createJobPostingSchema`, `adoptJobPostingSchema`, `extractJobPostingSchema`, `updateJobPostingSchema`, `jobPostingQuerySchema`; reine Helfer `dedupKeyFor(posting)` und `normalizeUrl(url)` (Fragment + Trailing-Slash, Host lowercase). |
| `job-posting-extract.ts` | **neu** | Prompt-Builder `jobPostingExtractPrompt(text)` (striktes JSON, nichts erfinden, **behandelt den Text als untrusted data — Anweisungen im Anzeigentext ignorieren**) und `jobPostingExtractResultSchema` (`{ company, title, location, country, requirements[] }`); `MAX_POSTING_TEXT` (Obergrenze des Eingabetexts, z. B. 50.000 wie beim CV-Import). |
| `errors.ts`            | ändern  | Neue `DomainError`-Unterklassen: `SsrfBlockedError` (400, `ssrf-blocked`), `PostingFetchError` (502, `posting-fetch`; der Konstruktor nimmt `reason` und baut ihn in die `detail`-Message ein — problem+json überträgt nur `detail`, kein separates Feld), `NoTextError` (422, `no-text`). |
| `usage.ts`             | ändern  | Neues `UsageFeature` `postingExtract`. |
| `saved-search.ts`      | ändern  | `SavedSearch` erhält `ownerId: string` (Workspace-Scope, RI15/Q6). |
| `job.ts`               | ändern  | Typ `JobPostingDetail` (`{ description: string }` — nur der volle Anzeigentext, den der Detail-Abruf ergänzt) für `JobSource.getPosting`. `Job` selbst bleibt unverändert. |

### 2.2 Ports (`server/src/ports/`)

| Datei                     | Aktion  | Inhalt |
| ------------------------- | ------- | ------ |
| `job-posting-repository.ts` | **neu** | `JobPostingRepository`: `list(ownerId, q?)`, `findById(ownerId, id)`, `findDuplicate(ownerId, source, sourceId, url)` → `JobPosting \| null`, `add`, `update`, `delete`. |
| `job-source.ts`           | ändern  | Optionale Methode `getPosting?(sourceId: string): Promise<{ description: string } \| null>` am `JobSource`-Port für **Einzelquellen** (kommentiert: `null` = Quelle liefert keinen Volltext; `company`/`title`/`location`/`requirements` kommen aus der Suche des Clients). Der Composite bekommt eine **eigene** Methode `getPosting(source, sourceId)` (siehe §2.4) — der Service hängt am Composite, nicht an einzelnen Quellen. |
| `page-fetcher.ts`         | **neu** | `PageFetcher`-Port: `fetchPage(url: string): Promise<{ text: string; finalUrl: string }>` — wirft `SsrfBlockedError` / `PostingFetchError` / `NoTextError`. Bewusst **nicht** der JSON-`HttpFetch` (der hat nur `ok/status/json`); der Page-Fetcher braucht Redirects, Body-Streaming und IP-Pinning. |
| `saved-search-repository.ts` | ändern | Methoden scope-fähig: `list(ownerId)`, `findById(ownerId, id)`, `remove(ownerId, id)`; `add(search)` trägt `ownerId` auf dem Datensatz (RI15/Q6). |

### 2.3 Services (`server/src/services/`, decorator-frei)

| Datei                           | Aktion  | Inhalt |
| ------------------------------- | ------- | ------ |
| `job-posting-service.ts`        | **neu** | `list(scope, q)`, `get(scope, id)`, `adopt(scope, input)`, `create(scope, draft)`, `update(scope, id, patch)`, `delete(scope, id)`. Dependency `getPosting(source, sourceId)` (Composite über `JOB_SOURCE`). Normalisiert `url` **einmal** (vor Dedup und vor Persist, §3.4). `adopt` ohne `sourceId`: `description = ''`, `descriptionIncomplete = true` (kein Detail-Abruf möglich). `update` mit nicht-leerer `description` setzt `descriptionIncomplete = false`. |
| `job-posting-extract-service.ts` | **neu** | `fromText(userId, text)` und `fromUrl(userId, url)` über `LlmFeatureRunner` + `PageFetcher`; liefert den Editier-Entwurf `{ company, title, location, country, requirements, description, source, url }` (bei `fromUrl` die eingegebene bzw. `finalUrl`; bei `fromText` leer), **ohne** Persistenz. |
| `llm-feature-runner.ts`         | ändern  | `MAX_TOKENS.postingExtract` (≈ 600) ergänzen (dort lebt die Token-Tabelle). |
| `saved-search-service.ts`        | ändern  | `list(scope)`, `create(scope, input)` (setzt `ownerId`), `remove(scope, id)`, `run(scope, id)` (RI15/Q6). |

### 2.4 Adapter (`server/src/adapters/`)

| Datei                                 | Aktion  | Inhalt |
| ------------------------------------- | ------- | ------ |
| `fs-job-posting-repository.ts`        | **neu** | JSON-Array in `archive/bewerbungen/job-postings.json` (Muster `fs-application-repository.ts`). `findDuplicate` vergleicht **roh** `(source, sourceId)` bzw. `url` — keine Normalisierung im Adapter (die normalisierte URL kommt vom Service, §3.4); In-Process-Schreibserialisierung (Mutex) gegen lost updates (Minor 15). |
| `sql/sql-job-posting-repository.ts`   | **neu** | Drizzle; `findDuplicate` per `or(and(eq(source), eq(sourceId)), and(eq(url)))` (roh, normalisiert kommt vom Service); `add` fängt Unique-Verstoß (`23505`) ab und re-queried das bestehende Posting (Rennsituation-Rückhalt, ADR-0058). |
| `fs-saved-search-repository.ts`       | ändern  | `list(ownerId)`/`findById(ownerId, id)`/`remove(ownerId, id)` filtern auf `ownerId` (RI15/Q6). |
| `sql/sql-saved-search-repository.ts`  | ändern  | Wie fs; `findById`/`remove`/`list` mit `eq(savedSearches.ownerId, ownerId)` (RI15/Q6). |
| `sql/schema.ts`                       | ändern  | `jobPostings`-Tabelle (`requirements` als `jsonb().$type<string[]>()`); `savedSearches` erhält `ownerId: text('owner_id').notNull().default('team')`. |
| `sql/mappers.ts`                      | ändern  | `rowToJobPosting` / `jobPostingToRow`; `rowToSavedSearch` / `savedSearchToRow` um `ownerId` erweitert. |
| `sql/db.ts`                           | ändern  | `CREATE TABLE IF NOT EXISTS job_postings` + Indizes in `runMigrationDdl` (unter Advisory-Lock), siehe §3; zusätzlich `ALTER TABLE saved_searches ADD COLUMN IF NOT EXISTS owner_id text NOT NULL DEFAULT 'team'` + Index + Backfill (RI15/Q6, §3.5). |
| `ssrf-guard.ts`                       | **neu** | Reine Funktionen `isAllowedUrl(url)` und `assertAllowedHostname(hostname)` / `isPrivateAddress(ip)`; nutzt `ipaddr.js`. Kein I/O → exhaustiv unit-testbar. |
| `ssrf-fetch.ts`                       | **neu** | Implementiert `PageFetcher`: Schema-Whitelist → `dns.lookup(host, {all:true})` → alle Adressen prüfen → undici-`Agent` mit `connect` auf die geprüfte IP (DNS-Rebinding-Schutz) → `redirect:'manual'`, je Hop erneut prüfen, Hops/Größe/Zeit aus `config.jobFetch` (Q5) → `stripHtml` für den Text. |
| `html-text.ts`                        | ändern  | `stripHtml` entfernt vor der Textextraktion die Inhalte von `<script>`/`<style>` (sonst zählt JS/CSS als „Text“); `htmlToText` (länger, kein 180-Zeichen-Cut) für die Volltext-Extraktion aus einer URL ergänzen. |
| `composite-job-source.ts`             | ändern  | **Composite-eigene** Methode `getPosting(source: string, sourceId: string): Promise<{ description: string } \| null>`: sucht die Quelle nach `name`, ruft deren optionales `getPosting(sourceId)`, `null` bei unbekannter Quelle oder fehlendem Detail. (Nicht die Port-Methode — der Port kennt nur Einzelquellen; der Service hängt am Composite über `JOB_SOURCE`.) |
| `arbeitnow-job-source.ts`             | ändern  | `getPosting(sourceId)`: liefert die in der Suche enthaltene `description` (voll) bzw. re-fetcht den Feed und findet den `slug`. |
| `bundesagentur-job-source.ts`         | ändern  | `getPosting(sourceId)`: `GET …/pc/v4/jobs/{refnr}` mit `X-API-Key`, mappt den vollen Anzeigentext. |
| `adzuna-job-source.ts`                | ändern  | `getPosting`: `null` (Volltext liegt hinter einer JS/Login-Seite) → `descriptionIncomplete`. |
| `rest-job-source.ts`                  | ändern  | `getPosting`: `null` (Deskriptoren modellieren keinen Detail-Endpunkt). |
| `persistence-factory.ts`              | ändern  | `jobPostingRepository` (fs + sql) in das `Persistence`-Bundle. |
| `config.ts`                           | ändern  | `jobPostingsFile` ergänzen (`archive/bewerbungen/job-postings.json`); neue Config-Sektion `jobFetch` (`maxBytes`, `timeoutMs`, `maxRedirects`) mit Env `JOB_FETCH_MAX_BYTES`/`JOB_FETCH_TIMEOUT_MS`/`JOB_FETCH_MAX_REDIRECTS` und sicheren Defaults (Q5, §5.2). |
| `config-validation.ts`                | ändern  | `checkProductionReadiness` prüft die `jobFetch`-Limits (Warnung bei unsinnigen Extremwerten, z. B. `maxRedirects > 20` oder `timeoutMs > 60_000`) (Q5). |
| `../package.json` / `../package-lock.json` | ändern  | Neue **direkte** Dependencies: `ipaddr.js` (IP-Klassifikation, §5) und `undici` (für den `Agent`/`connect`-IP-Pinning; undici ist **nicht** in `package.json`, obwohl Node es intern bündelt). |

### 2.5 Nest (`server/src/nest/`)

| Datei                                          | Aktion  | Inhalt |
| ---------------------------------------------- | ------- | ------ |
| `tokens.ts`                                    | ändern  | `JOB_POSTING_REPOSITORY`, `JOB_POSTING_SERVICE`, `JOB_POSTING_EXTRACT_SERVICE`, `PAGE_FETCHER` ergänzen. `JOB_SOURCE` existiert bereits (Composite, ADR-0050). |
| `persistence.module.ts`                        | ändern  | Mapping `[JOB_POSTING_REPOSITORY, 'jobPostingRepository']`. |
| `jobs/jobs.module.ts`                          | ändern  | `JOB_SOURCE` zusätzlich exportieren (heute nur `JOB_SEARCH_SERVICE`), damit `JobPostingsModule` den Composite injizieren kann. |
| `job-postings/job-postings.module.ts`          | **neu** | Controller + Modul (Muster `applications.module.ts`). **Klassen-Guards:** `AuthGuard, AiConfiguredGuard` (`AiConfiguredGuard` ist marker-basiert → No-op ohne `@RequiresAi()`). **Methoden-Guard `AiRateLimitGuard` ausschließlich auf `POST /job-postings/extract`** (marker-frei, zählt sonst jede Route; Default `aiRateLimitPerMinute=30`) — Muster `assistant.module.ts` (`@UseGuards(AiRateLimitGuard)` an der Dossier-Methode, R33/R37). `@RequiresAi()` nur an `/extract`; **kein** `VermittlungGuard`. Importiert `JobsModule` (für `JOB_SOURCE`); Factory von `JOB_POSTING_SERVICE` injiziert den Composite (`JOB_SOURCE`) für `getPosting(source, sourceId)`. |
| `app.module.ts`                                | ändern  | `JobPostingsModule` in `FEATURE_MODULES`. |
| `searches/searches.module.ts`                  | ändern  | Controller nutzt `@CurrentScope()` und reicht `scope` an den `SavedSearchService` durch (RI15/Q6); Guards unverändert (`AuthGuard`, kein `VermittlungGuard`). |
| `ai/ai.module.ts`                              | —       | unverändert (`LlmFeatureRunner` ist `@Global` exportiert und wird vom JobPostings-Modul injiziert). |
| `adapters/role-authorizer.ts`                  | prüfen  | **Kein** Policy-Eintrag `job-posting` (ein leerer `{}`-Eintrag hieße nur-Admin). Muster `applications`: nur `AuthGuard` + Scope, keine Rollen-Gate → keine Policy nötig. |

### 2.6 OpenAPI und Frontend

| Datei                                              | Aktion  | Inhalt |
| -------------------------------------------------- | ------- | ------ |
| `server/openapi.yaml`                              | ändern  | Pfade `/job-postings` (GET, POST, `POST /adopt`, `POST /extract`, `GET /:id`, `PATCH /:id`, `DELETE /:id`), Schemas `JobPosting`, `AdoptJobPostingInput`, `ExtractJobPostingInput`, `UpdateJobPostingInput`, `JobPostingDraft`; Antwort-Komponenten `SsrfBlocked` (400), `NoText` (422), `PostingFetch` (502), Wiederverwendung `AiNotConfigured` (503). `SavedSearch`-Schema erhält `ownerId` (RI15/Q6). |
| `server/__tests__/unit/openapi-contract.test.ts`   | ändern  | Drift-Wächter für die neuen Pfade/Schemas (§7). |
| `UI/data.js`                                       | ändern  | `RecruitApi`: `listJobPostings(q)`, `getJobPosting(id)`, `adoptJobPosting(input)`, `extractJobPosting(input)`, `createJobPosting(draft)`, `updateJobPosting(id, patch)`, `deleteJobPosting(id)`; `_jsonOrThrow` behandelt `ssrf-blocked`, `no-text`, `posting-fetch` mit eigenen `code`s. `createJobPosting(draft)` reicht den Entwurf **inkl. `url`** durch (URL-Dedup, AK-1.6). |
| `UI/JobPostings.jsx`                               | **neu** | Stellen-Liste (durchsuchbar, Leer-/Fehlerzustand), Detailansicht (voller Text, „Text ergänzen“ bei `descriptionIncomplete`), „Stelle einfügen“ (Text/URL-Dialog mit Extrakt-Vorschau → editierbare Felder → Speichern; der `create`-Aufruf übernimmt die `url` aus dem Extrakt-Entwurf), Löschen mit Undo (`use-undo-delete.jsx`), „Bereits gespeichert → öffnen“-Hinweis. |
| `UI/Matching.jsx`                                  | ändern  | „Stelle übernehmen“-Button pro Treffer (`adoptJobPosting`), Duplikat → „Bereits gespeichert → öffnen“. |
| `UI/Workspace.jsx`, `UI/app.jsx`, `UI/main.jsx`    | ändern  | „Stellen“-Ansicht verdrahtet: Nav-`stellen` (in `app.jsx`/`main.jsx`) rendert die neue `JobPostings.jsx` (Liste als Standard, Portal-Suche als Untereintrag/Button); `onAdopt`/`JobPostings` durchreichen. Der bisherige `JobsView` in `Workspace.jsx` (alter „Stellen sammeln“-Platzhalter) wird durch `JobPostings.jsx` **ersetzt** und aus `Workspace.jsx` entfernt. |
| `UI/__tests__/*`, `e2e/ui.spec.ts`, `e2e/mobile.spec.ts` | ändern  | Neue Tests (§7). |

### 2.7 Dokumentation

- `docs/requirements.md`: FR-75 (Stelle speichern, Übernehmen ohne KI), FR-76 (voller Text pro Quelle, unvollständig markiert), FR-77 (Einfügen per Text, Felder editierbar), FR-78 (Einfügen per URL SSRF-geschützt + Limits), FR-79 (Duplikate: kein zweiter Eintrag), FR-80 (Liste durchsuchbar, löschbar mit Undo, Detailansicht, Workspace-Isolation). FR-51 (gespeicherte Suchen) um „workspace-gebunden“ ergänzt (RI15/Q6). Glossar „Stelle“.
- `docs/architecture.md`: Abschnitt zu `JobPosting` (Domain → Port → Adapter fs/sql → Service → Nest), SSRF-Fluss, KI-Extraktion; `SavedSearch`-Scope in der Job-Suche erwähnt.
- UML: `docs/umls/` — neues Sequenzdiagramm „Stelle übernehmen“ und „Stelle per URL einfügen (SSRF)“, Baustein-Diagramm aktualisieren (`.puml` + gerenderte `.svg`).
- `CHANGELOG.md`: Added (Stelle speichern, drei Eintrittswege, SSRF-Schutz, Liste/Detail/Löschen), Changed (**breaking**: `/searches` ist jetzt workspace-gebunden — bestehende Suchen gehören dem Workspace `team`).
- `docs/deployment.md` und `docs/deployment-blueprint.md`: neue Betriebsparameter `JOB_FETCH_MAX_BYTES`, `JOB_FETCH_TIMEOUT_MS`, `JOB_FETCH_MAX_REDIRECTS` mit Defaults (Q5).
- `docs/adr/README.md`: Zeile 0058 (bereits ergänzt).

### 2.8 Test-Infrastruktur (`server/__tests__/support/`)

| Datei        | Aktion  | Inhalt |
| ------------ | ------- | ------ |
| `fakes.ts`   | ändern  | `InMemoryJobPostingRepository`, `FakeJobSource` bekommt konfigurierbares `getPosting`, `FakePageFetcher` (liefert Text oder wirft `SsrfBlockedError`/`NoTextError`/`PostingFetchError`), `fakeLlmService` wiederverwendet; `InMemorySavedSearchRepository` wird scope-fähig (RI15/Q6). |
| `nest-app.ts`| ändern  | `NestTestAppOptions` um `pageFetcher?` erweitern; `JOB_POSTING_REPOSITORY`, `PAGE_FETCHER` bereitstellen. |
| `route-inventory.ts` | ändern | `AI_ROUTES` erhält `K12` = `POST /api/v1/job-postings/extract` (KI-Route, 503 ohne Key). Die Zählprüfung des Drift-Wächters geht von 11 auf 12 KI-Routen. |

### 2.9 Umsetzungsreihenfolge (Tests zuerst, dann Code, dann Doku)

1. Testgerüst: `fakes.ts`, `nest-app.ts`; rote Unit-Tests für `ssrf-guard` (alle Sonderformen), `job-posting-service` (Dedup), `job-posting-extract-service` (503/502).
2. Domain, Ports, `ssrf-guard` (reine Logik), Fehlerklassen.
3. Adapter: fs + sql (DDL, Mapper, Repository), `ssrf-fetch`, `getPosting` der Quellen, `persistence-factory`, `config` (inkl. `jobFetch`-Sektion + `config-validation`); Scope-Fix `saved_searches.owner_id` (Backfill) in `db.ts`/`schema.ts`/`mappers.ts`.
4. Services (CRUD/Adopt/Extract).
5. Nest: Tokens, Modul/Controller, `app.module`, Drift-Wächter.
6. OpenAPI + `openapi-contract.test.ts`.
7. Frontend: `data.js`, `JobPostings.jsx`, `Matching.jsx`-Button, Verdrahtung, Vitest.
8. Playwright (Desktop + Mobil), `./test.sh` grün.
9. Doku, UML-SVG, Changelog; manuelles Protokoll (§9) mit `STORE=sql` und `STORE=fs`.

---

## 3. Datenmodell + Migration

### 3.1 `JobPosting` (exakt)

```ts
// server/src/domain/job-posting.ts
export interface JobPosting {
  id: string;
  /** Der Workspace-Scope. Im Auftrag "scope" genannt; im Code `ownerId` wie bei jeder Entität (ADR-0010/0033). */
  ownerId: string;
  /** Welche Quelle lieferte die Stelle (z. B. "Bundesagentur") oder "text" / "url". */
  source: string;
  /** Quellen-Id (z. B. BA-Refnr, Arbeitnow-Slug). Fehlt bei manuell/eingefügten Stellen. */
  sourceId?: string;
  url?: string;
  company: string;
  title: string;
  location: string;
  country: string;
  /** Voller Anzeigentext. Bei Quellen ohne Volltext leer + `descriptionIncomplete`. */
  description: string;
  /** Anforderungen/Skills. Bei "Übernehmen" aus `Job.skills`, sonst KI-extrahiert. */
  requirements: string[];
  /** AK-1.2: Quelle lieferte keinen Volltext → UI bietet "Text ergänzen". */
  descriptionIncomplete: boolean;
  createdAt: string; // ISO 8601
}
```

`descriptionIncomplete` ist eine Ergänzung gegenüber der Feldliste des Auftrags, begründet durch AK-1.2 („Anzeigentext unvollständig“ darf nicht aus `description === ''` geraten werden — eine echte leere Anzeige ist nicht dasselbe wie eine nicht gelieferte). **Reset-Regel (Service, nicht Client):** ein `update`, dessen `description` nicht leer ist, setzt `descriptionIncomplete` auf `false` zurück — so hebt „Text ergänzen“ die Markierung auf, ohne dass der Client das Flag selbst steuert.

### 3.2 fs-Dateiformat

`archive/bewerbungen/job-postings.json` (Pfad aus `config.jobPostingsFile`), Inhalt ein JSON-Array von `JobPosting` (Muster `fs-application-repository.ts`; kaputte/fehlende Datei → `[]`). Die `versionedPaths` in `config.ts` decken `archive/bewerbungen` bereits ab, die neue Datei wird damit mit versioniert. Der fs-Adapter serialisiert seine Schreibzugriffe über eine **In-Process-Mutex** (Promise-Chain), damit ein read-modify-write bei gleichzeitiger Übernahme/Einfügen kein lost update erzeugt — Einzelinstanz, ein instanzübergreifendes Race ist bei fs ausgeschlossen (ADR-0058 waivt nur das Duplikat-Race, nicht lost writes).

### 3.3 sql-DDL (idempotent, in `runMigrationDdl` unter dem Advisory-Lock, Muster `db.ts`)

```sql
CREATE TABLE IF NOT EXISTS job_postings (
  id text PRIMARY KEY,
  owner_id text NOT NULL,
  source text NOT NULL,
  source_id text,
  url text,
  company text NOT NULL,
  title text NOT NULL,
  location text NOT NULL,
  country text NOT NULL,
  description text NOT NULL,
  requirements jsonb NOT NULL,
  description_incomplete boolean NOT NULL DEFAULT false,
  created_at text NOT NULL
);
CREATE INDEX IF NOT EXISTS job_postings_owner_id_idx ON job_postings (owner_id);
-- Rennsituation-Rückhalt (ADR-0058): Duplikat-Schlüssel innerhalb eines Workspace.
CREATE UNIQUE INDEX IF NOT EXISTS job_postings_owner_source_idx
  ON job_postings (owner_id, source, source_id) WHERE source_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS job_postings_owner_url_idx
  ON job_postings (owner_id, url) WHERE url IS NOT NULL;
```

`schema.ts`: `jobPostings = pgTable('job_postings', { id: text('id').primaryKey(), ownerId: text('owner_id').notNull(), …, requirements: jsonb('requirements').$type<string[]>().notNull(), descriptionIncomplete: boolean('description_incomplete').notNull().default(false), … })`.

### 3.4 Duplikaterkennung (Service-Check vs. Constraint)

- **Normalisierung zentral im Service.** `normalizeUrl` (reine Domain-Funktion) läuft **einmal** im `JobPostingService`, sowohl **vor** `findDuplicate` als auch **vor** dem Persistieren: `create`/`adopt` normalisieren `url`, geben die **normalisierte** URL an `findDuplicate` und **speichern die normalisierte** URL. Beide Adapter (`fs` und `sql`) vergleichen daher **roh** (kein `normalizeUrl` im Adapter). Die Unique-Indizes decken damit normalisierungsgleiche URLs ab (z. B. `https://Example.com/job` und `https://example.com/job/` landen auf demselben Schlüssel).
- **Autoritativ ist der Service-Check** (`JobPostingService` ruft vor `create`/`adopt` `repository.findDuplicate(ownerId, source, sourceId, url)` mit der normalisierten URL). Bei Treffer liefert er das bestehende Posting mit `alreadySaved: true` (HTTP 200) — **kein** zweiter Eintrag, die UI zeigt „Bereits gespeichert → öffnen“. Dadurch verhalten sich fs und sql gleich: der fs-Adapter hat keine Constraint, nur die Service-Prüfung.
- **Postgres-Unique-Indizes sind der Race-Rückhalt** für den (mehrinstanzfähigen) sql-Pfad: zwei gleichzeitige Übernahmen bestehen beide die Service-Prüfung, die zweite `INSERT` verletzt den Index. Der `SqlJobPostingRepository.add` fängt `23505`, re-queried per `findDuplicate` und liefert das bestehende Posting — observierbar identisch zu „bereits vorhanden“.
- **Dedup-Schlüssel**: `(source, sourceId)`, wenn `sourceId` gesetzt, **oder** `(url)`, wenn `url` gesetzt. Normalisierung **flach** (entschieden Q4): nur Fragment, Trailing-Slash, Host-Case; die Query wird nicht angefasst. Leere `sourceId` (`''`) wird im Service/`dedupKeyFor` zu `undefined` koerziert (BA `refnr ?? ''`, Adzuna `String(j.id ?? '')`), damit ein leeres Feld nicht als Dedup-Schlüssel wirkt.
- **Scope**: alle Vergleiche sind auf `ownerId` beschränkt → zwei Workspaces können dieselbe Anzeige unabhängig speichern (AK-1.8).

### 3.5 Scope-Fix `SavedSearch` (RI15/Q6)

Die gespeicherten Suchen (`/searches`, FR-51) sind bisher **instanzweit**: `SavedSearch` hat keinen `ownerId`, `SavedSearchRepository.list()/findById()/remove()` filtern nicht auf einen Workspace. Jeder authentifizierte Nutzer sieht, löscht und startet damit die Suchen aller Workspaces — eine Scope-Lücke gegenüber ADR-0010/0033.

- **Domain:** `SavedSearch.ownerId: string` (gesetzt bei `create`, nie aus dem Body).
- **Port/Service/Controller:** `list(ownerId)`, `findById(ownerId, id)`, `remove(ownerId, id)`, `run(ownerId, id)`; Controller nutzt `@CurrentScope()`.
- **fs:** `FsSavedSearchRepository` filtert alle Lese-/Lösch-Zugriffe auf `ownerId`. Altbestand ohne `ownerId` wird beim Lesen dem Standard-Workspace `team` zugeordnet und bleibt **löschbar** (defensive Normalisierung beim Lesen). Anders als bei `applications` (dort nur striktes Filtern) existiert der `DEFAULT 'team'`-Backfill **nur** in der sql-DDL; im fs gibt es keine Spalten-Defaults, daher die Zuordnung beim Lesen.
- **sql (idempotent, in `runMigrationDdl`):**
  ```sql
  ALTER TABLE saved_searches ADD COLUMN IF NOT EXISTS owner_id text NOT NULL DEFAULT 'team';
  CREATE INDEX IF NOT EXISTS saved_searches_owner_id_idx ON saved_searches (owner_id);
  ```
  Der `DEFAULT 'team'` füllt bestehende Zeilen automatisch auf den Standard-Workspace zurück (Muster `applications.owner_id` in `db.ts`, ADR-0010/0033).
- **Breaking Change (dokumentiert im CHANGELOG):** nach dem Upgrade gehören bestehende Suchen dem Workspace `team`; andere Workspaces sehen sie nicht mehr. Die UI ruft `/searches` derzeit nicht auf, es gibt also keinen UI-Umbau.

Der `SavedSearchService.run(ownerId, id)` läuft weiterhin über den `JobSearchService` (JobsModule), unverändert.

---

## 4. API

Alle Routen unter `/api/v1/job-postings`, `AuthGuard` an der Klasse, Scope über `@CurrentScope()`; **kein** `VermittlungGuard` (Stellen bleiben sichtbar). Fehler sind RFC-9457 `application/problem+json` über den bestehenden `ProblemJsonFilter`; `type` hat die Form `about:blank#<kurzname>`.

### 4.1 Routen

| #   | Methode + Pfad                      | Body (zod)                                    | Erfolg | Fehler (problem+json) |
| --- | ----------------------------------- | --------------------------------------------- | ------ | -------------------- |
| P01 | `GET /job-postings?q=`             | `jobPostingQuerySchema` (`{ q? }`)            | 200 `JobPosting[]` (nach `createdAt` absteigend) | 401, 400 |
| P02 | `GET /job-postings/:id`            | —                                             | 200 `{ jobPosting }` | 401, 404 |
| P03 | `POST /job-postings/adopt`         | `adoptJobPostingSchema`                       | 200 `{ jobPosting, alreadySaved }` | 401, 400, 404 (Quelle unbekannt), 502 (`posting-fetch`, Detail-Abruf scheitert) |
| P04 | `POST /job-postings/extract`       | `extractJobPostingSchema` (`{ text }` **oder** `{ url }`, genau eines) | 200 `JobPostingDraft` (nicht persistiert) | 401, 400, 503 (`ai-not-configured`), 502 (`upstream-provider`), 400 (`ssrf-blocked`), 502 (`posting-fetch`), 422 (`no-text`) |
| P05 | `POST /job-postings`               | `createJobPostingSchema` (voller Entwurf)     | 201 `{ jobPosting, alreadySaved }` | 401, 400, (Duplikat → 200 mit `alreadySaved`, s. u.) |
| P06 | `PATCH /job-postings/:id`          | `updateJobPostingSchema` (partial, editierbare Felder) | 200 `{ jobPosting }` | 401, 400, 404 |
| P07 | `DELETE /job-postings/:id`         | —                                             | 204 | 401, 404 |

`adopt` mit nur `url` (kein `sourceId`): der Server kann den Volltext nicht per Detail-Abruf holen, speichert `description = ''` und `descriptionIncomplete = true`; die aus der Suche bekannten Felder (`company`, `title`, `location`, `country`, `requirements`) werden trotzdem gespeichert (AK-1.2 „Text ergänzen“ bleibt verfügbar).

### 4.2 zod-Schemas

```ts
// job-posting.ts (gekürzt)
export const createJobPostingSchema = z.object({
  source: z.string().min(1),
  sourceId: z.string().min(1).optional(),
  url: z.string().url().max(2000).optional(),
  company: z.string().min(1, 'company is required'),
  title: z.string().min(1, 'title is required'),
  location: z.string().default(''),
  country: z.string().default(''),
  description: z.string().max(200_000).default(''),
  requirements: z.array(z.string()).default([]),
}).strict();

export const adoptJobPostingSchema = z.object({
  source: z.string().min(1),
  sourceId: z.string().min(1).optional(),
  url: z.string().url().max(2000).optional(),
  // Aus der Suche des Clients bekannte Felder (Job.company, role→title, city→location, country, skills→requirements).
  company: z.string().min(1, 'company is required'),
  title: z.string().min(1, 'title is required'),
  location: z.string().default(''),
  country: z.string().default(''),
  requirements: z.array(z.string()).default([]),
}).strict().refine((v) => v.sourceId || v.url, 'sourceId or url is required');

export const extractJobPostingSchema = z.union([
  z.object({ text: z.string().min(1).max(50_000) }).strict(),
  z.object({ url: z.string().url().max(2000) }).strict(),
]);

export const updateJobPostingSchema = z.object({
  company: z.string().min(1), title: z.string().min(1),
  location: z.string(), country: z.string(),
  description: z.string().max(200_000), requirements: z.array(z.string()),
  descriptionIncomplete: z.boolean(),
}).partial().strict();

export const jobPostingQuerySchema = z.object({ q: z.string().optional() });
```

`url` ist in `create`/`adopt`/`extract` auf **2000 Zeichen** begrenzt (btree-Index-Schlüssellänge des Unique-Index `(owner_id, url)`). Leere `sourceId` (`''`) wird von `z.string().min(1)` abgelehnt bzw. im Service/`dedupKeyFor` zu `undefined` koerziert (BA `refnr ?? ''`, Adzuna `String(j.id ?? '')`). Der Extrakt-Entwurf (`JobPostingDraft`) trägt zusätzlich `url` (bei `fromUrl` die eingegebene bzw. `finalUrl`), damit `create` den URL-Dedup-Pfad (AK-1.6) für „per URL eingefügt“ und „URL vs. Übernahme“ bedienen kann — persistiert wird die normalisierte URL (§3.4).

### 4.3 Fehlerfälle (problem+json)

| Status | `type`                      | Wann |
| ------ | --------------------------- | ---- |
| 401    | `unauthorized`              | kein Login (jede Route) |
| 400    | `validation-error`          | zod verletzt (Body/Query) |
| 400    | `ssrf-blocked`              | `extract`-`url` kein `http(s)`, oder Host löst auf private/loopback/link-local/mapped Adresse auf (auch Redirect-Hop) |
| 404    | `not-found`                 | unbekannte Posting-Id oder unbekannte `source` bei `adopt` |
| 422    | `no-text`                   | URL geladen, aber kein extrahierbarer Text (Login/JS/leer) — UI: „Bitte Anzeigentext einfügen“ |
| 503    | `ai-not-configured`         | `extract` ohne Key (konsistent zu Phase 0/ADR-0057) |
| 502    | `upstream-provider`         | KI-Anbieter nicht erreichbar / unbrauchbare Extraktions-Antwort |
| 502    | `posting-fetch`             | Zeitüberschreitung, Größenlimit überschritten, Redirect-Limit erreicht, DNS-/Netzfehler, Nicht-2xx beim Detail-Abruf (`adopt`) |

**Duplikat** ist kein Fehler, sondern idempotent: `POST /job-postings` und `POST /job-postings/adopt` antworten bei Treffer **200** mit `{ jobPosting: <bestehend>, alreadySaved: true }` (AK-1.6 „kein zweiter Eintrag“, UI „Bereits gespeichert → öffnen“). Kein 409 im Normalpfad (entschieden Q2); der 409-äquivalente Fall tritt nur als Race-Rückhalt im sql-Adapter auf und wird ebenfalls auf „bereits vorhanden“ abgebildet.

### 4.4 Auth + Workspace-Scope

- **Jede** Route trägt `AuthGuard`; der Scope kommt per `@CurrentScope()` (der vom Auth gestempelte `tenantId`). `JobPostingRepository` filtert jeden Lesezugriff auf `ownerId` (AK-1.8); `create`/`adopt` setzen `ownerId = scope` serverseitig (nie aus dem Body).
- **Vermittlung-Schalter**: Die Routen tragen **kein** `@RequiresVermittlung()`. Stellen bleiben bei ausgeschalteter Vermittlung sichtbar — im Einklang mit AK-0.2 (Phase 0 lässt `/jobs` bewusst offen) und der Produktentscheidung „Stellen“ als Hauptweg.
- **Rollen**: kein besonderer Rollen-Guard; jede authentifizierte Rolle darf Stellen lesen/schreiben/löschen (wie `application`/`talent`).

### 4.5 Scope-Fix `/searches` (RI15/Q6)

Die bestehenden Routen `GET/POST /api/v1/searches`, `DELETE /api/v1/searches/:id`, `GET /api/v1/searches/:id/run` werden **workspace-gebunden**: der Controller reicht `@CurrentScope()` an den Service durch, der jede Operation auf `ownerId` filtert. **Nur** das `SavedSearch`-**Antwort-/OpenAPI-Schema** erhält `ownerId`; `createSavedSearchSchema` (Request) bleibt **ohne** `ownerId` — der Wert wird serverseitig aus dem Scope gesetzt, nie aus dem Body. Verhalten im Fehlerfall unverändert (401, 400, 404). `VermittlungGuard` bleibt außen vor (Phase 0 lässt `/searches*` bewusst offen).

---

## 5. SSRF-Schutz-Design (wichtigster Sicherheitspunkt)

### 5.1 Entscheidung: eigene schlanke Implementierung + `ipaddr.js`

**Nicht** eine Fertig-Lib wie `ssrf-req-filter`, **sondern** eine eigene, reine Klassifikationsfunktion (`ssrf-guard.ts`) plus eine kleine Orchestrierung (`ssrf-fetch.ts`), wobei **nur** die IP-Parsing/-Klassifikation aus `ipaddr.js` kommt. Begründung:

- Eine Fertig-Lib ersetzt den HTTP-Client und kollidiert mit zwei harten Anforderungen dieser Phase: (a) **jeder Redirect-Hop muss erneut geprüft werden** (AK-1.4 „Redirects auf solche Ziele werden abgelehnt“) und (b) die Prüfung muss **vor** dem Verbinden gegen DNS-Rebinding bestehen (IP-Pinning). Beides erfordert, dass wir den Fetch selbst steuern (`redirect:'manual'`, eigener `connect`), was eine Client-ersetzende Lib nicht hergibt.
- Die Klassifikation ist **Sicherheitskern**: IPv4/IPv6-Bereiche, IPv4-mapped IPv6, Hex/Dezimal/Oktal-Kurzformen. Genau dafür ist `ipaddr.js` eine winzige, ausgereifte Lib — Hand-Rollen von IPv6-Range-Arithmetik ist der klassische „Libs wo sinnvoll“-Fall. Die Orchestrierung (Schema, Redirects, Limits, Fehler-Modell) ist dagegen projekt-spezifisch und gehört zu uns (testbar gegen das bestehende `Problem`-Modell).

### 5.2 Ablauf (`ssrf-fetch.ts`)

1. `new URL(raw)`; Schema muss `http:` oder `https:` sein, sonst `SsrfBlockedError` (`file:`, `ftp:`, `gopher:`, `data:` … abgelehnt).
2. Host normalisieren (siehe 5.3) und — falls IP-Literal — direkt klassifizieren, sonst `dns.promises.lookup(host, { all: true })` und **jede** zurückgegebene Adresse (A und AAAA) klassifizieren. Auch **eine** private Adresse → Ablehnung (konservativ, weil ein Host auf mehrere IPs zeigen kann).
3. Verbinden über einen undici-`Agent` mit `connect`-Option, der auf die **bereits geprüfte** IP verbindet und den ursprünglichen `Host`-Header mitschickt. Dadurch löst der Fetch **nicht** erneut auf (DNS-Rebinding-Zeitfenster geschlossen).
4. Antwort mit `redirect:'manual'` verarbeiten; ein `3xx`-`Location` wird als **`new URL(location, currentUrl)`** aufgelöst (relative Redirects, §5.3-Minor 2) und als neuer Durchlauf ab Schritt 1 behandelt. Maximal `config.jobFetch.maxRedirects` Hops (Default **5**); darüber `PostingFetchError('redirect-limit')`.
5. Body streamen und bei `config.jobFetch.maxBytes` abbrechen (Default **1 MB**, `PostingFetchError('too-large')`); Gesamtzeitlimit `config.jobFetch.timeoutMs` (Default **10 s**) per `AbortController` (`PostingFetchError('timeout')`).
6. Text extrahieren (`stripHtml`/`htmlToText`, `<script>`/`<style>` vorher entfernt); ohne verwertbaren Text (`< ~20 Nicht-Leerzeichen`) → `NoTextError` (AK-1.5).

Die Limits (Hops, Bytes, ms) sind **Env-konfigurierbare Betriebsparameter** (entschieden Q5): `JOB_FETCH_MAX_REDIRECTS`, `JOB_FETCH_MAX_BYTES`, `JOB_FETCH_TIMEOUT_MS`, geparst in `config.ts` unter `config.jobFetch` mit sicheren Defaults und `Math.max`-Klemmung (Muster der bestehenden `JOB_SOURCE_*`-Limits). `config-validation.ts` warnt bei unsinnigen Extremwerten (z. B. `maxRedirects > 20` oder `timeoutMs > 60_000`). Die **IP-Klassifikation und die Per-Hop-Prüfung bleiben hart verdrahtet** — Env steuert nur die Ressourcen-Limits, nie, *ob* geprüft wird.

### 5.3 Abgelehnte Ziele (Klassifikation in `ssrf-guard.ts`, reine Funktion)

- **IPv4**: `0.0.0.0/8`, `10.0.0.0/8`, `100.64.0.0/10` (CGNAT), `127.0.0.0/8`, `169.254.0.0/16`, `172.16.0.0/12`, `192.168.0.0/16`, `198.18.0.0/15`, `224.0.0.0/4`, `240.0.0.0/4`, `255.255.255.255/32`.
- **IPv6**: `::/128`, `::1/128`, `fe80::/10` (link-local), `fc00::/7` (ULA), `ff00::/8` (multicast).
- **IPv4-mapped / -compatible IPv6** (`::ffff:a.b.c.d`, `::a.b.c.d`): auspacken und die eingebettete IPv4 erneut klassifizieren.
- **NAT64** (`64:ff9b::/96`, RFC 6052): Präfix erkennen, die eingebettete IPv4 (letzte 32 Bit) erneut klassifizieren. `ipaddr.js` deckt das **nicht** allein ab — eigene Präfix-Prüfung + eingebettete-IPv4-Klassifikation.
- **Nicht-dotted Sonderformen** des Hosts (der eigentliche AK-1.4-Punkt „Decimal/IPv6-Sonderformen“): `2130706433` (Dezimal), `0x7f000001`/`0x7F000001` (Hex), `0177.0.0.1`-artig (Oktal), `127.1`/`127.0.1` (Kurzform) werden **vor** der DNS-Auflösung zu ihrem Dotted-Quad normalisiert und dann klassifiziert — so fängt der Guard sie auch dann, wenn die lokale `dns.lookup` sie unterschiedlich auflöst.

### 5.4 Einbettung

`PageFetcher` ist ein eigener Port mit dem Adapter `ssrf-fetch.ts`; er wird **nur** vom `JobPostingExtractService.fromUrl` verwendet. Die Betreiber-konfigurierten Boards (`job-source-factory`) bleiben beim JSON-`HttpFetch`/`resilientFetch` — sie rufen feste, vom Betreiber gewählte Endpunkte auf, keine Nutzer-URLs.

---

## 6. KI-Extraktion

### 6.1 Feature

Neues LLM-Feature über den bestehenden `LlmFeatureRunner` (kein neuer Runner, kein zweiter Mechanismus):

- `domain/job-posting-extract.ts`: `jobPostingExtractPrompt(text)` (striktes JSON, „Do not invent anything. Leave unknown fields empty or as an empty list.“ plus eine explizite Anweisung, den Anzeigentext als **untrusted data** zu behandeln und darin enthaltene Instruktionen zu ignorieren — Prompt-Injection-Schutz, derselbe Ehrlichkeits-Grounding wie `document-parse.ts`) und `jobPostingExtractResultSchema = z.object({ company: z.string(), title: z.string(), location: z.string(), country: z.string(), requirements: z.array(z.string()) })`.
- `services/job-posting-extract-service.ts` nutzt `LlmFeatureRunner.runFeature(…, 'postingExtract', MAX_TOKENS.postingExtract, …)` mit `accept`-Guard (leerer Titel **und** Firma → `UpstreamProviderError`, kein stummer Leer-Entwurf). Der Eingabetext wird auf `MAX_POSTING_TEXT` (50.000) begrenzt.
- `MAX_TOKENS.postingExtract` (≈ 600) und `UsageFeature.postingExtract` ergänzen (Metering läuft automatisch, ADR-0005).

### 6.2 Verhalten ohne Key (Entscheidung, ADR-0058)

`POST /job-postings/extract` trägt `@RequiresAi()` → ohne `ANTHROPIC_API_KEY`/`GEMINI_API_KEY` antwortet die Route **503 `ai-not-configured`** (exakt konsistent zu Phase 0). Es gibt **keinen** deterministischen Parser und **keinen** Rohtext-Fallback (ADR-0005 ist abgeschafft). **URL/Text-Einfügen ist ohne Key bewusst nicht möglich** — die UI zeigt „KI nicht eingerichtet“ mit Link zu den Einstellungen (wie AK-0.6). Kein manuelles Formular (entschieden Q1). Begründung: Anders als beim CV-Import (benannter „Text übernehmen“-Modus, weil Rohtext unersetzbar ist) besteht eine Stelle aus wenigen, leicht von Hand eintippbaren Feldern, und der goldene Pfad bleibt ohne Key über **„Stelle übernehmen“** vollständig begehbar.

`adopt` („Übernehmen“) und `GET`/`DELETE`/`PATCH`/`create` laufen **ohne** KI und ohne Key.

### 6.3 Fehlerfälle

- Kein Key: 503 `ai-not-configured` (Guard, vor Body-Validierung — wie in Phase 0 dokumentiert).
- Anbieter nicht erreichbar / unbrauchbare oder leere Antwort: 502 `upstream-provider`.
- URL-Fetch-Fehler: siehe §4.3 (400 `ssrf-blocked`, 502 `posting-fetch`, 422 `no-text`).

---

## 7. Testplan

Namensschema `Subject_StateUnderTest_ExpectedBehaviour`, AAA. Für alle neuen/geänderten Server-Dateien **100 % Branch-Coverage** anstreben; Schwellen unverändert (≥ 90 % gesamt). KI läuft in allen automatischen Tests über den Fake-`LlmService`/`FakeLlmProvider`.

### 7.1 Unit (`server/__tests__/unit/`)

**`ssrf-guard.test.ts`** (neu, AK-1.4 — ein Test pro Fall). Der Guard ist eine **reine Funktion ohne I/O**: der Einstieg ist `classifyAddresses(addresses: string[]): boolean` (alle Adressen müssen öffentlich sein); die DNS-Auflösung lebt in `ssrf-fetch.ts`.

- `SsrfGuard_SchemeFile_Rejected`
- `SsrfGuard_SchemeFtpOrGopher_Rejected`
- `SsrfGuard_HostLoopbackIpv4_Rejected` (`127.0.0.1`)
- `SsrfGuard_HostRfc1918_Rejected` (`it.each`: `10.0.0.1`, `172.16.0.1`, `192.168.1.1`)
- `SsrfGuard_HostLinkLocal_Rejected` (`169.254.169.254`)
- `SsrfGuard_HostCgnat_Rejected` (`100.64.0.1`)
- `SsrfGuard_HostIpv6Loopback_Rejected` (`::1`, `[::1]`)
- `SsrfGuard_HostIpv6LinkLocal_Rejected` (`fe80::1`)
- `SsrfGuard_HostIpv6Ula_Rejected` (`fc00::1`)
- `SsrfGuard_HostIpv4MappedIpv6_Rejected` (`::ffff:127.0.0.1`, `::ffff:10.0.0.1`)
- `SsrfGuard_HostIpv4CompatibleIpv6_Rejected` (`::127.0.0.1`)
- `SsrfGuard_HostNat64_Rejected` (`64:ff9b::7f00:1` — eingebettete IPv4 `127.0.0.1` wird erneut klassifiziert)
- `SsrfGuard_HostDecimalNotation_Rejected` (`2130706433`, `167772161`)
- `SsrfGuard_HostHexNotation_Rejected` (`0x7f000001`)
- `SsrfGuard_HostOctalNotation_Rejected` (`0177.0.0.1`)
- `SsrfGuard_HostDottedShorthand_Rejected` (`127.1`, `10.1`)
- `SsrfGuard_HostLocalhost_Rejected` (Hostname `localhost` → gemockter Lookup liefert `127.0.0.1`; Prüfung liegt im `ssrf-fetch.test.ts`, der Guard testet `classifyAddresses(['127.0.0.1'])`)
- `SsrfGuard_HostPublic_Accepted` (`93.184.216.34`, `example.com`)
- `SsrfGuard_ClassifyAddresses_MixedResolutionOnePrivate_Rejected` (`classifyAddresses(['93.184.216.34', '10.0.0.1'])` → abgelehnt, konservativ bei gemischter Auflösung)

**`ssrf-fetch.test.ts`** (neu, AK-1.4)

- `SsrfFetch_RedirectChainFollowedAndEachHopRechecked`
- `SsrfFetch_RelativeRedirect_ResolvedAgainstCurrentUrl`
- `SsrfFetch_RedirectToPrivate_Rejected`
- `SsrfFetch_HostResolvingMixedAddresses_Rejected` (DNS liefert öffentliche **und** private Adresse → abgelehnt)
- `SsrfFetch_HostLocalhost_Rejected` (Lookup → `127.0.0.1`)
- `SsrfFetch_TooManyRedirects_ThrowsPostingFetchRedirectLimit`
- `SsrfFetch_BodyOverSizeLimit_ThrowsPostingFetchTooLarge`
- `SsrfFetch_Timeout_ThrowsPostingFetchTimeout`
- `SsrfFetch_Non2xx_ThrowsPostingFetch`
- `SsrfFetch_PageWithoutText_ThrowsNoText`
- `SsrfFetch_ScriptHeavyLoginPage_ThrowsNoText` (AK-1.5: `<script>`/`<style>` zählen nicht als Text)
- `SsrfFetch_HtmlPage_ReturnsStrippedTextAndFinalUrl`
- `SsrfFetch_ConnectsToVettedIp` (DNS-Rebinding: der Agent verbindet auf die geprüfte IP, nicht erneut aufgelöst)

**`job-posting-service.test.ts`** (neu, AK-1.1/1.2/1.6)

- `JobPostingService_Adopt_StoresPostingWithFullDescriptionAndRequirements`
- `JobPostingService_Adopt_SourceWithoutDetail_StoresIncompleteAndFlagsIt`
- `JobPostingService_Adopt_SameSourceAndSourceId_ReturnsExistingWithAlreadySaved`
- `JobPostingService_Adopt_SameUrl_ReturnsExistingWithAlreadySaved`
- `JobPostingService_Adopt_DifferentWorkspaceSamePosting_CreatesSeparately`
- `JobPostingService_Adopt_UnknownSource_ThrowsNotFound`
- `JobPostingService_Adopt_DetailFetchFails_ThrowsPostingFetch`
- `JobPostingService_Create_EditDraft_Persists` (Extrakt → Edit → Save)
- `JobPostingService_Update_CompletesDescription_ResetsIncompleteFlag`
- `JobPostingService_Delete_RemovesOnlyOwnedPosting`
- `JobPostingService_List_SearchFilterMatchesCompanyTitleLocationDescription`

**`job-posting-extract-service.test.ts`** (neu, AK-1.3/1.5/6)

- `JobPostingExtractService_NoProvider_ThrowsAiNotConfiguredAndMakesNoCall`
- `JobPostingExtractService_ProviderFails_ThrowsUpstreamProviderError`
- `JobPostingExtractService_ReplyUnusableOrEmpty_ThrowsUpstreamProviderError`
- `JobPostingExtractService_ValidText_ReturnsDraftFieldsWithDescription`
- `JobPostingExtractService_FromUrl_FetchesPageThenExtracts`
- `JobPostingExtractService_FromUrl_PageWithoutText_ThrowsNoText`
- `JobPostingExtractService_FromUrl_SsrfBlocked_ThrowsSsrfBlocked`

**Adapter/Domain/Config**

- `job-posting.test.ts` (Domain): `CreateJobPostingSchema_MissingCompany_Rejected`, `AdoptJobPostingSchema_NeitherSourceIdNorUrl_Rejected`, `ExtractJobPostingSchema_BothTextAndUrl_Rejected` (union), `ExtractJobPostingSchema_ExactlyOne_Accepted`, `CreateJobPostingSchema_UrlOver2000Chars_Rejected`, `NormalizeUrl_StripsFragmentTrailingSlashAndLowercasesHost`, `DedupKeyFor_SourceIdPresent_UsesSourceAndSourceId`, `DedupKeyFor_OnlyUrl_UsesUrl`, `DedupKeyFor_EmptySourceId_TreatedAsUndefined`
- `job-posting-extract.test.ts` (Domain): `JobPostingExtractPrompt_WrapsTextAsUntrustedDataAndInstructsToIgnoreEmbeddedInstructions`, `JobPostingExtractResultSchema_RejectsMissingFields`
- `fs-job-posting-repository.test.ts`: `FsJobPostingRepository_List_FiltersByOwner`, `…_FindDuplicate_SameUrlDifferentSource_ReturnsExisting`, `…_FindDuplicate_HostCaseTrailingSlash_ReturnsExisting` (normalisierte URL vom Service, roher Vergleich), `…_TwoWorkspaces_AreIsolated`, `…_CorruptFile_ReturnsEmpty`, `…_ConcurrentWrites_AreSerialized` (Mutex, kein lost update)
- `fs-saved-search-repository.test.ts` (ändern): `FsSavedSearchRepository_List_FiltersByOwner`, `…_LegacyRowWithoutOwner_DefaultsToTeam`, `…_TwoWorkspaces_AreIsolated`
- `sql-mappers.test.ts` (ändern): `JobPostingToRow_RoundTrips`, `RowToJobPosting_HandlesIncompleteFlag`, `SavedSearchToRow_RoundTripsIncludingOwnerId`
- `job-source-adapters.test.ts` (ändern): `ArbeitnowJobSource_GetPosting_ReturnsFullDescription`, `BundesagenturJobSource_GetPosting_FetchesDetailEndpoint`, `AdzunaJobSource_GetPosting_ReturnsNull`
- `composite-job-source.test.ts` (ändern): `CompositeJobSource_GetPosting_DelegatesToMatchingSource`
- `persistence-factory.test.ts` (ändern): `PersistenceFactory_Fs_ProvidesJobPostingRepository`, `PersistenceFactory_Sql_ProvidesJobPostingRepository`
- `problem.test.ts` (ändern): `Problem_SsrfBlockedError_MapsTo400SsrfBlocked`, `Problem_NoTextError_MapsTo422`, `Problem_PostingFetchError_MapsTo502WithReasonInDetail` (`detail` enthält das `reason`, z. B. `redirect-limit`/`too-large`/`timeout`)

**`saved-search-service.test.ts`** (ändern, RI15/Q6)

- `SavedSearchService_List_FiltersByScope`
- `SavedSearchService_Create_SetsOwnerIdFromScope`
- `SavedSearchService_Remove_OnlyOwned` (fremde Scope-Id → `NotFoundError`)
- `SavedSearchService_Run_OnlyOwned` (fremde Scope-Id → `NotFoundError`)

**`config-validation.test.ts`** (ändern, Q5)

- `CheckProductionReadiness_JobFetchDefaults_NoWarning`
- `CheckProductionReadiness_JobFetchExtremeRedirects_Warns`
- `CheckProductionReadiness_JobFetchExtremeTimeout_Warns`
- `Config_JobFetchEnv_ClampsNegativeValuesToDefaults`

**OpenAPI** (`openapi-contract.test.ts`, ändern)

- `OpenApi_JobPostingSchema_DocumentsEveryZodField` (inkl. `descriptionIncomplete`, `requirements`)
- `OpenApi_JobPostingRoutes_Exist` (P01–P07)
- `OpenApi_Extract_Documents503AiNotConfiguredAnd422NoTextAnd400SsrfBlocked`

**Frontend (Vitest, `UI/__tests__/`)**

`job-postings-ui.test.jsx` (neu, AK-1.1/1.5/1.6/1.7)

- `JobPostingsList_Rendered_ShowsSavedPostings`
- `JobPostingsList_Search_FiltersClientSide`
- `JobPostingsDetail_ShowsFullDescription`
- `JobPostingsDetail_Incomplete_ShowsTextErgaenzen`
- `JobPostingsList_Delete_ShowsUndoAndRestores` (`use-undo-delete`)
- `Adopt_ApiReturnsAlreadySaved_ShowsBereitsGespeichertUndOeffnet`
- `InsertDialog_TextPath_ShowsEditablePreviewBeforeSave`
- `InsertDialog_UrlPath_SsrfBlocked_ShowsClearError`
- `InsertDialog_UrlPath_NoText_ShowsBitteAnzeigentextEinfuegen` (AK-1.5)
- `InsertDialog_NoAiKey_ShowsNotConfiguredAndSendsNoRequest` (AK-0.6-Muster)
- `RecruitApi_JobPostingMethods_UseCorrectEndpoints` (`data.test.js`)

`matching-overnehmen.test.jsx` (neu, AK-1.1)

- `Matching_AdoptButton_CallsAdoptAndMarksDone`
- `Matching_AdoptAlreadySaved_OpensExistingPosting`

### 7.2 Integration

**Acceptance (Nest, `makeNestApp`, in-memory-Fakes) — `server/__tests__/acceptance/`**

`nest-job-postings.test.ts` (neu)

- `JobPostings_NoLogin_Returns401` (`it.each` der sieben Routen)
- `JobPostings_TwoWorkspaces_AreIsolated` (AK-1.8: `SELF_SERVE_TENANTS=true`, zwei Admins, A sieht Bs Stellen nicht, und umgekehrt)
- `JobPostings_ForeignId_GetPatchDelete_Return404` (AK-1.8: Workspace A `GET`/`PATCH`/`DELETE` von Bs Posting-Id → 404, nicht nur Listen-Isolation)
- `Adopt_ValidSource_StoresAndSubsequentListContainsIt` (AK-1.1: adopt → `GET /job-postings` enthält die Stelle, Reload-Beweis)
- `Adopt_DuplicateSourceAndSourceId_ReturnsAlreadySaved` (AK-1.6)
- `Adopt_DuplicateUrl_ReturnsAlreadySaved` (AK-1.6, inkl. Host-Case/Trailing-Slash-Variante gegen die normalisierte URL)
- `Adopt_UnknownSource_Returns404`
- `Adopt_SourceWithoutDetail_ReturnsIncompletePosting` (AK-1.2)
- `Adopt_OnlyUrlWithoutSourceId_ReturnsIncompletePosting` (AK-1.2)
- `Extract_NoKey_Returns503AiNotConfigured` (AK-1.3 ohne Key, `@RequiresAi`)
- `Extract_NoKeyAndInvalidBody_Returns503Before400`
- `Extract_FakeProvider_ReturnsDraft` (AK-1.3 mit Fake-LLM)
- `Extract_FakeProvider_DraftContainsUrl` (AK-1.6: `fromUrl` trägt `url`, damit `create` deduplizieren kann)
- `Extract_ProviderReturnsGarbage_Returns502`
- `Extract_Url_SsrfBlocked_Returns400SsrfBlocked` (AK-1.4, `FakePageFetcher` wirft)
- `Extract_Url_NoText_Returns422NoText` (AK-1.5)
- `Create_Draft_PersistsAndIsEditable` (AK-1.3)
- `Create_DuplicateUrl_ReturnsAlreadySaved` (AK-1.6: „per URL eingefügt“ vs. bestehende URL)
- `Update_CompletesIncompleteDescription` (AK-1.2 „Text ergänzen“)
- `Delete_RemovesPosting_SubsequentGet404s` (AK-1.7; Undo ist clientseitig, #200)
- `JobPostings_VermittlungOff_StillVisible` (Guard-Reihenfolge/Drift: `/job-postings` trägt kein `@RequiresVermittlung`)

`nest-ai-contract.test.ts` (ändern): `describe.each(AI_ROUTES)` deckt jetzt auch **K12** (`POST /job-postings/extract`) ab — die `BODY`-Map erhält `K12: { text: 'x' }`; die 503-ohne-Key-, „kein generierter Text“- und „kein Provider-Aufruf“-Familien laufen automatisch für die Extrakt-Route mit.

`nest-ats-searches.test.ts` (ändern, RI15/Q6)

- `SavedSearches_NoLogin_Returns401` (alle vier Routen)
- `SavedSearches_TwoWorkspaces_AreIsolated` (`SELF_SERVE_TENANTS=true`: Workspace A sieht/löscht/startet Bs Suchen nicht, `DELETE`/`run` fremder Id → 404)
- `SavedSearches_Create_SetsOwnerIdFromScope`
- `SavedSearches_VermittlungOff_StillVisible` (kein `@RequiresVermittlung`)

**Postgres (`server/__tests__/integration/*.integration.test.ts`, `DATABASE_URL`-gated)**

`sql-repositories.integration.test.ts` (ändern): `TRUNCATE`-Liste um `job_postings` erweitern; neue Fälle:

- `SqlJobPostingRepository_List_FiltersByOwner`
- `SqlJobPostingRepository_AddThenFindDuplicate_ReturnsExisting`
- `SqlJobPostingRepository_AddThenFindDuplicate_HostCaseTrailingSlash_ReturnsExisting` (normalisierte URL, roher Vergleich im Adapter; Unique-Index `(owner_id, url)` deckt normalisierungsgleiche URLs ab)
- `SqlJobPostingRepository_TwoWorkspaces_AreIsolated`
- `SqlJobPostingRepository_ConcurrentDuplicateInsert_ReturnsExisting` (Rennsituation: zwei `add` derselben `(source, sourceId)`, eine fängt `23505` und re-queried)
- `SqlSavedSearchRepository_List_FiltersByOwner` (RI15/Q6)
- `SqlSavedSearchRepository_RemoveOnlyOwned` (RI15/Q6)

Migration (im selben `sql-repositories.integration.test.ts`, der bereits `migrate` + `TRUNCATE` nutzt; es gibt **keine** separate `sql-migration.integration.test.ts`):

- `Migrate_FreshDatabase_CreatesJobPostingsTableAndIndexes`
- `Migrate_SavedSearchesOwnerId_BackfillsToTeam` (Legacy-Zeile ohne `owner_id` wird nach `migrate` dem Workspace `team` zugeordnet)
- `Migrate_RunTwice_IsIdempotent` (um `job_postings` und `saved_searches.owner_id` ergänzt)

**Playwright (`e2e/ui.spec.ts`, `e2e/mobile.spec.ts`, API gemockt)**

- `StellenView_AdoptFromSearch_PersistsAndAppearsInList` (AK-1.1, Desktop; mit explizitem `page.reload()` vor der Listen-Prüfung — Reload-Nachweis)
- `StellenView_InsertByText_ExtractsAndSaves` (AK-1.3)
- `StellenView_InsertByUrl_ExtractsAndSaves` (AK-1.3/1.4/1.5, Desktop; URL-Eintrittsweg einmal end-to-end; die ssrf-blocked/no-text-Fehleranzeige deckt Vitest ab)
- `StellenView_DuplicateAdopt_ShowsBereitsGespeichert` (AK-1.6)
- `StellenView_Delete_UndoRestores` (AK-1.7, clientseitiges Undo #200)
- `StellenViewMobile_ListAndDetail_Reachable` (393 px, AK-1.7)

### 7.3 Manuell

Abschnitt 9 (gegen echt gestarteten Server, `STORE=sql` und `STORE=fs`, echter KI-Key wenn vorhanden, sonst der Pfad „KI nicht eingerichtet“).

---

## 8. AK-Matrix

| AK     | Kriterium (Kurzform)                                  | Beleg (Testnamen bzw. Protokollschritt) |
| ------ | ----------------------------------------------------- | --------------------------------------- |
| AK-1.1 | „Stelle übernehmen“ speichert (Quelle, Firma, Titel, Ort, URL, Anzeigentext) nach Reload | Unit `JobPostingService_Adopt_StoresPostingWithFullDescriptionAndRequirements`; Acceptance `Adopt_ValidSource_StoresAndSubsequentListContainsIt`; Vitest `JobPostingsList_Rendered_ShowsSavedPostings`, `Matching_AdoptButton_CallsAdoptAndMarksDone`; Playwright `StellenView_AdoptFromSearch_PersistsAndAppearsInList` (mit `page.reload()`); Protokoll 3, F2 |
| AK-1.2 | Arbeitnow + BA voller Text (BA Detail-Abruf); Adzuna „unvollständig“ + „Text ergänzen“ | Unit `ArbeitnowJobSource_GetPosting_ReturnsFullDescription`, `BundesagenturJobSource_GetPosting_FetchesDetailEndpoint`, `AdzunaJobSource_GetPosting_ReturnsNull`, `JobPostingService_Adopt_SourceWithoutDetail_StoresIncompleteAndFlagsIt`, `JobPostingService_Update_CompletesDescription_ResetsIncompleteFlag`; Acceptance `Adopt_SourceWithoutDetail_ReturnsIncompletePosting`, `Adopt_OnlyUrlWithoutSourceId_ReturnsIncompletePosting`, `Update_CompletesIncompleteDescription`; Vitest `JobPostingsDetail_Incomplete_ShowsTextErgaenzen`; Protokoll 4, 5, F3 |
| AK-1.3 | „Einfügen per Text“: 5/5 Fixtures korrekt extrahiert, Felder editierbar | Unit `JobPostingExtractService_ValidText_ReturnsDraftFieldsWithDescription`; Acceptance `Extract_FakeProvider_ReturnsDraft`, `Create_Draft_PersistsAndIsEditable`; Vitest `InsertDialog_TextPath_ShowsEditablePreviewBeforeSave`; Playwright `StellenView_InsertByText_ExtractsAndSaves`; Protokoll 6 (5 Fixtures), F4 |
| AK-1.4 | SSRF-geschützt (private/loopback/link-local, IPv6/Mapped/Decimal, `file://`, Redirects; Limits) | Unit `SsrfGuard_*` (ein Test pro Fall, inkl. NAT64/localhost) und `SsrfFetch_*` (Limits, Per-Hop); Acceptance `Extract_Url_SsrfBlocked_Returns400SsrfBlocked`; Q5-Limits (Env): Unit `CheckProductionReadiness_JobFetch*`, `Config_JobFetchEnv_ClampsNegativeValuesToDefaults`; Protokoll 7 (Skript über alle Ziele), 7a (Env-Limits) |
| AK-1.5 | Login/JS-Seiten → „Bitte Anzeigentext einfügen“ statt leerer Stelle | Unit `SsrfFetch_PageWithoutText_ThrowsNoText`, `SsrfFetch_ScriptHeavyLoginPage_ThrowsNoText`; Acceptance `Extract_Url_NoText_Returns422NoText`; Vitest `InsertDialog_UrlPath_NoText_ShowsBitteAnzeigentextEinfuegen`; Protokoll 8 |
| AK-1.6 | Duplikate (source+sourceId oder URL) → kein zweiter Eintrag, „Bereits gespeichert → öffnen“ | Unit `JobPostingService_Adopt_SameSourceAndSourceId_ReturnsExistingWithAlreadySaved`, `…_SameUrl_…`; Acceptance `Adopt_DuplicateSourceAndSourceId_ReturnsAlreadySaved`, `Adopt_DuplicateUrl_ReturnsAlreadySaved`, `Create_DuplicateUrl_ReturnsAlreadySaved`, `Extract_FakeProvider_DraftContainsUrl`; Integration `SqlJobPostingRepository_ConcurrentDuplicateInsert_ReturnsExisting`, `…_AddThenFindDuplicate_HostCaseTrailingSlash_ReturnsExisting`; Vitest `Adopt_ApiReturnsAlreadySaved_ShowsBereitsGespeichertUndOeffnet`; Playwright `StellenView_DuplicateAdopt_ShowsBereitsGespeichert`; Protokoll 9 |
| AK-1.7 | Liste durchsuchbar, löschbar (Undo #200), Detailansicht voller Text | Unit `JobPostingService_List_SearchFilterMatchesCompanyTitleLocationDescription`, `…Delete_RemovesOnlyOwnedPosting`; Acceptance `Delete_RemovesPosting_SubsequentGet404s`; Vitest `JobPostingsList_Search_FiltersClientSide`, `JobPostingsDetail_ShowsFullDescription`, `JobPostingsList_Delete_ShowsUndoAndRestores`; Playwright `StellenView_Delete_UndoRestores`, `StellenViewMobile_ListAndDetail_Reachable`; Protokoll 10, 11 |
| AK-1.8 | Workspace-Isolation | Unit `JobPostingService_Adopt_DifferentWorkspaceSamePosting_CreatesSeparately`, `FsJobPostingRepository_TwoWorkspaces_AreIsolated`; Acceptance `JobPostings_TwoWorkspaces_AreIsolated`, `JobPostings_ForeignId_GetPatchDelete_Return404`; Integration `SqlJobPostingRepository_TwoWorkspaces_AreIsolated`; Protokoll 12 |
| RI15 (Q6) | `/searches` workspace-gebunden (Scope-Lücke geschlossen) | Unit `SavedSearchService_List_FiltersByScope`, `…_Create_SetsOwnerIdFromScope`, `…_Remove_OnlyOwned`, `…_Run_OnlyOwned`, `FsSavedSearchRepository_*`; Acceptance `SavedSearches_TwoWorkspaces_AreIsolated`, `…_Create_SetsOwnerIdFromScope`; Integration `SqlSavedSearchRepository_List_FiltersByOwner`, `…_RemoveOnlyOwned`, `Migrate_SavedSearchesOwnerId_BackfillsToTeam`; Protokoll 12a |

---

## 9. Manuelles Testprotokoll

Format je Schritt: **Aktion | erwartetes Ergebnis**; beim Durchlauf ergänzt der Implementer **tatsächlich** und **ok** und fügt die Tabelle in die PR-Beschreibung ein. Alle Daten synthetisch. Skripte/Cookies im Scratchpad.

### 9.0 Vorbereitung (einmal)

- `npm run build`.
- fs-Daten: vor dem fs-Durchlauf `git status` notieren, danach `git checkout -- archive/bewerbungen` und neue Dateien dort löschen. Nie committen.
- `export APP_SECRET=<zufällig>`; `SELF_SERVE_TENANTS` aus (ein Workspace `team`, erstes Konto Admin).
- KI-Key: Durchlauf ohne Key (`unset ANTHROPIC_API_KEY GEMINI_API_KEY`), dann — sofern der Owner einen Key setzt — Schritte 6 (KI-Teil) und 13 mit echtem Key; sonst als „blockiert“ melden.

### 9.1 `STORE=sql`

Vorbereitung: `service postgresql start`; `psql -U postgres -c "create database myjob_phase1"`; Start mit `STORE=sql DATABASE_URL=postgres://postgres:postgres@localhost:5432/myjob_phase1 PORT=3100 npm start`. Zum Schluss `drop database myjob_phase1`.

| #  | Aktion | Erwartet |
| -- | ------ | -------- |
| 1  | Server starten (ohne Key), Log, `curl /api/v1/health` | „Application suite running“; `{"status":"ok"}` (DI des neuen Moduls scheitert nicht still) |
| 2  | `POST /auth/register` (Admin), Cookie merken | 201, Rolle `admin` |
| 3  | Portal-Suche öffnen (Vermittlung aus), eine Arbeitnow-Stelle „Übernehmen“, Reload, in „Stellen“ öffnen | Stelle mit Quelle, Firma, Titel, Ort, URL und **vollem** Anzeigentext vorhanden (AK-1.1) |
| 4  | Eine Bundesagentur-Stelle „Übernehmen“, Detail öffnen | Voller Anzeigentext (Detail-Abruf), `descriptionIncomplete` false (AK-1.2) |
| 5  | Eine Adzuna-Stelle „Übernehmen“ (sofern Adzuna-Credentials gesetzt; sonst überspringen), Detail öffnen, „Text ergänzen“ | Als „Anzeigentext unvollständig“ markiert; „Text ergänzen“ speichert den vollen Text und hebt die Markierung (AK-1.2) |
| 6  | „Stelle einfügen“ per Text mit 5 anonymisierten Fixtures (jobs.ch, StepStone, LinkedIn, Karriereseite, Freitext); Felder vor dem Speichern prüfen/ändern, speichern | Firma, Titel, Ort in **5/5** korrekt extrahiert (mit Key); ohne Key: 503 und UI-Hinweis „KI nicht eingerichtet“, keine Anfrage (AK-1.3, AK-0.6) |
| 7  | Skript ruft `extract` mit `{ url }` für: `http://127.0.0.1`, `http://localhost`, `http://10.0.0.1`, `http://172.16.0.1`, `http://192.168.1.1`, `http://169.254.169.254`, `http://[::1]`, `http://[fe80::1]`, `http://2130706433`, `http://0x7f000001`, `file:///etc/passwd`, eine öffentliche URL, die auf `127.0.0.1` redirectet | Jede verbotene Zeile 400 `about:blank#ssrf-blocked`; die Redirect-URL 400; keine Anfrage erreicht ein internes Ziel (AK-1.4) |
| 7a | Server mit `JOB_FETCH_MAX_REDIRECTS=0` und `JOB_FETCH_MAX_BYTES=1000` neu starten; `extract` mit einer öffentlichen, redirectenden URL bzw. einer Seite > 1 KB; danach mit unsinnigen Werten (`JOB_FETCH_MAX_REDIRECTS=99`) starten | `maxRedirects=0` → 502 `posting-fetch` (`redirect-limit`); `maxBytes=1000` → 502 `too-large`; beim Boot mit `99` eine Warnung im Log (Q5-Validierung) (AK-1.4/Q5) |
| 8  | `extract` mit `{ url }` auf eine Login-/SPA-Seite (z. B. eine LinkedIn-URL) | 422 `about:blank#no-text`, UI „Bitte Anzeigentext einfügen“ (AK-1.5) |
| 9  | Dieselbe Stelle zweimal „Übernehmen“ (gleiche Quelle+Id), dann eine Stelle mit identischer URL per Text/URL einfügen | Kein zweiter Eintrag; UI „Bereits gespeichert → öffnen“ (AK-1.6) |
| 10 | Stellen-Liste: Suchfeld (Firma/Titel/Ort/Text) | Liste filtert; Detail zeigt vollen Text (AK-1.7) |
| 11 | Stelle löschen, Undo (innerhalb des Undo-Fensters) | Löschen entfernt, Undo stellt wieder her; nach Reload konsistent (AK-1.7) |
| 12 | `SELF_SERVE_TENANTS=true` starten, zweiten Workspace registrieren, dort Stellen abrufen | Zweiter Workspace sieht **keine** Stellen des ersten; umgekehrt ebenso (AK-1.8) |
| 12a | Im Zweit-Workspace eine gespeicherte Suche anlegen (`POST /searches`), im ersten `GET /searches` und `GET /searches/:id/run` bzw. `DELETE /searches/:id` | Erster Workspace sieht die Suche des zweiten nicht; `run`/`delete` der fremden Id → 404 (RI15/Q6) |
| 13 | Mit gesetztem `ANTHROPIC_API_KEY` starten, Extraktion erneut, `GET /settings/llm` | Extraktion `provider` gesetzt, kein Template; Nutzungszähler gestiegen (AK-1.3) |
| 14 | SIGTERM | Sauberer Shutdown, Exit 0 |

### 9.2 `STORE=fs`

Vorbereitung: `git status` notieren; Start mit `STORE=fs PORT=3101 npm start`. Danach `git checkout -- archive/bewerbungen` und neue Dateien löschen.

| #   | Aktion | Erwartet |
| --- | ------ | -------- |
| F1  | Start, `GET /health`, Registrieren | Wie 1–2 |
| F2  | Stelle übernehmen, Reload, `cat archive/bewerbungen/job-postings.json` | Stelle in Liste und in der JSON-Datei (AK-1.1) |
| F3  | Arbeitnow/BA/Adzuna übernehmen | Wie 3–5 (AK-1.2) |
| F4  | Einfügen per Text/URL, SSRF-Skript, no-text, Duplikat, Löschen+Undo | Wie 6–11 (AK-1.3/1.4/1.5/1.6/1.7) |
| F4a | Env-Limits (`JOB_FETCH_MAX_REDIRECTS=0`, `JOB_FETCH_MAX_BYTES=1000`, unsinniger Wert) und `cat archive/bewerbungen/saved-searches.json` | Wie 7a (Limits greifen, Warnung); `saved-searches.json` enthält `ownerId` je Eintrag (RI15/Q6) |
| F4b | `SELF_SERVE_TENANTS=true`, zweiten Workspace registrieren, gespeicherte Suche anlegen, im ersten Workspace `GET /searches` | Erster Workspace sieht die Suche des zweiten nicht (RI15/Q6) |
| F5  | Aufräumen: `git status`, `git checkout -- archive/bewerbungen`, neue Dateien entfernen | Arbeitsbaum zeigt nur die Änderungen der Phase |

---

## 10. Risiken und Entscheidungen

### 10.1 Risiken

| ID  | Risiko | Gegenmaßnahme |
| --- | ------ | ------------- |
| RI1 | **SSRF-Lücke durch DNS-Rebinding** (Erst-Auflösung öffentlich, Fetch löst erneut privat auf). | IP-Pinning: Verbindung auf die geprüfte IP über undici-`connect`, `Host`-Header bleibt; Test `SsrfFetch_ConnectsToVettedIp`. |
| RI2 | **Sonderform-Normalisierung** (`0x7f000001`, `2130706433`, `127.1`) ist subtil und plattformabhängig. | Normalisierung vor der Auflösung in `ssrf-guard.ts`; je ein Unit-Test pro Form (AK-1.4). |
| RI3 | **Volltext-Verfügbarkeit pro Quelle** (BA-Detail-Endpunkt-Form, Adzuna-Länge, Arbeitnow-`description`-Länge) ist im Plan angenommen, nicht live verifiziert. | `getPosting` je Quelle als klar abgegrenzter Adapter; beim Implementieren gegen die Live-API verifizieren; Rückfall `descriptionIncomplete` statt Erfindung. |
| RI4 | **Quellen-übergreifende Duplikate** (dieselbe Anzeige bei zwei Boards) werden nicht erkannt → zwei Einträge. | Bewusst out of scope (ADR-0058); als bekannte Lücke dokumentiert, Folge-Issue. |
| RI5 | **Coverage**: neue Domain/Services erzeugen neue Branches; Baseline ist knapp über 90 %. | `sql-job-posting-repository.ts` wie alle sql-Adapter in die Ausschlussliste (`jest.config.cjs`), durch Integrationstest gedeckt; für neue/geänderte Server-Dateien 100 % Branch anstreben; Schwellen unverändert. |
| RI6 | **KI-Extraktionsqualität** (AK-1.3 verlangt 5/5): Modell kann Firma/Titel/Ort verwechseln oder Felder leer lassen. | `accept`-Guard (leer → 502 statt leerer Stelle), editierbare Vorschau, Fixture-Suite; mit echtem Key im Protokoll gemessen (Schritt 6). |
| RI7 | **Nest beendet bei DI-Fehlern still** (neues Modul, neue Tokens). | Protokoll 1/F1 starten den echten Server; Acceptance nutzt `makeNestApp`. |
| RI8 | **fs-Läufe verändern getrackte Dateien** unter `archive/bewerbungen/`. | Protokoll 9.0/F5; vor jedem Commit `git status`. |
| RI9 | **UML-SVGs**: `docs:check` verlangt `.svg` je `.puml`. | PlantUML rendern (`plantuml -tsvg -nometadata`); sonst CI rendern lassen und Abweichung im PR benennen. |
| RI10 | **Scope-Fix `SavedSearch` (RI15/Q6):** Backfill auf `team` verschiebt Altbestand sichtbar; ein vergessener Lese-/Lösch-Pfad ohne Scope wäre ein erneuter Leak. | Idempotente DDL + `DEFAULT 'team'` (Muster `applications`); jeder Lesezugriff filtert auf `ownerId`; Tests `SavedSearches_TwoWorkspaces_AreIsolated`, `SqlSavedSearchRepository_List_FiltersByOwner`, `Migrate_SavedSearchesOwnerId_BackfillsToTeam`. |

### 10.2 Entschieden vom Owner (verbindlich)

| ID  | Entscheidung | Im Plan verankert |
| --- | ------------ | ----------------- |
| Q1  | „Einfügen per Text/URL“ ohne Key → **503 `ai-not-configured`**, kein manuelles Formular. | §6.2 |
| Q2  | Duplikat → **200 + `alreadySaved`** (UI „Bereits gespeichert → öffnen“), kein 409 im Normalpfad. | §4.3, §3.4 |
| Q3  | Feldname **`ownerId`** (konsistent zu ADR-0010/0033). | §2, §3.1 |
| Q4  | URL-Normalisierung **flach** (Fragment, Trailing-Slash, Host-Case; Query bleibt). | §3.4 |
| Q5  | SSRF-Limits als **Env-Parameter** (`JOB_FETCH_*`, Defaults im Code, Validierung in `config-validation.ts`, Doku in `deployment.md`); IP-Klassifikation/Per-Hop-Prüfung bleiben hart. | §5.2, §2.4, §2.7 |
| Q6  | **RI15 wird in Phase 1 mitbehoben**: `/searches` wird workspace-gebunden (`ownerId`), Backfill auf `team`. | §1.1, §3.5, §4.5, §7, §8 |

**Keine offenen Fragen mehr.** Die Annahme zu Q6 (die plausibelste Lesart von RI15) ist: „gespeicherte Suchen (`/searches`) sind instanzweit statt workspace-gebunden“ — bestätigt durch `server/src/domain/saved-search.ts` (kein `ownerId`) und `server/src/ports/saved-search-repository.ts` (`list()` ohne Scope), wie im Phase-0-Plan (RI15) und in FR-51 („named searches“) dokumentiert.
