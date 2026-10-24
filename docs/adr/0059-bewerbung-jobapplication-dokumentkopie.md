# ADR-0059 — Bewerbung als eigene Entität `JobApplication` (Stelle × Mandant) mit Dokument-Kopie

- **Status:** Proposed
- **Requirements:** FR-81 bis FR-88 (neu, Phase 2); baut auf FR-70 bis FR-73 (Bewerbungsservice) und FR-75 bis FR-80 (Stellen) auf
- **Relates to:** ADR-0001 (Hexagon), ADR-0003 (fs-Standard, sql optional), ADR-0010/0033 (Workspace-Scope), ADR-0012 (zod + RFC-9457), ADR-0045 (keine fabrizierten Daten), ADR-0046/0048 (das **alte** Pipeline-`Application`), ADR-0051 (Nest am Rand), ADR-0057 (Produkt-Schwenk, zentraler Key), ADR-0058 (Stellen als `JobPosting`)

## Context

Der Bewerbungsservice braucht in Phase 2 die Kernentität **Bewerbung = Stelle ×
Mandant**: eine Person (Mandant, Code `Talent`) bewirbt sich auf eine gespeicherte
Stelle (`JobPosting`, ADR-0058). Jede Bewerbung bekommt eine **eigene Kopie** von
Basis-CV und -Anschreiben, damit Anpassungen für eine Stelle weder den Basis-CV noch
eine andere Bewerbung desselben Mandanten verändern (AK-2.1, AK-2.3). Außerdem hat
sie einen eigenen Status mit Zeitstempel-Verlauf.

Es existiert bereits eine Entität `Application` (`domain/application.ts`, Route
`/api/v1/applications`, Token `APPLICATION_*`). Das ist die **Vermittler-Pipeline**
aus ADR-0046/0048: ein Einreichungs-Datensatz (`company`, `position`, `address`,
`reference`, `status ∈ {sent, screening, interview, offer, hired, rejected}`,
`pdfPath`, `source`, optional `talentId`/`talentName`), der über `PipelineBoard`
per Drag&Drop durch Stadien geschoben, per `Versioner` in Git committed und über
`AuditLog`/`PdfArchive` protokolliert/archiviert wird. Diese Pipeline ist seit
ADR-0057 **eingefroren** und gehört hinter den `vermittlung`-Schalter.

Beide Konzepte kollidieren im Namen „Bewerbung“/„Application“, sind aber fachlich
verschieden:

|              | Altes `Application` (Pipeline)                                  | Neues „Bewerbung“ (Hauptweg)                                                           |
| ------------ | --------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| Bezug        | Firma + Position als Freitext, kein Stellenbezug                | verweist auf `JobPosting` **und** `Talent`                                             |
| Daten        | Einreichung + archivierte PDF                                   | **Dokument-Kopie** (CV + Anschreiben) als Arbeitskopie                                 |
| Status       | `sent/screening/interview/offer/hired/rejected` (Board-Stadien) | `draft/sent/interview/offer/rejected` (Entwurf → versendet → Gespräch → Zusage/Absage) |
| Verlauf      | `AuditEvent` + Git-Commits                                      | Zeitstempel-`statusHistory` auf dem Datensatz                                          |
| Sichtbarkeit | hinter `vermittlung`                                            | immer (Hauptweg)                                                                       |
| Lebenszyklus | eingefroren                                                     | wird in Phase 3/4 erweitert (Magic Pen, Mappe)                                         |

## Decision

1. **Neue Entität `JobApplication`** (UI „Bewerbung“), getrennt vom eingefrorenen
   Pipeline-`Application`. Das alte `Application` bleibt **unverändert** hinter dem
   Schalter; `JobApplication` ist der Hauptweg. Begründung: Erweitern des alten
   `Application` würde (a) eingefrorenen Code anfassen, (b) zwei Status-Vokabulare
   und zwei Verlaufsmechanismen in eine Zeile mischen und (c) dem Hauptweg die
   Pipeline-Maschinerie (`Versioner`, `AuditLog`, `PdfArchive`) aufzwingen, die eine
   Arbeitskopie nicht braucht. Die Trennung hält die Migration (AK-2.7) als klaren,
   additiven „expand/contract“-Schritt.

   Felder exakt: `id`, `ownerId` (Workspace-Scope), `jobPostingId` (**soft**
   Referenz ohne FK/Cascade), `postingCompany` + `postingTitle` (Snapshot aus der
   Stelle beim Anlegen — die Bewerbung bleibt nach dem Löschen der Stelle vollständig
   anzeigbar und bedienbar), `talentId`, `talentName` (Snapshot für die Anzeige nach
   Anonymisierung des Mandanten), `status ∈ {draft, sent, interview, offer, rejected}`,
   `statusHistory: { status, at }[]` (append-only, Zeitstempel je Wechsel),
   `documents: TalentDocuments` (die Kopie), `createdAt`, `updatedAt`.

