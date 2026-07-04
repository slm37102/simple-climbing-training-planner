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
| KG-A2 | No intra-phase progressive overload | P1 | G1 | Open |
| KG-A3 | No missed-session replanning | P1 | G1 G2 G3 | Open |
| KG-A4 | No monitoring model | P1 | G3 G1 | Open |
| KG-A5 | Taper knowledge is a stub | P2 | G2 | Closed (ADR-0007, 2026-07-04) |
| KG-A6 | Power-endurance dosing unresolved | P2 | G2 G3 | Closed (ADR-0006, 2026-07-04) |
| KG-A7 | Injury-prevention dosing partial | P2 | G3 | Open |
| KG-A8 | No inter-cycle progression model | P2 | G1 | Open |
| KG-A9 | No technique/skill programming | P2 | G1 | Open |
| KG-A10 | Style individualization unused | P3 | G1 | Open |
| KG-A11 | No outdoor conversion | P3 | G2 | Won't-fix (in code) |
| KG-A12 | No cross-session fatigue model | P3 | G3 | Won't-fix (fold into A4) |

### KG-A1 — No limiter diagnosis (P1, G1)

**The app cannot tell whether fingers, pulling, endurance, or technique is holding the athlete back.** With only 3 sessions/week, training a non-limiter is the most expensive possible mistake for G1: a V6 climber failing pumpy 7a needs a different plan than one with weak fingers on V6 crimps. This requires benchmark-vs-grade norm tables (e.g. "expected max hang %BW at 7a") that exist nowhere in the repo.

- *Pointers:* `js/storage.js:38-41` — `sportGrade`, `boulderGrade`, `dominantStyle`, `dominantAngle` are stored but read by **no prescription path** (the 2026-07 onboarding wizard now *writes* a target grade into `boulderGrade`/`sportGrade`, but nothing consumes them); `js/loads.js:38-46` — only `maxHang20mm`/`pullup1RM` are ever consumed; [`research/verified-findings.md`](research/verified-findings.md) § General — the 20 mm *measurement* is validated, its *interpretation* is missing.
- *Verdict:* close — highest-leverage missing coach knowledge. Research task first (KG-C6), then KG-D2.

### KG-A2 — No intra-phase progressive overload (P1, G1)

**Every week of a phase prescribes the identical session.** An unchanging stimulus stops driving adaptation after ~2–3 weeks. Only the two weighted exercises auto-adjust (±5% off last RPE, `js/loads.js:22-27`); climbing volume, ARC duration, PE density, and limit-boulder difficulty never progress within a phase. On a 24-week cycle that means ~10 identical Base weeks.

- *Pointers:* `js/program.js` — `buildThuMain`/`buildSatMain` are static templates keyed only by (phase, flavor); the only week-level variation is the deload cut (`applyDeloadVolume`); verified-findings § Base (volume ramp then halve), § Strength (+2.5–10% when targets hit), § Power-endurance (rest cuts of 5 s/week).
- *Verdict:* close — write per-phase progression rules on paper first, then KG-D5.

### KG-A3 — No missed-session or life-interruption replanning (P1, G1+G2+G3)

**The plan is pure calendar math** — `Program.resolveDate` derives everything from the date; miss two weeks sick and the app acts as if the training happened. Hits all three goals: G2 (a hole in Build produces a mistimed taper), G3 (**load suggestions seed from previous-actual kg with no decay for elapsed time** — returning at full load after a layoff is a classic pulley-injury trigger, `js/loads.js:76-83`), G1 (lost adaptations untracked). Coach rules needed: miss ≤1 wk → resume; miss ≥2 wk in Base → extend Base/shift start; miss during Peak with a fixed comp date → decide which phase to sacrifice.

- *Pointers:* `js/program.js` — `resolveDate`/`effectiveStart`; no code path reads the log to detect absence.
- *Verdict:* close — high frequency in real life for a working adult training 3×/week. Feeds KG-D3.

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

- *Verdict:* close the dosing question (cheap); return-from-tweak = research-first, possibly a printed reference rather than app logic. **Note:** the un-adjudicated research batch contains a whole *"Finger/pulley injury prevention"* subtopic — see KG-C1.

### KG-A8 — No inter-cycle progression model (P2, G1)

