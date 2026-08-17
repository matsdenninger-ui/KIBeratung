# KI Berater App 2 — Branch `v5`

Zweite Fassung der KI-Beratungs-Demo. Sie liegt bewusst im Branch `v5`, damit
`main` unverändert online bleibt. Vercel baut für diesen Branch eine eigene
Preview-URL; die Live-Seite ist davon nicht betroffen.

Inhalt:

| Datei | Zweck |
|---|---|
| `index.html` | Die komplette Landingpage inkl. Demo-Widget |
| `src/index.js` | Cloudflare Worker, der den Anthropic-Key hält |
| `wrangler.toml` | Worker-Konfiguration |

## Unterschiede zu `main`

- **Helles Farbschema.** Weißer Grund statt Anthrazit, kräftigeres Gold
  (`#c8952a`, als Schriftfarbe `#8a6410`) und ein dunkleres Rot (`#6e2230`).
- Der Worker liegt jetzt unter `src/index.js` — genau dort, wo `wrangler.toml`
  ihn mit `main = "src/index.js"` erwartet. Auf `main` lag die Datei im
  Wurzelverzeichnis, `wrangler deploy` lief damit nicht durch.
- Der Worker heißt `claude-demo-proxy-v2`. So überschreibt ein Deploy aus
  diesem Branch nicht den bestehenden `claude-demo-proxy` von `main`.

- **Kantigere Formsprache.** `--radius` von 18px auf 4px, `--radius-sm` 3px.
  Buttons sind keine Pillen mehr (vorher `980px`). Rund bleiben nur der
  Status-Punkt und die drei Fensterpunkte der Demo.
- **Conversion-Arbeit**, im Detail unten.

### Conversion-Optimierung

Behoben:

| Was | Warum es Conversions gekostet hat |
|---|---|
| Formular ohne Rückmeldung | Der Absenden-Knopf öffnete nur ein `mailto:`. Wer kein Mailprogramm eingerichtet hat — bei Webmail der Normalfall — sah gar nichts, und die Anfrage war weg. Jetzt bleibt die Nachricht mit Kopier-Knopf stehen. |
| Anker sprangen hinter die Navigation | Ein Klick auf „Angebot" schob die Überschrift unter die fixe Navigationsleiste. Behoben mit `scroll-margin-top`. |
| Inhalt unsichtbar ohne JavaScript | `.reveal` setzte `opacity: 0`; ohne JavaScript blieb der halbe Seiteninhalt dauerhaft leer. Die Regel greift jetzt nur noch mit aktivem JavaScript. |
| Preis erst nach zweimal Scrollen | Faktenzeile unter den Hero-Buttons: Festpreis, Dauer, Garantie. Qualifiziert Besucher sofort. |
| Kein sichtbarer Tastatur-Fokus | `:focus-visible` ergänzt. |
| Keine Teilen-Vorschau | Open-Graph- und Twitter-Tags ergänzt, damit Links auf LinkedIn nicht nackt aussehen. |
| Formularfelder ohne `autocomplete` | Browser konnten Name, Firma und E-Mail nicht vorausfüllen. |

Bewusst **nicht** gemacht, weil es deine Entscheidung oder deine Daten braucht:

- **Echtes Formular-Backend** statt `mailto:` (Formspree, Web3Forms, Vercel
  Forms). Das ist der größte verbleibende Hebel — `mailto:` verliert Anfragen,
  egal wie gut der Fallback ist.
- **Impressum und Datenschutz** verlinken auf `#`. Für eine gewerbliche Seite
  in Deutschland ist das nicht optional.
- **`og:image`** braucht ein echtes Bild.
- **Referenzen und Testimonials** — du hast keine, und erfundene wären das
  Gegenteil dessen, was die Seite verspricht.

### Farbwerte

| Variable | Wert | Verwendung |
|---|---|---|
| `--bg` | `#ffffff` | Grundfläche |
| `--bg-tint` | `#f6f4f1` | warm abgesetzte Abschnitte |
| `--gold` | `#c8952a` | Buttons, Flächen |
| `--gold-deep` | `#a87a16` | Hover, Linien |
| `--gold-ink` | `#8a6410` | Gold als Schriftfarbe (kontraststark auf Weiß) |
| `--wine` | `#6e2230` | dunkles Rot: Labels, Linien |
| `--wine-deep` | `#4e1621` | Verläufe, Portrait |

Gold gibt es in zwei Stärken, weil ein Gold, das auf Weiß als Schrift lesbar
ist, als Buttonfläche zu dunkel wirkt — und umgekehrt.

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
`https://claude-demo-proxy-v2.dein-name.workers.dev`.

### 6. URL in die Website eintragen

In `index.html` ganz oben im `<script>`-Block:

```js
const WORKER_URL = "https://claude-demo-proxy-v2.dein-name.workers.dev";
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
