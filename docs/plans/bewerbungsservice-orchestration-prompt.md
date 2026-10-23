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
>   Liefere Befunde als Liste: `[Blocker|Major|Minor] Datei:Zeile — Problem — konkretes Fehlerszenario — Vorschlag`. Ohne Fehlerszenario kein Befund. Zum Schluss ein Urteil: **freigegeben** / **nicht freigegeben**.

Der Orchestrator prüft strittige Befunde selbst nach, bevor er sie an den
Implementer weitergibt. Ein Befund, den der Implementer für falsch hält, wird
nicht still ignoriert: Begründung an den Reviewer, und bei Uneinigkeit
entscheidet der Owner.

---

## 3. Phasen und Akzeptanzkriterien

### Phase 0 — Aufräumen & Fundament

- Workspace-Setting `vermittlung: boolean` (Standard `false`), persistiert in fs + sql.
  Wenn aus: Nav und Routen für Suchaufträge, Pipeline, Platzierungen,
  Performance, Postfach und CoRecruiter sind ausgeblendet. Die API-Routen
  liefern `404` oder `403` mit problem+json (Entscheidung im ADR).
- UI-Texte: Talent → Mandant, Mandat → Suchauftrag, Tenant → Workspace (alle Views, Toasts, Leerzustände, e2e-Erwartungen).
- KI: Key nur über Env (`ANTHROPIC_API_KEY`, optional `GEMINI_API_KEY`). Per-User-Key-UI und `API_KEY_STORE`-Nutzung für LLM entfernen.
  Ohne Key liefern alle KI-Routen einen klaren Fehler (`problem+json`, Typ `ai-not-configured`), und die UI zeigt „KI nicht eingerichtet“ statt Template-Text.
  Den `LlmFeatureRunner`-Fallback für nutzersichtbare Generierung entfernen; deterministische Logik, die keine Generierung ersetzt (Matching, Grounding), bleibt.
- ADR 0057 + Update von `docs/requirements.md` (neue FR für den Bewerbungs-Flow, NFR „kein stiller KI-Fallback“).
- **Akzeptanz:** Frischer Workspace zeigt nur Workspace, Mandanten, Stellen, Bewerbungen, Einstellungen. Ohne Key ist jeder KI-Button sichtbar deaktiviert oder meldet klar „KI nicht eingerichtet“.

### Phase 1 — Stellen

- Neue Entität **`JobPosting`** (UI: „Stelle“): `id, scope, source, sourceId?, url?, company, title, location, country, description (voller Text), requirements[], createdAt`. Port + fs- + sql-Adapter + Migration.
- „Stelle übernehmen“ aus der Portal-Suche. Fehlt der volle Text, wird er pro Quelle nachgeladen (Detail-Abruf). Wo das nicht geht, steht das sichtbar an der Stelle.
- „Stelle einfügen“: per **Text** (KI extrahiert die Felder) und per **URL** (Server lädt die Seite, **SSRF-geschützt**: nur http/https, keine privaten/link-local IPs, Größen- und Zeitlimit, Redirects begrenzt, dann Extraktion).
- Stellen-Liste mit Suche und Löschen, Detailansicht mit vollem Text.
- Duplikate (gleiche Quelle + sourceId oder gleiche URL) werden erkannt.
- **Akzeptanz:** Eine Stelle aus jeder Eintrittsart ist gespeichert, nach einem Reload noch da und zeigt den vollen Anzeigentext.

### Phase 2 — Bewerbung = Stelle × Mandant

- `Application` erweitern: `jobPostingId, talentId (Mandant), documents (eigene Kopie von CV + Anschreiben), status ∈ {draft, sent, interview, offer, rejected}`. Migration bestehender Bewerbungen dokumentieren.
- Flow: Stelle → „Bewerbung erstellen“ → Mandant wählen → Kopie anlegen → Bewerbungs-Editor öffnen.
- Anschreiben-Generierung nutzt den **vollen Anzeigentext** der Stelle, nicht die Skill-Tags.
- Der Bewerbungs-Editor ersetzt das ApplyModal (Editor-Komponenten wiederverwenden, kein drittes Editor-Paradigma).
- **Akzeptanz:** Zwei Bewerbungen desselben Mandanten auf zwei Stellen haben unabhängige Dokumente, und der Basis-CV bleibt nachweislich unverändert.

### Phase 3 — Magic Pen

