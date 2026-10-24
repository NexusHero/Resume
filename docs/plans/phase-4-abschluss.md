# Phase 4 — Abschluss: Bewerbungsmappe, Einfrieren, Status-Übersicht (Implementierungsplan)

Issue #324 · Branch wird vom Orchestrator neu von `origin/main` gestartet · Entscheidung: [ADR-0061](../adr/0061-bewerbungsmappe-freeze-statusfilter.md) · Rahmen: [Orchestrierungs-Prompt](bewerbungsservice-orchestration-prompt.md) (Phase 4, AK-4.1 bis AK-4.6)

Stand: Plan (G1). Es gibt noch keinen Code und keine Tests. Alle Pfade sind relativ zur Repo-Wurzel; `UI/` steht für `design/myjob/ui_kits/recruiting/`.

---

## 1. Ziel und Nicht-Ziele

### 1.1 Ziel

Nach Phase 4 schließt der Bewerbungs-Hauptweg ab: Aus der **angepassten Kopie**
(`JobApplication.documents`, ADR-0059) entsteht die **Bewerbungsmappe** als PDF und
als ZIP inkl. der **je Bewerbung ausgewählten Anhänge** (AK-4.1/4.2); danach wird der
Status gepflegt, die Dokumente ab „versendet“ **eingefroren** (AK-4.5) und es gibt
eine nach **Status filterbare Übersicht** gesamt und pro Mandant (AK-4.6). Konkret:

1. **Anhang-Auswahl je Bewerbung** — persistiert als `selectedAttachmentIds` auf der
   Bewerbung (fs + sql), **PDF-only** (OQ3), Referenz-Anhang manuell wählbar, nie
   vorausgewählt (ADR-0061 §1). Die „verknüpft mit Bewerbung“-Verknüpfung im
   Anhang-Tab wird **jetzt** nachgezogen (OQ5, Datenquelle `selectedAttachmentIds`).
2. **Mappe** — `GET …/dossier/pdf` und `GET …/dossier/zip` rendern die **Kopie**
   (nicht den Basis-CV) in der Reihenfolge **Anschreiben → CV → Anhänge**; bei leerem
   `letter.firma` wird `postingCompany` als Empfänger-Fallback eingesetzt (OQ2);
   Dateiname `Bewerbung_<Mandant>_<Firma>.pdf/.zip` aus den Snapshots; Wiederverwendung
   der PDF-Assembly aus #239 (`renderDossierFromDocuments`), eigene **streaming**-ZIP
   -Montage (OQ4, `yazl`) ohne Reimport-HTML; ZIP-PDF enthält die Anhänge **mit**
   (OQ1) (ADR-0061 §2/§3/§7).
3. **Einfrieren ab „versendet“** — `status !== 'draft'` sperrt
   `PUT …/documents` und `PUT …/attachments` mit 409 `frozen`; Bestätigung über
   `?unfreeze=1` vermerkt die Änderung im `statusHistory` (ADR-0061 §5).
4. **Status-Übersicht** — `GET /job-applications?status=` (Serverfilter, ADR-0061 §6)
   und UI-Filter (Segmented) in der globalen Liste **und** im Mandanten-Tab.

### 1.2 Nicht-Ziele

- **Basis-CV/-Anschreiben bleiben unangetastet.** Kein Schreibpfad; die Mappe liest
  ausschließlich die Kopie. `DocumentService`/`DocumentRepository` werden **nicht**
  geändert (nur `documentsToHtml` erhält die additive `order`-Option, Default
  unverändert, ADR-0061 §4).
