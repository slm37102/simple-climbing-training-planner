# Limiter readout: static norm comparison, target-grade anchored, informational-only

**Status:** Implemented — decided 2026-07-15 ([wayfinder ticket #29](https://github.com/slm37102/simple-climbing-training-planner/issues/29)); shipped 2026-07-17 via [issue #50](https://github.com/slm37102/simple-climbing-training-planner/issues/50). Adjudicates KG-A1's feature half; KG-D2 is the implementation.

## Context

The app stores benchmarks and a target grade but reads them in no diagnostic path (KG-A1): it cannot say whether fingers, pulling, endurance, or technique gates the athlete, so 3 sessions/week may be training a non-limiter — the most expensive mistake available for G1. The prerequisite norms work closed 2026-07-08 ([`benchmark-norms.md`](../benchmark-norms.md), KG-C6) but carries a hard honesty constraint: within this athlete's Advanced tier, finger strength explains only ~17% of grade variance and pulling ~8–12% — and a 2024 systematic review found weighted pull-up 1RM doesn't discriminate climbing level at all. The norms doc's own recommendation: a single static comparison with the uncertainty in the UI copy, not a trend engine or program-changer.

## Decision

A small pure function (benchmarks + target grade in → verdict lines out) rendered as a card, scoped exactly to what the evidence supports:

1. **Three lines:**
   - **Fingers** — `maxHang20mm` vs the Lattice Advanced-tier band for the **target grade** (`boulderGrade`, added-kg convention per the norms doc's unit warning): at/above the band → "fingers likely aren't your main limiter"; meaningfully below → "a limiter candidate."
   - **Pull-ups** — `pullup1RM` vs the diminishing-returns **ceiling only** (+65% BW added, men): above → "more pulling strength won't buy grades." No grade-band claim — no defensible table exists.
   - **Elsewhere-inference** — when both strength lines sit at-or-above norm, say the limiter is likely technique/endurance/tactics, which the app doesn't measure. This is the actionable line: the plan already trains strength 3×/week.
2. **Anchor: target grade** (what onboarding writes into `boulderGrade`/`sportGrade`) — the readout answers "what's between me and the goal," not "am I strong for my current grade."
3. **Surface: a Settings card beside the benchmark fields**, recomputed statically whenever benchmarks change (including the retest "Save as Benchmark" path — it refreshes each retest week for free). **Informational-only**: no prescription changes, no session-text bias. Actuation toward the limiter belongs to the inter-cycle progression question (KG-A8), still open.
4. **Honesty requirements:** the R² caveat lives in the card copy itself ("strength explains ~17% of grade variance at this level — treat as a sanity check"); the "meaningfully below" threshold (proposed: ≥1 full grade-step under the target band) is an app convention, labelled unvalidated per the KG-C7 lesson.

## Considered and rejected

- **Current-grade anchor / dual anchor** — needs a maintained current-grade field the app doesn't reliably have; doubles the copy for marginal insight.
- **Gentle actuation** (below-norm verdict biasing session text, KG-A10-style) — crosses the line the norms doc drew; revisit only via KG-A8.
- **Trend engine** (limiter tracked over retests) — that's KG-A4/KG-D6 territory (monitoring), not this card.
- **Using `dominantStyle`/`dominantAngle` in the diagnosis** — style fields say nothing about which *physical quality* gates the athlete; they're consumed by the anti-style cue (KG-A10, ticket #41) instead.

## Consequences

- KG-A1 closes when the card ships (KG-D2); the gap's "highest-leverage missing coach knowledge" framing is deliberately answered with a modest feature — the evidence doesn't support more.
- The readout needs the norm table as data — a small constant table in code (added-kg convention, target-grade keyed), sourced from `benchmark-norms.md` with its confidence labels.
- No schema change: all inputs already stored.
