# ADR-0061 — Abschluss: Bewerbungsmappe aus der Kopie, eingefrorene Dokumente ab „versendet“, Statusfilter

- **Status:** Proposed
- **Requirements:** FR-95 bis FR-98 (neu, Phase 4); baut auf FR-81 bis FR-88 (Phase 2) und FR-89 bis FR-94 (Phase 3) auf
- **Relates to:** ADR-0001 (Hexagon), ADR-0003 (fs-Standard, sql optional), ADR-0010/0033 (Workspace-Scope), ADR-0012 (zod + RFC-9457), ADR-0051 (Nest am Rand), ADR-0052 (eine Renderquelle), ADR-0057 (Produkt-Schwenk, zentraler Key, Referenz-Anhang nie automatisch angehängt), ADR-0059 (`JobApplication` + Dokument-Kopie), ADR-0060 (Magic Pen auf der Kopie)

## Context

Phase 4 schließt den Bewerbungs-Hauptweg ab: die **Bewerbungsmappe** wird aus der
**Kopie** (`JobApplication.documents`, ADR-0059) erzeugt — als PDF und als ZIP mit den
gewählten Anhängen (AK-4.1/4.2), danach wird der Status gepflegt und die Dokumente ab
„versendet“ eingefroren (AK-4.5), und es gibt eine nach Status filterbare Übersicht
gesamt und pro Mandant (AK-4.6).

Vier Kräfte, die eine naive Lösung („bestehenden Talent-Dossier-Endpunkt auf die
Kopie zeigen lassen“) falsch machen:

1. **Die Mappe braucht die Kopie, nicht den Basis-CV.** `renderDossierFromDocuments`
   (ADR-0059 §3.4 hält die Kopie bewusst `TalentDocuments`-förmig, damit genau diese
   Pfade wiederverwendbar bleiben) kann die Kopie unverändert rendern. Aber der
   bestehende Talent-Dossier-Endpunkt liest die Basis-Dokumente über
   `documentRepository.get` — nicht die Kopie. Es braucht einen neuen Einstieg, der
   aus der Bewerbung rendert, und eine Entscheidung, ob/wie die **Empfängeradresse**
   eingemischt wird.
2. **Die Anhang-Auswahl ist bisher ephemer.** Phase 2 hat Anhänge bewusst
   **talent-gebunden** gelassen und die Auswahl auf Phase 4 verschoben
   (ADR-0059 §3.4, `phase-2-bewerbung.md` §1.2). Das Anhang-Tab (`TalentProfile.jsx`)
   notiert sogar explizit, dass die „verknüpft mit Bewerbung X“-Spalte **keinen
   Datenbestand** hat, weil weder `Application` noch `JobApplication` Anhang-IDs
   persistiert. Für AK-4.5 („was wurde versendet“ ist reproduzierbar) und für diese
   Verknüpfung muss die Auswahl **persistiert** werden.
3. **AK-4.1 verlangt die Reihenfolge „Anschreiben → CV“.** Die bestehende
   `documentsToHtml` rendert **CV → Anschreiben** (klassisch/modern/compact und ink).
   Die Reihenfolge ist heute für die Basis-Exporte fest verdrahtet; die Mappe braucht
   eine davon abweichende, aber additive Ordnungs-Option, ohne die Basis-Exporte
   anzufassen.
4. **AK-4.5 (Einfrieren) ist ein Querschnitts-Verhalten.** Ab Status „versendet“
   müssen Schreibpfade auf die Dokumente (und auf die Anhang-Auswahl, die Teil der
   Mappe ist) einen 409 liefern, sofern die Änderung nicht ausdrücklich bestätigt und
   im Verlauf vermerkt wird.

## Decision

1. **Die Auswahl wird persistiert: `JobApplication.selectedAttachmentIds: string[]`.**
   Feld auf dem Datensatz (fs: JSON-Array; sql: `jsonb`, Standard `[]`), analog zu
   `statusHistory`/`documents`. Begründung: (a) AK-4.5 braucht eine stabile,
   einfrierbare „was wurde versendet“-Aussage, die auch die Anhänge umfasst; (b) die in
   Phase 2 verschobene „verknüpft mit Bewerbung“-Verknüpfung bekommt endlich einen
   Datenbestand; (c) die Kosten sind minimal (ein Feld, das wie die Nachbarfelder
   eingebettet wird — kein neuer Store, keine FK). Verworfen: ephemer clientseitig pro
   Download — dann wäre „versendet“ nicht reproduzierbar und AK-4.5 liefe an den
   Anhängen vorbei. Der **Referenz-Anhang** (`ORIGINAL_CV_ATTACHMENT_NAME`,
   ADR-0057) ist in der Auswahl **manuell wählbar**, wird aber **nie vorausgewählt**
   und **nie automatisch angehängt** — die Auswahl startet bei `[]` (konsistent zur
   Regel „Referenz-Anhang wird nie automatisch angehängt“; der Nutzer kann ihn als
   Referenz bewusst beifügen).

