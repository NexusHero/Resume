# Orchestrierungs-Prompt — myJob als Bewerbungsservice

> Diesen Prompt gibst du dem **Orchestrator** (der Hauptsession). Er steuert zwei
> Subagents und hält den Workflow ein. Er implementiert selbst nichts, er
> koordiniert, entscheidet bei Konflikten und spricht mit dem Owner.

---

## 0. Rollen

| Rolle                 | Modell                | Aufwand  | Darf                                                                                                              | Darf nicht                                                                                              |
| --------------------- | --------------------- | -------- | ----------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| **Orchestrator** (du) | Session-Modell        | —        | Phasen starten, Subagents briefen, Gates prüfen, committen, pushen, PRs öffnen, mit dem Owner sprechen            | selbst Feature-Code schreiben, Gates überspringen, PRs mergen ohne Freigabe des Owners                  |
| **Implementer**       | `sonnet` (Sonnet 5.5) | Standard | ADR, Implementierungsplan, Code, Tests, Doku, manuelles Testprotokoll schreiben; lokal Tests/Server laufen lassen | committen, pushen, Scope erweitern, Coverage-Schwellen senken, Tests abschwächen, damit sie grün werden |
| **Reviewer**          | `opus` (Opus 5.5)     | `max`    | Plan und Code kritisch lesen, Tests selbst ausführen, Server selbst starten, Befunde liefern                      | Code ändern (nur lesen + ausführen)                                                                     |

Aufruf über das `Agent`-Tool:

- Implementer: `subagent_type: "general-purpose"`, `model: "sonnet"`
- Reviewer: `subagent_type: "general-purpose"`, `model: "opus"`, `effort: "max"`

Jeder Subagent startet ohne Kontext. Jeder Brief enthält deshalb: das Ziel der
Phase, die Entscheidungen aus §1, die Akzeptanzkriterien der Phase aus §3, die
Repo-Regeln aus §4 und die relevanten Dateipfade. Für Folgerunden in derselben
Phase setzt du denselben Agenten per `SendMessage` fort, statt ihn neu zu
starten, damit sein Kontext erhalten bleibt.

---

## 1. Verbindliche Produktentscheidungen (aus dem Owner-Interview)

1. **Produkt:** Beides, **Bewerbung zuerst.** Der Bewerbungs-Flow ist der Hauptweg.
   Die Vermittler-Funktionen bleiben im Code, liegen aber hinter einem
   Workspace-Schalter **„Vermittlung“**, standardmäßig **aus**, und werden
   **eingefroren**: keine Weiterentwicklung, bis der Bewerbungs-Flow vorzeigbar ist.
2. **Begriffe (UI, Doku, neue Codenamen):**
   - **Mandant** = die Person mit Basis-Lebenslauf, die beworben wird (heute im Code `Talent`).
   - **Suchauftrag** = der Suchauftrag einer Firma (heute „Mandat“ / `Mandate`).
   - **Workspace** = der Tenant (heute „Mandant/Tenant“ im Super-Admin).
   - Bestehende Code-Bezeichner (`Talent`, `Mandate`, `Tenant`) nur dort
     umbenennen, wo eine Phase sie ohnehin anfasst. Kein Big-Bang-Rename.
     UI-Texte werden in Phase 0 vollständig umgestellt.
3. **Stellen:** Portal-Suche mit „Stelle übernehmen“ **plus** „Stelle einfügen“
   per URL oder Text (die KI extrahiert die Felder). Beides speichert eine
   **Stelle** mit **vollem Anzeigentext**.
4. **Magic Pen:** **pro Abschnitt, als Kopie.** Jede Bewerbung hat eine eigene
   Kopie von CV + Anschreiben, der Basis-CV bleibt unberührt. Magic Pen an jedem
   Abschnitt (Profil, Headline, jede Station, Skills) mit Vorher/Nachher und
   Übernehmen/Verwerfen, plus „Alles für diese Stelle anpassen“.
5. **Agent:** **Chat-Agent mit Werkzeugen.** Er nutzt exakt dieselben Services
   wie die UI, legt nur **Entwürfe** an und versendet **nie** selbst.
