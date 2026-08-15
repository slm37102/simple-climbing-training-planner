# Knowledge gaps

What the planner **doesn't know yet**. The app was largely built *before* the research in [`research/`](research/README.md) was done, so this document also audits the app's training decisions against that (newer) evidence. Goals **G1** (progression to V7/7b), **G2** (peak for a date), **G3** (injury-free consistency) are defined in [`project-goals.md`](project-goals.md).

**How to read this doc**

- Four lenses: **A** — plan-making knowledge neither the docs nor the code have; **B** — places the app contradicts or ignores its own research; **C** — weaknesses in the evidence itself; **D** — app features blocked on the knowledge above.
- Every gap has a stable ID (`KG-A1`, …) so ADRs and commits can cite it (e.g. "closes KG-B1"). **This doc only carries the full write-up for gaps still Open/Researching.** Once a gap closes (or is ruled Won't-fix/Resolved/Accepted), its write-up moves to [`knowledge-gaps-archive.md`](knowledge-gaps-archive.md) under the same ID and this doc keeps just its one-line table row + a link — never delete an ID from either doc.
- **Priority:** P1 = gates a goal · P2 = meaningful · P3 = nice-to-have. **Status:** Open / Researching / Closed / Won't-fix.
- Entries contain *pointers, not quotations* — protocols live in [`training-philosophy.md`](training-philosophy.md), evidence in [`research/verified-findings.md`](research/verified-findings.md), code facts in the referenced files. All code facts below were verified against the current source (2026-07-02).
- As of 2026-07-23, **no** gap remains open. Everything ever tracked here has closed, been ruled won't-fix, or been accepted as a permanent limitation — see the archive for the full history. Since then, several rows have **graduated in from [`improvement-backlog.md`](improvement-backlog.md) via the grill queue** (KG-B14 through KG-B19): their decision is settled in an ADR but the build is still pending, so they sit as *Resolved*, not *Closed*. KG-A8 was the last, resolved 2026-07-23 (checklist + a cycle-end reminder nudge shipped; the auto-detect/auto-actuate half ruled Won't-fix — see the archive for why). (KG-A13 was mistakenly reopened by a 2026-07-16 doc-restructure commit that overwrote its closure — see the archive; it shipped and closed same-day.)

---

## Lens A — Plan-making knowledge

What making a good climbing plan requires that neither the docs nor the code currently know.

