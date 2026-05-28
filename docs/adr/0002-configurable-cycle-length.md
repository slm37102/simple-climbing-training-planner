# Configurable macrocycle length with derived phase split

The original implementation hard-coded a 12-week (84-day) macrocycle in `js/program.js` (`PHASE_PATTERN` was a 12-element constant). This worked for the canonical Lattice / Hörst / Anderson template, but did not let the athlete plan around real-world comp dates more than 12 weeks out, or shorten a cycle when an event came up sooner. We now expose **`settings.cycleWeeks`** (default 12, clamped to 8–40) and **derive the phase split from the chosen length** at plan-build time via `buildPhasePattern(weeks)`.

## What we picked

- **8 ≤ weeks ≤ 40** range. Below 8 weeks there is not enough Base to drive meaningful capacity adaptation; beyond 40 weeks the model becomes a year-plan and would need different governance (annual periodisation, off-season transitions) that the app does not handle.
- **Single block when weeks ≤ 20**, double block when weeks > 20. Threshold constant: `DOUBLE_BLOCK_THRESHOLD = 20`.
- **Phase split formula (single block):** `peak = 2`, `taper = 2 if weeks ≥ 14 else 1`, `build = max(2, round(remaining × 0.33))`, `base = remaining − build`. This preserves a ~2:1 Base:Build ratio across all lengths, matching Lattice's published guidance that endurance/capacity work dominates the year.
- **Phase split formula (double block):** split the non-peak/taper weeks into two equal halves, each running `base → build` (2:1 within each sub-block). Peak (2) + taper (2) close out the cycle.
- **Deload cadence:** every 3rd week within Base/Build (`weekIdx % 3 === 0`). The **last** week of each Base block is also a retest (replacing the wk-3 retest that the old 12-week pattern used).

## Why not always single-block, or always double-block?

- **Always single-block** for longer cycles risks Base-phase staleness. Mundry et al. 2021 (PMID 34188125) and Lattice's coaching content both report that block-periodised models with multiple base→build cycles outperform unbroken linear progression once the cycle exceeds roughly 16–20 weeks of in-phase training.
- **Always double-block** for short cycles wastes the limited stimulus on transition weeks. At ≤16 weeks a single block has enough runway for one strong taper into peak performance.
- The 20-week threshold is a heuristic — peer-reviewed evidence for the exact cutoff is thin (there is **no controlled trial of macrocycle length in climbers**). It matches Lattice's qualitative recommendation and is easy to reason about. Future work could expose the threshold as a setting if the athlete wants to experiment.

## Trade-offs

- **Pro:** athlete can plan around real comp dates (e.g. a 16-week build into a regional comp, or a 24-week annual peak).
- **Pro:** Peak length stays fixed at 2 weeks regardless of cycle length — peak adaptations are short-lived (≈14 days of supercompensation), so giving Peak more weeks would just dilute intensity.
- **Con:** retest cadence changes when the athlete picks a longer cycle (e.g. at 24 weeks they retest twice, at 12 weeks once). The Log tab's phase-range labels handle this by concatenating sub-block ranges (`Wk 1–6 · Wk 9–14`).
- **Con:** the phase-split formula is heuristic. An advanced athlete who knows they need more Build than 33% would have to override at the code level; not surfaced in the UI.

## Migration

- Existing plans get `cycleWeeks: 12` injected by the existing shallow-merge inside `migrate()` — no schema bump required, no data loss.
- Code that previously imported `PHASE_PATTERN` keeps working: it remains exported as `buildPhasePattern(DEFAULT_CYCLE_WEEKS)`.

## Sources

- Mundry S et al. *Front Sports Act Living.* 2021;3:651651. PMID 34188125. — Block periodisation review in strength sports; multi-block models for cycles > ~16 weeks.
- López-Rivera E, González-Badillo JJ. *J Hum Kinet.* 2019;66:183–195. PMID 30988852. — 8-week fingerboard intervention; supports short cycle viability.
- Lattice Training — "How long should a training cycle be?" coaching content; 12–24 week guidance with double-block recommendation for longer windows.
- Hörst E. *Training for Climbing* (3rd ed.) — 12 to 16 week peaking cycles for sport climbers; longer base periods for capacity development.
