# Readiness gating for climbing sessions: downward-only, auto-applied scaling + one-tap rest swap

**Status:** Implemented — decided 2026-07-16 ([wayfinder ticket #30](https://github.com/slm37102/simple-climbing-training-planner/issues/30)); shipped 2026-07-17 via [issue #53](https://github.com/slm37102/simple-climbing-training-planner/issues/53). Adjudicates KG-A14 (coach-review W5).

## Context

The daily readiness check-in modulates only hangboard/pull-up kg (`Loads.resolveEffective`); the sessions with the highest injury and overreach exposure — 30/30 lactic at RPE 9.5–10, limit bouldering, 4×4s — receive zero readiness modulation. A "Lighter" day trims the hangboard by 15% and then sends the athlete into an unmodified all-out session (KG-A14, opened from coach-review W5). Autoregulation matters most exactly where intensity is maximal and load is unquantified. Backdrop: ADR-0014's monitoring model handles *multi-day trends* with advisory flags; this ADR extends the *same-day* readiness signal that already exists.

## Decision

Downward-only gating, three levers on a **"Lighter" day** (readiness multiplier ×0.85), **auto-applied to the displayed prescription with a visible "readiness: lighter" note** — the same posture as the kg modulation and deload cut, which also auto-apply (same-day continuous modulation auto-applies; discrete substitutions take a tap):

1. **Scale climbing `prescribedTarget` ×0.85** — counts floor (min 1), durations round-to-5, reusing the deload-cut rounding conventions.
2. **Cap session RPE:** climbing prescriptions whose RPE range tops out above 8.5 carry a "today: stay ≤ 8.5, stop at first quality drop" note. Campus and limit-boulder take this cap (read as: submax, fewer attempts) rather than a substitution.
3. **One substitution: Peak-Thursday 30/30 lactic → 60/60 threshold.** Phase-clean by ADR-0006's own taxonomy (band-1 is legal wherever band-2 is), and it swaps between two already-designed sessions rather than inventing content. The only substitution adopted.

On a **suggest-rest day** (readiness < 2.5, multiplier 0): a Today-tab banner offers a **one-tap swap** of the whole session for the light template (mobility + skill drills + the Tuesday antagonist mini-block), logged as such. Declining keeps the planned session with the Lighter levers applied. Swap-by-consent — replacing a session is a discrete decision (ADR-0008/0014 idiom).

On a **"Push" day** (×1.05): **climbing sessions unchanged.** Downward-only asymmetry, matching ADR-0009's philosophy (downward uncapped, upward tightly capped): upward volume at maximal intensity is the highest-cost place to add stimulus, "Push onto deep fatigue" is the KG-A12 residual risk, and controlled upward progression already belongs to the ADR-0009 engine. Push keeps its existing meaning: +5% on the kg suggestion only.

The ×0.85 scaling factor and the 8.5 RPE cap are **app conventions, unvalidated** (KG-C7 posture) — they inherit the readiness multiplier's existing convention status rather than adding new constants.

## Considered and rejected

- **Advisory-only application of the Lighter levers** — inconsistent with the kg modulation that already auto-applies from the same signal on the same day; an extra tap on every below-par day adds friction exactly where compliance matters.
- **Auto-swap on suggest-rest** — overrides the athlete without consent; the plan adapts *with* consent (ADR-0007/0008 precedent).
- **Symmetric Push-day scaling** — volume inflation at max intensity on subjective good days duplicates, uncontrolled, what the progression engine does with guardrails.
- **A broader substitution table** (e.g. limit-boulder → volume session) — invents session content the program doesn't have; the RPE cap achieves the protection at zero design cost.

## Consequences

- KG-A14 closes when this ships. Implementation seam: the same `prescribeForContext`/readiness path, extended to climbing kinds — readiness (already captured in the day log) reaches the session-shaping layer; no new inputs, no schema change.
- The Lighter note joins the existing header-note slot (`deloadNote`/`taperNote`/`rampNote`/`sunHint` precedent); the 30/30→60/60 swap must respect `densityRest` (the 60/60 rendered is the same one Build would prescribe for that week).
- Interaction rule: readiness scaling composes with deload/taper cuts and the Base ramp the same way the kg chain composes multipliers — apply to the final displayed target, note appended to the trail. **(Amended 2026-08-05 — see addendum below: the volume-scaling lever no longer composes with an already-fired volume cut. The RPE cap and swap levers still compose, and the Base ramp is unchanged.)**

---

## Addendum (2026-08-05): volume is cut once — the readiness gate does not re-cut an already-cut target

Adjudicates **IB-030 / KG-B18** ([grill-queue #69](https://github.com/slm37102/simple-climbing-training-planner/issues/69)). Amends the "Interaction rule" consequence above.

### What was wrong

The original interaction rule ("readiness scaling composes with deload/taper cuts … the same way the kg chain composes multipliers") had two flaws, both surfaced in the grill:

1. **The kg-chain analogy it rests on does not hold.** Deload/taper are *volume-only* on the kg side (ADR-0003) — `Loads.resolveEffective` has no deload parameter, so kg is never deload-scaled. On a deload+Lighter day the kg chain therefore applies **exactly one** downward cut (readiness ×0.85). Climbing `prescribedTarget`, by contrast, was cut **twice** — deload ×0.6 *then* readiness ×0.85. The composition was *more* aggressive than the chain it cited as its justification, not "the same way."

2. **Double-flooring made the real cut deeper than the nominal ×0.51, hardest on the highest-intensity sessions.** `scaleTarget` floors count-unit targets (`Math.max(1, Math.floor(value × mult))`) and ran once per pass, so small integer targets floored twice. Worst cases on real prescriptions: **limit boulders 4 → 2 → 1 (×0.25)**, comp-touch boulders 6 → 3 → 2 (×0.33), campus ladders 3 → 1 → 1 (×0.33). The RPE 9–9.5 limit/campus sessions — the ones where getting the dose right matters most — took the deepest cut, collapsing to a token single attempt on a day whose deload volume was *already* the evidence-endorsed 40–60 % recovery reduction.

Direction was never the problem — both cuts are downward, and the overlap day (a scheduled recovery week that is *also* a poor-readiness morning) is exactly where maximal conservatism is right, so there was **no G3 exposure** (audit rated it Low / software-only). The problem was a G1/clarity one: the second cut pushed *below* purpose-designed recovery volume for no stated reason, and two prose notes both claimed a volume reduction, double-counting it in the trail.

### Decision

**Volume is cut once per session.** When any volume-cut pass has already fired on a climbing exercise — deload, taper, forced-cut (ADR-0014), or finger-density-guard (ADR-0016) — the readiness gate **does not apply its ×0.85 volume scaling** to that exercise. Detection is pass-order-independent: a cut stamps `originalTarget` on the exercise, so the readiness gate skips volume-scaling any exercise that already carries one. This correctly ignores the *upward* Base ramp, which stamps `rampedFrom` (not `originalTarget`) — a ramped-then-Lighter Base day still down-scales as designed.

The readiness gate's **other levers are unchanged and still compose** on an already-cut day:

- the **≤8.5 RPE cap** (`readinessCapNote`) — the intensity-axis protection, orthogonal to volume, and the whole reason a Lighter morning matters on a limit/campus day;
- the **suggest-rest full swap** (readiness < 2.5 → one-tap swap to the light template);
- the **Peak 30/30 → 60/60 swap** (moot in practice — 30/30 is Peak-Thursday-only and Peak carries no deload/density week — but a substitution, not a scale, so unaffected regardless).

When a cut already fired, the readiness note is reworded to **intensity-only** (drops the "targets scaled ×0.85" clause) so the deload/taper note and the readiness note no longer double-count the same reduction in prose — resolving the audit's separate "reasoning split across two notes" clarity nit for free.

On a Lighter morning with **no** prior cut, volume scaling behaves exactly as before this addendum.

### Why (and why not a floor)

Readiness still fully governs the two axes it should: **intensity** (the cap) and **consent** (the rest swap). Volume on the overlap day is left at the recovery/taper level that was *designed* for recovery — which is already low — rather than pushed arbitrarily below it. No G3 downside: deload volume stays low, intensity is now capped ≤8.5, and a genuinely awful morning (<2.5) still routes to the rest swap.

A **combined floor** (the audit's alternative — "never below ~0.5 of the authored target") was rejected: it requires a pass to reconcile against the authored original across passes (cross-pass magnitude state the pipeline deliberately doesn't carry), it's *more* complex than a boolean "did a cut already fire?" guard, and it still leaves the conceptual double-count in place (two reasons cutting the same axis, just bounded). "Cut once" is simpler and restores true parity with the kg chain. **Accept-as-is** (document the double-cut, change nothing) was rejected because the ×0.25 double-floor on limit/campus is a real, if bounded, G1 under-stimulus with no stated rationale.

### Build scope (for the later `/to-spec` pass)

- A guard inside `applyReadinessLighter` (`js/program.js`) keyed on `ex.originalTarget`: skip volume-scaling, keep the RPE cap.
- Reword the already-cut readiness note to intensity-only.
- Update `tests/cases/16-readiness-gating.js:128` — it currently asserts the double-cut (flash pyramid 18 → 10 → 8 with `readinessScaledFrom = 10`); under this addendum it is 18 → 10 (deload only), no `readinessScaledFrom` set, both notes still present.
- **No schema bump, no load-chain (`js/loads.js`) change** — this is a single prescription-pass edit.

Considered-and-rejected, and the composition rule this narrows, are recorded here rather than reopening the body.

---

## Addendum (2026-08-06): a day with no readiness check-in is Normal, not Lighter

Adjudicates **IB-058 / KG-B19** ([grill-queue #70](https://github.com/slm37102/simple-climbing-training-planner/issues/70)). Governs the *input* side of this ADR: what readiness value the readiness-gate pass runs on when the athlete hasn't checked in.

### What was wrong

`js/views/today.js` substituted a fabricated `{ sleep:3, soreness:3, fatigue:3 }` whenever a day carried no readiness check-in — in **two** places:

1. **Render** (`today.js:494`) — `const readiness = dayLog.readiness || { sleep:3, soreness:3, fatigue:3 };`, then `Loads.computeReadinessMultiplier(readiness)`.
2. **Persist** (`today.js:1078`) — `getOrInitDay()` wrote `readiness: cur.readiness || { sleep:3, soreness:3, fatigue:3 }`, so saving *anything* on a day (a set, a note, a session-feel tap) without touching the readiness pills **froze** `{3,3,3}` into the day record.

`{3,3,3}` averages **3.0**, and `computeReadinessMultiplier` returns **Lighter (×0.85)** for `avg ≥ 2.5 && < 3.5` — Normal requires `≥ 3.5`. So merely *viewing or logging* a session without a check-in silently down-regulated **every** climbing session (target ×0.85 via the readiness-gate pass + the ≤8.5 RPE cap) and the hangboard/pull-up kg suggestion (×0.85).

Three facts, all verified against current source, showed this was a defect and not a designed default:

- **It defeats the function's own contract.** `computeReadinessMultiplier(null)` returns **Normal (×1.0)** — "no data → neutral." The view fabricated a value *specifically to avoid* passing the no-data case the function already handles, inverting its answer from Normal to Lighter.
- **The neutral point of the 1–5 scale is 4, not 3.** The monitoring suite pegs `{4,4,4}` as its flat/normal baseline (`tests/cases/15-monitoring.js:36`) and explicitly asserts `computeReadinessMultiplier({4,4,4}).key === 'normal'` (`:258`). On this scale 4 = "fine," 3 = "mildly below par." Fabricating a **3** out of silence invents a mildly-sub-par report the athlete never made.
- **The rest of the system already treats no-check-in as no-data.** `readinessScore` (`js/monitoring.js:20`) returns `null` for an absent readiness object *and* for one missing any of sleep/soreness/fatigue, so the `readinessTrend` signal (ADR-0014) already ignores un-filled days. `today.js` was the lone dissenter — and its persisted `{3,3,3}` actively **polluted** that baseline with a fabricated 3.0 the athlete never reported.

**Impact:** systematic, silent **under-dosing** — an athlete who doesn't fill readiness before viewing/logging trains chronically light across a whole macrocycle. That is a **G1/G2** goal-attainment risk, not a G3 one. The s/s/f pills are a *subjective wellness* signal; the actual injury gates (the pain check-in → Silbernagel model, the ADR-0016 finger-density guard, ADR-0008 layoff decay) are **separate** and fire on their own regardless of this default, so defaulting wellness to Lighter bought no tissue protection — it only under-dosed the (far more common) days the athlete simply forgot. The audit rated it software-only, which is why it routed to a decision rather than a unilateral fix.

### Decision

**A day with no readiness check-in is treated as Normal (×1.0).**

1. **Render:** when `dayLog.readiness` is absent, pass it straight through to `computeReadinessMultiplier` (which returns Normal via its own `if (!readiness)` guard) rather than fabricating `{3,3,3}`. The "no data → Normal" contract lives in **one** place — `js/loads.js` — and the view stops second-guessing it. As a free consequence, the s/s/f pills (`readiness[key] === v`) render **unfilled**, so "haven't checked in" is now visually distinct from "deliberately logged straight-3s" (which the old `{3,3,3}` default conflated). The summary line already guards `rdAvg` (`Avg — → Normal`), so it reads correctly with no data.
2. **Persist:** stop fabricating readiness in `getOrInitDay()` — store a readiness object only when the athlete actually set at least one pill. This keeps the stored record honest and the `readinessTrend` baseline free of manufactured data points, resting on the fact that `readinessScore` already null-handles absent/partial readiness. The pain check-in path is unaffected — a pain-only day yields `{pain:{…}}` with no s/s/f, which `readinessScore` correctly scores as `null` while the Silbernagel gates still fire.

### Left deliberately untouched: the 3 → Lighter threshold

`computeReadinessMultiplier`'s thresholds are **not** changed. A **deliberately-logged** straight-3 continues to read Lighter, and that is correct: on a scale whose neutral point is 4 (per the tests above), tapping all 3s is a genuine "sleep meh, a bit sore, a bit tired" report — exactly the below-par-but-not-rest day the ×0.85 lever was built for. The IB-058 defect was never "3 reads Lighter"; it was "**silence** reads as 3." Realigning the thresholds would retroactively change the meaning of every already-logged 3 and touch validated load math (KG-C7) with no evidence demanding it — out of scope, and rejected as a fold-in. If a case ever arises that a deliberate 3.0 *should* read Normal, that is its own, larger decision and belongs in a fresh queue item.

### Build scope (for the later `/to-spec` pass)

- `js/views/today.js`: at ~L494, pass absent readiness through instead of defaulting to `{3,3,3}` (Normal comes from `computeReadinessMultiplier`'s guard); at ~L1078, drop the `{3,3,3}` fallback in `getOrInitDay()` so readiness persists only when set.
- Add a test in the readiness/monitoring cases pinning the no-check-in behaviour: no `dayLog.readiness` → `Normal` prescription (no ×0.85, no ≤8.5 cap), pills unfilled, and no fabricated readiness written on a save that omits the pills (so `readinessTrend` ignores the day). No existing case asserts the old `{3,3,3}` behaviour, so nothing needs un-asserting.
- **No schema bump, no load-chain (`js/loads.js`) change** — `computeReadinessMultiplier` is unchanged; this is a view-layer default fix (render + persist).
