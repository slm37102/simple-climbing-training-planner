# Base/Build hangboard: capacity→strength path, delete min-edge

**Status:** Accepted — implemented 2026-07-04 (Base = repeaters + intro max-hangs, Build dose 2×4 @ RPE 8–9, min-edge and bonus repeaters deleted; closes KG-B2).

## Context

The Monday hangboard prescription disagreed three ways:

| Source | Base | Build |
|--------|------|-------|
| `training-philosophy.md` table | Weighted max hangs ≤90% | Hörst 7-3 repeaters |
| `js/program.js` `HANGBOARD` (actual) | Min-edge **bodyweight** hangs, 12s, 2×5, RPE 9–10 | Max-weight 10s, 2×5, @80–90% |
| Eva López verified research | MAW (weighted, larger edge) **first** | MED (min-edge) **second** |

The code's Base protocol matches nothing in the corpus: MED is ~10s hangs with a deliberate 1–5s margin, 2–5 *total* hangs, whereas the code does 12s × **10** hangs at **RPE 9–10** (no margin) — training to failure on the smallest holdable edge. No provenance was found for it; it reads as a corruption of MED and is the largest un-vetted G3 (injury) exposure left in the plan.

## Decision

**Adopt the corrected capacity→strength path (brief "Option C"):**

- **Base (Monday):** 7/3 repeaters — 6 reps/set, ~2 sets per grip (half-crimp + open), bodyweight on 20mm, RPE 7.5–8.5 [new-verified 284] — **plus** an introductory low-end weighted max-hang block: 10s on 20mm, ~4–6 total hangs, RPE 8–9, low load.
- **Build (Monday):** weighted max hangs on 20mm, corrected dose — **6–8 total hangs** [new-verified 211], **RPE 8–9** with 1–2s in reserve [new-verified 214] and ±2–5 kg margin autoregulation [new-verified 218] (the existing ±5% `autoAdjust` already approximates this).
- **Delete min-edge entirely.** Moderate 14–20mm weighted hangs build max strength that carries across edge sizes at lower skin/joint cost [new-verified 173]; the pro-min-edge rationale was **refuted** (claim 291, 0-3), and min-edge's edge-depth progression cannot be expressed in the app's added-kg benchmark model anyway.

This un-swaps the philosophy table's Base/Build rows (its own "Base = Capacity block" framing was correct; the protocols were assigned backwards) and matches the verified adaptation profiles: repeaters → capacity/hypertrophy, max hangs → neural recruitment. It respects López's priming logic (heavier loading precedes any harder-edge work — which is simply never introduced) rather than inverting it as the code does.

## Considered options

- **Keep the code as-is** — rejected: unprovenanced Base protocol, trains to failure (violates the verified margin principle and 6–8-hang / RPE 8–9 doses), off-spec Build volume.
- **Strict López MAW→MED** (weighted Base → min-edge Build) — rejected: MAW→MED is a sequence *inside a dedicated 2×/week 8-week fingerboard cycle*, not a Base→Build phase mapping; MED needs an edge-depth (mm) benchmark, retest, and progression rule the app doesn't have; its only claimed grade-specific benefit rests on the refuted claim 291; and it leaves the cycle with no capacity stimulus anywhere (three consecutive max-intensity finger blocks into Peak 7-53).

## Consequences

- This is a synthesis — no single source states "repeaters in Base, max hangs in Build" for this athlete — so confidence is medium-high, not high. The strongest counter-reading is strict López (rejected above).
- Not a conservatism-stacking softening: Build load stays heavy (weighted max hangs); what's cut is unprovenanced junk volume, replaced by verified doses.
- **Load-convention caveat (flag, don't fix here):** `loadPctRange` multiplies *added* kg (`maxHang20mm`), while Lattice's 80–95% is of *total* load; for a ~70+20 kg athlete the code's 0.80–0.90 of added kg ≈ 96–98% of total. Keep the app-wide added-kg convention (Peak's KG-B1 numbers were adjudicated under it); converting `prescribeLoadKg` to total-load math is a separate candidate gap, not part of this decision.

## Implementation checklist (deferred round)

- `js/program.js`: replace `HANGBOARD.base` with two entries (repeaters + intro max-hangs) and have `buildMonHangboard('base', …)` emit both; keep `HANGBOARD.build` identity but fix dose (`prescribedSets: 2, prescribedReps: 4`, `rpeRange: [8, 9]`, append a margin cue). **Delete the sport-flavor bonus repeater push** so Base repeater volume isn't doubled. `applyDeloadVolume`'s floor-at-1 already gives correct deload behaviour.
- `js/exercise-inputs.js`: no change (both are `kind: 'hangboard'`; bodyweight repeaters with `loadPctRange: null` already render, as the taper proves). No schema change.
- `docs/training-philosophy.md`: rewrite the Base/Build table rows (they end up matching the doc's own Lattice column), remove the KG-B2 divergence marker; note MED as a rejected-for-now variant with re-entry condition (crimpy V8+ goals).
- `tests/index.html`: Base Mon session contains repeaters + intro max-hangs and no min-edge; Build total hangs ≤8 and RPE [8,9]; sport-flavor Base no longer appends a second repeater block.
- `sw.js`: bump `CACHE`. **Effective-from:** next cycle.
- If retests stagnate across a full cycle, the first lever is a *second* weekly finger stimulus (within ≤2 intense fingerboard days and ≤4 total days [new-verified 283]), not a protocol change.
