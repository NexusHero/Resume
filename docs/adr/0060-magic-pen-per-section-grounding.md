# ADR-0060 — Magic Pen: abschnittsweises Anpassen der Bewerbungs-Kopie, grounded gegen den Basis-CV

- **Status:** Proposed
- **Requirements:** FR-89 bis FR-94 (neu, Phase 3); baut auf FR-81 bis FR-88 (Phase 2) und FR-84/85 (Anschreiben) auf
- **Relates to:** ADR-0001 (Hexagon), ADR-0003 (fs-Standard, sql optional), ADR-0009 (Grounding self-check), ADR-0010/0033 (Workspace-Scope), ADR-0012 (zod + RFC-9457), ADR-0045 (keine fabrizierten Daten), ADR-0051 (Nest am Rand), ADR-0057 (Produkt-Schwenk, zentraler Key, kein Template-Fallback), ADR-0058 (`JobPosting`), ADR-0059 (`JobApplication` + Dokument-Kopie)

## Context

Phase 3 fügt den **Magic Pen** hinzu: pro Abschnitt der Bewerbungs-Kopie eine
KI-Aktion mit Vorher/Nachher und Übernehmen/Verwerfen/Neu, dazu „Alles für diese
Stelle anpassen“ (AK-3.1 bis AK-3.6). Die Arbeit findet ausschließlich auf der
**Kopie** statt (`JobApplication.documents`, ADR-0059); der Basis-CV bleibt
unberührt.

Zwei Kräfte, die die naive Lösung („bestehenden `tailorForMandate`/`suggest`
auf die Kopie zeigen lassen“) falsch machen:

1. **Die Kopie ist keine Faktenquelle.** Sie ist eine _Arbeitsfassung_: Der Nutzer
   kann sie manuell editieren oder einen früheren Vorschlag übernommen haben. Eine
   dort bereits eingeschleppte erfundene Firma/Zahl/Skill würde als „grounded“
   durchgehen, sobald der Grounding-Check gegen die Kopie läuft (heute:
   `groundingSource(application.documents)` in `application-letter-service.ts`).
   Für die **CV-Fakten** (Skills, Arbeitgeber, Daten, Abschlüsse, Kennzahlen), die
   die vier CV-Abschnitte umschreiben, muss der Grounding-Check deshalb gegen den
   **Basis-CV** laufen, nicht gegen die Kopie. (Der Anschreiben-Slot ist bewusst
   die Ausnahme, siehe Decision 2/5.)
2. **AK-3.2/3.3 verlangen mehr als ADR-0009 leistet.** ADR-0009 fängt bewusst nur
   zwei hochsignifikante Claim-Arten: _Zahlen mit Einheit_ und _bekannte Skills_.
   AK-3.2 verbietet explizit auch das Erfinden von **Arbeitgebern, Daten, Titeln und
   Abschlüssen**; AK-3.3 misst gegen das echte Modell „0 durchgelassene erfundene
   Arbeitgeber, Daten oder Abschlüsse“. Der bestehende `checkGrounding` kann diese
   drei Klassen **nicht** erkennen — er würde sie still durchlassen.

## Decision

1. **Magic Pen arbeitet nur auf der Kopie, nie auf dem Basis-CV.** Jeder Abschnitt
   bildet genau ein Kopie-Feld ab (Tabelle unten). Es gibt **keinen** Schreibpfad
   aus dem Magic Pen auf den Basis-CV; Übernehmen schreibt ausschließlich die
   Kopie über den bestehenden `PUT /job-applications/:id/documents` (Invariante aus
   AK-2.3 gilt weiter). Der bisherige `tailorForMandate` (Vermittler/Autopilot,
   ADR-0019) bleibt eingefroren und wird **nicht** umgebaut; der Magic Pen ist ein
   neuer, eigenständiger Service auf denselben Bausteinen (`LlmFeatureRunner`).

2. **Grounding-Quelle = Basis-CV, nicht die Kopie.** Für jeden der vier
   CV-Abschnitt-Vorschläge lädt der Service den Basis-Datensatz über
   `documentRepository.get(scope, talentId)` und groundt mit
   `groundingSource(baseDocuments)` — **ohne** den Anzeigentext als `extra` (sonst
   würde ein nur in der Anzeige genanntes Skill, das der Mandant nicht hat, als
   belegt durchgehen und AK-3.2 verletzen). Ist der Basis-Datensatz nicht mehr
   vorhanden (Mandant gelöscht), fällt der Service auf die Kopie zurück (best
   effort: die Kopie ist ein Snapshot des Basis-CV zum Anlegezeitpunkt).

   **Einzige, bewusste Ausnahme ist der Anschreiben-Slot** (Punkt 5): der läuft über
   das bestehende `applicationLetter`, das gegen die **Kopie** groundet — diese
   Asymmetrie (CV-Abschnitte gegen Basis-CV, Letter gegen Kopie) ist eine
   Owner-Entscheidung (OQ1) und wird in Punkt 5 begründet.

