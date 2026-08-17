# Mats Denninger — Website

Landingpage für den Zeitgewinn-Check, plus ein Cloudflare Worker, der die
Live-Demo mit Claude versorgt.

| Datei | Zweck |
|---|---|
| `index.html` | Die Landingpage inkl. Demo-Widget |
| `automation.html` | Zweite Design-Variante, aufgebaut wie eine Automation |
| `src/index.js` | Cloudflare Worker, der den Anthropic-Key hält |
| `wrangler.toml` | Worker-Konfiguration |

Das dunkle Farbschema ist der Stand von `main` und bleibt unverändert.

## Zwei Varianten zum Vergleich

Beide Dateien enthalten denselben Text, dieselbe Demo und dasselbe Formular.
Sie unterscheiden sich nur im Aufbau. Bei Vercel erreichbar unter `/` und
`/automation`.

### `index.html` — klassische Landingpage

Abschnitte untereinander, jeder für sich. Das vertraute Muster.

### `automation.html` — die Seite als Ablauf

Die Seite ist selbst als Automation gebaut und führt vor, was verkauft wird:

- **Eine durchgehende Schiene** von oben nach unten verbindet alle Stationen.
  Der Hero ist der **Auslöser** (▶), danach folgen nummerierte Schritte bis zur
  Übergabe.
- **Punktraster im Hintergrund** — das visuelle Erkennungszeichen jedes
  Automations-Editors.
- **Die vier Leistungen sind Knoten** mit Kopfzeile, Statuspunkt und
  Laufzeit-Angabe in Monospace (`TAG 1–2`), verbunden durch Konnektoren, auf
  denen ein Punkt entlangwandert. Der letzte Knoten hat einen grünen Punkt:
  fertig.
- **Der Ist-Zustand ist der Eingang** — die vier Probleme mit Datentypen
  ausgezeichnet (`E-MAIL`, `DOKUMENT`, `STATUS`, `ZEIT`).
- **Die Demo ist die Live-Ausführung** mit Statusanzeige, die von `BEREIT` über
  `LÄUFT` auf `FERTIG` springt.

Die Bewegung auf den Konnektoren und der pulsierende Auslöser-Punkt stehen
still, wenn das Betriebssystem reduzierte Bewegung verlangt.

## Was an dieser Fassung anders ist

### Behobene Fehler

| Was | Warum es ein Problem war |
|---|---|
| Worker lag im falschen Verzeichnis | `wrangler.toml` zeigte auf `src/index.js`, die Datei lag aber im Wurzelverzeichnis. `wrangler deploy` wäre so nie durchgelaufen. |
| Mobile Navigation fehlte | Unter 720px Breite wurden die Menüpunkte ersatzlos ausgeblendet. Besucher am Handy hatten keinen Weg zu Angebot, Ablauf, Demo oder FAQ. Jetzt gibt es einen Menü-Knopf. |
| Formular ohne Rückmeldung | Der Absenden-Knopf öffnete nur ein `mailto:`. Wer kein Mailprogramm eingerichtet hat — bei Webmail der Normalfall — sah gar nichts, und die Anfrage war weg. Jetzt bleibt die Nachricht mit Kopier-Knopf stehen. |
| Anker sprangen hinter die Navigation | Ein Klick auf „Angebot" schob die Überschrift unter die fixe Navigationsleiste. Behoben mit `scroll-margin-top`. |
| Inhalt unsichtbar ohne JavaScript | `.reveal` setzte `opacity: 0` bedingungslos; ohne JavaScript blieb der halbe Seiteninhalt dauerhaft leer. Die Regel hängt jetzt an einer `js`-Klasse. |

### Professionalität

- **Favicon** als Inline-SVG (Monogramm in Gold auf Anthrazit). Kein
  zusätzlicher Request, keine Binärdatei im Repo. Vorher zeigte der Browser-Tab
  das leere Standard-Symbol.
- **Strukturierte Daten** (JSON-LD): `ProfessionalService` mit dem Angebot zu
  2.900 € und eine `FAQPage` aus den sechs echten FAQ-Einträgen. Hilft
  Suchmaschinen und KI-Assistenten, das Angebot korrekt wiederzugeben.
- **Teilen-Vorschau**: Open-Graph- und Twitter-Tags, damit Links auf LinkedIn
  nicht nackt aussehen.
- **Zugänglichkeit**: Sprungmarke zum Inhalt, `<main>` als Landmarke,
  sichtbarer Tastatur-Fokus (`:focus-visible`), `aria-expanded` am Menü-Knopf,
  `prefers-reduced-motion` wird respektiert (auch beim Tipp-Effekt der Demo).
- **Typografie**: ausgewogene Überschriften (`text-wrap: balance`), saubere
  Silbentrennung langer deutscher Wörter auf schmalen Displays.
