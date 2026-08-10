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

---

## Addendum (2026-08-09) — the duration mismatch is unquantified, so the "limiter candidate" verdict is suppressed

Adjudicates **IB-020 / KG-B22** ([grill-queue #77](https://github.com/slm37102/simple-climbing-training-planner/issues/77)). Narrows Decision §1's fingers line; the rest of this ADR is unchanged.

### The gap

`FINGER_NORM_ADDED_PCT` is a **7-second** Lattice hang, but `maxHang20mm` stores a **10-second** hold (`js/program.js:710`/`:724`), and `limiterReadout` compares them with no conversion. A maximal 10s hold sits at lower added load than a maximal 7s one, so the stored number reads systematically **low** against the table, biasing the fingers line toward "below → a limiter candidate."

Audit-loop pass 39 already shipped the honest-labeling half: `docs/benchmark-norms.md` was corrected (it had claimed the two were the same measurement) and `js/limiter.js` now discloses the mismatch in its `caveat`. What was left open was the numeric decision — retest at 7s, apply a conversion, or widen the threshold.

### What the grill settled first: the benchmark protocol cannot move

**Retesting at 7s was eliminated on a code fact, not a judgement.** `maxHang20mm` is not merely a readout input — `prescribeLoadKg` uses it as `baseMax` for `kind:'hangboard'` (`js/loads.js:78`), and ADR-0013 makes every phase band a percentage of *total system load* built on it. The Peak band comment is explicit that the 7-53 load is "~97–100% of **the 10s max**" (`js/program.js:210-213`). So the 10-second number anchors the entire hangboard band ladder; re-measuring it at 7s would silently raise every hangboard prescription to fix an informational readout. **The 10s benchmark is fixed.** (Relatedly: the app's own 7-second protocols create no parallel mismatch — Base `7/3 Repeaters` carries `loadPctRange: null` so no kg is derived, and the 7-53 band's authors already reconciled the duration by hand.)

### What the research pass found

A `/research` pass ([`max-hang-duration-norms.md`](../research/max-hang-duration-norms.md)) asked whether the table could simply be swapped for a duration-matched one. Two results:

1. **Power Company Climbing is the right source and is genuinely duration-matched** (weighted 10s hang, 20 mm), and its unit convention is now pinned down — `Str:Wt = (BW + added) ÷ BW`, i.e. total load, converting cleanly to our added-%BW by `(ratio − 1) × 100`. But **the cell values could not be read**: every external host is 403-blocked by this environment's egress policy. **Blocked, not refuted.** No other duration-matched, grade-anchored 10s/20mm table exists from any source the sweep could find — a clean negative.
2. **The finding that outranks the original question: the 7s→10s load difference has no peer-reviewed quantification at all.** The only figures in circulation are two mutually inconsistent, unit-ambiguous numbers from a single secondary site. Under their plausible readings the delta spans **≈1 pp to ≈7 pp of bodyweight** — against a `GRADE_STEP_ADDED_PCT` threshold of 6 pp.

That invalidates the reassurance our own shipped text was giving. Both `docs/benchmark-norms.md` and `js/limiter.js:17-20` told the reader the delta is "a few percent of bodyweight," so it "can flip a borderline verdict but not a clear one." **That bound is unsourced**, and under one plausible reading the bias is a *full grade step* — i.e. it can manufacture a clear verdict, not merely tip a borderline one. We disclosed the mismatch honestly and then under-sold it.

### Decision

**Settle now rather than park.** The correction does not depend on the table: the "bounded" claim is unsupported whichever values PCC turns out to hold, and parking would leave it in shipped text for an unbounded wait. Fetching the table becomes its own queued item (**IB-073**) for a session with network access.

1. **Suppress the "limiter candidate" verdict.** When `athletePct <= normPct - GRADE_STEP_ADDED_PCT`, the readout no longer concludes "a limiter candidate." It states the comparison and **withholds the verdict**, naming the reason: the band is a 7s hang, the benchmark a 10s hold, and the gap between them is unquantified — so a below-band reading cannot be distinguished from the measurement artefact.
2. **Correct the disclosure** in both places from "bounded / a few percent" to **"direction known, magnitude unquantified."**
3. **Keep the 10s benchmark and the Lattice table.** No conversion factor is invented, and the threshold is **not** widened.

**Why suppress this one verdict and not the others.** The bias is *one-directional*, and it points at exactly the verdict that costs something. A false "fingers are a limiter" steers the athlete toward more finger volume when the evidence says their likelier real limiter is technique/tactics (this ADR's own ~17% R² caveat) — and more finger loading is the G3-expensive direction. The mirror verdict ("at or above the band → fingers likely aren't your limiter") is biased *against itself* by the same error, so the artefact can never produce it spuriously; it is left running, and with it the `elsewhere` line, which fires only on `fingersAtOrAbove === true` and is therefore untouched.

### Considered and rejected

- **Apply a 7s↔10s conversion factor** — rejected: the research found no quantification to base one on, so the factor would be a fresh invented constant (exactly the posture [ADR-0020](0020-autoregulation-magnitudes-are-permanent-conventions.md) has just refused) papering over an unquantified one, while *looking* like a correction.
- **Widen the `GRADE_STEP_ADDED_PCT` threshold to absorb the difference** — rejected for the same reason, and worse: it blunts a readout that is already weakly predictive, and the amount to widen by is precisely the unknown quantity.
- **Keep both verdicts with a corrected caveat only** (the research write-up's own recommendation, "change nothing in `js/limiter.js`") — rejected. That recommendation was formed before weighing the 1–7 pp range against the 6 pp threshold. A caveat under a verdict that may be entirely an artefact asks the athlete to do the discounting; when the possible error spans the whole decision threshold, the honest move is to not render the conclusion.
- **Park the item until the PCC table can be read** — rejected: leaves a known-unsupported claim shipped, and the decision above holds regardless of what the table says.

### Consequences

- The readout gets *quieter*, not wronger: it still shows where the athlete sits against the band, and still says when fingers look adequate. It stops asserting the one conclusion the measurement cannot support.
- **IB-073** (fetch the PCC 10s/20mm table) is queued. If it lands, it **replaces** `FINGER_NORM_ADDED_PCT` with a duration-matched table and this addendum's suppression is **reversed** — the mismatch will no longer exist. That is the clean exit, and it is why no conversion constant is introduced in the meantime.
- Informational-only still holds: no prescription changes (§3), so this touches no load chain and no schema.

### Build scope (for the later `/to-spec` pass)

- `js/limiter.js`: reword the `meaningfullyBelow` branch to withhold the verdict; correct the `IB-020` header comment and the `caveat` string ("slightly low" → direction known, magnitude unquantified).
- `docs/benchmark-norms.md`: soften the "bounded … a few percent of bodyweight" paragraph to match.
- Extend the `[IB-020]` cases in `tests/cases/14-limiter-benchmark-refresh.js`: a below-band finger benchmark no longer yields a `limiter candidate` conclusion; the at-or-above and `elsewhere` lines are unchanged.
- **No schema bump, no load-chain change** — `js/limiter.js` is informational-only and never mutates a prescription.
