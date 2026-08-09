# The autoregulation magnitudes are permanent, honestly-labeled conventions — not a calibration backlog

**Status:** Accepted — decided 2026-08-09 via `/grill-queue` ([issue #75](https://github.com/slm37102/simple-climbing-training-planner/issues/75)). Graduated from IB-029; adjudicates KG-B21. Documents-only — **no behaviour change**.

## Context

Every autoregulation *magnitude* in the load chain is an app-invented constant:

| Constant | Value | Site |
|---|---|---|
| readiness multipliers | ×1.05 / ×1.00 / ×0.85 / rest, at avg cutoffs 4.5 / 3.5 / 2.5 | `js/loads.js:24-31` |
| RPE thermostat (`autoAdjust`) | flat ±5% | `js/loads.js:47-52` |
| layoff decay | grace 10 d, −3%/wk, floor ×0.85 | `js/loads.js:296-298` |
| targets-hit progression | `TARGETS_HIT_PROGRESS = 1.025` | `js/loads.js:303` |
| per-session cap | `MAX_SESSION_PROGRESS = 1.05` | `js/loads.js:304` |

The *direction* of each rule is defensible consensus — RPE autoregulation (r = 0.88 convergent validity), down-regulating on poor readiness (Saw 2016), "+2.5–10% once targets are hit" (NSCA 2-for-2), layoff decay guarding the recognized pulley re-load trigger. The *numbers* are uncited guesses presented at 0.5 kg precision.

The **honest-labeling half of this finding is already closed** (KG-C7, 2026-07-23): all three sites carry "APP CONVENTION, UNVALIDATED" comments. What remained open was the loop those very comments *promise*: `js/loads.js:21-22` says *"Tune them from the athlete's own logs via the KG-A4 monitoring signals, not from literature"* and `:46` repeats *"Tune via KG-A4"* — but nothing ever calibrates anything. The constants sit at invented defaults forever while the code reads as though a calibration feature is merely pending.

**Two facts established during the grill, before deciding on the audit's framing:**

1. **The chain is tiny.** `prescribeLoadKg` returns `null` for every `kind` except `hangboard` and `pullup` (`js/loads.js:76-85`), and both live only on `buildMonHangboard` (`js/program.js:337`). The entire autoregulation chain governs roughly **two logged data points per week**, on one session.
2. **The RPE dead-band already widens as RPE gets noisier** — the exact remedy the audit asks for, implemented as band width: Base pull-ups `[7, 8.5]` (1.5 wide) → Build/Base hangs `[8, 9]` (1.0) → Peak `[9, 9.5]` / taper `[8.5, 9]` (0.5). Monotonic. `autoAdjust` fires only *outside* the band, so the noisiest input already receives 3× the tolerance of the most reliable one.

## Decision

**The invented-but-labeled defaults are the permanent posture. The app will not self-tune them.** Cancel the promise the comments make, rather than leaving a calibration loop perpetually "pending."

### 1. No self-calibration (Q1 → b)

Rejected **(a) build self-calibration** and **(c) "surface, don't fit"**, for four reasons in descending strength:

1. **There is no ground truth to fit against.** Self-tuning fits a parameter to an outcome; the outcome here ("the right load") is never observed. The only observable is next-session RPE — and `autoAdjust` *already* closes that loop every session. Fitting the gain of a controller whose setpoint that same controller already meets is circular.
2. **The data rate is disqualifying.** ~2 kg-bearing points/week on one session; every 4th week is a deload that now holds progression (ADR-0009 addendum), plus taper and retest weeks. A 16-week cycle yields **~20 usable hangboard points** — fitting a 4-bucket readiness→multiplier map from that is noise-fitting. *(Confirmed against reality, Q2: the athlete's actual logged history is thin — well under one full macrocycle of complete kg+RPE logging.)*
3. **It would make the audit's actual complaint worse.** The stated harm is **over-trust**, not injury. A constant fitted from 20 points *reads* as earned while being **less** inspectable than a comment saying "we made this up." That is a downgrade in honesty, not an upgrade.
4. **Ongoing complexity.** Per `CLAUDE.md` build hours are not a cost — but a calibration model is a permanent second source of truth behind every suggested kg, with its own audit trail and failure modes. That is the "simple over clever" maintenance cost the project goals *do* count.

On **(c)**, the strongest challenger: the escalation path it would build **largely already exists** — `rpeDriftSignal` fires on two consecutive above-range sessions and routes to an ADR-0012 micro-retest (`js/monitoring.js:82-89`). The residual gap is narrow, and narrower than the complexity it would add.

### 2. One posture for all six constants, with the asymmetry recorded as rationale (Q4)

The finding lumps together things the repo has spent three decisions (IB-028 / IB-056 / IB-064) learning to distinguish. The split is real and worth writing down — but as **rationale, not new mechanism**:

- **Protective / downward** — layoff decay, readiness ×0.85, the `MAX_SESSION_PROGRESS` cap. Being wrong costs a slightly-too-easy session. Unbounded, but **fails safe**.
- **Reward / upward** — readiness ×1.05, `TARGETS_HIT_PROGRESS` +2.5%, `autoAdjust` ×1.05. Being wrong costs over-load on tendon-limited lifts.

The upward three are already **bounded** by `MAX_SESSION_PROGRESS` (+5%/session) and **suppressed on every hold week** — the doctrine [ADR-0019](0019-hold-weeks-clamp-readiness-push.md) completed (holds suppress the reward-upward levers, keep the corrective thermostat). So the honest characterization is not "the numbers are guesses" but **"the numbers are guesses whose error is asymmetrically contained in the direction that matters."** That is the actual answer to the G1 over-trust concern, and it is a documentation change, not code.

### 3. The sub-maximal sub-question is dissolved, not deferred (Q3)

IB-029's second half asked whether to suppress or widen the thermostat "in the sub-maximal regime (ARC / 60-60), where RPE reliability degrades (RIR error ~2 reps at RPE 9 vs ~5 at RPE 5)." Against the code this is a **false premise**:

- ARC is `kind: 'arc'` (`js/program.js:642`) and 60/60 is `kind: 'circuit'` (`:390`); **both fall through `prescribeLoadKg`'s `else return null`**, so the thermostat has never touched them and cannot.
- Every exercise the thermostat *does* govern sits at **RPE ≥ 7** — the reliable near-failure zone the audit itself cites.
- The tolerance-widening the audit recommends is **already implemented as band width** (the monotonic 1.5 → 1.0 → 0.5 progression above).

Recorded here as a **dissolved premise** — the same shape as the IB-028 "retest branch is unreachable" finding — with the band-width monotonicity written down so a future audit does not re-file it. One sliver worth naming but **not** acting on: Base pull-ups `[7, 8.5]` is the noisiest input the chain consumes, and it already carries the widest band.

### 4. Permanent, not "until we have data" (Q5)

This decision does **not** expire when more logs accumulate. Two reasons carried the Q1 call with different lifetimes — "no ground truth to fit against" (permanent) and "barely any history" (temporary). The **load-bearing one is the first**: more data cannot fix a missing outcome measure. Reopen this ADR only for **new published research** giving these constants an evidence-based value — not for a fuller log.

### 5. Documents only (Q6) — and the G3 tag is retired (Q7)

**No app change.** No constant moves, and the 0.5 kg display step stays — it is the smallest plate the athlete can actually add, so it is a real-world quantum, not false precision. Rejected: adding a provenance/"how confident is this number" surface to the UI. There is one athlete, that athlete reads the ADRs, and showing the working would make an invented number look *more* rigorous, aggravating the exact over-trust the finding is about.

The IB-029 row was tagged `P2 | G1, G3`. **The G3 tag is retired** — the audit's own impact line says *"The residual concern is coaching effectiveness (G1) and over-trust, not injury (G3)"*, and §2 above says why that is structurally true: the error is contained in the dangerous direction by the +5% cap and the hold-week suppressions, while the downward levers fail safe. Stays **P2 | G1**.

## Consequences

- The two "Tune via KG-A4" promises (`js/loads.js:21-22`, `:46`) and the layoff note (`:255-256`) are **reworded to state the permanent posture** and cite this ADR, so the code stops advertising a loop the project has deliberately chosen not to close. Comment-only edits — no behaviour, no schema, no test change.
- KG-C7 (honest labeling) remains closed and is now *completed* by this ADR: labeled **and** adjudicated as permanent.
- A future audit re-finding "the magnitudes are invented" should be closed by pointing at this ADR, not re-filed — the labeling is deliberate and the calibration is refused on the record.
- `docs/knowledge-gaps.md` gains **KG-B21** carrying this verdict; the IB-029 backlog row goes `P2 | G1` and Decided.

## Build

**None.** This is the rare grill-queue item that ships as documentation: the decision *is* the deliverable. The only repo edits are the ADR, the KG row, the ledger rows, and the three comment rewordings in `js/loads.js`. Since no prescribed value changes, the load-chain trip-wire is satisfied by inspection — but the comment edits still touch `js/loads.js`, so they ride a normal PR with `sw.js` regenerated (`node tools/generate-sw.mjs`).
