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

## Addendum (2026-07-30) — suppress the +2.5% step on deload/retest weeks (IB-028 / KG-B14)

**Grilled and decided** via `/grill-queue` (issue #59). This completes the targets-hit rule above; it does not change its intent.

**The gap.** Decision §1 guards *one* direction — a deload-week actual (cut sets) never qualifies the *following* full week (the "compared against today's prescription" note above). The **reverse** direction was left open: on a **deload** week the sets are cut ~40% (`applyDeloadVolume`), so the *previous full week's* actual trivially clears the reduced target in `targetsHit`, and the +2.5% step fires — nudging finger/pull **intensity up during the recovery week**, which contradicts the "deload = volume cut, intensity held" invariant (ADR-0003/0004). Same mechanism on retest **Thu/Sat** sessions, which take the deload cut (KG-B10), and on the retest **Monday** test itself, where a +2.5% bump would move the test target.

**Decision.** Set the **existing** `holdProgression` flag (ADR-0014) whenever `ctx.deload || ctx.retest`, uniformly across those weeks' sessions. That flag already suppresses exactly the +2.5% targets-hit step in `resolveEffective` (`js/loads.js:155`) while leaving the ±5% thermostat running; today it is set only from an amber pain check-in (`js/views/today.js:1003`, `:1152`). The fix extends that flag's triggers — **no `js/loads.js` change, no new suppression path, no new flag** (this is the IB-028 finding's own conclusion: the flag that makes it a one-expression fix already exists).

**Scope — deliberately minimal.** This suppresses *only* the +2.5% progression bonus. The ±5% RPE thermostat (`autoAdjust`) stays deload-unaware **by design**: a recovery week does not *progress*, but it still *autoregulates* — a below-range RPE can still nudge ×1.05 (capped +5%), reflecting a real athlete signal. Freezing the thermostat's upward move on deload too was considered and **rejected**: the effect being corrected is small (net deload finger tonnage ≈ 0.6 × 1.025 ≈ 0.62× the prior week, with no plausible single-nudge injury pathway per `deep-audit.md` §8), so the extra suppression path is not worth its complexity. The invariant this restores is "recovery weeks don't ratchet load upward via *earned progression*," not "intensity is frozen."

**Build (separate, multi-session).** Changes prescribed kg → trip-wire; ships via `/to-spec → /to-tickets → PR`, not inline. Locus: the two `today.js` `resolveForDay` call sites, `holdProgression: <amber-pain> || ctx.deload || ctx.retest`. Pin with an `[IB-028]` regression: a deload week following a targets-hit full week **holds** (no +2.5%), while a non-deload week still progresses.

## Addendum (2026-07-30, second) — two corrections found while building IB-028

Spec'd as #62, built as #63 → #64. Neither correction changes the decision above; both fix claims it made about the code.

**1. "No `js/loads.js` change" no longer holds — the reason trail became user-visible.** The first addendum asserted the fix needs no `js/loads.js` change, which was true of the *suppression logic* and remains true. But `resolveEffective` also hardcoded the trail line `pain amber — progression held (ADR-0014)`, and **IB-041** (audit-loop pass 4, after that addendum was written) started rendering `reason[]` to the athlete as the "Why this load:" badge. Setting the flag from `ctx.deload` with that string intact would tell an athlete who reported no pain that their pain was amber.

So `holdProgression` now carries the **cause** rather than a bare boolean: `'pain-amber'`, `'deload'`, or `'retest'`, with the trail line derived from it. Any truthy value still holds progression, and a bare `true` produces a cause-neutral line, so every pre-existing caller and test keeps working — the ADR-0014 regression case passes unedited, and the pain-amber wording is byte-identical to what it replaced. This is a change to the flag's *interface and explanation*, not to what a hold does.

**2. The retest leg of the rationale is unreachable in the current program.** The first addendum justified including retest weeks by pointing at "retest **Thu/Sat** sessions, which take the deload cut (KG-B10), and … the retest **Monday** test itself, where a +2.5% bump would move the test target." Neither happens, and the reason is that **no session in a retest week carries a `loadPctRange` exercise at all**:

- retest Monday is `mon-retest`, whose four exercises are all `kind: 'test'` — no percentage range, so `prescribeLoadKg` returns null and `resolveEffective` exits before `holdProgression` is ever consulted. A progression step cannot move the test target because no suggestion is produced.
- retest Thu/Sat are Base climbing sessions (route pyramid / ARC / flash pyramid / projecting) — climbing kinds, no kg.

Verified exhaustively over 945 day-builds spanning 11 cycle lengths × {comp, trip, project} × {hybrid, boulder, sport}: **zero** retest-week days produce a kg-bearing exercise. The same sweep confirms **`retest` never occurs without `deload`** (the forced end-of-Base week sets both), so the decision's `ctx.deload || ctx.retest` is equivalent to `ctx.deload` today.

Both halves of that sweep are **pinned as an `[IB-028]` regression**, not left as prose here — this addendum's claim is load-bearing (it is why no end-to-end retest hold is asserted anywhere), so if a retest session ever gains a weighted exercise the suite fails and sends the reader back to this section.

The `retest` disjunct and its trail wording are kept deliberately — they cost one lookup-table entry, they keep the predicate honest about the week it is describing, and they are already correct if the retest protocol ever gains a weighted exercise. But no test asserts a retest-week kg hold end-to-end, because there is nothing to assert: the state is currently unreachable. **Do not read a passing retest expectation as coverage of that path.**
