# Phase 7 — English-only: UI komplett auf Englisch (Implementierungsplan)

Issue [#333](https://github.com/NexusHero/Resume/issues/333) · Branch wird vom Orchestrator neu von `origin/main` gestartet · Entscheidungsbasis: Owner-Entscheidungen 1–8 im Issue (verbindlich) **+ Owner-Entscheidungen OQ1–OQ5 (§7, jetzt beantwortet)** · Anknüpfung: [ADR-0057](../adr/0057-produkt-schwenk-bewerbungsservice.md) §Decision 3 (Begriffskarte) und §Decision 5 (AI-Key/„Text übernehmen"), [ADR-0063](../adr/0063-ki-einwilligung-consent-gate.md) (deutscher Consent-Text), **neues [ADR-0064](../adr/0064-english-only.md)** (§3.8).

Stand: Plan (G1, **Revision R1**). Es gibt noch keinen Code und keine Commits. Alle Pfade sind relativ zur Repo-Wurzel; `UI/` steht für `design/myjob/ui_kits/recruiting/`.

---

## Revisionsvermerk R1

Überarbeitet auf Basis des G2-Doppel-Reviews (1 Major + 5 Minors), des G5-Doppel-Reviews (4 Majors + 6 Minors) und der Owner-Entscheidungen OQ1–OQ5. Kein Code, keine Commits — nur diese Plan-Datei.

| Quelle | Auflage | Änderung im Plan                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| ------ | ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| OQ     | 1       | Tenant-„Mandant" (Super-Admin) → **Workspace**; Scanner-Ausnahme `WORKSPACE_MANDANT` **entfällt** („Mandant" wandert in `GLOBAL`). §2, §3.1, §5.                                                                                                                                                                                                                                                                                                                |
| OQ     | 2       | CV-Sektions-Heads in `documents-html.ts` → **parametrisieren** (EN/DE via `detectLanguage`). §3.3, Etappe 2.                                                                                                                                                                                                                                                                                                                                                    |
| OQ     | 3       | Agent-Texte (`chat-agent.ts summarizeRun`, `agent-fake-provider.ts`) → **fest englisch**; erzeugte Artefakte folgen weiter der Anzeigensprache. §3.2, Etappe 1+6.                                                                                                                                                                                                                                                                                               |
| OQ     | 4       | Demo-Seed-Namen → **englisch klingend** (`Max Mustermann`/`Beispiel GmbH`/`Musterstadt` umstellen). §3.5, §3.7, Etappe 5.                                                                                                                                                                                                                                                                                                                                       |
| OQ     | 5       | Agency-/Vermittler-Ansichten (frozen) → **jetzt mit-übersetzen**; Scanner/Allowlist/Testumfang entsprechend erweitert. §3.1, §3.6, Etappe 3.                                                                                                                                                                                                                                                                                                                    |
| G2     | M1      | Gate-Logik-Widerspruch gelöst (Variante **b** gewählt): Etappe 0 ist ein **bekannter roter Canary** mit angepasster Gate-Regel; §11 korrigiert — e2e ist **nicht** Teil von `test.sh` (läuft via `test:e2e`). §4/Etappe 0, §11.                                                                                                                                                                                                                                 |
| G2     | m1      | dossier-service-`NotFoundError` korrigiert: `${attachmentId}` (nicht `${id}`), Datei `job-application-dossier-service.ts:112`; beide Dateien (auch `job-application-service.ts:198`) tragen denselben String. §3.2.                                                                                                                                                                                                                                             |
| G2     | m2      | `workspace-settings.test.ts:56` (`toContain('AI-Verarbeitung')`) + `problem.test.ts:183` in die Jest-Liste aufgenommen. §3.6.                                                                                                                                                                                                                                                                                                                                   |
| G2     | m3      | e2e-Inventur um `getByPlaceholder` ergänzt (z. B. `'CV-Text hier einfügen…'`, `'you@example.com'`, `'••••••••'`). §3.6.                                                                                                                                                                                                                                                                                                                                         |
| G2     | m4      | e2e-Mock-Namen korrigiert: real `Tobias Wirth`, `Nordwind Logistik AG`, `Helio GmbH`, `Hamburg`/`Hamburg · Remote`; „Max Mustermann" nur in Capture-Script + demo-seed. §3.6, §3.7.                                                                                                                                                                                                                                                                             |
| G2     | m5      | Risiko 6 ergänzt: Umlaut-Catch-all → Allowlist-Pflegeaufwand, jeder Eintrag mit PR-Begründung. §6.                                                                                                                                                                                                                                                                                                                                                              |
| G5     | M1      | §6 Risk-3-Prämisse korrigiert: Consent-/Freeze-Erkennung läuft clientseitig über `type`/`code` (data.js:84/157, BewerbungsEditor.jsx:326), **nicht** über den Detail-String; einziger echter String-Match ist `data.js:104` `includes('not enabled for this workspace')`. AI/KI-Divergenz benannt (errors.ts:142 + workspace-settings.ts:42 „AI-", data.js:148 „KI-") → **ein** kanonischer englischer Zielstring. Dedup-Test als Hygiene deklariert. §3.2, §6. |
| G5     | M2      | §3.6-Jest-Inventar auf verifizierte Menge umgeschrieben (6 Dateien + `legacy-application-migration.test.ts` „prüfen", nur Kommentar Z. 217). §3.6.                                                                                                                                                                                                                                                                                                              |
| G5     | M3      | identisch G2 m1 (dossier-service `NotFoundError`). §3.2.                                                                                                                                                                                                                                                                                                                                                                                                        |
| G5     | M4      | Harte Abhängigkeit deklariert (Variante **Abhängigkeit** gewählt, keine Co-Merge): Etappe 3 blockt auf Etappe 1; **keine** Feature-Flags. §4/Etappe 3, §11.                                                                                                                                                                                                                                                                                                     |
| G5     | m1      | `styles.css`-Pfad korrigiert: `design/myjob/styles.css` (nicht im Kit), keine `content:`-Strings — Prüfeintrag auf richtigen Ort gesetzt. §3.1, §5.                                                                                                                                                                                                                                                                                                             |
| G5     | m2      | Client-Defaults `Editor.jsx:77` (`anrede`/`gruss`) zusätzlich zu Server `emptyLetter` (talent-documents.ts `anrede`/`gruss`) übersetzen; Verknüpfung §3.1↔§3.3 explizit. §3.3.                                                                                                                                                                                                                                                                                  |
| G5     | m3      | Screenshot-Re-Capture (Etappe 6) blockt explizit auf OQ-3-Resolution (Fake-Agent-Antwort `agent-fake-provider.ts:54` muss englisch sein). §3.7, Etappe 6.                                                                                                                                                                                                                                                                                                       |
| G5     | m4      | Zahlen als „circa" gekennzeichnet bzw. neu abgeleitet (e2e `getBy*` ≈ 279, davon ≈ 100–110 deutsch; Jest 155 Testdateien; 6 Dateien mit deutschen problem+json-Strings; Vitest 51 Dateien/591 `expect`, 22 Dateien mit Umlauten). §3.6.                                                                                                                                                                                                                         |
| G5     | m5      | ADR-Frage entschieden: **neues ADR 0064** (kein Addendum zu 0057); festgehalten, dass `docs:check` **keine** Sprachprüfung bietet → AK-7.8 manuell. §3.8, §9.                                                                                                                                                                                                                                                                                                   |
| G5     | m6      | Pfade korrigiert: `agent-fake-provider.ts` = `server/src/adapters/`, `chat-agent.ts` + `documents-html.ts` = `server/src/domain/`. Heads Z. 127–130/286/325–327; `chat-agent.ts:122/127` + `agent-fake-provider.ts:54` deutsch. §3.2, §3.3.                                                                                                                                                                                                                     |

---

## 1. Ziel und Nicht-Ziele

### 1.1 Ziel

Die App-Oberfläche wird **vollständig englisch** — ohne i18n-Bibliothek, ohne
Locale-Switch, ohne `locale`-Feld. Die Übersetzung **ist** die Änderung: direkte
Umschreibung aller deutschen UI-Texte. Der bestehende Terminology-Scanner
(`UI/__tests__/terminology.test.js`, heute Teil von `test:web` und damit von
`./test.sh`) wird zum **Anti-Regressions-Guard** geschärft, sodass **kein**
deutsches UI-Fragment zurückkommt, ohne den Test rot zu machen.

Konkret (1:1 zu den 8 Owner-Entscheidungen im Issue, plus die 5 nachgelagerten
Owner-Entscheidungen OQ1–OQ5 aus §7):

1. **Kein Mischmasch** — alle UI-Texte englisch; Scanner-Guard gegen deutsche UI-Reste.
2. **Begriffskarte** — Candidate / Mandate / Job posting / Application / Agency / Workspace.
3. **Keine i18n-Infrastruktur** — kein `locale`-Feld, keine Kataloge, keine Dependency.
4. **Server-Fehlerdetails (problem+json) englisch** — insbesondere `AI_CONSENT_REQUIRED_DETAIL`.
5. **Dokument-Default `en`** — `detectLanguage`-Fallbacks und Brief-Defaults, Inhalt bleibt per-Anzeige.
6. **Mails englisch** — prüfen/vereinheitlichen (Verifikation + Passwort-Reset).
7. **README + Screenshots** — Galerie neu erzeugen, README-Texte englisch.
8. **Interne Doku** — neue Doku englisch, bestehende deutsche ADRs bleiben (Begründung §8).

Zusätzlich, aus den Owner-Entscheidungen OQ1–OQ5 (verbindlich, §7):

- **OQ1** — Tenant-„Mandant" (Super-Admin-Konsole) → **Workspace** (nicht „Tenant"/„Organization"); Scanner-Ausnahme `WORKSPACE_MANDANT` entfällt.
- **OQ2** — CV-Sektions-Heads in `documents-html.ts` werden **parametrisiert** (EN/DE via `detectLanguage`).
- **OQ3** — Agent-Texte (`chat-agent.ts summarizeRun`, `agent-fake-provider.ts` Antworttext) **fest englisch**; erzeugte Artefakte folgen weiter der Anzeigensprache.
- **OQ4** — Demo-Seed-Namen **englisch klingend** (`Max Mustermann`/`Beispiel GmbH`/`Musterstadt` umstellen).
- **OQ5** — Agency-/Vermittler-Ansichten (frozen) **jetzt mit-übersetzen**; kein deutsches Copy im Bundle.

### 1.2 Nicht-Ziele

- **Keine i18n-Infrastruktur.** Kein `locale`-Feld auf `WorkspaceSettings`/`User`,
  keine Katalogdateien, keine Lingui/i18next-Dependency, kein Runtime-Switch.
- **Kein Code-Rename.** Die Code-Terminologie (Identifiers, Routen, Tabellen:
  `Talent`, `Mandate`, `JobPosting`, `JobApplication`, `/talents`, `/mandates`)
  bleibt unverändert (ADR-0057 §Decision 3 „no big-bang rename"). Nur **UI-Copy**
  wird übersetzt. Die Begriffs-Asymmetrie „UI `Candidate` ↔ Code `Talent`" bleibt
  bestehen und wird im Glossar dokumentiert (§2).
- **Keine Übersetzung des Dokument-Inhalts.** CV-/Anschreiben-Inhalt folgt weiter
  der Sprache der Stellenanzeige (FR-42): deutsche Anzeige → deutsches Dokument,
  englische → englisches. Deutsche Prompt-/Template-Strings in
  `application-letter.ts`, `outreach.ts`, `candidate-pitch.ts`, `document-ai.ts`,
  `application-tailor.ts`, `agg-check.ts`, `interview-observation.ts`,
  `talent-documents.ts` (Struktur-Labels) sind **per-Sprache
  Dokument-Output**, keine UI — sie bleiben. Ausnahmen (geändert): CV-Sektions-Heads
  in `documents-html.ts` (OQ-2, §3.3) und Agent-System-/Limit-/Fake-Texte (OQ-3, §3.2).
- **Keine Änderung der Coverage-Schwellen** (Statements ≥ 90 %, Branches ≥ 90 %),
  keine echten Personendaten/Secrets im Diff (Repo-Regel §4), keine neuen Features,
  **keine Feature-Flags** (wäre i18n-Infrastruktur, Widerspruch zu OQ-3).

---

## 2. Begriffskarte (verbindlich)

| Deutsch (heute)               | Code (unverändert) | Englisch (Phase 7) | Nav-Label      |
| ----------------------------- | ------------------ | ------------------ | -------------- |
| Mandant (die Person)          | `Talent`           | **Candidate**      | „Candidates"   |
| Suchauftrag                   | `Mandate`          | **Mandate**        | „Mandates"     |
| Stelle                        | `JobPosting`       | **Job posting**    | „Jobs"         |
| Bewerbung                     | `JobApplication`   | **Application**    | „Applications" |
| Vermittlung-Schalter          | `vermittlung`      | **Agency**         | „Agency"       |
| Mandant (Tenant, Super-Admin) | `Tenant`           | **Workspace**      | „Workspace"    |
| Workspace                     | `Tenant`           | **Workspace**      | „Workspace"    |
| (Bewerbungs-)Mappe            | —                  | **Dossier**        | —              |
| Anschreiben                   | —                  | **Cover letter**   | —              |
| Lebenslauf                    | —                  | **CV / résumé**    | —              |

Ergänzend, aus der bestehenden UI abgeleitet (nicht im Issue fixiert, aber für
„kein Mischmasch" nötig):

- Statusnamen `STAGE_LABELS` (`new/review/interview/offer/hired/rejected`):
  `Neu/Sichtung/Interview/Angebot/Eingestellt/Absage` → `New/Review/Interview/Offer/Hired/Rejected`.
- Dashboard-KPIs (`computeApplicationKpis`): `Gesendet/Interview/Angebot/Eingestellt`
  → `Sent/Interview/Offer/Hired`; Vermittler-KPIs (`computeVermittlerKpis`):
  `Aktive Suchaufträge/Mandanten im Pool/Platzierungen/Honorar` →
  `Active mandates/Candidates in pool/Placements/Fee`.
- Anhang-Name `ORIGINAL_CV_ATTACHMENT_NAME`: `Original-Lebenslauf (Import).pdf` →
  `Original CV (import).pdf`.

**OQ-1-Auflösung:** „Mandant" in der Super-Admin-Konsole meint den **Tenant**, nicht
den Bewerber. Der Tenant heißt in der UI künftig **Workspace** (identisch zur
App-Nav); es gibt also keinen zweiten deutschen „Mandant"-Begriff mehr. Damit ist
der Sonderfall „Mandant = Tenant" aufgelöst: beide „Mandant"-Bedeutungen
verschwinden aus der UI (Person → `Candidate`, Tenant → `Workspace`), und die
Scanner-Ausnahme `WORKSPACE_MANDANT` (§5) entfällt ersatzlos — das Wort „Mandant"
wird global verboten.

Die Mapping-Tabelle (inkl. Code-Spalte) wird zusätzlich in `docs/requirements.md`
(FR-73) und im neuen ADR-0064 (§8) festgehalten, damit die Asymmetrie „UI englisch /
Code deutsch-benannt" nachvollziehbar bleibt.

---

## 3. Vollständige Inventur der betroffenen Dateien

Legende: **neu**, **ändern**, **prüfen**. „Aktion prüfen" = verifizieren, dass
keine Änderung nötig ist (Dokumentation der Entscheidung).

### 3.1 UI-Kit (`design/myjob/ui_kits/recruiting/`)

Eine konservative Wortliste (12 deutsche Nomen) liefert heute **235 Treffer über
21 Dateien**; die tatsächliche Anzahl deutscher Copy-Strings (inkl. Verben,
Sätzen, ARIA-Labels, `title`) ist höher — die vollständige Liste liefert der
verschärfte Scanner (§5) als roter Test. Betroffene Dateien (ändern), nach
Gewicht:

| Datei                                                                                                                                                                                                                                                                       | Inhalt (deutsche Copy)                                                                                                                                                                                                                                      |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `app.jsx`                                                                                                                                                                                                                                                                   | Nav-Labels + Tooltips (`NAV_LABELS`: Workspace/Mandanten/Stellen/Bewerbungen/Einstellungen/Suchaufträge/Mehr), Leerzustände, `SETTINGS_NAV`.                                                                                                                |
| `Login.jsx`                                                                                                                                                                                                                                                                 | Komplett: Titel/Subtitle (Willkommen zurück, Konto erstellen, Passwort zurücksetzen …), `POINTS`, Labels, Fehler, Buttons (`Anmelden`, `Konto erstellen`, `Passwort vergessen?`, `Reset-Link senden`), Social (`Weiter mit Google`), Reset-/Invite-Notices. |
| `data.js`                                                                                                                                                                                                                                                                   | `ORIGINAL_CV_ATTACHMENT_NAME`, „KI nicht eingerichtet"-Meldung (Z. 137), `AI_CONSENT_REQUIRED` (Z. 148, „KI-Verarbeitung…"), `STAGE_LABELS`, `computeApplicationKpis`, `computeVermittlerKpis`-Labels.                                                      |
| `BewerbungsEditor.jsx`                                                                                                                                                                                                                                                      | Editor-Aktionen („Anschreiben generieren", „Alles für diese Stelle anpassen"), Magic-Pen, Status-Pills, Einfrier-Dialog, Mappe-Buttons.                                                                                                                     |
| `Editor.jsx`                                                                                                                                                                                                                                                                | Basis-Editor-KI („KI anpassen"), Anrede-/Gruss-Defaults (Z. 77, → §3.3), Abschnitts-Labels, Diff-Bestätigungen („Übernehmen"/„Verwerfen"/„Trotzdem übernehmen").                                                                                            |
| `JobPostings.jsx`                                                                                                                                                                                                                                                           | „Stelle einfügen/übernehmen", „Text ergänzen", Mandant-Picker („Bewerbung erstellen → Mandant wählen"), Leerzustände.                                                                                                                                       |
| `AiGate.jsx`                                                                                                                                                                                                                                                                | Consent-Dialog („KI-Verarbeitung zustimmen", „Zustimmen", „Abbrechen", „Bitte deinen Workspace-Admin um Freigabe"), `AI_NOT_CONFIGURED`-Texte, Banner.                                                                                                      |
| `SettingsView.jsx`                                                                                                                                                                                                                                                          | Einstellungen (KI-Anbindung, Daten & Datenschutz, „Vermittlung"-Toggle, Widerruf), deutsche Beschreibungen.                                                                                                                                                 |
| `Workspace.jsx`                                                                                                                                                                                                                                                             | Begrüßung/KPI-Bereich, Leerzustände.                                                                                                                                                                                                                        |
| `TalentProfile.jsx`                                                                                                                                                                                                                                                         | Mandant-Profil („Lebenslauf anlegen/bearbeiten"), Anhang-/Export-Buttons, Badges.                                                                                                                                                                           |
| `ChatPanel.jsx`                                                                                                                                                                                                                                                             | Agent-Panel (Platzhalter, Send/Abort, Leerzustand, „Bereite eine Bewerbung vor …").                                                                                                                                                                         |
| `EditorModals.jsx` / `EditorShared.jsx` / `EditorDiff.jsx` / `EditorDocs.jsx`                                                                                                                                                                                               | Dialog-/Diff-/Doku-Labels, Grounding-Warnungen.                                                                                                                                                                                                             |
| `RecordFormModal.jsx`                                                                                                                                                                                                                                                       | Mandant-/Stelle-Formular (Felder, Validierung, „Hinzufügen").                                                                                                                                                                                               |
| `Matching.jsx` / `AgencyViews.jsx` / `MandatePipeline.jsx` / `MandatePipelineModals.jsx` / `PipelineBoard.jsx` / `AssistantView.jsx` / `KanbanShared.jsx` / `Bewerbungen.jsx` / `ConfirmDialog.jsx` / `Snackbar.jsx` / `Toast.jsx` / `DataStates.jsx` / `OfflineBanner.jsx` | Vermittler-/Pipeline-/Leer-/Toast-Copy (frozen hinter `vermittlung`, aber Teil des Shipped-Kit).                                                                                                                                                            |
| `SuperAdminCard` / `TenantMembers` / `TeamCard` / `InvitesCard` (in `SettingsView.jsx` bzw. `super-admin`-Views)                                                                                                                                                            | „Mandant" = Tenant → **Workspace** (OQ-1); zugehörige Rollen-/Sperr-/Mitglieder-Copy englisch.                                                                                                                                                              |

**OQ-5:** Die bisher als „frozen hinter `vermittlung`" bezeichneten
Agency-/Vermittler-Ansichten (`Matching`, `AgencyViews`, `MandatePipeline`,
`MandatePipelineModals`, `PipelineBoard`, `AssistantView`, `KanbanShared`,
`Bewerbungen`-Sub-Tab, `Berichte`/`Platzierungen`-Views) werden **in dieser Phase
mit-übersetzt**. Sie bleiben funktional frozen (kein Feature-Umbau), aber ihr
deutsches Copy wird vollständig ersetzt — es gibt **kein** deutsches Copy im
Bundle, auch nicht hinter dem `vermittlung`-Schalter. Der Scanner läuft ohnehin
über **alle** Kit-Dateien und wird durch OQ-5 nicht weiter ausgenommen; die
zugehörigen Vitest-Suiten (z. B. `assistant-view`, `matching-*`, `bewerbungen-ui`)
werden in §3.6 mit umfasst. e2e-Specs für frozen Views (§3.6) decken die
verbleibenden Pfade ab.

`index.html`, `main.jsx`, `theme.js`, `workspace-settings.js`, `use-*.js(x)` —
**prüfen** (keine deutsche Copy erwartet). `styles.css` liegt **außerhalb des
Kits** unter `design/myjob/styles.css`; es enthält **keine** `content:`-Strings
(verifiziert) und wird vom Scanner nicht gesammelt — **prüfen** am korrekten Pfad,
nicht im Kit (G5-m1).

### 3.2 Server problem+json-Details + Agent-Texte (`server/src/`)

Nur **Fehler-/Detail-Texte**, die über `mapErrorToProblem` als `detail` an den
Client gehen (Entscheidung 4), sowie die fest-englischen Agent-Texte (OQ-3).
Sprachneutrale Codes/`type`/`title`/Status bleiben.

| Datei                                         | Aktion | Inhalt (deutsch → englisch)                                                                                                                                                                                                                                                                                                                                                                      |
| --------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `domain/errors.ts`                            | ändern | `FrozenError`-Default (Z. 52): „Diese Bewerbung ist versendet und eingefroren. Bestätige die Änderung, um fortzufahren." → „This application is sent and frozen. Confirm the change to continue." · `AiConsentRequiredError`-Default (Z. 142): „AI-Verarbeitung …" → kanonischer String (unten).                                                                                                 |
| `domain/workspace-settings.ts`                | ändern | `AI_CONSENT_REQUIRED_DETAIL` (Z. 42): „AI-Verarbeitung wurde für diesen Workspace noch nicht freigegeben." → „AI processing has not been approved for this workspace yet." (kanonischer String).                                                                                                                                                                                                 |
| `services/job-application-service.ts`         | ändern | `ValidationError('Nur PDF-Anhänge sind wählbar')` (Z. 201) → „Only PDF attachments can be selected." · `NotFoundError(\`Anhang ${attachmentId} nicht gefunden\`)` (Z. 198) → „Attachment ${attachmentId} not found" · Status-Historie-Noten `'Dokumente nach Einfrieren geändert'`/`'Anhänge nach Einfrieren geändert'` → „Documents edited after freezing"/„Attachments edited after freezing". |
| `services/job-application-dossier-service.ts` | ändern | `ValidationError('Nur PDF-Anhänge sind wählbar')` (Z. 115) → englisch (identischer Text) · **`NotFoundError(\`Anhang ${attachmentId} nicht gefunden\`)` (Z. 112) → „Attachment ${attachmentId} not found"** (G2-m1/G5-M3: hier `${attachmentId}`, nicht `${id}`).                                                                                                                                |
| `domain/chat-agent.ts`                        | ändern | `summarizeRun` (Z. 122/127): „Der Agent hat in diesem Lauf keine Bewerbungs-Entwürfe erstellt." / „… Bewerbungs-Entwurf/-Entwürfe erstellt: …" → **fest englisch** (OQ-3).                                                                                                                                                                                                                       |
| `adapters/agent-fake-provider.ts`             | ändern | Fake-Antworttext (Z. 54): „Das habe ich für dich vorbereitet — die Entwürfe findest du in der Übersicht." → **fest englisch** (OQ-3).                                                                                                                                                                                                                                                            |

**Ein kanonischer englischer Zielstring (G5-M1).** Heute existiert eine
AI/KI-Divergenz: `errors.ts:142` und `workspace-settings.ts:42` sagen
„**AI**-Verarbeitung", der Client `data.js:148` (`AI_CONSENT_REQUIRED`) sagt
„**KI**-Verarbeitung". Phase 7 fixiert **genau einen** englischen Zielstring für
alle drei Stellen:

> `AI processing has not been approved for this workspace yet.`

Der Dedup-Test (§3.6, §6/Risiko 3) prüft, dass `errors.ts`-Default,
`AI_CONSENT_REQUIRED_DETAIL` und `data.js`-Konstante byte-identisch auf diesen
String zeigen. Das ist **Hygiene** (Konsistenz der drei Quellen), **kein**
Flow-Schutz: Consent-/Freeze-Erkennung läuft clientseitig über `type`/`code`
(data.js:84/157, BewerbungsEditor.jsx:326 `e.code === 'frozen'`), nicht über den
Detail-String. Der einzige echte String-Match im Client ist `data.js:104`
`includes('not enabled for this workspace')` — bereits englisch, bleibt unverändert.

**Prüfen / bewusst NICHT übersetzen** (Dokument-Output bzw. Prompt, Entscheidung 5):
`application-letter.ts`, `outreach.ts`, `candidate-pitch.ts`, `document-ai.ts`,
`application-tailor.ts`, `agg-check.ts`, `interview-observation.ts`,
`documents-html.ts` (CV-Sektions-Heads — **doch ändern**, siehe OQ-2/§3.3),
`talent-documents.ts` (`emptyLetter` — **doch ändern**, siehe §3.3),
`language.ts`, `slug.ts`, `job-requirements.ts`, `company-archetype.ts`,
`bundesagentur-job-source.ts`, `adzuna-job-source.ts`,
`index.ts`/`retention.ts` (Logs, nicht problem+json — bleiben).

### 3.3 Dokument-Default `en` + CV-Sektions-Heads (Entscheidung 5 + OQ-2)

| Datei                                                          | Aktion | Inhalt                                                                                                                                                                                                                                                                                                                                                                                                                 |
| -------------------------------------------------------------- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `services/magic-pen-service.ts:80`                             | ändern | `detectLanguage(adText, 'de')` → `detectLanguage(adText, 'en')` (bzw. Fallback-Argument entfernen; Default ist bereits `'en'`).                                                                                                                                                                                                                                                                                        |
| `services/application-letter-service.ts:56`                    | ändern | dito `detectLanguage(adText, 'de')` → `'en'`.                                                                                                                                                                                                                                                                                                                                                                          |
| `services/document-service.ts:163`                             | ändern | `detectLanguage(..., 'de')` → `'en'`.                                                                                                                                                                                                                                                                                                                                                                                  |
| `domain/talent-documents.ts` (`emptyLetter`, `anrede`/`gruss`) | ändern | `anrede: 'Sehr geehrte Damen und Herren,'` → `'Dear Sir or Madam,'` · `gruss: 'Mit freundlichen Grüßen'` → `'Kind regards'`.                                                                                                                                                                                                                                                                                           |
| `design/myjob/ui_kits/recruiting/Editor.jsx:77`                | ändern | **Client-Brief-Defaults** (G5-m2): `anrede: 'Sehr geehrte Damen und Herren,'` → `'Dear Sir or Madam,'` · `gruss: 'Mit freundlichen Grüßen'` → `'Kind regards'`. Byte-identisch zum Server-`emptyLetter`.                                                                                                                                                                                                               |
| `domain/documents-html.ts` (CV-Sektions-Heads)                 | ändern | **OQ-2:** Heads „Profil/Berufserfahrung/Ausbildung/Kenntnisse" (Z. 127–130), „Kenntnisse" (Z. 286), „Über mich/Werdegang/Bildung" inkl. `sectionHead`-Args „Profil/Berufserfahrung/Ausbildung" (Z. 325–327) → **parametrisieren** über `detectLanguage` (EN/DE): `Profile/Professional experience/Education/Skills/About me/Career/Education`. Ein englischer CV zeigt englische Heads, ein deutscher weiter deutsche. |

**Verknüpfung §3.1↔§3.3 (G5-m2):** Die Brief-Anrede/Grußformel existiert **doppelt**
— einmal als Server-`emptyLetter` (`talent-documents.ts`, Grundzustand neuer
Dokumente) und einmal als Client-Default im Editor (`Editor.jsx:77`, vorinitialisierte
Formularfelder). Beide müssen byte-identisch englisch werden, sonst startet ein
neuer Brief je nach Einstiegspunkt mit unterschiedlicher Formel. Der Dedup-Test
(§3.6) prüft beide Quellen auf Identität.

Konsequenz: ein neues Dokument ohne erkennbare Sprach-Signale (leer/kurz)
defaultet auf Englisch; der Inhalt folgt weiter der Anzeigen-Sprache (FR-42).
CV-Sektions-Heads folgen derselben erkannten Sprache (EN/DE), nicht mehr hart
deutsch.

### 3.4 Mails (Entscheidung 6)

| Datei                                                                               | Aktion | Inhalt                                                                                                      |
| ----------------------------------------------------------------------------------- | ------ | ----------------------------------------------------------------------------------------------------------- |
| `domain/email-verification.ts`                                                      | prüfen | `emailVerificationEmail` ist **bereits englisch** („Confirm your myJob email address"). Keine Änderung.     |
| `domain/password-reset.ts`                                                          | prüfen | `passwordResetEmail` ist **bereits englisch** („Reset your myJob password"). Keine Änderung.                |
| `services/mail-service.ts`, `adapters/console-mailer.ts`, `adapters/smtp-mailer.ts` | prüfen | Fehler-/Log-Texte englisch; Outreach-Inhalt folgt der Anzeigen-Sprache (FR-42) und ist keine feste UI-Mail. |

Ergebnis: **keine** feste deutsche Mail gefunden — Entscheidung 6 ist ein
Verifikationsschritt mit einem (ggf. erweiterten) Unit-Test als Beleg, der die
Betreff-/Body-Konstanten auf verbotene deutsche Fragmente prüft.

### 3.5 Seed/Demo (`server/src/demo-seed.ts`)

| Datei          | Aktion | Inhalt                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| -------------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `demo-seed.ts` | ändern | Demo-**Texte** englisch: Posting-`description`, CV-`summary`/`bullets`/`skillGroups`-Labels, Brief-Defaults. **Namen englisch klingend (OQ-4):** `Max Mustermann` → z. B. `Daniel Carter`, `Beispiel GmbH` → z. B. `Brightline Software Ltd.`, `Musterstadt` → z. B. `Springfield` (konkrete Wahl beim Umsetzen festlegen; Namensliste Z. 186–187 `Helio`/`Nordwind` ist bereits englisch klingend). `DEMO_*_ID`-Konstanten (`demo-mandant-1` …) sind IDs, keine Copy → bleiben. `DEMO_PII_DENYLIST` unverändert. |

Hinweis OQ-4: Die DE-Erkennung in `detectLanguage` wird künftig durch dedizierte
`language.test.ts`-Fälle abgedeckt, nicht mehr durch deutsch klingende
Seed-Daten (der Seed demonstriert nun den englischen Normalfall).

### 3.6 Tests

Zahlen: Jest **155 Testdateien** (verifiziert), Vitest **51 Dateien / 591
`expect`** (verifiziert), davon **22 Dateien mit Umlauten** (verifiziert); e2e
**≈ 279 `getBy*`-Aufrufe** (verifiziert), davon ≈ 100–110 mit deutschen
Selektoren (genauer Wert bei der Umsetzung per grep auf die deutsche Wortliste);
Server **6 Dateien** mit deutschen problem+json-/Consent-Strings (verifiziert).

| Suite                        | Datei(en)                                                                                                            | Umfang                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Terminology-Scanner (Vitest) | `UI/__tests__/terminology.test.js`, `UI/terminology-allowlist.json`                                                  | **Schärfen** (§5): GLOBAL-Denylist um die gesamte deutsche UI-Wortliste erweitern; `WORKSPACE_MANDANT` entfällt (OQ-1). Allowlist bleibt Mechanismus für begründete Ausnahmen.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| Vitest (UI)                  | 51 Dateien, **22 mit Umlauten**                                                                                      | Selektoren/Assertions auf englische Texte umstellen (`getByText('Mandant hinzufügen')` → `'Add candidate'` usw.), inkl. der Agency-/Vermittler-Suiten (`assistant-view`, `matching-*`, `bewerbungen-ui`, `super-admin-ui`, `settings-ai`, …).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| Jest (Server)                | **6 Dateien ändern** + **1 prüfen**                                                                                  | (1) `unit/job-application-service.test.ts`, (2) `unit/workspace-settings.test.ts:56` (`toContain('AI-Verarbeitung')`), (3) `unit/problem.test.ts:183` (`res.body.detail` `toContain('AI-Verarbeitung')`), (4) `acceptance/nest-job-applications.test.ts`, (5) `acceptance/nest-import-mode.test.ts`, (6) `acceptance/nest-ai-consent.test.ts` — Assertions auf deutsche problem+json-Details/Noten anpassen (`nest-ai-consent` assertet `toBe(AI_CONSENT_REQUIRED_DETAIL)` und zieht mit der Konstanten mit; sein `München`-Stadtstring ist synthetische Test-Daten, keine UI-Copy). **Prüfen:** `unit/legacy-application-migration.test.ts` hat **keine** deutsche Assertion (nur Kommentar Z. 217 „Stelle einfügen per URL") → keine Änderung. Die übrigen ~19 Dateien mit Umlauten sind Dokument-/Prompt-Tests und bleiben. |
| e2e (Playwright, 5 Specs)    | `e2e/ui.spec.ts`, `e2e/mobile.spec.ts`, `e2e/golden-path.spec.ts`, `e2e/consent.spec.ts`, `e2e/button-audit.spec.ts` | **≈ 279 `getBy*`-Aufrufe** (`getByRole`/`getByText`/`getByLabel`/**`getByPlaceholder`**/`getByTitle`/`getByTestId`), davon ≈ 100–110 deutsche Selektoren auf englisch umstellen. `getByPlaceholder`-Fälle: `'you@example.com'`, `'••••••••'`, **`'CV-Text hier einfügen…'`** (ui.spec.ts:1021/1028/1184). Mock-Namen sind **echte** Proper-Nouns: `Tobias Wirth`, `Nordwind Logistik AG`, `Helio GmbH`, `Hamburg`/`Hamburg · Remote` — synthetische Test-Daten, keine UI-Copy, bleiben unverändert („Max Mustermann" kommt in e2e **nicht** vor).                                                                                                                                                                                                                                                                              |
| Vitest-Placeholder           | `editor-import.test.jsx`, `editor-modals-errors.test.jsx`                                                            | `getByPlaceholderText('CV-Text hier einfügen…')` → englischer Placeholder.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |

### 3.7 README + Screenshots

| Datei                                               | Aktion           | Inhalt                                                                                                                                                                                                                 |
| --------------------------------------------------- | ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `README.md`                                         | ändern           | Deutsche Abschnitte („Vorzeigbar in 10 Minuten", Feature-Liste „Stellen übernehmen/Bewerbung/Bewerbungsmappe", Screenshot-`alt`-Texte) → englisch. „Bewerbungsservice" → „application service" (OQ-5).                 |
| `scripts/capture-bewerbungsservice-screenshots.mjs` | ändern           | Selektoren (`Anmelden`/`Stellen`/`Bewerbungen`/`Einstellungen`) + Chat-Prompt (Z. 98 `'Bereite eine Bewerbung für Max Mustermann vor'`) → englisch (Prompt-Name auf den neuen OQ-4-Namen); Ausgabedateien unverändert. |
| `docs/images/bewerbungsservice-*.png` (8 Dateien)   | **neu erzeugen** | Galerie nach der Umstellung per Script neu fahren (Server auf `PORT 4188`, `STORE=fs`, `AGENT_FAKE=1`, Dummy-Key, `npm run seed:demo`).                                                                                |

**G5-m3:** Das Re-Capture (Etappe 6) blockt explizit auf die OQ-3-Resolution —
die Fake-Agent-Antwort `agent-fake-provider.ts:54` muss **englisch** sein, damit
der Screenshot der Chat-/Agent-Ansicht keine deutschen Agent-Texte mehr zeigt.

### 3.8 Doku/ADRs

| Datei                                | Aktion      | Inhalt                                                                                                                                                                                                                                                                                                             |
| ------------------------------------ | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `docs/requirements.md`               | ändern      | FR-73 (UI-Vokabular) auf die englische Begriffskarte umschreiben; FR-42 (Dokument-Sprache) um „Default `en`" ergänzen; deutsche Referenz-Strings in FR-72/FR-75/FR-77/FR-81–96, die UI-Labels zitieren („Stelle übernehmen", „Text übernehmen (ohne KI)", „Trotzdem übernehmen"), auf englische Labels angleichen. |
| `docs/adr/README.md`                 | ändern      | Zeile für das neue ADR 0064.                                                                                                                                                                                                                                                                                       |
| ADR neu                              | **neu**     | **Neues ADR 0064 `english-only`** (kein Addendum zu 0057 — G5-m5): „English-only UI vocabulary" — Begriffskarte (§2) inkl. Code-Spalte, OQ1–OQ5-Resolutionen, Begründung, Consequence „zwei Vokabulare (UI englisch / Code deutsch-benannt)". Referenziert ADR-0057 §Decision 3 (ergänzt Spalte „Englisch").       |
| `CHANGELOG.md`                       | ändern      | Changed: UI english-only, problem+json-Details english, Dokument-Default `en`, README/Screenshots.                                                                                                                                                                                                                 |
| Bestehende deutsche ADRs (0045–0063) | **bleiben** | Entscheidung 8: nicht retrospektiv übersetzen (§8 Begründung).                                                                                                                                                                                                                                                     |

**G5-m5:** `docs:check` (`tools/check-docs.mjs`) prüft nur PlantUML→SVG-Frische,
relative Link-Auflösung und `ADR-NNNN`-Referenz-Existenz — **keine
Sprachprüfung**. AK-7.8 („neue Doku englisch") ist daher **manuell** zu belegen,
nicht über `docs:check`.

---

## 4. Etappen und Akzeptanzkriterien

Tests zuerst, wo sinnvoll; bei der reinen Übersetzung ist der Code die Änderung
und der (zuerst geschärfte) Scanner der rote Test, der danach grün wird.

**Gate-Regel (G2-M1, korrigiert).** Das Gesamt-Gate ist `./test.sh` =
`format:check` + `lint` + `docs:check` + `test:web` + `test` (Jest). **e2e ist
nicht Teil von `test.sh`** — e2e läuft separat via `npm run test:e2e`
(=`playwright test`). Die Gate-Regel je Etappe lautet „alle im Gate enthaltenen
Prüfungen grün", mit **einer** benannten Ausnahme: Etappe 0 (bewusst roter
Scanner-Canary, Variante b).

### Etappe 0 — Begriffskarte fixieren + Scanner-Guard schärfen (bekannter roter Canary)

- `UI/__tests__/terminology.test.js`: `GLOBAL`-Denylist um die **gesamte deutsche
  UI-Wortliste** erweitern (Mechanik in §5); `WORKSPACE_MANDANT` **entfernen**
  (OQ-1). Der Test wird **rot** (235+ Treffer).
- Positiv-Guard ergänzen: die englischen Nav-Labels (`Candidate(s)`, `Jobs`,
  `Applications`, `Agency`) müssen im Shipped-Kit **vorkommen** (Anti-Leerlauf).

**AK-7.1** — Scanner flaggt jedes deutsche UI-Fragment im Shipped-Kit (`walk(KIT)`
über alle `*.jsx`/`*.js`, JSX-Text + String-Literale); der Positiv-Guard pinnt die
englischen Nav-Labels.

**Gate Etappe 0 (Variante b):** alle Gate-Prüfungen grün **außer** dem geschärften
Scanner, der **bekanntermaßen rot** ist und die vollständige deutsche Trefferliste
(≈235+) als erwartete Canary-Ausgabe zeigt. Der Canary ist der rote Test; er wird
in Etappe 3 grün. Kein anderer Test darf durch Etappe 0 brechen.

**AK-7.3** — Kein `locale`-Feld, keine Katalogdatei, keine neue Dependency
verändert `package.json`/`package-lock.json` (Ausnahme: keine). Beleg: Diff ohne
`locale`/`i18n`/`lingui`/`i18next`; der Scanner läuft weiterhin rein parserbasiert
ohne Runtime.

### Etappe 1 — Server problem+json-Details + Agent-Texte englisch (Entscheidung 4 + OQ-3)

Dateien §3.2 ändern (inkl. `chat-agent.ts summarizeRun` + `agent-fake-provider.ts`,
fest englisch). **Vorher** die betroffenen Jest-Suiten (§3.6) rot machen
(Assertions auf deutsche Details), dann Code + Tests gemeinsam grün. Dedup-Test
„`AI_CONSENT_REQUIRED_DETAIL` ≡ `AiConsentRequiredError`-Default ≡ `data.js`-Konstante"
als **Hygiene**-Test vorgezogen (kein Flow-Schutz, §6/Risiko 3).

**AK-7.4** — Jede problem+json-`detail`, die ein `DomainError`/`ValidationError`
mit deutschem Text trägt, ist englisch; `AI_CONSENT_REQUIRED_DETAIL`,
`FrozenError`-Default, beide `'Nur PDF-Anhänge…'` und beide
`NotFoundError(\`Anhang ${attachmentId}…\`)`sind englisch **und** die drei
Consent-Quellen byte-identisch auf den **einen** kanonischen String
(„AI processing has not been approved for this workspace yet."). Sprachneutrale`type`/`title`/Status unverändert. Agent-Texte (`summarizeRun`, Fake-Antwort) fest
englisch. Beleg: `problem.test.ts` + angepasste Jest-Suiten + Dedup-Test.

### Etappe 2 — Dokument-Default `en` + CV-Sektions-Heads (Entscheidung 5 + OQ-2)

Dateien §3.3 ändern (3× `detectLanguage(…,'de')`→`'en'`, Server-`emptyLetter`
`anrede`/`gruss`, **Client** `Editor.jsx:77` `anrede`/`gruss`, CV-Sektions-Heads
in `documents-html.ts` parametrisieren). Jest-/Vitest-Tests anpassen (leere/kurze
Eingabe → `en`; neue Briefe starten mit englischer Anrede/Grussformel, Client +
Server identisch; englischer CV zeigt englische Heads, deutscher weiter deutsche).

**AK-7.5** — Ohne Sprach-Signal wird `en` erzeugt (nicht `de`); neuer Brief
defaultet auf `Dear Sir or Madam,`/`Kind regards` (Client **und** Server identisch).
CV-Sektions-Heads folgen `detectLanguage` (EN/DE). Inhalt folgt weiter der
Anzeigen-Sprache (FR-42) — ein deutscher Anzeigentext erzeugt weiter deutsches
Dokument (Regressionstest bleibt grün).

### Etappe 3 — UI-Kit + Agency-Views vollständig übersetzen (Entscheidungen 1+2 + OQ-1/OQ-5)

Dateien §3.1 übersetzen; `data.js`-Konstanten (`STAGE_LABELS`, KPI-Labels,
`ORIGINAL_CV_ATTACHMENT_NAME`, `AI_CONSENT_REQUIRED`, „KI nicht eingerichtet").
Super-Admin „Mandant" → „Workspace" (OQ-1). Agency-/Vermittler-Views **inklusive**
(OQ-5). Vitest-Suiten (§3.6) auf englische Texte umstellen. Scanner wird **grün**.

**Harte Abhängigkeit (G5-M4, Variante „Abhängigkeit", keine Co-Merge):**
Etappe 3 **blockt auf Etappe 1**. Ohne diese Ordnung könnten englische UI-Ansichten
noch deutsche problem+json-Details anzeigen. Keine Feature-Flags — ein Flag für
„englisch" wäre i18n-Infrastruktur (Widerspruch zu OQ-3). Die umgekehrte
Übergangsrichtung (Etappe 1 vor 3: deutsche UI zeigt temporär englische
Fehlerdetails) ist der akzeptierte, transiente Zwischenstand.

**AK-7.2** — Begriffskarte §2 gilt durchgängig in Nav, Ansichten, Dialogen,
ARIA-Labels und `title`-Hinweisen: `Candidate`/`Jobs`/`Applications`/`Agency`/
`Mandate`/`Workspace`/`Dossier`/`Cover letter`. `vermittlung`-Schalter heißt
„Agency"; Super-Admin-Tenant heißt „Workspace". Beleg: Vitest + Scanner.

**AK-7.1 (grün)** — `terminology.test.js` grün; `terminology-allowlist.json` hat
nur begründete Einträge (und `UiStrings_Allowlist_HasNoStaleEntries` bleibt grün).

### Etappe 4 — e2e-Selektoren englisch

`e2e/*.spec.ts`: ≈ 100–110 deutsche Selektoren → englisch (inkl.
`getByPlaceholder`, z. B. `'CV-Text hier einfügen…'`). Mock-Namen (`Tobias Wirth`,
`Nordwind Logistik AG`, `Helio GmbH`, `Hamburg`) bleiben (synthetische Daten).
`scripts/capture-bewerbungsservice-screenshots.mjs` Selektoren + Chat-Prompt → englisch.

**AK-7.7 (Teil 1)** — e2e laufen grün (`npm run test:e2e`); kein `getBy*` mit
deutschem Text mehr in den 5 Specs. **Gate Etappe 4 = `npx playwright test`, nicht
`test.sh`** (e2e ist separat).

### Etappe 5 — Seed/Demo + Mails

`demo-seed.ts` Texte englisch, **Namen englisch klingend** (OQ-4). Mail-Verifikationstest
(§3.4) als Beleg, dass keine feste deutsche Mail existiert.

**AK-7.6** — Verifikations-/Reset-Mails englisch (belegt durch Test); Seed-Texte
**und -Namen** englisch klingend (OQ-4). `SeedDemo_*`-Tests (§3.5) unverändert grün.

### Etappe 6 — README + Screenshots neu

README-Texte englisch; Screenshots per Script neu erzeugen (Voraussetzungen §3.7).
**Blockt auf OQ-3** (Fake-Agent-Antwort englisch, G5-m3).

**AK-7.7 (Teil 2)** — README-Galerie zeigt die **englische** UI; „Vorzeigbar in
10 Minuten" → „Ready to demo in 10 minutes" mit englischen Flow-Schritten;
`alt`-Texte englisch. Beleg: 8 PNGs in `docs/images/` aktualisiert + manuelles
Sichten (deutsche Strings in den PNGs sind nach dem Re-Capture verschwunden).

### Etappe 7 — Doku/ADR + Gate

§3.8 umsetzen: FR-73/FR-42 umschreiben, **ADR-0064** (neu), CHANGELOG.
`./test.sh` vollständig grün (format:check, lint, docs:check, test:web, test) und
`npm run test:e2e` grün.

**AK-7.8** — Neue Doku (ADR-0064, geänderte requirements/architecture-Abschnitte)
englisch; bestehende deutsche ADRs unangetastet; Begründung im ADR/Plan §8.
**Manueller Beleg** (G5-m5): `docs:check` bietet keine Sprachprüfung.
**AK-7.9** — `./test.sh` grün; Jest-Coverage Statements ≥ 90 %, Branches ≥ 90 %;
Vitest- und e2e-Suiten grün.

---

## 5. Scanner-Guard-Schärfung (Detail)

Der Scanner ist der Vitest-Test `UI/__tests__/terminology.test.js`: er läuft mit
dem TypeScript-Compiler über `walk(KIT)` (alle `*.jsx`/`*.js` außer
`__tests__`/`node_modules`/`dist`/`public`) und sammelt **JSX-Text** und
**String-Literale** (keine Kommentare, Imports, Property-Namen, Pfade, URLs).
Verbotenes wird über eine Regex-`GLOBAL`-Liste + `terminology-allowlist.json`
(Ausnahmen, heute leer) geflaggt.

Heutige `GLOBAL`-Liste (pre-ADR-0057-Vokabular): `/\bTalent/`, `/\btalent pool/i`,
`/\bMandat(?!ant)/`, `/\bMandates\b/`, `/\bSuchmandat/`; dazu `WORKSPACE_MANDANT =
/\bMandant(en)?\b/` **nur** in Super-Admin-Funktionen (`SuperAdminCard`,
`TenantMembers`, `TeamCard`, `InvitesCard`).

Schärfung für Phase 7:

1. **`GLOBAL` erweitern** um die deutsche UI-Wortliste — Mindestset:
   `Mandant(en)?`, `Stelle(n)?`, `Suchauftrag|Suchaufträge`, `Bewerbung(en)?`,
   `Vermittlung`, `Anschreiben`, `Lebenslauf`, `Mappe`, `Einstellungen`,
   `Abbrechen`, `Speichern`, `Löschen`, `Übernehmen`, `Zustimmen`, `Anmelden`,
   `Passwort`, `Konto`, `Senden`, `Erstellen`, `Hinzufügen`, `Suchen`, `Fehler`,
   `Keine`, `Noch`, `Zurück`, `Neu`, `Weiter`, `Bitte`, `Firma`, `Unternehmen`,
   `Honorar`, `Platzierungen`, `Absage`, `Gesendet`, `Angebot`, `Eingestellt`.
   Zusätzlich ein **Umlaut-/ß-Signal** als Catch-all für einzelne deutsche Wörter
   (`/[äöüÄÖÜß]/`), das nur für **String-Literale/JSX-Text** gilt — nicht für
   Kommentare/Identifiers (die der Collector ohnehin nicht liefert).
2. **`WORKSPACE_MANDANT` entfällt ersatzlos (OQ-1).** „Mandant" ist in **jeder**
   Bedeutung aus der UI verschwunden (Person → `Candidate`, Tenant → `Workspace`)
   und wandert damit vollständig in `GLOBAL`. Es gibt keine Super-Admin-Ausnahme
   mehr.
3. **Positiv-Guard**: assert, dass `Candidate`/`Jobs`/`Applications`/`Agency`
   (exakte Nav-Labels) im Kit vorkommen — verhindert, dass jemand nur die
   Denylist leert, ohne das neue Vokabular einzuführen.
4. **Allowlist** (`terminology-allowlist.json`): bleibt der einzige, begründete
   Ausnahmemechanismus (z. B. eine bewusst deutsche Demo-Firma). Jeder Eintrag
   braucht einen Kommentar im PR (Muster: Datei + String + Begründung). Der
   bestehende `UiStrings_Allowlist_HasNoStaleEntries`-Test bleibt.
5. **Manifest** bleibt geprüft (`UiStrings_Manifest_ContainsNoForbiddenTerms`);
   der Check wird auf die erweiterte `GLOBAL`-Liste angewendet.

Der Scanner deckt nur das UI-Kit ab. Server-seitige deutsche problem+json-Details
werden durch die Jest-Tests (`problem.test.ts` + angepasste Suiten) gepinnt —
nicht durch den UI-Scanner. `design/myjob/styles.css` (außerhalb des Kits) enthält
**keine** `content:`-Strings und wird **manuell am korrekten Pfad** geprüft
(G5-m1).

---

## 6. Risiken

1. **Begriffsdrift / Konsistenz UI-Label ↔ Code-Terminologie.** UI `Candidate`
   heißt im Code `Talent`, Nav „Jobs" heißt im Code `JobPosting`, „Applications" =
   `JobApplication`. Der Scanner darf nur **UI-Copy** treffen, nicht Identifier —
   genau dafür sammelt er nur JSX-Text/String-Literale. Restrisiko: ein
   Entwickler „übersetzt" versehentlich einen Identifier/String, der eigentlich
   ein Code-Schlüssel ist (z. B. `STAGE_LABELS`-**Keys** `new/review/…` dürfen
   sich **nicht** ändern — nur die Werte). Gegenmaßnahme: AK-7.2 pinnen die
   **Werte**, die Key-Stabilität bleibt durch bestehende Jest-/Vitest-Tests und
   den Positiv-Guard (nur Labels, keine Keys) geschützt.

2. **Tests, die auf deutschen Strings stehen (≈100–110 e2e + 22 Vitest-Dateien +
   6 Jest-Dateien).** Reine Text-Änderung bricht eine große Anzahl
   Assertions/Selektoren. Gegenmaßnahme: Reihenfolge Etappe 0→3→4 (Scanner rot,
   dann UI, dann Tests), dedizierte Anpassungs-Etappen, `./test.sh` als Gate.
   Restrisiko: versteckte deutsche Selektoren in `data-testid`-unabhängigen
   Pfaden (Mocks in `e2e/ui.spec.ts`).

3. **Konsistenz Server-`detail` ↔ Client-Konstanten (Hygiene, kein Flow-Schutz).**
   `AI_CONSENT_REQUIRED_DETAIL` (Server), `AiConsentRequiredError`-Default und
   `data.js`-`AI_CONSENT_REQUIRED` existieren heute in **divergenter** Schreibweise
   (Server „AI-Verarbeitung", Client „KI-Verarbeitung"). Die Consent-/Freeze-
   **Erkennung** läuft jedoch **nicht** über den Detail-String, sondern über
   `type`/`code` (`data.js:84` setzt `err.code` aus `body.type`,
   `data.js:157` setzt `err.code='ai-consent-required'`, `BewerbungsEditor.jsx:326`
   prüft `e.code === 'frozen'`). Der einzige echte Detail-String-Match ist
   `data.js:104` `includes('not enabled for this workspace')` (bereits englisch).
   Phase 7 fixiert **einen** kanonischen englischen String für alle drei
   Consent-Quellen; ein Dedup-Test pinnt die Byte-Identität als **Hygiene** —
   er schützt den Flow nicht (der hängt am `code`), sondern verhindert stillen
   Copy-Drift.

4. **e2e-Flake durch Doppel-Meaning englischer Labels.** „Jobs" (Nav) vs.
   „Job" in Texten; „Applications" vs. „Application" als Aktion. `getByRole('button',
{ name: 'Jobs' })` kann mehrdeutig werden. Gegenmaßnahme: exakte
   Regex-Anker (`/^Jobs$/`) wie bereits im Capture-Script, ARIA-Labels bewusst
   eindeutig wählen, e2e lokal (Desktop + Mobil) verifizieren.

5. **README-Screenshot-Neuerzeugung.** Das Script braucht einen laufenden Server
   (`PORT 4188`, `STORE=fs`, `AGENT_FAKE=1`, Dummy-Key, `seed:demo`); die
   Screenshots zeigen heute deutsche UI und sind im Diff binär. Gegenmaßnahme:
   Re-Capture **nach** Etappe 3+5 und **nach** OQ-3 (englische Fake-Agent-Antwort),
   manuelle Sichtkontrolle auf deutsche Strings in den PNGs, CI-Teil „kein
   deutsches UI-Fragment" bleibt der deterministische Scanner (Screenshots sind
   kein automatischer Guard).

6. **Umlaut-Catch-all → Allowlist-Pflegeaufwand (G2-m5).** Das globale
   `/[äöüÄÖÜß]/`-Signal flaggt auch **erwünschte** deutsche Sonderzeichen in
   synthetischen Daten (z. B. einen bewusst deutschen Firmen-/Ortsnamen in
   Seed/e2e-Daten, falls je nötig). Gegenmaßnahme: solche Fälle laufen über die
   Allowlist, und **jeder** Allowlist-Eintrag braucht eine PR-Begründung
   (Datei + String + Warum). Das hält die Allowlist klein, begründet und
   nachvollziehbar statt eines wachsenden, ungeprüften Freibriefs.

---

## 7. Owner-Entscheidungen (OQ1–OQ5, beantwortet)

Die fünf ehemals offenen Fragen sind durch den Owner beantwortet und in diesen
Plan eingearbeitet. Wortlaut der Resolution:

1. **OQ1 — Tenant-„Mandant" (Super-Admin).** → **Workspace** (nicht
   „Tenant"/„Organization"). Konsequenz: die Scanner-Ausnahme `WORKSPACE_MANDANT`
   wird **umbenannt/ersetzt** — konkret **entfällt sie**, „Mandant" wandert in
   `GLOBAL` (§5), Super-Admin-Copy heißt „Workspace".

2. **OQ2 — CV-Sektions-Heads.** → **Parametrisieren** (EN/DE via `detectLanguage`),
   nicht hart lassen. Ein englischer CV zeigt englische Heads (§3.3).

3. **OQ3 — Agent-Sprache.** → `chat-agent.ts summarizeRun` und
   `agent-fake-provider.ts`-Antwort **fest englisch**. Erzeugte Artefakte
   (CV/Anschreiben/Pitch) folgen weiter der Anzeigensprache (FR-42). Keine
   Feature-Flags (wäre i18n-Infra).

4. **OQ4 — Demo-Seed-Namen.** → **Englisch klingend** (`Max Mustermann`/
   `Beispiel GmbH`/`Musterstadt` umstellen). DE-Erkennung wird durch dedizierte
   `language.test.ts`-Fälle abgedeckt, nicht durch Seed-Daten.

5. **OQ5 — Vermittler-/Agency-Ansichten.** → **Jetzt mit-übersetzen** (ein PR,
   konsistent „kein Mischmasch"). Kein deutsches Copy im Bundle, auch nicht hinter
   dem `vermittlung`-Schalter; Scanner/Allowlist/Testumfang entsprechend erweitert.

---

## 8. Doku-Sprache (Begründung für Entscheidung 8)

Empfehlung, im ADR-0064 festgehalten:

- **Neue dauerhafte Doku englisch** (ADR-0064, geänderte
  `requirements.md`/`architecture.md`-Abschnitte, `CHANGELOG`-Einträge) — sie ist
  Teil eines „English-only"-Produkts und wird von einer internationalen Zielgruppe
  gelesen; sie neu deutsch zu schreiben wäre die nächste „Mischmasch"-Schuld.
- **Bestehende deutsche ADRs (0045–0063) und Phase-Pläne bleiben** — ADRs sind
  historische Entscheidungsprotokolle; eine retrospektive Übersetzung wäre ein
  unverhältnismäßiger, reviewer-intensiver Diff ohne Produktnutzen und würde die
  Nachvollziehbarkeit („warum wurde so entschieden") nicht verbessern. Die
  englischen Entsprechungen der ADR-0057-Begriffe werden **additiv** dokumentiert:
  ADR-0064 referenziert ADR-0057 §Decision 3 und ergänzt die Spalte „Englisch".
- **Dieser Plan** bleibt in der Sprache der bestehenden `docs/plans/phase-*.md`
  (deutsch), weil er ein transienter Implementierungs-Artefakt in einer
  durchgängig deutschen Plan-Reihe ist; eine einzelne englische Datei in der
  Reihe wäre selbst ein Mischmasch. (Falls der Owner die Plan-Reihe ab Phase 7
  auf Englisch umstellen will, ist das eine triviale, hier bewusst nicht
  vorweggenommene Entscheidung.)

---

## 9. AK-Matrix

| AK     | Kriterium (Kurzform)                                                                                                | Beleg                                                                                                                                |
| ------ | ------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| AK-7.1 | Kein deutsches UI-Fragment; Scanner-Guard grün (Positiv-Guard pinnt englische Labels)                               | `terminology.test.js`; `terminology-allowlist.json` nur begründete Einträge                                                          |
| AK-7.2 | Begriffskarte durchgängig (Candidate/Jobs/Applications/Agency/Mandate/Workspace/Dossier/Cover letter)               | Vitest (`workspace-nav`, `bewerbungen-ui`, `job-postings-ui`, `super-admin-ui`, Agency-Suiten, …), e2e, Scanner                      |
| AK-7.3 | Keine i18n-Infrastruktur (kein `locale`, keine Lib, keine Kataloge, keine Flags)                                    | Diff ohne `locale`/`i18n`/`lingui`/`i18next`; `package.json` unverändert                                                             |
| AK-7.4 | Server problem+json-Details englisch (inkl. `AI_CONSENT_REQUIRED_DETAIL`, `FrozenError`); Agent-Texte fest englisch | `problem.test.ts` + angepasste Jest-Suiten; Dedup-Test Server↔Client byte-identisch (Hygiene)                                        |
| AK-7.5 | Dokument-Default `en` (Fallbacks + `emptyLetter` + Client-Defaults); CV-Heads EN/DE; Inhalt bleibt per-Anzeige      | Jest `language`/`talent-documents`-Tests + Dedup Client↔Server; Regressionstest „deutsche Anzeige → deutsches Dokument"              |
| AK-7.6 | Mails englisch (Verifikation/Reset)                                                                                 | Mail-Konstanten-Test; kein deutsches Fragment in festen Templates                                                                    |
| AK-7.7 | README englisch + Galerie mit englischer UI neu erzeugt                                                             | 8 PNGs in `docs/images/` aktualisiert; `scripts/capture-…`-Selectoren englisch                                                       |
| AK-7.8 | Neue Doku englisch, ADR-0057-Begriffe um englische Spalte ergänzt (ADR-0064)                                        | `docs/adr/0064-*.md`, `docs/adr/README.md`, `docs/requirements.md` FR-73/FR-42; **manueller Beleg** (docs:check prüft keine Sprache) |
| AK-7.9 | `./test.sh` grün + `npm run test:e2e` grün; Coverage Statements ≥ 90 %, Branches ≥ 90 %                             | `test.sh`-Ausgabe; Jest-Coverage-Report; Playwright-Report                                                                           |

---

## 10. Testplan (Kurzform)

Namensschema `Subject_StateUnderTest_ExpectedBehaviour`, AAA. Schwellen unverändert.

- **Unit (Vitest, `UI/__tests__/`)**: `terminology.test.js` (geschärft, §5);
  alle 22 Dateien mit deutschen Assertions auf englisch umstellen (inkl. Agency-/
  Super-Admin-Suiten); neue Fälle für Positiv-Guard und Allowlist-Begründung.
- **Unit (Jest, `server/__tests__/unit/`)**: `problem.test.ts` (englische
  Details), `workspace-settings.test.ts` (kanonischer String),
  `language.test.ts`/`talent-documents.test.ts` (Default `en`, `emptyLetter`
  englisch), `job-application-service.test.ts` (englische Noten/Fehler); Dedup-Tests
  „`AI_CONSENT_REQUIRED_DETAIL` ≡ `AiConsentRequiredError` ≡ `data.js`-Konstante"
  und „`emptyLetter` ≡ `Editor.jsx`-Default".
- **Acceptance (Jest, `server/__tests__/acceptance/`)**: `nest-job-applications`,
  `nest-import-mode` auf englische problem+json-Details anpassen; `nest-ai-consent`
  zieht mit `AI_CONSENT_REQUIRED_DETAIL` mit (prüfen); `legacy-application-migration`
  bleibt unverändert (prüfen, keine deutsche Assertion).
- **e2e (Playwright)**: `ui.spec.ts`, `mobile.spec.ts`, `golden-path.spec.ts`,
  `consent.spec.ts`, `button-audit.spec.ts` — ≈ 100–110 deutsche Selektoren →
  englisch (inkl. `getByPlaceholder`); Mock-Namen (`Tobias Wirth` …) bleiben.
- **Manuell**: Screenshot-Re-Capture (§3.7, blockt auf OQ-3) + Sichtkontrolle;
  `./test.sh` + `npm run test:e2e` lokal; AK-7.8 (neue Doku englisch) manuell.

---

## 11. Umsetzungsreihenfolge (Kurzfassung)

0. Begriffskarte + Scanner schärfen (bekannter roter Canary, Variante b) →
1. Server problem+json + Agent-Texte englisch → 2. Dokument-Default `en` +
   CV-Heads EN/DE → 3. UI-Kit + Agency-Views übersetzen + Vitest (**blockt auf 1**) →
2. e2e englisch → 5. Seed/Demo (Namen OQ-4) + Mails → 6. README + Screenshots
   (**blockt auf OQ-3**) → 7. Doku/ADR + Gate.

**Gate-Regel:** Etappen 0–3, 5–7 enden mit `./test.sh` grün (format:check, lint,
docs:check, test:web, test) — **mit einer** benannten Ausnahme: Etappe 0 endet mit
dem bewusst-roten Scanner-Canary (alle übrigen Prüfungen grün). Etappe 4 endet mit
`npm run test:e2e` (= `playwright test`) grün; **e2e ist nicht Teil von `test.sh`**.
Etappe 7 endet zusätzlich mit `npm run test:e2e` grün und dem manuellen
AK-7.8-Beleg.
