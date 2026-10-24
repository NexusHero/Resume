# ADR-0063 — KI-Einwilligung: Consent-Gate vor der ersten Übermittlung an den zentralen KI-Anbieter

- **Status:** Proposed
- **Requirements:** FR-105 (neu, Phase 6); baut auf FR-70/71 (zentraler Key, kein Template-Fallback), FR-89–FR-94 (Magic Pen), FR-99–FR-104 (Chat-Agent) auf
- **Relates to:** ADR-0012 (zod + RFC-9457), ADR-0018 (KI-Audit-Trail), ADR-0047 (nie still scheitern), ADR-0051 (Nest am Rand), ADR-0057 (Produkt-Schwenk, zentraler Key, `vermittlung`-Schalter als Workspace-Setting), ADR-0058–0062 (Stellen, Bewerbung, Magic Pen, Mappe, Agent)

## Context

Der Hauptweg sendet bei jeder generativen Aktion personenbezogene Daten — den
Lebenslauf des Mandanten und den Anzeigentext — an einen Drittanbieter (Anthropic
Claude bzw. Google Gemini, zentraler Key aus ADR-0057). Bisher geschieht das **ohne
ausdrückliche Einwilligung**: Sobald ein Key gesetzt ist, übermittelt jede KI-Route
(und jede Magic-Pen-/Anschreiben-/Agent-Runde) die Daten still. Für eine
„vorzeigbare" Instanz ist das eine Lücke gegen Art. 13 EU AI Act (Transparenz),
Art. 14 (menschliche Aufsicht) und die DSGVO (Art. 6/13/14): Der Betreiber des
Workspaces muss **wissen und bestätigen**, dass CV-Daten den Workspace verlassen,
bevor es das erste Mal passiert.

Drei Kräfte entscheiden die Form:

1. **Einwilligung ist eine Workspace-Eigenschaft, keine Nutzer-Eigenschaft.** Die
   betroffenen Daten gehören dem **Mandanten** (die Person, für die beworben wird),
   nicht dem angemeldeten Nutzer. Der Betreiber des Workspaces entscheidet die
   KI-Politik — dieselbe Ownership, die ADR-0057 für den zentralen Key und für den
   `vermittlung`-Schalter festgelegt hat. Eine Einwilligung **pro Nutzer** wäre das
   falsche Subjekt und würde den Workspace-Betreiber um seine Kontrolle bringen.
2. **Die UI allein reicht nicht.** Der Agent läuft serverseitig und der Nutzer
   kann die UI umgehen. Ehrlich ist nur eine **serverseitige** Sperre, die eine
   Übermittlung unmöglich macht, solange nicht eingewilligt wurde — analog zu
   `AiConfiguredGuard` (503 ohne Key) und `VermittlungGuard` (404 ohne Schalter).
