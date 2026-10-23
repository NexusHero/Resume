# ADR-0058 — Stellen speichern: `JobPosting`-Entität (fs+sql), Duplikat-Semantik, SSRF-sicherer URL-Abruf, KI-Feldextraktion

- **Status:** Accepted
- **Requirements:** FR-75 bis FR-80 (neu, Phase 1); baut auf FR-50 bis FR-53 (Job-Suche) auf
- **Relates to:** ADR-0001 (Hexagon), ADR-0003 (fs-Standard, sql optional), ADR-0010/0033 (Team-/Workspace-Scope), ADR-0012 (zod + RFC-9457), ADR-0045 (keine fabrizierten Daten), ADR-0050 (Source-Registry), ADR-0051 (Nest am Rand), ADR-0057 (Produkt-Schwenk, zentraler Key)

## Context

Der Bewerbungsservice braucht eine **Stelle** als eigene, dauerhaft gespeicherte Entität:
eine Person übernimmt eine Anzeige aus der Portal-Suche oder fügt sie per URL bzw. Text
ein, sieht sie in einer Liste mit Detailansicht und erzeugt daraus später (Phase 2) eine
Bewerbung. Die bestehende Job-Suche (`JobSource`, ADR-0045/0050) liefert **flüchtige**
Suchergebnisse: `Job` hat nur einen gekürzten `snippet`, keinen vollen Anzeigentext, keinen
Persistenz-Port und keinen Scope. Drei Dinge stehen im Weg:

1. **Es gibt keinen Speicher.** Ein „Stelle übernehmen“ braucht einen `JobPosting`-Port mit
   fs- und sql-Adapter (ADR-0003), workspace-gebunden (ADR-0010/0033). Die Übernahme darf
   **kein** KI-Schritt sein: Die Felder kommen aus der Quelle, nur der volle Text fehlt.
2. **Der volle Anzeigentext ist pro Quelle unterschiedlich zu holen.** Arbeitnow liefert ihn
   schon in der Suche, die Bundesagentur erst über einen Detail-Abruf, Adzuna oft nur
   gekürzt. „Stelle einfügen per URL“ ruft außerdem eine **beliebige, vom Nutzer eingegebene
   URL** ab — das ist die erste SSRF-gefährdete Fläche des Produkts (ADR-0049 hat die
   Betreiber-konfigurierten Boards abgehärtet, aber keine Nutzer-URLs).
3. **„Einfügen per Text/URL“ braucht Feld-Extraktion.** Ohne zentralen Key gibt es laut
   ADR-0057 **keinen** Template-/Deterministik-Fallback. Offen ist, ob der Weg ohne Key
   überhaupt begehbar sein soll.

## Decision

1. **Neue Entität `JobPosting`** („Stelle“) mit eigenem Port und je einem fs- und
   sql-Adapter, workspace-gebunden über `ownerId` (= der Workspace-Scope, wie bei jeder
   anderen Entität). Felder: `id`, `ownerId`, `source`, `sourceId?`, `url?`, `company`,
   `title`, `location`, `country`, `description` (voller Anzeigentext), `requirements[]`
   (Skills/Anforderungen), `descriptionIncomplete` (AK-1.2), `createdAt`. Die Portal-Suche
   (`/jobs`) bleibt unverändert und flüchtig.

2. **Duplikat-Semantik im Service, nicht als einzige Schranke.** Ein Posting ist ein
   Duplikat, wenn innerhalb desselben Workspaces `(source, sourceId)` (sofern `sourceId`
   vorhanden) **oder** `url` (sofern vorhanden) gleich ist. Die URL wird **einmal im
   Service** normalisiert (flach: Fragment, Trailing-Slash, Host-Case) und **normalisiert
   gespeichert**; beide Adapter vergleichen roh, sodass auch die Unique-Indizes
   normalisierungsgleiche URLs abdecken. Der `JobPostingService` prüft das **vor** dem
   Einfügen und liefert bei Treffer das bestehende Posting zurück (idempotent: HTTP 200 mit
   `alreadySaved: true`, die UI zeigt „Bereits gespeichert → öffnen“). Postgres bekommt
   zusätzlich **partielle Unique-Indizes** als Rennsituation-Rückhalt
   (zwei gleichzeitige Übernahmen); der sql-Adapter fängt den Unique-Verstoß und liefert
   ebenfalls das bestehende Posting. Der fs-Adapter hat nur die Service-Prüfung — fs ist
   Einzelinstanz, und ein Duplikat ist dort ein Datenqualitäts-, kein Sicherheitsproblem.
   Quellen-übergreifende Duplikate (dieselbe Anzeige bei Bundesagentur **und** Arbeitnow)
   werden **nicht** erkannt; das ist bewusst außerhalb des Scope (Risiko RI4).

