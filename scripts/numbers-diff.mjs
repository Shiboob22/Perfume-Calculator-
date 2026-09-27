// Prints every blending number the sources disagree on, for the owner to
// decide. Needs Node 23.6+ (imports the .ts module directly).
import { differences, REFERENCE, FAMILIES, STRENGTHS } from "../src/lib/formulation.ts";

// Presets the calculator offers today (FragranceBlendCalculator.jsx).
const CALCULATOR_PRESETS = [20, 22, 25, 30];

const fmt = (v) => (v === undefined ? "—" : Array.isArray(v) ? v.join("–") : String(v));
const rows = differences();
console.log(`Reference (handbook): oil ${REFERENCE.oilDensity} g/mL, 96% ethanol ${REFERENCE.ethanolDensity} g/mL\n`);
console.log(["family", "field", "ACTIVE", "handbook", "html tool", "ratios json"].map((h) => h.padEnd(12)).join(""));
for (const r of rows) {
  console.log([r.family, r.field, fmt(r.active), fmt(r.handbook), fmt(r.htmlTool), fmt(r.ratiosJson)].map((c) => String(c).padEnd(12)).join(""));
}
const notes = [];
for (const f of Object.values(FAMILIES)) {
  const r = f.sources.ratiosJson.range;
  const d = f.active.defaultConc;
  if (r && (d < r[0] || d > r[1])) notes.push(`${f.key}: active default ${d}% is outside the ratios-json range ${r[0]}–${r[1]}%`);
}
const named = STRENGTHS.map((s) => s.pct);
if (JSON.stringify(named) !== JSON.stringify(CALCULATOR_PRESETS)) {
  notes.push(`calculator presets ${CALCULATOR_PRESETS.join("/")}% vs handbook named strengths ${named.join("/")}%`);
}
notes.push("rest days: only the html tool gives them; the handbook does not cover maceration");
console.log("\nAlso:\n" + notes.map((n) => "  - " + n).join("\n"));
console.log(`\n${rows.length} differences. Change an ACTIVE value in src/lib/formulation.ts only after the owner decides.`);
