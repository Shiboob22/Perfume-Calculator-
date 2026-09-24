import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY!;

// Free-tier Google AI Studio key. Server-only: never prefix it with VITE_,
// or Vite bakes it into the public browser bundle.
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const PRIMARY_MODEL = process.env.GEMINI_MODEL || 'gemini-3.8-flash';
// Free quotas are per model, so when the primary model is rate-limited the
// lighter model usually still has headroom.
const FALLBACK_MODEL = 'gemini-3.5-flash-lite';

const MAX_TURNS = 20;
const MAX_TURN_CHARS = 2000;
const MAX_NAME_CHARS = 120;
const BATCH_CONTEXT_LIMIT = 30;

const ALLOWED_ORIGINS = [
  'https://scent-handbook-app.vercel.app',
  'https://scent-handbook-app-shiboob22s-projects.vercel.app',
];

function setCors(req: VercelRequest, res: VercelResponse) {
  const origin = req.headers.origin;
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
}

async function getUserId(req: VercelRequest): Promise<string | null> {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;
  if (!token) return null;
  try {
    const { data: { user } } = await createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } }
    }).auth.getUser();
    return user?.id ?? null;
  } catch {
    return null;
  }
}

// Mirrors src/lib/tiers.js (kept inline so this function stays
// self-contained). Update both together if a tier's defaults change.
const TIER_KEYS = ['fresh', 'floral', 'woody', 'oriental', 'gourmand'];
const TIER_GUIDE = [
  'fresh — Fresh (Aromatic, Citrus, Water, Green, Fruity). Oil density 0.87 g/mL, default 20% concentration, rest 1–2 weeks.',
  'floral — Floral (Floral, Soft Floral, Floral Amber). Oil density 0.95 g/mL, default 25%, rest 2–3 weeks.',
  'woody — Woody (Woods, Mossy Woods, Dry Woods). Oil density 0.93 g/mL, default 22%, rest 3–4 weeks.',
  'oriental — Amber/Oriental (Soft Amber, Amber, Woody Amber). Oil density 1.02 g/mL, default 30%, rest 4–6 weeks.',
  'gourmand — Gourmand (Vanilla, Praline, Tobacco-Honey). Oil density 1.00 g/mL, default 25%, rest 3–4 weeks.',
].join('\n');

// House rules the perfumer chat must follow on top of the base persona.
// TODO(owner): add your own blending rules here, one string per rule.
const PERFUMER_RULES: string[] = [];

class AiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

type Content = { role: 'user' | 'model'; parts: { text: string }[] };

