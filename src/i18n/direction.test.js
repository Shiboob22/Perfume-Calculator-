import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

// UI/UX audit H7: typed text keeps its own direction (an English note in the
// Arabic app, an Arabic one in the English app). Every free-text box says so.
const files = (dir) => readdirSync(dir).flatMap((f) => {
  const p = join(dir, f);
  return statSync(p).isDirectory() ? files(p) : p.endsWith(".jsx") ? [p] : [];
});

describe("text direction", () => {
  it("every <textarea> has dir set", () => {
    const missing = files("src").flatMap((p) => (readFileSync(p, "utf8").match(/<textarea\b[^>]*>/gs) ?? [])
      .filter((tag) => !/\bdir=/.test(tag)).map(() => p));
    expect(missing).toEqual([]);
  });
});
