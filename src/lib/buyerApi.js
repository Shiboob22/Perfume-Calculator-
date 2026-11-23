// The QR buyer page talks to /api/batches?resource=buyer with no sign-in.
// Errors carry the API's `code` (errors.<code> has the text); a network
// failure is code "network", an unknown bottle "not_found".
const url = (code) => `/api/batches?resource=buyer&code=${encodeURIComponent(code)}`;

async function send(code, init) {
  let res;
  try { res = await fetch(url(code), init); } catch { throw { code: "network" }; }
  let body = null;
  try { body = await res.json(); } catch { /* not JSON */ }
  if (!res.ok) throw { code: body?.code || (res.status === 404 ? "not_found" : "server_error"), field: body?.field };
  return body;
}

const post = (code, payload) => send(code, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });

/** What the page may show about the bottle: { shop, scent, family, size_ml, strength_pct, bottled_on, feedback, can_edit }. */
export const getBottle = (code) => send(code).then((b) => b.order);
/** { rating, note, lasts, tags } → the bottle with the answer saved. */
export const sendFeedback = (code, feedback) => post(code, { feedback }).then((b) => b.order);
/** { name, phone } → true once the seller has the request. */
export const orderAgain = (code, reorder) => post(code, { reorder }).then(() => true);