async function callGemini(model: string, body: unknown): Promise<Response> {
  return fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: 'POST',
    headers: { 'x-goog-api-key': GEMINI_API_KEY!, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

// Worth retrying on the fallback model: rate limits, a retired model name,
// or a Google-side outage. Bad requests and key problems are not.
function shouldFallBack(status: number) {
  return status === 429 || status === 404 || status >= 500;
}

// The prompts ask for plain text; strip the markdown Gemini adds anyway so
// it doesn't show up as literal asterisks in the UI.
function plain(text: string) {
  return text.replace(/\*\*(.+?)\*\*/g, '$1').replace(/^#+\s*/gm, '').trim();
}

async function generate(opts: { system: string; contents: Content[]; schema?: object }): Promise<string> {
  if (!GEMINI_API_KEY) throw new AiError(503, 'AI is not configured yet.');

  const body: Record<string, unknown> = {
    systemInstruction: { parts: [{ text: opts.system }] },
    contents: opts.contents,
  };
  if (opts.schema) {
    body.generationConfig = { responseMimeType: 'application/json', responseSchema: opts.schema };
  }

  let res = await callGemini(PRIMARY_MODEL, body);
  if (shouldFallBack(res.status) && FALLBACK_MODEL !== PRIMARY_MODEL) {
    res = await callGemini(FALLBACK_MODEL, body);
  }

  if (res.status === 429) throw new AiError(429, 'Free AI quota used up — try again later.');
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    console.error('Gemini error', res.status, detail.slice(0, 500));
    if ((res.status === 400 || res.status === 403) && /api key/i.test(detail)) {
      throw new AiError(503, 'Gemini API key is missing or invalid.');
    }
    throw new AiError(502, 'Gemini request failed.');
  }

  const data: any = await res.json();
  // Gemini 3 models can return "thought" parts alongside the answer; only
  // the non-thought text is the reply.
  const parts: any[] = data?.candidates?.[0]?.content?.parts ?? [];
  const text = parts
    .filter((p) => !p.thought && typeof p.text === 'string')
    .map((p) => p.text)
    .join('')
    .trim();
  if (!text) throw new AiError(502, 'Gemini returned an empty answer.');
  return text;
}

function userTurn(text: string): Content[] {
  return [{ role: 'user', parts: [{ text }] }];
}

/* ---------------- Batch context ---------------- */

async function loadBatches(userId: string) {
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const { data, error } = await supabase
    .from('batches')
    .select('blend_date, fragrance_name, tier, concentration_pct, total_ml, oil_g, oil_type, price_per_gram, oil_cost, notes')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(BATCH_CONTEXT_LIMIT);
  if (error) throw error;
  return data || [];
}

function describeBatches(batches: any[]) {
  if (batches.length === 0) return 'No batches logged yet.';
  return batches.map((b) => {
    const bits = [
      b.blend_date,
      b.fragrance_name,
      b.tier,
      `${b.concentration_pct}% oil`,
      `${Number(b.total_ml).toFixed(0)} mL total`,
      `${Number(b.oil_g).toFixed(1)} g oil`,
    ];
    if (b.oil_type) bits.push(`oil: ${b.oil_type}`);
    if (b.oil_cost != null) bits.push(`cost ${Number(b.oil_cost).toFixed(2)}`);
    if (b.notes) bits.push(`notes: ${String(b.notes).replace(/\s+/g, ' ').slice(0, 300)}`);
    return `- ${bits.join(' · ')}`;
  }).join('\n');
}

/* ---------------- Tasks ---------------- */

async function chat(userId: string, messages: unknown): Promise<string> {
  const raw = Array.isArray(messages) ? messages.slice(-MAX_TURNS) : [];
  const contents: Content[] = raw
    .filter((m: any) => (m?.role === 'user' || m?.role === 'model') && typeof m.text === 'string' && m.text.trim())
    .map((m: any) => ({ role: m.role, parts: [{ text: m.text.slice(0, MAX_TURN_CHARS) }] }));
  // Trimming can leave a model turn first; a conversation must open with the user.
  while (contents.length && contents[0].role !== 'user') contents.shift();
  if (!contents.length || contents[contents.length - 1].role !== 'user') {
    throw new AiError(400, 'Send a message to ask.');
  }

  const batches = await loadBatches(userId);
  const rules = PERFUMER_RULES.length ? `\n\nHouse rules:\n${PERFUMER_RULES.map((r) => `- ${r}`).join('\n')}` : '';
  const system =
    'You are an experienced perfumer advising a home fragrance blender who dilutes fragrance oils in 96% ethanol. ' +
    'Be practical and concise. Use metric units. Concentration always means % fragrance oil in the finished blend. ' +
    'Answer in plain text without markdown.' +
    `\n\nThe blender's fragrance families (key — details):\n${TIER_GUIDE}` +
    `\n\nThe blender's most recent batches:\n${describeBatches(batches)}` +
    rules;

  return plain(await generate({ system, contents }));
}

const LOOKUP_SCHEMA = {
  type: 'OBJECT',
  properties: {
    known: { type: 'BOOLEAN' },
    name: { type: 'STRING' },
    tier: { type: 'STRING', enum: TIER_KEYS },
    top_notes: { type: 'ARRAY', items: { type: 'STRING' } },
    middle_notes: { type: 'ARRAY', items: { type: 'STRING' } },
    base_notes: { type: 'ARRAY', items: { type: 'STRING' } },
    accords: { type: 'ARRAY', items: { type: 'STRING' } },
  },
  required: ['known', 'name', 'tier', 'top_notes', 'middle_notes', 'base_notes', 'accords'],
  // `known` first: the model commits to whether it recognises the perfume
  // before it starts writing notes.
  propertyOrdering: ['known', 'name', 'tier', 'top_notes', 'middle_notes', 'base_notes', 'accords'],
};

function stringList(v: unknown, max: number): string[] {
  if (!Array.isArray(v)) return [];
  return v.filter((x) => typeof x === 'string' && x.trim()).map((x) => x.trim()).slice(0, max);
}

async function lookup(name: unknown) {
  const query = typeof name === 'string' ? name.trim().slice(0, MAX_NAME_CHARS) : '';
  if (query.length < 2) throw new AiError(400, 'Enter a perfume name to look up.');

  const system =
    'You identify commercial perfumes and describe their published note pyramid. ' +
    'If you are not confident this exact perfume exists, set known to false and return empty lists — never invent notes. ' +
    'name: "<Brand> <Perfume>". Notes and accords in Title Case; at most 6 accords, strongest first. ' +
    'tier: the single best family key —\n' + TIER_GUIDE +
    '\nPrefer gourmand for vanilla/sweet-led scents and oriental for amber/spice/oud-led ones.';

  const text = await generate({ system, contents: userTurn(`Perfume: ${query}`), schema: LOOKUP_SCHEMA });
  let parsed: any;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new AiError(502, 'Gemini returned an unreadable answer.');
  }

  return {
    known: parsed.known === true,
    name: typeof parsed.name === 'string' && parsed.name.trim() ? parsed.name.trim().slice(0, MAX_NAME_CHARS) : query,
    tier: TIER_KEYS.includes(parsed.tier) ? parsed.tier : 'fresh',
    source: 'Gemini (AI estimate)',
    top_notes: stringList(parsed.top_notes, 12),
    middle_notes: stringList(parsed.middle_notes, 12),
    base_notes: stringList(parsed.base_notes, 12),
    accords: stringList(parsed.accords, 6),
  };
}

async function tips(b: any): Promise<string> {
  const name = typeof b.name === 'string' ? b.name.trim().slice(0, MAX_NAME_CHARS) : '';
  const tier = TIER_KEYS.includes(b.tier) ? b.tier : null;
  const conc = Number(b.concentration_pct);
  const totalMl = Number(b.total_ml);
  if (!name || !tier || !Number.isFinite(conc) || !Number.isFinite(totalMl)) {
    throw new AiError(400, 'Pick a fragrance and batch size first.');
  }

  const system =
    'You are an experienced perfumer reviewing a planned blend of fragrance oil in 96% ethanol. ' +
    'Reply in plain text without markdown, under 120 words: whether the concentration suits this fragrance, ' +
    'how long to macerate, and one practical caution.' +
    `\n\nFamilies (key — details):\n${TIER_GUIDE}`;
  const prompt = `Fragrance: ${name}\nFamily: ${tier}\nPlanned concentration: ${conc}% oil\nBatch size: ${totalMl.toFixed(0)} mL total`;

  return plain(await generate({ system, contents: userTurn(prompt) }));
}

async function insights(userId: string): Promise<string> {
  const batches = await loadBatches(userId);
  // Nothing to analyse — don't spend free quota on it.
  if (batches.length === 0) return 'No batches logged yet — log a few from the Calculator and ask again.';

  const system =
    'You review a home fragrance blender\'s production log. Reply in plain text without markdown: ' +
    '3 to 5 short observations, each on its own line starting with "• ", covering patterns in families and concentrations, ' +
    'oil cost, anything in their notes worth acting on, and one suggestion for the next batch.' +
    `\n\nFamilies (key — details):\n${TIER_GUIDE}`;

  return plain(await generate({ system, contents: userTurn(`My batches, newest first:\n${describeBatches(batches)}`) }));
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCors(req, res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const userId = await getUserId(req);
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized: Missing or invalid session token.' });
  }

  const b = req.body || {};
  try {
    switch (b.task) {
      case 'chat':
        return res.status(200).json({ text: await chat(userId, b.messages) });
      case 'lookup':
        return res.status(200).json({ result: await lookup(b.name) });
      case 'tips':
        return res.status(200).json({ text: await tips(b) });
      case 'insights':
        return res.status(200).json({ text: await insights(userId) });
      default:
        return res.status(400).json({ error: 'Unknown AI task.' });
    }
  } catch (err: any) {
    if (err instanceof AiError) return res.status(err.status).json({ error: err.message });
    console.error('AI handler error:', err);
    return res.status(500).json({ error: 'AI request failed.' });
  }
}
