# Power-endurance: two-band model, comp-date-anchored sharpening

**Status:** Accepted — implemented 2026-07-04 (Build sport Thu = 60/60 threshold, Peak sport Thu = 30/30 lactic, density rest cuts in the final 4 weeks, single-system Sat triples; closes KG-C5 + KG-A6).

## Context

The corpus appeared to contradict itself: Hörst says dedicate only the **last 2–4 weeks** before performance to anaerobic-lactic work (longer → overtraining risk); Lattice prescribes an **8-week PE block, 2×/week**, with a mid-block rest week and 5s/week rest cuts in the final 4 weeks (KG-C5). The app emits a single undifferentiated "4×4 @ RPE 8.5–9.5" roughly every other week across Build+Peak, with no band separation, no density progression, and no anchoring to the peak/comp date (KG-A6).

## Decision — taxonomy (KG-C5): the conflict is illusory

Hörst and Lattice describe **two different energy-system bands**, and both frameworks agree:

- **Band 1 — aerobic-power / anaerobic-capacity ("the engine").** 60/60 intervals at RPE 7–8.5 at threshold [verified :423/:427]; 4×4-style capacity at RPE 8.5–9.5, 2–4 grades below max [verified :439/:487]. Trainable for ~6–8 weeks, then plateaus [verified :236]. This is Lattice's "8-week PE block", predominantly.
- **Band 2 — anaerobic-lactic sharpening ("the peak").** 30/30 at RPE 9–10 [verified :451] and ≥1:10 work:rest bursts at RPE 9.5–10 [verified :479]. This is Hörst's last-2–4-week stimulus that overtrains if extended [verified :135/:542].
- **Reconciliation:** Lattice's final-4-week "cut rest 5s/week" density progression [verified :459] is the mechanism that *shifts band 1 toward band 2* as the goal nears. Hörst's caution applies **only to band 2**. Both are consistent; the app's single blended prescription straddles the boundary.

## Decision — app model (KG-A6): two-band model, phased

**Target (brief "Option B" + "Option C" flavor split):**

1. **Build phase = aerobic-power/capacity block** (~6–8 week-equivalent): 60/60 threshold intervals (RPE 7–8.5) and 4×4 capacity (RPE 8.5–9.5), near-failure [verified 237], little density change. Adds the threshold rung the app currently lacks between Base ARC and Build 4×4.
2. **Final 2–4 weeks / Peak = lactic sharpening micro-block**, anchored to `compDate`: 30/30 and short high-end PE (RPE 9.5–10), density-progressed via 5s/week rest cuts [verified :459], then taper.
3. **Flavor split:** boulder weeks bias anaerobic-capacity, sport weeks bias aerobic-power [new-verified 233]; each session trains a **single** system [new-verified 241] rather than the current mixed circuit+open-climb pairing.

**Guardrails (apply to whatever ships):** ≤1 dedicated lactic (band-2) session/week during the micro-block, with ≥72h between high-intensity power sessions, so the 3-slot athlete's aggregate stays inside injury caps; long-PE overtraining caution is explicit in the corpus [new-verified 239]; the micro-block/retest weeks stay exempt from the `applyDeloadVolume` cut.

**Phasing:** land the two low-risk guardrails first — a `compDate`-anchored density cut and a 2–4-week lactic cap (brief "Option A") — then layer the full band separation.

## Considered options

- **Option A alone** — rejected as the endpoint (kept as the first step): still conflates the two RPE bands in one prescription.
- **Option C alone** (flavor split only) — rejected as standalone: de-conflates sessions but provides no *dedicated* lactic window landing 2–4 weeks before the date, failing Hörst's core requirement. Folded into B.

## Consequences

- Confidence: **high** on the taxonomy and direction; **medium** on the short-cycle block-length mapping. `cycleWeeks` is 8–40; an 8-week cycle can't fit 6–8wk engine + 2–4wk lactic + taper, so `buildPhasePattern` must **derive** block lengths from available Build+Peak weeks defensively — do not hardcode 6–8/2–4.
- All PE bands are prescription-text-only kinds (`route`/`circuit`/`arc`/`open-climb`/`boulder`) — no new load math, no new `KG_KINDS`.

## Implementation checklist (deferred round)

- `js/program.js`: add a weeks-to-peak helper derivable from `weekIdx` + pattern length (compDate mode already lands the final taper day on `compDate`) — no schema change. Split `buildThuMain`/`buildSatMain` into band-1 (Build) vs band-2 (final 2–4 wks) with the flavor bias; make sessions single-system. `buildPhasePattern` derives block lengths per cycle length.
- Optional new `kind` (`threshold`/`interval`) only if distinct input UI is wanted (then register in `js/exercise-inputs.js` + `today.js`/`log.js`, mirroring `arc`); not required if reusing `route`/`circuit`.
- `tests/index.html`: compDate-anchored density progression + the 2–4-week lactic cap.
- `sw.js`: bump `CACHE`. **Effective-from:** next cycle.

## Addendum 2026-07-10 — 4×4 boulder-triples grade correction (wayfinder map #8 / ticket #11)

A climbing-kind prescription review ([wayfinder map #8](https://github.com/slm37102/simple-climbing-training-planner/issues/8)) found the shipped boulder-triples 4×4 (`js/program.js`, `buildSatMain` boulder base/build) prescribes **"1–2 grades below max"**, contradicting this ADR's own cited band-1 target of **"2–4 grades below max"** [verified :439/:487]. This is a KG-B1-style decision-vs-code drift, not a taxonomy problem — the two-band model stands.

**Clarification (the taxonomy was never self-contradictory):** "2–4 grades below max" is the *per-problem grade*; "near-failure" [verified 237] is the *cumulative effort* across all 16 climbs. A 4×4 works precisely because submaximal problems accumulate into near-failure — the two describe different axes, not a conflict. Running each problem at 1–2 below max instead makes the format overlap the athlete's dedicated Thursday limit bouldering (losing the distinct anaerobic-capacity/power-endurance adaptation) and adds injury exposure for no new stimulus.

**Decision:** the boulder-triples 4×4 per-problem grade target is **2–3 grades below max** — a one-notch-harder narrowing of the published 2–4 band, biased for this intermediate athlete who already gets limit work elsewhere, but kept clearly submaximal so the "engine" stays distinct from the limit stimulus. RPE 8.5–9.5 and the 3–4-set / back-to-back structure are unchanged. Tracked as [KG-B7](../knowledge-gaps.md#kg-b7--4×4-boulder-triples-grade-too-hard-p2-g1g3). **Implementation deferred** — this map produces the decision; the `js/program.js` edit is a separate hand-off.