3. **Konsistenz mit dem Schalter-Muster.** ADR-0057 hat den `vermittlung`-Schalter
   als `WorkspaceSettings`-Feld mit Standard **aus** (auch für bestehende
   Workspaces, „kein automatischer Backfill") eingeführt. Die Einwilligung folgt
   exakt diesem Muster: ein Feld, Standard aus, Server erzwingt, UI spiegelt.

## Decision

1. **`WorkspaceSettings.aiConsent: boolean` (Standard `false`).** Ein neues Feld auf
   dem bestehenden, scope-keyed `WorkspaceSettingsStore` (fs + sql, ADR-0057).
   **Keine neue Tabelle, keine DDL**: `workspace_settings.settings` ist bereits ein
   `jsonb`/JSON-Objekt, das das ganze `WorkspaceSettings`-Shape trägt; `withDefaults`
   ergänzt fehlende Felder automatisch. `DEFAULT_WORKSPACE_SETTINGS` wird um
   `aiConsent: false` erweitert; bestehende Workspaces **erben** `false` (kein
   Grandfathering) — bewusst, weil (a) das Produkt vor Launch steht und keine
   echten Bestandskunden betroffen sind, (b) eine ausdrückliche Einwilligung der
   rechtlich ehrliche Default ist und (c) es konsistent zu ADR-0057 ist („default
   off, kein Backfill"). Die Einwilligung ist **widerrufbar** (dasselbe PATCH
   `aiConsent: false`); nach Widerruf antworten die KI-Routen wieder 403.

2. **Serverseitige Sperre: neuer marker-basierter `AiConsentGuard` mit
   `@RequiresAiConsent()`, Fehler 403 `ai-consent-required`.** Muster exakt wie
   `AiConfiguredGuard`/`VermittlungGuard`: der Marker liegt auf der Methode, der
   Guard auf der Klasse, er liest den gestempelten Scope (`currentScope`) und fragt
   `WorkspaceSettingsService.isAiConsentGranted(scope)`. Ohne Einwilligung wirft er
   `AiConsentRequiredError` (neuer `DomainError`, Status **403**, `type
   'ai-consent-required'`, Name `AiConsentRequired`).

   **403 statt 409:** 403 „authentifiziert, aber für diese Aktion nicht
   zugelassen" passt semantisch (die Übermittlung ist nicht erlaubt, bis
   eingewilligt wird); 409 „Zustandskonflikt, mit Retry lösbar" wäre irreführend.
   403 ist außerdem der bereits etablierte Status für „nicht erlaubt" in diesem
   Repo (Role-Authorizer beim `vermittlung`-Toggle). 404 scheidet aus, weil die
   Route **existiert** — sie ist nur (noch) nicht freigegeben.

3. **Guard-Reihenfolge: `Auth → [VermittlungGuard 404 auf Vermittler-KI-Routen] →
   AiConfiguredGuard (503) → AiConsentGuard (403) → AiRateLimitGuard (429) →
   PlanGuard (402)`.** Der fehlende Key (503) ist die operational grundlegendere
   Blocker-Meldung und bleibt **vor** der Einwilligungs-Prüfung; erst wenn ein Key
   da ist, wird die Einwilligung relevant. Beide laufen vor dem Rate-Limit. Die
   **Vermittler-KI-Routen** (K01–K08, K10/K11) tragen `VermittlungGuard` **vor**
   `AiConfiguredGuard` und antworten bei ausgeschalteter Vermittlung weiterhin mit
   **404** (AK-0.2 bleibt intakt, 404 **vor** 403); die **Hauptweg-KI-Routen**
   (K09, K12–K19) haben keinen `VermittlungGuard`. Der Consent-Guard trägt den
   Marker `@RequiresAi()` **zusätzlich** zu `@RequiresAiConsent()` auf denselben
   Methoden: die 19 generativen Routen K01–K19 sind dieselbe Menge.

4. **CV-Import (T01–T03) wird nur dann gesperrt, wenn er wirklich übermittelt.**
   `parse`/`parse-pdf`/`import` haben **keinen** KI-Guard, weil sie ohne Key als
   benannte Text-Übernahme laufen (ADR-0057, kein Template-Fallback). **Mit** Key
   senden sie den CV an das Modell (`mode: 'ai'`) — genau dann muss die
   Einwilligung vorliegen. Deshalb prüft der Parse-Service **konditional**: nur
   wenn `llm.hasAvailableProvider()` gilt **und** keine Einwilligung vorliegt,
   wirft er `AiConsentRequiredError` (403); ohne Key läuft die Text-Übernahme
   unverändert (keine Übermittlung, keine Einwilligung nötig). Diese Asymmetrie
   wird durch je einen Test belegt, damit sie nicht „aus Versehen" vereinheitlicht
   wird (Muster ADR-0060, Letter-vs.-CV-Grounding).

