# Project goals

Why this project exists and what "success" means. This document is evergreen — edit it only when the goals themselves change (e.g. the athlete reaches V7/7b and re-baselines). Everything volatile — open questions, known divergences, missing knowledge — lives in [`knowledge-gaps.md`](knowledge-gaps.md).

## Why this exists

A **personal training tool for one climber (the owner)**. Not a product, not a portfolio piece, not a general-purpose planner. The only quality bar that matters: it trains this one athlete correctly. Every design decision should be judged against that bar and nothing else.

## The athlete

One intermediate climber: currently **V5–V6 boulder / ~7a sport**, ~3 years of experience, training **3×/week**, climbing both disciplines. Current numeric benchmarks (max hang, pull-up 1RM, bodyweight) live in the app's Settings, not here — this document describes the profile class, not the values.

## Definition of success — the three goals

| ID | Goal | What it means |
|----|------|---------------|
| **G1** | **Progression** | Climb **V7 boulder / 7b sport**. The app's job: drive measurable long-term strength and grade gains, cycle over cycle. |
| **G2** | **Peaking** | Arrive at a chosen comp/trip window at **cycle-best form**. The app's job: periodize backwards from a target date and taper correctly. |
| **G3** | **Durability** | Train 3×/week **consistently and injury-free** — no climbing-caused injury that costs more than a few sessions. |

**G3 gates G1 and G2.** One pulley injury wipes out an entire cycle, so when goals conflict, durability wins (this is the principle behind [ADR-0001](adr/0001-soften-peak-phase-for-intermediate-athlete.md)).

## What the app is / is not

**Is:** a prescription engine (periodized macrocycle → daily sessions → kg loads), a training log, and an autoregulation loop (RPE + readiness), for exactly one athlete.

**Is not:** a coach replacement, a multi-user product, medical advice, or a place to demonstrate engineering. Complexity must earn its place by improving training outcomes.

## Design principles

1. **Injury-conservative by default.** When sources disagree, take the safer prescription.
2. **Evidence-grounded.** Prescriptions trace to [`training-philosophy.md`](training-philosophy.md) and [`research/`](research/README.md); deliberate deviations get an ADR in [`adr/`](adr/).
3. **The plan adapts to the athlete, not vice versa.** Autoregulation (readiness, RPE) over rigid prescription.
4. **Simple over clever.** Vanilla JS, single user, offline-first, no build step.
5. **Docs are the decision log.** Changes to training content require an ADR; known unknowns are tracked in [`knowledge-gaps.md`](knowledge-gaps.md), each with a stable ID (KG-*) that ADRs and commits can cite.

When trade-offs bite, the priority order is: **safety (G3) > prescription correctness (G1/G2) > convenience > polish**.

## Related documents

| Document | Owns |
|----------|------|
| [`training-philosophy.md`](training-philosophy.md) | What we believe and why — protocols, sources, evidence tiers |
| [`knowledge-gaps.md`](knowledge-gaps.md) | What we don't know yet — gaps, divergences, open adjudications |
| [`research/`](research/README.md) | The evidence corpus (verified claims + raw gathered claims) |
| [`benchmark-norms.md`](benchmark-norms.md) | Grade-anchored finger/pulling-strength norms, with confidence labels (closes KG-C6) |
| [`adr/`](adr/) | Decisions and their trade-offs |
| [`improvement-audit.md`](improvement-audit.md) | Engineering findings (sync, correctness, UX, PWA) — not training content |
| [`training-plan.md`](training-plan.md) | Human-readable prescription tables (mirror of `js/program.js`) |
