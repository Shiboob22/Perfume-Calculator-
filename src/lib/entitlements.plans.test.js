import { describe, it, expect } from "vitest";
import plans from "../site/plans.json";
import en from "../i18n/messages/en.js";
import ar from "../i18n/messages/ar.js";
import { FEATURES } from "./entitlements";

const dig = (obj, path) => path.split(".").reduce((o, k) => o?.[k], obj);
const free = plans.find((p) => p.id === "free").features;
const pro = plans.find((p) => p.id === "pro").features;

describe("plan feature lists", () => {
  it("only name known features", () => {
    for (const f of [...free, ...pro]) expect(FEATURES).toContain(f);
  });
  it("give Pro everything Free has", () => {
    for (const f of free) expect(pro).toContain(f);
  });
  it("have lock copy, in both languages, for every feature Free lacks", () => {
    for (const f of FEATURES.filter((x) => !free.includes(x))) {
      expect(typeof dig(en, `plan.locked.${f}`), `en plan.locked.${f}`).toBe("string");
      expect(typeof dig(ar, `plan.locked.${f}`), `ar plan.locked.${f}`).toBe("string");
    }
  });
});
