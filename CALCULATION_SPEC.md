# Calculation spec (as implemented, after the 2026-10-09 QA fixes)

Code: `src/lib/calc/` (pure, no UI). Constants: `src/lib/formulation.ts`. Independent oracle tests: `src/lib/calc/oracle.test.ts`; Vol. III golden values: `calc.test.ts`.

## Definitions
- **Concentration C** is the oil share of the batch **on the basis of the batch unit**: mL / fl oz → *by volume*; g / oz → *by weight*. Never mixed; every result carries `basis`.
- Densities are g/mL: ρ_oil, ρ_eth. They are assumptions unless measured (measured density wins).
- Volumes are **nominal sums of component volumes**. Ethanol + oil mixtures contract slightly, so the physical volume of the mix can differ from V_oil + V_eth. The UI says so (`calc.onAccuracy`); the model never claims a measured final volume.

## Modes
| Mode | Function | Equations |
|---|---|---|
| Bottle (volume) | `byVolume` | V_oil = V·C; V_eth = V·(1−C); m_oil = V_oil·ρ_oil; m_eth = V_eth·ρ_eth; M = m_oil + m_eth |
| Bottle (weight) | `byWeight` | m_oil = W·C; m_eth = W·(1−C); V_x = m_x/ρ_x |
| Other-basis % | `volumeToWeightFraction` / `weightToVolumeFraction` | C_w = Cρ_oil / (Cρ_oil + (1−C)ρ_eth); C_v = (C/ρ_oil) / (C/ρ_oil + (1−C)/ρ_eth) |
| Oil on hand | `solveFromOil` | by volume: V = (m_oil/ρ_oil)/C; by weight: W = m_oil/C. Uses *all* the oil; whole bottles = floor(V/bottle) with 12-digit float guard |
| Change concentration | `adjustConcentration` | Only ever **adds**. Raise to B: add oil x = (B·T − oil)/(1−B). Lower: add ethanol x = oil/B − T (T, oil on the chosen basis). Preserves the existing batch (nothing removed); capacity / oil-on-hand limits give the closest reachable C. 0% and 100% are unreachable |
| Several bottles | `solveRun` | V = Σ size·count·(1+overfill%); then Bottle (volume). Per-bottle grams use the mix's g/mL |
| Pour check | `checkPour` | Compares weighed pours with target; reports deviation, no pass/fail unless a tolerance is set |

## Units
1 fl oz = 29.5735 mL, 1 oz = 28.3495 g (4-decimal constants; ≤1e-6 relative error vs exact, immaterial at bench precision).

## Rounding
Full precision internally. Display only: each pour rounded half-away-from-zero to 0.01 g on the intended decimal (`round2`, 12-significant-digit pre-trim, so 4.275 → 4.28); displayed total = sum of the two displayed pours (matches the handbook table). A 0.01 g display is readability, not accuracy: a typical bench scale is ±0.01–0.05 g, so pours under ~1 g are not reliable.

## Input rules (after fixes)
- Amount ≤ 0, non-numeric or non-finite → all quantities 0 and warning `amount_not_positive` (previously negative grams were shown).
- Concentration is clamped to 0–100 for computation; outside (0,100) warns `concentration_out_of_bounds`.
- Blank / zero / NaN density falls back (oil 1.00, ethanol 0.81) **and now warns** (`oil_density_missing`, `ethanol_density_missing`). Previously silent.
- Plausible-density warnings: oil 0.80–1.20, ethanol 0.78–0.83 g/mL.
- Mode panels (oil on hand, adjust, run) only compute for strictly positive inputs and 0 < C < 100.
- Server: inventory `stock_g` / `low_stock_threshold_g` must be finite, 0…1,000,000; restock delta finite, |Δ| ≤ 1,000,000. Batch amounts 0 < g ≤ 100,000.

## Known physical limits
- 0.81 g/mL for "96% ethanol" is an approximation (pure ethanol ≈ 0.789 at 20 °C; 96 % v/v vs w/w and temperature move it within roughly 0.80–0.82). ≈1 % mass error possible on the alcohol line; check the supplier's datasheet. **Not verified against a primary source in this audit.**
- Family default oil densities (e.g. 1.00 shown in the audit screenshot) are bench starting points from `tiers.js`, not handbook data; the Quick-Reference and guide links use 0.95. Both are labelled "densities used" on screen.
- Volume contraction on mixing is not modelled.

## Regression cases (all pass)
- 200 mL @ 25 %, ρ 1.00 / 0.81 → oil 50 g/50 mL, ethanol 121.50 g/150 mL, total 171.50 g/200 mL, weight share 29.15 %.
- 3 × 50 mL @ 25 %, 0.95 / 0.81 → oil 35.625 g, ethanol 91.125 g, total 126.75 g, weight share **28.11 %** (the brief's "≈28.10 %" is a rounding slip: 35.625/126.75 = 0.281065).
- 100 mL @ 25 %, 0.95 / 0.81 → 23.75 / 60.75 / 84.50 g (Vol. III).
