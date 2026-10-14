import { describe, expect, it } from "vitest";
import { CLUSTERS, OCCASIONS, PROJECTIONS, tempBand } from "./framework";
import { sprayAdvice, suggest, wearable } from "./suggest";
import { bySeason, byOccasion, costPerWear, daysSinceWorn, mostLeast, runningLow, seasonOf, wearCounts } from "./stats";
import { bottleRow, wearRow } from "./validate";

const TODAY = "2026-10-14";
const b = (id, extra = {}) => ({ id, name: id, status: "owned", family: null, clusters: [], projection: null, fill_pct: null, ...extra });
const w = (bottle_id, worn_on, extra = {}) => ({ bottle_id, worn_on, ...extra });

describe("framework", () => {
  it("reads the temperature bands as the handbook gives them", () => {
    expect([35, 30, 29.9, 20, 19.9, 15, 14.9, -5].map(tempBand)).toEqual(["hot", "hot", "warm", "warm", "mild", "mild", "cool", "cool"]);
    expect(tempBand("")).toBeNull();
    expect(tempBand(undefined)).toBeNull();
  });
  it("only names known wardrobes and projections in the occasion table", () => {
    for (const o of OCCASIONS) {
      expect(o.clusters.every((c) => CLUSTERS.includes(c))).toBe(true);
      expect(PROJECTIONS).toContain(o.ceiling);
    }
    expect(OCCASIONS).toHaveLength(8);
  });
  it("lets only nightlife reach statement", () => {
    expect(OCCASIONS.filter((o) => o.ceiling === "statement").map((o) => o.id)).toEqual(["nightlife"]);
  });
});

describe("suggest", () => {
  const fresh = b("fresh", { family: "fresh" });
  const amber = b("amber", { family: "oriental" });
  const woody = b("woody", { family: "woody" });
  const ctx = (o) => ({ today: TODAY, ...o });
  const top = (r) => r[0].bottle.id;

  it("puts fresh first in the heat and amber first in the cold", () => {
    expect(top(suggest([amber, fresh, woody], [], ctx({ tempC: 35 })))).toBe("fresh");
    expect(top(suggest([fresh, woody, amber], [], ctx({ tempC: 8 })))).toBe("amber");
  });
  it("prefers cleaner by day and richer at night", () => {
    expect(top(suggest([amber, fresh], [], ctx({ time: "morning" })))).toBe("fresh");
    expect(top(suggest([fresh, amber], [], ctx({ time: "night" })))).toBe("amber");
  });
  it("explains every point it gives", () => {
    const [r] = suggest([fresh], [], ctx({ tempC: 35, time: "day" }));
    expect(r.reasons.map((x) => x.key)).toEqual(["weather", "time", "neverWorn"]);
    expect(r.score).toBe(r.reasons.reduce((s, x) => s + x.points, 0));
  });
  it("uses the owner's own wardrobe tags in full and a family guess at half", () => {
    const tagged = b("tagged", { clusters: ["dark"], family: "woody" });
    const guessed = b("guessed", { family: "oriental" }); // inferred: dark
    const [t, g] = ["tagged", "guessed"].map((id) => suggest([tagged, guessed], [], ctx({ occasion: "date" })).find((x) => x.bottle.id === id));
    const tc = t.reasons.find((x) => x.key === "cluster"), gc = g.reasons.find((x) => x.key === "cluster");
    expect(tc).toMatchObject({ cluster: "dark", inferred: false, points: 3 });
    expect(gc).toMatchObject({ cluster: "dark", inferred: true, points: 1.5 });
  });
  it("applies the rule of restraint: a statement scent is held back at the office", () => {
    const loud = b("loud", { clusters: ["clean"], projection: "statement" });
    const quiet = b("quiet", { clusters: ["clean"], projection: "personal" });
    const r = suggest([loud, quiet], [], ctx({ occasion: "professional" }));
    expect(top(r)).toBe("quiet");
    const l = r.find((x) => x.bottle.id === "loud");
    expect(l.tooStrong).toBe(true);
    expect(l.reasons.find((x) => x.key === "tooStrong")).toMatchObject({ projection: "statement", ceiling: "personal", points: -8 });
    // the same bottle is fine in nightlife
    expect(suggest([loud], [], ctx({ occasion: "nightlife" }))[0].tooStrong).toBe(false);
  });
  it("rotates: what was worn today or lately drops, what has rested rises", () => {
    const rows = [w("a", TODAY), w("b", "2026-10-12"), w("c", "2026-09-20")];
    const r = suggest([b("a"), b("b"), b("c")], rows, ctx({}));
    expect(r.map((x) => x.bottle.id)).toEqual(["c", "b", "a"]);
    expect(r.find((x) => x.bottle.id === "c").reasons[0]).toMatchObject({ key: "rested", days: 24 });
  });
  it("breaks ties toward the bottle worn longest ago, then by name", () => {
    const rows = [w("x", "2026-10-01"), w("y", "2026-10-05")];
    expect(suggest([b("y"), b("x")], rows, ctx({})).map((r) => r.bottle.id)).toEqual(["x", "y"]);
    expect(suggest([b("zed"), b("amy")], [], ctx({})).map((r) => r.bottle.id)).toEqual(["amy", "zed"]);
  });
  it("leaves out the wish list and empty bottles", () => {
    const list = [b("own"), b("wish", { status: "wishlist" }), b("empty", { fill_pct: 0 }), b("sample", { status: "tested", fill_pct: 40 })];
    expect(wearable(list).map((x) => x.id)).toEqual(["own", "sample"]);
    expect(suggest(list, [], ctx({})).map((r) => r.bottle.id).sort()).toEqual(["own", "sample"]);
  });
  it("copes with no bottles and no context", () => {
    expect(suggest([], [], ctx({}))).toEqual([]);
    expect(suggest(undefined, undefined, ctx({}))).toEqual([]);
  });
  it("gives the handbook's spraying principle, with fewer sprays in heat", () => {
    expect(sprayAdvice(34)).toBe("fewerInHeat");
    expect(sprayAdvice(22)).toBe("lessThanInstinct");
    expect(sprayAdvice(undefined)).toBe("lessThanInstinct");
  });
});

