# Missed-session detection: gap banner, whole-week extend lever, layoff decay

**Status:** Accepted — implemented 2026-07-08 (closes KG-A3/KG-D3).

## Context

The app is pure calendar math: `Program.resolveDate` derives the prescribed session from the date alone, with no concept of whether previous sessions actually happened. KG-A3 named two concrete harms of this: (1) `Loads.resolveEffective` seeds today's suggested kg from the last logged actual for that exact session type with no decay for elapsed time — someone back from a 3-week illness gets a full-intensity suggestion, a classic pulley-injury trigger (G3); (2) a gap in Base just keeps ticking through the calendar as if nothing happened, so the taper can land on the original date despite less training actually occurring (G1/G2).

KG-A3's own resolution note names three rules: "miss ≤1 wk → resume; miss ≥2 wk in Base → extend Base/shift start; miss during Peak with a fixed comp date → decide which phase to sacrifice." This ADR encodes the first two mechanically and treats the third as a human decision (an informational banner + link to Profile), the same posture ADR-0007 took toward taper length — a lever the athlete pulls, not an algorithm that guesses for them.

## Decision

**Detect gaps from `plan.days` directly; offer a whole-week "extend" lever in `startDate` mode; decay stale load seeds; never shift anything silently.**

### Gap detection unit

A "missed session" is a main-slot day (Mon/Thu/Sat, mirroring `DOW_TO_SLOT`'s `mon-main`/`thu-main`/`sat-main`) strictly in the past with **no entry in `plan.days`**. Days are created lazily — no record exists until `Storage.setDay` is called — so "no entry" is a reliable, cheap test that needs no `actual`/`status` inspection.

### Anchor

`Replan.detectGap(plan, todayISO)` (`js/replan.js`) anchors on the **latest** of:
- the most recent logged main-slot day in `plan.days`,
- `Program.effectiveStart(settings)`,
- `plan.createdAt`,
- `settings.gapAcknowledgedThrough` (see below).

`gapDays = daysBetween(anchor, today)`.

Two failure modes this guards against, found in post-approval review before implementation:
- **Fresh-plan false positive:** in `compDate` mode, `effectiveStart` is routinely weeks in the past the moment a plan is created (the whole point of back-computing from a goal date). Without the `createdAt` floor, every new `compDate` plan would open with a false "major gap" banner. Anchoring on `createdAt` too means a brand-new plan is never flagged before the athlete has had a chance to log anything.
- **Re-offer loop:** extending the plan doesn't itself create a new logged main-slot day, so without an explicit acknowledgment the same gap would re-detect and re-offer another shift on every visit. `gapAcknowledgedThrough` is set by *both* banner actions (extend and "keep original schedule") and acts as a floor so an already-handled gap can't fire again until a new one opens up past that date.

### Thresholds

Named constants in `js/replan.js`:

| `gapDays` | Severity | Behavior |
|---|---|---|
| < 8 | — | Silent — the "≤1 wk" rule. No banner. |
| 8–13 | `soft` | Informational note only: loads below are already decayed; no schedule action offered. |
| ≥ 14 | `major` | The "≥2 wk" rule. `anchorMode === 'startDate'` → offer "Extend plan by N weeks." `anchorMode === 'compDate'` → informational only ("goal date is fixed... adjust in Profile") — this is KG-A3's "decide which phase to sacrifice" case, deliberately left as a human decision rather than an auto-compression algorithm. |

The extend action adds `shiftDays = floor(gapDays / 7) × 7` to `settings.scheduleShiftDays`, which `Program.effectiveStart` applies (then re-snaps to Monday) in `startDate` mode only. Whole weeks, rounded **down** — `shiftDays` must never exceed `gapDays`, because it shifts `effectiveStart` forward by that amount: if the shift ever exceeded the gap, the new start would land *after* today itself, and `Program.resolveDate` would resolve today as `outOfCycle` (negative `diffDays`). Flooring keeps today's post-shift offset in `[0, 6]` — always safely inside the cycle — while staying an exact multiple of 7 so the Monday re-snap in `effectiveStart` is a no-op (the shift the banner promises is the shift that's actually applied, with no silent second adjustment from the snap).

