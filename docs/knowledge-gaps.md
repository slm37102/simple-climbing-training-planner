# Knowledge gaps

What the planner **doesn't know yet**. The app was largely built *before* the research in [`research/`](research/README.md) was done, so this document also audits the app's training decisions against that (newer) evidence. Goals **G1** (progression to V7/7b), **G2** (peak for a date), **G3** (injury-free consistency) are defined in [`project-goals.md`](project-goals.md).

**How to read this doc**

- Four lenses: **A** — plan-making knowledge neither the docs nor the code have; **B** — places the app contradicts or ignores its own research; **C** — weaknesses in the evidence itself; **D** — app features blocked on the knowledge above.
- Every gap has a stable ID (`KG-A1`, …) so ADRs and commits can cite it (e.g. "closes KG-B1"). **This doc only carries the full write-up for gaps still Open/Researching.** Once a gap closes (or is ruled Won't-fix/Resolved/Accepted), its write-up moves to [`knowledge-gaps-archive.md`](knowledge-gaps-archive.md) under the same ID and this doc keeps just its one-line table row + a link — never delete an ID from either doc.
- **Priority:** P1 = gates a goal · P2 = meaningful · P3 = nice-to-have. **Status:** Open / Researching / Closed / Won't-fix.
- Entries contain *pointers, not quotations* — protocols live in [`training-philosophy.md`](training-philosophy.md), evidence in [`research/verified-findings.md`](research/verified-findings.md), code facts in the referenced files. All code facts below were verified against the current source (2026-07-02).
- As of 2026-07-23, **no** gap remains open. Everything ever tracked here has closed, been ruled won't-fix, or been accepted as a permanent limitation — see the archive for the full history. KG-A8 was the last, resolved 2026-07-23 (checklist + a cycle-end reminder nudge shipped; the auto-detect/auto-actuate half ruled Won't-fix — see the archive for why). (KG-A13 was mistakenly reopened by a 2026-07-16 doc-restructure commit that overwrote its closure — see the archive; it shipped and closed same-day.)

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

The app was built before the research; these are the places where its decisions contradict or ignore the verified findings. **Every Lens B gap is Closed** — full detail for all thirteen (KG-B1–B13) is in [the archive, Lens B](knowledge-gaps-archive.md#lens-b).

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

Engineering-quality items (sync, a11y, PWA, refactors) are owned by [`improvement-audit.md`](improvement-audit.md) and deliberately excluded here.

---

## Deliberately out of scope

Multi-user / product features · AI-coach chat · wearables/HRV integration · nutrition planning · full ACWR/fatigue modeling (KG-A12) · in-app technique curriculum beyond drill-of-the-week text (KG-A9) · automated style programming beyond text bias (KG-A10) · evidence gaps that would require running trials (KG-C2/C3/C4).

---

## History

The prioritized shortlist that guided the first wave of work, the "Decided → shipped (2026-07-04)" record, and the complete dated maintenance log (every closure since 2026-07-02) all live in [`knowledge-gaps-archive.md`](knowledge-gaps-archive.md) — that file is the append-only record; this one stays a live snapshot of what's actually still open.
