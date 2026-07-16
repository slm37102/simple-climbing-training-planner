# Knowledge gaps

What the planner **doesn't know yet**. The app was largely built *before* the research in [`research/`](research/README.md) was done, so this document also audits the app's training decisions against that (newer) evidence. Goals **G1** (progression to V7/7b), **G2** (peak for a date), **G3** (injury-free consistency) are defined in [`project-goals.md`](project-goals.md).

**How to read this doc**

- Four lenses: **A** — plan-making knowledge neither the docs nor the code have; **B** — places the app contradicts or ignores its own research; **C** — weaknesses in the evidence itself; **D** — app features blocked on the knowledge above.
- Every gap has a stable ID (`KG-A1`, …) so ADRs and commits can cite it (e.g. "closes KG-B1"). When a gap closes, set its status and link the closing ADR/commit — don't delete the entry.
- **Priority:** P1 = gates a goal · P2 = meaningful · P3 = nice-to-have. **Status:** Open / Researching / Closed / Won't-fix.
- Entries contain *pointers, not quotations* — protocols live in [`training-philosophy.md`](training-philosophy.md), evidence in [`research/verified-findings.md`](research/verified-findings.md), code facts in the referenced files. All code facts below were verified against the current source (2026-07-02).

---

## Lens A — Plan-making knowledge

What making a good climbing plan requires that neither the docs nor the code currently know.

| ID | Gap | Priority | Goals | Status |
|----|-----|----------|-------|--------|
| KG-A1 | No limiter diagnosis | P1 | G1 | Open |
| KG-A2 | No intra-phase progressive overload | P1 | G1 | Closed (ADR-0009, 2026-07-14) |
| KG-A3 | No missed-session replanning | P1 | G1 G2 G3 | Closed (ADR-0008, 2026-07-08) |
| KG-A4 | No monitoring model | P1 | G3 G1 | Open |
| KG-A5 | Taper knowledge is a stub | P2 | G2 | Closed (ADR-0007, 2026-07-04) |
| KG-A6 | Power-endurance dosing unresolved | P2 | G2 G3 | Closed (ADR-0006, 2026-07-04) |
| KG-A7 | Injury-prevention dosing partial | P2 | G3 | Open |
| KG-A8 | No inter-cycle progression model | P2 | G1 | Open |
| KG-A9 | No technique/skill programming | P2 | G1 | Closed (2026-07-14) |
| KG-A10 | Style individualization unused | P3 | G1 | Open |
| KG-A11 | No outdoor conversion | P3 | G2 | Won't-fix (in code) |
| KG-A12 | No cross-session fatigue model | P3 | G3 | Won't-fix (fold into A4) |
| KG-A13 | Comp peak type has no comp-format specificity | P3 | G2 | Open |
| KG-A14 | Readiness autoregulation never touches climbing sessions | P2 | G3 G1 | Open |

### KG-A1 — No limiter diagnosis (P1, G1)

**The app cannot tell whether fingers, pulling, endurance, or technique is holding the athlete back.** With only 3 sessions/week, training a non-limiter is the most expensive possible mistake for G1: a V6 climber failing pumpy 7a needs a different plan than one with weak fingers on V6 crimps. This requires benchmark-vs-grade norm tables (e.g. "expected max hang %BW at 7a") that exist nowhere in the repo.

- *Pointers:* `js/storage.js:38-41` — `sportGrade`, `boulderGrade`, `dominantStyle`, `dominantAngle` are stored but read by **no prescription path** (the 2026-07 onboarding wizard now *writes* a target grade into `boulderGrade`/`sportGrade`, but nothing consumes them); `js/loads.js:38-46` — only `maxHang20mm`/`pullup1RM` are ever consumed; [`research/verified-findings.md`](research/verified-findings.md) § General — the 20 mm *measurement* is validated, its *interpretation* is missing.
- *Verdict:* close — highest-leverage missing coach knowledge. Research task first (KG-C6), then KG-D2.
- **DECIDED 2026-07-15 → [ADR-0011](adr/0011-limiter-readout.md).** Static three-line Settings card, target-grade anchored, informational-only: fingers vs the Advanced-tier norm band, pull-ups vs the diminishing-returns ceiling only, and the "limiter is likely elsewhere (technique/endurance — unmeasured)" inference when strength sits at norm — with the ~17% R² caveat in the card copy per `benchmark-norms.md`'s scope recommendation. Closes with KG-D2 when the card ships.

### KG-A2 — No intra-phase progressive overload (P1, G1)

**Every week of a phase prescribes the identical session.** An unchanging stimulus stops driving adaptation after ~2–3 weeks. Only the two weighted exercises auto-adjust (±5% off last RPE, `js/loads.js:22-27`); climbing volume, ARC duration, PE density, and limit-boulder difficulty never progress within a phase. On a 24-week cycle that means ~10 identical Base weeks.

- *Pointers:* `js/program.js` — `buildThuMain`/`buildSatMain` are static templates keyed only by (phase, flavor); the only week-level variation is the deload cut (`applyDeloadVolume`); verified-findings § Base (volume ramp then halve), § Strength (+2.5–10% when targets hit), § Power-endurance (rest cuts of 5 s/week).
- *Verdict:* close — write per-phase progression rules on paper first, then KG-D5.
- **CLOSED 2026-07-14 → [ADR-0009](adr/0009-intra-phase-progression.md).** Two of the three cited rules shipped: Base aerobic sessions (ARC, route pyramid) now ramp `prescribedTarget` ×1.1 per hard Base week (cap ×1.3, `applyBaseVolumeRamp`/`hardPhasePos` in `js/program.js`), composing with the existing deload cut into the verified ramp-then-halve shape; loaded exercises progress +2.5% on targets-hit (see KG-B5 below). The third rule — PE density rest-cuts — was deliberately **not** extended beyond the final 4 weeks: ADR-0006's verified band-1 design says "little density change" in the engine block, so KG-D5's rest-cut item is considered already satisfied by ADR-0006. Limit-boulder volume progression rejected (ADR-0001 posture). Base *boulder* Saturdays stay unramped while KG-B12 is open — the `energySystem` gate picks up a corrected session automatically.

### KG-A3 — No missed-session or life-interruption replanning (P1, G1+G2+G3)

**The plan is pure calendar math** — `Program.resolveDate` derives everything from the date; miss two weeks sick and the app acts as if the training happened. Hits all three goals: G2 (a hole in Build produces a mistimed taper), G3 (**load suggestions seed from previous-actual kg with no decay for elapsed time** — returning at full load after a layoff is a classic pulley-injury trigger, `js/loads.js:76-83`), G1 (lost adaptations untracked). Coach rules needed: miss ≤1 wk → resume; miss ≥2 wk in Base → extend Base/shift start; miss during Peak with a fixed comp date → decide which phase to sacrifice.

