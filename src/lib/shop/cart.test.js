import { describe, it, expect } from "vitest";
import { addItem, setQty, removeItem, cartCount, parseCart, cartLines, loadCart, saveCart, CART_KEY } from "./cart";

const loc = (s) => ({ en: s, ar: s });
const products = [
  { id: "p1", slug: "d", name: loc("Decant"), description: loc(""), image: null, price: 150, variants: [{ id: "5ml", label: loc("5"), price: 150 }, { id: "10ml", label: loc("10"), price: 260 }] },
  { id: "p2", slug: "k", name: loc("Kit"), description: loc(""), image: null, price: 650, variants: [] },
];

describe("cart lines", () => {
  it("merges the same product and option, and keeps different options apart", () => {
    let c = addItem([], { productId: "p1", variantId: "5ml" });
    c = addItem(c, { productId: "p1", variantId: "5ml" }, 2);
    c = addItem(c, { productId: "p1", variantId: "10ml" });
    expect(c).toEqual([{ productId: "p1", variantId: "5ml", qty: 3 }, { productId: "p1", variantId: "10ml", qty: 1 }]);
    expect(cartCount(c)).toBe(4);
  });
  it("caps a quantity at 20 and the cart at 20 lines", () => {
    expect(addItem([{ productId: "p2", variantId: null, qty: 19 }], { productId: "p2" }, 5)[0].qty).toBe(20);
    const full = Array.from({ length: 20 }, (_, i) => ({ productId: `x${i}`, variantId: null, qty: 1 }));
    expect(addItem(full, { productId: "new" })).toBe(full);
  });
  it("sets a quantity, and removes the line at zero", () => {
    const c = [{ productId: "p2", variantId: null, qty: 2 }];
    expect(setQty(c, { productId: "p2", variantId: null }, 5)[0].qty).toBe(5);
    expect(setQty(c, { productId: "p2", variantId: null }, 0)).toEqual([]);
    expect(removeItem(c, { productId: "p2" })).toEqual([]);
  });
});

describe("parseCart", () => {
  it("reads a stored cart and drops anything malformed", () => {
    const raw = JSON.stringify([{ productId: "p2", variantId: null, qty: 2 }, { productId: 5, qty: 1 }, { productId: "p1", qty: 0 }, null, { productId: "p1", variantId: "5ml", qty: 99 }]);
    expect(parseCart(raw)).toEqual([{ productId: "p2", variantId: null, qty: 2 }, { productId: "p1", variantId: "5ml", qty: 20 }]);
    expect(parseCart("not json")).toEqual([]);
    expect(parseCart('{"a":1}')).toEqual([]);
    expect(parseCart(null)).toEqual([]);
  });
});

describe("cartLines", () => {
  it("prices the lines and sets aside the ones whose product or option is gone", () => {
    const cart = [{ productId: "p1", variantId: "10ml", qty: 2 }, { productId: "old", variantId: null, qty: 1 }, { productId: "p1", variantId: "99ml", qty: 1 }];
    const r = cartLines(cart, products);
    expect(r.total).toBe(520);
    expect(r.lines).toHaveLength(1);
    expect(r.gone.map((l) => l.productId)).toEqual(["old", "p1"]);
  });
  it("is empty for an empty cart", () => {
    expect(cartLines([], products)).toEqual({ lines: [], total: 0, gone: [] });
  });
});

describe("storage", () => {
  const fake = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), m }; };
  it("round-trips through storage", () => {
    const s = fake();
    saveCart([{ productId: "p2", variantId: null, qty: 3 }], s);
    expect(s.m.has(CART_KEY)).toBe(true);
    expect(loadCart(s)).toEqual([{ productId: "p2", variantId: null, qty: 3 }]);
  });
  it("survives storage that throws", () => {
    const bad = { getItem() { throw new Error("denied"); }, setItem() { throw new Error("denied"); } };
    expect(loadCart(bad)).toEqual([]);
    expect(() => saveCart([], bad)).not.toThrow();
  });
});