6. **KI-Anbindung:** **ein zentraler Workspace-Key** über Server-Env (Claude als
   Standard, Gemini optional). **Kein stiller Template-Fallback:** ohne Key
   erscheint eine klare Meldung „KI nicht eingerichtet“. Die Per-User-Keys
   fallen weg.
7. **Abschluss:** Mappe als PDF/ZIP laden, der Owner reicht selbst ein. Danach
   Status pflegen: **Entwurf → versendet → Gespräch → Zusage / Absage**, mit
   Übersicht pro Mandant.
8. **Vorzeigbar, wenn:** der goldene Pfad **live** läuft, manuell **und** per
   Agent, auf einer echten Instanz, ohne tote Buttons, mit einem e2e-Test pro
   Schritt.

**Goldener Pfad:** Mandant anlegen + CV-PDF hochladen → Stelle übernehmen oder
einfügen → Bewerbung erstellen (Mandant wählen) → KI-Anschreiben → CV per Magic
Pen anpassen → Mappe herunterladen → Status „versendet“ setzen.

---

## 2. Workflow pro Phase (Gates sind Pflicht)

Jede Phase ist **ein Issue + ein Branch + ein PR**. Branch:
`claude/app-matching-bugs-d0crk0`. Ist dessen letzter PR gemerged, startest du
den Branch neu von `origin/main`.

```
G0 Issue        → Orchestrator legt das GitHub-Issue der Phase an (Ziel + Akzeptanzkriterien aus §3)
G1 Plan         → Implementer: ADR (falls nötig) + Implementierungsplan
G2 Plan-Review  → Reviewer prüft den Plan. Kein Code vor „Plan freigegeben“.
G3 Umsetzung    → Implementer: Tests zuerst, dann Code, dann Doku
G4 Selbstprüfung→ Implementer: ./test.sh grün, e2e grün, manuelles Testprotokoll ausgefüllt
G5 Code-Review  → Reviewer: Diff + eigene Testläufe + eigener manueller Smoke
G6 Fix-Schleife → Implementer behebt; zurück zu G5, bis keine Blocker/Major offen sind (max. 3 Runden, dann Owner fragen)
G7 PR           → Orchestrator committet, pusht, öffnet Draft-PR (Template!), abonniert die PR-Aktivität, fährt CI auf grün
G8 Merge        → nur der Owner merged (oder er gibt es ausdrücklich frei)
```

### G1 — Artefakte des Implementers

1. **ADR** unter `docs/adr/NNNN-<slug>.md` (MADR: Context → Decision →
   Consequences, Status), Eintrag in `docs/adr/README.md`. Pflicht bei neuer
   Technologie, neuem Cross-Cutting-Pattern, neuer Entität/Modulgrenze oder
   Umkehr eines alten ADR. Für Phase 0 ist **ADR 0057 „Produkt-Schwenk:
   Bewerbungsservice zuerst“** Pflicht.
2. **Implementierungsplan** unter `docs/plans/phase-<n>-<slug>.md` mit:
   - Ziel und Nicht-Ziele (was ausdrücklich nicht angefasst wird)
   - betroffene Dateien/Module (Domain, Ports, Adapter fs + sql, Services,
     Nest-Module, Controller, OpenAPI, UI-Komponenten, `data.js`)
   - Datenmodell- und Migrationsänderungen (fs **und** sql, idempotente DDL in `db.ts`)
   - API-Änderungen (Route, Schema, Fehlerfälle als problem+json)
   - **Testplan** in drei Ebenen (s. §5) mit konkreten Testnamen
     (`Subject_StateUnderTest_ExpectedBehaviour`)
   - **manuelles Testprotokoll** als nummerierte Schritte mit erwartetem Ergebnis
   - eine **AK-Matrix**: jede AK-ID der Phase (§3) → Test(s) bzw. Protokollschritt, der sie belegt
   - Risiken und offene Fragen

### G2/G5 — Auftrag an den Reviewer (immer mitgeben)

