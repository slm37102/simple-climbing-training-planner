# Intra-phase progression: targets-hit load rule + Base aerobic volume ramp

**Status:** Accepted — implemented 2026-07-14 (closes KG-A2, KG-B5, KG-D5).

## Context

Every non-deload week of a phase prescribed the identical session (KG-A2): climbing volume, ARC duration, and loaded-exercise targets never moved within a phase. The only week-to-week variation was the ±5% RPE thermostat (`Loads.autoAdjust`), which mirrors the last session and can oscillate around a fixed load forever — nothing implements progressive overload (KG-B5). The 2026-07-14 external coaching review ([`coach-review.md`](../coach-review.md), W11) rated this the plan's single largest performance cap: an unchanging stimulus stops driving adaptation after ~2–3 weeks, so a 6-week Base contains ~3 wasted weeks by construction.

The verified corpus already specifies the missing rules:

- **Strength:** progress load **+2.5–10%** (or smaller edge / fewer fingers) once all targets are hit with good form ([`verified-findings.md`](../research/verified-findings.md) § Strength).
- **Aerobic base:** within an aerobic-capacity mesocycle, **volume ramps by adding sets over the first 2–3 weeks**, then the 3rd/4th week is a recovery microcycle in which sets are **halved** (§ Base; sample progression 3×5′ → 4×5′ → 5×5′ → recovery 2–3×5′).

## Decision

Three mechanisms, all conservative ends of their evidence bands:

### 1. Targets-hit load progression (`js/loads.js`)

When the previous same-session actual has **avg RPE inside the target range** *and* **completed sets ≥ prescribed sets** (and reps ≥ prescribed reps, when both sides are known), the suggested load progresses **×1.025** instead of ×1.0. The existing thermostat is unchanged and takes precedence at the extremes (RPE above range → ×0.95; below range → ×1.05).

+2.5% is the *bottom* of the verified +2.5–10% band, chosen because (a) hangboard/pull-up added-load increments are small absolute numbers where the %-added convention already compresses true intensity headroom (KG-B11), and (b) fingers progress on tendon time, not muscle time. The 0.5 kg display rounding means small loads progress in visible steps every 1–2 sessions rather than continuously — acceptable.

Targets are compared against **today's** prescription, so a deload-week actual (cut sets) never qualifies the following full week for progression — the first post-deload session holds, then progresses. Intentional.

### 2. Per-session upward cap ×1.05 (`js/loads.js`)

The total upward move from all multiplicative sources (auto-adjust/targets-hit × readiness) is capped at **+5% of the (layoff-decayed) previous actual per session**. Without this, ×1.05 (RPE below range) stacking with ×1.05 ("Push" readiness) produced +10.25% single-session jumps — above the verified progression band and flagged by the review (W14). Downward multipliers are never capped.

### 3. Base aerobic volume ramp (`js/program.js`)

In **Base**, sessions whose `energySystem` is aerobic (`Aerobic capacity` route pyramid, `Aerobic base` ARC) scale their non-optional exercises' `prescribedTarget` by **×(1 + 0.10 × (hardWeekPos − 1))**, capped **×1.30**, where `hardWeekPos` is the week's 1-based position among the *hard* (non-deload, non-retest) weeks of its Base run. Deload weeks are exempt from the ramp and keep their existing −40% cut of the *unramped* template — that cut **is** the evidence's "recovery microcycle, sets halved" step, so ramp and deload compose into exactly the published ramp-then-halve shape. Retest weeks stay unramped (test fresh). The ramp restarts per Base run in double-block cycles. A `rampNote` on the session surfaces it in the UI (rendered in the same header slot as `deloadNote`; `taperNote`, which was silently never rendered there, now shares it).

Default 12-week shape (sport-flavor weeks): ARC 30 → wk2 35 → deload 20 → retest 30 min; pyramid 10 → 11 → 6 → 10 routes. Boulder-flavor hard weeks land at positions 1/3/4 → projecting unchanged (Skill/Strength, not aerobic); Saturday's flash pyramid (KG-B12, closed 2026-07-15) ramps the same way as the sport-side sessions: 18 → 22 → 23 problems.

## Considered and rejected

- **Extending PE density rest-cuts across all of Build** — rejected: contradicts ADR-0006's verified band-1 design ("little density change" in the engine block; the 5 s/week cut is *goal-anchored*, confined to the final 4 weeks, and is the band-1→band-2 shift mechanism). KG-D5's "PE rest-cuts" item is considered already satisfied by ADR-0006.
- **Limit-boulder volume progression** — rejected: adding attempts/sets to max-intensity bouldering is the highest injury-cost progression available (ADR-0001 posture). Limit work progresses by grade/quality, which is athlete-led and already implied by "stop when power drops".
- **Ramping Base boulder-flavor sessions** — deliberately excluded while the Base Saturday triples session was itself mis-phased (KG-B12). **Update 2026-07-15:** KG-B12 closed — Base boulder-Saturdays now run the aerobic flash pyramid (`sat-flash-pyramid`, `js/program.js`), which the `energySystem` gate picks up automatically; the exclusion above only ever applied to the (now Build-only) anaerobic triples.
- **+5% targets-hit step** — deferred: revisit from the athlete's own logs (KG-A4 monitoring) if +2.5% proves too slow across a full cycle.

## Consequences

- Suggested loads now ratchet upward under sustained good performance instead of oscillating; the retest (end of Base) still re-anchors the whole system, and `layoffDecay` still degrades stale seeds first.
- `resolveDate` now carries `peakType` on its returned context (the ramp needs the same phase pattern the resolver used); additive, no callers break.
- Views pass `previousActualSets`/`previousActualReps` into `Loads.resolveEffective` (both `today.js` call sites). `log.js` needs no change — it renders stored days, not suggestions.
- Aerobic-frequency under-dosing in hybrid mode (KG-B4) is **not** addressed here — this ADR ramps the volume of the ARC sessions that exist; it does not add sessions.
- `[ADR-0009]` regression tests in `tests/index.html`; `sw.js` `CACHE` bumped; generated schedule in [`training-plan.md`](../training-plan.md) regenerated (`tools/generate-schedule.mjs`, now checked in).
