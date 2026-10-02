import { describe, it, expect } from "vitest";
import en from "./messages/en";
import ar from "./messages/ar";

// Every string ships in both languages together.
const PLURAL = new Set(["zero", "one", "two", "few", "many", "other"]);
const isPlural = (v) => Object.keys(v).every((k) => PLURAL.has(k)) && "other" in v;

// Leaf keys; a plural message counts as one leaf (languages differ in forms).
function keys(obj, prefix = "") {
  return Object.entries(obj).flatMap(([k, v]) =>
    v && typeof v === "object" && !isPlural(v) ? keys(v, `${prefix}${k}.`) : [`${prefix}${k}`]
  );
}

// Placeholders of a string, or of a plural message's `other` form.
function placeholders(m) {
  const s = m && typeof m === "object" ? m.other : m;
  return [...String(s).matchAll(/\{(\w+)\}/g)].map((x) => x[1]).sort();
}

describe("message catalogs", () => {
  it("have the same keys in English and Arabic", () => {
    expect(keys(ar).sort()).toEqual(keys(en).sort());
  });

  it("use the same placeholders in both languages", () => {
    const get = (obj, key) => key.split(".").reduce((o, k) => o[k], obj);
    for (const key of keys(en)) {
      expect(placeholders(get(ar, key)), key).toEqual(placeholders(get(en, key)));
    }
  });
});

describe("plan features", () => {
  it("each has a pricing-page line in both languages", async () => {
    const { FEATURES } = await import("../lib/entitlements");
    const get = (obj, key) => key.split(".").reduce((o, k) => o?.[k], obj);
    for (const f of FEATURES) {
      expect(typeof get(en.site.pricing.features, f), f).toBe("string");
      expect(typeof get(ar.site.pricing.features, f), f).toBe("string");
    }
  });
});

describe("family texts", () => {
  it("match the numbers module word for word in English", async () => {
    const { FAMILIES } = await import("../lib/formulation");
    for (const f of Object.values(FAMILIES)) {
      expect(en.families[f.key]).toEqual({ label: f.label, sub: f.sub, note: f.note });
    }
  });
});
