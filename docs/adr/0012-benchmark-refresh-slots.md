# Benchmark refresh: post-goal retest slot + staleness-gated Build-Monday micro-retest

**Status:** Implemented — decided 2026-07-15 ([wayfinder ticket #31](https://github.com/slm37102/simple-climbing-training-planner/issues/31)); shipped 2026-07-17 via [issue #51](https://github.com/slm37102/simple-climbing-training-planner/issues/51). Adjudicates coach-review W13 (tracked inside KG-A8).

## Context

The only benchmark measurement closes Base (week 6 of 12). Build/Peak percentages ride those numbers for the rest of the cycle, Build+Peak strength gains are never captured, and cycle N+1 starts from a benchmark 7+ weeks old (coach-review W13, Medium; KG-A8-adjacent). The retest-week fix (KG-B10, ticket #35) makes the week-6 numbers *fresh*, and the ADR-0009 targets-hit ratchet compensates upward between tests — but nothing measures the cycle's actual outcome.

## Decision

Two refresh slots, both feeding the existing `setGlobalBenchmarks` path (no history array — same posture as today):

1. **Post-goal retest slot (unconditional).** In the days immediately after the goal/comp day (the out-of-cycle window), the Today tab offers an end-of-cycle retest session — max hang, optionally pull-up 1RM while fresh. Maximum-validity measurement (tapered, peaked, zero training cost since the cycle is over); captures Build+Peak gains; hands cycle N+1 an honest starting benchmark; feeds the end-of-cycle review checklist (KG-D7, ticket #43) and the inter-cycle progression question (KG-A8).
2. **Build-Monday micro-retest (staleness-gated).** The first Build Monday's warm-up includes a 15-minute max-hang-only micro-retest **only when the stored benchmark is older than ~4 weeks**. Silent at the default 12-week shape (the week-6 retest just ran); fires on long single-block cycles, the second block of double-block cycles, and any cycle where the retest week was skipped. Gate threshold is an app convention (unvalidated — KG-C7 posture).

## Considered and rejected

- **Post-goal only** (the session's original recommendation) — the owner chose both; the staleness gate removes the redundant-measurement cost that argued against the mid-cycle slot.
- **Unconditional Build-Monday micro-retest** — at the default length it re-measures 1-week-old numbers; the gate keeps the freshness spend proportional to what it buys.
- **Neither** — leaves cycle N+1 keyed to mid-cycle numbers; rejected as under-serving KG-A8.

## Consequences

- The out-of-cycle state gains its first real behavior (today it renders an empty "Outside cycle" session) — implementation defines the post-goal window (proposal: goal day +1 through +7).
- Micro-retest needs a "benchmark age" lookup (benchmarks carry `updatedAt` already).
- W14's layoff-decay-floor question (out of the current map's scope) noted: a forced re-benchmark after long layoffs could reuse this same micro-retest slot machinery when it's eventually decided.