2. **Die Dokument-Kopie liegt eingebettet auf dem Datensatz** (`documents`, jsonb /
   JSON-Feld), nicht in einem separaten, nach `(owner, application)` geschlüsselten
   Store. Ein Bewerbungs-Datensatz ist damit **ein** Aggregate mit **einem**
   idempotenten Schreibpfad; Löschen der Bewerbung löscht die Kopie automatisch, und
   die Unabhängigkeit (AK-2.3) ist eine Ein-Zeilen-Zusicherung (`a1.documents !==
a2.documents !== basis`). Verworfen: ein zweiter `DocumentRepository`-artiger
   Port, der das Kopieren/On-Cascade-Löschen über zwei Stores verteilt hätte, ohne
   Produktwert.

3. **Kopier-Semantik** (reine Domain-Funktion `copyDocumentsForApplication` in
   `talent-documents.ts`): kopiert werden `contact`, `resume` (strukturiert:
   `summary`/`experience`/`education`/`skillGroups`), `letter`, `style` — **nicht**
   kopiert werden (a) `resume.rawText` (interne Rohquelle des Basis-CV-Imports, wird
   nie gerendert/versendet; eine Bewerbung arbeitet auf den strukturierten Feldern,
   und eine Duplikation von bis zu 50 KB personenbezogener Rohdaten pro Bewerbung
   widerspräche der Datenminimierung, vgl. ADR-0057 §4) und (b) `translations`
   (Sprachvarianten des Basis-Datensatzes; die Kopie ist die einsprachige
   Arbeitsfassung für genau eine Stelle). `ownerId`/`talentId` der Kopie behalten den
   Mandanten (Provenienz), damit alle Rendering-/Editor-Pfade, die ein
   `TalentDocuments` erwarten (`documentsToHtml`, `renderDossierFromDocuments`,
   der Editor), **unverändert** wiederverwendbar bleiben. Das Referenz-PDF
   (`ORIGINAL_CV_ATTACHMENT_NAME`) und alle anderen Anhänge bleiben **talent**-gebunden
   und werden in Phase 2 **nicht** kopiert; die Auswahl für die Mappe entscheidet
   Phase 4.

4. **Genau eine Bewerbung pro (Stelle, Mandant).** Der `JobApplicationService`
   prüft vor dem Anlegen (Service-Check, wie ADR-0058) und liefert bei Treffer die
   bestehende Bewerbung mit `alreadyExisting: true` (HTTP 200, UI „Bewerbung öffnen“).
   Postgres bekommt einen **partiellen Unique-Index `(owner_id, job_posting_id,
talent_id)`** als Race-Rückhalt; der sql-Adapter fängt `23505` und re-queried
   (Muster `SqlJobPostingRepository`). Der fs-Adapter hat nur den Service-Check und
   serialisiert Schreibzugriffe über eine In-Process-Mutex.

5. **Statuswechsel** laufen über einen eigenen Endpunkt und schreiben den Verlauf
   im Service: jeder Wechsel erzeugt einen `statusHistory`-Eintrag mit Zeitstempel;
   jeder Wechsel ist erlaubt, auch zurück (AK-4.4 vorgreifend). Das Verlaufs-UI folgt
   in Phase 4.

6. **Anschreiben-Generierung als neues KI-Feature.** Ein neuer Prompt-Builder erhält
   den **vollen Anzeigentext** (`JobPosting.description`, als untrusted data) plus die
   strukturierten Fakten der Kopie — nicht die Skill-Tags (AK-2.5). Neues
   `UsageFeature 'applicationLetter'`, neuer `MAX_TOKENS`-Eintrag. Ohne Key 503
   `ai-not-configured`, unbrauchbare Antwort 502 — **kein** Template-Fallback
   (ADR-0057). **Nicht Pro-gated** (Owner Q2): die Bewerbungs-Generierung gehört zum
   Hauptweg und läuft ohne Plan; die alte, eingefrorene `/cover-letter`-Route bleibt
   weiterhin `@RequiresPlan('pro')`. Der bestehende, deterministische
   Grounding-Check (`checkGrounding`, ADR-0009) bleibt; die formalen Prüfungen aus
   AK-2.4 (Firma/Titel genannt, Sprache, 250–400 Wörter, ≥ 2 konkrete
   Anzeigen-Bezüge) werden als reine Funktion über das Ergebnis laufen gelassen.

