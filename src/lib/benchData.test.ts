// The data functions against stubbed clients. The repo has no local
// Supabase stack (no supabase/config.toml), so these mock at the client
// boundary: a fake PostgREST builder that records each call and answers
// from a script, and a fake /api fetch. The database side of the same rules
// (caps, RLS, numbering, the trial) runs on staging in
// supabase/tests/bench_saas.sql.
import { describe, it, expect } from "vitest";
import {
  listFormulas, saveFormula, deleteFormula, logBatch, upsertNote, toggleRemind, startTrial, LimitError, ApiError,
} from "./benchData";
// @ts-ignore: plain JS
import { fromPlanRow } from "./entitlements.js";

const free = fromPlanRow({ id: "free", name: "Free", features: [], batch_cap: 25, formula_cap: 5, ingredient_cap: 3, journal_window: 3 });
const pro = fromPlanRow({ id: "pro", name: "Pro", features: ["journal.checkins", "journal.reminders"], batch_cap: null });

type Answer = { data?: unknown; error?: { code?: string; message?: string } | null };

/** A PostgREST stand-in: every chain ends in one scripted answer per table+verb. */
function fakeDb(script: Record<string, Answer[]>) {
  const log: { table: string; verb: string; payload?: unknown; filters: unknown[] }[] = [];
  const db = {
    from(table: string) {
      const entry = { table, verb: "select", payload: undefined as unknown, filters: [] as unknown[] };
      const answer = () => {
        log.push(entry);
        const queue = script[`${table}.${entry.verb}`] ?? [];
        return Promise.resolve({ data: null, error: null, ...(queue.shift() ?? {}) });
      };
      const q: any = {
        select: () => q,
        insert: (p: unknown) => { entry.verb = "insert"; entry.payload = p; return q; },
        delete: () => { entry.verb = "delete"; return q; },
        eq: (...f: unknown[]) => { entry.filters.push(f); return q; },
        order: () => q,
        single: answer,
        then: (ok: any, bad: any) => answer().then(ok, bad),
      };
      return q;
    },
  };
  return { db: db as any, log };
}

function fakeApi(status: number, body: unknown) {
  const calls: { path: string; init?: { method?: string; body?: unknown } }[] = [];
  const api = async (path: string, init?: { method?: string; body?: unknown }) => {
    calls.push({ path, init });
    return new Response(JSON.stringify(body), { status });
  };
  return { api, calls };
}

const VERSION = { amount: 50, unit: "ml" as const, concentration_pct: 20 };
const SAVED = { id: "r1", name: "Neroli Eau", recipe_versions: [{ id: "v1", recipe_ingredients: [] }] };

describe("listFormulas / deleteFormula", () => {
  it("reads formulas with versions and ingredients", async () => {
    const { db } = fakeDb({ "recipes.select": [{ data: [SAVED] }] });
    expect(await listFormulas(db)).toEqual([SAVED]);
  });
  it("deletes by id and passes the database error on", async () => {
    const { db, log } = fakeDb({ "recipes.delete": [{}, { error: { code: "42501", message: "denied" } }] });
    await deleteFormula(db, "r1");
    expect(log[0]).toMatchObject({ table: "recipes", verb: "delete", filters: [["id", "r1"]] });
    await expect(deleteFormula(db, "r1")).rejects.toMatchObject({ code: "42501" });
  });
});

