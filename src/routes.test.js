import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { REDIRECTS, isAppPath, tabPath, tabFromPath } from "./routes.js";

describe("routes", () => {
  it("serves /app and /bench as the app", () => {
    expect(["/app", "/app/search", "/bench", "/bench/journal", "/wardrobe", "/atlas", "/atlas/fragrance/x", "/salon", "/salon/u/ada", "/nose"].every(isAppPath)).toBe(true);
    expect(["/", "/benchmark", "/library", "/ar/bench"].some(isAppPath)).toBe(false);
  });

  it("maps tabs to URLs and back", () => {
    expect(tabPath("calculator")).toBe("/bench");
    expect(tabPath("batches")).toBe("/bench/journal");
    expect(tabPath("search")).toBe("/app/search");
    expect(tabFromPath("/bench", undefined)).toBe("calculator");
    expect(tabFromPath("/bench/journal", undefined)).toBe("batches");
    expect(tabFromPath("/app/inventory", "inventory")).toBe("inventory");
    expect(tabFromPath("/app", undefined)).toBeUndefined();
    expect(tabPath("wardrobe")).toBe("/wardrobe");
    expect(tabFromPath("/wardrobe", undefined)).toBe("wardrobe");
    expect(tabPath("atlas")).toBe("/atlas");
    expect(tabFromPath("/atlas/browse", undefined)).toBe("atlas");
    expect(tabPath("salon")).toBe("/salon");
    expect(tabFromPath("/salon/u/ada", undefined)).toBe("salon");
    expect(tabPath("nose")).toBe("/nose");
    expect(tabFromPath("/nose", undefined)).toBe("nose");
  });

  it("matches the 301s in vercel.json, one for one", () => {
    const config = JSON.parse(readFileSync("vercel.json", "utf8"));
    expect(config.redirects.map(({ source, destination, statusCode }) => ({ source, destination, statusCode })))
      .toEqual(REDIRECTS.map((r) => ({ ...r, statusCode: 301 })));
  });

  it("rewrites /bench to the app shell", () => {
    const { rewrites } = JSON.parse(readFileSync("vercel.json", "utf8"));
    const to = (source) => rewrites.find((r) => r.source === source)?.destination;
    expect(to("/bench")).toBe("/app/index.html");
    expect(to("/bench/:path*")).toBe("/app/index.html");
    expect(to("/wardrobe")).toBe("/app/index.html");
    expect(to("/atlas")).toBe("/app/index.html");
    expect(to("/atlas/:path*")).toBe("/app/index.html");
    expect(to("/salon")).toBe("/app/index.html");
    expect(to("/salon/:path*")).toBe("/app/index.html");
    expect(to("/nose")).toBe("/app/index.html");
  });

  it("leaves no link to a retired address in the source", () => {
    const retired = [/["'`]\/(ar\/)?guides(["'`/?#])/, /\/app\/(calculator|batches)\b/];
    const hits = [];
    const walk = (dir) => {
      for (const name of readdirSync(dir)) {
        const path = join(dir, name);
        if (statSync(path).isDirectory()) walk(path);
        else if (/\.(jsx?|ts)$/.test(name) && !/routes\.(test\.)?js$/.test(name) && !/Root\.jsx$/.test(name)) {
          const text = readFileSync(path, "utf8");
          if (retired.some((re) => re.test(text))) hits.push(path);
        }
      }
    };
    walk("src");
    walk("api");
    expect(hits).toEqual([]);
  });
});