3. **SSRF-sicherer URL-Abruf als eigene, schlanke Implementierung + `ipaddr.js`.**
   Nur `http:`/`https:`; der Host wird serverseitig per `dns.promises.lookup(host, { all: true })`
   aufgelöst und **jede** aufgelöste Adresse gegen private/link-local/loopback/weitere
   Sonderbereiche geprüft (auch IPv4-mapped IPv6, `0x7f000001`, `2130706433`, `127.1`).
   Redirects werden mit `redirect: 'manual'` selbst verfolgt, **jeder** Hop erneut geprüft,
   Anzahl begrenzt; Größen- und Zeitlimit per `AbortController`/Streaming. Gegen
   DNS-Rebinding wird auf die **geprüfte IP** verbunden (undici `Agent` mit `connect`), mit
   dem ursprünglichen `Host`-Header. Die IP-Klassifikation übernimmt `ipaddr.js`
   (bewährte IPv4/IPv6/Mapped-Arithmetik); die Orchestrierung (Schema-Whitelist, Redirects,
   Limits, Fehler-Modell) ist eigene, exhaustiv getestete Logik, weil eine Fertig-Lib den
   HTTP-Client ersetzen und mit der Per-Hop-Prüfung kollidieren würde. Die Größen-,
   Zeit- und Redirect-Limits sind **Env-konfigurierbare Betriebsparameter** mit sicheren
   Defaults im Code (Ownergesteuert, Q5), nicht fest verdrahtet; die IP-Klassifikation und
   die Per-Hop-Prüfung bleiben unverändert.

4. **Feld-Extraktion als neues KI-Feature** über den bestehenden `LlmFeatureRunner`
   (Prompt + zod-Schema, neues `UsageFeature`). **Ohne Key antworten „Einfügen per Text“
   und „per URL“ mit 503 `ai-not-configured`** — es gibt **keinen** deterministischen
   Parser und **keinen** Rohtext-Fallback. Begründung: Anders als beim CV-Import (ADR-0057,
   benannter „Text übernehmen“-Modus) ist eine Stelle kein unersetzbarer Rohtext, sondern
   wenige, leicht von Hand eintippbare Felder; und der goldene Pfad bleibt ohne Key über
   **„Stelle übernehmen“** begehbar, das vollständig ohne KI läuft. Ein manuell-anlegen-
   Formular entfällt (entschieden Q1).

5. **„Stelle übernehmen“ holt den vollen Text pro Quelle über einen optionalen Port-Ansatz.**
   Der `JobSource`-Port erhält die optionale Methode `getPosting(sourceId)` (liefert `null`,
   wenn die Quelle keinen Volltext liefert). `CompositeJobSource` delegiert sie an die
   richtige Quelle. Bundesagentur ruft dafür den Detail-Endpunkt auf, Arbeitnow nutzt die
   in der Suche bereits enthaltene Beschreibung, Adzuna/Descriptor-Quellen liefern `null`
   → `descriptionIncomplete: true`, die UI bietet „Text ergänzen“ (AK-1.2). Kein KI-Schritt,
   keine Erfindung von Text (ADR-0045).

6. **Scope-Fix der gespeicherten Suchen (RI15 aus Phase 0).** Die bestehende, instanzweite
   Fläche `/searches` (`SavedSearch`) wird in derselben Phase workspace-gebunden: `SavedSearch`
   erhält `ownerId`, Repository/Service/Controller werden scope-fähig, und der Bestand wird
   auf den Standard-Workspace `team` zurückgefüllt — exakt das Muster, mit dem `applications`
   scope-fähig wurde (ADR-0010/0033).

## Consequences

- Eine Stelle ist eine echte, workspace-gebundene, in beiden Stores identisch verhaltene
  Entität; die Suche bleibt ein davon getrennter, flüchtiger Lese-Pfad. Bewerbung (Phase 2)
  kann auf `JobPosting` verweisen.
- Der SSRF-Schutz ist eine kleine, rein getestete Funktion plus eine bewährte Lib statt
  einer opaken Dritt-Anbindung; die Per-Hop-Prüfung ist testbar und deckt die von AK-1.4
  geforderten Sonderformen ab. Kosten: eigene Wartung der Redirect-/Limit-Orchestrierung.
  Die Limits sind Env-konfigurierbar (mit sicheren Defaults), sodass der Betreiber sie
  ohne Release anpassen kann; die Klassifikation bleibt hart verdrahtet.
- Ohne Key ist „Stelle übernehmen“ vollständig nutzbar, „Einfügen per Text/URL“ bewusst
  gesperrt (ehrliche 503 statt schwacher Extraktion). Das verschärft „kein Key = kein
  Ersatz“ aus ADR-0057, kapselt aber die Ausnahme auf den CV-Import.
- Duplikate werden deterministisch und race-sicher (sql) verhindert; der fs-Pfad verhält
  sich bis auf den (für Einzelinstanz unkritischen) Race-Fall identisch. Quellen-übergreifende
  Duplikate bleiben als bekannte Lücke dokumentiert.
- Der fs-Adapter serialisiert Schreibzugriffe in-process (Mutex), damit read-modify-write
  bei gleichzeitiger Übernahme kein lost update erzeugt; ein instanzübergreifendes Race ist
  bei fs ausgeschlossen. Der Unique-Index-Rückhalt gilt nur für den sql-Pfad.
- Die gespeicherten Suchen (`/searches`) sind nach dem Scope-Fix workspace-gebunden; der
  Bestand gehört dem Standard-Workspace `team`. Damit schließt Phase 1 eine von Phase 0
  offen gelassene Scope-Lücke (RI15), bevor die Suche in der Stellen-Ansicht sichtbar wird.
