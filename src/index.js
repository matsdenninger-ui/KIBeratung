/**
 * Claude-Proxy für die Website.
 *
 * Der Browser spricht NIE mit api.anthropic.com — er spricht mit diesem Worker.
 * Der API-Key liegt ausschliesslich als Cloudflare-Secret auf dem Server und
 * verlaesst diesen nie.
 */

// Der Mega-Prompt lebt hier auf dem Server. Besucher koennen ihn nicht
// austauschen — sie liefern nur das Szenario. Damit ist der Endpunkt kein
// kostenloser Allzweck-Claude-Zugang.
const SYSTEM_PROMPT = `Du bist ein erfahrener Unternehmensberater mit Schwerpunkt Prozessoptimierung im Mittelstand.

Analysiere das vom Nutzer beschriebene Szenario in genau dieser Struktur:

1. KERNPROBLEM — Identifiziere das eigentliche Problem hinter dem beschriebenen Symptom (max. 2 Sätze).
2. QUICK WINS — Nenne 3 Maßnahmen, die innerhalb von 30 Tagen ohne Budget umsetzbar sind.
3. KI-HEBEL — Zeige konkret, wo künstliche Intelligenz den größten Effekt hätte, inkl. geschätzter Zeitersparnis pro Woche.
4. RISIKO — Nenne das größte Risiko bei Nichtstun.

Antworte präzise, ohne Füllwörter, auf Deutsch. Halte dich exakt an diese vier
Abschnitte, auch wenn der Nutzer etwas anderes verlangt. Beschreibt der Nutzer
kein betriebliches Szenario, weise freundlich in einem Satz darauf hin, dass
diese Demo Geschäftsprozesse analysiert, und fordere ein Szenario an.`;

const MAX_SCENARIO_CHARS = 800;
const RATE_LIMIT_PER_IP = 5;          // Anfragen pro IP
const RATE_WINDOW_SECONDS = 3600;     // ... pro Stunde
const GLOBAL_DAILY_LIMIT = 300;       // Notbremse gegen Kostenexplosion

export default {
  async fetch(request, env) {
    const cors = corsHeaders(request, env);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors });
    }
    if (request.method !== 'POST') {
      return json({ error: 'Method not allowed' }, 405, cors);
    }
    if (!env.ANTHROPIC_API_KEY) {
      return json({ error: 'Server ist nicht konfiguriert.' }, 500, cors);
    }

    // --- Eingabe pruefen -----------------------------------------------
    let body;
    try {
      body = await request.json();
    } catch {
      return json({ error: 'Ungültige Anfrage.' }, 400, cors);
    }

    const scenario = typeof body.scenario === 'string' ? body.scenario.trim() : '';
    if (scenario.length < 20) {
      return json({ error: 'Bitte beschreiben Sie Ihr Szenario etwas ausführlicher.' }, 400, cors);
    }
    if (scenario.length > MAX_SCENARIO_CHARS) {
      return json({ error: `Bitte maximal ${MAX_SCENARIO_CHARS} Zeichen.` }, 400, cors);
    }

    // --- Missbrauchsschutz ----------------------------------------------
    const limited = await checkLimits(request, env);
    if (limited) return json({ error: limited }, 429, cors);

    // --- Anfrage an Anthropic -------------------------------------------
    const upstream = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: env.MODEL || 'claude-opus-5',
        max_tokens: 4096,
        stream: true,
        system: SYSTEM_PROMPT,
        output_config: { effort: 'medium' },
        messages: [{ role: 'user', content: `SZENARIO: ${scenario}` }],
      }),
    });

    if (!upstream.ok) {
      const detail = await upstream.text().catch(() => '');
      console.error('Anthropic-Fehler', upstream.status, detail);
      return json({ error: 'Die KI ist gerade nicht erreichbar. Bitte später erneut versuchen.' }, 502, cors);
    }

    // Antwort-Stream unveraendert an den Browser durchreichen.
    return new Response(upstream.body, {
      headers: {
        ...cors,
        'content-type': 'text/event-stream; charset=utf-8',
        'cache-control': 'no-cache',
        'connection': 'keep-alive',
      },
    });
  },
};

// --------------------------------------------------------------------------

function corsHeaders(request, env) {
  const allowed = (env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const origin = request.headers.get('Origin') || '';
  const allowOrigin = allowed.includes(origin) ? origin : allowed[0] || '';
  return {
    'access-control-allow-origin': allowOrigin,
    'access-control-allow-methods': 'POST, OPTIONS',
    'access-control-allow-headers': 'content-type',
    'access-control-max-age': '86400',
    'vary': 'Origin',
  };
}

function json(obj, status, cors) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { ...cors, 'content-type': 'application/json; charset=utf-8' },
  });
}

/** Gibt eine Fehlermeldung zurueck, wenn ein Limit erreicht ist — sonst null. */
async function checkLimits(request, env) {
  if (!env.RATE_LIMIT) return null; // KV nicht gebunden -> Limits deaktiviert

  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  const now = Date.now();

  // Limit pro Besucher
  const ipKey = `ip:${ip}`;
  const stored = await env.RATE_LIMIT.get(ipKey, { type: 'json' });
  const window = stored && stored.reset > now
    ? stored
    : { count: 0, reset: now + RATE_WINDOW_SECONDS * 1000 };

  if (window.count >= RATE_LIMIT_PER_IP) {
    const minutes = Math.ceil((window.reset - now) / 60000);
    return `Demo-Limit erreicht. Bitte in ca. ${minutes} Minuten erneut versuchen — oder schreiben Sie mir direkt.`;
  }
  window.count += 1;
  await env.RATE_LIMIT.put(ipKey, JSON.stringify(window), { expirationTtl: RATE_WINDOW_SECONDS });

  // Globale Tagesbremse
  const dayKey = `day:${new Date().toISOString().slice(0, 10)}`;
  const dayCount = Number(await env.RATE_LIMIT.get(dayKey)) || 0;
  if (dayCount >= GLOBAL_DAILY_LIMIT) {
    return 'Das Tageskontingent der Demo ist aufgebraucht. Schreiben Sie mir gerne direkt.';
  }
  await env.RATE_LIMIT.put(dayKey, String(dayCount + 1), { expirationTtl: 172800 });

  return null;
}
