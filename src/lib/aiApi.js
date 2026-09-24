import { authHeaders } from "./fragranceApi";

// All Gemini calls go through /api/ai so the API key stays on the server.
async function callAi(task, input = {}) {
  const headers = await authHeaders();
  const res = await fetch("/api/ai", {
    method: "POST",
    headers,
    body: JSON.stringify({ task, ...input }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`);
  return body;
}

// messages: [{ role: 'user' | 'model', text }], oldest first, ending with the user's question.
export async function askPerfumer(messages) {
  return (await callAi("chat", { messages })).text;
}

// Resolves to { known, name, tier, source, top_notes, middle_notes, base_notes, accords }.
export async function lookupFragrance(name) {
  return (await callAi("lookup", { name })).result;
}

export async function blendTips({ name, tier, concentration_pct, total_ml }) {
  return (await callAi("tips", { name, tier, concentration_pct, total_ml })).text;
}

export async function batchInsights() {
  return (await callAi("insights")).text;
}
