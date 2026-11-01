// The Shop's cart: plain data kept on this device (localStorage), no account.
// Lines are { productId, variantId | null, qty }; prices are looked up from
// the product list each time, so a changed price never lingers in the cart.
import { MAX_LINES, MAX_QTY, priceCart } from "./pricing";

export const CART_KEY = "kyphira.cart";
const CHANGED = "kyphira:cart";

export const emptyCart = () => [];

const same = (a, b) => a.productId === b.productId && (a.variantId ?? null) === (b.variantId ?? null);

/** Adds `qty` of a line (merging with the same product and option), capped at MAX_QTY. */
export function addItem(cart, { productId, variantId = null }, qty = 1) {
  const line = { productId, variantId: variantId ?? null };
  const at = cart.findIndex((l) => same(l, line));
  if (at >= 0) return cart.map((l, i) => (i === at ? { ...l, qty: Math.min(MAX_QTY, l.qty + qty) } : l));
  if (cart.length >= MAX_LINES) return cart;
  return [...cart, { ...line, qty: Math.min(MAX_QTY, Math.max(1, qty)) }];
}

/** Sets a line's quantity; zero or less removes it. */
export function setQty(cart, line, qty) {
  if (qty < 1) return removeItem(cart, line);
  return cart.map((l) => (same(l, line) ? { ...l, qty: Math.min(MAX_QTY, qty) } : l));
}

export function removeItem(cart, line) {
  return cart.filter((l) => !same(l, line));
}

export const cartCount = (cart) => cart.reduce((n, l) => n + l.qty, 0);

/** Reads a stored cart, keeping only well-formed lines (anything else on disk is ignored). */
export function parseCart(raw) {
  let data;
  try { data = JSON.parse(raw); } catch { return emptyCart(); }
  if (!Array.isArray(data)) return emptyCart();
  const out = [];
  for (const l of data) {
    if (!l || typeof l.productId !== "string" || !Number.isInteger(l.qty) || l.qty < 1) continue;
    const next = addItem(out, { productId: l.productId, variantId: typeof l.variantId === "string" ? l.variantId : null }, Math.min(l.qty, MAX_QTY));
    out.splice(0, out.length, ...next);
  }
  return out;
}

/**
 * The cart as priced lines against the current products. Lines whose product
 * or option no longer exists are dropped from the list and returned as `gone`.
 */
export function cartLines(cart, products) {
  const known = cart.filter((l) => priceCart([{ ...l, qty: 1 }], products).ok);
  const gone = cart.filter((l) => !known.includes(l));
  const priced = known.length ? priceCart(known, products) : { ok: true, lines: [], total: 0 };
  return { lines: priced.ok ? priced.lines : [], total: priced.ok ? priced.total : 0, gone };
}

function store() {
  try { return globalThis.localStorage ?? null; } catch { return null; }
}

export function loadCart(storage = store()) {
  try { return parseCart(storage?.getItem(CART_KEY)); } catch { return emptyCart(); }
}

export function saveCart(cart, storage = store()) {
  try { storage?.setItem(CART_KEY, JSON.stringify(cart)); } catch { /* private mode: the cart lives until the page closes */ }
  try { globalThis.dispatchEvent?.(new Event(CHANGED)); } catch { /* no window (prerender) */ }
}

export const CART_EVENT = CHANGED;
