# Hold weeks clamp the readiness "Push": recovery weeks suppress reward-upward levers, keep the corrective thermostat

**Status:** Accepted — decided 2026-08-06 via `/grill-queue` ([issue #76](https://github.com/slm37102/simple-climbing-training-planner/issues/76)). Graduated from IB-064; adjudicates KG-B20. Build via `/to-spec → /to-tickets → PR` (changes prescribed kg → trip-wire 2).

## Context

`Loads.resolveEffective` (`js/loads.js`) has **two** upward levers on the suggested kg:

1. the ADR-0009 **+2.5% targets-hit progression** step, and
2. the **readiness multiplier** — `computeReadinessMultiplier` returns ×1.05 ("Push") on a good check-in (`js/loads.js:24-31`).

The IB-028 fix ([ADR-0009 addendum](0009-intra-phase-progression.md), 2026-07-30) and the IB-056 decision ([ADR-0007 addendum](0007-taper-hold-intensity-peaktype.md), 2026-08-05) taught `holdProgressionFor` to suppress lever (1) on recovery weeks — `pain-amber` / `retest` / `deload`, and `taper` once IB-056 builds. But they scoped their fixes to *only* the +2.5% step. Lever (2) — the readiness Push — is applied **unconditionally, after and outside** the `holdProgression` gate:

```
js/loads.js:210   if (readinessMultiplier !== 1.0) {
js/loads.js:211     kg *= readinessMultiplier;
js/loads.js:212     reason.push(`readiness ×${readinessMultiplier}`);
```

The +5% per-session cap is `previousActualKg × decay × MAX_SESSION_PROGRESS` (×1.05, `:219-225`), so a Push lands **in full** on a hold week. Net: a good-readiness check-in raises finger/pull **kg +5%** on a deload / taper / pain-amber day — *larger* than the +2.5% the hold exists to stop, and on the highest-injury-risk tissue.

Concrete trace (from the issue, verified against current code) — default 12-week comp cycle, a Base **deload** Monday (`BASE_MAX_INTRO` hangboard, `loadPctRange [0.80,0.85]`); prev same-slot actual 20 kg, RPE in-range, targets hit:

- `adj = 1.0`; targets-hit branch entered; `holdProgression='deload'` → **+2.5% correctly suppressed**, `kg = 20`.
- athlete logs readiness `{sleep:5, soreness:5, fatigue:4}` → avg 4.67 → **Push ×1.05** → `kg = 21`.
- cap `= 20 × 1.0 × 1.05 = 21` → no clamp. **Suggested: 21 kg, +5% on a deload week.**

Push readiness is *likeliest* exactly on a deload (the athlete is freshest), so it fires when least wanted. The same path fires on **taper** (once IB-056 lands the taper hold) and — worst — on a **pain-amber** day: `holdProgressionFor` returns `'pain-amber'`, the +2.5% is held, yet the ×1.05 still lands, i.e. *"you reported finger pain, and slept well, so here is +5% finger load."* Pain is finger-specific; sleep/soreness/fatigue are general wellness, so the two co-occur readily — the safety hole is real, not hypothetical.

**Why this is not covered by any prior decision.** IB-028/IB-056 concern lever (1); this is lever (2). IB-030/IB-058 ([ADR-0015 addendum](0015-readiness-gating-climbing-sessions.md)) concern the *downward* readiness ×0.85 on *climbing volume* — opposite direction, different axis (kg vs volume). ADR-0015's body already chose **downward-only asymmetry** for the readiness signal on the climbing-volume side ("Push keeps its existing meaning: +5% on the kg suggestion only") but deliberately left the kg-side Push intact — this ADR closes that residual kg gap, but only on hold weeks. IB-029 questions the *magnitude* of ×1.05; this is about *when* it applies and stands regardless of the number.

## Decision

**On any hold week, clamp the readiness multiplier to ≤ 1.0 — the upward Push is held, the downward Lighter/rest are not.**

In `resolveEffective`, immediately before the readiness multiply (`:210`):

```js
if (holdProgression) readinessMultiplier = Math.min(readinessMultiplier, 1.0);
```

- **Gated on `holdProgression` truthiness**, cause-agnostic — the same trigger the +2.5% suppression already uses, so the two upward-lever suppressions cannot drift apart. It inherits `taper` for free the moment IB-056 builds (no IB-064 code change, no build-ordering dependency), and `retest` is a harmless no-op (no retest-week session carries a kg-bearing exercise — the second ADR-0009 addendum verified this exhaustively).
- **Downward preserved.** `Math.min(0.85, 1.0) = 0.85` and `Math.min(0, 1.0) = 0`, so "Lighter" and "rest" pass through untouched — a poor-readiness recovery day can still go *lighter*, it just can never go *heavier*.
- **The corrective thermostat stays running.** `autoAdjust`'s ±5% is **not** touched (consistent with IB-028 and IB-056, which both considered freezing it and rejected that). This completes a single doctrine across all three decisions:

  > **On any hold week, suppress the *reward* upward levers (+2.5% targets-hit, ×1.05 readiness Push); keep the *corrective* RPE thermostat (±5% `autoAdjust`).**

  The two levers are genuinely different. `autoAdjust` ×1.05 fires on a below-range RPE — *"you under-loaded relative to the held band, come back up to it"* — it walks you **toward** the prescription and is capped at +5%. Readiness ×1.05 fires on good sleep/soreness/fatigue — it pushes you **above** the prescription as a reward for wellness, unrelated to whether you hit the band. On a recovery week the prescription *is* the target: correcting toward it is fine; adding load on top of it because you feel fresh is the exact thing the week exists to prevent.

- **Reason trail.** Because a clamped Push makes `readinessMultiplier === 1.0`, the existing `if (readinessMultiplier !== 1.0)` branch goes silent — the athlete who checked in feeling great would otherwise see *nothing* about why their fresh day didn't move the load (the trail is user-visible since IB-041). So when a hold clamps a Push (readiness was > 1.0, now 1.0), emit **one phase-neutral line** — e.g. `"readiness Push held — recovery week"` — so the "Why this load" badge accounts for *both* suppressed upward levers ("progression held" + "Push held"), not one silently vanishing. Phase-neutral wording (not "deload"/"taper"/"pain") for the same reason the IB-028 second addendum gave: a hardcoded cause string would lie on a different-cause hold. The downward "readiness ×0.85" line is unchanged.

## Considered and rejected

- **Do nothing (leave Push ungated).** Rejected: this is the only path by which a hold week ratchets *intensity* up on G3-sensitive tissue, it is strictly worse than the +2.5% already suppressed (larger, and reachable on pain-amber), and it silently violates the "intensity held" contract (ADR-0003/0007) *upward*.
- **Also freeze `autoAdjust`'s upward move on holds.** Rejected — contradicts the reasoning IB-028 and IB-056 already settled, and strips a real *corrective* "you under-loaded the touch, come back to the band" signal. The invariant this ADR restores is "recovery weeks don't ratchet load up via a *reward* lever," not "intensity is frozen solid."
- **Force `readinessMultiplier = 1.0` on holds (ignore readiness entirely).** Rejected: that would also kill the protective *downward* Lighter/rest, removing autoregulation in the safe direction on the very weeks a bad morning most warrants backing off. The clamp is deliberately asymmetric (`Math.min`, not assignment).
- **Enumerate causes (clamp only pain-amber + deload).** Rejected: invites the two suppressions to diverge and needs a manual edit when IB-056's taper hold lands. Gating on `holdProgression` truthiness is simpler and self-extending.
- **Clamp in the callers (`today.js`) before passing `readinessMultiplier` in.** Rejected: duplicates the guard across both `resolveForDay` call sites — the exact drift risk the `holdProgressionFor` extraction was created to kill. `resolveEffective` already receives both `holdProgression` and `readinessMultiplier`, so placing the clamp there makes the invariant hold **by construction for every caller** (the module's own stated principle for `resolveForDay`) and co-locates it with the +2.5% suppression it mirrors.

## Out of scope (deliberate)

This ADR removes only the *upward* push. It does **not** make a pain-amber day go *lighter* — that is a separate, larger question (should declared finger pain actively deload intensity?) that belongs to the ADR-0014 monitoring model / IB-025 ("fingers never receive an intensity deload") and the ADR-0017 finger-tweak return-state machinery already being built for declared-pain de-escalation. Folding a pain-driven downward cut in here would smear two decisions together and pre-empt that grill. IB-064's claim is the narrow, code-provable one: *no hold should let readiness ratchet kg up.*

## Consequences

- Confidence **high**: the change *removes* an over-loading path and never raises load anywhere (Push→held is downward or neutral; Lighter/rest unchanged), so it is safe against the compounding-conservatism concern by construction and directly serves G3.
- Reachable cases fixed: **deload** and **pain-amber** today; **taper** automatically once IB-056 builds. `retest` unaffected (no kg-bearing exercise — no-op).
- The ADR-0009 §2 +5% cap is unchanged; on a hold week the only remaining upward source is the corrective `autoAdjust` ×1.05, still capped.
- No schema change, no new flag, no `holdProgressionFor` change — the clamp reuses the existing `holdProgression` value `resolveEffective` already receives.

## Build (separate, multi-session)

Changes prescribed kg → **trip-wire 2**; ships via `/to-spec → /to-tickets → PR`, not inline. Locus: `js/loads.js` `resolveEffective` — one `Math.min` clamp before `:210` and one reason-trail line when a Push is clamped. Pin with an `[IB-064]` regression:

- hold (`deload`) + Push readiness → suggested kg **held** (no +5%), trail names "Push held";
- hold + Lighter readiness → still ×0.85 (downward preserved);
- non-hold + Push readiness → still +5% (capped) — unchanged;
- hold + below-range RPE (`autoAdjust` ×1.05) → still nudges up to +5% (corrective thermostat preserved).