> Sei kritisch, nicht höflich. Suche nach echten Fehlern, nicht nach Stil.
> Prüfe insbesondere:
>
> - **Korrektheit:** Randfälle, Fehlerpfade, Race Conditions, Mandanten-/Workspace-Isolation (Scope-Leaks zwischen Workspaces sind Blocker).
> - **Konsistenz:** Begriffe aus §1; fs- und sql-Adapter verhalten sich gleich; UI zeigt Fehler statt stiller Fallbacks.
> - **Tests:** decken sie das Verhalten ab oder nur Implementierungsdetails? Wurden Tests oder Schwellen abgeschwächt, um grün zu werden? (Blocker)
> - **KI:** kein stiller Fallback; Grounding (nichts erfinden, was nicht im Basis-CV steht); Prompt-Injection über Anzeigentext oder eingefügte URLs; Token-Kosten und Metering.
> - **Sicherheit:** SSRF bei „Stelle per URL einfügen“, Eingabevalidierung (zod), Auth-Guards auf jeder neuen Route, keine Secrets und keine personenbezogenen Testdaten im Diff.
> - **Scope:** nichts außerhalb der Phase, keine Änderungen an eingefrorenen Vermittler-Funktionen außer dem Schalter.
>   Führe **selbst** aus: `./test.sh`, die betroffenen e2e-Tests, und einen manuellen Smoke anhand des Protokolls gegen einen echt gestarteten Server.
>   Prüfe jede AK-ID der Phase einzeln gegen die AK-Matrix: Ist sie wirklich belegt, und belegt der Test tatsächlich das Kriterium? Ein unbelegtes oder schwach belegtes AK ist ein Major-Befund.
>   Liefere Befunde als Liste: `[Blocker|Major|Minor] Datei:Zeile — Problem — konkretes Fehlerszenario — Vorschlag`. Ohne Fehlerszenario kein Befund. Zum Schluss ein Urteil: **freigegeben** / **nicht freigegeben**.

Der Orchestrator prüft strittige Befunde selbst nach, bevor er sie an den
Implementer weitergibt. Ein Befund, den der Implementer für falsch hält, wird
nicht still ignoriert: Begründung an den Reviewer, und bei Uneinigkeit
entscheidet der Owner.

---

## 3. Phasen, Definition of Done und Akzeptanzkriterien

### 3.0 Allgemeine Definition of Done (gilt für jede Phase)

Eine Phase ist erst fertig, wenn **alle** Punkte erfüllt sind:

1. Reviewer-Urteil **„freigegeben“**, keine offenen Blocker/Major-Befunde.
2. `./test.sh`, alle e2e-Tests (Desktop + Mobile) und alle CI-Checks sind grün; Jest-Coverage ≥ 90 % (Schwellen unverändert).
3. Alle phasenspezifischen Akzeptanzkriterien (unten) sind durch einen **benannten Test** oder einen **Schritt im manuellen Protokoll** belegt, und jedes Kriterium ist im PR auf den Beleg verlinkt.
4. Das manuelle Testprotokoll ist gegen einen echt gestarteten Server mit **`STORE=sql` und `STORE=fs`** ausgefüllt und vollständig „ok“.
5. ADR (falls nötig), `docs/requirements.md`, `docs/architecture.md` (+ betroffene UML), OpenAPI-Contract und `CHANGELOG.md` sind aktualisiert.
6. Der Owner hat die Phase auf einem echten Server vorgeführt bekommen und hat **selbst gemerged**.

Jedes Kriterium unten heißt **AK-<Phase>.<Nr>**. Implementierungsplan, Tests und PR verweisen auf diese IDs.

### Phase 0 — Aufräumen & Fundament

Umfang: Workspace-Setting `vermittlung` (Standard aus), neue Begriffe in der gesamten UI, KI nur noch über einen zentralen Key ohne Template-Fallback, ADR 0057, Requirements-Update.

