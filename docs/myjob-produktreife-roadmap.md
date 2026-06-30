# myJob — Roadmap zur Produktreife

> Status: Plan · Zielbranch: `claude/broker-software-ui-feedback-jzxu6y`
> Kontext: Überführung der myJob-Vermittler-App vom Design-Prototyp zum
> produktreifen Recruiting-Produkt für den DACH-Markt.

Dieses Dokument bündelt alle besprochenen Entscheidungen: Build-/Modul-Fundament,
das Design (dunkles „Produkt"-Theme), die SOLID-Befunde, die Anbindung an den
vorhandenen `server/`, Auth/DSGVO, Tests/CI **und** die Entkopplung des
Lebenslauf-Designs von myJob.

---

## 1. Ausgangslage

myJob besteht heute aus zwei Schichten gegensätzlicher Reife:

- **Design-System** (`design/myjob/components`, `tokens`) — gut, fast vorbildlich:
  Primitive + Presets (`Badge` → `MetaPill`/`StatusBadge`), Token-Layer,
  Theming per `data-theme`, `.d.ts`-Typen, Adhärenz-Linter, dokumentierte
  Decisions.
- **Lauffähige App** (`design/myjob/ui_kits/recruiting`) — Prototyp-Niveau:
  - `window.*`-Globals als Modulsystem (`window.MyJobDesignSystem_f3658e`,
    `window.TALENTS`, `Object.assign(window, …)`, `<window.App/>`).
  - Runtime-Babel + React-Dev-Build vom CDN (`@babel/standalone`).
  - Kein Build, keine Tests, kein TypeScript auf App-Ebene.
  - Inline-Styles (v. a. `VermittlerViews.jsx`); Datenaufbereitung in den Views.
  - `data.js` ist hartkodierter Mock; **keine** Anbindung an den sauberen
    `server/` (hexagonal: `domain`/`ports`/`adapters`/`services`/`container.ts`).

Ziel: die App auf das Niveau von Design-System und `server/` heben.

---

## 2. Architektur-Entscheidungen (ADRs)

### ADR-1 — Backend: vorhandenen `server/` ausbauen
Statt eines neuen .NET-Backends oder BaaS wird der bereits saubere Node/TS-
Hexagonal-Server erweitert. Begründung: geringstes Risiko, vieles ist da
(Postgres-Storage via `STORE=sql`, `openapi.yaml`, Playwright, CI). Es fehlt die
**Recruiting-Domäne** (Clients, Mandate, Talente, Placements) als
Entitäten/Ports/Adapter.

### ADR-2 — Zwei Design-Systeme, verbunden durch einen Datenvertrag
myJob (Produkt) und Lebenslauf (Dokument) werden **nicht** über gemeinsame
Tokens gekoppelt, sondern nur über **Daten**. Das Talent-JSON
(`resume`, `letter`, `attachments` aus `data.js`) ist bereits dieser Vertrag.
Siehe Abschnitt 4.

### ADR-3 — Build/Module: Vite + TypeScript + ESM
`window.*`-Globals → `import`/`export`. Runtime-Babel/CDN raus. `_ds_bundle.js`
wird durch ein importierbares Design-System-Paket abgelöst. `.jsx` → `.tsx`.

---

## 3. Die zwei Design-Systeme

### 3.1 myJob — Produkt-Theme (App)
- **Dunkle, geschichtete App-Fläche** (Hintergrund → Karte → erhöhte Karte) statt
  hellem „paper".
- **Warmer Amber-Akzent** als Default (Signal-Richtung), sparsam gesetzt:
  Primär-Button, aktives Nav, Match-Ring, *eine* KPI.
- **Genau ein** radialer Glow oben rechts (nur Dark).
- Light bleibt der ruhige Modus; Rail bleibt dort ink.
- Regel gegen Überladung: nur ein Gradient, Status bleibt 3-Farben-System
  (neutral/grün/rot), eine ruhige Einblendung + Hover-Lift, großzügiger Weißraum.
- Umsetzung: neue Werte in `tokens/themes.css`; Inline-Styles → Token-Klassen.

### 3.2 Lebenslauf — Dokument-Design (eigenständig)
- Behält eigene Identität: helles Papier, eigene Typo, Druck-/PDF-Layout,
  EN/DE, eigener Akzent.
- Bleibt eigenständig nutzbar (eigene Bewerbungen) und unabhängig versioniert.

---

## 4. Dossierbearbeitung bei entkoppeltem Lebenslauf-Design

**Prinzip: „App rahmt Dokument" — Design getrennt, Daten geteilt.**

### Ablauf
1. Vermittler öffnet ein Talent → Profil in myJob-Produkt-Design (dunkel).
2. Klick auf **„Dossier bearbeiten"** → Canvas wechselt in den Dokument-Modus.
3. Oben eine schlanke **myJob-Aktionsleiste** (Zurück · Speichern · PDF · EN/DE ·
   Dokument-Theme). Die **Bearbeitungsfläche ist der Lebenslauf in seinem eigenen
   Design** (helles Blatt, WYSIWYG = späteres PDF).
4. **Speichern** gibt das aktualisierte JSON zurück; myJob persistiert via
   `server/` und archiviert das PDF (`/api/build` existiert bereits).

### Technische Isolation
- **Empfohlen: iframe.** Das `cv/`-Kit ist „fully self-contained single file" →
  ideal einbettbar. Harte CSS-Isolation, Kommunikation per `postMessage`
  (Daten rein → geändertes JSON + PDF raus).
- Alternative: Shadow DOM / gescopte Token-Grenze (`<div data-design="document">`),
  die CV-Tokens nur in diesem Teilbaum setzt.

### Datenvertrag (Boundary)
```
Talent
 ├─ resume       (Lebenslauf-JSON)
 ├─ letter       (Anschreiben-JSON)
 └─ attachments  (Zeugnisse/Zertifikate)
```
myJob kennt nur diesen Vertrag, nicht das CV-Rendering → sauberes SRP/DIP.
Geteilte TS-Typen (`@myjob/contracts`) sichern beide Seiten ab.

### Alternative B (nur falls maximale Codebase-Trennung gewünscht)
„Dossier bearbeiten" öffnet den Lebenslauf als komplett eigene Editor-App
(eigene Route/Tab); myJob verlinkt und speichert nur das Ergebnis. Klarste
Trennung, aber Kontextwechsel für den Nutzer.

---

## 5. Maßnahmen nach Phasen

Priorität: **P0** = Blocker für Produktreife, **P1** = nötig, **P2** = Feinschliff.

### Phase 0 — Fundament: Build & Module (P0)
- [ ] Vite + TS + ESM-Projekt unter `app/myjob/` (eigenes `package.json`,
      `tsconfig`, `vite.config`).
- [ ] `window.*` → `import`/`export` durchgängig ersetzen.
- [ ] Runtime-Babel & CDN-Skripte entfernen; React/ReactDOM als npm-Dependency,
      Produktions-Build.
- [ ] `_ds_bundle.js` → importierbares Paket `@myjob/ds`.
- [ ] `.jsx` → `.tsx` (Start: vorhandene `.d.ts`).

### Phase 1 — Design produktreif (P0/P1)
- [ ] Dunkles Produkt-Theme als echte Tokens in `tokens/themes.css`
      (Amber-Default, geschichtete Fläche, ein Glow).
- [ ] Inline-Styles auflösen (v. a. `VermittlerViews.jsx`) → Token-Klassen.
- [ ] A11y: Kontrast AA (Amber auf dunkel), Fokus-Ringe,
      `prefers-reduced-motion`.
- [ ] Responsiv: `tabs`-Posture (Mobile) im `AppShell` aktivieren.
- [ ] UI durchgängig Deutsch (Overview→Übersicht etc.).

### Phase 2 — Architektur / SOLID (P1)
- [ ] Daten-/Domänenschicht von Views trennen (Selektoren/View-Models:
      `feeNum`, `perClient`-Aggregation, Funnel).
- [ ] Routing als Registry statt `if/else` in `app.jsx` (open-closed).
- [ ] `app.jsx` entlasten (Routing/State/View-Auswahl entkoppeln).
- [ ] Server-State mit TanStack Query (Muster wie im EWA-Frontend).
- [ ] Typsicherer API-Client aus `server/openapi.yaml` (`openapi-typescript`).

### Phase 3 — Backend & echte Daten (P0)
- [ ] `data.js`-Mock entfernen; UI an `server/` anbinden.
- [ ] Recruiting-Domäne im `server/` ergänzen: Clients, Mandate, Talente,
      Placements (Entitäten + Ports + Adapter + `container.ts`).
- [ ] Persistenz produktiv: `STORE=sql` + Postgres scharf schalten.
- [ ] CRUD, das speichert: „Neues Mandat", „Bewerbung hinzufügen",
      Statuswechsel.
- [ ] Dossier-Boundary: `/api/build` + Talent-JSON-Persistenz an den
      Dokument-Editor anbinden (Abschnitt 4).

### Phase 4 — Auth, Sicherheit, Datenschutz (P0)
- [ ] Login/Session + Mandantenfähigkeit (Daten-Isolation pro Nutzer/Agentur).
- [ ] **DSGVO** (hart erforderlich — Talente = personenbezogene Daten):
      Rechtsgrundlage/Einwilligung, Löschkonzept/Aufbewahrungsfristen,
      Auskunft/Export, AV-Verträge, Verschlüsselung at-rest.
- [ ] LLM-Keys serverseitig sicher; nie im Client.
- [ ] Security-Header, Input-Validierung, Rate-Limiting (Muster aus EWA).

### Phase 5 — Qualität & Auslieferung (P1)
- [ ] Tests: Vitest (Unit/Komponenten) + Playwright E2E (bereits konfiguriert).
- [ ] CI in `.github` (Lint, Typecheck, Test, Build) — Vorlage aus EWA.
- [ ] Loading-/Empty-/Error-States überall.
- [ ] Deployment: Dockerfile, Env-Konfiguration, Logging/Observability.

### Phase 6 — Feinschliff (P2)
- [ ] A11y-Audit, Performance (Bundle, Lazy-Loading je Route).
- [ ] Vollständige i18n-Infrastruktur, Nutzer-Doku.

---

## 6. Definition of Done (Produktreife)

- [ ] Kein `window.*`-Global, kein Runtime-Babel — echter Vite/TS-Build.
- [ ] Daten aus dem Backend mit echter Persistenz, kein Mock.
- [ ] Auth + Daten-Isolation pro Nutzer.
- [ ] DSGVO-konformer Umgang mit Kandidatendaten.
- [ ] Dunkles Produkt-Theme als Token-System, Light/Dark, AA-Kontrast, responsiv.
- [ ] Lebenslauf-Design entkoppelt; Dossierbearbeitung über Datenvertrag.
- [ ] Views präsentational, Logik in Selektoren; Routing als Registry.
- [ ] Tests (Unit + E2E) grün in CI.
- [ ] Deploybar (Docker/Env), Logging vorhanden.

---

## 7. Risiken & offene Punkte

- **Zwei Design-Systeme pflegen** — bewusst gewählt (sollen divergieren); Preis
  ist ein stabiler Datenvertrag + Integrations-Glue (iframe/postMessage).
- **DSGVO** kann je nach Geschäftsmodell (eigene Vermittlung vs. SaaS für andere)
  unterschiedlich streng sein — vor Phase 4 klären.
- **Mandantenmodell**: Einzel-Vermittler vs. Agentur mit mehreren Nutzern — legt
  Daten-Isolation und Auth-Tiefe fest.
- **Scope**: vollständiges Produkt vs. MVP-Kern (z. B. Mandate + Talent-Pool +
  Auth zuerst) — beeinflusst Reihenfolge von Phase 3/4.

---

## 8. Empfohlene Startreihenfolge

1. Phase 0 (Gerüst) — schafft die Basis für alles Weitere.
2. Phase 1 (Design-Tokens) — sichtbarer Fortschritt, geringes Risiko.
3. Phase 3 + 4 parallel beginnen (Backend-Domäne + Auth) — der eigentliche
   Aufwand der Produktreife.
4. Phase 2/5/6 begleitend.
