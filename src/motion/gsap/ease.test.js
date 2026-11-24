import { describe, it, expect, vi } from "vitest";
import { TOKENS } from "../config.js";
import { cubicBezier, parseBezier, registerEases } from "./ease.js";

describe("token eases", () => {
  it("parses the token curves", () => {
    expect(parseBezier(TOKENS.ease.out)).toEqual([0.22, 1, 0.36, 1]);
    expect(parseBezier(TOKENS.ease.inOut)).toEqual([0.65, 0, 0.35, 1]);
  });
  it("solves the out curve", () => {
    const f = cubicBezier(...parseBezier(TOKENS.ease.out));
    expect(f(0)).toBe(0);
    expect(f(1)).toBe(1);
    expect(Math.abs(f(0.5) - 0.9614)).toBeLessThan(0.01);
  });
  it("registers kx.out and kx.inOut", () => {
    const stub = { registerEase: vi.fn() };
    registerEases(stub);
    expect(stub.registerEase.mock.calls.map((c) => c[0])).toEqual(["kx.out", "kx.inOut"]);
  });
});
