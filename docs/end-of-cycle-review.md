# End-of-cycle review checklist

A short, human-run review the athlete walks through once a macrocycle's Taper/goal day has passed and before Cycle N+1's settings are locked in. Closes the checklist half of [KG-A8](knowledge-gaps.md#kg-a8--no-inter-cycle-progression-model-p2-g1) ([KG-D7](knowledge-gaps.md#lens-d--feature-gaps)) — see that entry for why this stays a manual walkthrough rather than an automated readout: the app has no monitoring model yet ([KG-A4](knowledge-gaps.md#kg-a4--no-monitoring-model-p1-g3g1), still open), so nothing here is an app feature — it's a page you read with the Log tab open.

Answer every line. Where a line names a source, that's a verified finding or a shipped ADR; where it doesn't, it's this doc's judgment call, not literature — treat it as a starting heuristic to revise from your own data (per [KG-C7](knowledge-gaps.md#kg-c7--the-autoregulation-constants-are-uncited-p3)).

## 1. Retest trajectory

- Did this cycle's closing benchmarks (max hang, pull-up 1RM, boulder/route grade) move up, flat, or down versus the benchmark you started this cycle with? → record the delta in Settings, don't eyeball it.
- Is a *second* retest slot now feeding this comparison — the post-goal slot and/or a staleness-gated Build-Monday micro-retest ([ticket #31](https://github.com/slm37102/simple-climbing-training-planner/issues/31), decided but not yet shipped as of this writing) — or are you still comparing against a Base-week-6 number that's 10+ weeks stale? → if stale, note it; don't let a stale denominator masquerade as "flat."
- Is this the **second cycle in a row** a given benchmark is flat or down? → this is a judgment call, not a cited threshold (the app's own monitoring model, [KG-A4](knowledge-gaps.md#kg-a4--no-monitoring-model-p1-g3g1), names "flat retest two cycles → change stimulus" as a rule worth having but has never built or validated it) — treat two-flat-in-a-row as your cue to change *something* below, not as proof of a specific cause.
- If a benchmark is down, was there a missed-session gap, illness, or life-load spike this cycle (check the Log tab / `Replan.detectGap` banners)? → a real interruption explains a dip without implicating the program; a dip with no interruption is the strongest signal something in the program itself needs to change.

## 2. Protocol rotation

- Has any single hangboard/pull-up protocol (e.g. Base repeaters+intro-max-hangs, Build weighted max-hangs 2×4) run for 2+ consecutive cycles unchanged? → the app's own session library is static cycle-to-cycle by design ([KG-A8](knowledge-gaps.md#kg-a8--no-inter-cycle-progression-model-p2-g1)); rotating edge depth, hang duration, or repeater cadence is a judgment call this checklist exists to prompt, not something backed by an RCT ([training-philosophy.md](training-philosophy.md#peer-reviewed-support-and-gaps) has no head-to-head trial on protocol rotation cadence either).
- Has the power-endurance stimulus (Build 60/60 threshold, Peak 30/30 lactic — [ADR-0006](adr/0006-power-endurance-two-band-model.md)) felt routine rather than hard by the end of Build? → consider tightening interval rest further or shifting the aerobic/anaerobic split, still within the two verified energy-system bands — don't invent a third band.
- Has the same handful of anti-style/technique drills been picked every cycle ([KG-A9](knowledge-gaps.md#kg-a9--no-techniqueskill-programming-p2-g1), 19-drill catalog)? → force a rotation through an unpicked category next cycle; the picker doesn't do this for you.

## 3. Phase-ratio shift toward the evolving limiter

- Per [`benchmark-norms.md`](benchmark-norms.md)'s grade-anchored table, is finger strength, pulling strength, or neither still trailing the athlete's current grade? → this table only explains ~17% of grade variance at this tier (finger) and ~8–12% (pulling), so treat it as a sanity check, not a diagnosis ([KG-C6](knowledge-gaps.md#kg-c6--norms-data-provenance-p2)); a real limiter diagnosis tool doesn't exist yet ([KG-A1](knowledge-gaps.md#kg-a1--no-limiter-diagnosis-p1-g1), open).
- Has the limiter changed since last cycle (e.g. fingers were behind, now pulling is)? → if so, this is the point to lengthen Base relative to Build by a week or two, or bias Base's anti-style problems ([KG-A10](knowledge-gaps.md#kg-a10--styleweakness-individualization-unused-p3-g1)) toward the new gap. `settings.cycleWeeks` and the phase split are configurable per-cycle for exactly this ([ADR-0002](adr/0002-configurable-cycle-length.md)) — use that lever rather than editing session templates.
- Is bouldering or sport specifically lagging relative to the other? → hybrid flavor-alternation halves the dose of each discipline by construction (coach-review, "systemic problem" #2) — a limiter on one discipline may just mean that discipline needs a single-flavor cycle instead of hybrid.

## 4. Peak aggressiveness ratchet

- Did this cycle's Peak phase feel appropriately hard, or did the athlete finish it undertrained relative to what a true Peak block should demand? → the current Peak/Taper prescriptions are deliberately softened for an intermediate, injury-averse athlete ([ADR-0001](adr/0001-soften-peak-phase-for-intermediate-athlete.md)); ratcheting back toward the published Lattice/Anderson defaults is the explicit open question in [training-philosophy.md](training-philosophy.md#peer-reviewed-support-and-gaps) and becomes live "exactly when the athlete succeeds at G1."
- Has the athlete moved into V7/7b+ territory this cycle or the last (i.e. hit the G1 target)? → if yes, this is the trigger to revisit ADR-0001's softening and consider a new ADR that steps Peak intensity/volume back up; if no, hold the current template — don't ratchet preemptively.
- Did any near-miss or actual tweak happen in Peak this cycle? → if yes, hold or soften further regardless of grade progress; G3 durability outranks G1/G2 ratcheting per [`project-goals.md`](project-goals.md)'s stated trade-off order.

## 5. Next cycle's flavor and focus

- Given sections 1–4 above, should Cycle N+1 be hybrid, boulder-only, or sport-only? → pick the flavor that serves the lagging discipline/limiter, not just "whatever's next."
- Is there a fixed goal date (comp/trip) driving `anchorMode: 'compDate'` next cycle, or is this an open-ended `startDate` cycle? → confirms which `peakType` (`comp`/`trip`/`project`, [ADR-0007](adr/0007-taper-hold-intensity-peaktype.md)) and taper length apply before you lock Settings.
- Does `settings.cycleWeeks` need to change (longer Base for a lagging limiter, shorter overall for a sooner goal, or crossing the 20-week double-block threshold, [ADR-0002](adr/0002-configurable-cycle-length.md))? → set it deliberately here, not by inertia from last cycle's value.
- Write one sentence naming Cycle N+1's focus (e.g. "fingers lagging, boulder-only, 16 weeks, no fixed date") and save it somewhere you'll see it on day one of the new cycle.
