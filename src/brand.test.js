import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { BRAND, brandName } from "./brand.js";

describe("brand config", () => {
  it("names the product in both scripts", () => {
    expect(BRAND.name).toBe("Kyphira");
    expect(brandName("en")).toBe("Kyphira");
    expect(brandName("ar")).toBe("كيفيرا");
  });

  it("is what the web manifest and the page title say", () => {
    const manifest = JSON.parse(readFileSync("public/manifest.webmanifest", "utf8"));
    expect(manifest.name).toBe(BRAND.name);
    expect(manifest.short_name).toBe(BRAND.name);
    expect(readFileSync("index.html", "utf8")).toContain(`<title>${BRAND.name}</title>`);
  });

  it("keeps the former name out of the product, except in the rename notice", () => {
    const allowed = new Set([join("src", "brand.js"), join("src", "brand.test.js"), join("src", "lib", "theme.js"), join("src", "components", "kx", "RenameNotice.jsx")]);
    const hits = [];
    const walk = (dir) => {
      for (const name of readdirSync(dir)) {
        const path = join(dir, name);
        if (statSync(path).isDirectory()) walk(path);
        else if (/\.(jsx?|ts|json)$/.test(name) && !allowed.has(path) && readFileSync(path, "utf8").includes(BRAND.formerName)) hits.push(path);
      }
    };
    walk("src");
    // The rename notice's strings live in the message catalogues.
    expect(hits.filter((p) => !p.includes(join("i18n", "messages")))).toEqual([]);
  });
});
