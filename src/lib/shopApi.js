import { SHOP } from "./shop/config";

// The Shop talks to /api/shop with no sign-in. Errors carry the API's `code`
// (shop.errors.<code> has the text); a network failure is code "network".
async function readJson(res) {
  try { return await res.json(); } catch { return null; }
}

export async function fetchProducts() {
  let res;
  try { res = await fetch("/api/shop"); } catch { throw { code: "network" }; }
  const body = await readJson(res);
  if (!res.ok) throw { code: body?.code || "shop_read", message: body?.error };
  return body?.products ?? [];
}

/** Places an order. `items` are { productId, variantId, qty }; `proof` is the base64 screenshot. */
export async function placeOrder({ items, customer, lang, proof, website = "" }) {
  let res;
  try {
    res = await fetch("/api/shop", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items, customer, lang, proof, website }),
    });
  } catch { throw { code: "network" }; }
  const body = await readJson(res);
  // A body over the platform's limit never reaches the function and isn't JSON.
  if (res.status === 413) throw { code: "proof_too_big" };
  if (!res.ok) throw { code: body?.code || "shop_write", message: body?.error };
  return body;
}

export { SHOP };
