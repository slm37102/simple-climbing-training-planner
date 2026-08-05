# A vertical press in the Monday S&C block, framed as balanced development — not injury prevention

**Status:** Decided — 2026-08-05. Decision only; the build runs as its own `/to-spec → /to-tickets` pass. Graduated from **IB-024** (P1) via the grill queue ([#61](https://github.com/slm37102/simple-climbing-training-planner/issues/61)); source finding [`deep-audit.md` §26](../deep-audit.md) (recommendation #10). Tracked as **KG-B16**.

## Context

The deep audit's finding was framed as *"the antagonist block is pull-dominant — one pressing movement, no vertical/scapular press,"* and the backlog carried it as **P1 / G3**. The grill's first job was to test that framing against the code and the evidence, because the two disagree.

### What the app does today, verified against source

The Monday block `ANTAGONIST_BLOCK` (`js/program.js`) and the Tuesday subset `TUE_ANTAGONIST_BLOCK`:

| Slot | Items | Pattern |
|---|---|---|
| **Monday** (`ANTAGONIST_BLOCK`) | Push-ups · "Inverted rows / band cactus" · Wrist extensor curls · Farmer's carry | one horizontal press; one either/or that can be satisfied by *pulling*; forearm + carry |
| **Tuesday** (`TUE_ANTAGONIST_BLOCK`, ~10 min) | Wrist extensor curls · Band cactus (external rotation) | forearm + cuff prehab; **no press at all** |
| **Warm-up** (`js/warmup.js`) | external rotations + Y-T-W shoulder band routine | cuff prehab, every climbing day |

The weekly schedule is Mon / Thu / Sat climbing + a Tuesday light day. So across a week the athlete performs **one pressing exercise (push-ups, Monday) against three climbing days plus weighted pull-ups** — and *no vertical/overhead press exists anywhere*. The horizontal-pull gap the title implies is smaller than it reads: `"Inverted rows / band cactus"` is an **either/or**, and band cactus is external rotation (genuine prehab), so the item can be completed with zero pulling. It is an oddly-paired option, not forced pull volume.

### The evidence does not support the G3 tag

The finding's verifier was explicit, and it is the spine of this decision:

- **The injury-prevention premise is weak.** Antagonist strengthening alone is not shown to prevent injury; there is no climber RCT; "imbalance causes injury" is sparsely supported. Cuff-external-rotation prevention RCTs exist only in adjacent overhead sports (swimming).
- **The highest-evidence prehab is already present.** Rotator-cuff external rotation is covered twice over — band cactus (both blocks) and the Y-T-W warm-up on every climbing day. So the gap is specifically *pressing/scapular strength*, not the cuff.
- Therefore adding a vertical press "forgoes a modestly-and-weakly-evidenced addition rather than creating a hazard." This is **program completeness and balance, not a safety fix.**

The block is also labelled honestly already: `training-philosophy.md:57` calls antagonist work *"coaching consensus; no controlled trial in climbers."*

So the decision is taken on the **`project-goals.md` "does it improve outcomes for this one athlete" axis, not the G3 durability axis** — and it is taken narrowly, because every item added is permanent surface area (the "simple over clever" ongoing-complexity cost) and the evidence is consensus-only.

## Decision

**Add one vertical press (pike push-ups) to the Monday block, fold serratus work into it as a cue, drop the redundant pull, and lightly rename the block. Framed as balanced movement development at coaching-consensus strength — not as injury prevention.**

### 1. Add a vertical press — pike push-ups, Monday

The genuine gap is a **vertical/overhead pressing pattern**, absent everywhere. Push-ups already cover horizontal. Pike push-ups are adopted over the alternatives (overhead DB/KB press, dips) because they:

- match the block's **bodyweight, self-scaling idiom** (push-ups, inverted rows, band cactus, farmer's carry) and assume **no equipment** the block doesn't already use;
- are shoulder-friendlier than dips (which load the anterior shoulder heavily — cutting against the very prehab rationale) and than novel overhead loading on a shoulder the plan otherwise treats conservatively (ADR-0001);
- carry a built-in progression path (elevate the feet toward a wall handstand push-up), mirroring how `CORE_TENSION` already carries a week-to-week progression cue.

**Prescription:**

> **Pike push-ups** — `3 × 8–12 · 60–90s rest between sets · 1–2 reps in reserve · full lockout, reach/shrug tall at the top (serratus) · progress by elevating the feet toward a wall handstand push-up as these become controlled`

Three sets matches the block; 8–12 reps is an accessory strength/hypertrophy range for a harder bodyweight press; 1–2 reps in reserve keeps it submaximal on the heaviest S&C day (next to weighted pull-ups + hangboard — ADR-0001 connective-tissue conservatism). No RPE field, matching every other block item (they are plain `prescribed` strings).

### 2. Serratus folded into the press, not a separate card

The finding named two gaps — vertical press *and* scapular/serratus push. They overlap: a full-range pike press with scapular upward-rotation at the top **is** serratus work in the functionally relevant range (the pattern overhead pressing actually needs). Rather than a separate serratus card — the smallest, weakest-evidenced piece, and one more item sharing the block's single collapsed notes field — the serratus work is the **top-of-rep "reach/shrug tall" cue inside the pike push-up prescription** above. The "no scapular push" gap is closed by the movement itself.

### 3. Frequency — Monday only, a deliberate narrowing of the finding

The finding recommended pressing **2×/week** (Monday full item + a Tuesday item). This decision adopts **1×/week (Monday only)**, on purpose:

- The 2×/week case rests on *"the week is 1 press vs 3–4 pulls, spread the press out"* — which is the **volume-distribution / injury-balance premise this decision explicitly declines to lean on.** For a *development* goal (getting stronger at a pressing pattern), one quality session per week is an adequate stimulus.
- `TUE_ANTAGONIST_BLOCK` is deliberately a **focused prehab subset** (wrist extensors + cuff external rotation — the elbow/shoulder that *are* the RCT-adjacent residual risk per `coach-review.md`). Loading pressing onto it changes its character from "10-min prehab touch-up" to "second S&C session" and bloats the light day for the weakest-evidenced element.

So Tuesday is left untouched. The gap — *no vertical press anywhere* — is closed by its existence on Monday; frequency-for-balance is not bought.

### 4. Drop the redundant pull, keep the prehab

`"Inverted rows / band cactus"` is split: **"Inverted rows" is dropped; "Band cactus (external rotation)" stays** as a standalone item (`3 × 10–15`, Monday's full-block dose). This directly enacts the finding's "reclassify inverted rows out of the 'antagonist' block" — inverted rows are *pulling*, redundant against 3 climbing days + weighted pull-ups, and their either/or with a prehab movement was confusing. Removing the pull and adding a press moves the pull:push ratio the right way at both ends, and the surviving item now reads identically to the Tuesday block's "Band cactus (external rotation)".

### 5. Rename the label, keep the structural kind

The display label `"S&C antagonist block"` → **`"S&C / press & shoulder block"`**: with a pull removed and a real press in, "antagonist" is even less accurate, and `training-philosophy.md` already concedes the framing is loose. The structural `kind: 'antagonist-block'` is **unchanged** — it is a schema key wired into the deload branch (`js/program.js:805`), `js/exercise-inputs.js`, and the test suite; churning it is real blast radius (it would touch the `domain-invariants` schema surface) for zero athlete benefit.

### 6. Blast radius

- **Deload** — pike push-ups is a block item, so it is volume-cut per-item automatically by the existing `antagonist-block` branch (`applyDeloadToExercise`, `js/program.js:805`). No new deload logic; the "exactly one volume-cut pass per session" contract is untouched.
- **Phases** — the press is a plain accessory, constant across phases like push-ups and farmer's carry. It is **not** phase-shaped (unlike hangboard/core); no per-phase variants.
- **Tuesday, warm-up, load chain, storage schema** — untouched. No migration, no `js/loads.js` change, no new prescription pass.
- `sw.js` will need the routine `node tools/generate-sw.mjs --bump` after the `js/program.js` edit lands (build-time concern, noted for the build pass).

### 7. Evidence posture

The *direction* (train a pressing pattern this pull-heavy plan omits) is coaching-consensus, and this must be labelled so — in the same honest register as `training-philosophy.md:57`. There is **no G3 claim**: the code comment and the KG row state plainly that this is balanced-development completeness, not injury prevention, and that the RCT-adjacent prehab (cuff ER) was already covered and is what carries the durability weight. No new numeric constants enter the load chain (the reps/RIR live in a prose `prescribed` string, like every block item).

## Alternatives considered

- **Close IB-024 as no-change.** Rejected, but it was a live option: the evidence is consensus-only and the one RCT-adjacent prehab is already shipped. Adopted the addition anyway because a plan that trains a pressing pattern essentially zero times against its pulling load has a real movement-completeness hole for *this* athlete, and this repo judges build/don't-build on outcomes, not effort. The honesty tax is admitting the justification is consensus, not evidence — which the ADR and KG row pay explicitly.
- **Overhead DB/KB press** as the vertical press. Rejected: cleaner progressive overload, but assumes dumbbells the block doesn't use and puts novel overhead loading on a shoulder the plan otherwise treats conservatively.
- **Dips.** Rejected: heavy anterior-shoulder/chest load raises impingement exposure — against the prehab rationale.
- **A separate serratus/scapular card** (scapular push-ups, wall slides). Rejected: the weakest-evidenced piece; folding the scap cue into the pike press closes the gap without a fourth pressing-adjacent card in a block that shares one notes field.
- **The finding's 2×/week dosing** (add a Tuesday press). Rejected as argued in §3 — it buys frequency on the injury-balance premise this decision declines, and degrades the Tuesday prehab subset.
- **Keeping inverted rows.** Rejected: it is pull volume inside an "antagonist" block against an already pull-heavy week, and its either/or with a prehab movement was the confusing framing the finding flagged.
- **Renaming the `kind`** to match the new content. Rejected: schema blast radius (deload branch, exercise-inputs, tests) for a cosmetic gain the display-label rename already delivers.

## Consequences

- **A vertical pressing pattern exists in the plan for the first time**, at consensus-level dose, honestly framed.
- **The pull:push ratio improves at both ends** — one pull removed, one press added — without spending a second S&C slot.
- **The "no scapular push" gap closes** via the folded serratus cue, with no new card.
- **The G3 tag on IB-024 is retired.** The finding was verified down to consensus-level completeness; the KG-B16 row and the code comment must both say so, so the tag does not drift back.
- **`TUE_ANTAGONIST_BLOCK` stays a clean prehab subset** — the design intent behind the Monday-full / Tuesday-subset split (KG-A7) is preserved.
- **Build touch-points:** `ANTAGONIST_BLOCK` array + its display label in `js/program.js`, then `node tools/generate-sw.mjs --bump`, then a smoke-test pass. No schema/migration, no load-chain change.
- **`training-philosophy.md:57`** stays accurate — it already frames antagonist work as consensus; this decision does not over-claim past it.

## Sources

- [`deep-audit.md` §26 / recommendation #10](../deep-audit.md) — the finding and its verifier's evidence calibration (weak injury-prevention premise; cuff ER already covered; Medium priority, coaching-consensus basis).
- [`coach-review.md`](../coach-review.md) — the S&C footprint review; elbow-tendinopathy as top residual risk addressed by the *forearm/cuff* prehab (KG-A7), distinct from the pressing gap.
- `training-philosophy.md:57` — antagonist work labelled "coaching consensus; no controlled trial in climbers."
- [ADR-0001](0001-soften-peak-phase-for-intermediate-athlete.md) (connective-tissue conservatism for this cohort), [ADR-0005](0005-base-build-hangboard-protocols.md) (phase-shaping precedent, deliberately *not* applied here).
- KG-A7 ([#40](https://github.com/slm37102/simple-climbing-training-planner/issues/40)) — the 2×/week antagonist dosing decision and the Monday-full / Tuesday-subset design this decision preserves.
- Grill record: [#61](https://github.com/slm37102/simple-climbing-training-planner/issues/61).