**Nothing defines what changes in cycle N+1.** V5→V7 is a multi-cycle, 1–2+ year project; retests reset the kg math but the program itself is identical every cycle — same protocols, same edges, same session library. Needed: when to rotate protocols, when to shift phase ratios toward the evolving limiter, and when to ratchet Peak aggressiveness back up (the [training-philosophy open question](training-philosophy.md#peer-reviewed-support-and-gaps) — which becomes live exactly when the athlete succeeds at G1).

- *Verdict:* close as a written end-of-cycle review checklist first (KG-D7); automation is P3.

### KG-A9 — No technique/skill programming (P2, G1)

**"Technique" appears as labels, not a curriculum.** At V6→V7 with 3 years' experience, technique is a likely co-limiter (ties into KG-A1), and Hörst — one of the three declared influences — makes technique co-equal with strength. The app offers one optional Tuesday line ("footwork / silent feet / flagging") and session names like "Projecting / technique boulders" with no drill progression, no style rotation, no falling practice for the 7b lead goal.

- *Pointers:* `js/program.js` — `LIGHT_DAY`, `buildThuMain` base sessions.
- *Verdict:* partially close — a drills reference + rotating drill-of-the-week in session text is proportionate; a full in-app skill curriculum is out of scope.

### KG-A10 — Style/weakness individualization unused (P3, G1)

`dominantStyle`/`dominantAngle` are collected (defaults: crimp, slight-overhang) and ignored; a crimp-dominant athlete progresses fastest with anti-style exposure in Base, but the session library is identical for every profile. This is the actuation half of KG-A1.

- *Verdict:* close cheaply — bias session *text* by stored style ("include 2 anti-style problems"); full auto-programming out of scope.

### KG-A11 — Outdoor-vs-gym specificity (P3, G2) — **Won't-fix in code**

The plan assumes a gym; peaking for a *trip* needs outdoor mileage in Peak/Taper, rock-type specificity, skin management, and RCTM's performance-phase sequencing (powerful goals early, endurance goals later — already verified in-repo, § Peaking). Mitigation: a half-page "converting Peak/Taper weeks for a trip" note in a reference doc.

### KG-A12 — No cross-session fatigue model (P3, G3) — **Won't-fix as a model**

Mostly mitigated by the fixed Mon/Thu/Sat layout with built-in rest days. Residual risk ("Push"-readiness days stacking onto deep fatigue) is cheapest to handle as one guard-rail signal inside KG-A4, not an ACWR model.

---

## Lens B — Research-vs-app gaps

The app was built before the research; these are the places where its decisions contradict or ignore the verified findings.

| ID | Gap | Priority | Goals | Status |
|----|-----|----------|-------|--------|
| KG-B1 | Peak prescription conflict (ADR-0001 unimplemented) | **P1 — critical** | G3 | Closed (2026-07-02) |
| KG-B2 | Hangboard protocol identity/sequencing | P2 | G1 G3 | Closed (ADR-0005, 2026-07-04) |
| KG-B3 | Deload cadence 2:1 vs 3:1 | P2 | G1 G3 | Closed (ADR-0004, 2026-07-04) |
| KG-B4 | ARC under-dosed in hybrid mode | P2 | G1 | Open |
| KG-B5 | No "targets hit → progress" rule | P2 | G1 | Open |
| KG-B6 | Doc drift (stale deload rule etc.) | P2 | — | Closed (this commit) |

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

### KG-B5 — No "targets hit → progress" rule (P2, G1)

Research (§ Strength): progress load **+2.5–10%** (or smaller edge / fewer fingers) once all targets are hit with good form. The app only mirrors the last session ±5% off RPE (`js/loads.js:22-27`) — the loop can oscillate around a fixed load forever; nothing implements progressive overload.

- *Verdict:* close — small, well-specified rule; part of KG-D5.

### KG-B6 — Documented-knowledge drift (P2) — **Closed by this commit**

`README.md` and `training-plan.md` taught the *refuted* deload rule (intensity ×0.85 — exactly the policy [ADR-0003](adr/0003-deload-as-volume-cut.md) calls "the worst of both worlds"); `CONTEXT.md` had a duplicated stale Retest definition; `CLAUDE.md`/`.github/copilot-instructions.md` described a removed `isDeload` arg, dead `setPlanBenchmarks` archiving, and a stale cache version; `improvement-audit.md` listed findings as open that shipped in phases 1–4. All corrected in the same commit that adds this file. Stale docs are wrong coach knowledge lying around — kept closed here as a reminder of *why* doc drift matters.

---

## Lens C — Evidence gaps

Weaknesses in the evidence base itself.

| ID | Gap | Priority | Status |
|----|-----|----------|--------|
| KG-C1 | ~123 claims un-adjudicated; two whole subtopics unverified | P2 | Open (deferred) |
| KG-C2 | Macrocycle length has no RCT | P3 | Won't-fix |
| KG-C3 | Deload cadence consensus-only | P3 | Won't-fix |
| KG-C4 | Half-crimp dominance not externally replicated | P3 | Accepted |
| KG-C5 | Hörst vs Lattice PE contradiction unreconciled | P2 | Resolved (ADR-0006) |
| KG-C6 | Benchmark-vs-grade norms provenance | P2 | Open |
| KG-C7 | Readiness/RPE multipliers are app inventions | P3 | Open |
| KG-C8 | Refuted-claim dependency check | P3 | Open |

### KG-C1 — The research corpus is half-verified (P2) — verification deferred

~123 of ~300 gathered claims still have not gone through the 3-vote adversarial fact-check ([`research/README.md`](research/README.md) § Status; raw claims in `research/data/gathered-claims.json`). The 2026-07-02 decision round adjudicated 29 more (25 kept, 4 refuted) to settle KG-B2/B3/C5/A6/A5 — see the dated batch in `verified-findings.md`. **Still materially incomplete: two entire gathered subtopics remain unverified — *"Finger/pulley injury prevention, load mgmt & antagonists"* and *"Assessment, benchmarks & finger-strength metrics"* — exactly the topics G3 (KG-A7) and the limiter diagnosis (KG-A1) depend on.**

- *Resume path (owner's decision: verify later):* re-run the same 3-vote method over `gathered-claims.json`, prioritizing the two still-unverified subtopics (they gate KG-A1 and KG-A7). Append results to `verified-findings.md` as a dated batch.

### KG-C2 / KG-C3 / KG-C4 — Known consensus-only foundations (P3)

Already flagged in [`training-philosophy.md`](training-philosophy.md#peer-reviewed-support-and-gaps): no RCT compares macrocycle lengths in climbers (the 20-week double-block threshold is a heuristic, [ADR-0002](adr/0002-configurable-cycle-length.md)); no climber RCT on deload cadence; half-crimp dominance is a Lattice-internal finding. **Unfixable by us** — mitigation is monitoring (KG-A4) so this athlete's own response data accumulates.

### KG-C5 — The verified findings contradict each other on PE dosing (P2)

Hörst's ">2–4 weeks of PE → overtraining risk" warning (§ Peaking) vs Lattice's "8-week PE block, 2×/week" (§ Power-endurance) sit unreconciled in the same corpus. Most likely they describe different intensities/energy systems (anaerobic-lactic sharpening vs aerobic-power block), but that reading is currently nobody's recorded decision. Blocks KG-A6.

- *Verdict:* adjudicate in a short ADR.
- **RESOLVED 2026-07-02 → [ADR-0006](adr/0006-power-endurance-two-band-model.md).** The conflict is illusory: Hörst and Lattice describe two different energy-system bands (aerobic-power/capacity "engine", trainable 6–8 wks; anaerobic-lactic "peak", the last 2–4 wks only), and Lattice's 5s/wk density progression is the mechanism that shifts band 1 toward band 2 as the goal nears. Both frameworks agree. This taxonomy now drives the KG-A6 app model.

### KG-C6 — Norms data provenance (P2)

The benchmark-vs-grade tables KG-A1 needs rest on proprietary, self-reported data (Lattice member data; Hörst self-assessment tables). Gather what is public, record confidence per number.

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
| KG-D3 | Missed-session detection + replan (shift/extend/compress; decay stale prev-actual seeds) | P1 | KG-A3 rules |
| KG-D4 | ~~Peak-date-aware taper generator~~ **Closed 2026-07-04** with ADR-0007 (step cut + rest-pre-goal + `peakType`; progressive decay rejected by the ADR) | P2 | KG-A5 |
| KG-D5 | Intra-phase progression engine (ARC ramp, PE rest-cuts, targets-hit → +2.5–10%) | P2 | KG-A2, KG-B5 |
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
4. **KG-A1 + KG-C6** — limiter-diagnosis norms (biggest G1 lever).
5. **KG-A3 → KG-D3** — missed-session rules (protects all three goals).

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
- **2026-07-02** — **Decision round: KG-B2, KG-B3, KG-C5, KG-A6, KG-A5 decided** and locked as ADRs 0004–0007 (implementation deferred to the design phase). Backed by a targeted claim adjudication (29 gathered claims → 25 kept, 4 refuted; dated batch appended to `verified-findings.md`). Research was scoped strictly to what these decisions needed — the rest of the KG-C1 backlog stays deferred.
- **2026-07-04** — **ADRs 0004–0007 implemented; KG-B2, KG-B3, KG-A5, KG-A6 (and KG-D4) closed.** All four prescriptions now live in `js/program.js` with regression tests in `tests/index.html` (`[ADR-0004…0007]` cases; suite fully green). `settings.peakType` added (no schema bump). Owner chose immediate effect mid-cycle.