3. **Strukturelle Verankerung statt freier Textgenerierung.** Jeder Abschnitt-Prompt
   bekommt die **unveränderlichen Basis-Fakten** als geschlossenen Kontext (für
   `experienceBullets` die Station `role`/`company`/`period`; für `headline`/
   `summary` die Rollen/Firmen/Ausbildungen; für `skills` die vorhandenen Skills)
   und die Anweisung, nur den _editierbaren_ Anteil umzuformulieren. Erfindungen
   werden damit gar nicht erst nahegelegt, und die Verletzung ist deterministisch
   erkennbar.

4. **Der deterministische Verifier wird gezielt erweitert.** `checkGrounding`
   (ADR-0009) bekommt zwei neue hochsignifikante Claim-Arten, die gegen ein kleines
   **Inventar aus dem Basis-CV** geprüft werden (keine generische Entity-Erkennung,
   um ADR-0009s False-Positive-Warnung zu wahren):
   - `year` — vierstellige Jahreszahlen im generierten Text, die in keiner
     `period`/`education.period` des Basis-CV vorkommen (auch nicht als Rand einer
     Spanne);
   - `degree` — bekannte Abschluss-Tokens (Bachelor, Master, Diplom, MBA, Dr., PhD,
     M.Sc., B.Sc., „Ausbildung“, „Studium“, …), die in keiner `education.degree` des
     Basis-CV belegt sind.
     Arbeitgeber-/Titel-Erfindungen werden primär durch die strukturelle Verankerung
     (Punkt 3) verhindert; zusätzlich prüft die nächtliche AK-3.3-Suite gegen das
     echte Modell und stimmt bei Bedarf nach. Eine weitergehende `employer`-Erkennung
     bleibt bewusst außen vor (ADR-0009: generische Entity-Erkennung ist im Deutschen
     reines Rauschen) und ist eine mögliche, lokal revidierbare Vertiefung.

5. **Der Abschnitt „Anschreiben“ nutzt das bestehende `applicationLetter` weiter**
   (ADR-0059, FR-84/85): voller Anzeigentext und formale Checks
   (`checkApplicationLetter`) sind bereits vorhanden. **Der Letter groundet gegen die
   Kopie, nicht gegen den Basis-CV** (Status quo aus Phase 2,
   `groundingSource(application.documents)`): das Anschreiben entsteht aus der
   _Arbeitsfassung_, die der Nutzer bereits für genau diese Stelle editiert hat —
   eine dort getroffene Formulierung ist legitimer Teil der Arbeitsfassung und kein
   „erfundener Fakt“, der gegen den Basis-CV zu prüfen wäre. Der Basis-CV enthält
   ohnehin **kein** Anschreiben als Faktenkanon (nur das Kopie-`letter` ist die
   Arbeitsfassung des Briefs), daher wäre ein Basis-Grounding des Letters sachlich
   nicht schärfer. Es entsteht **kein** zweiter Anschreiben-Generator; der
   Magic-Pen-Knopf am Anschreiben ist derselbe Aufruf wie „Anschreiben generieren“.
   Die vier neuen Features (`penHeadline`, `penSummary`, `penExperienceBullets`,
   `penSkills`) decken nur die vier CV-Abschnitte ab, für die es noch keinen
   KI-Pfad gibt.

6. **Neue LLM-Features + Routen.** Vier neue `UsageFeature`s
   (`penHeadline`, `penSummary`, `penExperienceBullets`, `penSkills`) mit eigenen
   `MAX_TOKENS`-Einträgen, über den bestehenden `LlmFeatureRunner` (kein neuer
   Runner). Routen unter `/api/v1/job-applications/:id/pen/{section}` und
   `POST /pen/all`; jede trägt `@RequiresAi()` (503 `ai-not-configured` ohne Key)
   und `AiRateLimitGuard`; **kein** `VermittlungGuard`, **kein** `PlanGuard` (wie
   `applicationLetter`, Owner Q2).

