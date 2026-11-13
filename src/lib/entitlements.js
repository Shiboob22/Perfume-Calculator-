// Plans and feature gates, shared by the browser and the /api functions so
// both answer "may this user do X?" the same way. The plan data itself
// (features, caps) lives in the `plans` table; this file only reads it.
// The database enforces the same limits on its own (0031: formula and
// ingredient caps in triggers, the trial through effective_plan()), so a
// client that skips these checks is still refused.

export const FEATURES = [
  "batches.unlimited",
  "inventory",
  "ai.ask",
  "export.labels",
  "calculator.advanced",
  "cards.download",
  "journal.insights",
  "journal.checkins",
  "journal.reminders",
];

// Bench SaaS names for the gates (Phase 2). A string is the plan feature
// that unlocks it; null means every plan has it. Label PNG and share links
// stay Free (owner, Phase 0): they are listed so the UI can ask, and the
// answer is always yes.
export const GATES = Object.freeze({
  reminders: "journal.reminders",
  costPerBottle: "calculator.advanced",
  fullJournal: "journal.checkins",
  labelPng: null,
  shareLinks: null,
});

// Plan limits by name: the `plans` column each one reads (null = unlimited).
export const LIMITS = Object.freeze({
  formulas: "formulaCap",
  ingredients: "ingredientCap",
  journalBatches: "journalWindow",
});

// What a user gets when no plan row can be loaded: Free, with nothing extra
// and Free's limits. Free has no formula limit (0034): every plan keeps the
// database's 50-per-user guard, as before the Bench SaaS round.
export const FALLBACK = Object.freeze({
  plan: "free", name: "Free", features: [], batchCap: 25,
  formulaCap: null, ingredientCap: 3, journalWindow: 3, trial: null,
});

// Normalise a `plans` row (snake_case, from the database) into entitlements.
export function fromPlanRow(row) {
  if (!row) return FALLBACK;
  return {
    plan: row.id,
    name: row.name,
    features: Array.isArray(row.features) ? row.features : [],
    batchCap: row.batch_cap ?? null,
    formulaCap: row.formula_cap ?? null,
    ingredientCap: row.ingredient_cap ?? null,
    journalWindow: row.journal_window ?? null,
    trial: null,
  };
}

// The plan in force from a user_plans row, as the database's
// effective_plan() decides it: a trial that has ended (or has no end) is
// Free. Returns the plan id, or null when there is no row (Free).
export function planInForce(userPlan, now = new Date()) {
  if (!userPlan) return null;
  if (userPlan.source === "trial") {
    const ends = userPlan.trial_ends_at ? new Date(userPlan.trial_ends_at) : null;
    if (!ends || !(ends > now)) return "free";
  }
  return userPlan.plan_id ?? userPlan.plans?.id ?? null;
}

// The trial as the app shows it: { endsAt, daysLeft, active, used }, or null
// when the user never started one.
export function trialState(userPlan, now = new Date()) {
  if (!userPlan?.trial_started_at) return null;
  const endsAt = userPlan.trial_ends_at ?? null;
  const ms = endsAt ? new Date(endsAt) - now : 0;
  const active = userPlan.source === "trial" && ms > 0;
  return { endsAt, active, used: true, daysLeft: active ? Math.ceil(ms / 86_400_000) : 0 };
}

// may this user do X? `what` is a gate name (GATES) or a plan feature key.
export function can(entitlements, what) {
  if (Object.prototype.hasOwnProperty.call(GATES, what)) {
    const feature = GATES[what];
    return feature === null || Boolean(entitlements?.features?.includes(feature));
  }
  return Boolean(entitlements?.features?.includes(what));
}

// A plan limit by name (LIMITS): a number, or Infinity when unlimited.
// Missing entitlements read as Free's limit, never as unlimited.
export function limit(entitlements, name) {
  const key = LIMITS[name];
  if (!key) throw new Error(`Unknown limit: ${name}`);
  const given = entitlements ? entitlements[key] : undefined;
  const value = given === undefined ? FALLBACK[key] : given;
  return value === null ? Infinity : value;
}

// How many more fit under a limit, given how many are used.
export function left(entitlements, name, used) {
  return Math.max(limit(entitlements, name) - (Number(used) || 0), 0);
}

export const canAddFormula = (entitlements, formulasUsed) => left(entitlements, "formulas", formulasUsed) > 0;
export const canAddIngredient = (entitlements, ingredientsInBlend) => left(entitlements, "ingredients", ingredientsInBlend) > 0;

// Which batches' rest journals are open: the newest N by batch number (Free
// N = 3), all of them on Pro. Older ones stay readable data; they are
// locked for new notes. Returns a Set of batch ids.
export function journalOpen(entitlements, batches) {
  const list = [...(batches || [])];
  if (can(entitlements, "fullJournal")) return new Set(list.map((b) => b.id));
  const n = limit(entitlements, "journalBatches");
  list.sort((a, b) => (Number(b.batch_no) || 0) - (Number(a.batch_no) || 0)
    || String(b.created_at ?? "").localeCompare(String(a.created_at ?? "")));
  return new Set(list.slice(0, n).map((b) => b.id));
}

// Saved batches still allowed, or Infinity when the plan has no cap.
export function batchesLeft(entitlements, used) {
  if (can(entitlements, "batches.unlimited") || entitlements?.batchCap == null) return Infinity;
  return Math.max(entitlements.batchCap - (Number(used) || 0), 0);
}

export function canLogBatch(entitlements, used) {
  return batchesLeft(entitlements, used) > 0;
}