5. **UI: ein Banner/Dialog pro Workspace, nicht pro Aktion.** Die Einwilligung ist
   global; sobald sie erteilt ist, fragt keine KI-Aktion mehr. Vor der **ersten**
   KI-Aktion bei `aiConsent === false` zeigt die UI einen Einwilligungs-Dialog
   (deutscher, EU-AI-Act-konformer Text, s. Plan §3.4). Einstiegspunkte: der
   Bewerbungs-Editor („Anschreiben generieren", „Alles anpassen", Magic Pen), der
   Basis-Editor („KI anpassen") und das Chat-Panel (Agent). Die UI liest
   `aiConsent` über `GET /settings/workspace` (dieselbe Quelle wie `vermittlung`,
   nie aus dem Login) und setzt es über `PATCH /settings/workspace`. Die
   Einwilligung ist **admin-gated** (Owner-Entscheidung, verbindlich): `PATCH
   /settings/workspace` mit `aiConsent` läuft durch denselben Role-Authorizer wie
   der `vermittlung`-Toggle — ein Nicht-Admin, der es setzen will, erhält **403**
   (`forbidden`), und in der UI erscheint statt des Konsens-Dialogs der Hinweis
   „Bitte deinen Workspace-Admin um Freigabe". Die Anzeige eines
   erteilten/widerrufenen Zustands liegt in den Einstellungen (Abschnitt
   „KI-Anbindung"), inkl. Widerruf.

6. **Dokumentation der Transparenzpflicht.** `docs/eu-ai-act.md` erhält eine Zeile
   „informierte Einwilligung vor der ersten Übermittlung" (Art. 13/14) mit Verweis
   auf dieses ADR; der Dialog-Text nennt Empfänger (Anthropic/Gemini), Zweck
   (Unterstützung beim Bewerben), Umfang (CV + Anzeigentext), den
   Hochrisiko-Charakter (EU AI Act Anhang III) und den Widerrufsweg.

## Consequences

- **Ehrlichkeit:** Ohne Einwilligung ist die Übermittlung technisch unmöglich
  (403 vor dem Handler), nicht nur im UI versteckt. Die Einwilligung ist widerrufbar
  und der Widerruf wirkt sofort (die Guard prüft bei jedem Request den aktuellen
  Stand). Kosten: ein neues `WorkspaceSettings`-Feld, ein neuer Guard, der auf
  5–6 KI-Controllern verdrahtet wird, und die konditionale Prüfung im Parse-Service.
- **Kein Datenmodell-Aufwand:** `aiConsent` lebt im bestehenden
  `workspace_settings.settings`-`jsonb`; keine Migration, kein Backfill, keine neue
  Tabelle. fs- und sql-Adapter verhalten sich identisch (die Store-Schnittstelle ist
  generisch über `WorkspaceSettings`).
- **Grandfathering bewusst verneint:** Bestehende Workspaces (Phasen 0–5) müssen
  nach dem Update **einmal** einwilligen, bevor KI wieder läuft. Das ist der
  beabsichtigte, rechtlich ehrliche Default (wie `vermittlung` default off);
  im Changelog angekündigt. Der Demo-Seed lässt `aiConsent` bewusst **unset**, damit
  der 5-Minuten-Rundgang die Einwilligung als echten Schritt **vorführt**.
- **Drift-Wächter:** `route-inventory.ts` erhält neben `AI_ROUTES` eine neue
  `AI_CONSENT_ROUTES`-Menge (K01–K19 = dieselben Wege) plus einen Drift-Test, der
  belegt, dass **jede** generative Route den Consent-Guard trägt — eine KI-Route,
  die ohne Guard hinzukommt, fällt im Test durch (Muster `AI_ROUTES`-Zählung).
- **Der Agent ist mitgemeint:** `POST /agent/chat` (K19) ist eine generative Route
  und trägt den Consent-Guard; das Chat-Panel zeigt denselben Einwilligungs-Dialog
  wie der Editor. Der Dev-only `AGENT_FAKE`-Pfad bleibt **hinter** dem Consent
  (auch die Fake-Schleife übermittelt nur nach Einwilligung — die Guard prüft den
  Scope, nicht den Provider).
- Reversal ist günstig (Feld + Guard + Schema-Erweiterung entfernen); teuer wäre
  nur ein späteres Umstellen auf eine per-Nutzer-Einwilligung, das die
  Store-Key-Struktur (scope-keyed) ändern müsste — bewusst abgelehnt.
