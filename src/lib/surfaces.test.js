import { describe, it, expect } from "vitest";
import { surfaces, surfaceCss, grain, inkRule } from "./surfaces";

const decode = (u) => decodeURIComponent(u.replace(/^url\("data:image\/svg\+xml,/, "").replace(/"\)$/, ""));

describe("surfaces", () => {
  it("light grain is darker noise, dark grain lighter and sparser", () => {
    const l = decode(surfaces("light")["--kx-grain"]);
    const d = decode(surfaces("dark")["--kx-grain"]);
    expect(l).toContain("0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.07 0");
    expect(d).toContain("0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0.035 0");
    expect(l).toContain("feTurbulence");
  });
  it("prints the rule in the theme's ink", () => {
    expect(decode(surfaces("light")["--kx-rule"])).toContain("stroke='#1B1814'");
    expect(decode(surfaces("dark")["--kx-rule"])).toContain("stroke='#EADFCE'");
    expect(inkRule("#000")).toMatch(/^url\("data:image\/svg\+xml,/);
  });
  it("lays a bench-top behind the page", () => {
    expect(surfaces("light")["--kx-benchtop"]).toMatch(/^radial-gradient\(.*rgba\(255,255,255,\.45\)/);
    expect(surfaces("dark")["--kx-benchtop"]).toContain("rgba(255,255,255,.04)");
    expect(grain(0, 0.05, 0.55, 260)).toContain(encodeURIComponent("width='260'"));
  });
  it("writes light, system-dark and toggled-dark blocks", () => {
    const css = surfaceCss();
    expect(css).toMatch(/^:root\{--kx-grain:/);
    expect(css).toContain('@media (prefers-color-scheme: dark){:root:not([data-theme="light"]){');
    expect(css).toContain(':root[data-theme="dark"]{');
  });
});
