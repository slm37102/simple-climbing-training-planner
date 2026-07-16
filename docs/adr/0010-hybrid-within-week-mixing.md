# Hybrid mode: within-week mixing (system-per-slot, format alternation)

**Status:** Accepted — decided 2026-07-15 ([wayfinder ticket #24](https://github.com/slm37102/simple-climbing-training-planner/issues/24)); implementation pending (spec → tickets via the map's assembly step).

## Context

In hybrid mode, `weekFlavor` alternates the *entire week* between boulder and sport, so every specific stimulus lands fortnightly: ARC ~1×/fortnight in Base (KG-B4), limit bouldering 1×/fortnight in Build, 60/60 threshold 1×/fortnight. The 2026-07-14 coaching review ([`coach-review.md`](../coach-review.md), W4, High) rated this the largest drag on grade progression after the (since-closed) progression-engine gap: the corpus's own verified findings say aerobic adaptation needs 2–3 sessions/week for 6–8 weeks — fortnightly is below the adaptation threshold for essentially every alternated quality. Weekly whole-flavor alternation is an app invention; the cited frameworks either block one goal per cycle or mix modalities within the week.

## Decision

**Mix within the week: fix the energy system per slot, let the format alternate by week.** The dose that matters is the system's, not the format's — a 60/60 route session and boulder triples feed the same band-1 system, so alternating formats inside a fixed slot restores weekly frequency without doubling session count.

| Phase | Thursday | Saturday |
|---|---|---|
| **Base** | Flavor-specific quality, **alternating**: boulder projecting/technique (odd wks) ↔ route pyramid (even wks) | **Always aerobic-capacity**, format alternating: boulder flash pyramid (odd) ↔ ARC 2×30 (even) |
| **Build** | **Always limit bouldering** (max strength/power weekly, freshest climbing day) | **Always power-endurance**, format alternating: boulder triples 4×4 (odd) ↔ 60/60 threshold (even) |

Scope and boundaries:

1. **Base + Build only.** Peak (2 wk) and Taper keep the existing weekly alternation — they express fitness rather than build it, the below-adaptation-threshold argument doesn't bite in a ≤2-week window, and this avoids colliding with the comp-format templates (KG-A13, ticket #39) that replace comp-peak Saturdays wholesale.
2. **The 60/60 threshold session moves from Build-Thursday (sport weeks) to Build-Saturday (even weeks).** ADR-0006's band-1/band-2 design and the goal-anchored density progression (`densityRest`) ride along unchanged — only the slot moves.
3. **Build-Monday campus ladders stay fortnightly** (tied to boulder-format weeks, unchanged). Limit bouldering just went from fortnightly to weekly in Build — a real increase in high-intensity finger exposure — so stacking weekly campus on top of it spends G3 budget for no clear return from a sub-max primer (ADR-0001 posture).
4. **`weekFlavor` survives with narrowed semantics:** it picks the *format* inside a fixed-system slot (and the Monday campus appendix), no longer the identity of the whole week. Non-hybrid focus modes (`boulder`/`sport`) are untouched.

## Considered and rejected

- **Per-cycle focus** (boulder-focus cycle then sport-focus cycle via the existing `plan.focus`) — rejected: it doesn't fix hybrid mode, it abandons it. Focus cycles are already available to any athlete who wants them; both G1 goals (V7 *and* 7b) are live simultaneously, and each would wait ~3 months per cycle while the other discipline coasts.
- **Mixing Peak/Taper too** — rejected as out of proportion: a 2-week expression phase under alternation already gives one boulder-biased and one sport-biased week.
- **Weekly campus on Build Mondays** — rejected on G3 grounds (see decision point 3).

## Consequences

- **KG-B4 (ARC under-dosed in hybrid) is structurally addressed:** Base aerobic work lands every Saturday plus even-week Thursdays (≈1.5–2×/week, more counting optional Sunday mileage) instead of fortnightly. The gap closes when this ADR's implementation ships.
- Build limit work and band-1 PE go weekly; the ADR-0009 targets-hit progression and Base aerobic ramp now touch every week's sessions instead of alternating ones. The added weekly finger load is the flagged risk to watch — the monitoring model (KG-A4, in adjudication) is the guardrail.
- Ticket #37's caveat (flash-pyramid slot might move) resolves: the session lands exactly where built — Base Saturday, odd weeks.
- Implementation is a substantial `buildThuMain`/`buildSatMain` restructure — it goes through a `/to-spec` pass before tickets are cut (per the map's standing note), not straight to code.
