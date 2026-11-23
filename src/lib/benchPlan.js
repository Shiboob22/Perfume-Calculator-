// Where Pour along keeps the batch it was opened with (sessionStorage), so the
// app shell can tell "a run to pour" (full screen) from "opened with nothing" (audit L6)
// without loading BenchMode.
export const BENCH_PLAN_KEY = "sh-bench";

export function hasBenchPlan(state) {
  if (state?.plan) return true;
  try { return Boolean(JSON.parse(sessionStorage.getItem(BENCH_PLAN_KEY))); } catch { return false; }
}