- **Faktenzeile im Hero**: Festpreis, Dauer, Garantie. Vorher stand der Preis
  erst nach zweimal Scrollen — das kostet genau die Besucher, die schnell
  wissen wollen, ob sie zur Zielgruppe gehören.
- **Formularfelder** mit `autocomplete`, optionales Feld als solches markiert.

## Noch offen

Diese Punkte brauchen eine Entscheidung oder Inhalte, die nur du hast:

1. **Echtes Formular-Backend** statt `mailto:` (Formspree, Web3Forms, Vercel
   Forms). Das ist der größte verbleibende Hebel — `mailto:` verliert Anfragen,
   egal wie gut der Fallback ist.
2. **Impressum und Datenschutz** verlinken auf `#`. Für eine gewerbliche Seite
   in Deutschland ist das nicht optional.
3. **Porträtfoto.** Der Platzhalter mit den Initialen ist bei einem
   Einzelberater das schwächste Element der Seite — ein echtes Foto ist das
   stärkste Vertrauenssignal, das du hast.
4. **`og:image`** braucht ein echtes Bild.
5. **Kanonische URL** (`<link rel="canonical">`), sobald die endgültige Domain
   feststeht.

Bewusst nicht ergänzt: Referenzen und Testimonials. Du hast keine, und
erfundene wären das Gegenteil dessen, was die Seite verspricht.

### Hinweis zu Schriftarten

Die Seite nutzt bewusst die System-Schriftarten des jeweiligen Geräts. Wenn du
später eine eigene Schrift einbinden willst: **nicht** über die Google-Fonts-CDN.
Das Landgericht München hat die Einbindung 2022 als DSGVO-Verstoß gewertet, weil
dabei die IP-Adresse der Besucher an Google übertragen wird. Schrift stattdessen
selbst hosten.

---

# Claude-Proxy — Einrichtung

Dieser Cloudflare Worker hält deinen Anthropic-API-Key. Die Website ruft nur
den Worker auf, nie Anthropic direkt. Damit ist der Key für Besucher
unsichtbar — auch im Quelltext, in den Entwicklertools und im Netzwerk-Tab.

Kosten: Cloudflare Workers sind bis 100.000 Anfragen/Tag kostenlos. Du zahlst
nur die Anthropic-Tokens.

## Einmalige Einrichtung (ca. 10 Minuten)

### 1. Cloudflare-Konto und CLI

Kostenloses Konto auf [dash.cloudflare.com](https://dash.cloudflare.com) anlegen, dann:

```bash
npm install -g wrangler
```

```bash
wrangler login
```

### 2. Speicher für das Rate-Limiting anlegen

```bash
wrangler kv namespace create RATE_LIMIT
```

Der Befehl gibt eine `id` aus. Diese in `wrangler.toml` bei
`HIER_DIE_KV_ID_EINTRAGEN` eintragen.

### 3. Erlaubte Domain eintragen

In `wrangler.toml` bei `ALLOWED_ORIGINS` deine echte Website-Domain eintragen,
zum Beispiel:

```
ALLOWED_ORIGINS = "https://mats-denninger.de,https://www.mats-denninger.de"
```

Nur diese Domains dürfen den Proxy aufrufen. Ohne diesen Eintrag könnte
jemand deine Demo auf seiner eigenen Seite einbinden.

### 4. API-Key als Secret hinterlegen

```bash
wrangler secret put ANTHROPIC_API_KEY
```

Der Key wird abgefragt und verschlüsselt bei Cloudflare gespeichert. Er steht
in keiner Datei und ist danach auch im Dashboard nicht mehr lesbar.

### 5. Veröffentlichen

```bash
wrangler deploy
```

Am Ende erscheint eine URL wie
`https://claude-demo-proxy.dein-name.workers.dev`.

### 6. URL in die Website eintragen

In `index.html` ganz oben im `<script>`-Block:

```js
const WORKER_URL = "https://claude-demo-proxy.dein-name.workers.dev";
```

Solange dort ein leerer String steht, zeigt die Demo automatisch die
vorbereitete Beispiel-Antwort — die Seite funktioniert also auch ohne Worker.

## Lokal testen

```bash
wrangler dev
```

## Eingebauter Schutz

| Schutz | Wirkung |
|---|---|
| Key als Secret | Verlässt den Server nie |
| Domain-Sperre | Nur deine Website darf den Proxy aufrufen |
| Prompt serverseitig | Besucher können den Prompt nicht austauschen |
| 800 Zeichen Limit | Keine langen, teuren Eingaben |
| 5 Anfragen/Stunde pro Besucher | Bremst einzelne Dauernutzer |
| 300 Anfragen/Tag insgesamt | Notbremse gegen Kostenexplosion |

Die Zahlen stehen oben in `src/index.js` und lassen sich dort anpassen.

## Kosten senken

In `wrangler.toml` `MODEL = "claude-sonnet-5"` setzen — deutlich günstiger und
für diese Demo völlig ausreichend. Danach erneut `wrangler deploy`.
