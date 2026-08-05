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
