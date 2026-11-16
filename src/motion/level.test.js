import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { LEVELS, LEVEL_KEY, applyLevel, resolveLevel, storedLevel, setLevel, pageLevel, currentLevel } from "./level.js";

const memory = (init = {}) => {
  const m = new Map(Object.entries(init));
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), m };
};
const el = () => {
  const a = new Map();
  return { setAttribute: (k, v) => a.set(k, v), removeAttribute: (k) => a.delete(k), getAttribute: (k) => (a.has(k) ? a.get(k) : null), a };
};

describe("motion level (M6)", () => {
  it("has three levels, full first", () => expect(LEVELS).toEqual(["full", "calm", "off"]));

  it("reads a stored choice and ignores anything else", () => {
    expect(storedLevel(memory({ [LEVEL_KEY]: "calm" }))).toBe("calm");
    expect(storedLevel(memory({ [LEVEL_KEY]: "loud" }))).toBeNull();
    expect(storedLevel(memory())).toBeNull();
    expect(storedLevel(null)).toBeNull();
    expect(storedLevel({ getItem: () => { throw new Error("blocked"); } })).toBeNull();
  });

  it("starts a device that asks for reduced motion on calm, and keeps a choice over that", () => {
    expect(resolveLevel()).toBe("full");
    expect(resolveLevel({ systemReduce: true })).toBe("calm");
    expect(resolveLevel({ stored: "full", systemReduce: true })).toBe("full");
    expect(resolveLevel({ stored: "off" })).toBe("off");
    expect(resolveLevel({ stored: "nonsense" })).toBe("full");
  });

  it("writes calm and off on the element and clears it for full", () => {
    const e = el();
    applyLevel(e, "calm");
    expect(e.getAttribute("data-mo-level")).toBe("calm");
    applyLevel(e, "off");
    expect(e.getAttribute("data-mo-level")).toBe("off");
    applyLevel(e, "full");
    expect(e.getAttribute("data-mo-level")).toBeNull();
    applyLevel(e, "anything");
    expect(e.getAttribute("data-mo-level")).toBeNull();
    expect(() => applyLevel(null, "calm")).not.toThrow();
  });

  describe("in a page", () => {
    let store;
    let root;
    beforeEach(() => {
      store = memory();
      root = el();
      vi.stubGlobal("localStorage", store);
      vi.stubGlobal("document", { documentElement: root });
      vi.stubGlobal("matchMedia", () => ({ matches: false }));
      vi.stubGlobal("window", { dispatchEvent: vi.fn() });
      vi.stubGlobal("Event", class { constructor(type) { this.type = type; } });
    });

    afterEach(() => vi.unstubAllGlobals());

    it("saves, applies and tells the layer and the home scene", () => {
      setLevel("calm");
      expect(store.m.get(LEVEL_KEY)).toBe("calm");
      expect(pageLevel()).toBe("calm");
      expect(currentLevel()).toBe("calm");
      expect(window.dispatchEvent.mock.calls.map(([e]) => e.type)).toEqual(["mo-env", "cmp-env"]);
      setLevel("full");
      expect(pageLevel()).toBe("full");
      setLevel("loud");
      expect(store.m.get(LEVEL_KEY)).toBe("full");
    });

    it("still applies when storage refuses", () => {
      vi.stubGlobal("localStorage", { getItem: () => null, setItem: () => { throw new Error("quota"); } });
      setLevel("off");
      expect(pageLevel()).toBe("off");
    });

    it("reads calm from the device's reduced-motion setting when nothing is chosen", () => {
      vi.stubGlobal("matchMedia", () => ({ matches: true }));
      expect(currentLevel()).toBe("calm");
    });
  });
});