7. **„Alles anpassen“ ist ein Fan-out.** Der Server stellt `POST /pen/all` bereit
   (eine Anfrage, `Promise.allSettled` über die Abschnitt-Services), der die
   Abschnitte parallel läuft und einen gesammelten Diff liefert. Die UI nutzt für
   die menschliche Anzeige den **clientseitigen** Parallel-Fan-out über die
   Abschnitt-Routen, weil nur so „Fortschritt pro Abschnitt“ und „abbrechbar“
   (AK-3.5) ohne Streaming ehrlich abbildbar sind. Beide Wege teilen dieselbe
   Service-Schicht — keine doppelte Logik.

8. **Das Vorher/Nachher-Diff wird im Browser gerendert, nicht im Server.** Der
   Server liefert nur die Rohwerte `before`/`after`; die Diff-Berechnung und
   -Darstellung ist reine UI-Sache und nutzt die etablierte, typisierte Bibliothek
   **`diff` (jsdiff, `^9`)** — BSD-3-Clause, eigene TypeScript-Typen, null
   Laufzeit-Dependencies, `browser`-Build. Sie wird von Vite in das Client-Bundle
   gebaut (kein Server-Import), daher Client- und Vitest-geprüft; kein
   handgerollter Diff und kein Server-Diff (Owner OQ4). Bei markierten
   Grounding-Verstößen **markiert** der Diff die Angabe (bestehendes
   `GroundingWarning`), **verwirft sie nicht**; Übernehmen erfordert eine bewusste
   Bestätigung (Owner OQ6).

9. **Entschiedene Detailfragen (Owner, verbindlich):** `experience` adressiert die
   Station über den **Array-Index** (kein `id`-Feld, kein Migrationsaufwand);
   `skills` darf ausschließlich **vorhandene** Skills **umsortieren/umformulieren**
   (keine Taxonomie-Synonyme); Fortschritt pro Abschnitt + Abbrechen laufen über den
   **clientseitigen Fan-out** (Punkt 7).

## Consequences

- Der Magic Pen bleibt ein reiner **Kopien-Editor**: kein Basis-Schreibpfad, die
  AK-2.3-Invariante (Basis-CV byte-gleich) gilt unverändert weiter und wird um einen
  Magic-Pen-Pfad ergänzt getestet.
- Grounding gegen den Basis-CV macht die Vertrauensaussage ehrlich: Eine frühere,
  bereits übernommene Erfindung wird beim **nächsten** Vorschlag erneut geflaggt,
  weil die Quelle der Kanon bleibt. Kosten: ein zusätzlicher `documentRepository`-
  Read pro Vorschlag (ein Datensatz, kein Join) und die Fall-back-Semantik bei
  gelöschtem Mandanten. Die **Asymmetrie** (Letter groundet gegen die Kopie) ist
  bewusst und wird durch einen eigenen Test belegt, damit sie nicht „aus Versehen“
  vereinheitlicht wird.
- Das Client-Bundle wächst um die kleine, gebündelte `diff`-Bibliothek
  (tree-shakebar über `./lib/*`-Exports); es entsteht **kein** Server-Diff und kein
  neuer Server-Endpunkt für die Darstellung.
- Die Verifier-Erweiterung (`year`/`degree`) ist additiv und ändert das bestehende
  `GroundingReport`-Shape nur um neue `ClaimKind`-Werte; bestehende Konsumenten
  (`GroundingWarning`) bleiben unverändert. False-Positive-Risiko wird über die
  nächtliche AK-3.3-Suite getunt, nicht über CI-Schwellen.
- Fünf neue KI-Routen (`pen/headline`, `pen/summary`, `pen/experience`,
  `pen/skills`, `pen/all`) erhöhen den Drift-Wächter (`route-inventory.ts`
  `AI_ROUTES`) von 13 auf **18** (K14–K18; der Anschreiben-Slot nutzt weiter das
  bestehende K13). Jeder Magic-Pen-Aufruf wird einzeln gemetered (AK-3.6);
  „Alles anpassen“ erzeugt **mehrere** Metering-Events (eines pro Abschnitt bzw.
  Station), nicht eines pro Anfrage.
- `tailorForMandate`/`TailoredApplication` bleiben eingefroren (Vermittler) und
  werden nicht angefasst; der Magic Pen dupliziert ihre Idee („auf eine Anzeige
  zuschneiden“) nicht, sondern ersetzt sie für den Hauptweg durch die abschnittsweise,
  grounded Variante.
- Die Abschnitt→Feld-Zuordnung (Punkt 1) ist eine explizite, revidierbare
  Semantik-Entscheidung; eine spätere Phase kann `experience`-Stabilität über einen
  `id`-Feld statt des Index nachrüsten, ohne die API-Form zu brechen.
