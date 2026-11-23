import { describe, it, expect, vi, beforeEach } from "vitest";
import { gsapAllowed, loadGsap, peekGsap, _resetGsap } from "./load.js";

const ok = { on: true, flag: true, isReduced: false, low: false };
const mod = () => ({ gsap: { registerPlugin: vi.fn(), registerEase: vi.fn() }, ScrollTrigger: {}, Flip: {} });
const importer = () => vi.fn(async () => { const m = mod(); return [{ gsap: m.gsap, default: m.gsap }, { ScrollTrigger: m.ScrollTrigger }, { Flip: m.Flip }]; });

describe("gsapAllowed", () => {
  it("needs on, flag, no reduced motion, no low power", () => {
    expect(gsapAllowed(ok)).toBe(true);
    for (const k of ["on", "flag"]) expect(gsapAllowed({ ...ok, [k]: false })).toBe(false);
    for (const k of ["isReduced", "low"]) expect(gsapAllowed({ ...ok, [k]: true })).toBe(false);
  });
});

describe("loadGsap", () => {
  beforeEach(() => _resetGsap());

  it("resolves null without importing when not allowed", async () => {
    const imp = importer();
    expect(await loadGsap({ importer: imp, allow: { ...ok, on: false } })).toBeNull();
    expect(imp).not.toHaveBeenCalled();
    expect(peekGsap()).toBeNull();
  });

  it("imports once across calls and peek then returns the modules", async () => {
    const imp = importer();
    const a = loadGsap({ importer: imp, allow: ok });
    const b = loadGsap({ importer: imp, allow: ok });
    expect(a).toBe(b);
    const r = await a;
    expect(imp).toHaveBeenCalledTimes(1);
    expect(r.gsap.registerPlugin).toHaveBeenCalledTimes(1);
    expect(r.gsap.registerEase).toHaveBeenCalledTimes(2);
    expect(peekGsap()).toBe(r);
  });

  it("resolves null and reports once when the import fails", async () => {
    const imp = vi.fn(async () => { throw new Error("offline"); });
    const report = vi.fn();
    expect(await loadGsap({ importer: imp, report, allow: ok })).toBeNull();
    expect(await loadGsap({ importer: imp, report, allow: ok })).toBeNull();
    expect(report).toHaveBeenCalledTimes(1);
  });
});
