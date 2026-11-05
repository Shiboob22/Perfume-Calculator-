// Typed data access for the Bench SaaS round (Phase 2). Formulas (recipes +
// versions + blend ingredients) are written straight to the database under
// RLS, like recipes since 0023; batches, notes, reminders and the trial go
// through /api, where the plan checks and rate limits live. The database
// enforces the formula and ingredient caps itself (0031 triggers); the
// checks here only spare the round trip and give the UI a clear code.
//
// Both clients are passed in, so tests stub them at the boundary and the
// app wires the real ones in src/lib/benchApi.js.
import type { PostgrestClient } from "@supabase/postgrest-js";
import type { Database } from "./database.types";
// @ts-ignore: plain JS shared with the API
import { canAddFormula, limit } from "./entitlements.js";

type Tables = Database["public"]["Tables"];
export type RecipeRow = Tables["recipes"]["Row"];
export type VersionRow = Tables["recipe_versions"]["Row"];
export type IngredientRow = Tables["recipe_ingredients"]["Row"];
export type BatchRow = Tables["batches"]["Row"];
export type NoteRow = Tables["batch_checkins"]["Row"];

export type Db = PostgrestClient<Database>;
/** fetch for /api with the session's Authorization header already added. */
export type Api = (path: string, init?: { method?: string; body?: unknown }) => Promise<Response>;

export type Formula = RecipeRow & { recipe_versions: (VersionRow & { recipe_ingredients: IngredientRow[] })[] };

export interface IngredientInput { name: string; type?: "eo" | "aroma" | "absolute" | "fixative" | "dpg"; pct: number; price_per_g?: number | null }
export interface VersionInput {
  amount: number; unit: "ml" | "floz" | "g" | "oz"; concentration_pct: number;
  oil_density?: number | null; ethanol_density?: number | null; note?: string | null;
}
export interface FormulaInput {
  /** Save as the next version of this formula; omit for a new formula. */
  recipeId?: string;
  name?: string;
  family?: string | null;
  version: VersionInput;
  ingredients?: IngredientInput[];
}

/** A plan limit was reached: `code` is the limit, `cap` its value. */
export class LimitError extends Error {
  code: "formula_cap" | "ingredient_cap";
  cap: number;
  constructor(code: "formula_cap" | "ingredient_cap", cap: number) {
    super(code === "formula_cap" ? `Your plan keeps up to ${cap} formulas.` : `Your plan allows up to ${cap} materials in a blend.`);
    this.name = "LimitError";
    this.code = code;
    this.cap = cap;
  }
}

/** An /api answer that wasn't ok: the server's code and message. */
export class ApiError extends Error {
  status: number;
  code?: string;
  body: Record<string, unknown>;
  constructor(status: number, body: Record<string, unknown>) {
    super(typeof body.error === "string" ? body.error : `Request failed (${status})`);
    this.name = "ApiError";
    this.status = status;
    this.code = typeof body.code === "string" ? body.code : undefined;
    this.body = body;
  }
}

// The database's own refusal ("formula_cap 5", SQLSTATE 54000) as a LimitError.
function fromDbError(error: { code?: string; message?: string } | null): Error | null {
  if (!error) return null;
  const m = /^(formula_cap|ingredient_cap) (\d+)/.exec(error.message ?? "");
  if (error.code === "54000" && m) return new LimitError(m[1] as LimitError["code"], Number(m[2]));
  return Object.assign(new Error(error.message ?? "Database error"), { code: error.code });
}

async function json<T>(res: Response): Promise<T> {
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, body as Record<string, unknown>);
  return body as T;
}

const FORMULA_COLUMNS =
  "id, user_id, name, family, created_at, updated_at, recipe_versions ( id, recipe_id, user_id, version, amount, unit, concentration_pct, oil_density, ethanol_density, note, created_at, recipe_ingredients ( id, version_id, user_id, position, name, type, pct, price_per_g, created_at ) )";

/* ------------------------------------------------------------- formulas */

/** Every formula with its versions and their ingredients, newest activity first. */
export async function listFormulas(db: Db): Promise<Formula[]> {
  const { data, error } = await db.from("recipes").select(FORMULA_COLUMNS).order("updated_at", { ascending: false });
  if (error) throw fromDbError(error);
  return (data ?? []) as unknown as Formula[];
}