7. **Migration des Altbestands (AK-2.7, Owner Q4/Q5).** Je altem `Application`
   **mit** `talentId` werden eine `JobPosting` (Quelle `migrated`; Dedup über `url`
   aus `reference`, sonst über `(company, title)`) und daraus eine `JobApplication`
   (Dokument-Kopie des aktuellen Basis-CV) angelegt. Status-Mapping:
   `hired→offer`, `screening→sent`, alle übrigen 1:1 (`sent→sent`,
   `interview→interview`, `offer→offer`, `rejected→rejected`). Alte `Application`
   **ohne** `talentId` (eigene Dossiers) bleiben unberührt hinter dem Schalter. Die
   Idempotenz trägt ein Bool `applicationsMigrated` (Default `false`) im bestehenden
   `WorkspaceSettings`-Store; zusätzlich ist der Schritt per-row idempotent
   (JobPosting-Dedup + „genau eine Bewerbung pro (Stelle, Mandant)“).

8. **Löschen einer Stelle lässt Bewerbungen intakt.** `jobPostingId` ist eine
   **soft** Referenz (kein FK, kein `ON DELETE CASCADE`); das Löschen einer
   `JobPosting` (Phase 1) berührt Bewerbungen nicht. Liste, Editor-Kopfzeile und
   Anschreiben-Prompt lesen Firma/Titel aus den Snapshots `postingCompany`/
   `postingTitle`, nie aus der Stelle. Nur der volle Anzeigentext
   (`JobPosting.description`) wird für das Anschreiben **lazy** nachgeladen: existiert
   die Stelle noch, fließt ihr `description` in den Prompt (AK-2.5); ist sie gelöscht,
   ist der Anzeigentext `''` und `checkApplicationLetter` meldet `references: 0` ehrlich
   (kein Abbruch, kein erfundener Text).

## Consequences

- Der Hauptweg hat eine eigene, workspace-gebundene, in beiden Stores identisch
  verhaltene Entität; die eingefrorene Pipeline bleibt unangetastet und in den
  Coverage-/Compile-Pflichten erhalten. Die beiden `Application`-Konzepte sind klar
  getrennt und im Glossar dokumentiert.
- Die Migration (AK-2.7) wird ein additiver, idempotenter Boot-Schritt: aus jedem
  alten `Application` **mit** `talentId` wird eine `JobPosting` (Quelle `migrated`,
  `url` aus `reference` falls parsebar) und daraus eine `JobApplication` mit Kopie
  des aktuellen Basis-CV. Alte `Application` **ohne** `talentId` (eigene Dossiers)
  bleiben hinter dem Schalter und werden nicht migriert (kein Mandant → keine
  Bewerbung). Die Idempotenz trägt der `WorkspaceSettings`-Bool `applicationsMigrated`
  (Owner Q5).
- Die Nav „Bewerbungen“ zeigt ab Phase 2 die neue `JobApplication`-Liste; das alte
  `PipelineBoard` (eingefroren) bleibt **nur** bei eingeschalteter Vermittlung als
  Sub-Tab „Pipeline“ erreichbar (Owner Q1). Der Pipeline-Code selbst bleibt
  unangetastet.
- `postingCompany`/`postingTitle` sind bewusste Denormalisierung (Snapshot statt
  Join): sie halten Bewerbungen nach dem Löschen einer Stelle anzeigbar und das
  Anschreiben erzeugbar, ohne eine Fremdschlüssel-Cascade (die es in diesem Schema
  ohnehin nirgends gibt) einzuführen. Kosten: ein paar Duplikat-Strings pro
  Datensatz, nie abweichend, da sie nur beim `create` befüllt und nie geändert
  werden.
- `rawText`/`translations` werden bewusst nicht kopiert (Owner Q3 bestätigt); das ist
  eine Datenminimierungs- und Arbeitskopie-Entscheidung, keine technische
  Notwendigkeit — sie ist die am ehesten zu revidierende Stelle, falls ein späterer
  Magic-Pen- oder Grounding-Schritt doch Rohdaten der Kopie braucht.
- Der Editor wird so umgebaut, dass seine Persistenz (Laden/Speichern/Vorschau) über
  eine kleine Naht parametrisiert ist; das Bewerbungs-Dokument bleibt damit das
  **eine** Editor-Paradigma, das `ApplyModal` entfällt (AK-2.8).