describe("saveFormula", () => {
  it("saves a new formula, its first version and its ingredients in order", async () => {
    const { db, log } = fakeDb({
      "recipes.insert": [{ data: { id: "r1" } }],
      "recipe_versions.insert": [{ data: { id: "v1" } }],
      "recipe_ingredients.insert": [{}],
      "recipes.select": [{ data: [SAVED] }],
    });
    const saved = await saveFormula(db, free, 4, {
      name: " Neroli Eau ", family: "fresh", version: VERSION,
      ingredients: [{ name: "Bergamot", type: "eo", pct: 60, price_per_g: 6 }, { name: " Hedione ", pct: 40 }],
    });
    expect(saved).toEqual(SAVED);
    expect(log.map((l) => `${l.table}.${l.verb}`)).toEqual(["recipes.insert", "recipe_versions.insert", "recipe_ingredients.insert", "recipes.select"]);
    expect(log[0].payload).toEqual({ name: "Neroli Eau", family: "fresh" });
    expect(log[2].payload).toEqual([
      { version_id: "v1", position: 0, name: "Bergamot", type: "eo", pct: 60, price_per_g: 6 },
      { version_id: "v1", position: 1, name: "Hedione", type: "eo", pct: 40, price_per_g: null },
    ]);
  });

  it("refuses a sixth formula on Free before writing anything", async () => {
    const { db, log } = fakeDb({});
    await expect(saveFormula(db, free, 5, { name: "Six", version: VERSION })).rejects.toEqual(new LimitError("formula_cap", 5));
    expect(log).toEqual([]);
  });

  it("lets Pro save past 5, and versions of a saved formula never count", async () => {
    const { db } = fakeDb({ "recipes.insert": [{ data: { id: "r1" } }], "recipe_versions.insert": [{ data: { id: "v1" } }, { data: { id: "v2" } }], "recipes.select": [{ data: [SAVED] }, { data: [SAVED] }] });
    await expect(saveFormula(db, pro, 40, { name: "Many", version: VERSION })).resolves.toEqual(SAVED);
    await expect(saveFormula(db, free, 5, { recipeId: "r1", version: VERSION })).resolves.toEqual(SAVED);
  });

  it("refuses a fourth material on Free before writing anything", async () => {
    const { db, log } = fakeDb({});
    const four = [1, 2, 3, 4].map((n) => ({ name: `M${n}`, pct: 25 }));
    await expect(saveFormula(db, free, 0, { name: "Big", version: VERSION, ingredients: four })).rejects.toEqual(new LimitError("ingredient_cap", 3));
    expect(log).toEqual([]);
  });

  it("turns the database's own cap into a LimitError and removes the half-made formula", async () => {
    const { db, log } = fakeDb({
      "recipes.insert": [{ data: { id: "r9" } }],
      "recipe_versions.insert": [{ data: { id: "v9" } }],
      "recipe_ingredients.insert": [{ error: { code: "54000", message: "ingredient_cap 3" } }],
    });
    // A client that thinks it is Pro (stale plan): the database still says no.
    const err = await saveFormula(db, pro, 0, { name: "Sneaky", version: VERSION, ingredients: [1, 2, 3, 4].map((n) => ({ name: `M${n}`, pct: 25 })) }).catch((e) => e);
    expect(err).toBeInstanceOf(LimitError);
    expect(err).toMatchObject({ code: "ingredient_cap", cap: 3 });
    expect(log.at(-1)).toMatchObject({ table: "recipes", verb: "delete", filters: [["id", "r9"]] });
  });

  it("maps the database formula cap too", async () => {
    const { db } = fakeDb({ "recipes.insert": [{ error: { code: "54000", message: "formula_cap 5" } }] });
    await expect(saveFormula(db, pro, 0, { name: "Six", version: VERSION })).rejects.toMatchObject({ code: "formula_cap", cap: 5 });
  });

  it("removes only the new version when ingredients fail on an existing formula", async () => {
    const { db, log } = fakeDb({
      "recipe_versions.insert": [{ data: { id: "v3" } }],
      "recipe_ingredients.insert": [{ error: { code: "23514", message: "check" } }],
    });
    await expect(saveFormula(db, pro, 0, { recipeId: "r1", version: VERSION, ingredients: [{ name: "X", pct: 100 }] })).rejects.toMatchObject({ code: "23514" });
    expect(log.at(-1)).toMatchObject({ table: "recipe_versions", verb: "delete", filters: [["id", "v3"]] });
    expect(log.some((l) => l.table === "recipes" && l.verb === "delete")).toBe(false);
  });

  it("needs a name for a new formula", async () => {
    const { db } = fakeDb({});
    await expect(saveFormula(db, free, 0, { name: "  ", version: VERSION })).rejects.toThrow(/needs a name/);
  });
});

describe("API-backed functions", () => {
  it("logBatch posts the batch and returns the numbered row", async () => {
    const { api, calls } = fakeApi(201, { batch: { id: "b1", batch_no: 42 } });
    expect(await logBatch(api, { fragrance_name: "Amber Room" })).toEqual({ id: "b1", batch_no: 42, duplicate: false });
    expect(calls[0]).toEqual({ path: "/api/batches", init: { method: "POST", body: { fragrance_name: "Amber Room" } } });
  });
  it("upsertNote posts with upsert: true", async () => {
    const { api, calls } = fakeApi(200, { checkin: { id: "n1", tags: ["rounder"] } });
    const note = { id: "n1", batch_id: "b1", day: 7, scheduled_day: 7, note: "Rounder", rating: 3, tags: ["rounder"] };
    expect(await upsertNote(api, note)).toEqual({ id: "n1", tags: ["rounder"] });
    expect(calls[0].init).toEqual({ method: "POST", body: { ...note, upsert: true } });
  });
  it("toggleRemind patches the batch, and a Free refusal comes back as ApiError", async () => {
    const ok = fakeApi(200, { batch: { id: "b1", remind: true } });
    expect(await toggleRemind(ok.api, "b1", true)).toEqual({ id: "b1", remind: true });
    expect(ok.calls[0]).toEqual({ path: "/api/batches", init: { method: "PATCH", body: { id: "b1", remind: true } } });
    const locked = fakeApi(403, { error: "This feature is part of Pro.", code: "feature_locked", feature: "journal.reminders" });
    const err = await toggleRemind(locked.api, "b1", true).catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err).toMatchObject({ status: 403, code: "feature_locked" });
  });
  it("startTrial posts the action and passes trial_used through", async () => {
    const ok = fakeApi(201, { status: "started", trial_ends_at: "2026-11-19T12:00:00Z", days: 14 });
    expect(await startTrial(ok.api)).toMatchObject({ status: "started", days: 14 });
    expect(ok.calls[0]).toEqual({ path: "/api/account", init: { method: "POST", body: { action: "start_trial" } } });
    await expect(startTrial(fakeApi(409, { code: "trial_used" }).api)).rejects.toMatchObject({ status: 409, code: "trial_used" });
  });
  it("copes with an answer that is not JSON", async () => {
    const api = async () => new Response("Bad gateway", { status: 502 });
    await expect(logBatch(api, {})).rejects.toMatchObject({ status: 502, message: "Request failed (502)" });
  });
});