*Implementation note (2026-07-08):* the first implementation used `ceil`, reasoning (wrongly) that rounding up was the "conservative" direction. An adversarial review caught that this overshoots whenever the anchor is the raw, unlogged cycle start (the feature's central case — nothing has been logged yet) and `gapDays` isn't an exact multiple of 7 — six of every seven gap sizes. Repro: start Mon 2026-05-04, nothing logged, today Wed 2026-05-20 (`gapDays=16`) → old `shiftDays=21` → new `effectiveStart=2026-05-25` → today resolves `{outOfCycle: true, diffDays: -5}`, i.e. clicking "Extend plan" stranded the athlete on the "Outside cycle" screen for 5 days. Fixed to `floor` before shipping; a sweep regression test (`[ADR-0008] REGRESSION: ...`) now checks every `gapDays` from 14–30 that applying the offered shift always leaves today resolvable.

### Load decay

Separate from the plan-wide gap above: `Loads.layoffDecay(daysSincePrevious)` in `js/loads.js` scales the previous-actual seed for a specific exercise by how long it's been since *that session type* was last logged (via `findPrevSameSession` in `today.js`, not the gap anchor):

```
factor = 1.0                                     if daysSincePrevious ≤ 10
factor = max(0.85, 1 − 0.03 × (days − 10) / 7)    otherwise
```

Full credit inside a 10-day grace window (absorbs one skipped instance of a weekly session without penalty); −3%/week beyond that, floored at ×0.85 (~5 weeks off). Inserted into the chain between the previous-actual seed and `autoAdjust` — decay applies to the raw seed, before RPE auto-adjustment and the readiness multiplier — and appended to `reason[]` like every other step. Like the existing readiness multipliers (KG-C7), this is an **app convention**: the direction (decay after a layoff) is evidence-backed, the exact grace period/slope/floor are not independently cited and should be tuned from this athlete's own response over time.

### Explicitly rejected / out of scope

- **Automatic Base-extension or phase-compression.** The athlete always presses the button; nothing shifts without an explicit action.
- **Inferring "missed" from `status`/`actual` fields.** The existing `status: 'missed'` field (`log.js`) is a manual log annotation with no writer path found in current code and is unrelated to this detector — gap detection only asks "does a day record exist."
- **Reconciling missed *light*/*optional* sessions** (Tue/Sun). Only the three main days gate detection, matching the "3 sessions/week" core structure this app is built around.

## Considered options

- **Auto-decide which phase to sacrifice in `compDate` mode** (e.g., silently shrink Build) — rejected: KG-A3 flags this as a genuine coach judgment call with real trade-offs (goal readiness vs. injury risk vs. which quality to protect); automating it risks a confidently-wrong plan more than an honest "you're behind, here's the fixed date" note does.
- **Day-granularity shift instead of whole-week** — rejected: breaks the C1 Monday-alignment invariant that `weekIdx`/phase-pattern indexing depends on throughout `program.js`.
- **Decay keyed to the plan-wide gap instead of per-session-type recency** — rejected: a hangboard-heavy layoff shouldn't decay an unrelated exercise the athlete logged three days ago, and `findPrevSameSession` already tracks the right per-exercise recency.
- **`ceil(gapDays/7)` instead of `floor`** — tried first, rejected after adversarial review: rounding up can shift `effectiveStart` past today itself whenever the anchor is the raw cycle start and `gapDays` isn't an exact week multiple, putting the athlete out-of-cycle immediately after accepting the extend action (see the implementation note above). `floor` is the only rounding choice that's both a clean week multiple (no snap surprise) and never exceeds `gapDays` (never overshoots into the future).

## Consequences

- No `SCHEMA_VERSION` bump: `scheduleShiftDays` and `gapAcknowledgedThrough` are new `defaultSettings()` fields backfilled by `migrate()`'s existing shallow-merge, same pattern as `peakType` (ADR-0007).
- `js/replan.js` is a new module (registered in `sw.js`'s `SHELL`, `CACHE` bumped) and is a pure function of `(plan, todayISO)` — it reads `plan.days` directly rather than going through `Storage`, so it composes cleanly with `Program`'s existing pure-function style and is trivial to unit-test without a `Storage` singleton.
- The gap banner only evaluates when the Today tab is viewing the real current date, not while browsing history — browsing the past shouldn't nag about a gap that's already been resolved by whatever the athlete does today.

## Implementation checklist (completed 2026-07-08)

- `js/storage.js`: `scheduleShiftDays: 0`, `gapAcknowledgedThrough: null` added to `defaultSettings()`.
- `js/program.js`: `effectiveStart` applies `scheduleShiftDays` in `startDate` mode, re-snaps to Monday.
- `js/replan.js`: new module, `Replan.detectGap(plan, todayISO)`.
- `js/loads.js`: `Loads.layoffDecay(daysSincePrevious)`; `resolveEffective` takes `daysSincePrevious` and applies it to the seed step.
- `js/views/today.js`: gap banner (soft/major, extend/acknowledge actions) wired via `Replan.detectGap`; `daysSincePrevious` threaded into both `resolveEffective` call sites.
- `css/styles.css`: `.gap-note` / `.gap-note.major`.
- `sw.js`: `js/replan.js` added to `SHELL`; `CACHE` bumped.
- `tests/index.html`: `[ADR-0008]` cases for `detectGap` thresholds/anchor/shift rounding, `effectiveStart` shift + re-snap, and `layoffDecay` boundaries.