- *Pointers:* `js/program.js` — `resolveDate`/`effectiveStart`; `js/replan.js` (new) now reads `plan.days` to detect absence.
- *Verdict:* close — high frequency in real life for a working adult training 3×/week. Feeds KG-D3.
- **CLOSED 2026-07-08 → [ADR-0008](adr/0008-missed-session-replanning.md).** Implemented the "≤1 wk / ≥2 wk" split mechanically: `Replan.detectGap` flags a gap once a main-slot (Mon/Thu/Sat) day has gone unlogged for ≥8 days (soft, informational) or ≥14 days (major); the Today-tab banner offers a whole-week "extend plan" lever (`settings.scheduleShiftDays`, `startDate` mode only) that pushes `effectiveStart` forward and re-snaps to Monday. The G3 load-seeding risk this gap named directly is fixed too: `Loads.layoffDecay` now cuts a stale previous-actual seed up to 15% by ~5 weeks off before it ever reaches `autoAdjust`. The third rule — "miss during Peak with a fixed comp date → decide which phase to sacrifice" — was deliberately **not** automated: in `compDate` mode the banner is informational only (goal date can't move), leaving that judgment call to the athlete via Profile, the same posture ADR-0007 took on taper length.

### KG-A4 — No monitoring model (P1, G3+G1)

**Nothing defines what signals say the plan is or isn't working.** The app logs readiness and RPE and retests once per Base block, but has no decision rules: no "readiness trending down 2 weeks → pull volume" (overreach flag), no "retest flat two cycles → change stimulus" (plateau), no finger/pulley pain check-in distinct from generic soreness. Monitoring is the cheapest coach function and it feeds every other gap.

- *Pointers:* `js/loads.js:10-18` — the readiness→multiplier mapping is the *only* signal consumer, and it looks at a single day; `js/views/log.js` charts display trends but interpret nothing; verified-findings § Deload (fitness-minus-fatigue rationale).
- *Verdict:* close — define 3–5 signals + thresholds + responses on paper first, then KG-D6.

### KG-A5 — Taper knowledge is a stub (P2, G2)

**G2 is literally "peak for a date" and the taper is the mechanism — but the app's taper is 1–2 fixed weeks of static light sessions.** Research already verified in-repo says: cut volume 60–90% while holding intensity, a *progressive* taper beats step/linear, length scales 4–28 days with event type, and strength is maintained with a touch every 5–10 days. None of that is modeled.

- *Pointers:* `js/program.js` — `buildPhasePattern` (taper = 1–2 weeks by formula) and the taper session templates; verified-findings § Peaking & tapering.
- *Verdict:* close — the evidence is already verified; this is a translation gap. Feeds KG-D4.
- **DECIDED 2026-07-02 → [ADR-0007](adr/0007-taper-hold-intensity-peaktype.md); IMPLEMENTED 2026-07-04.** Hold intensity, step-cut volume (`applyTaperVolume`), mandatory rest day before the goal (`rest-pre-goal` at `totalDays − 2`), + a `settings.peakType` length lever (comp 1 wk / trip 2 / project 2). The load-bearing correction was removing the intensity drop (shipped 2026-07-03); progressive decay was rejected (evidence is for ≥10-day tapers). `peakType` shipped **without** a schema bump — `defaultSettings()` shallow-merge backfills it per the CLAUDE.md convention.

### KG-A6 — Power-endurance dosing and placement unresolved (P2, G2+G3)

**The app's PE exposure matches neither of its two sources.** Hörst: dedicate the last 2–4 weeks to anaerobic-lactic work and warns longer PE risks overtraining (G3). Lattice: an 8-week PE block, 2×/week, with a mid-block rest week and rest-cuts in the final 4 weeks. In hybrid mode the app delivers 4×4s roughly every other week (flavor alternation, `js/program.js:113-115`) spread across Build+Peak with no density progression and no anchoring to the peak date — under-dosed by Lattice's standard, mis-sequenced by Hörst's.

- *Pointers:* `js/program.js` — `buildThuMain`/`buildSatMain` build-phase sport sessions; verified-findings § Power-endurance, § Peaking. The two sources may describe different energy systems — adjudicate KG-C5 first.
- *Verdict:* close after KG-C5.
- **DECIDED 2026-07-02 → [ADR-0006](adr/0006-power-endurance-two-band-model.md); IMPLEMENTED 2026-07-04.** KG-C5 taxonomy settled (two energy-system bands, not a conflict). Shipped: Build sport Thu = 60/60 threshold intervals RPE 7–8.5 (band 1); Peak sport Thu = 30/30 lactic RPE 9.5–10 (band 2, confined to the final ≤4 weeks); interval rest tightens 5s/week inside the final 4 weeks (`densityRest`, clamped ≥2:30); Sat triples/4×4 are single-system with the open-climb cool-down optional. ≤1 lactic session/wk holds by construction (band 2 lives on Thu only).

### KG-A7 — Injury-prevention dosing is partial (P2, G3)

**Antagonist/shoulder work runs 1×/week and is dropped entirely on deloads; no return-from-tweak protocol exists.** The warm-up itself is good (two-stage + shoulder band, `js/warmup.js`), but the antagonist block rides only on Monday (`js/program.js` — `buildMonHangboard`, `!isDeload` guard) while consensus dosing is 2–3×/week (Gilmore 2024, cited in training-philosophy). And nothing covers "finger tweaked but not injured" — the most common intermediate scenario — where the right answer is structured de-escalation, not binary rest.

- *Verdict:* close the dosing question (cheap); return-from-tweak = research-first, possibly a printed reference rather than app logic. **Note:** the research batch's *"Finger/pulley injury prevention"* subtopic is now fully adjudicated — see KG-C1 (closed 2026-07-10).

### KG-A8 — No inter-cycle progression model (P2, G1)

**Nothing defines what changes in cycle N+1.** V5→V7 is a multi-cycle, 1–2+ year project; retests reset the kg math but the program itself is identical every cycle — same protocols, same edges, same session library. Needed: when to rotate protocols, when to shift phase ratios toward the evolving limiter, and when to ratchet Peak aggressiveness back up (the [training-philosophy open question](training-philosophy.md#peer-reviewed-support-and-gaps) — which becomes live exactly when the athlete succeeds at G1).

**Adjacent (coach-review W13, 2026-07-14):** benchmarks also go stale *within* a cycle — the only retest closes Base (week 6 of 12), so Build gains are never captured, Peak's 85–95% rides week-6 numbers, and cycle N+1 starts from a 7+-week-old benchmark. **DECIDED 2026-07-15 → [ADR-0012](adr/0012-benchmark-refresh-slots.md):** both slots — an unconditional post-goal retest (out-of-cycle window, max-validity measurement feeding this gap's inter-cycle model) and a Build-Monday max-hang micro-retest gated on benchmarks being >4 weeks stale. W13 closes when the slots ship; this gap's inter-cycle *model* half stays open.

- *Verdict:* close as a written end-of-cycle review checklist first (KG-D7); automation is P3. The W13 micro-retest fork is a separate one-line decision that can land before the checklist.

### KG-A9 — No technique/skill programming (P2, G1)

**"Technique" appears as labels, not a curriculum.** At V6→V7 with 3 years' experience, technique is a likely co-limiter (ties into KG-A1), and Hörst — one of the three declared influences — makes technique co-equal with strength. The app offers one optional Tuesday line ("footwork / silent feet / flagging") and session names like "Projecting / technique boulders" with no drill progression, no style rotation, no falling practice for the 7b lead goal.

- *Pointers:* `js/program.js` — `LIGHT_DAY`, `buildThuMain` base sessions.
- *Verdict:* partially close — a drills reference + rotating drill-of-the-week in session text is proportionate; a full in-app skill curriculum is out of scope.
- **CLOSED 2026-07-14.** Added `SKILL_DRILLS` (`js/program.js`): 4 named, finger-neutral drills (silent feet, flagging, quiet hands, and falling practice — the last one directly closes the "no falling practice for the 7b lead goal" complaint) each with a focus description. The Tuesday light-day skill exercise now offers these as tappable pill options on the Today tab; picking one shows its focus text and marks the exercise done (`js/views/today.js`'s `drillPickerHtml`). Mirrored in `js/views/log.js`'s edit form as a `<select>`. Scope matches the stated verdict exactly — a drills reference the athlete picks from, not an adaptive rotation/progression engine or automated style-bias curriculum (that remains KG-A10, still open).
- **Addendum 2026-07-14.** Athlete asked to revisit this for more variety. Wayfinder [map #14](https://github.com/slm37102/simple-climbing-training-planner/issues/14) grew the catalog to **19 drills across 5 categories** (footwork/balance, body positioning, route-reading/beta, pacing/resting, mental/composure) and added a **second surface**: an optional drill picker at the end of the Thu/Sat warm-up checklist (narrowed to an 8-drill footwork+positioning subset, to avoid pre-session clutter). The original verdict boundary still holds — still pure manual pick, no progression/rotation/style-bias logic (KG-A10 stays separate and open). Locked as a spec, not yet implemented: [`docs/specs/technique-drill-library-spec.md`](specs/technique-drill-library-spec.md).

### KG-A10 — Style/weakness individualization unused (P3, G1)

`dominantStyle`/`dominantAngle` are collected (defaults: crimp, slight-overhang) and ignored; a crimp-dominant athlete progresses fastest with anti-style exposure in Base, but the session library is identical for every profile. This is the actuation half of KG-A1.

- *Verdict:* close cheaply — bias session *text* by stored style ("include 2 anti-style problems"); full auto-programming out of scope.

### KG-A11 — Outdoor-vs-gym specificity (P3, G2) — **Won't-fix in code**

The plan assumes a gym; peaking for a *trip* needs outdoor mileage in Peak/Taper, rock-type specificity, skin management, and RCTM's performance-phase sequencing (powerful goals early, endurance goals later — already verified in-repo, § Peaking). Mitigation: a half-page "converting Peak/Taper weeks for a trip" note in a reference doc.

*Mitigation delivered 2026-07-16:* [`trip-conversion-note.md`](trip-conversion-note.md) — half-page practical checklist covering session substitution, rock-type/style specificity, skin-management spacing, and RCTM's performance-phase sequencing (cited to `research/verified-findings.md`, "Peaking & tapering for a goal"). Status stays Won't-fix — this is a doc mitigation, not a code fix.

### KG-A12 — No cross-session fatigue model (P3, G3) — **Won't-fix as a model**

Mostly mitigated by the fixed Mon/Thu/Sat layout with built-in rest days. Residual risk ("Push"-readiness days stacking onto deep fatigue) is cheapest to handle as one guard-rail signal inside KG-A4, not an ACWR model.

### KG-A13 — Comp peak type has no comp-format specificity (P3, G2)

**`settings.peakType: 'comp'` changes only the taper length (1 wk vs 2).** Peak/Taper sessions are identical to a trip/project peak — project attempts and redpoint goes on known climbs — while a comp day demands the opposite profile: unseen problems, ~4-minute rounds, limited attempts, no beta rehearsal. Physically peaked but tactically unprepared. Surfaced by the 2026-07-14 external coaching review ([`coach-review.md`](coach-review.md), W8).

- *Pointers:* `js/program.js` — `taperWeeksFor` is the only `peakType` consumer; `buildThuMain`/`buildSatMain` peak/taper branches are peak-type-blind.
- *Verdict:* close cheaply if comps are ever a real goal — swap Peak Saturdays to a comp-simulation template (rounds of unseen flash-only problems) when `peakType === 'comp'`; otherwise leave open at P3.

### KG-A14 — Readiness autoregulation never touches climbing sessions (P2, G3+G1)

**The readiness check-in only modulates hangboard/pull-up kg — the highest-injury sessions get zero readiness modulation.** The readiness multiplier (×0.85 / ×1.0 / ×1.05 / suggest-rest) feeds only `Loads.resolveEffective`, which computes kg for `hangboard`/`pullup` kinds alone. The 30/30 lactic intervals at RPE 9.5–10, limit bouldering, and 4×4s — exactly where autoregulation matters most, because intensity is maximal and load is unquantified — run unmodified on a "Lighter" day, and "suggest rest" suppresses a kg number while leaving the full climbing session prescribed. Surfaced by the 2026-07-14 external coaching review ([`coach-review.md`](coach-review.md), W5, `[new]`) — opened late (2026-07-15): the review batch's ID pass counted five untracked findings, but W5 was a sixth. Distinct from KG-A4 (trend monitoring across days) and KG-A12 (won't-fix ACWR model) — this is the *scope* of the existing single-day readiness signal.

- *Pointers:* `js/loads.js` — `computeReadinessMultiplier` and its single consumer `resolveEffective`; `js/program.js` — `prescribeForContext` has no readiness input; coach direction: scale climbing `prescribedTarget` by the same multiplier + cap RPE (e.g. a 30/30 → 60/60 substitution rule), and surface a session *swap* on suggest-rest.
- *Verdict:* adjudicate the missing coach knowledge first (which substitutions/caps per session kind — a short design decision, same posture as KG-A4's "rules on paper first"), then extend the readiness path to climbing kinds. See [`specs/remaining-goal-gaps-spec.md`](specs/remaining-goal-gaps-spec.md) Group 2.

---

## Lens B — Research-vs-app gaps

The app was built before the research; these are the places where its decisions contradict or ignore the verified findings.

| ID | Gap | Priority | Goals | Status |
|----|-----|----------|-------|--------|
| KG-B1 | Peak prescription conflict (ADR-0001 unimplemented) | **P1 — critical** | G3 | Closed (2026-07-02) |
| KG-B2 | Hangboard protocol identity/sequencing | P2 | G1 G3 | Closed (ADR-0005, 2026-07-04) |
| KG-B3 | Deload cadence 2:1 vs 3:1 | P2 | G1 G3 | Closed (ADR-0004, 2026-07-04) |
| KG-B4 | ARC under-dosed in hybrid mode | P2 | G1 | Open |
| KG-B5 | No "targets hit → progress" rule | P2 | G1 | Closed (ADR-0009, 2026-07-14) |
| KG-B6 | Doc drift (stale deload rule etc.) | P2 | — | Closed (this commit) |
| KG-B7 | 4×4 boulder-triples grade too hard | P2 | G1 G3 | Closed (ADR-0006 addendum, implemented 2026-07-10) |
| KG-B8 | ARC "60–70% effort" contradicts its own RPE | P2 | G1 | Closed (implemented 2026-07-10) |
| KG-B9 | Base sport-Thursday pyramid runs too hot | P2 | G1 | Closed (implemented 2026-07-10) |
| KG-B10 | Retest week is a deload in name only | P2 | G2 G3 | Closed (implemented 2026-07-16) |
| KG-B11 | %-of-added-load convention distorts true intensity | P2 | G1 G3 | Open |
| KG-B12 | Base boulder-Saturday triples run Build-intensity (KG-B9's unfixed twin) | P2 | G1 G3 | Closed (implemented 2026-07-15) |
| KG-B13 | Taper volume is cut twice | P3 | G2 | Open |

### KG-B1 — Peak prescription conflict: ADR-0001 was accepted but never implemented (P1 — CRITICAL, G3)

**[ADR-0001](adr/0001-soften-peak-phase-for-intermediate-athlete.md) landed as a docs-only commit; `js/program.js` still contains the original, pre-ADR Peak on every point the ADR softened.** Verified against current code:

- Mon Peak (boulder focus) stacks **7-53 hangs @85–95%** + **weighted pull-ups @85–95%** (ADR cap: 85–90%) + **campus "1-5-9 / bumps"** in one session (`js/program.js:150-159`, `:186`, `:214-215`) — the ADR says "remove campus 1-5-9/bumps entirely" and "do not stack max stimuli in one session".
- Thu Peak campus rotation still includes "bumps / 1-5-9 / jump-catch" (`js/program.js:240-241`).
- Limit-boulder volume is the un-reduced original ("3–5 problems × 3–5 attempts × 2–3 sets") rather than the ADR's 1–3 sequences.

This is the single worst G3 item in the repo — Sjöman 2023 (the ADR's basis) found a significant injury association for exactly this athlete profile doing high-intensity fingerboard work — and it silently invalidates training-philosophy.md's claim that "the Peak protocol was softened".

- *Resolution path (per the owner):* **resolve with climbing-plan knowledge, not a blind hotfix** — re-adjudicate the correct Peak prescription for this athlete from the research corpus (the ADR's softening may itself need updating), record the decision (updated ADR-0001 or a new ADR), then implement it in `js/program.js`. Add the campus readiness gate (1-2-3-4-5 ladder without matching / 15–20 pull-ups — verified-findings § Power) as part of that decision. Feeds KG-D1.
- **CLOSED 2026-07-02.** Re-adjudication against the verified corpus confirmed all four softening decisions and added the campus readiness gate — see the [ADR-0001 addendum](adr/0001-soften-peak-phase-for-intermediate-athlete.md#addendum-2026-07-02--implementation-status--re-adjudication). Implemented in `js/program.js` with `[ADR-0001]` regression tests in `tests/index.html`; KG-D1 closed with it.

### KG-B2 — Hangboard protocol identity/sequencing: three-way disagreement (P2, G1+G3)

The philosophy doc, the code, and the verified research each say something different about Base/Build hangboarding:

| Source | Base | Build |
|--------|------|-------|
| `training-philosophy.md` phase table | Max hangs (half+open) ≤90% | 7-3 repeaters (Hörst) |
| `js/program.js` (actual) | **Min-edge bodyweight hangs** 12s, no % load | **Max-weight 10s** @80–90% |
| Verified research (López, § Strength) | — | MAW **before** MED in an 8-week cycle (weighted first, then min-edge — the code's sequence inverted) |

Peak (7-53) and Taper match across sources. Which Base/Build sequencing is right for this athlete needs adjudication; the philosophy table carries a divergence marker pointing here until then.

- *Verdict:* adjudicate (short ADR), then fix whichever side is wrong.
- **DECIDED 2026-07-02 → [ADR-0005](adr/0005-base-build-hangboard-protocols.md); IMPLEMENTED 2026-07-04.** Base = 7/3 repeaters (capacity) + intro weighted max-hangs; Build = weighted max-hangs at corrected dose (2×4 = 8 hangs, RPE 8–9, margin cue); **min-edge deleted entirely** (unprovenanced, trains to failure; its pro-min-edge rationale was refuted, claim 291), and the sport-flavor bonus repeater block deleted with it (repeaters are first-class in Base now). Strict López MAW→MED rejected (needs an mm-benchmark the app can't express; leaves no capacity stimulus).

### KG-B3 — Deload cadence: code is 2:1, doc says "3:1", Lattice's 3:1 is every 4th week (P2, G1+G3)

The code deloads every 3rd week — 2 hard : 1 deload (`js/program.js` — `(i+1)%3===0` in `buildPhasePattern`). `training-philosophy.md` labels this "3:1", but Lattice's published 3:1 = 3 hard weeks then a deload (every 4th week). The current cadence matches neither the label nor the source convention. More frequent deloads are the *conservative* direction (G3-friendly) but cost ~8% of hard training weeks (G1) — a deliberate choice should be recorded either way.

- *Verdict:* adjudicate 2:1 vs 3:1 for this athlete (Hörst: "every 3–4 weeks for the aging athlete", § Deload); update doc label + code together.
- **DECIDED 2026-07-02 → [ADR-0004](adr/0004-deload-cadence-3-to-1.md); IMPLEMENTED 2026-07-04** (`%3`→`%4` at all six loop sites in `buildPhasePattern`). Move to **3:1** (deload every 4th week). Matches Lattice/Hörst/the doc's own label; recovers +1 full-dose Build week (+50% strength-conversion stimulus) with zero added intensity risk — the correct lever for the localized under-dosing the total-dose check found. Deeper ~50% cut kept as a fast follow-up only if 3-week tolerance proves poor.

### KG-B4 — ARC/aerobic base under-dosed in hybrid mode (P2, G1)

Verified findings (§ Base): aerobic adaptation needs **≥6–8 weeks at 2–3 sessions/week** with a ramp-then-halve volume shape. The app schedules ARC only on sport-flavored Base Saturdays — in hybrid mode that's ~1 flat session per fortnight (flavor alternation `js/program.js:113-115`; `buildSatMain` base-sport). The 7b sport half of G1 is endurance-hungry.

- *Verdict:* close together with KG-A2's progression rules.
- **DECIDED 2026-07-15 → [ADR-0010](adr/0010-hybrid-within-week-mixing.md)** (the W4 hybrid-dilution adjudication). Within-week mixing, system-per-slot: Base Saturdays become *always* aerobic-capacity (flash pyramid ↔ ARC alternating by week) and even-week Thursdays keep the route pyramid, putting Base aerobic work at ≈1.5–2×/week instead of fortnightly. Closes when the ADR's implementation ships (spec → tickets via the roadmap map's assembly step).

### KG-B5 — No "targets hit → progress" rule (P2, G1)

Research (§ Strength): progress load **+2.5–10%** (or smaller edge / fewer fingers) once all targets are hit with good form. The app only mirrors the last session ±5% off RPE (`js/loads.js:22-27`) — the loop can oscillate around a fixed load forever; nothing implements progressive overload.

- *Verdict:* close — small, well-specified rule; part of KG-D5.
- **CLOSED 2026-07-14 → [ADR-0009](adr/0009-intra-phase-progression.md).** `Loads.resolveEffective` now progresses **+2.5%** (bottom of the verified band — tendon-conservative) when the previous same-session actual has in-range avg RPE *and* completed sets/reps ≥ today's prescription (`Loads.targetsHit`); the ±5% thermostat still wins at the extremes. A companion guardrail caps the total upward move at **+5%/session** (auto-adjust × readiness used to stack to +10.25%, above the verified band — coach-review W14). `today.js` passes `previousActualSets`/`previousActualReps` at both call sites.

### KG-B6 — Documented-knowledge drift (P2) — **Closed by this commit**

`README.md` and `training-plan.md` taught the *refuted* deload rule (intensity ×0.85 — exactly the policy [ADR-0003](adr/0003-deload-as-volume-cut.md) calls "the worst of both worlds"); `CONTEXT.md` had a duplicated stale Retest definition; `CLAUDE.md`/`.github/copilot-instructions.md` described a removed `isDeload` arg, dead `setPlanBenchmarks` archiving, and a stale cache version; `improvement-audit.md` listed findings as open that shipped in phases 1–4. All corrected in the same commit that adds this file. Stale docs are wrong coach knowledge lying around — kept closed here as a reminder of *why* doc drift matters.

### KG-B7 — 4×4 boulder-triples grade too hard (P2, G1+G3)

The boulder-triples 4×4 (`js/program.js`, `buildSatMain` boulder base/build) prescribes "1–2 grades below max"; ADR-0006 band 1 cites the verified target as "2–4 grades below max". At 1–2 below across 16 climbs the format overlaps the athlete's Thursday limit bouldering — it loses the distinct anaerobic-capacity/power-endurance adaptation the two-band model needs, and adds injury exposure for no new stimulus. A KG-B1-style decision-vs-code drift (the taxonomy is fine; the code diverges from it). Surfaced by the [climbing-kind exercise research](research/climbing-kind-exercise-prescriptions.md) and validated in [wayfinder map #8](https://github.com/slm37102/simple-climbing-training-planner/issues/8).

- **DECIDED 2026-07-10 → [ADR-0006 addendum](adr/0006-power-endurance-two-band-model.md#addendum-2026-07-10--4×4-boulder-triples-grade-correction-wayfinder-map-8--ticket-11); IMPLEMENTED 2026-07-10.** Target = **2–3 grades below max** (one notch harder than the published 2–4, biased for this athlete who gets limit work elsewhere, still clearly submaximal). RPE 8.5–9.5 and set structure unchanged. Shipped in `js/program.js` (`buildSatMain` boulder-triples line) alongside the [gym-ready prescription format spec](specs/gym-ready-prescription-format-spec.md).

### KG-B8 — ARC "60–70% effort" contradicts sources and its own RPE (P2, G1)

The base Saturday ARC line (`js/program.js`, `buildSatMain` sport base) reads "2 × 30 min @ **60–70% effort**, just below pump" at RPE 4–6. Published ARC intensity is 10–40% of max / 3–4 grades below limit ([research](research/climbing-kind-exercise-prescriptions.md), § ARC); "60–70% effort" is both above every published figure and internally inconsistent with the same line's RPE 4–6 — it reads as moderately-hard right next to a signal that says easy, which is exactly the gym-time confusion map #8 exists to remove. Distinct from KG-B4 (which is ARC *frequency* under-dosing; this is the *intensity number*).

- **DECIDED 2026-07-10 (map #8/#11); IMPLEMENTED 2026-07-10.** **Dropped the "% effort" figure entirely** — RPE 4–6 + "just below pump" already carry ARC's easy-sustained-pump intent precisely; the number was the thing actively causing gym-time confusion. Shipped in `js/program.js`'s `sat-arc` prescription alongside the [gym-ready prescription format spec](specs/gym-ready-prescription-format-spec.md).

### KG-B9 — Base sport-Thursday pyramid runs too hot (P2, G1)

The sport-flavor **base** Thursday route pyramid (`js/program.js`, `buildThuMain` sport base) is "4-3-2-1 routes back-to-back, 1 grade below redpoint" at **RPE 7.5–9**, energy-labelled "Aerobic power / Anaerobic capacity" — a build/PE intensity sitting in the base phase (whose target is capacity/aerobic base). If base Thursday already runs at RPE 9 near redpoint, there's no intensity headroom left for Build's 60/60 threshold work to be a step *up*, flattening the base→build progression. Lower-confidence than B7/B8 (rests on reading `CONTEXT.md`'s loose "capacity"; the "4-3-2-1 in base" framing was flagged as author synthesis with no published basis). Never ADR'd (unlike the two-band Build/Peak work).

- **DECIDED 2026-07-10 (map #8/#11); IMPLEMENTED 2026-07-10.** Capped base sport-Thursday intensity at **RPE 7–8** ("comfortably hard", aerobic-capacity), keeping the pyramid *structure*. Preserves a clean base→build intensity ramp and pulls the session back inside base's actual adaptation target. Shipped in `js/program.js`'s `thu-route-pyramid` prescription (RPE range + `energySystem` label corrected to "Aerobic capacity") alongside the [gym-ready prescription format spec](specs/gym-ready-prescription-format-spec.md).

*KG-B10–B13 were surfaced by the 2026-07-14 external coaching review ([`coach-review.md`](coach-review.md)) and the generated-schedule export appended to [`training-plan.md`](training-plan.md), which made the app's actual per-week output inspectable for the first time.*

### KG-B10 — Retest week is a deload in name only (P2, G2+G3)

**The retest exemption from the deload volume cut applies to the whole week, not just Monday.** `prescribeForContext` gates on the week-level flags (`if (deload && !retest)`), so in retest weeks Thursday and Saturday run at *full* volume while Monday adds three maximal tests (max hang, 1RM pull-up, 60-min max bouldering). Two consequences: benchmarks are tested on accumulated fatigue (systematically underestimating gains — and those numbers drive all Build/Peak percentages), and the ADR-0004 3:1 cadence silently breaks around the Base→Build boundary (no genuine unload between week 4 and the Build deload — or ever, at the default length, since Build is only 3 weeks). CLAUDE.md documents "retest weeks are exempt from the volume cut" as an invariant, but the *intent* was plausibly Monday-only (only Monday "has its own structure"). See coach-review W2/W3.

- *Pointers:* `js/program.js` — `prescribeForContext` (`deload && !retest`), `buildRetestSession`; `training-plan.md` week-6 rows in the generated schedule (no deload note on Thu/Sat). **Intent evidence:** `CONTEXT.md`'s glossary already describes the retest week as a deload ("a deload **drops prescribed volume ~40%** … The last Base deload is also a **retest** week", with Retest defined as "a deload *Monday session*") — the glossary documents the Monday-only-exemption intent; only the code exempts the whole week.
- *Verdict:* adjudicate intent, then likely scope the exemption to `mon-main` only (one-line change) — better test data *and* real recovery entering Build.
- *Priority note:* the coach review rates this **High** (W2, top-10 #5); it stays P2 here because P1 is reserved for "gates a goal" — read as top-of-P2, cheapest high-value fix in the ledger.
- **DECIDED 2026-07-16 (issue #35); IMPLEMENTED 2026-07-16.** Confirmed the Monday-only intent already on record (`CONTEXT.md`'s glossary, cited as intent evidence above): scoped the deload gate in `prescribeForContext` from `deload && !retest` to `deload && !(retest && slot === 'mon-main')`. Retest-week Thursday and Saturday sessions now take the same ~40% volume cut (`applyDeloadVolume`) as any other deload week; Monday still returns the unmodified retest session (`buildRetestSession`) since it runs the non-cuttable retest protocol. `[KG-B10]` regression tests added to `tests/index.html` (retest-week Thu/Sat cut, retest-week Monday unchanged, natural deload-week Thu unaffected). CLAUDE.md's deload invariant reworded to state the Monday-only scope; `sw.js` CACHE v31→v32; schedule regenerated (week-6 Thu/Sat rows now show `deload: volume −40%, intensity held`).

### KG-B11 — %-of-added-load convention distorts true intensity (P2, G1+G3)

**All hangboard/pull-up percentages scale the *added* benchmark load, but physiological intensity tracks *total system* load (bodyweight + added).** For a 70 kg athlete with a +20 kg max hang, Base's "intro 55–70%" hangs are +11–14 kg ≈ **90–93% of true max**; the advertised Base→Peak ramp of 55→95% added is really ~90→99% total, and it compresses further the weaker the fingers. Worse, for a **negative** benchmark (assisted hangs — `js/loads.js` explicitly allows `maxHang20mm` to be negative), the math inverts: 55–70% of −10 kg prescribes −5.5 to −7 kg, i.e. *less assistance than the athlete's tested max* — a supra-max load labelled "intro, low-end". The RPE ranges partially rescue execution, but the phase tables and ADR-0001's 90%-cap rationale reason about these numbers as if they were %1RM. See coach-review W12.

- *Pointers:* `js/loads.js` — `prescribeLoadKg` (`baseMax * pctRange[i]`, comment "may be negative"); `js/program.js` — `BASE_MAX_INTRO`/`HANGBOARD`/`pullupPrescription` percentage tables.
- *Verdict:* adjudicate the convention (total-load math vs. re-derived added-load percentages), and independently **guard the negative-benchmark branch now** (clamp to "never less assistance than benchmark") — that half is a safety bug, not a philosophy question.
- *Priority note:* the coach review rates this **High** for the system (W12, top-10 #6) but Medium for this specific athlete while benchmarks stay positive and RPE caps are obeyed; P2 here reflects the athlete-specific reading. The negative-benchmark clamp is fix-now regardless.
- **DECIDED 2026-07-15 → [ADR-0013](adr/0013-total-load-intensity-convention.md).** Total-load math (`pct × (bw + benchmark) − bw`), evidence-anchored band re-derivation (Base intro becomes a real ~80–85% total; Peak trims — conservative both ends), immediate mid-plan effect with tooltip disclosure. Exact digits come from a unit-audited spec pass (wayfinder ticket #46). The clamp half is separately ticketed (#36). Closes when both ship.
- **CLAMP HALF SHIPPED 2026-07-16 (issue #36, KG-B11a).** `js/loads.js` now clamps every computed negative-benchmark bound (both ends of `prescribeLoadKg`'s range, and the final `suggestedKg` in `resolveEffective`, via a shared `clampToBenchmark` helper) so no value can ever be less negative (harder / less-assisted) than the tested benchmark itself — the `−5.5 to −7kg from a −10kg benchmark` supra-max case above no longer occurs. Positive benchmarks are unaffected (verified with a regression test covering a PR exceeding a stale positive benchmark). `[KG-B11a]`-tagged tests added to `tests/index.html`. This gap stays **Open**: the broader total-load-vs-added-load convention question (ADR-0013's percentage re-derivation, ticket #46) is unshipped.

### KG-B12 — Base boulder-Saturday triples run Build-intensity (P2, G1+G3)

**`buildSatMain` serves the identical anaerobic-capacity 4×4 (RPE 8.5–9.5) for both Base and Build boulder weeks** — the exact phase-mismatch KG-B9 diagnosed and fixed for sport Thursdays was never audited on the boulder side. In hybrid Base, boulder-flavored weeks therefore contain *no* sub-threshold capacity session at all (Thu projecting runs RPE 7.5–9 too): the aerobic base the phase is named for exists only on sport weeks, and Build's Saturday is not a progression because it is literally the same session. Compounds KG-B4's ARC under-dosing. See coach-review W15.

- *Pointers:* `js/program.js` — `buildSatMain` boulder branch (base/build share `sat-boulder-triples`); KG-B9 above for the adjudicated precedent.
- *Verdict:* give Base boulder Saturdays their own session (boulder ARC / easy circuits / high-volume flash pyramids at RPE ≤7.5), keep triples as the Build session where the density progression already lives — same shape as the KG-B9 fix.
- **DECIDED 2026-07-15 (map #23/#34/#37); IMPLEMENTED 2026-07-15.** Ratified in #34: high-volume **flash pyramid** (over boulder-ARC and easy circuits) — ~15–20 problems well below max, pyramiding through 2–3 grades, RPE 6–7.5. Base boulder-flavor Saturdays now return `sat-flash-pyramid` (`energySystem: 'Aerobic capacity'`, `prescribedTarget: {value: 18, unit: 'problems'}`), which ADR-0009's Base volume ramp and the existing deload cut both pick up automatically via the `energySystem` gate — no new machinery needed. Build boulder-flavor Saturdays are unchanged (`sat-boulder-triples`, still the anaerobic-capacity 4×4, still where the density-rest progression lives). Shipped in `js/program.js` (`buildSatMain`), with `[KG-B12]`-tagged regression tests in `tests/index.html` and a closing cross-reference in [ADR-0009](adr/0009-intra-phase-progression.md#considered-and-rejected).

### KG-B13 — Taper volume is cut twice (P3, G2)

**Taper session templates already encode reduced volume, and `applyTaperVolume` then scales them again.** Taper pull-ups are authored as 2×2 but ship as 1×2 (`prescribedSets` 2 → floor(2×0.6) = 1); taper Thursday project goes are authored "2–3 quality goes" (`prescribedTarget` 2) but ship as target 1 — below what the template's own text argues for. Probably an unintended interaction from ADR-0007 reusing the deload machinery on top of already-tapered templates. Low stakes (direction is safe — taper errors toward less volume) but it misstates the plan and single-go redpoint Thursdays under-serve a trip/project peak. Visible in the generated week-12 schedule in `training-plan.md` ("sets today: 1 × 2", "target today: 1 goes (cut from 2)").

- *Pointers:* `js/program.js` — `applyTaperVolume` vs. the pre-reduced `HANGBOARD.taper` / taper `pullupPrescription` / `thu-projects` templates.
- *Verdict:* pick one layer — either author taper templates at full volume and let `applyTaperVolume` do the cut, or mark pre-tapered templates exempt. Also fix the "1 goes" pluralization while in there.

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
| KG-C7 | Readiness/RPE multipliers are app inventions | P3 | Open |
| KG-C8 | Refuted-claim dependency check | P3 | Open |

### KG-C1 — The research corpus is half-verified (P2) — **CLOSED 2026-07-10**

~123 of ~300 gathered claims had not gone through the 3-vote adversarial fact-check ([`research/README.md`](research/README.md) § Status; raw claims in `research/data/gathered-claims.json`). The 2026-07-02 decision round adjudicated 29 more (25 kept, 4 refuted) to settle KG-B2/B3/C5/A6/A5 — see the dated batch in `verified-findings.md`.

- **CLOSED 2026-07-10.** A separate pass ran every one of the ~94 remaining un-adjudicated claims (plus everything else still open in `data/gathered-claims.json`) to 100% completion, including both previously-unverified subtopics — *"Finger/pulley injury prevention, load mgmt & antagonists"* and *"Assessment, benchmarks & finger-strength metrics"* — the "Full-corpus completion" batch appended to `verified-findings.md`. Cross-checked against the ADR-cited claims from the 2026-07-02/07-08 batches first: 18 of 19 non-tangential citations agreed exactly, zero conflicts (the 19th was out of scope by design). Net: +132 additional claims confirmed, +5 additional refuted. **Running total: 332 confirmed, 16 refuted, 0 remaining un-adjudicated** (`research/README.md`). The corpus itself is no longer a gap; KG-A1 and KG-A7 remain open as their own *feature*-side gaps (in-app limiter diagnosis / injury-prevention dosing haven't been built), but they're no longer blocked on missing verification.

### KG-C2 / KG-C3 / KG-C4 — Known consensus-only foundations (P3)

Already flagged in [`training-philosophy.md`](training-philosophy.md#peer-reviewed-support-and-gaps): no RCT compares macrocycle lengths in climbers (the 20-week double-block threshold is a heuristic, [ADR-0002](adr/0002-configurable-cycle-length.md)); no climber RCT on deload cadence; half-crimp dominance is a Lattice-internal finding. **Unfixable by us** — mitigation is monitoring (KG-A4) so this athlete's own response data accumulates.

### KG-C5 — The verified findings contradict each other on PE dosing (P2)

Hörst's ">2–4 weeks of PE → overtraining risk" warning (§ Peaking) vs Lattice's "8-week PE block, 2×/week" (§ Power-endurance) sit unreconciled in the same corpus. Most likely they describe different intensities/energy systems (anaerobic-lactic sharpening vs aerobic-power block), but that reading is currently nobody's recorded decision. Blocks KG-A6.

- *Verdict:* adjudicate in a short ADR.
- **RESOLVED 2026-07-02 → [ADR-0006](adr/0006-power-endurance-two-band-model.md).** The conflict is illusory: Hörst and Lattice describe two different energy-system bands (aerobic-power/capacity "engine", trainable 6–8 wks; anaerobic-lactic "peak", the last 2–4 wks only), and Lattice's 5s/wk density progression is the mechanism that shifts band 1 toward band 2 as the goal nears. Both frameworks agree. This taxonomy now drives the KG-A6 app model.

### KG-C6 — Norms data provenance (P2)

The benchmark-vs-grade tables KG-A1 needs rest on proprietary, self-reported data (Lattice member data; Hörst self-assessment tables). Gather what is public, record confidence per number.

- **CLOSED 2026-07-08.** A 12-agent adversarial round (3 lenses × 4 source clusters) verified the corpus's "Assessment, benchmarks & finger-strength metrics" subtopic (29 claims → 25 kept, 4 refuted — dated batch in [`research/verified-findings.md`](research/verified-findings.md#2026-07-08-assessment-norms-batch)), plus two supplementary single-pass gathers (pull-up norms; independent finger-strength cross-checks). The most load-bearing finding was a **unit bug**: the widely-quoted Lattice grade table (V4=128% … V11=170%) is TOTAL load as %BW (bodyweight + added), not added load as the corpus originally logged it — this app's own `maxHang20mm`/`pullup1RM` fields store *added* kg, so the two conventions had to be reconciled before the numbers were usable. Synthesized into a grade-anchored norms table with confidence labels at [`benchmark-norms.md`](benchmark-norms.md), independently cross-validated by a 2025 peer-reviewed study (Buraas et al., EJAP) whose N=19 mean finger strength at ~7b+ redpoint (+44% BW added) lands within 2 points of Lattice's V7 anchor (+46%). The table also surfaces the sobering caveat that matters most for KG-D2: within this athlete's own Advanced tier, finger strength explains only ~17% of grade variance and pulling strength ~8–12% — the norms are a rough sanity check, not a precise diagnostic instrument. KG-A1 stays Open (the norms table doesn't diagnose anything by itself); KG-D2 is now unblocked but its scope should stay to the size discussed in `benchmark-norms.md`'s "Should this become a feature?" section.

### KG-C7 — The autoregulation constants are uncited (P3)

The readiness multipliers (×0.85/1.0/1.05/rest at bucket boundaries 2.5/3.5/4.5, `js/loads.js:10-18`) and the ±5% RPE auto-adjust (`js/loads.js:22-27`) were invented for this app — plausible, but cited nowhere, and wellness-questionnaire evidence in sport science is mixed. Document as "app convention, unvalidated"; tune from the athlete's own logs via KG-A4 rather than from literature.

### KG-C8 — Refuted-claim dependency check (P3)

Three claims were refuted (§ Refuted in verified-findings). Quick audit that nothing in-app leans on them — especially the refuted "4-month base / 2-month peak" claim vs how Base stretches in long single-block cycles below the 20-week threshold.

---

## Lens D — Feature gaps

App capabilities blocked on the knowledge above. Each names its prerequisite; none should be built before it.

| ID | Feature | Priority | Prereq |
|----|---------|----------|--------|
| KG-D1 | ~~Implement the adjudicated Peak in `js/program.js` (+ campus readiness gate)~~ **Closed 2026-07-02** with KG-B1 | P1 | KG-B1 decision |
| KG-D2 | Limiter readout (read the 4 dead benchmark fields + norms table → "likely limiter" on Settings/Log) | P1 | KG-A1, KG-C6 |
| KG-D3 | ~~Missed-session detection + replan (shift/extend/compress; decay stale prev-actual seeds)~~ **Closed 2026-07-08** with KG-A3/ADR-0008 (shift/extend + decay shipped; "compress" deliberately left manual — see ADR) | P1 | KG-A3 rules |
| KG-D4 | ~~Peak-date-aware taper generator~~ **Closed 2026-07-04** with ADR-0007 (step cut + rest-pre-goal + `peakType`; progressive decay rejected by the ADR) | P2 | KG-A5 |
| KG-D5 | ~~Intra-phase progression engine (ARC ramp, PE rest-cuts, targets-hit → +2.5–10%)~~ **Closed 2026-07-14** with ADR-0009 (ARC ramp + targets-hit shipped; PE rest-cuts adjudicated as already satisfied by ADR-0006's goal-anchored window) | P2 | KG-A2, KG-B5 |
| KG-D6 | Monitoring signals in the Log tab (readiness trend, RPE drift, retest trajectory) | P2 | KG-A4 |
| KG-D7 | End-of-cycle review checklist (may be a doc, not code) | P3 | KG-A8 |
| KG-D8 | Style-biased session text from `dominantStyle`/`dominantAngle` | P3 | KG-A10 |

Engineering-quality items (sync, a11y, PWA, refactors) are owned by [`improvement-audit.md`](improvement-audit.md) and deliberately excluded here.

---

## The shortlist

If only five things get done, in this order:

1. **KG-B1 → KG-D1** — adjudicate and implement the Peak prescription (G3) — *done 2026-07-02*.
2. **KG-B6** — doc drift — *done 2026-07-02*.
3. **KG-B2/B3/C5/A6/A5** — the four prescription decisions — *adjudicated & locked as ADRs 0004–0007, 2026-07-02; implemented in `js/program.js` 2026-07-04*.
4. **KG-A1 + KG-C6** — limiter-diagnosis norms (biggest G1 lever) — *KG-C6 done 2026-07-08; KG-A1/KG-D2 (the in-app readout) deliberately left small-scope, see `benchmark-norms.md`*.
5. **KG-A3 → KG-D3** — missed-session rules (protects all three goals) — *done 2026-07-08 (ADR-0008)*.

## Decided → shipped (2026-07-04)

All four ADRs are now in code (this section stays as the record that nothing went silently unimplemented — the ADR-0001 lesson). The owner chose **immediate effect** mid-cycle: the only live disruption is the wk3 deload shifting to wk4, in exchange for deleting the min-edge injury exposure for the remaining weeks. Already-logged days keep their stored data untouched.

- [x] **ADR-0004 (shipped 2026-07-04)** — deload cadence `%3`→`%4` (6 loop sites in `buildPhasePattern`) + tests + doc label.
- [x] **ADR-0005 (shipped 2026-07-04)** — Base repeaters+intro-maxhang, Build corrected max-hang dose (2×4 @ RPE 8–9), min-edge and the sport-flavor bonus repeaters deleted + tests + philosophy table.
- [x] **ADR-0006 (shipped 2026-07-04)** — PE two-band model: Build sport Thu 60/60 threshold, Peak sport Thu 30/30 lactic, 5s/wk density rest cuts inside the final 4 weeks, single-system Sat sessions.
- [x] **ADR-0007 (intensity fix shipped 2026-07-03; remainder 2026-07-04)** — taper holds near-peak load% with a step volume cut (`applyTaperVolume` + `taperNote`), forced rest day before the goal (`rest-pre-goal`), and the `settings.peakType` taper-length lever (comp/trip/project — onboarding wizard + Profile edit; no schema bump, `defaultSettings()` backfills).

## Deliberately out of scope

Multi-user / product features · AI-coach chat · wearables/HRV integration · nutrition planning · full ACWR/fatigue modeling (KG-A12) · in-app technique curriculum beyond drill-of-the-week text (KG-A9) · automated style programming beyond text bias (KG-A10) · evidence gaps that would require running trials (KG-C2/C3/C4).

## Maintenance log

- **2026-07-02** — Document created from a goal interview + a 5-agent verification of every code/doc claim against the current source. KG-B6 closed in the same commit (stale-doc corrections + folder restructure).
- **2026-07-02** — **KG-B1 + KG-D1 closed.** Peak prescription re-adjudicated against the verified corpus (all four ADR-0001 decisions confirmed; campus readiness gate added) and implemented in `js/program.js` with `[ADR-0001]` regression tests. See the ADR-0001 addendum.
- **2026-07-02** — **Decision round: KG-B2, KG-B3, KG-C5, KG-A6, KG-A5 decided** and locked as ADRs 0004–0007 (implementation deferred to the design phase). Backed by a targeted claim adjudication (29 gathered claims → 25 kept, 4 refuted; dated batch appended to `verified-findings.md`). Research was scoped strictly to what these decisions needed — the rest of the KG-C1 backlog stayed deferred at the time (closed 2026-07-10, see below).
- **2026-07-04** — **ADRs 0004–0007 implemented; KG-B2, KG-B3, KG-A5, KG-A6 (and KG-D4) closed.** All four prescriptions now live in `js/program.js` with regression tests in `tests/index.html` (`[ADR-0004…0007]` cases; suite fully green). `settings.peakType` added (no schema bump). Owner chose immediate effect mid-cycle.
- **2026-07-08** — **KG-C6 closed.** 12-agent adversarial verification (3 lenses × 4 source clusters) of the corpus's assessment/benchmarks subtopic (29 claims → 25 kept, 4 refuted; dated batch in `research/verified-findings.md`), plus two supplementary gathers, produced a grade-anchored finger/pulling-strength norms table with confidence labels at `benchmark-norms.md`. Caught and corrected a total-load-vs-added-load unit bug in a widely-quoted Lattice benchmark table before it could propagate into the app. KG-A1/KG-D2 remain open but are now unblocked, with an explicit scope recommendation to keep any in-app readout small given the tier's weak R² (~17% finger, ~8–12% pulling).
- **2026-07-08** — **KG-A3 + KG-D3 closed → [ADR-0008](adr/0008-missed-session-replanning.md).** New `js/replan.js` (`Replan.detectGap`) flags a missed-session gap once a main-slot day goes unlogged ≥8 days (soft/informational) or ≥14 days (major); the Today-tab banner offers a whole-week "extend plan" lever in `startDate` mode (`settings.scheduleShiftDays`, re-snapped to Monday) and stays informational-only in `compDate` mode, per the ADR's decision to keep "which phase to sacrifice" a human call. `Loads.layoffDecay` closes the G3 risk KG-A3 named directly: a stale previous-actual seed now decays up to 15% by ~5 weeks off before `autoAdjust` runs. `[ADR-0008]` regression tests added to `tests/index.html`; `sw.js` `SHELL`/`CACHE` updated for the new module.
- **2026-07-10** — **KG-B7, KG-B8, KG-B9 closed** — [wayfinder map #8](https://github.com/slm37102/simple-climbing-training-planner/issues/8) (research → phase-placement validation → adjudication → [gym-ready prescription format spec](specs/gym-ready-prescription-format-spec.md)) implemented in `js/program.js`: every climbing-kind exercise (`boulder`/`route`/`circuit`/`arc`/`open-climb`/`limit-boulder`/`campus`) now carries a structured `prescribedTarget: {value, unit}` alongside its existing free text, rendered as a concrete Today-tab target + per-kind how-to (`js/exercise-inputs.js`'s `howto()`); deload/taper scale the target to a real integer (count: floor×0.6 min 1; duration: round-to-5) instead of the old "drop ~40% volume" text suffix — closing the app's original vagueness complaint. The three adjudicated corrections shipped alongside: 4×4 grade → "2–3 below max" (KG-B7, ADR-0006 addendum), ARC "% effort" figure dropped (KG-B8), base route-pyramid RPE capped 7–8 + energySystem relabelled (KG-B9). `[Gym-ready]` regression tests added to `tests/index.html`; `sw.js` `CACHE` bumped.
- **2026-07-10** — **KG-C1 closed.** A separate verification pass ran every one of the ~94 remaining un-adjudicated claims in `research/data/gathered-claims.json` to 100% completion, including both previously-unverified subtopics (finger/pulley injury prevention; assessment & benchmark metrics) — the "Full-corpus completion" batch in `research/verified-findings.md`. Cross-checked against the ADR-0004–0007-cited claims first: 18/19 non-tangential citations agreed exactly, zero conflicts. Net +132 confirmed, +5 refuted. Running total: 332 confirmed, 16 refuted, 0 remaining un-adjudicated (`research/README.md`). KG-A1/KG-A7 remain open as feature-side gaps but are no longer blocked on missing verification.
- **2026-07-14** — Follow-up bug sweep on the gym-ready work (rest-time audit across every exercise; hangboard/pull-up `rest` field was captured but never rendered; pull-up's RPE target used the field name `rpe` instead of `rpeRange`, silently breaking both its display and `Loads.autoAdjust`; antagonist-block accessories and the retest max-effort tests had no rest guidance at all) plus a `.howto` spacing fix and **KG-A9 closed** (Tuesday skill-drill picker — see above). Discovered and fixed along the way: `js/views/today.js`'s `getOrInitDay()` never persisted `kind`/`optional`/`drills`/`prescribedTarget` onto a day's stored exercises, so `js/views/log.js`'s edit form (which reads only the stored day, never a live `Program` session) always fell back to the generic sets+reps+rpe inputs regardless of the real exercise kind — e.g. hangboard/pull-up entries lost their `kg` field entirely when edited via the Log tab. Fixed for all exercises going forward (existing already-logged days are not retroactively migrated). 101/101 tests passing.
- **2026-07-14** — **KG-A2 + KG-B5 + KG-D5 closed → [ADR-0009](adr/0009-intra-phase-progression.md)** (the coaching review's single Critical item). Targets-hit → +2.5% load progression with a +5%/session upward cap (`js/loads.js`); Base aerobic volume ramp ×1.1/hard week, cap ×1.3, deload/retest-exempt so it composes with the deload cut into the verified ramp-then-halve shape (`js/program.js` — `applyBaseVolumeRamp`, `hardPhasePos`; `resolveDate` now carries `peakType` on its ctx). Today tab renders a "Ramped target ↑ from N" callout and shares the header note slot across deload/taper/ramp (the taperNote had silently never rendered there). PE rest-cut extension and limit-boulder volume progression deliberately rejected — see the ADR. 8 `[ADR-0009]` tests added (114/114 green); `sw.js` CACHE v29→v30; schedule regenerated via the newly checked-in `tools/generate-schedule.mjs`.
- **2026-07-14** — **KG-A13, KG-B10–B13 opened** from the external coaching review ([`coach-review.md`](coach-review.md)) + the generated 12-week schedule export appended to [`training-plan.md`](training-plan.md) (built by running `Program.build` for every day of a default hybrid cycle — the retest-week exemption scope, taper double-cut, and Base-Saturday intensity were all invisible until the app's real output sat next to the hand-written tables). Review cross-checked against this doc first: its Critical/High items confirm the priority of the already-open KG-A2/B5, KG-B4, KG-A1/D2, KG-A4, and KG-A7 rather than duplicating them; only the five genuinely untracked findings got new IDs. The KG-B11 negative-benchmark guard is flagged as a fix-now safety bug independent of the convention adjudication.
- **2026-07-14** — **KG-A9 addendum spec locked** — wayfinder [map #14](https://github.com/slm37102/simple-climbing-training-planner/issues/14) (research → drill-list grilling → schema/data-model grilling → UI prototype → this Log-tab-parity + spec-assembly ticket) produced [`docs/specs/technique-drill-library-spec.md`](specs/technique-drill-library-spec.md): grows `SKILL_DRILLS` from 4 to 19 drills across 5 categories (new `js/drills.js` catalog), adds a category-chip-filtered Tuesday picker, and a second surface — an 8-drill footwork+positioning picker at the end of the Thu/Sat warm-up checklist (new `dayLog.warmupDrill` field, no schema bump). Spec only — not yet implemented.
- **2026-07-15** — **KG-B11 convention decided → [ADR-0013](adr/0013-total-load-intensity-convention.md)** (wayfinder ticket #32). Total-load intensity math, evidence-anchored bands, immediate effect; band digits via a unit-audited spec pass (ticket #46).
- **2026-07-15** — **W13 benchmark staleness decided → [ADR-0012](adr/0012-benchmark-refresh-slots.md)** (wayfinder ticket #31). Both refresh slots: unconditional post-goal retest + staleness-gated (>4 wk) Build-Monday max-hang micro-retest. Owner chose "both" over the ticket's either/or.
- **2026-07-15** — **KG-A1 limiter readout decided → [ADR-0011](adr/0011-limiter-readout.md)** (wayfinder ticket #29). Three-line static Settings card, target-grade anchored, informational-only, R² caveat in-copy; actuation deliberately left to KG-A8. KG-A1/KG-D2 close when the card ships.
- **2026-07-15** — **W4 hybrid dilution decided → [ADR-0010](adr/0010-hybrid-within-week-mixing.md)** (wayfinder [map #22](https://github.com/slm37102/simple-climbing-training-planner/issues/22), ticket #24). Within-week mixing over per-cycle focus: energy system fixed per slot, format alternates by week (Base Sat always aerobic; Build Thu always limit, Build Sat always PE with the 60/60 moving Thu→Sat). Scope: Base+Build only; campus stays fortnightly (G3). KG-B4 is structurally addressed by the same decision (see its entry); both close at implementation. Group 1 of the roadmap was ratified (#34) and cut into implementation tickets #35–#44 (#23) in the same wayfinder push.
- **2026-07-15** — **KG-A14 opened; coach-review bookkeeping corrected.** A cross-document audit of the 2026-07-14 review intake found the "five genuinely untracked findings" count was short: the review marks *seven* findings `[new]`, and two never got a home. **W5** (readiness never touches climbing sessions) is now KG-A14; the **goal-day rendering bug** (§11 cosmetic — comp day renders as "Optional: easy open climb or rest") went to `improvement-audit.md` as **U9** (engineering/UX, per the doc split). Also: KG-A8 gained the W13 mid-cycle-benchmark-staleness note (micro-retest fork, decision pending); KG-B10's pointers gained the `CONTEXT.md` glossary as Monday-only-exemption intent evidence; KG-B10/KG-B11 gained priority notes reconciling their P2 with the coach's High ratings. Same audit produced the draft roadmap [`specs/remaining-goal-gaps-spec.md`](specs/remaining-goal-gaps-spec.md), which organizes every open Lens A/B gap + the untracked review findings by goal (10 spec-ready items with recorded verdicts; 7 needing an ADR/mini-spec first). Roadmap is Draft — not locked, no tickets cut yet.
- **2026-07-15** — **KG-B12 closed** (wayfinder ticket #37, cut from map #23, session choice ratified in #34). Base boulder-flavor Saturdays now get their own session — a high-volume flash pyramid (`sat-flash-pyramid`, ~15–20 problems, RPE 6–7.5, `energySystem: 'Aerobic capacity'`) — instead of sharing the anaerobic-capacity 4×4 triples with Build; Build boulder-Saturdays keep the unchanged `sat-boulder-triples`. The new `energySystem` label lets ADR-0009's Base volume ramp and the existing deload cut both pick the session up automatically, no new machinery needed. `[KG-B12]` regression tests added to `tests/index.html` (118/118 green); `sw.js` CACHE v30→v31; schedule regenerated; ADR-0009 cross-referenced.
- **2026-07-16** — **KG-B10 closed** (issue #35). Scoped the retest-week deload exemption to Monday only — `prescribeForContext`'s gate changed from `deload && !retest` to `deload && !(retest && slot === 'mon-main')` — so retest-week Thu/Sat sessions now take the same ~40% volume cut as any other deload week, while Monday still runs the unmodified retest protocol. Confirms the Monday-only intent already recorded in `CONTEXT.md`'s glossary. `[KG-B10]` regression tests added to `tests/index.html` (122/122 green); CLAUDE.md's deload invariant reworded to state the Monday-only scope; `sw.js` CACHE v31→v32; schedule regenerated (week-6 Thu/Sat rows now show the deload cut).
- **2026-07-16** — **KG-B11's negative-benchmark safety clamp shipped (issue #36, KG-B11a)** — the fix-now half flagged since 2026-07-14, independent of ADR-0013's broader %-of-added-load convention adjudication (which stays open). `js/loads.js` adds a shared `clampToBenchmark(value, baseMax)` helper (no-op for positive `baseMax`) applied to both bounds in `prescribeLoadKg`'s computed range (`baseMax` now threaded through in the returned object) and to the final `suggestedKg` in `resolveEffective`, so no negative-benchmark prescription — initial range or post-progression — can ever land harder (less-assisted) than the athlete's tested max; the clamp logs a `reason[]` entry only when it actually changes the value. `[KG-B11a]` regression tests added to `tests/index.html` (126/126 green), including a positive-benchmark PR case proving the clamp is a true no-op there. `sw.js` CACHE v32→v33.
- **2026-07-16** — **KG-A11 mitigated (doc-only, issue #44).** Added [`trip-conversion-note.md`](trip-conversion-note.md), a half-page checklist for converting Peak/Taper weeks to an outdoor-trip goal (session substitution, rock-type/style bias, skin-management spacing, and RCTM's powerful-goals-early/endurance-goals-later performance-phase sequencing, cited to `research/verified-findings.md`). Status stays Won't-fix — this closes the gap's documentation mitigation, not the code gap itself.
