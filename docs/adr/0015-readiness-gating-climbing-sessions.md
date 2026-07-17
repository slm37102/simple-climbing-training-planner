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
- Interaction rule: readiness scaling composes with deload/taper cuts and the Base ramp the same way the kg chain composes multipliers — apply to the final displayed target, note appended to the trail.