| ID | Gap | Priority | Goals | Status |
|----|-----|----------|-------|--------|
| KG-A1 | No limiter diagnosis | P1 | G1 | Closed (ADR-0011, issue #50, 2026-07-17) |
| KG-A2 | No intra-phase progressive overload | P1 | G1 | Closed (ADR-0009, 2026-07-14) |
| KG-A3 | No missed-session replanning | P1 | G1 G2 G3 | Closed (ADR-0008, 2026-07-08) |
| KG-A4 | No monitoring model | P1 | G3 G1 | Closed (ADR-0014, issue #52, 2026-07-17) |
| KG-A5 | Taper knowledge is a stub | P2 | G2 | Closed (ADR-0007, 2026-07-04) |
| KG-A6 | Power-endurance dosing unresolved | P2 | G2 G3 | Closed (ADR-0006, 2026-07-04) |
| KG-A7 | Injury-prevention dosing partial | P2 | G3 | Closed — dosing half (#40, 2026-07-16); return-from-tweak half (#47, 2026-07-17) |
| KG-A8 | No inter-cycle progression model | P2 | G1 | Checklist + nudge shipped; automation Won't-fix (2026-07-23) |
| KG-A9 | No technique/skill programming | P2 | G1 | Closed (2026-07-14) |
| KG-A10 | Style individualization unused | P3 | G1 | Closed (issue #41, 2026-07-16) |
| KG-A11 | No outdoor conversion | P3 | G2 | Won't-fix (in code) |
| KG-A12 | No cross-session fatigue model | P3 | G3 | Won't-fix (fold into A4) |
| KG-A13 | Comp peak type has no comp-format specificity | P3 | G2 | Closed (issue #39, 2026-07-16) |
| KG-A14 | Readiness autoregulation never touches climbing sessions | P2 | G3 G1 | Closed (ADR-0015, issue #53, 2026-07-17) |

Full detail for every row above is in [the archive, Lens A](knowledge-gaps-archive.md#lens-a). No Lens A gap remains open.

---

## Lens B — Research-vs-app gaps

The app was built before the research; these are the places where its decisions contradict or ignore the verified findings. **KG-B1–B13 are Closed** — full detail for all thirteen is in [the archive, Lens B](knowledge-gaps-archive.md#lens-b). KG-B14 through KG-B20 graduated in from the improvement backlog via the grill queue, so their write-ups live in their ADRs rather than the archive; most are **Resolved by decision with the build still pending** (KG-B14 is built and merged).

| ID | Gap | Priority | Goals | Status |
|----|-----|----------|-------|--------|
| KG-B1 | Peak prescription conflict (ADR-0001 unimplemented) | **P1 — critical** | G3 | Closed (2026-07-02) |
| KG-B2 | Hangboard protocol identity/sequencing | P2 | G1 G3 | Closed (ADR-0005, 2026-07-04) |
| KG-B3 | Deload cadence 2:1 vs 3:1 | P2 | G1 G3 | Closed (ADR-0004, 2026-07-04) |
| KG-B4 | ARC under-dosed in hybrid mode | P2 | G1 | Closed (ADR-0010, issue #48, 2026-07-17) |
| KG-B5 | No "targets hit → progress" rule | P2 | G1 | Closed (ADR-0009, 2026-07-14) |
| KG-B6 | Doc drift (stale deload rule etc.) | P2 | — | Closed (2026-07-02) |
| KG-B7 | 4×4 boulder-triples grade too hard | P2 | G1 G3 | Closed (ADR-0006 addendum, implemented 2026-07-10) |
| KG-B8 | ARC "60–70% effort" contradicts its own RPE | P2 | G1 | Closed (implemented 2026-07-10) |
| KG-B9 | Base sport-Thursday pyramid runs too hot | P2 | G1 | Closed (implemented 2026-07-10) |
| KG-B10 | Retest week is a deload in name only | P2 | G2 G3 | Closed (implemented 2026-07-16) |
| KG-B11 | %-of-added-load convention distorts true intensity | P2 | G1 G3 | Closed (clamp #36 2026-07-16; convention ADR-0013 #49 2026-07-17) |
| KG-B12 | Base boulder-Saturday triples run Build-intensity (KG-B9's unfixed twin) | P2 | G1 G3 | Closed (implemented 2026-07-15) |
| KG-B13 | Taper volume is cut twice | P3 | G2 | Closed (implemented 2026-07-16) |
| KG-B14 | Deload/retest weeks progress finger/pull load +2.5% (full-actual clears the cut target), contradicting "deload = intensity held" | P2 | G3 | Resolved ([ADR-0009 addendum](adr/0009-intra-phase-progression.md), 2026-07-30) — graduated from IB-028; build via `/to-spec` pending |
| KG-B15 | `return-from-tweak.md`'s protocol has no code consumer — an athlete who tweaks a finger but keeps training gets no de-escalation at all (layoff decay keys on time *off*; pain-red is text-only), and two written safety rules (`skip on any finger tweak`, grip position) are prose the code never checks | P1 | G3 | Resolved ([ADR-0017](adr/0017-finger-tweak-return-state.md), 2026-08-03) — graduated from IB-014; build via `/to-spec` pending |
| KG-B16 | Monday S&C block has no vertical/overhead press (one horizontal press vs 3 climbing days + weighted pull-ups); "no scapular push" too. **Not G3** — grill verified the injury-prevention premise as weak/consensus-only and the RCT-adjacent cuff prehab as already covered; this is balanced-development completeness, not a safety fix | P1 | G1 | Resolved ([ADR-0018](adr/0018-vertical-press-in-antagonist-block.md), 2026-08-05) — graduated from IB-024. Add pike push-ups (Monday only, serratus cue folded in), drop inverted rows, rename label; build via `/to-spec` pending |
| KG-B17 | Taper weeks progress finger load +2.5% (targets-hit step measured against already volume-cut sets), contradicting the taper's own "intensity held" note — the reachable twin of KG-B14, landing on the final week before the goal (trip/project) or cross-cycle (comp) | P2 | G3 | Resolved ([ADR-0007 addendum](adr/0007-taper-hold-intensity-peaktype.md), 2026-08-05) — graduated from IB-056. Hold the +2.5% step on taper via a one-line `ctx.phase === 'taper'` predicate in `holdProgressionFor` (thermostat left running); build via `/to-spec` pending |
| KG-B18 | On a deload/taper/forced-cut/density-guard week that is *also* a Lighter readiness morning, climbing `prescribedTarget` was cut twice (volume-cut ×0.6 *then* readiness ×0.85); double-flooring drove the RPE 9–9.5 limit/campus sessions to ×0.25 (4 problems → 1), below the purpose-designed recovery volume — and *more* aggressive than the kg chain ADR-0015 cited as its rationale (kg is never deload-scaled, so the kg side cuts once). **Not G3** — both cuts downward, no injury exposure; a G1 under-stimulus + a two-note prose double-count | P3 | G1 | Resolved ([ADR-0015 addendum](adr/0015-readiness-gating-climbing-sessions.md), 2026-08-05) — graduated from IB-030. Volume cut **once**: readiness gate skips ×0.85 volume-scaling on any exercise already carrying `originalTarget`, keeps the ≤8.5 RPE cap + rest/lactic swaps, reworded note to intensity-only. No schema/load-chain change; build via `/to-spec` pending |
| KG-B22 | The limiter readout compares `maxHang20mm` (a **10-second** hold) against `FINGER_NORM_ADDED_PCT` (a **7-second** Lattice band) with no conversion, biasing the fingers line toward "below → a limiter candidate". The shipped disclosure further claimed the error was **bounded** ("a few percent of bodyweight" vs the 6 pp `GRADE_STEP_ADDED_PCT`) — a `/research` pass found that bound is **unsourced**: there is no peer-reviewed quantification of the 7s→10s delta at all, and the only figures in circulation span **≈1–7 pp**, i.e. up to a full grade step. A false finger-limiter verdict steers the athlete toward more finger volume (G3-expensive) when the likelier limiter is technique/tactics (~17% R²) | P2 | G1 | Resolved ([ADR-0011 addendum](adr/0011-limiter-readout.md), 2026-08-09) — graduated from IB-020. **Benchmark protocol is fixed** (not a judgement — `maxHang20mm` is `prescribeLoadKg`'s `baseMax`, so retesting at 7s would raise every hangboard prescription to fix a readout). **Suppress the "limiter candidate" verdict**: state the comparison, withhold the conclusion, name the unquantified mismatch. Keep the 10s benchmark and the Lattice table; **no conversion factor invented, threshold not widened** (both would be fresh invented constants papering over an unquantified one — the posture ADR-0020 just refused). The at-or-above and `elsewhere` lines are untouched (biased *against* themselves by the same error, so never spuriously produced). Correct the "bounded" claim to "direction known, magnitude unquantified". Clean exit queued as **IB-073** — a duration-matched Power Company table (confirmed 10s/20mm, unit convention pinned) would *replace* the table and reverse the suppression, but its values are 403-blocked by this environment's egress policy (**blocked, not refuted**). No schema/load-chain change. **Built 2026-08-10** (audit-loop pass 48) — `js/limiter.js` withholds the below-band verdict (`verdict: 'below'` → `'below-unresolved'`) and `docs/benchmark-norms.md` carries the corrected "direction known, magnitude unquantified" disclosure; the ≈1–7 pp range is deliberately kept **off** the athlete-facing card, since printing it would restore the very bound this row retracts. Pinned by four `[IB-020]` cases in `tests/cases/14-limiter-benchmark-refresh.js` |
| KG-B21 | Every autoregulation **magnitude** is app-invented (readiness ×1.05/1.00/0.85 at 4.5/3.5/2.5, flat ±5% `autoAdjust`, layoff 10d/−3%/wk/×0.85, `TARGETS_HIT_PROGRESS` 1.025, `MAX_SESSION_PROGRESS` 1.05) — directions are consensus, numbers are uncited guesses at 0.5 kg precision. Honest labeling was already done (KG-C7), but `js/loads.js:21-22` and `:46` **promise** a calibration loop ("Tune them from the athlete's own logs via KG-A4") that nothing implements. **Not G3** — the audit's own impact line rates the residual as coaching effectiveness + over-trust (G1), not injury | P2 | ~~G3~~ G1 | Resolved ([ADR-0020](adr/0020-autoregulation-magnitudes-are-permanent-conventions.md), 2026-08-09) — graduated from IB-029. **Defaults are permanent, not a calibration backlog:** no self-tuning (no ground truth to fit — the only observable is next-session RPE, which `autoAdjust` already closes; ~2 kg-bearing points/week ≈ 20 per cycle; a fitted constant *reads* as earned while being less inspectable, worsening the over-trust harm). One posture for all six, with the **asymmetric containment** recorded as rationale (upward levers bounded by the +5% cap and suppressed on holds per ADR-0019; downward levers fail safe). The **sub-maximal sub-question is dissolved as a false premise** — ARC (`kind:'arc'`) and 60/60 (`kind:'circuit'`) fall through `prescribeLoadKg`'s `else return null` so the thermostat never touches them, every governed exercise sits at RPE ≥7, and tolerance-widening is already implemented as monotonic band width (1.5→1.0→0.5). **Permanent** — reopen only for new published research, not more logs. **Documents only:** reword the promise-comments; no constant moves, 0.5 kg step kept |
| KG-B20 | On a hold week (`holdProgression` set — deload / taper / pain-amber; retest unreachable) the readiness **"Push" (×1.05)** is applied *unconditionally* in `resolveEffective` (`js/loads.js:210-213`), **outside** the `holdProgression` gate that suppresses the +2.5% step — so a good-readiness check-in still raises finger/pull **kg +5%** on a recovery week, *larger* than the +2.5% the hold exists to stop, and on the highest-injury-risk tissue. Push is likeliest exactly on a deload (athlete freshest); worst case is a **pain-amber** day that slept well still getting +5% finger load. The other upward lever (+2.5%) is already held (KG-B14/B17); this is the second, ungated one | P1 | G3 | Resolved ([ADR-0019](adr/0019-hold-weeks-clamp-readiness-push.md), 2026-08-06) — graduated from IB-064. **Clamp readiness ≤1.0 on any hold** (`Math.min(readinessMultiplier, 1.0)` before `:210`, gated on `holdProgression` truthiness): upward Push held, downward Lighter/rest untouched. Corrective ±5% `autoAdjust` thermostat left running (completes the doctrine "holds suppress reward-upward levers, keep the corrective thermostat"). Emits a phase-neutral "Push held" trail line. Pain-amber-goes-*lighter* left out of scope (ADR-0014/IB-025). No schema/new-flag change; build via `/to-spec` pending |
| KG-B19 | A day with **no readiness check-in** was fabricated as `{3,3,3}` (avg 3.0 → **Lighter ×0.85**) in `js/views/today.js` — both at render (L494) and frozen into the day record on any save (L1078) — silently under-dosing *every* session (target ×0.85 + ≤8.5 RPE cap + kg ×0.85) for an athlete who merely forgot to check in, and polluting the `readinessTrend` baseline with a manufactured 3.0. Defeats `computeReadinessMultiplier(null)`'s own "no data → Normal" contract; the scale's neutral point is 4 (tests peg `{4,4,4}` as flat/normal), so a fabricated 3 invents a mildly-sub-par report. **Not G3** — subjective-wellness under-dosing (G1/G2); the real injury gates (pain→Silbernagel, density guard, layoff decay) are separate and fire regardless | P2 | G1 | Resolved ([ADR-0015 addendum](adr/0015-readiness-gating-climbing-sessions.md), 2026-08-06) — graduated from IB-058. No check-in → **Normal**: pass absent readiness straight to `computeReadinessMultiplier` (pills render unfilled), stop persisting `{3,3,3}`. Thresholds untouched — a *deliberate* straight-3 still reads Lighter (intended). No schema/load-chain change. **Built and closed 2026-08-15** (audit-loop pass 49) — shipped inline as a view-layer fix (`js/views/today.js` render + `getOrInitDay` persist), pinned by six `[IB-058]` cases; suite 292 passed / 0 failed. Two things the decision did not foresee, both handled at build time and recorded as a dated addendum note: a **pain-only** day is newly reachable once the persist half stops fabricating s/s/f, and `computeReadinessMultiplier` defaults each missing field to 3 — so it would have re-entered as a fabricated straight-3; and `js/views/log.js`'s `fmtReadiness` averaged *every* numeric key (the stored `multiplier` included), which a partial readiness object turns into a score the athlete never reported. The addendum's "no existing case asserts the old `{3,3,3}` behaviour" line was **falsified** — `[IB-041]` did, implicitly. See IB-058 |

---

## Lens C — Evidence gaps

Weaknesses in the evidence base itself.

| ID | Gap | Priority | Status |
|----|-----|----------|--------|
| KG-C1 | ~123 claims un-adjudicated; two whole subtopics unverified | P2 | Closed (2026-07-10) |
| KG-C2 | Macrocycle length has no RCT | P3 | Won't-fix |
| KG-C3 | Deload cadence consensus-only | P3 | Won't-fix |
| KG-C4 | Half-crimp dominance not externally replicated | P3 | Accepted |
| KG-C5 | Hörst vs Lattice PE contradiction unreconciled | P2 | Resolved (ADR-0006) |
| KG-C6 | Benchmark-vs-grade norms provenance | P2 | Closed (2026-07-08) |
| KG-C7 | Readiness/RPE multipliers are app inventions | P3 | Closed (disclosed 2026-07-23) |
| KG-C8 | Refuted-claim dependency check | P3 | Closed (audit 2026-07-23) |

Full detail for every resolved row above is in [the archive, Lens C](knowledge-gaps-archive.md#lens-c). No Lens C gap remains open.

---

## Lens D — Feature gaps

App capabilities blocked on the knowledge above. Each names its prerequisite; none should be built before it. **Every Lens D feature has shipped.**

| ID | Feature | Priority | Prereq |
|----|---------|----------|--------|
| KG-D1 | ~~Implement the adjudicated Peak in `js/program.js` (+ campus readiness gate)~~ **Closed 2026-07-02** with KG-B1 | P1 | KG-B1 decision |
| KG-D2 | ~~Limiter readout (read the 4 dead benchmark fields + norms table → "likely limiter" on Settings/Log)~~ **Closed 2026-07-17** with ADR-0011 (issue #50 — `js/limiter.js`, Profile-tab card) | P1 | KG-A1, KG-C6 |
| KG-D3 | ~~Missed-session detection + replan (shift/extend/compress; decay stale prev-actual seeds)~~ **Closed 2026-07-08** with KG-A3/ADR-0008 (shift/extend + decay shipped; "compress" deliberately left manual — see ADR) | P1 | KG-A3 rules |
| KG-D4 | ~~Peak-date-aware taper generator~~ **Closed 2026-07-04** with ADR-0007 (step cut + rest-pre-goal + `peakType`; progressive decay rejected by the ADR) | P2 | KG-A5 |
| KG-D5 | ~~Intra-phase progression engine (ARC ramp, PE rest-cuts, targets-hit → +2.5–10%)~~ **Closed 2026-07-14** with ADR-0009 (ARC ramp + targets-hit shipped; PE rest-cuts adjudicated as already satisfied by ADR-0006's goal-anchored window) | P2 | KG-A2, KG-B5 |
| KG-D6 | ~~Monitoring signals in the Log tab (readiness trend, RPE drift, retest trajectory)~~ **Closed 2026-07-17** with ADR-0014 (issue #52 — `js/monitoring.js`, Log-tab panel + Today banner) | P2 | KG-A4 |
| KG-D7 | ~~End-of-cycle review checklist (may be a doc, not code)~~ **Closed 2026-07-16** with [`end-of-cycle-review.md`](end-of-cycle-review.md) (issue [#43](https://github.com/slm37102/simple-climbing-training-planner/issues/43)) — automation (auto-detecting drift, auto-rotating protocols) remains its own P3 remainder, tracked back in KG-A8 | P3 | KG-A8 |
| KG-D8 | ~~Style-biased session text from `dominantStyle`/`dominantAngle`~~ **Closed 2026-07-16** with KG-A10 (issue #41 — `styleNote` anti-style cue on Base/Build boulder-flavor Thu/Sat) | P3 | KG-A10 |

Engineering-quality items (sync, a11y, PWA, refactors) are owned by [`improvement-backlog.md`](improvement-backlog.md) and deliberately excluded here.

---

## Deliberately out of scope

Multi-user / product features · AI-coach chat · wearables/HRV integration · nutrition planning · full ACWR/fatigue modeling (KG-A12) · in-app technique curriculum beyond drill-of-the-week text (KG-A9) · automated style programming beyond text bias (KG-A10) · evidence gaps that would require running trials (KG-C2/C3/C4).

---

## History

The prioritized shortlist that guided the first wave of work, the "Decided → shipped (2026-07-04)" record, and the complete dated maintenance log (every closure since 2026-07-02) all live in [`knowledge-gaps-archive.md`](knowledge-gaps-archive.md) — that file is the append-only record; this one stays a live snapshot of what's actually still open.
