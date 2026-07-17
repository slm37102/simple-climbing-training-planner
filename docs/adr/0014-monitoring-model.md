# Monitoring model: four exception-catcher signals, advisory + one-tap responses

**Status:** Implemented — decided 2026-07-16 ([wayfinder ticket #26](https://github.com/slm37102/simple-climbing-training-planner/issues/26), grounded in the [monitoring-signals evidence sweep](../research/monitoring-signals-evidence.md), ticket #25); shipped 2026-07-17 via [issue #52](https://github.com/slm37102/simple-climbing-training-planner/issues/52). Adjudicates KG-A4.

## Context

The app logs readiness and RPE and retests once per Base block, but nothing watches trends — no overreach flag, no plateau detection, no pain check-in distinct from generic soreness (KG-A4, P1, "the highest-value unfinished feature for G3" per the coach review). The evidence sweep's headline: the in-repo corpus has no trend thresholds, and the public sport-science thresholds are either unvalidated in climbers, practitioner convention, or actively contested — so every rule here beyond "deviation from your own baseline" is an **app convention, labelled unvalidated** (KG-C7 posture). Framing adopted from the sweep: these signals are the **reactive exception-catchers on top of the already-implemented proactive system** (3:1 deloads, taper, readiness multiplier, layoff decay) — not a training-load model (KG-A12 stays won't-fix).

## Decision

### The four signals (and the four rejections)

| Signal | Rule (app convention unless noted) | Response (advisory + one-tap accept) |
|---|---|---|
| **Readiness trend** | 7-day avg of the daily readiness score ≥0.5 pt (1–5 scale) below the athlete's 28-day rolling baseline | Banner suggesting an early volume cut; accepting applies a deload-style cut (existing `applyDeloadVolume` mechanism) to the coming week's sessions |
| **RPE drift at constant load** | 2 consecutive load-matched `hangboard`/`pullup` sessions with avg RPE above the target range at non-increased kg | Flag + suggest confirming via the ADR-0012 micro-retest (the literature treats drift as nonspecific — confirm with a performance test before acting) |
| **Retest trajectory** | 2 consecutive retests with no improvement → plateau flag | Pointer to the end-of-cycle review checklist's stimulus-rotation questions — a between-cycles conversation, not a mid-week mutation |
| **Pain check-in** | Silbernagel model (the one RCT-backed rule in the sweep): 0–10 finger/elbow pain, ≤3 green / 3–5 amber (hold progression) / >5 **or worse next morning** red | Red → suggest skipping today's finger-loading exercises + point at the KG-A7 return-from-tweak path; amber → hold the ADR-0009 progression |

**Rejected** (with the sweep's disqualifiers): **ACWR** (mathematically confounded per Lolli 2019 / Impellizzeri 2020, and collides with KG-A12's won't-fix), **sRPE/monotony/strain** (needs session duration the app doesn't log; duration is a poor climbing proxy), **HRV** (not collectable; weak evidence for resistance athletes), **sleep/RHR/bodyweight cuts** (blog-level numbers).

### Response posture

**Advisory flags with an explicit one-tap accept — nothing mutates without a tap** (the ADR-0008 gap-banner idiom). Display: a signals panel on the **Log tab** (KG-D6's home) plus a Today-tab banner while a flag is live.

### Storage

One schema bump covering: **benchmark history** (the retest save currently overwrites — the app's only climbing-validated longitudinal signal discards the data a trend needs; the sweep called this the most important feasibility fact), **daily readiness history** (today it feeds a single-day multiplier and is dropped), and a **pain field** (0–10 + "settled by morning?") distinct from the generic soreness item.

## Considered and rejected

- **Auto-modulation on high-confidence flags** — breaks the plan-adapts-with-consent posture (ADR-0007/0008 precedent: judgment calls stay with the athlete).
- **Advisory-only without actions** — leaves the loop open; the one-tap lever closes it at zero autonomy cost.
- **A UI prototype pass** — declined by the owner; flags reuse the existing banner/note idioms and the pain input is one pill row.
- **Adding session duration** to unlock sRPE — data-entry burden every session for a contested downstream payoff.

## Consequences

- KG-A4 closes when the signals ship (KG-D6). The readiness-gating decision (KG-A14, ticket #30) can now be made against a concrete monitoring backdrop.
- Schema bump + `sw.js` cache bump per convention; readiness/pain history syncs through the existing Firestore path.
- All four thresholds are tuning candidates once the athlete's own history accumulates — that self-tuning was KG-C7's stated endgame for the autoregulation constants.