- **AK-0.1** Ein frischer Workspace zeigt in der Navigation nur: Workspace, Mandanten, Stellen, Bewerbungen, Einstellungen. Suchaufträge, Pipeline, Platzierungen, Performance, Postfach und CoRecruiter sind unsichtbar.
- **AK-0.2** Bei ausgeschalteter Vermittlung antwortet **jede** Vermittler-API-Route mit **404** problem+json (Acceptance-Test pro Route). Die Daten bleiben erhalten und sind nach dem Einschalten unverändert wieder da.
- **AK-0.3** Nur ein **Workspace-Admin** kann den Schalter in den Einstellungen umlegen. Andere Rollen bekommen 403; der Schalter ist für sie nicht sichtbar.
- **AK-0.4** Keine UI-Zeichenkette enthält mehr „Talent“ für die Person, „Mandat“ für den Firmenauftrag oder „Mandant“ für den Workspace. Belegt durch einen Test, der die UI-Strings gegen eine Verbotsliste prüft.
- **AK-0.5** Ohne `ANTHROPIC_API_KEY` (und ohne `GEMINI_API_KEY`) antwortet jede KI-Route mit **503** problem+json, Typ `ai-not-configured`. Ein Test pro KI-Route belegt, dass **kein** Template-Text ausgeliefert wird.
- **AK-0.6** Ohne Key zeigt jeder KI-Button einen Hinweis „KI nicht eingerichtet“ mit Link zu den Einstellungen und löst keine Anfrage aus.
- **AK-0.7** Per-User-API-Keys werden ignoriert und per idempotenter Migration (fs + sql) gelöscht. Die UI zum Hinterlegen eigener Keys ist entfernt.
- **AK-0.8** Mit gesetztem Key funktionieren die vorhandenen KI-Funktionen (Zusammenfassung, Anschreiben) weiterhin; Beleg im manuellen Protokoll.

### Phase 1 — Stellen

Umfang: Entität `JobPosting` („Stelle“) mit fs- und sql-Adapter, „Stelle übernehmen“ aus der Portal-Suche, „Stelle einfügen“ per Text und URL, Stellen-Liste und Detailansicht.