describe("stats", () => {
  const bottles = [b("a", { name: "Alpha", price: 90 }), b("b", { name: "Bravo" }), b("c", { name: "Charlie" }), b("d", { name: "Delta" }), b("w", { name: "Wish", status: "wishlist" })];
  const wear = [w("a", "2026-07-01", { temp_c: 36, occasion: "date" }), w("a", "2026-07-02", { temp_c: 33 }), w("a", "2026-12-20", { temp_c: 12, occasion: "date" }), w("b", "2026-01-05")];

  it("counts wearings", () => expect(Object.fromEntries(wearCounts(wear))).toEqual({ a: 3, b: 1 }));
  it("lists most and least worn among owned bottles, never-worn last, ties by name", () => {
    const { most, least } = mostLeast(bottles, wear, 2);
    expect(most.map((x) => [x.bottle.name, x.wears])).toEqual([["Alpha", 3], ["Bravo", 1]]);
    expect(least.map((x) => [x.bottle.name, x.wears])).toEqual([["Charlie", 0], ["Delta", 0]]);
  });
  it("finds the season by month, flipped in the south", () => {
    expect(seasonOf("2026-12-01")).toBe("winter");
    expect(seasonOf("2026-03-01")).toBe("spring");
    expect(seasonOf("2026-07-15")).toBe("summer");
    expect(seasonOf("2026-10-14")).toBe("autumn");
    expect(seasonOf("2026-12-01", "south")).toBe("summer");
  });
  it("counts wearings by season and by recorded temperature", () => {
    const r = bySeason(wear);
    expect(r.seasons).toEqual({ spring: 0, summer: 2, autumn: 0, winter: 2 });
    expect(r.bands).toEqual({ hot: 2, warm: 0, mild: 0, cool: 1 });
  });
  it("counts occasions, skipping untagged", () => expect(byOccasion(wear)).toEqual({ date: 2 }));
  it("works out cost per wear only with a price and a wearing", () => {
    expect(costPerWear(bottles[0], 3)).toBe(30);
    expect(costPerWear(bottles[0], 0)).toBeNull();
    expect(costPerWear(bottles[1], 5)).toBeNull();
  });
  it("lists owned bottles that are running low, emptiest first", () => {
    const list = [b("x", { fill_pct: 10 }), b("y", { fill_pct: 5 }), b("z", { fill_pct: 60 }), b("n"), b("w", { fill_pct: 1, status: "wishlist" })];
    expect(runningLow(list).map((x) => x.id)).toEqual(["y", "x"]);
  });
  it("counts days since the last wearing", () => {
    expect(daysSinceWorn("a", wear, "2026-12-30")).toBe(10);
    expect(daysSinceWorn("c", wear, "2026-12-30")).toBeNull();
  });
});

