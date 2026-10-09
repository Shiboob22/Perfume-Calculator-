# UX improvements (ranked)

Based on code and rendered-page inspection; signed-in screens were not walked on a phone (no test account used).

1. **Make the nominal-volume caveat visible next to the result (P2).** Problem: "200 mL" is the sum of component volumes; the note (`calc.onAccuracy`) is under the readout but at 11 px in dim text, easy to miss. Affects: beginners who expect a measured final volume. Change: raise it to body size and say "Volumes are nominal; the mix may measure slightly less." Test: computed font-size ≥ 13 px in e2e.
2. **Say which density is assumed and why 1.00 appears (P2).** Problem: family defaults (up to 1.00) differ from the 0.95 used in guides; the Densities panel is collapsed. Change: show "Oil density 1.00 g/mL (family estimate, measure yours)" in the result header with a link to Measure. Test: axe + text check; compare guide vs calculator for the same oil.
3. **Label weight vs volume percentages everywhere (P3).** The readout shows both but the second is small. Change: "25 % by volume = 29.15 % by weight" as one sentence. Test: snapshot of readout text.
4. **Blank density feedback (done in code).** New warnings explain the fallback. Needs Arabic review by the owner.
5. **Mode panels: state what is preserved (P3).** The Adjust mode already only adds; add the sentence "Keeps your current batch and adds X". Test: text assertion.
6. **Scale-precision hint (P3).** Warn when a pour is under ~1 g that a 0.01 g display does not mean 0.01 g accuracy.
7. **Selector (P3).** Plain-language labels exist; verify 320 px focus order with a screen reader (not done here).
8. **Phone walkthrough EN/AR signed in (owner).** Still open from Phase 8.