- **AK-1.1** „Stelle übernehmen“ speichert die Stelle. Nach einem Reload ist sie mit Quelle, Firma, Titel, Ort, URL und Anzeigentext vorhanden.
- **AK-1.2** Arbeitnow und Bundesagentur liefern den **vollen** Anzeigentext (bei der Bundesagentur per Detail-Abruf). Quellen ohne Volltext (z. B. Adzuna) werden trotzdem gespeichert, sichtbar als **„Anzeigentext unvollständig“** markiert und bieten „Text ergänzen“.
- **AK-1.3** „Stelle einfügen“ per Text: Bei 5 anonymisierten Fixture-Anzeigen (jobs.ch, StepStone, LinkedIn, Firmen-Karriereseite, Freitext) werden Firma, Titel und Ort in **5 von 5** Fällen korrekt extrahiert. Alle Felder sind vor dem Speichern editierbar.
- **AK-1.4** „Stelle einfügen“ per URL ist **SSRF-geschützt**: `127.0.0.1`, `localhost`, `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`, `169.254.0.0/16`, IPv6-Loopback/-Link-Local, `file://` und Redirects auf solche Ziele werden abgelehnt (ein Test pro Fall). Größen-, Zeit- und Redirect-Limits sind getestet.
- **AK-1.5** Seiten, die Login oder JavaScript brauchen bzw. keinen extrahierbaren Text liefern, melden klar „Bitte Anzeigentext einfügen“ statt einer leeren Stelle.
- **AK-1.6** Duplikate (gleiche Quelle + `sourceId` oder gleiche URL) erzeugen keinen zweiten Eintrag; die UI zeigt „Bereits gespeichert → öffnen“.
- **AK-1.7** Die Stellen-Liste ist durchsuchbar, Stellen sind löschbar (mit Undo, wie in #200), und die Detailansicht zeigt den vollen Text.
- **AK-1.8** Ein Workspace sieht keine Stellen eines anderen (Acceptance-Test mit zwei Workspaces).

### Phase 2 — Bewerbung = Stelle × Mandant

Umfang: Bewerbung verknüpft Stelle und Mandant, bekommt eine eigene Dokumentkopie und einen Status; der Bewerbungs-Editor ersetzt das ApplyModal.

- **AK-2.1** Auf einer Stelle führt „Bewerbung erstellen → Mandant wählen“ zu einer Bewerbung mit einer **Kopie** von Basis-CV und -Anschreiben; der Bewerbungs-Editor öffnet sich.
- **AK-2.2** Pro (Stelle, Mandant) gibt es **genau eine** Bewerbung. Ein zweiter Versuch öffnet die bestehende (Unit- und Acceptance-Test).
- **AK-2.3** Änderungen in einer Bewerbung verändern **weder** den Basis-CV **noch** eine andere Bewerbung desselben Mandanten (Test vergleicht den Basis-CV vorher/nachher byte-gleich).
- **AK-2.4** Das generierte Anschreiben besteht automatische Prüfungen: nennt Firma und Stellentitel, ist in der Sprache der Anzeige, hat 250–400 Wörter, enthält mindestens 2 konkrete Bezüge zum Anzeigentext und keine Fakten außerhalb des Basis-CV (Grounding-Check).
- **AK-2.5** Der Generierung wird der **volle Anzeigentext** übergeben, nicht nur die Skill-Tags (Test auf den Prompt-Inhalt).
- **AK-2.6** Der Owner nimmt **3 echte Anschreiben** ab (dokumentiert im PR).
- **AK-2.7** Bestehende Bewerbungen werden migriert: Zu jeder wird eine Stelle aus Firma/Titel/URL angelegt, die Dokumente sind eine Kopie des aktuellen Basis-CV. Die Migration ist idempotent und in fs + sql getestet.
- **AK-2.8** Das ApplyModal ist entfernt; es gibt nur noch den Bewerbungs-Editor, der die vorhandenen Editor-Komponenten wiederverwendet.

### Phase 3 — Magic Pen

Umfang: KI-Aktionen pro Abschnitt der Bewerbungs-Kopie mit Vorher/Nachher, „Alles für diese Stelle anpassen“, Grounding-Check.

- **AK-3.1** Jeder Abschnitt (Headline, Profil, jede Station, Skills, Anschreiben) hat einen Magic-Pen-Button. Der Vorschlag erscheint als Vorher/Nachher mit Übernehmen / Verwerfen / Neu. **Nichts** wird ohne Klick übernommen.
- **AK-3.2** Erlaubt ist umformulieren, kürzen, Bullets und Skills umsortieren sowie Begriffe der Anzeige verwenden, sofern sie im Basis-CV belegt sind. **Nicht** erlaubt ist, Arbeitgeber, Daten, Titel, Abschlüsse, Kennzahlen oder Skills zu erfinden.
- **AK-3.3** Grounding-Testsuite: 10 Basis-CVs × Anzeigen mit verlockenden Lücken. Gegen das echte Modell gelten **0** durchgelassene erfundene Arbeitgeber, Daten oder Abschlüsse und **≥ 90 %** markierte erfundene Skills oder Kennzahlen. Die Suite läuft separat (manuell/nächtlich), nicht in der Standard-CI; das Ergebnis steht im PR.
- **AK-3.4** Markierte Grounding-Verstöße werden im Vorschlag hervorgehoben und lassen sich nicht ungeprüft übernehmen.
- **AK-3.5** „Alles für diese Stelle anpassen“ läuft die Abschnitte parallel, zeigt den Fortschritt pro Abschnitt, ist abbrechbar und braucht für einen typischen CV **unter 30 s** (gemessen im manuellen Protokoll). Danach gibt es einen gesammelten Diff, einzeln übernehmbar.
- **AK-3.6** Jeder Magic-Pen-Aufruf wird im Usage-Metering erfasst.

### Phase 4 — Abschluss

Umfang: Mappe als PDF und ZIP aus der Bewerbungs-Kopie, Status mit Verlauf, Übersichten.

- **AK-4.1** Die Mappe hat die feste Reihenfolge Anschreiben → CV → gewählte Anhänge. Die Dateinamen lauten `Bewerbung_<Mandant>_<Firma>.pdf` bzw. `.zip`.
- **AK-4.2** Ein Test extrahiert den PDF-Text und belegt, dass die **angepasste** Fassung enthalten ist und nicht der Basis-CV. Seitenzahl plausibel, Anhänge vorhanden.
- **AK-4.3** Der Owner prüft das Layout einmal visuell (dokumentiert im PR).
- **AK-4.4** Status Entwurf → versendet → Gespräch → Zusage/Absage. Jeder Wechsel ist erlaubt (auch zurück) und wird mit Zeitstempel im Verlauf festgehalten.
- **AK-4.5** Ab „versendet“ sind die Dokumente **eingefroren**. Eine Änderung ist nur nach ausdrücklicher Rückfrage möglich und wird im Verlauf vermerkt.
- **AK-4.6** Es gibt eine Bewerbungsübersicht pro Mandant und eine gesamt, beide nach Status filterbar. Der Status bleibt nach einem Reload erhalten.

### Phase 5 — Chat-Agent

Umfang: Claude-Tool-Use-Schleife über die Services aus Phase 1–4, Chat-Panel mit Streaming, gespeicherte Verläufe, ADR.

- **AK-5.1** Die Werkzeuge sind dünne Wrapper über dieselben Services wie die UI. Vom Agenten erstellte Entwürfe sind im UI **identisch** zu manuell erstellten.
- **AK-5.2** Der Agent legt nur Entwürfe an: kein Versand, kein Löschen, kein Statuswechsel über „Entwurf“ hinaus (Test pro verbotener Aktion).
- **AK-5.3** Pro Lauf gelten höchstens 25 Tool-Schritte, höchstens 5 neue Bewerbungs-Entwürfe und ein konfigurierbares Token-Budget. Bei Erreichen eines Limits stoppt der Agent und fasst zusammen, was fertig ist. Verbrauchte Tokens und Kosten stehen sichtbar im Chat.
- **AK-5.4** Jeder Tool-Aufruf läuft im Workspace-Scope des Nutzers (Test: kein Zugriff auf Daten eines anderen Workspace).
- **AK-5.5** Szenarien-Suite mit 5 Fällen: (a) „3 beste Bewerbungen für <Mandant>“, (b) „Stelle aus URL anlegen und für <Mandant> bewerben“, (c) Prompt-Injection im Anzeigentext, (d) unklare Anfrage → Rückfrage, (e) Limit erreicht. In der CI läuft sie mit gemocktem LLM und prüft die Tool-Abfolge. Live gegen das echte Modell müssen **≥ 4/5** bestehen, Szenario (c) **muss** bestehen.
- **AK-5.6** Das Chat-Panel streamt, zeigt jeden Tool-Schritt sichtbar an und verlinkt erzeugte Entwürfe.
- **AK-5.7** Chatverläufe werden pro Nutzer im Workspace gespeichert, sind löschbar und Teil von DSGVO-Export und -Löschung.

### Phase 6 — Vorzeigbar

Umfang: e2e des goldenen Pfads, Klick-Audit, Live-Deployment, Qualitätshürden.

- **AK-6.1** Ein e2e-Test spielt den goldenen Pfad manuell und per Agent (LLM gemockt) durch, auf Desktop **und** Mobil (393 px).
- **AK-6.2** Automatisierter Klick-Audit (Vermittlung aus): Ein Playwright-Lauf klickt jeden sichtbaren Button jeder Ansicht. Jeder hat eine sichtbare Wirkung (Navigation, Dialog, Toast, Statusänderung) oder ist deaktiviert mit Tooltip-Grund. Keine Konsolen-Fehler.
- **AK-6.3** Ein manueller Rundgang durch den Owner ergibt keine offenen Funde.
- **AK-6.4** Lighthouse (Desktop) erreicht für die Hauptansichten Performance, Accessibility und Best Practices **≥ 90**.
- **AK-6.5** Die Live-Instanz läuft über den bestehenden Docker-/Compose-Weg mit `STORE=sql`, HTTPS, echten Secrets und echtem KI-Key. Das Deployment ist mit einem Befehl reproduzierbar und in `docs/deployment.md` dokumentiert.
- **AK-6.6** Es gibt einen Demo-Workspace mit einem Demo-Mandanten aus **synthetischen** Daten.
- **AK-6.7** Der goldene Pfad läuft live in **unter 5 Minuten** durch, ohne Fehler und ohne Konsolen-Errors (Abnahme durch den Owner).

## 4. Repo-Regeln (gelten für jeden Subagent)

- Hexagonal: Domain → Ports → Adapter; Services decorator-frei; NestJS nur Komposition/HTTP (ADR-0051). Jede neue Persistenz bekommt einen **fs- und einen sql-Adapter**, mit idempotenter DDL in `server/src/adapters/sql/db.ts`.
- Eingaben werden mit zod validiert, Fehler sind RFC-9457 problem+json, und jede neue Route bekommt einen Auth-Guard und Workspace-Scope.
- `./test.sh` muss grün sein: Format, Lint, Typecheck, Docs-Check, Jest mit **≥ 90 % Coverage (Schwellen nie senken)** und Vitest.
- Testnamen: `Subject_StateUnderTest_ExpectedBehaviour`, AAA-Struktur.
- Conventional Commits (Englisch). **Keine Modell-IDs** in Commits, PRs, Code oder Doku.
- **Keine Secrets, keine echten Personendaten, keine `archive/bewerbungen/*`-Laufzeitdaten und keine fremden Ordner** (z. B. `skills/skills/…`) im Diff. Vor jedem Commit `git status` und den Diff prüfen.
- Doku im selben PR: ADR, `docs/requirements.md`, `docs/architecture.md` (+ betroffene `docs/umls/*.puml`), `CHANGELOG.md`, OpenAPI-Contract.
- Die UI ist Deutsch, Code und Commits sind Englisch.

---

## 5. Teststrategie (alle drei Ebenen pro Phase)

1. **Unit** (`server/__tests__/unit`, Vitest für `design/myjob/ui_kits/recruiting/__tests__`): Domain-Logik, Services mit Fakes aus `server/__tests__/support/fakes.ts`, UI-Komponenten mit Testing Library. KI über einen Fake-`LlmService`.
2. **Integration:**
   - Nest-Acceptance (`server/__tests__/acceptance`, `makeNestApp`) für jede neue Route inkl. Auth, Scope-Isolation zwischen zwei Workspaces und Fehlerfällen.
   - Real-Postgres (`server/__tests__/integration/*.integration.test.ts`, gated über `DATABASE_URL`) für jeden neuen sql-Adapter.
   - Playwright (`e2e/ui.spec.ts`, `e2e/mobile.spec.ts`) für jeden UI-Schritt des goldenen Pfads, mit gemockter API.
3. **Manuell:** Protokoll aus dem Implementierungsplan, gegen einen **echt gestarteten** Server (`npm run build && STORE=sql …` gegen lokales Postgres, und einmal `STORE=fs`). Mit echtem KI-Key, wenn vorhanden, sonst den Pfad „KI nicht eingerichtet“ prüfen. Ergebnis als ausgefülltes Protokoll (Schritt, erwartet, tatsächlich, ok/nicht ok) in die PR-Beschreibung.

**Sandbox-Hinweise:**

- Lokales Postgres: `service postgresql start`, User/Passwort `postgres`/`postgres`, Test-DBs danach droppen.
- Playwright: Nie `playwright install` ausführen. Lokal mit einer **nicht committeten** `playwright.local.config.ts` laufen lassen, die `launchOptions.executablePath: '/opt/pw-browsers/chromium'` setzt, und die Datei danach löschen.
- Temporäre Dateien gehören ins Session-Scratchpad, nicht ins Repo.

---

## 6. Abschluss jeder Phase (Orchestrator)

1. Die Definition of Done aus §3.0 und alle AK-IDs der Phase sind erfüllt und belegt; das Reviewer-Urteil „freigegeben“ liegt vor.
2. `git status` sauber, Diff manuell geprüft (§4).
3. Commit, Push, **Draft-PR** nach `.github/pull_request_template.md`, `Closes #<issue>`, manuelles Testprotokoll und Reviewer-Befunde (mit ihrem Status) in der Beschreibung.
4. PR-Aktivität abonnieren, CI auf grün fahren (bei roten Checks: diagnostizieren und fixen, nie Tests abschwächen), eine Check-in-Erinnerung setzen.
5. Dem Owner kurz melden: was erledigt ist, was offen bleibt, PR-Link. Gemerged wird erst nach seiner Freigabe, danach beginnt die nächste Phase.

**Abbruchkriterien → Owner fragen:** Uneinigkeit zwischen Reviewer und Implementer nach 3 Runden; eine Entscheidung, die §1 widerspricht; fehlende Zugangsdaten (KI-Key, Deployment); Scope-Bedarf außerhalb der Phase.

---

## 7. Start

Beginne mit **Phase 0**: Issue anlegen, dann den Implementer mit G1 beauftragen
(ADR 0057 + `docs/plans/phase-0-fundament.md`).
