# Spec: total-load percentage bands (ADR-0013 implementation)

**Status:** Spec locked 2026-07-17 via wayfinder [map #22](https://github.com/slm37102/simple-climbing-training-planner/issues/22), ticket [#46](https://github.com/slm37102/simple-climbing-training-planner/issues/46). **Implemented 2026-07-17** via [issue #49](https://github.com/slm37102/simple-climbing-training-planner/issues/49).

> [ADR-0013](../adr/0013-total-load-intensity-convention.md) locked the convention (total-load math, evidence-anchored bands, immediate effect); this spec derives the actual digits with the KG-C6 unit-audit discipline: every published "% of max" below is classified **added vs total** before adoption, with its citation.

**Worked examples** use the docs' canonical athlete: bodyweight 70 kg, `maxHang20mm` +20 kg (10s-max total = 90 kg), `pullup1RM` +30 kg (1RM total = 100 kg). The new math everywhere: `added = pct × (bw + benchmark) − bw`.

## 1. The unit audit (what the evidence actually says, per protocol)

| Protocol | Published intensity | Unit classification | Source (corpus) |
|---|---|---|---|
| Max hangs (all phases) | **80–95% of maximum total load, lower end for climbers first trying max hangs** | **TOTAL — explicit in the quote** | Lattice, verified-findings ~L281 (3-0) |
| 7/3 repeaters | **60–80% MVC** intermediate/advanced (beginners 40–50%) | **TOTAL** (MVC = measured max force) | strengthclimbing, verified-findings ~L589 (3-0) |
| 7-53 protocol | Load "set so the climber could hang at-limit ~10 seconds — near-limit, not to failure" | **RIR-anchored ≈ 97–100% of the 10s-max total** (the app's benchmark *is* a 10s max) | Hörst via strengthclimbing, verified-findings ~L606 (3-0) |
| Weighted pull-ups | Corpus gives structure (Hörst 5×5, 3 min rest) but **no published %1RM** | — | verified-findings ~L269 |
| Pull-up rep-max mapping | 5-rep work ≈ 75–85% 1RM · 3-rep ≈ 84–89% · 2-rep ≈ 88–93% | **TOTAL** (in exercise science, a weighted pull-up "1RM" is the total system mass) | General strength-training rep-max relationships — **CONVENTION, not climbing-specific; label as such** |

## 2. The new bands

RPE ranges, set/rep schemes, and rest strings are all **unchanged** — only `loadPctRange`/`pctRange` values change, and their meaning becomes **% of total max** (benchmark total = bw + stored added benchmark).

### Hangboard (`loadPctRange`, applied to `bw + maxHang20mm`)

| Protocol | Today (added%) | Today's true intensity @70/+20 | **New (total%)** | New added @70/+20 | Anchor |
|---|---|---|---|---|---|
| Base intro max hangs | 0.55–0.70 | 90–93% total | **0.80–0.85** | **+2 … +6.5 kg** | Lattice band's lower end ("first trying max hangs") — a real intro at last |
| Build max-weight 10s | 0.80–0.90 | 96–98% total | **0.87–0.92** | **+8.5 … +13 kg** | Lattice band mid; consistent with the existing "RPE 8–9, 1–2 s in reserve" cue |
| Peak 7-53 | 0.85–0.95 | 97–99% total | **0.92–0.96** | **+13 … +16.5 kg** | Published is near-limit (~97–100% of 10s max); softened one notch per ADR-0001's standing Peak posture |
| Taper near-max touch | 0.80–0.85 | 96–97% total | **0.90–0.94** | **+11 … +14.5 kg** | "Near-peak intensity held" (ADR-0007), one notch under Peak |
| Base 7/3 repeaters | `null` (bodyweight) | 78% total @70/+20 | **unchanged (`null`)** | bodyweight | Sits naturally in the published 60–80% MVC band — document, don't change. If repeater RPE runs persistently high, *assisted* repeaters are now mathematically safe (total-load math + the KG-B11a clamp) |

The Base→Peak ramp in true intensity becomes **80–85 → 87–92 → 92–96** (taper 90–94): monotone and honest, versus today's ~90→99 compression.

### Pull-ups (`pctRange`, applied to `bw + pullup1RM`)

| Phase | Scheme (unchanged) | Today (added%) | Today's true intensity @70/+30 | **New (total%)** | New added @70/+30 |
|---|---|---|---|---|---|
| Base | 5×5, RPE 7–8.5 | 0.55–0.70 | 86–91% 1RM (5×5 there is implausible — the distortion made visible) | **0.75–0.82** | **+5 … +12 kg** |
| Build | 5×3, RPE 8.5–9.5 | 0.80–0.90 | 94–97% 1RM | **0.84–0.89** | **+14 … +19 kg** |
| Peak | 5×2, RPE 9–9.5 | 0.85–0.90 | 95.5–97% | **0.88–0.90** | **+18 … +20 kg** |
| Taper | 2×2 (full-volume authored 4×2), RPE 9–9.5 | 0.80–0.90 | 94–97% | **0.87–0.90** | **+17 … +20 kg** |

ADR-0001's "peak capped at 90% 1RM" language becomes **literally true** under the new convention (today it caps added-%, which is ~97% real). Restate the ADR-0001 cap comment accordingly.

## 3. Engine changes (`js/loads.js`)

- `prescribeLoadKg`: compute `lo/hi = pct × (bw + baseMax) − bw`. Requires `benchmarks.bodyweight`; **when bodyweight is unset, return no range** and let the views surface a "set bodyweight in Settings" hint — never fall back to the old added-math silently (a silently mixed convention is worse than no number).
- The KG-B11a negative-benchmark clamp **stays** (belt-and-braces): under total math an assisted athlete (bw 70, `maxHang20mm` −10 → total max 60) gets Base 0.80–0.85 → 48–51 kg total → **−22 … −19 kg added** — *more* assistance than the −10 benchmark, naturally safe; the clamp guards any future band above 1.0 or data edge.
- `reason[]` gains the convention statement ("range = 80–85% of total max (bw + benchmark)"); the first sessions after the switch append a migration line ("ranges re-based to total-load convention — ADR-0013").
- **Transition mechanics (why working loads don't crash):** suggestions seed from the previous actual and move under `autoAdjust`/targets-hit/readiness with the ADR-0009 caps — the *suggested kg* is not clamped to the displayed range, so an athlete whose logged Build hangs sit at +16 keeps getting ~+16 suggestions while the *range* re-bases. A persistent gap (in-range RPE at loads above the new range top) is evidence the stored benchmark is stale, and the ADR-0012 micro-retest (benchmark >4 wk old) is the built-in corrective. State this in the migration note.

## 4. Docs to update in the same pass

- `docs/training-philosophy.md` phase table — restate hangboard/pull-up intensities in total terms with the Lattice citation.
- `docs/training-plan.md` — regenerate (`tools/generate-schedule.mjs`).
- ADR-0001 addendum note — the 90%-cap rationale now reads in its intended unit.
- `CLAUDE.md` — load-math invariant: percentages are of **total system load**; `prescribeLoadKg` requires bodyweight.
- `CONTEXT.md` glossary — any %-of-max definition gains the total-load clarification.
- `docs/benchmark-norms.md` — already dual-unit; add a line that the app now computes on total (its conversion warning becomes historical context).

## 5. Tests (`tests/index.html`, `[ADR-0013]` block)

Canonical-athlete fixtures via `Loads.prescribeLoadKg`/`resolveEffective`:
- Exact added-kg ranges per phase for both kinds (the two tables above).
- Bodyweight unset → no range returned (and no throw).
- Assisted athlete (−10 benchmark): Base range lands at −22…−19 added (more assistance), and the B11a clamp still holds at the boundary.
- Previous-actual seeding: a prev-actual above the new range still seeds the suggestion (no range-clamp regression).
- Monotone ramp assertion: Base hi < Build lo is *not* required (bands may touch) but Base mid < Build mid < Peak mid in total terms.
- Conventions: `sw.js` CACHE bump; schedule regen; KG-B11 closure lines in `knowledge-gaps.md` (convention half — the clamp half is already shipped).

## Out of scope

- Changing RPE ranges, schemes, rest strings, or protocol selection (ADR-0005 owns those).
- Any UI redesign beyond the tooltip/hint copy.
- Re-deriving climbing-session (non-kg) prescriptions — no % math exists there.