- KI-Aktionen erweitern: `headline`, `summary`, `experience[i]` (Bullets), `skills` (Auswahl/Reihenfolge), `letter`. Jeweils auf die Bewerbungs-Kopie und mit dem Anzeigentext als Kontext.
- UI: Stift-Symbol an jedem Abschnitt → Vorschlag als Vorher/Nachher → Übernehmen / Verwerfen / Neu.
- „Alles für diese Stelle anpassen“: führt alle Abschnitte aus, zeigt einen gesammelten Diff, einzeln übernehmbar (`tailorForMandate` dafür auf `JobPosting` umbauen).
- Grounding-Check (ADR-0009) pro Vorschlag: Behauptungen ohne Beleg im Basis-CV werden markiert oder verworfen.
- **Akzeptanz:** Jeder Abschnitt ist einzeln anpassbar, nichts wird ohne Klick übernommen, und erfundene Fakten werden im Test erkannt.

### Phase 4 — Abschluss

- Mappe (PDF/ZIP) aus der **Bewerbungs-Kopie** inkl. ausgewählter Anhänge (vorhandenen ZIP-Export aus #239 wiederverwenden).
- Statuswechsel mit Zeitstempel, Bewerbungsübersicht pro Mandant und gesamt, filterbar nach Status.
- **Akzeptanz:** Die heruntergeladene Mappe enthält genau die angepasste Fassung, und der Status ist nach einem Reload erhalten.

### Phase 5 — Chat-Agent

- ADR (Tool-Use-Schleife, Streaming, Limits, Kosten).
- Serverseitige Claude-Tool-Use-Schleife. Werkzeuge = dünne Wrapper über die Services aus Phase 1–4: `search_jobs`, `save_job`, `list_mandanten`, `assess_fit`, `create_application`, `generate_letter`, `tailor_section`, `tailor_all`, `list_applications`.
- Ausschließlich Entwürfe. Kein Versand, kein Löschen. Max. Schritte und Tokens pro Lauf. Jeder Tool-Aufruf läuft unter dem Workspace-Scope des Nutzers.
- Chat-Panel mit Streaming, sichtbaren Tool-Schritten und Links auf erzeugte Entwürfe.
- Prompt-Injection: Anzeigentexte gelten als Daten, nicht als Anweisungen (Test dafür).
- **Akzeptanz:** „Such für <Mandant> X-Jobs in Y und bereite die 3 besten Bewerbungen vor“ erzeugt nachvollziehbar drei Entwürfe, die im UI identisch zu manuell erstellten sind.

### Phase 6 — Vorzeigbar

- e2e: goldener Pfad manuell und per Agent (LLM gemockt), Mobile-Smoke.
- Tote-Buttons-Audit: jeder sichtbare Button hat eine Wirkung oder ist deaktiviert mit Grund.
- Live-Instanz mit echtem Key, Demo-Workspace mit einem Demo-Mandanten (**synthetische** Daten).
- Datenschutz-Hinweis/Einwilligung für die Übermittlung von CV-Daten an den KI-Anbieter.
- **Akzeptanz:** Der goldene Pfad läuft live in unter 5 Minuten durch, ohne Fehler und ohne Konsole-Errors.

---

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

1. Reviewer-Urteil „freigegeben“ liegt vor, ohne offene Blocker/Major.
2. `git status` sauber, Diff manuell geprüft (§4).
3. Commit, Push, **Draft-PR** nach `.github/pull_request_template.md`, `Closes #<issue>`, manuelles Testprotokoll und Reviewer-Befunde (mit ihrem Status) in der Beschreibung.
4. PR-Aktivität abonnieren, CI auf grün fahren (bei roten Checks: diagnostizieren und fixen, nie Tests abschwächen), eine Check-in-Erinnerung setzen.
5. Dem Owner kurz melden: was erledigt ist, was offen bleibt, PR-Link. Gemerged wird erst nach seiner Freigabe, danach beginnt die nächste Phase.

**Abbruchkriterien → Owner fragen:** Uneinigkeit zwischen Reviewer und Implementer nach 3 Runden; eine Entscheidung, die §1 widerspricht; fehlende Zugangsdaten (KI-Key, Deployment); Scope-Bedarf außerhalb der Phase.

---

## 7. Start

Beginne mit **Phase 0**: Issue anlegen, dann den Implementer mit G1 beauftragen
(ADR 0057 + `docs/plans/phase-0-fundament.md`).
