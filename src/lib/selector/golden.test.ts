import { describe, expect, it } from "vitest";
import { GOLDEN } from "./golden";
import { profileFromRow } from "./profiles";
import { FAMILY_KEYS, type ContextKey, type FamilyKey, type SensoryKey } from "./config";

const p = (k: keyof typeof GOLDEN) => profileFromRow(GOLDEN[k])!;
const top = (k: keyof typeof GOLDEN): FamilyKey => [...FAMILY_KEYS].sort((a, b) => p(k).families[b] - p(k).families[a])[0];

// [more, less]: the first should read higher on the dimension than the second.
const SENSORY: Record<SensoryKey, [keyof typeof GOLDEN, keyof typeof GOLDEN][]> = {
  freshness: [["lightBlue", "blackOrchid"], ["acquaDiGio", "tobaccoVanille"], ["brightCrystal", "angel"], ["sauvage", "angel"]],
  sweetness: [["angel", "sauvage"], ["tobaccoVanille", "terreHermes"], ["blackOpium", "encreNoire"], ["angel", "lightBlue"]],
  darkness: [["blackOrchid", "lightBlue"], ["tobaccoVanille", "brightCrystal"], ["aventus", "chloe"], ["encreNoire", "acquaDiGio"]],
  cleanliness: [["acquaDiGio", "angel"], ["lightBlue", "tobaccoVanille"], ["brightCrystal", "blackOrchid"], ["chloe", "fahrenheit"]],
  density: [["tobaccoVanille", "lightBlue"], ["angel", "acquaDiGio"], ["blackOrchid", "chloe"]],
  warmth: [["tobaccoVanille", "acquaDiGio"], ["angel", "lightBlue"], ["blackOrchid", "brightCrystal"], ["brc540", "chloe"]],
  dryness: [["encreNoire", "angel"], ["terreHermes", "blackOpium"], ["sauvage", "tobaccoVanille"]],
  intensity: [["angel", "lightBlue"], ["blackOrchid", "chloe"], ["tobaccoVanille", "acquaDiGio"]],
  sensuality: [["blackOpium", "acquaDiGio"], ["blackOrchid", "lightBlue"], ["flowerbomb", "encreNoire"]],
  novelty: [["aventus", "chloe"], ["brc540", "lightBlue"], ["encreNoire", "jadore"]],
};

describe("accord tables, calibrated on real fragrances", () => {
  for (const [dim, pairs] of Object.entries(SENSORY) as [SensoryKey, typeof SENSORY[SensoryKey]][]) {
    for (const [more, less] of pairs) {
      it(`${dim}: ${more} reads higher than ${less}`, () => {
        expect(p(more).sensory[dim]).toBeGreaterThan(p(less).sensory[dim]);
      });
    }
  }

  it("puts each fragrance in a sensible lead family", () => {
    const expected: Partial<Record<keyof typeof GOLDEN, FamilyKey[]>> = {
      angel: ["gourmand", "amber"], lightBlue: ["fresh"], jadore: ["floral"], chloe: ["floral"], flowerbomb: ["floral"],
      tobaccoVanille: ["amber", "gourmand"], acquaDiGio: ["fresh"], encreNoire: ["woody"], brightCrystal: ["floral", "fresh"],
      terreHermes: ["woody", "fresh"], blackOrchid: ["amber", "woody"], sauvage: ["fresh", "woody", "amber"], bleu: ["woody", "fresh", "amber"],
    };
    for (const [k, ok] of Object.entries(expected) as [keyof typeof GOLDEN, FamilyKey[]][]) expect(ok, `${k} led by ${top(k)}`).toContain(top(k));
  });

  it("reads occasions the way the wearer would", () => {
    const ctx = (k: keyof typeof GOLDEN, c: ContextKey) => p(k).context[c];
    expect(ctx("lightBlue", "casual")).toBeGreaterThan(ctx("lightBlue", "evening"));
    expect(ctx("acquaDiGio", "outdoor")).toBeGreaterThan(ctx("tobaccoVanille", "outdoor"));
    expect(ctx("tobaccoVanille", "evening")).toBeGreaterThan(ctx("tobaccoVanille", "office"));
    expect(ctx("blackOpium", "date")).toBeGreaterThan(ctx("acquaDiGio", "date"));
    expect(ctx("brightCrystal", "office")).toBeGreaterThan(ctx("angel", "office"));
    expect(ctx("encreNoire", "formal")).toBeGreaterThan(ctx("angel", "formal"));
  });
});