- **Die eingefrorene Pipeline-Mappe bleibt unangetastet.** `/talents/:id/dossier/*`,
  `renderDossierZip` (Reimport-ZIP aus #239), `application-builder.ts`,
  `PipelineBoard`, `/applications` und ADR-0031/0046/0048 werden **nicht** angefasst.
  Die neue Mappe ist ein **eigener** Service (`JobApplicationDossierService`), kein
  Umbau des alten Dossier-Pfads.
- **Keine neue KI-Route.** Phase 4 ist deterministisch (Mappe, Filter, Anhänge).
  `route-inventory.ts` `AI_ROUTES` bleibt bei **18** (K01–K18); kein `UsageFeature`,
  kein `MAX_TOKENS`, kein Fake-`LlmService`-Bedarf. Die KI-Routen-Zählung ist vor der
  Umsetzung gegen `server/__tests__/support/route-inventory.ts` zu verifizieren (Stand
  hier: K01–K18).
- **Kein Vermittler-Bezug.** Die neuen Routen tragen **kein** `VermittlungGuard` und
  **kein** `PlanGuard` (Bewerbung ist Hauptweg, wie Stellen/ADR-0058 und
  Bewerbung/ADR-0059).
- **Kein Big-Bang-Rename**, keine Änderung der Coverage-Schwellen (Jest ≥ 90 %).

---

## 2. Betroffene Dateien/Module

Legende: **neu**, **ändern**, **prüfen**. `scope` = `ownerId` (ADR-0010/0033). `UI/`
= `design/myjob/ui_kits/recruiting/`.

### 2.1 Domain (`server/src/domain/`)

| Datei                | Aktion | Inhalt                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| -------------------- | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `job-application.ts` | ändern | Interface: `selectedAttachmentIds: string[]`; `JobApplicationStatusChange` erhält optionales `note?: string`; `appendStatusChange(history, status, at, note?)`; neues `updateJobApplicationAttachmentsSchema = z.object({ attachmentIds: z.array(z.string().min(1)).max(50) }).strict()`; `jobApplicationQuerySchema` erhält `status?: jobApplicationStatusSchema`; reine Funktion `recipientForMappe(application): { company?: string }` — setzt `company = postingCompany` **nur** bei leerem/Whitespace-`letter.firma` (OQ2). |
| `documents-html.ts`  | ändern | `DocumentsHtmlOptions` erhält `order?: 'resume-first'                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | 'letter-first'`(Default`'resume-first'`); `documentsToHtml`**und**`inkDocument`interpolieren`resumeSection`/`letterSection` bedingt umgedreht (ADR-0061 §4). WHY-Kommentar: nur die Mappe dreht um, Basis-Export und Editor-Vorschau behalten CV→Anschreiben. |
| `errors.ts`          | ändern | Neue `FrozenError extends DomainError` (`status = 409`, `type = 'frozen'`, Name `Frozen`). `mapErrorToProblem` behandelt DomainError generisch → **kein** Filter-Change.                                                                                                                                                                                                                                                                                                                                                         |
| `usage.ts`           | prüfen | **Kein** neues `UsageFeature` (keine KI).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |

### 2.2 Ports (`server/src/ports/`)

| Datei                           | Aktion | Inhalt                                                                                                          |
| ------------------------------- | ------ | --------------------------------------------------------------------------------------------------------------- |
| `job-application-repository.ts` | ändern | `list(ownerId, talentId?, status?)`. (Validierung der Anhang-Zugehörigkeit ist Service-Sache, kein neuer Port.) |

### 2.3 Services (`server/src/services/`, decorator-frei)

| Datei                                | Aktion        | Inhalt                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| ------------------------------------ | ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `job-application-service.ts`         | ändern        | `list(ownerId, talentId?, status?)` (reicht den Filter durch); neu `saveAttachments(ownerId, id, attachmentIds, unfreeze?)`: lädt Bewerbung, prüft Einfrieren (409 ohne `unfreeze`, sonst `note`-History-Eintrag), validiert **jede** Id via `attachmentStore.get(ownerId, id)` auf `talentId === application.talentId` (sonst `NotFoundError('Anhang')`) **und** `contentType === 'application/pdf'` (sonst `ValidationError('Nur PDF-Anhänge sind wählbar')`, OQ3), setzt `selectedAttachmentIds` + `updatedAt`. `saveDocuments` erhält `unfreeze?` und die Einfrier-Prüfung (ADR-0061 §5). Deps um `attachmentStore: AttachmentStore` erweitert.                                                                                                                                                 |
| `job-application-dossier-service.ts` | **neu**       | `renderPdf(scope, id): Promise<{ buffer, filename }>` und `renderZip(scope, id): Promise<{ stream, filename }>`. Lädt Bewerbung (Kopie + `selectedAttachmentIds`); fehlt `documents` → `NotFoundError('Bewerbungs-Kopie')`; löst jede Anhang-ID via `attachmentStore.get` und wirft `NotFoundError` bei fremder/fehlender Id; Empfänger via `recipientForMappe` (OQ2); ruft `documentService.renderDossierFromDocuments(scope, copy, recipient, selectedAttachmentIds)` für das gemergte Gesamt-PDF (Anhänge **mit**, OQ1). `renderZip` baut das ZIP **streamend** mit `yazl` (OQ4, §5.2): gemergtes PDF `Bewerbung.pdf` + je Anhang eine Datei mit Originalname (dedupliziert), Rückgabe als `Readable`. Dateiname `Bewerbung_<talentName>_<postingCompany>.<ext>` über einen kleinen Slug-Helfer. |
| `slug.ts`                            | ändern/prüfen | Existiert; ggf. `safeFilename`-Helper ergänzen (Pfad-/Illegal-Zeichen strippen) + Unit-Test.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |

### 2.4 Adapter (`server/src/adapters/`)

| Datei                                   | Aktion | Inhalt                                                                                                                                                                                                |
| --------------------------------------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `fs-job-application-repository.ts`      | ändern | `list` filtert zusätzlich `status`; `readAll`-Records ohne `selectedAttachmentIds` werden beim Lesen auf `[]` normalisiert (abwärtskompatibel).                                                       |
| `sql/sql-job-application-repository.ts` | ändern | `list` ergänzt `eq(jobApplications.status, status)` wenn gesetzt.                                                                                                                                     |
| `sql/schema.ts`                         | ändern | `jobApplications` erhält `selectedAttachmentIds: jsonb('selected_attachment_ids').$type<string[]>().notNull()` (Default `[]` im DDL/Backfill).                                                        |
| `sql/mappers.ts`                        | ändern | `rowToJobApplication`/`jobApplicationToRow` bilden `selectedAttachmentIds` ab; `rowToJobApplication` defaultet `[]` bei `null` (abwärtskompatibel).                                                   |
| `sql/db.ts`                             | ändern | Idempotente DDL in `runMigrationDdl`: `ALTER TABLE job_applications ADD COLUMN IF NOT EXISTS selected_attachment_ids jsonb NOT NULL DEFAULT '[]';` (kein FK — Muster ADR-0059, keine Fremdschlüssel). |
| `persistence-factory.ts`                | prüfen | keine Änderung (neue Abhängigkeit `AttachmentStore` wird im Nest-Modul verdrahtet).                                                                                                                   |

### 2.5 Nest (`server/src/nest/`)

| Datei                                         | Aktion | Inhalt                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| --------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `tokens.ts`                                   | ändern | `JOB_APPLICATION_DOSSIER_SERVICE` ergänzen.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| `job-applications/job-applications.module.ts` | ändern | Controller: `PUT :id/attachments` (zod, `?unfreeze`), `GET :id/dossier/pdf` (`res.send(buffer)`), `GET :id/dossier/zip` (**streamend**: `@Res() res`, `Content-Type`/`Content-Disposition`, `zip.outputStream.pipe(res)`, `res.on('close')` → destroy, §5.2); `list` reicht `query.status` durch; `saveDocuments` reicht `query.unfreeze` durch. Provider: `JOB_APPLICATION_SERVICE`-Factory injiziert zusätzlich `ATTACHMENT_STORE`; neuer `JOB_APPLICATION_DOSSIER_SERVICE`-Provider (injiziert `JOB_APPLICATION_REPOSITORY`, `ATTACHMENT_STORE`, `DOCUMENT_SERVICE`). Modul importiert `DocumentsModule` (liefert `DOCUMENT_SERVICE`). **Klassen-Guards unverändert:** `AuthGuard, AiConfiguredGuard`; **kein** `VermittlungGuard`, **kein** `PlanGuard`, **kein** `@RequiresAi`. |
| `documents/documents.module.ts`               | prüfen | `DocumentsModule` exportiert `DOCUMENT_SERVICE` bereits (§ oben). Keine Codeänderung.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |

### 2.6 OpenAPI und Frontend

| Datei                                                    | Aktion | Inhalt                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| -------------------------------------------------------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `server/openapi.yaml`                                    | ändern | `JobApplication`-Schema um `selectedAttachmentIds`; `GET /job-applications` Query-Parameter `status`; neue Pfade `GET /job-applications/:id/dossier/pdf`, `GET /job-applications/:id/dossier/zip`, `PUT /job-applications/:id/attachments`; Antwort-Komponente `Frozen` (409).                                                                                                                                                                                                                              |
| `server/__tests__/unit/openapi-contract.test.ts`         | ändern | Drift-Wächter für die neuen Pfade/Schemas (§7).                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| `UI/data.js`                                             | ändern | `listJobApplications({ talentId?, status? } = {})` (Signatur-Wechsel, beide Aufrufer anpassen); `updateJobApplicationAttachments(id, attachmentIds, unfreeze?)`; `downloadJobApplicationDossierPdf(id)`/`downloadJobApplicationDossierZip(id)` (fetch → `saveBlob`, Dateiname aus `Content-Disposition`); `saveJobApplicationDocuments` erhält optionalen `unfreeze`-Query.                                                                                                                                 |
| `UI/BewerbungsEditor.jsx`                                | ändern | Anhang-Auswahl (Multi-Select über `RecruitApi.listAttachments(app.talentId)`, **gefiltert auf `contentType === 'application/pdf'`** (OQ3), Referenz-Anhang sichtbar/nicht vorausgewählt) + `updateJobApplicationAttachments`; „Mappe als PDF“/„Mappe als ZIP“-Buttons; Einfrier-Bestätigung: bei 409 `frozen` auf Save → Confirm-Dialog → erneut mit `unfreeze`.                                                                                                                                            |
| `UI/Bewerbungen.jsx`                                     | ändern | Status-Filter (Segmented `Alle/Entwurf/Versendet/Gespräch/Zusage/Absage`) als Props `status`/`onStatusChange`; Suche bleibt clientseitig.                                                                                                                                                                                                                                                                                                                                                                   |
| `UI/TalentProfile.jsx`                                   | ändern | (a) `TalentApplications` erhält denselben Status-Filter (lokaler `status`-State, `listJobApplications({ talentId, status })`); (b) **„verknüpft mit Bewerbung“** (OQ5): Top-Level `load()` lädt zusätzlich `listJobApplications(talentId)`, baut die Map `attachmentId → Bewerbungen[]` aus `selectedAttachmentIds` und reicht sie an `AttachmentsTab` (Badge „verknüpft mit <Firma/Titel>“, klickbar via `onOpenApplication`); der in Phase 2 notierte „Badge hat keinen Datenbestand“-Kommentar entfällt. |
| `UI/app.jsx`                                             | ändern | `listJobApplications` hängt von `applicationStatus`-State ab (Re-Fetch bei Filterwechsel); reicht `status`/`onStatusChange` an `Bewerbungen`; reicht `onOpenApplication` bereits an `TalentProfile` durch (für die Badge-Verknüpfung).                                                                                                                                                                                                                                                                      |
| `package.json`                                           | ändern | Neue Dependency `yazl` (MIT, server-only) in `dependencies`; `@types/yazl` in `devDependencies` (OQ4, §5.2).                                                                                                                                                                                                                                                                                                                                                                                                |
| `UI/__tests__/*`, `e2e/ui.spec.ts`, `e2e/mobile.spec.ts` | ändern | Neue Tests (§7); bestehende `Bewerbungen`/`BewerbungsEditor`-Tests an die Prop-/Signatur-Änderungen anpassen.                                                                                                                                                                                                                                                                                                                                                                                               |

### 2.7 Dokumentation

- `docs/requirements.md`: FR-95 bis FR-98 (§1.1; AK-4.1/4.2/4.5/4.6). FR-95 umfasst Anhang-Auswahl **und** die „verknüpft mit Bewerbung“-Anzeige (OQ5).
- `docs/architecture.md`: Abschnitt Mappe (Service → `renderDossierFromDocuments`, Streaming-ZIP via `yazl`), Empfänger-Fallback, Einfrieren, Statusfilter.
- `docs/umls/`: Sequenz „Mappe herunterladen (PDF/ZIP)“ und „Einfrier-Bestätigung“; Baustein-Diagramm um `JobApplicationDossierService`.
- `CHANGELOG.md`: Added (Mappe, Anhang-Auswahl, Einfrieren, Statusfilter), Changed (Signatur `listJobApplications`).
- `docs/adr/README.md`: Zeile 0061 (bereits ergänzt).

### 2.8 Test-Infrastruktur (`server/__tests__/support/`)

| Datei                                              | Aktion  | Inhalt                                                                                                                                                                                       |
| -------------------------------------------------- | ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `fakes.ts`                                         | ändern  | `InMemoryJobApplicationRepository` um `status`-Filter erweitern; ggf. `FakeAttachmentStore`-Zugriff prüfen.                                                                                  |
| `nest-app.ts`                                      | prüfen  | `ATTACHMENT_STORE`/`DOCUMENT_SERVICE` sind im Acceptance-Bundle bereits vorhanden (Muster `nest-documents.test.ts`); ggf. Seed erweitern.                                                    |
| `route-inventory.ts`                               | prüfen  | **Keine** Änderung an `AI_ROUTES` (18). Die neuen Dossier-/Attachments-/Filter-Routen sind **keine** KI-Routen und tauchen dort nicht auf.                                                   |
| `integration/dossier-pdf-text.integration.test.ts` | **neu** | Gated Real-PDF-Test (AK-4.2): echter `PuppeteerPdfRenderer` + `PdfjsTextExtractor`, Gate über `PUPPETEER_EXECUTABLE_PATH` (`suite = env ? describe : describe.skip`, Muster `DATABASE_URL`). |

### 2.9 Umsetzungsreihenfolge (Tests zuerst, dann Code, dann Doku)

1. Testgerüst: `fakes.ts` (status-Filter), rote Unit-Tests für `appendStatusChange(note)`, `documentsToHtml(order)`, `recipientForMappe` (OQ2), Service (`saveAttachments`/Einfrieren/`list(status)`), Dossier-Service (PDF/ZIP/404/Fallback/Filename/Stream).
2. Domain: `job-application.ts` (+ `recipientForMappe`), `documents-html.ts` (`order`), `errors.ts` (`FrozenError`).
3. Ports + Adapter: `list(status)` fs + sql, `selectedAttachmentIds` (Mapper, Schema, DDL-Backfill), `persistence-factory` unverändert.
4. Services: `job-application-service` (Attachments/Einfrieren mit Note-Dedup/Filter), `job-application-dossier-service` (PDF + Streaming-ZIP via `yazl`), `slug`-Helper. Dependency `yazl` + `@types/yazl` installieren.
5. Nest: Tokens, Controller-Routen (ZIP mit `@Res()`-Pipe), Provider/Fabrik-Verdrahtung, `app.module` unverändert (Modul importiert `DocumentsModule`).
6. OpenAPI + `openapi-contract.test.ts`; gated Real-PDF-Test (`dossier-pdf-text.integration.test.ts`).
7. Frontend: `data.js`, `BewerbungsEditor` (Auswahl/Download/Einfrieren), `Bewerbungen`/`TalentProfile`/`app.jsx` (Filter), Vitest.
8. Playwright (Desktop + Mobil), `./test.sh` grün.
9. Doku, UML-SVG, Changelog; manuelles Protokoll (§9) mit `STORE=sql` und `STORE=fs`.

---

## 3. Datenmodell + Migration

### 3.1 `JobApplication` (ergänzt, ADR-0059 bleibt Basis)

```ts
// server/src/domain/job-application.ts
export interface JobApplicationStatusChange {
  status: JobApplicationStatus;
  at: string; // ISO 8601
  /** Nur beim erzwungenen Editieren einer eingefrorenen Bewerbung gesetzt (AK-4.5). */
  note?: string;
}

export interface JobApplication {
  // … bestehende Felder unverändert …
  /** Vom Nutzer gewählte Anhänge (talent-gebunden). Referenz-Anhang nie vorausgewählt. */
  selectedAttachmentIds: string[];
}
```

`selectedAttachmentIds` ist ein eingebettetes Feld (wie `documents`/`statusHistory`),
kein separater Store, keine FK. Die Zugehörigkeit „Anhang gehört zum Mandanten“ ist
eine **Service-Prüfung** (Muster ADR-0059: dieses Schema kennt keine Fremdschlüssel).

### 3.2 fs-Dateiformat

`archive/bewerbungen/job-applications.json` bleibt ein JSON-Array; Alt-Records ohne
`selectedAttachmentIds` lesen als `[]` (default beim Mapping). `versionedPaths` deckt
`archive/bewerbungen` bereits ab.

### 3.3 sql-DDL (idempotent, in `runMigrationDdl`)

```sql
ALTER TABLE job_applications
  ADD COLUMN IF NOT EXISTS selected_attachment_ids jsonb NOT NULL DEFAULT '[]';
```

`schema.ts`/`mappers.ts`: `selectedAttachmentIds: jsonb('selected_attachment_ids')
.$type<string[]>().notNull()`, Mapping mit `[]`-Fallback bei `null`. Kein neuer Index
nötig (keine Abfrage über Anhang-IDs; die Zuordnung läuft über die Bewerbung, die
Abfrage über `talentId` existiert bereits).

### 3.4 Einfrier-Semantik (AK-4.5, ADR-0061 §5)

`frozen = status !== 'draft'`. `saveDocuments` (und damit Magic-Pen-Accept, der über
dieselbe Route schreibt) sowie `saveAttachments` prüfen vor dem Schreiben:

- nicht eingefroren → schreibt normal;
- eingefroren ohne `unfreeze` → `FrozenError` (409 `frozen`);
- eingefroren mit `unfreeze` → schreibt und hängt
  `{ status: <aktuell>, at: now, note: 'Dokumente nach Einfrieren geändert' }` (bzw.
  `'Anhänge nach Einfrieren geändert'` bei `saveAttachments`) an
  `statusHistory` (Invariante `status === at(-1).status` bleibt, da der Status
  unverändert ist). **Note-Dedup (gegen Autosave-Spam):** der Note-Eintrag wird
  nur angehängt, wenn der letzte `statusHistory`-Eintrag **nicht bereits denselben**
  `note` trägt — ein Eintrag pro **Bestätigungstyp** und Status-Phase, nicht je
  debounced-Save. Zwei unterschiedliche erzwungene Änderungen (Dokumente **und**
  Anhänge) nach „versendet“ ergeben zwei unterscheidbare Einträge; Wiederholungen
  desselben Typs bleiben dedupliziert.
  (Ein späterer Statuswechsel setzt den letzten Eintrag ohne `note`, sodass die
  nächste erzwungene Änderung wieder korrekt vermerkt wird.)

`changeStatus` bleibt unverändert (jeder Wechsel erlaubt, ADR-0059); Zurücksetzen auf
„Entwurf“ stellt Editierbarkeit wieder her (Einfrieren = Funktion des aktuellen Status).

---

## 4. API

Alle neuen Routen unter `/api/v1/job-applications`, `AuthGuard` an der Klasse, Scope
über `@CurrentScope()`; **kein** `VermittlungGuard`, **kein** `PlanGuard`. Fehler als
RFC-9457 `application/problem+json` (`type` = `about:blank#<kurzname>`).

### 4.1 Routen

| #       | Methode + Pfad                                                            | Body/Query (zod)                                                        | Erfolg                                                                                                               | Fehler (problem+json)                                                                                                                               |
| ------- | ------------------------------------------------------------------------- | ----------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| B01     | `GET /job-applications?talentId=&status=`                                 | `jobApplicationQuerySchema` (`{ talentId?, status? }`)                  | 200 `JobApplication[]` (nach `createdAt` absteigend)                                                                 | 401, 400 (`status` ungültig)                                                                                                                        |
| B02–B08 | (bestehend, unverändert bis auf B01 und die Einfrier-Erweiterung von B05) | —                                                                       | —                                                                                                                    | —                                                                                                                                                   |
| B05'    | `PUT /job-applications/:id/documents?unfreeze=1`                          | `updateJobApplicationDocumentsSchema` (+ Query `unfreeze`)              | 200 `{ documents }`                                                                                                  | 401, 400, 404, **409 `frozen`**                                                                                                                     |
| B09     | `PUT /job-applications/:id/attachments?unfreeze=1`                        | `updateJobApplicationAttachmentsSchema` (`{ attachmentIds: string[] }`) | 200 `{ jobApplication }` (neue Auswahl + `updatedAt`)                                                                | 401, 400 (kein String-Array/`>50`; **Nicht-PDF-Anhang**, OQ3), 404 (Bewerbung unbekannt; Anhang fehlt/gehört nicht zum Mandanten), **409 `frozen`** |
| B10     | `GET /job-applications/:id/dossier/pdf`                                   | — (liest `selectedAttachmentIds`)                                       | 200 `application/pdf`, `Content-Disposition: attachment; filename="Bewerbung_<Mandant>_<Firma>.pdf"`                 | 401, 404 (Bewerbung/Kopie/Anhang)                                                                                                                   |
| B11     | `GET /job-applications/:id/dossier/zip`                                   | — (liest `selectedAttachmentIds`)                                       | 200 `application/zip`, `…filename="Bewerbung_<Mandant>_<Firma>.zip"` (**streamend**, Chunked, kein `Content-Length`) | 401, 404 (Bewerbung/Kopie/Anhang)                                                                                                                   |

`B01` ist rückwärtskompatibel (beide Parameter optional). Der Filter ist ein **Wert**
(kein Multi-Select); kein Filter = alle Status.

### 4.2 zod-Schemas

```ts
export const updateJobApplicationAttachmentsSchema = z
  .object({ attachmentIds: z.array(z.string().min(1, 'attachmentIds must be strings')).max(50) })
  .strict();

export const jobApplicationQuerySchema = z.object({
  talentId: z.string().optional(),
  status: jobApplicationStatusSchema.optional(),
});
```

`unfreeze` ist ein **Query**-Parameter (`=== '1'`), kein Body-Feld — der Body bleibt
das Dokument- bzw. Auswahl-Payload (kein Breaking des bestehenden Editor-Payloads).

### 4.3 Fehlerfälle (problem+json)

| Status | `type`             | Wann                                                                                                                                                                                                                                                             |
| ------ | ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 401    | `unauthorized`     | kein Login (jede Route)                                                                                                                                                                                                                                          |
| 400    | `validation-error` | zod verletzt (Query `status`, Body `attachmentIds`)                                                                                                                                                                                                              |
| 404    | `not-found`        | unbekannte Bewerbungs-Id; `documents` fehlt („Bewerbungs-Kopie fehlt“); Anhang-Id unbekannt **oder** gehört nicht zu `talentId` des Mandanten (Detail benennt die Ursache) — ein fremder Scope ist für den Aufrufer „unbekannt“ (404, kein 403, Muster ADR-0059) |
| 409    | `frozen`           | Schreiben auf eingefrorene Bewerbung ohne `?unfreeze=1`                                                                                                                                                                                                          |
| 500    | `internal-error`   | Puppeteer/Renderer bricht unerwartet (Renderer-Fehler werden wie beim Talent-Dossier nicht speziell gemappt)                                                                                                                                                     |

Die Auswahl ist **PDF-only** (OQ3): `PUT …/attachments` weist eine Anhang-ID mit
`contentType !== 'application/pdf'` als 400 `validation-error` zurück (Detail „Nur
PDF-Anhänge sind wählbar“); die Auswahl-UI bietet nur PDF-Anhänge an. Leere Auswahl
ist gültig (Mappe = nur Anschreiben+CV).

### 4.4 Auth + Workspace-Scope

- Jede neue Route trägt `AuthGuard`; Scope per `@CurrentScope()`. Repository-Lesezugriffe
  sind auf `ownerId` gefiltert; der Dossier-Service löst Anhänge über
  `attachmentStore.get(ownerId, id)` (owner-gebunden) und prüft `talentId`.
- **Kein** `VermittlungGuard`, **kein** `PlanGuard`, **kein** `@RequiresAi`.
- Workspace-Isolation: fremde Bewerbungs-Id → 404; fremder Anhang → 404 (Acceptance-Test).

---

## 5. Mappe-Assembly (Wiederverwendung + Abgrenzung)

- **PDF:** `JobApplicationDossierService.renderPdf` ruft
  `documentService.renderDossierFromDocuments(scope, copy, recipient, selectedAttachmentIds)`
  mit `recipient = recipientForMappe(application)`: **nur** bei leerem/Whitespace-
  `letter.firma` wird `postingCompany` als Empfänger-Firma eingesetzt (OQ2), sonst
  bleibt die Kopie unverändert (Empfängerblock/Betreff/Briefkörper aus `letter.*` der
  Kopie). Die gemergte PDF erhält über `documentsToHtml(..., { order: 'letter-first' })`
  die Reihenfolge **Anschreiben → CV** und hängt danach die PDF-Anhänge an
  (Gesamt-PDF, Anhänge **mit**, OQ1).
- **ZIP:** `renderZip` montiert mit `yazl` (OQ4, §5.2): `Bewerbung.pdf` (= das
  gemergte Gesamt-PDF) + je ausgewählten Anhang eine eigene PDF-Datei (Originalname,
  dedupliziert). **Kein** `Bewerbung.html`-Reimport (das ist #239-Editor-Semantik,
  keine Arbeitgeber-Abgabe).
- **Dateiname:** `Bewerbung_<talentName>_<postingCompany>.<ext>` über einen
  `safeFilename`-Helfer (`slug.ts`): Pfadtrenner, Steuerzeichen und
  `\ / : * ? " < > |` strippen, Leerraum → `_`; leerer Fallback `Mandant`/`Firma`.
- **Anhang-Validierung:** jede Id wird über `attachmentStore.get(scope, id)` aufgelöst;
  `null` oder `attachment.talentId !== application.talentId` → `NotFoundError('Anhang')`;
  `contentType !== 'application/pdf'` → `ValidationError` (OQ3). Diese Validierung
  läuft bei `saveAttachments` **und** beim Render (eager, vor dem Stream).

### 5.2 Streaming-ZIP (OQ4, verbindlicher Mechanismus)

**Wahl: `yazl`** (+ `@types/yazl`) als neue Dependency. Begründung:

- **Streaming, nicht in-memory:** `yazl` schreibt das ZIP inkrementell in einen
  `Readable` (`outputStream`), den der Controller direkt in die HTTP-Response pipet.
  Es gibt **kein** `toBuffer()`, das das gesamte ZIP im Speicher verdoppelt
  (genau das, was `adm-zip` tut und was der Owner nicht will).
- **Schlank:** MIT, **1 Mini-Dependency** (`buffer-crc32@^1.0.0`, reine CRC-32-Funktion,
  keine Transitive), reines Node-Streaming, `@types/yazl` (DefinitelyTyped) vorhanden.
  Verworfen: **`archiver`** (MIT, aber zieht `zip-stream`/`tar-stream`/
  `readdir-glob`-Transitive mit — für ZIP-only unnötig), **`adm-zip`** (kein
  Streaming). Server-only → kein Einfluss auf das Vite-Client-Bundle.

**Ablauf (Zusammenspiel Streaming × PDF-Merge):**

1. Das gemergte PDF entsteht **im Speicher** via `renderDossierFromDocuments`
   (pdf-lib/Puppeteer sind in-memory; ein begrenzter PDF-Buffer — unvermeidbar und
   Status quo). Die PDF-Anhänge wurden dafür ohnehin als `Buffer` gelesen.
2. `renderZip` liest die ausgewählten PDF-Anhänge **einmal** als `Buffer`
   (`AttachmentStore.get`), validiert sie eager (Owner/Talent/PDF) und nutzt sie für
   die ZIP-Einträge (`addBuffer`). (Der PDF-Merge in `renderDossierFromDocuments`
   re-fetcht intern nochmals — idempotenter Read, kein Korrektheitsrisiko; als
   Implementierungs-Option kann der Service die bereits gelesenen Blobs an eine
   interne Merge-Variante durchreichen, um den zweiten Read zu sparen.)
3. `new ZipFile()` → `addBuffer(mergedPdf, 'Bewerbung.pdf')` → je Anhang
   `addBuffer(bytes, originalName)` (dedupliziert) → `end()`. Der `outputStream` wird
   vom Controller gepipet.

**RAM-Profil:** gemergtes PDF + N PDF-Anhang-Buffer — **nicht** das gesamte ZIP.
Der dominante Anteil sind die (ohnehin für den PDF-Merge geladenen) Anhang-Bytes.

**Fehler-/Abort-Semantik:**

- **Vor dem Stream** (eager): unbekannte Bewerbung/Kopie/Anhang, fremder Anhang,
  Nicht-PDF → Fehler **bevor** `end()`/`pipe` → problem+json über den bestehenden
  `ProblemJsonFilter` (kein halber Stream).
- **Während des Streams:** `res.on('close')` (Client-Abbruch) → `outputStream.destroy()`
  und laufende Arbeit stoppen; Stream-/Read-Fehler werden an `res` weitergereicht
  (`res.destroy(err)`). Header bereits gesendet → Client sieht abgeschnittenen
  Download (bei Abbruch ohnehin der Fall), kein Server-Crash.
- **Kein `Content-Length`** (Größe vorab unbekannt) → Chunked `Transfer-Encoding`.
  Backpressure über die normale Node-`pipe`-Semantik.

**Tests Stream-Pfad** (§7.1/§7.2): Entry-/Reihenfolge, Eager-Validierung vor dem
Stream, Client-Abort (Stream-Destroy), „kein `Content-Length`/Chunked“, mehrere
Chunks (kein Ganz-Puffer).

---

## 6. UI

### 6.1 Bewerbungs-Detail (`BewerbungsEditor.jsx`)

1. **Anhang-Auswahl:** ein Abschnitt unter der Status-Leiste lädt
   `RecruitApi.listAttachments(app.talentId)`, filtert auf `contentType === 'application/pdf'`
   (OQ3) und zeigt Checkboxen (Multi-Select). Der Referenz-Anhang
   `Original-Lebenslauf (Import).pdf` erscheint in der Liste, ist **manuell wählbar**,
   aber **nie vorausgewählt** (Default `selectedAttachmentIds = []`, ADR-0057/0061 §1).
   Speichern ruft `updateJobApplicationAttachments`.
2. **Download:** Buttons „Mappe als PDF“ / „Mappe als ZIP“ →
   `downloadJobApplicationDossierPdf/Zip`, Dateiname via `saveBlob` (fetch → Blob →
   Download-Anker, Muster `data.js`).
3. **Einfrier-Bestätigung (Variante (a) — Editor-Session, verbindlich):** Der
   Bewerbungs-Editor behält das **eine** Autosave-Paradigma und hält einen
   `unfrozen`-Merker (State, Default `false`). Solange `app.status !== 'draft'` und
   `!unfrozen` ist, sendet die Persistenz-Naht **kein** `unfreeze`; ein 409 `frozen`
   (Dokument- oder Anhang-Save) hält den fehlgeschlagenen Payload zurück, zeigt den
   Confirm-Dialog („Diese Bewerbung ist versendet — wirklich ändern? Die Änderung
   wird im Verlauf vermerkt.“) und sendet bei **Bestätigung** `setUnfrozen(true)`
   und den zurückgehaltenen Payload erneut mit `?unfreeze=1`. **Danach senden alle
   Folge-Saves desselben Editors automatisch `?unfreeze=1`** (der Merker bleibt bis
   zum Schließen des Editors) — ein Dialog pro Session, kein erneutes Nachfragen je
   Autosave. Bei **Ablehnung** bleibt `unfrozen=false` und der zurückgehaltene
   Payload wird verworfen (Editor lädt die persistierte Kopie neu). Verworfen:
   Variante (b) „kein Autosave, nur expliziter Save“ — das würde ein zweites
   Save-Paradigma in den (autosave-basierten) Editor ziehen. Das Status-Pill bleibt
   bei 409 auf dem persistierten Wert (Muster `changeStatus`-Catch).

### 6.2 Bewerbungen-Liste (`Bewerbungen.jsx` + `app.jsx` + `TalentProfile.jsx`)

- `Bewerbungen.jsx` rendert eine Segmented-Control `Alle/Entwurf/Versendet/Gespräch/
Zusage/Absage` über neue Props `status`/`onStatusChange`; die Freitext-Suche bleibt
  clientseitig.
- `app.jsx` hält `applicationStatus`-State; `listJobApplications` wird
  `useCallback(..., [applicationStatus])` und ruft `listJobApplications({ status })` —
  `useResource` re-fetcht bei Filterwechsel.
- `TalentProfile.jsx` `TalentApplications` bekommt denselben Filter (lokaler State,
  `listJobApplications({ talentId, status })`), damit AK-4.6 „pro Mandant“ erfüllt ist.

### 6.3 Anhang-Tab „verknüpft mit Bewerbung“ (OQ5)

- `TalentProfile` lädt die Bewerbungsliste des Mandanten bereits für den
  „Bewerbungen“-Tab; die Top-Level-`load()` lädt sie nun einmalig mit und leitet daraus
  die Map `attachmentId → [{ id, postingCompany, postingTitle }]` ab (jede Bewerbung,
  deren `selectedAttachmentIds` den Anhang enthält).
- `AttachmentsTab` erhält `links` + `onOpenApplication` und zeigt je Anhang eine
  Zeile „verknüpft mit <Firma · Titel>“ (Badge/Subtext), klickbar → öffnet die
  Bewerbung. Der Phase-2-Kommentar („Badge hat keinen Datenbestand“) entfällt.

---

## 7. Testplan

Namensschema `Subject_StateUnderTest_ExpectedBehaviour`, AAA. KI bleibt außen vor (kein
Fake-`LlmService`). Für alle neuen/geänderten Server-Dateien 100 % Branch anstreben;
Schwellen unverändert (≥ 90 %). `sql-job-application-repository.ts` bleibt in der
Coverage-Ausschlussliste und wird durch Integrationstests gedeckt (Muster Phase 2 RI5).

### 7.1 Unit (`server/__tests__/unit/`)

**`job-application.test.ts`** (ändern)

- `AppendStatusChange_WithNote_AppendsTimestampedEntryWithNote`
- `JobApplicationStatusChange_WithoutNote_StillValid` (Abwärtskompatibilität)
- `UpdateJobApplicationAttachmentsSchema_NonStringOrTooMany_Rejected`
- `JobApplicationQuerySchema_InvalidStatus_Rejected`
- `RecipientForMappe_EmptyFirma_UsesPostingCompany` (OQ2)
- `RecipientForMappe_WhitespaceFirma_UsesPostingCompany` (OQ2)
- `RecipientForMappe_NonEmptyFirma_LeavesLetterUntouched` (OQ2, keine Injektion)

**`documents-html.test.ts`** (ändern, AK-4.1)

- `DocumentsToHtml_LetterFirstOrder_RendersLetterBeforeResume`
- `DocumentsToHtml_DefaultOrder_RendersResumeBeforeLetter` (Regression Basis-Export)
- `InkDocument_LetterFirstOrder_RendersLetterBeforeResume`

**`job-application-service.test.ts`** (ändern, AK-4.5/4.6)

- `JobApplicationService_List_FiltersByStatus`
- `JobApplicationService_SaveDocuments_Frozen_ThrowsFrozenWithoutUnfreeze`
- `JobApplicationService_SaveDocuments_FrozenWithUnfreeze_AppendsNotedHistoryEntry`
- `JobApplicationService_SaveDocuments_Frozen_MultipleUnfreezeSaves_SingleNote` (Note-Dedup:
  mehrere erzwungene Saves in derselben Status-Phase → genau ein `note`-Eintrag)
- `JobApplicationService_SaveDocuments_Draft_NotFrozen`
- `JobApplicationService_SaveAttachments_UpdatesSelectionAndBumpsUpdatedAt`
- `JobApplicationService_SaveAttachments_ForeignTalentAttachment_ThrowsNotFound`
- `JobApplicationService_SaveAttachments_NonPdfAttachment_ThrowsValidation` (OQ3)
- `JobApplicationService_SaveAttachments_Frozen_ThrowsFrozenWithoutUnfreeze`

**`job-application-dossier-service.test.ts`** (neu, AK-4.1/4.2, OQ2/OQ4)

- `JobApplicationDossierService_RenderPdf_UsesCopyNotBase` (Fake `DocumentService`/
  `FakePdfRenderer` belegen: `renderDossierFromDocuments` erhält `application.documents`
  und `selectedAttachmentIds`, **nicht** den Basis-CV)
- `JobApplicationDossierService_RenderPdf_EmptyFirma_PassesPostingCompanyAsRecipient` (OQ2)
- `JobApplicationDossierService_RenderPdf_NonEmptyFirma_PassesEmptyRecipient` (OQ2)
- `JobApplicationDossierService_RenderPdf_UnknownApplication_ThrowsNotFound`
- `JobApplicationDossierService_RenderPdf_MissingCopy_ThrowsNotFound`
- `JobApplicationDossierService_RenderPdf_ForeignAttachment_ThrowsNotFound`
- `JobApplicationDossierService_RenderZip_ContainsMergedPdfAndSeparateAttachments` (Stream
  in sammelnden `Writable` pipen, Einträge/Namen/Reihenfolge prüfen: `Bewerbung.pdf`
  zuerst, dann Anhänge)
- `JobApplicationDossierService_RenderZip_ValidatesBeforeStream_ThrowsWithoutOutput`
  (fremde/nicht-PDF-Anhang → Fehler vor `end()`, kein halber Stream)
- `JobApplicationDossierService_RenderZip_ClientAbort_DestroysStream` (Response-`close`
  simuliert, `outputStream` wird zerstört, kein `unhandledRejection`)
- `JobApplicationDossierService_RenderZip_LargeSelection_StreamsChunked` (sammelnder
  `Writable` empfängt mehrere Chunks; kein Ganz-Puffer)
- `JobApplicationDossierService_Filename_SlugifiesMandantAndFirma`

**AK-4.2 (deterministischer CI-Beleg, ADR-0052: HTML == PDF-Quelle)**

- `Mappe_ExtractedText_ContainsAdaptedNotBase` — rendert eine Kopie mit einem
  Magic-Pen-veränderten Profiltext über `documentsToHtml(copy, { order: 'letter-first' })`
  und belegt: der angepasste Text ist enthalten, ein nur im Basis-CV stehender Marker
  ist **nicht** enthalten. (Immer-on-Beleg in CI; der wörtliche PDF-Text-Beleg ist
  zusätzlich automatisiert als gated Real-PDF-Test, §7.2, und als Zweitbeleg manuell
  in §9 Schritt 7.)

**Adapter/Domain/Config**

- `fs-job-application-repository.test.ts`: `FsJobApplicationRepository_List_FiltersByStatus`, `…_MissingSelectedAttachmentIds_DefaultsToEmptyArray`
- `sql-mappers.test.ts`: `JobApplicationToRow_RoundTripsSelectedAttachmentIds`, `RowToJobApplication_NullSelectedAttachmentIds_DefaultsEmpty`
- `problem.test.ts` (ändern): `MapErrorToProblem_FrozenError_409Frozen`
- `slug.test.ts`/neu: `SafeFilename_StripsIllegalCharsAndSlashes`

**OpenAPI** (`openapi-contract.test.ts`, ändern)

- `OpenApi_JobApplication_SelectedAttachmentIdsField`
- `OpenApi_JobApplicationsList_StatusQueryParam`
- `OpenApi_JobApplicationDossierRoutes_Exist` (B09–B11)
- `OpenApi_Frozen_409`

**Frontend (Vitest, `UI/__tests__/`)**

`bewerbungen-ui.test.jsx` (ändern)

- `BewerbungenList_StatusFilter_CallsOnStatusChange`
- `BewerbungenList_StatusFilter_ShowsOnlySelectedStatus`
- `BewerbungsEditor_AttachmentSelection_ListsPdfAttachmentsOnly` (OQ3: Nicht-PDF ausgefiltert)
- `BewerbungsEditor_AttachmentSelection_ReferenceAttachment_ManuallySelectableNotPreselected`
- `BewerbungsEditor_AttachmentSelection_Save_CallsUpdateAttachments`
- `BewerbungsEditor_DownloadMappe_CallsDossierDownload`
- `BewerbungsEditor_Frozen_Save_ShowsConfirmAndResendsWithUnfreeze`
- `BewerbungsEditor_Frozen_MultipleSaves_SingleConfirm` (Variante (a): nach Bestätigung
  senden alle Folge-Saves desselben Editors `?unfreeze=1`, der Dialog erscheint nur
  einmal; bei Ablehnung kein `unfreeze` und Payload verworfen)
- `TalentApplications_StatusFilter_CallsListWithStatus`
- `AttachmentsTab_ShowsLinkedApplications` (OQ5: je Anhang die Bewerbungen, die ihn gewählt haben)
- `AttachmentsTab_LinkOpensApplication` (OQ5)

`data.test.js` (ändern)

- `RecruitApi_JobApplicationMethods_UseCorrectEndpoints` (erweitert um
  `listJobApplications({ status })`, `updateJobApplicationAttachments`, Dossier-Downloads)

### 7.2 Integration

**Acceptance (Nest, `makeNestApp`, in-memory-Fakes) — `nest-job-applications.test.ts`** (ändern)

- `JobApplications_NoLogin_Returns401` (`it.each` um B09–B11 erweitert)
- `JobApplications_TwoWorkspaces_AreIsolated` (B09–B11 mit zwei Workspaces; fremde Id → 404)
- `DossierPdf_ForeignAttachment_Returns404`
- `UpdateAttachments_ForeignTalentAttachment_Returns404`
- `UpdateAttachments_NonPdfAttachment_Returns400` (OQ3)
- `UpdateAttachments_Frozen_Returns409_AndUnfreezeAppendsHistory`
- `SaveDocuments_Frozen_Returns409_AndUnfreezeAppendsHistory`
- `List_FilterByStatus_ReturnsOnlyThatStatus`
- `DossierPdf_ReturnsPdfWithFilename` (`Content-Disposition` trägt
  `Bewerbung_<Mandant>_<Firma>.pdf`)
- `DossierPdf_EmptyFirma_FallsBackToPostingCompany` (OQ2: gemergte PDF-Hülle nutzt
  `postingCompany` als Empfänger, wenn `letter.firma` leer)
- `DossierZip_ReturnsZipWithFilename`
- `DossierZip_NoContentLength_StreamsChunked` (OQ4: kein `Content-Length`,
  `Transfer-Encoding: chunked`)
- `JobApplications_VermittlungOff_StillVisible` (kein `@RequiresVermittlung` auf B09–B11)

**Postgres (`server/__tests__/integration/*.integration.test.ts`, `DATABASE_URL`-gated)**

- `SqlJobApplicationRepository_List_FiltersByStatus`
- `Migrate_SelectedAttachmentIdsColumn_BackfillsEmptyArrayAndIsIdempotent`
- `SqlJobApplicationRepository_SelectedAttachmentIds_RoundTrips`

**Real-PDF (gated, echter Browser) — `dossier-pdf-text.integration.test.ts`** (neu, AK-4.2)

Gated auf `PUPPETEER_EXECUTABLE_PATH` (Muster `DATABASE_URL`:
`const suite = process.env.PUPPETEER_EXECUTABLE_PATH ? describe : describe.skip`).
Komponiert den **echten** `DocumentService` (reales `documentsToHtml`, realer
`renderDossierFromDocuments`) mit dem echten `PuppeteerPdfRenderer` und dem echten
`PdfjsTextExtractor` (Port + Adapter existieren bereits; `PuppeteerPdfRenderer`/
`PdfjsTextExtractor` sind schon in der Coverage-Ausschlussliste und werden im
Deployment ausgeführt — kein neuer Port, kein CI-Verlangsamen ohne Browser):

- `DossierPdf_ExtractedText_ContainsAdaptedNotBase` — Kopie mit verändertem
  Profiltext (eindeutiger Marker) über `renderDossierFromDocuments(scope, copy, {}, [])`
  rendern, `PdfjsTextExtractor.extract(pdf)` → Text enthält den angepassten Marker,
  den Basis-only-Marker **nicht** (Whitespace-normalisiert vergleichen).

**Playwright (`e2e/ui.spec.ts`, `e2e/mobile.spec.ts`, API gemockt)**

- `BewerbungenFlow_SelectAttachments_DownloadMappe` (Desktop: Auswahl → PDF/ZIP-Download gemockt)
- `BewerbungenFlow_FilterByStatus_ShowsOnlySelected` (Desktop + `page.reload()` vor Listen-Prüfung)
- `BewerbungenFlow_FrozenEdit_ConfirmsUnfreeze` (Desktop: 409 → Dialog → erneutes Save)
- `BewerbungenFlowMobile_MappeReachable` (393 px)

### 7.3 Manuell

Abschnitt 9 (echt gestarteter Server, `STORE=sql` und `STORE=fs`). **Nur AK-4.3**
(Layout-Sichtprüfung) ist ausschließlich manuell und wird im PR dokumentiert; der
wörtliche PDF-Text-Beleg (AK-4.2) ist automatisiert (gated Real-PDF, §7.2), Schritt 7
bleibt als Zweitbeleg.

---

## 8. AK-Matrix

| AK     | Kriterium (Kurzform)                                                                                                             | Beleg                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| ------ | -------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AK-4.1 | Reihenfolge Anschreiben→CV→Anhänge; Dateiname `Bewerbung_<Mandant>_<Firma>.{pdf,zip}`; ZIP-PDF enthält Anhänge mit               | Unit `DocumentsToHtml_LetterFirstOrder_RendersLetterBeforeResume`, `InkDocument_LetterFirstOrder_…`, `JobApplicationDossierService_Filename_SlugifiesMandantAndFirma`, `JobApplicationDossierService_RenderZip_ContainsMergedPdfAndSeparateAttachments`; Acceptance `DossierPdf_ReturnsPdfWithFilename`, `DossierZip_ReturnsZipWithFilename`; Protokoll 6, 7, 7b                                                                             |
| AK-4.2 | PDF enthält angepasste Kopie (nicht Basis), Seitenzahl plausibel, Anhänge vorhanden; Empfänger-Fallback bei leerem `firma` (OQ2) | Unit `JobApplicationDossierService_RenderPdf_UsesCopyNotBase`, `Mappe_ExtractedText_ContainsAdaptedNotBase` (CI, immer); **gated Real-PDF** `DossierPdf_ExtractedText_ContainsAdaptedNotBase` (automatisiert, echter `PuppeteerPdfRenderer` + `PdfjsTextExtractor`); Acceptance `DossierPdf_EmptyFirma_FallsBackToPostingCompany`; manuell Protokoll 7 (Zweitbeleg, PDF-Text extrahiert), 7c (Fallback)                                      |
| AK-4.3 | Layout einmal visuell durch Owner geprüft                                                                                        | Protokoll 7a (manuell, dokumentiert im PR)                                                                                                                                                                                                                                                                                                                                                                                                   |
| AK-4.4 | Statuswechsel mit Zeitstempel im Verlauf (bereits Phase 2)                                                                       | (bestehende Phase-2-Tests; hier Regressionsschutz über `changeStatus`-Tests)                                                                                                                                                                                                                                                                                                                                                                 |
| AK-4.5 | Ab „versendet“ eingefroren; Änderung nur nach Rückfrage, im Verlauf vermerkt                                                     | Unit `JobApplicationService_SaveDocuments_Frozen_*` (inkl. `…_MultipleUnfreezeSaves_SingleNote`), `JobApplicationService_SaveAttachments_Frozen_*`; Acceptance `UpdateAttachments_Frozen_…`, `SaveDocuments_Frozen_…`; Vitest `BewerbungsEditor_Frozen_Save_ShowsConfirmAndResendsWithUnfreeze`, `BewerbungsEditor_Frozen_MultipleSaves_SingleConfirm` (Variante (a)); Playwright `BewerbungenFlow_FrozenEdit_ConfirmsUnfreeze`; Protokoll 8 |
| AK-4.6 | Übersicht pro Mandant + gesamt, nach Status filterbar, Status überlebt Reload                                                    | Unit `JobApplicationService_List_FiltersByStatus`; Acceptance `List_FilterByStatus_ReturnsOnlyThatStatus`; Vitest `BewerbungenList_StatusFilter_*`, `TalentApplications_StatusFilter_CallsListWithStatus`; Playwright `BewerbungenFlow_FilterByStatus_ShowsOnlySelected` (mit `page.reload()`); Protokoll 9                                                                                                                                  |

---

## 9. Manuelles Testprotokoll

Format je Schritt: **Aktion | erwartetes Ergebnis**; beim Durchlauf ergänzt der
Implementer **tatsächlich** und **ok** und fügt die Tabelle in die PR-Beschreibung
ein. Alle Daten synthetisch. Skripte/Cookies im Scratchpad.

### 9.0 Vorbereitung (einmal)

- `npm run build`.
- fs-Daten: vor dem fs-Durchlauf `git status` notieren, danach `git checkout -- archive/bewerbungen` und neue Dateien löschen. Nie committen.
- `export APP_SECRET=<zufällig>`; `SELF_SERVE_TENANTS` aus (ein Workspace `team`, erstes Konto Admin).
- Kein KI-Key nötig (Phase 4 ist deterministisch); für den wörtlichen PDF-Text-Beleg `pdftotext` (poppler) oder der repo-eigene `PdfTextExtractor` verwenden.

### 9.1 `STORE=sql`

Vorbereitung: `service postgresql start`; `psql -U postgres -c "create database myjob_phase4"`; Start mit `STORE=sql DATABASE_URL=postgres://postgres:postgres@localhost:5432/myjob_phase4 PORT=3104 npm start`. Zum Schluss `drop database myjob_phase4`.

| #   | Aktion                                                                                                                                                                        | Erwartet                                                                                                                                                            |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Server starten, `curl /api/v1/health`                                                                                                                                         | `{"status":"ok"}`; DDL `selected_attachment_ids`-Spalte vorhanden                                                                                                   |
| 2   | `POST /auth/register` (Admin), Cookie merken                                                                                                                                  | 201, Rolle `admin`                                                                                                                                                  |
| 3   | Mandant anlegen + CV-PDF importieren (erzeugt den Referenz-Anhang `Original-Lebenslauf (Import).pdf`); zusätzlich 1–2 Anhänge manuell hochladen                               | Mandant + Referenz-Anhang + weitere Anhänge vorhanden                                                                                                               |
| 4   | Stelle übernehmen; „Bewerbung erstellen“ → Mandant wählen                                                                                                                     | Bewerbung angelegt; `GET …/documents` zeigt Kopie                                                                                                                   |
| 5   | Profil der **Kopie** im Editor ändern (z. B. Kurzprofil-Text), Basis-CV unverändert lassen                                                                                    | Kopie geändert, Basis-CV byte-gleich                                                                                                                                |
| 6   | Im Bewerbungs-Editor Anhänge wählen — nur **PDF**-Anhänge werden angeboten (OQ3, ein Nicht-PDF-Upload erscheint nicht); Referenz-Anhang manuell wählen; „Mappe als PDF“ laden | PDF lädt; Reihenfolge Anschreiben → CV → Anhänge; Dateiname `Bewerbung_<Mandant>_<Firma>.pdf`                                                                       |
| 7   | PDF-Text extrahieren (`pdftotext`) und mit Basis-CV vergleichen                                                                                                               | Der **angepasste** Kopie-Text ist enthalten, ein Basis-CV-Marker **nicht** (AK-4.2); Seitenzahl plausibel; Anhänge vorhanden                                        |
| 7a  | PDF einmal visuell sichten (Layout)                                                                                                                                           | Kein offener Layout-Fund (AK-4.3, dokumentiert)                                                                                                                     |
| 7b  | „Mappe als ZIP“ laden und entpacken                                                                                                                                           | ZIP enthält `Bewerbung.pdf` (Gesamt-PDF, Anhänge **mit**, OQ1) + die gewählten Anhänge als einzelne Dateien; Download streamt (Chunked, kein `Content-Length`, OQ4) |
| 7c  | Empfänger-Fallback (OQ2): eine Bewerbung mit **leerem** `letter.firma` als Mappe laden                                                                                        | PDF-Header trägt `postingCompany` als Empfänger; eine Bewerbung mit **gefülltem** `firma` bleibt unverändert                                                        |
| 8   | Status auf „Versendet“ setzen; Dokument-Save und Anhang-Save ohne Bestätigung versuchen                                                                                       | `409 frozen` (Detail verständlich); mit Bestätigung → Änderung übernommen, `statusHistory` trägt einen Eintrag mit `note`                                           |
| 9   | Liste „Bewerbungen“: Statusfilter durchschalten; danach Mandantenprofil → Tab „Bewerbungen“: denselben Filter prüfen                                                          | Nur Treffer des gewählten Status; Filter auf beiden Ebenen; nach Reload bleibt der Status (der Bewerbung) erhalten                                                  |
| 9b  | Mandantenprofil → Tab „Anhänge“: prüfen, welche Anhänge mit welcher Bewerbung verknüpft sind (OQ5)                                                                            | Je gewähltem Anhang eine Zeile „verknüpft mit <Firma · Titel>“, klickbar → öffnet die Bewerbung                                                                     |
| 10  | Fremden Workspace registrieren (`SELF_SERVE_TENANTS=true`), `GET …/dossier/pdf` und `PUT …/attachments` einer fremden Id                                                      | 404 (Scope)                                                                                                                                                         |
| 11  | SIGTERM                                                                                                                                                                       | Sauberer Shutdown, Exit 0                                                                                                                                           |

### 9.2 `STORE=fs`

Vorbereitung: `git status` notieren; Start mit `STORE=fs PORT=3105 npm start`. Danach `git checkout -- archive/bewerbungen` und neue Dateien löschen.

| #   | Aktion                                                                                 | Erwartet                                                                                   |
| --- | -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| F1  | Start, `GET /health`, Registrieren                                                     | Wie 1–2                                                                                    |
| F2  | Mandant + Anhänge + Stelle + Bewerbung anlegen                                         | Wie 3–4; `cat archive/bewerbungen/job-applications.json` zeigt `selectedAttachmentIds: []` |
| F3  | Anhänge wählen, speichern, `cat job-applications.json`                                 | Auswahl persistiert (AK-4.1-Vorlauf)                                                       |
| F4  | Mappe PDF/ZIP laden und wie 6/7/7b/7c prüfen                                           | PDF/ZIP wie bei sql (inkl. Empfänger-Fallback, Streaming-ZIP, Anhänge mit)                 |
| F4a | Anhang-Tab „verknüpft mit Bewerbung“ wie 9b prüfen                                     | Verknüpfungen korrekt (aus `selectedAttachmentIds` in `job-applications.json`)             |
| F5  | Einfrieren wie 8 prüfen                                                                | 409 ohne, Erfolg mit `unfreeze` + `note` im Verlauf                                        |
| F6  | Statusfilter wie 9 prüfen                                                              | Filter korrekt (fs `list` filtert `status`)                                                |
| F7  | Aufräumen: `git status`, `git checkout -- archive/bewerbungen`, neue Dateien entfernen | Arbeitsbaum zeigt nur die Phase-4-Änderungen                                               |

---

## 10. Risiken und Entscheidungen

### 10.1 Risiken

| ID  | Risiko                                                                                                                    | Gegenmaßnahme                                                                                                                                                                                                                                  |
| --- | ------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| RI1 | **Reihenfolge-Umbau in `documentsToHtml`** regressiert Basis-Export/Editor-Vorschau.                                      | Additive `order`-Option mit Default `'resume-first'`; Regressionstest `DocumentsToHtml_DefaultOrder_RendersResumeBeforeLetter` + bestehende Preview-Parity-Tests bleiben grün.                                                                 |
| RI2 | **Empfänger-Block leer** (Kopie-`letter.firma` leer) → Mappe wirkt „unadressiert“.                                        | Verbindlicher Fallback (OQ2): `recipientForMappe` setzt `postingCompany` ein; Unit `RecipientForMappe_*` + Acceptance `DossierPdf_EmptyFirma_FallsBackToPostingCompany`.                                                                       |
| RI3 | **Anhang-Zugehörigkeit** (id gehört nicht zum Mandanten) übersehen → Cross-Talent-Leak in der Mappe.                      | Service-Prüfung `attachment.talentId === application.talentId` bei Save **und** Render; Acceptance `DossierPdf_ForeignAttachment_Returns404`, `UpdateAttachments_ForeignTalentAttachment_Returns404`.                                          |
| RI4 | **Nicht-PDF-Anhänge** würden im PDF-Merge still entfallen.                                                                | Auswahl ist PDF-only (OQ3): UI filtert, Service lehnt Nicht-PDF mit 400 ab — kein stiller Verlust möglich.                                                                                                                                     |
| RI5 | **Coverage** durch neue Services/`order`-Zweige; Baseline knapp über 90 %.                                                | `sql-job-application-repository.ts` bleibt in der Ausschlussliste (Integrationstest); sonst 100 % Branch anstreben; Schwellen nie senken.                                                                                                      |
| RI6 | **Signatur-Wechsel `listJobApplications`** bricht Aufrufer.                                                               | Beide Aufrufer (`app.jsx`, `TalentProfile`) in derselben PR umstellen; Vitest deckt die Aufrufe.                                                                                                                                               |
| RI7 | **fs-Läufe verändern getrackte Dateien** unter `archive/bewerbungen/`.                                                    | Protokoll 9.0/F7; vor jedem Commit `git status`, Diff prüfen (Repo-Regel §4).                                                                                                                                                                  |
| RI8 | **Streaming-ZIP** (OQ4): Abort/Fehler mitten im Stream, Backpressure, Ressourcen.                                         | `yazl`-`outputStream` in `res` pipen; `res.on('close')` → destroy; Fehler vor dem Stream → problem+json. Tests `…_ClientAbort_DestroysStream`, `…_ValidatesBeforeStream_ThrowsWithoutOutput`, `DossierZip_NoContentLength_StreamsChunked`.     |
| RI9 | **Gemergtes PDF bleibt in-memory** (pdf-lib/Puppeteer sind nicht streamend) — Rest-Speicher bei sehr großen PDF-Anhängen. | Bewusst akzeptiert (unvermeidbar, Status quo); PDF-Anhänge sind ohnehin größenbegrenzt (~15 MB/Upload). Das ZIP selbst wird nie gepuffert. Falls je nötig: Temp-File statt Buffer für das gemergte PDF (Folgeoption, nicht Teil dieser Phase). |

### 10.2 Entschieden vom Owner (verbindlich)

Keine offenen Fragen mehr. Die fünf ursprünglichen OQ sind entschieden und in
Plan + ADR-0061 eingearbeitet:

| OQ  | Entscheidung (verbindlich)                                                                                                                                                                                                                                               | Verankert in                           |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------- |
| OQ1 | ZIP-eingebettetes `Bewerbung.pdf` enthält die Anhänge **mit** (Gesamt-PDF); Anhänge zusätzlich als Einzeldateien im ZIP.                                                                                                                                                 | ADR-0061 §3, Plan §1.1/§5/§5.2, AK-4.1 |
| OQ2 | Bei leerem/Whitespace-`letter.firma` wird `postingCompany` als Empfänger-Fallback im PDF-Header eingesetzt; eine gefüllte `firma` wird **nie** überschrieben. Reine, getestete Funktion `recipientForMappe`.                                                             | ADR-0061 §2, Plan §2.1/§5/§7, AK-4.2   |
| OQ3 | Auswahl auf `application/pdf`-Anhänge beschränkt (Merge **und** ZIP-Einzeldateien); Nicht-PDF → 400 `validation-error`, UI filtert.                                                                                                                                      | ADR-0061 §3, Plan §4.3/§6.1/§7         |
| OQ4 | **Streaming-ZIP** via `yazl` (+ `@types/yazl`, MIT, 1 Mini-Dependency `buffer-crc32`, keine Transitive); gemergtes PDF in-memory (unvermeidbar), ZIP-Ausgabe gestreamt (Chunked, kein `Content-Length`), eager Validierung vor dem Stream, Abort über `res.on('close')`. | ADR-0061 §7, Plan §5.2/§7              |
| OQ5 | „verknüpft mit Bewerbung“-Spalte im Anhang-Tab wird **jetzt** nachgezogen (Datenquelle `selectedAttachmentIds`, klickbar).                                                                                                                                               | ADR-0061 Consequences, Plan §6.3/§7    |