/**
 * Saves a formula: a new one (name, first version, ingredients) or the next
 * version of an existing one. Checks the plan first (`formulasUsed` is how
 * many the user has); the database refuses the same things on its own.
 * A new formula whose version or ingredients are refused is removed again.
 */
export async function saveFormula(db: Db, entitlements: unknown, formulasUsed: number, input: FormulaInput): Promise<Formula> {
  const ingredients = input.ingredients ?? [];
  if (ingredients.length > limit(entitlements, "ingredients")) throw new LimitError("ingredient_cap", limit(entitlements, "ingredients"));

  let recipeId = input.recipeId;
  const isNew = !recipeId;
  if (isNew) {
    if (!canAddFormula(entitlements, formulasUsed)) throw new LimitError("formula_cap", limit(entitlements, "formulas"));
    const name = (input.name ?? "").trim();
    if (!name) throw new Error("A formula needs a name.");
    const { data, error } = await db.from("recipes").insert({ name, family: input.family ?? null }).select("id").single();
    if (error) throw fromDbError(error);
    recipeId = data.id;
  }

  try {
    const { data: version, error: versionError } = await db
      .from("recipe_versions").insert({ recipe_id: recipeId!, ...input.version, version: 0 }).select("id").single();
    if (versionError) throw fromDbError(versionError);
    if (ingredients.length) {
      const rows = ingredients.map((i, position) => ({
        version_id: version.id, position, name: i.name.trim(), type: i.type ?? "eo", pct: i.pct, price_per_g: i.price_per_g ?? null,
      }));
      const { error: ingredientError } = await db.from("recipe_ingredients").insert(rows);
      if (ingredientError) {
        if (!isNew) await db.from("recipe_versions").delete().eq("id", version.id);
        throw fromDbError(ingredientError);
      }
    }
  } catch (e) {
    if (isNew) await db.from("recipes").delete().eq("id", recipeId!);
    throw e;
  }

  const saved = (await listFormulas(db)).find((f) => f.id === recipeId);
  if (!saved) throw new Error("The formula was saved but could not be read back.");
  return saved;
}

export async function deleteFormula(db: Db, id: string): Promise<void> {
  const { error } = await db.from("recipes").delete().eq("id", id);
  if (error) throw fromDbError(error);
}

/* ---------------------------------------------------- batches and notes */

/** Logs a batch (POST /api/batches); the server numbers it (batch_no). */
export async function logBatch(api: Api, batch: Record<string, unknown>): Promise<BatchRow & { duplicate: boolean }> {
  const body = await json<{ batch: BatchRow; duplicate?: boolean }>(await api("/api/batches", { method: "POST", body: batch }));
  return { ...body.batch, duplicate: Boolean(body.duplicate) };
}

export interface NoteInput {
  /** Client id: the same id edits the same note. */
  id: string;
  batch_id: string;
  /** Rest day it was written on, and the milestone it answers (null = ad hoc). */
  day: number;
  scheduled_day?: number | null;
  note?: string | null;
  rating?: number | null;
  tags?: string[];
}

/** Creates or replaces the note for a batch at a milestone (POST /api/checkins with upsert). */
export async function upsertNote(api: Api, note: NoteInput): Promise<NoteRow> {
  const body = await json<{ checkin: NoteRow }>(await api("/api/checkins", { method: "POST", body: { ...note, upsert: true } }));
  return body.checkin;
}

/** Turns the rest reminder for a batch on or off (Pro to turn on). */
export async function toggleRemind(api: Api, batchId: string, remind: boolean): Promise<BatchRow> {
  const body = await json<{ batch: BatchRow }>(await api("/api/batches", { method: "PATCH", body: { id: batchId, remind } }));
  return body.batch;
}

/* --------------------------------------------------------------- trial */

/** Starts the 14-day Pro trial. Throws ApiError with code trial_used / already_pro. */
export async function startTrial(api: Api): Promise<{ status: "started"; trial_ends_at: string; days: number }> {
  return json(await api("/api/account", { method: "POST", body: { action: "start_trial" } }));
}
