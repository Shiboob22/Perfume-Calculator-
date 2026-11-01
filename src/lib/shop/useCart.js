import { useCallback, useSyncExternalStore } from "react";
import { CART_EVENT, CART_KEY, addItem, loadCart, removeItem, saveCart, setQty } from "./cart";

// The cart as React state, shared by every component and every tab: it lives
// in localStorage and tells subscribers when it changes. The snapshot is the
// raw string, so React sees a stable value until something is saved.
const raw = () => { try { return globalThis.localStorage?.getItem(CART_KEY) ?? "[]"; } catch { return "[]"; } };
const subscribe = (cb) => {
  window.addEventListener(CART_EVENT, cb);
  window.addEventListener("storage", cb);
  return () => { window.removeEventListener(CART_EVENT, cb); window.removeEventListener("storage", cb); };
};

const EMPTY = [];
let lastRaw = null;
let lastCart = EMPTY;
function snapshot() {
  const r = raw();
  if (r !== lastRaw) { lastRaw = r; lastCart = loadCart({ getItem: () => r }); }
  return lastCart;
}

export function useCart() {
  return useSyncExternalStore(subscribe, snapshot, () => EMPTY);
}

/** The cart plus the actions that change it. */
export function useCartActions() {
  const cart = useCart();
  const write = useCallback((next) => saveCart(next), []);
  return {
    cart,
    add: useCallback((line, qty = 1) => write(addItem(loadCart(), line, qty)), [write]),
    setQty: useCallback((line, qty) => write(setQty(loadCart(), line, qty)), [write]),
    remove: useCallback((line) => write(removeItem(loadCart(), line)), [write]),
    clear: useCallback(() => write([]), [write]),
  };
}