2. **Die Mappe rendert die Kopie, mit Empfänger-Fallback nur bei leerem `firma`.**
   `renderDossierFromDocuments(scope, application.documents, recipient, selectedAttachmentIds)`
   mit `recipient = recipientForMappe(application)`: Empfängerblock, Betreff und
   Briefkörper kommen aus der **Kopie** (`letter.firma`/`ansprechpartner`/`strasse`/
   `plzOrt`/`betreff`/`absaetze`), die der Nutzer (und Anschreiben-Generierung/Magic
   Pen) bereits auf die Stelle zugeschnitten hat. **Nur** wenn `letter.firma` leer bzw.
   Whitespace ist, wird `postingCompany` als Empfänger-Firma eingesetzt (verbindliche
   Owner-Entscheidung OQ2 — der PDF-Header ist dann adressiert statt leer). Eine
   **nicht-leere** `firma` wird nie überschrieben (AK-4.2 verlangt die **angepasste**
   Fassung; eine bewusst formulierte Anschrift bleibt maßgeblich). Die Regel ist eine
   reine, getestete Funktion `recipientForMappe` in `domain/job-application.ts`. Der
   Dateiname trägt die Firma ohnehin über den Snapshot (`postingCompany`).

3. **Neuer Service `JobApplicationDossierService`** (decorator-frei), der
   `DocumentService.renderDossierFromDocuments` **wiederverwendet** (etabliertes
   Muster: `ApplicationBuilder.renderDossier` komponiert denselben Aufruf) und die
   ZIP-Montage selbst übernimmt. Die ZIP-Montage **weicht** von
   `DocumentService.renderDossierZip` ab: jener ZIP dient dem Editor-Reimport
   (PDF + `Bewerbung.html` mit eingebettetem JSON, #239); die **Mappe** ist eine
   Abgabe an den Arbeitgeber und enthält **kein** Reimport-HTML, sondern (a) das
   gemergte **Gesamt-PDF** (Anschreiben → CV → Anhänge, Anhänge **mit** — OQ1) und
   (b) die ausgewählten Anhänge als **einzelne PDF-Dateien** (Originalname,
   dedupliziert). Der Service validiert beim Zusammenbau, dass jede gewählte
   Anhang-ID dem Mandanten (`talentId`) **und** dem Workspace der Bewerbung gehört
   **und** `application/pdf` ist: fremde/fremd-gebundene Anhänge → 404, Nicht-PDF →
   400 `validation-error` (OQ3, Auswahl ist PDF-only).

4. **Reihenfolge „Anschreiben → CV“ als additive Option.** `documentsToHtml`
   (inkl. `inkDocument`) erhält `options.order: 'resume-first' | 'letter-first'`
   (Default `'resume-first'`, d. h. Basis-Export und Editor-Vorschau bleiben
   unverändert). Die Mappe ruft `order: 'letter-first'`, damit die gemergte PDF die
   Reihenfolge Anschreiben → CV → angehängte PDF-Anhänge hat (AK-4.1). Keine Änderung
   der Basis-Export-Reihenfolge.

5. **Einfrieren ab „versendet“ (AK-4.5).** `status !== 'draft'` friert ein.
   `PUT /job-applications/:id/documents` (und damit auch der Magic-Pen-Accept, der über
   dieselbe Route schreibt) sowie `PUT /job-applications/:id/attachments` antworten
   ohne Bestätigung **409 `frozen`**. Die Bestätigung ist der Query-Parameter
   `?unfreeze=1`; der Service hängt dann einen `statusHistory`-Eintrag
   `{ status: <aktueller Status>, at, note: 'Dokumente nach Einfrieren geändert' }`
   an (das Feld `JobApplicationStatusChange` bekommt ein optionales `note`; die
   Invariante `status === at(-1).status` bleibt, weil sich der Status nicht ändert).
   **Note-Dedup:** der Eintrag wird nur angehängt, wenn der letzte `statusHistory`-
   Eintrag **nicht bereits denselben** `note` trägt — ein Eintrag pro
   **Bestätigungstyp** und Status-Phase, kein Spam durch debounced Autosave.
   Zwei unterschiedliche erzwungene Änderungen (Dokumente **und** Anhänge) nach
   „versendet“ ergeben zwei unterscheidbare Einträge; Wiederholungen desselben
   Typs bleiben dedupliziert. **UI-Variante (a):** die Bestätigung gilt für die
   **Editor-Session** — ein `unfrozen`-Merker lässt alle Folge-Saves desselben Editors
   `?unfreeze=1` senden (ein Dialog pro Session; Ablehnung verwirft und sendet kein
   `unfreeze`). Zurücksetzen auf „Entwurf“ (ein normaler, im Verlauf verzeichneter
   Statuswechsel) stellt die Editierbarkeit wieder her — Einfrieren ist eine Funktion
   des aktuellen Status.

6. **Statusfilter ist ein Serverfilter.** `GET /job-applications?status=` erweitert
   `jobApplicationQuerySchema` und beide `list`-Implementierungen (fs + sql), symmetrisch
   zum bestehenden `talentId`. Begründung: `status` ist eine persistierte, denormalisierte
   Spalte und damit eine natürliche Query-Dimension; nur auf Adapter-Ebene ist die
   Repo-Regel „fs und sql verhalten sich gleich“ _beweisbar_ (beide Adapter-Tests +
   Integrationstest); der Agent (Phase 5) erbt den Filter als Service-Fähigkeit statt
   eine UI-Konvention nachzubauen. Der UI-Freitext-Filter (Suche) bleibt clientseitig
   (andere Sorge: Freitext vs. Enum). Der Filter ist optional, ein Wert (kein
   Multi-Select), kein Filter = alle Status.

7. **Streaming-ZIP (OQ4): die ZIP-Ausgabe wird gestreamt, nicht in-memory gebaut.**
   Verbindlich **`yazl`** (+ `@types/yazl`): reines Node-Streaming-ZIP, MIT,
   1 Mini-Dependency (`buffer-crc32@^1.0.0`, reine CRC-32-Funktion, keine
   Transitive); verworfen `archiver` (schwerer — zieht
   `zip-stream`/`tar-stream`-Transitive) und `adm-zip` (nur `toBuffer()`, kein
   Streaming). Ablauf: das gemergte PDF wird **im Speicher** gebaut (pdf-lib/Puppeteer
   sind in-memory — ein begrenzter PDF-Buffer, unvermeidbar und Status quo) und als
   `addBuffer('Bewerbung.pdf')` in den Stream gelegt; die PDF-Anhänge werden einmal als
   `Buffer` gelesen, validiert und je als `addBuffer(Originalname)` hinzugefügt. Der
   `ZipFile.outputStream` wird in die HTTP-Response gepiped (Chunked, **kein**
   `Content-Length`). RAM-Profil: gemergtes PDF + N PDF-Anhang-Buffer, **nicht** das
   gesamte ZIP. Fehler-/Abort-Semantik: Validierungsfehler werden **vor** `end()`
   geworfen (→ problem+json, kein halber Stream); Client-Abbruch über `res.on('close')`
   → `outputStream.destroy()`; Stream-/Read-Fehler werden an die Response
   weitergereicht. Details + Testnamen im Plan §5.2.

## Consequences

- Die Mappe (PDF + ZIP) entsteht vollständig aus der Kopie plus der persistierten
  Anhang-Auswahl; die Basis-CV-/Anschreiben-Exporte und der Editor bleiben unberührt
  (bis auf die additive `order`-Option). Der Basis-CV wird durch die Mappe nie gelesen
  oder geschrieben — die AK-2.3-Invariante gilt weiter.
- `selectedAttachmentIds` ist ein weiteres eingebettetes `jsonb`/JSON-Feld; die
  Migration ist additiv (fs: Lesen defaultet auf `[]`; sql: `ADD COLUMN IF NOT EXISTS
... jsonb NOT NULL DEFAULT '[]'`). Kein FK — die Validierung „Anhang gehört zum
  Mandanten“ ist eine Service-Prüfung (Muster ADR-0059: keine Fremdschlüssel im Schema).
- Das Einfrieren macht den Versand ehrlich: nach „versendet“ ist die Mappe
  (Dokumente + Anhang-Auswahl) nur noch bewusst und verzeichnet änderbar. Kosten: ein
  zusätzlicher `statusHistory`-Eintrag mit `note` je erzwungener Änderung und eine
  409-Behandlung im Editor/Anhang-Dialog.
- Der Referenz-Anhang bleibt eine reine Referenz: manuell wählbar, nie vorausgewählt.
  Die Auswahl ist auf `application/pdf`-Anhänge beschränkt (OQ3); Nicht-PDF-Anhänge
  werden in der Auswahl nicht angeboten und bei `PUT …/attachments` mit 400 abgelehnt.
- Der Drift-Wächter `route-inventory.ts` bleibt bei **18** KI-Routen (K01–K18): Phase 4
  führt **keine** neue KI-Route ein (Mappe, Statusfilter und Anhang-Auswahl sind
  deterministisch). Kein neues `UsageFeature`, kein `MAX_TOKENS`, kein
  Fake-`LlmService`-Bedarf.
- Die „verknüpft mit Bewerbung“-Verknüpfung im Anhang-Tab wird **in dieser Phase**
  nachgezogen (Owner OQ5): `TalentProfile` leitet sie aus `selectedAttachmentIds` ab
  (je Anhang die Bewerbungen, die ihn gewählt haben) — kein separater Datenbestand
  nötig, der Link ist eine abgeleitete Ansicht über die bereits geladene
  Bewerbungsliste des Mandanten.
- Streaming (OQ4) macht die Mappe auch bei mehreren/großen PDF-Anhängen
  speicherverträglich: die ZIP-Bytes werden nie als Ganzes gehalten. Kosten: eine
  neue kleine Dependency (`yazl` + `@types/yazl`, MIT, server-only, kein Client-Bundle-
  Einfluss), ein Controller mit `@Res()`-Pipe und die Pflicht, Abort-/Fehlerfälle zu
  testen (Plan §5.2/§7).