describe("validate", () => {
  const ok = { name: "  Oud   Nights ", status: "owned", family: "woody", size_ml: "100", fill_pct: "80", price: "120", currency: "sar", purchase_date: "2026-09-01", clusters: ["dark", "dark", "luxury"], projection: "social", note: " good " };
  it("builds a bottle row", () => {
    const { row } = bottleRow(ok, TODAY);
    expect(row).toMatchObject({ name: "Oud Nights", kind: "bottle", family: "woody", size_ml: 100, fill_pct: 80, price: 120, currency: "SAR", clusters: ["dark", "luxury"], projection: "social", note: "good", fragrance_id: null });
  });
  it("names every bad field", () => {
    const { errors } = bottleRow({ name: " ", status: "x", family: "citrus", size_ml: 0, fill_pct: 101, price: -1, currency: "sar1", purchase_date: "2027-01-01", clusters: ["bogus"], projection: "loud", note: "n".repeat(501) }, TODAY);
    expect(errors.sort()).toEqual(["clusters", "currency", "family", "fill_pct", "name", "note", "price", "projection", "purchase_date", "size_ml", "status"]);
  });
  it("accepts blanks as nulls", () => {
    expect(bottleRow({ name: "Plain" }, TODAY).row).toMatchObject({ size_ml: null, fill_pct: null, price: null, purchase_date: null, currency: null, family: null, clusters: [] });
  });
  it("builds a wear row, defaulting to today", () => {
    const { row } = wearRow({ bottle_id: "x", occasion: "date", time_of_day: "night", temp_c: "31.5", sprays: "3" }, TODAY);
    expect(row).toMatchObject({ bottle_id: "x", worn_on: TODAY, occasion: "date", time_of_day: "night", temp_c: 31.5, sprays: 3, note: null });
  });
  it("refuses a future day, a fractional spray count, 51 sprays and an unknown occasion", () => {
    expect(wearRow({ bottle_id: "x", worn_on: "2026-10-15" }, TODAY).errors).toEqual(["worn_on"]);
    expect(wearRow({ bottle_id: "x", sprays: 2.5 }, TODAY).errors).toEqual(["sprays"]);
    expect(wearRow({ bottle_id: "x", sprays: 51 }, TODAY).errors).toEqual(["sprays"]);
    expect(wearRow({ bottle_id: "x", occasion: "gym" }, TODAY).errors).toEqual(["occasion"]);
    expect(wearRow({}, TODAY).errors).toEqual(["bottle_id"]);
  });
});

import { localDay } from "./day";
describe("localDay", () => {
  it("is the local calendar date, zero-padded", () => {
    expect(localDay(new Date(2026, 0, 5, 23, 59))).toBe("2026-01-05");
    expect(localDay(new Date(2026, 9, 14, 0, 1))).toBe("2026-10-14");
  });
});

import { reasonText } from "./reasons";
describe("reasonText", () => {
  const t = (k, p) => (p ? `${k} ${JSON.stringify(p)}` : k);
  it("says whether the weather suits or not by the sign of the points", () => {
    expect(reasonText(t, { key: "weather", band: "hot", family: "fresh", points: 3 })).toContain("weatherFor");
    expect(reasonText(t, { key: "weather", band: "hot", family: "oriental", points: -3 })).toContain("weatherAgainst");
  });
  it("names the wardrobe, noting a guess", () => {
    expect(reasonText(t, { key: "cluster", cluster: "dark", inferred: true, points: 1.5 }, { occasion: "date" })).toContain("clusterGuess");
    expect(reasonText(t, { key: "cluster", cluster: "dark", inferred: false, points: 3 }, { occasion: "date" })).toContain('"cluster":"wardrobe.clusters.dark"');
  });
  it("passes the days and falls back to a plain key", () => {
    expect(reasonText(t, { key: "rested", days: 24, points: 1 })).toBe('wardrobe.reason.rested {"days":24}');
    expect(reasonText(t, { key: "neverWorn", points: 1 })).toBe("wardrobe.reason.neverWorn");
    expect(reasonText(t, { key: "tooStrong", projection: "statement", ceiling: "personal", points: -8 }, { occasion: "professional" })).toContain("tooStrong");
  });
});
