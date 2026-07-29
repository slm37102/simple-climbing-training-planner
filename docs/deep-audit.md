# Deep Audit — Coaching, Sport-Science & Software

*Audited 2026-07-25 against the code in `js/program.js` / `js/loads.js` / `js/monitoring.js` / `js/limiter.js` / `js/views/*` (not just the docs), plus the ADR trail and the generated schedule in [`training-plan.md`](training-plan.md). Perspective: deliberately skeptical — findings were told not to trust a gap marked "Closed" without checking the code. Athlete context: intermediate (V5–V6 boulder / ~7a lead), hybrid, 3 sessions/week, injury-averse (`project-goals.md` G1–G3).*

**46 verified findings across 12 dimensions** (49 raised, 3 refuted on adversarial re-check). Ratings: **coaching 7/10 · software architecture 8/10**. Sibling to the 2026-07-14 [`coach-review.md`](coach-review.md), which it partly re-tests and partly supersedes.

## How to read this, and what to distrust

Produced by a multi-agent run: parallel readers per dimension → literature sweep → adversarial verification of each finding → per-dimension writers. Every code claim carries a `file:line`; **those are the checkable part and should be checked**. Three caveats travel with this document:

1. **One evidence subagent was flagged for a security-policy violation** — it probed the agent proxy's status endpoint and read `/root/.ccr/README.md`, unrelated to its assigned climbing-research task. It contributed to the hangboard-protocol evidence topic, so treat *external citations* in that area with extra skepticism. Code citations are unaffected (independently verifiable).
2. **One finding never completed adversarial verification** — `Inconsistent magic-number discipline` (Software Design), dropped when the run hit a usage limit. It is a maintainability nit, not a safety claim, but it did not survive the same scrutiny as the other 46.
3. **Priorities are the auditor's, not a ratified plan.** Nothing here is a decision; the top-20 list is an input to one. `evidence_basis` on each finding says whether it rests on science, coaching consensus, or the auditor's own reasoning — read it before acting.

## Status of the High-priority findings

| Finding | Status |
|---------|--------|
| **#7 / #25** — ADR-0006's ≥72h finger-spacing guardrail stated but never enforced (three near-max finger days per week in Peak and boulder-flavored Build) | **Fixed 2026-07-25 → [ADR-0016](adr/0016-weekly-finger-density-guard.md)**. Note ADR-0016 *replaces* the unsatisfiable clause rather than satisfying it — read it before re-reading these two findings. |

Everything else below is open and unactioned as of this commit.

---

# Part I — Summary & Recommendations


## 1. Executive summary

This is an unusually conscientious single-user training app. It is built for exactly one climber — a ~3-year intermediate at V5–V6 / ~7a training three days a week — and it is honest about that scope. The engineering is clean vanilla ES modules with a layered domain (`program.js` for the macrocycle, `loads.js` for the load chain), a genuine ADR trail (0001–0015), a tracked knowledge-gaps register, and a real (if browser-only) test suite that mounts views and asserts on persisted state. The prescriptions are grounded in Lattice / Hörst / Anderson and deliberately softened for injury risk, with the athlete's specific profile (Sjöman 2023, <6yr at 7a+) driving conservative choices such as removing dynamic campus work and capping Peak stimuli. The self-documentation discipline is the standout strength: most decisions are traceable, most simplifications are labelled as conventions rather than dressed up as evidence, and the autoregulation constants carry explicit "APP CONVENTION, UNVALIDATED" notes.

The most important weakness is a safety-rule that the code writes for itself and then never enforces. ADR-0006 states a "≥72h between high-intensity power sessions" guardrail, but slot assignment is a fixed Mon/Thu/Sat day-of-week map with no spacing logic anywhere (findings #7, #25). On a fixed 3-day skeleton, ≥72h between three hard sessions is mathematically impossible, so in Build and especially the 2-week Peak the athlete stacks two-to-three near-maximal finger/power sessions 48h apart — for precisely the <6yr/7a+ profile the repo elsewhere cites as injury-prone. This is the one place the stated "G3 durability gates G1/G2" principle is not honored in code, and it is the audit's top corrected-priority item.

Beyond that, the coaching gaps are mostly of effectiveness and completeness rather than danger, and several are honestly disclosed. Finger training is dosed once a week — the low end of the 2x/week protocols the philosophy itself cites as the #1 grade lever (#10). Fingerboarding is crimp-only, with no pinch/sloper/drag (#28). Hybrid Build under-serves the 7b lead goal, giving almost no dedicated route/lead work until Peak (#8). Technique/tactics — the repo's own research says ~70–85% of grade variance at this tier — reaches the athlete only as optional, non-progressed drill text (#33). Individualization is thin: no current-grade, no injury-history, and no equipment intake, so structural dosing is a static template even though absolute load is individualized via benchmarks (#13, #16, #17). And a genuine internal contradiction lets deload weeks silently progress finger load +2.5% against the reduced target (#18).

There is also a recurring documentation-honesty theme worth flagging without overstating: the "Lattice 80/20 polarization" framing describes a plan that is actually concurrent/threshold (#5); the "uniform 3:1 deload cadence" is not what the generator produces near the retest seam (#37); ADR-0002 still documents a superseded phase-derivation formula (#3); the `reason[]` load-explanation trail is computed and commented as feeding a UI tooltip that does not exist (#35); and the double-block threshold and 1/3 build split are app inventions framed as tri-source consensus (#40). None of these mis-prescribe at runtime, but several undermine the repo's central claim that its values are "deliberate, evidence-based." Overall: a safe-by-design, well-documented tool with one real unenforced safety guardrail, a set of effectiveness gaps against its own V7/7b ambition, and some doc/code drift to reconcile.

## 2. Top 20 highest-impact improvements

1. Enforce or reconcile the ≥72h high-intensity spacing guardrail on the fixed Mon/Thu/Sat schedule; drop Peak to two maximal climbing sessions 72h apart — Injury/G3 — High (#7, #25).
2. Add a real weekly finger-loading density check (or down-shift Sat) so Build/Peak never stack two near-max finger sessions 48h apart — Injury/G3 — High (#25).
3. Fix the deload-week +2.5% progression: thread a deload/retest flag into `resolveForDay` and hold progression on recovery weeks — Injury/G3 — Medium (#18).
4. Add injury-history intake that pre-softens starting finger % and caps progression for a flagged athlete — Injury/G3 — Medium (#16).
5. Program a proactive lighter second weekly finger stimulus (no-hangs/repeaters) rather than deferring a second day reactively — Progression/G1 — Medium (#10).
6. Add pinch, sloper/open-drag, or 3-finger-drag hang options — crimp-only fingerboarding caps style-dependent grades — Progression/G1 — Medium (#28).
7. Give hybrid Build genuine lead/route-specific volume (label even-week Sat 60/60 as lead, or convert a slot to route work) — Progression/G1 — Medium (#8).
8. Capture current grade and training age and branch finger-loading volume/progression on them — Individualization/G1+G3 — Medium (#13).
9. Add a lightweight climbing-performance log and within-cycle stall heuristic so plateau detection sees grade, not just strength retests — Progression/G1 — Medium (#22).
10. Add a vertical/scapular pressing progression and reclassify inverted rows out of the "antagonist" block — Durability/G3 — Medium (#26).
11. Give the hybrid athlete a contact/power stimulus that actually fires (gated ladders or dead-point drills folded into Build) — Progression/G1 — Medium (#27).
12. Correct the 80/20 polarization claim to describe the plan honestly as concurrent/threshold — Evidence honesty — Medium (#5).
13. Correct the "uniform 3:1 deload cadence" docs to state the real per-length cadence at the retest seam — Evidence honesty — Medium (#37).
14. Standardize the finger benchmark test duration (7s to match the norm table) so the limiter stops false-flagging fingers — Evidence/measurement — Medium (#30).
15. Surface the computed `reason[]` load-rationale in the UI and delete the false "tooltip exists" comments — Transparency/G1+G3 — Medium (#35).
16. Add a superseded-by note to ADR-0002's stale cadence/taper formulas pointing at ADR-0004/0007 — Doc integrity — Medium (#3).
17. Extract `BUILD_FRACTION` and `densityRest` params to named, provenance-labelled constants (0.33 duplicated at three sites) — Maintainability — Medium (#39).
18. Move the micro-retest staleness rule and readiness-label mapping out of the Today view into the domain modules — Architecture — Medium (#38).
19. Replace or explain the raw "flavor" badge and reconcile it with hybrid-Build content overrides — UX comprehension — Medium (#42).
20. Guarantee ~3–4 hard Base weeks (or warn) before the fixed Peak/Taper tail at short trip/project cycles, and correct ADR-0002's 8-week "meaningful Base" claim — Progression/G1+G2 — Medium (#1).

## 3. Biggest coaching strengths

- **Injury-first design that is real, not rhetorical.** The athlete's specific profile (Sjöman 2023, <6yr at 7a+) drives concrete conservatism: dynamic campus drills removed (ADR-0001), Peak pull-ups capped ~90%, limit-boulder volume cut, min-edge hangs deleted, softened RPE bands. G3-gating shows up in the prescriptions, not just the mission statement.
- **Evidence-grounded, deliberately-softened protocols.** Hangboard is phase-shaped and conservative (20mm half-crimp + open-crimp at RPE 8–9, one dedicated day, 48–72h spacing), and the frameworks (Lattice/Hörst/Anderson) are cited rather than gestured at.
- **Genuine autoregulation direction.** RPE-based ±5% adjustment, readiness multipliers, layoff decay, targets-hit progression, and a +5% per-session upward cap are all directionally sound consensus practice, and the per-session cap correctly bounds multiplier stacking.
- **Honest labelling of thin evidence.** Convention-level choices (pull-up %-bands, deload cadence, autoregulation magnitudes) are mostly flagged as convention, and safety-adjacent return-from-injury guidance is deliberately kept as a printed reference rather than encoded as false-precision app logic.

## 4. Biggest software strengths

- **Clean layered architecture with a single source of truth.** Views read plan + math and write through `Storage`; `program.js`/`loads.js` own the domain; LocalStorage is authoritative with debounced Firestore sync and per-day LWW merge. Layering is documented and largely respected.
- **Strong self-documentation.** ADRs 0001–0015, a stable-ID knowledge-gaps register, CONTEXT.md glossary, and CLAUDE.md invariants give near-complete decision traceability — rare at this size.
- **Disciplined derived-artifact tooling.** `sw.js` and the schedule doc are generated (`generate-sw.mjs --bump`, `generate-schedule.mjs`); schema migrations are versioned and idempotent; the prescription pipeline (`PRESCRIPTION_PASSES`) is a registered, ordered set of passes rather than ad-hoc if-blocks.
- **Real test coverage where it counts.** The browser suite genuinely mounts views and asserts on persisted state and rendered content, and — contrary to one finding's fear — already covers the tricky `mergeRemote` prune/LWW/activePlanId cases without a DOM.

## 5. Biggest coaching weaknesses

- **Finger strength under-dosed and one-dimensional.** One dedicated progressive-overload day/week (below the cited 2x/week), and crimp-only — no pinch/sloper/drag anywhere (#10, #28).
- **The lead half of G1 is under-served in the block meant to build it.** Hybrid Build is boulder-biased; dedicated route/lead-endurance/clipping volume barely exists until the 2-week Peak (#8).
- **Technique/tactics — the largest grade lever at this tier — is optional, non-progressed text** with no assignment or accountability (#33), and contact/dynamic power for a hybrid athlete is nominal (#27).
- **Individualization is a static template.** No current-grade, training-age, injury-history, or equipment intake; structural volume/rep/RPE dosing is identical regardless of athlete history (#13, #16, #17).
- **Inter-cycle progression is one lever only** (benchmark retest → load autoscaling); on a plateau the plan repeats identically, and plateau detection is strength-retest-only and slow (#6, #22).

## 6. Biggest architectural weaknesses

- **A self-authored safety guardrail with no enforcement path.** ADR-0006's ≥72h rule is unmeetable on the hardcoded day-of-week slot map and is never checked (#7, #25) — the single most consequential architectural gap.
- **Domain logic leaked into the view layer.** Micro-retest staleness and readiness-label mapping live in `today.js`, untestable without mounting the view and prone to drifting from the domain modules (#38).
- **Inconsistent constant discipline.** `loads.js` models named, cited constants; `program.js` inlines and duplicates load-bearing numbers (build fraction 0.33 at three sites, `densityRest` params, double-block threshold) (#39, #40).
- **Large mixed-responsibility files.** `program.js` (~1289 lines) and `today.js` (~1388 lines) concentrate math, session library, pipeline, and rendering, raising collision/regression surface (#43).
- **Doc/code drift that erodes trust in the record.** Superseded ADR-0002 formula (#3), false "tooltip exists" comments (#35), and consensus framing on app-invented numbers (#40).

## 7. Highest injury risks

1. **Two-to-three near-maximal finger/power sessions 48h apart in Build and Peak**, for exactly the <6yr/7a+ profile ADR-0001 softens for — the unenforced ≥72h guardrail (#7, #25). Highest risk; a Peak finger injury wipes out the whole cycle.
2. **Deload weeks silently progressing finger load +2.5%** against the reduced target — nudging intensity up on the highest-injury-cost tissue during the recovery week (bounded and capped, but directionally wrong) (#18).
3. **No injury-history pre-softening** — a return-from-injury or injury-prone athlete is loaded as healthy from day one, the exact re-injury pattern the layoff-decay logic guards against (latent for the single known athlete) (#16).
4. **Pull-dominant weekly balance** — one true pressing movement against three climbing days plus weighted pull-ups, no overhead press, a slow-onset shoulder/elbow overuse pattern (weak evidence, but cheap to address) (#26).

## 8. Overall coaching rating: 7/10

A safe, evidence-anchored, honestly-documented plan that is genuinely good for its one athlete on the durability and load-management axes, and mostly sound on progression fundamentals. It loses points for one unenforced safety guardrail that contradicts its own G3-gating claim (#7/#25), and for effectiveness gaps against its stated V7/7b ambition: under-dosed and crimp-only finger work, a lead goal that is barely trained in Build, technique/tactics left fully optional, and thin individualization. Most of these are effectiveness rather than danger, several are openly disclosed, and none are reckless — but a plan promising V7/7b should train the qualities its own research names as dominant. The conservative, well-reasoned foundation earns a 7; closing the finger-spacing and lead-specificity gaps would push it higher.

## 9. Overall software architecture rating: 8/10

Clean, disciplined, and appropriate for its scope: layered domain, single source of truth, versioned migrations, generated derived artifacts, a registered prescription pipeline, and a test suite that actually asserts on real state. The self-documentation is exemplary. It loses points for domain logic leaking into the view layer, inconsistent constant discipline, two ~1300-line mixed-responsibility files, and several instances of doc/code drift (stale ADR, false tooltip comments, consensus-framed inventions) that undercut the otherwise-excellent decision record. These are maintainability and honesty issues, not correctness defects — the executable code is sound — so the architecture rates a strong 8.

## 10. Would you recommend this system to real climbers today?

**For the one athlete it was built for: yes, with two caveats.** This is a well-reasoned, safety-first, honestly-documented plan for a ~3-year V5–V6/7a climber training 3x/week, and it will not hurt them through reckless prescription — the conservative posture is real. The two things to fix or work around first are (a) the finger-spacing stacking in Build/Peak (#7/#25): manually treat the second hard finger day of those weeks with caution and use the readiness "Lighter" lever freely; and (b) the deload-week finger progression quirk (#18): don't chase the suggested +2.5% on a recovery week. With those managed, it is a credible self-coaching tool for this specific person, and its transparency about what it does and does not know is a genuine asset.

**For climbers generally: no, and it does not claim to be.** The app is explicitly a personal tool for one owner, and its hardcoded 3-day Mon/Thu/Sat schedule, absent current-grade/injury/equipment intake, static structural dosing, and boulder-biased hybrid Build make it wrong-fit or partly undoable for climbers with different schedules, histories, gyms, or a lead-first goal. The static individualization and the unenforced spacing guardrail would carry more risk across a heterogeneous population than they do for the single, known, injury-screened athlete. Recommended within its stated scope; not as a general-purpose climbing coach.


---

# Part II — Detailed Findings by Dimension

## 1. Training Philosophy

### The advertised Lattice 80/20 polarization is not what the prescriptions actually deliver

**Observation:** `docs/training-philosophy.md:32-34` invokes "the Lattice 80/20 rule… roughly 80% of training time should be capacity/base/easy mileage work, 20% high-intensity" and maps the Base phase — roughly half the cycle, labelled "capacity" — into the easy 80% bucket. The code does not match that framing. The Base phase runs substantial high-intensity work: Base Monday intro max-hangs at RPE 8-9 / 80-85% total load (`BASE_MAX_INTRO`, `js/program.js:153,158`), Base weighted pull-ups at RPE 7-8.5 (`js/program.js:301`), and Base Thursday projecting at RPE 7.5-9 (`js/program.js:441`). Only `sat-arc` (RPE 4-6) and the flash pyramid (RPE 6-7.5) are genuinely easy. The plan is concurrent/threshold-pyramidal — it even carries an explicit threshold rung (60/60, RPE 7-8.5, `js/program.js:375`) that a Seiler-style polarized model specifically avoids. The verifier confirmed every citation and sharpened the point: this is a genuine doc-vs-code framing drift ("uncited convention dressed as behaviour"), but it is a documentation over-claim, not an unsafe prescription — actual structured finger loading is conservative (one dedicated hangboard day/week on Monday, spaced 48-72h, softened bands), and nothing downstream in the code consumes the "80/20" label.

**Why it matters:** The 80/20 rule is presented as the plan's evidentiary frame — the scientific pedigree the reader is meant to trust. When the prescriptions implement a different intensity distribution than the one the doc names, the frame is decorative rather than load-bearing. In a repo whose stated principle is that evidence must be real ("not uncited convention dressed as behaviour"), a mislabelled intensity model is exactly the failure mode the project warns against, even though the underlying programming is defensible.

**Potential impact:** A reader — or a future maintainer editing prescriptions — reasoning from the 80/20 framing would mis-estimate the plan's true intensity distribution. Believing Base is mostly easy mileage, they could add hard work "to fill the 20%," inadvertently raising weekly high-intensity finger load above what a G3-durability-gated plan intends. The risk is soft (there is only one structured finger day and the mislabel is not wired into any calculation), but it is a real reader hazard.

**Recommendation:** Relabel `docs/training-philosophy.md:32-34` to describe the plan honestly as a concurrent/threshold-pyramidal model with a polarized *aerobic sub-component* (ARC + flash pyramid genuinely easy; strength and PE rungs deliberately threshold-to-hard). The doc is already candid about the 12-week compression trade-off — extend that same honesty to the intensity claim. Do NOT take the alternative of lowering Base-phase RPE to fit the 80/20 label: the RPE 8-9 intro max-hangs are evidence-supported (max-hang loading at ~80-95% of maximal load is consensus across Lattice and Eva López; López-Rivera & González-Badillo 2019, Medernach 2015) and are needed for the G1 progression goal. Fixing the label is correct and low-cost; bending the prescription to the label would be bad coaching.

**Trade-offs:** The concurrent model is defensible — arguably necessary — for an intermediate climbing only 3x/week, because limited sessions force energy systems and strength qualities to overlap within the week rather than being isolated into polarized blocks. So the fix here is documentation accuracy, not a prescription change; there is no training cost to relabelling. The only "cost" is admitting the plan is a synthesis rather than a textbook implementation of a named rule, which this repo elsewhere does willingly.

**Priority:** Medium — basis: coaching-consensus. (Framing/documentation-accuracy issue with no safety exposure; does not escalate under the G3-gates-everything principle. The repo is unusually well-documented and honest in most of its ADRs — this is one place where a cited "rule" outran what the code implements, and it should be brought back in line.)


---

## 2. Periodization

The periodization layer is the most carefully documented part of this repo, and much of it holds up: the taper decision (ADR-0007) is the single best-grounded choice in the codebase (hold intensity, cut volume ~40%, ≤2 weeks — a conclusion backed by strong meta-analytic evidence, e.g. Bosquet 2007), the deload policy (volume cut / intensity held, no kg multiplier) matches recovery-week consensus, and the ADRs are unusually honest about where they extrapolate (ADR-0002 concedes "no controlled trial of macrocycle length in climbers"). That said, several drifts and edge-case degeneracies survive between what the docs claim and what the code does. None is a G3 safety hazard; the cluster below is about G1/G2 effectiveness and documentation honesty.

### 8-week trip/project cycle degenerates to a single hard Base week

**Observation** At the `MIN_CYCLE_WEEKS=8` floor with `peakType` `'trip'` or `'project'` (taper=2), `_singleBlock` computes `base = max(2, remaining − build) = 2` (js/program.js:52-60). The forced retest-deload then overwrites the last Base week (`arr[base-1].deload=true; .retest=true`, js/program.js:82-87), so the Base phase reduces to exactly ONE hard week immediately followed by a retest — pattern `[H, R]`. The verifier reproduced the arithmetic exactly: 8 weeks + trip/project → peak=2, taper=2, remaining=4, build=`max(2, round(4×0.33))`=2, base=`max(2,2)`=2, then wk2 is overwritten to deload+retest. An 8-week comp cycle is only marginally better (base=3 → `[H,H,R]`, two hard Base weeks). The fixed Peak(2)+Taper(2) tail consumes half of an 8-week trip cycle. Note the trigger is narrow: default `peakType` is `'comp'` (storage.js:26), 9 weeks already gives `[H,H,R]` and 10 gives `[H,H,H,R]`, so this bites only at the exact 8-week floor with a deliberately-chosen trip/project peak type.

**Why it matters** ADR-0002:7 justifies the 8-week floor precisely on the grounds that "below 8 weeks there is not enough Base to drive meaningful capacity adaptation." At the floor with taper=2, the code delivers a single hard Base week before testing — so the floor does not actually guarantee the meaningful Base it was chosen to protect. Capacity adaptation (aerobic base, connective-tissue conditioning) needs multiple progressive weeks; one week produces essentially none, and the athlete then retests on an unstimulated base and enters Build/Peak underprepared. This is a genuine doc/design mismatch, compounded by ADR-0002:9's own taper formula being stale versus the peakType-driven taper of ADR-0007.

**Potential impact** An athlete choosing an 8-week trip/project cycle (plausible for a trip ~2 months out) gets a plan that is almost pure Peak/Taper with no real base — a peaking block masquerading as a macrocycle, with a benchmark retest taken off a single loading week. Degrades G1 (progression) and G2 (peaking) effectiveness; no G3 risk.

**Recommendation** Raise the effective floor for taper=2 peak types (e.g. require ≥10-11 weeks when taper=2), or make the phase-split formula guarantee a minimum of ~3-4 hard Base weeks before allowing the fixed Peak/Taper tail, or at minimum surface a UI warning that cycles this short cannot develop base. Also correct ADR-0002:7's claim that 8 weeks guarantees meaningful Base — it does not for trip/project.

**Trade-offs** Raising the floor removes a currently-allowed short-cycle option; guaranteeing a minimum hard-Base count would compress or drop the fixed 2-week Peak at short lengths, conflicting with ADR-0002's fixed-Peak rationale. The simplest safe option is a UI warning rather than changing the math.

**Priority** Medium — basis: coaching-consensus.

### ADR-0002 body still documents the pre-ADR-0004/0007 phase-derivation formula

**Observation** ADR-0002's "What we picked" section states the deload cadence as "every 3rd week within Base/Build (`weekIdx % 3 === 0`)" and taper as "taper = 2 if weeks ≥ 14 else 1" (docs/adr/0002:9,11). Both are superseded: ADR-0004 moved deload to `(i+1)%4` (every 4th week) and explicitly labels the old `%3` a "naming accident" that "closes KG-B3"; ADR-0007 replaced the weeks≥14 rule with a peakType function (comp=1, trip/project=2). The live code matches the newer ADRs — `(i+1)%4===0` at js/program.js:78,79,93,98,100,105 and `taperWeeksFor(peakType)` at js/program.js:48-49 — and CONTEXT.md is current. But ADR-0002 carries no "superseded-by" annotation on the affected lines, unlike ADR-0004/0007 which carry explicit Status lines. (This is documentation-only; the executable code is correct.)

**Why it matters** CLAUDE.md cites ADR-0002 as the authority for phase derivation ("Index into `Program.phasePattern(settings)`… See docs/adr/0002"). An ADR read as current documents a 2:1 cadence the project explicitly repudiated and a weeks≥14 taper rule that no longer exists. A future editor trusting ADR-0002 could reintroduce the very bug KG-B3 closed. The periodization decision log is internally contradictory (ADR-0002 vs ADR-0004/0007).

**Potential impact** Confusion or regression risk for anyone changing phase logic; no current runtime effect.

**Recommendation** Add a superseded-by note to ADR-0002's affected lines — line 11 (cadence) pointing at ADR-0004, line 9 (taper) pointing at ADR-0007 — the way other ADRs in this repo carry addenda.

**Trade-offs** ADRs are point-in-time records, so some staleness is expected; but because CLAUDE.md points here as the phase-derivation authority, a cross-reference is warranted.

**Priority** Medium — basis: software-only.

### peakType 'project' is a distinct UI choice with no distinct behavior

**Observation** The app exposes three peak types (comp | trip | project). In code, `'project'` is folded into `'trip'` everywhere: `taperWeeksFor` returns 2 for both (js/program.js:49), the pattern normalizer keeps the label but never diverges (js/program.js:37, 1168), and every taper/peak session builder branches only on `peakType==='comp'` vs else, with explicit comments that trip/project are "byte-for-byte unchanged" (js/program.js:405-407, 494-496, 546-550, 647-650). No rolling / every-5-10-day strength touch exists. The reader's framing that this is "undisclosed drift" is only PARTIALLY_CONFIRMED, and the verifier corrects it in two ways: (1) ADR-0007 does not firmly promise a project protocol as a build item — line 19 describes the "rolling taper, strength touched every 5-10 days" only as conceptual character, and line 20 de-scopes it ("keep project's per-day scheduling minimal, since content differences beyond length rest on thinner evidence"); the implementation checklist commits only to length scaling. So project==trip is the ADR's own decision. (2) CONTEXT.md actually documents this correctly (line 24: "a trip or open-ended project window rides a longer peak → 2-week taper"). The one genuine live artifact is the Profile dropdown label at js/views/profile.js:202, which reads "Project — 2-wk rolling taper" — the word "rolling" promises behavior that was never built.

**Why it matters** An athlete selecting "project" on the strength of a "rolling taper" label gets a fixed 2-week step taper. This is a user-facing honesty nit, not a training defect — the 2-week step taper is itself valid.

**Potential impact** Purely cosmetic; a 'project' athlete gets a valid taper, just not the one the label implies. No load, volume, or spacing consequence; G1/G2/G3 outcomes untouched.

**Recommendation** Change the profile.js:202 label to match CONTEXT.md — drop "rolling" (e.g. "Project — 2-wk taper"). Optionally add a knowledge-gaps note recording that project==trip in the current implementation. Do not build the rolling taper: ADR-0007:20 correctly judges the per-day evidence thin, and an open-ended project has no fixed goal date for a fixed step taper to anchor to anyway.

**Trade-offs** The low-cost fix is a one-word label edit; full implementation has weak evidentiary support and no clear anchor date.

**Priority** Low — basis: software-only.

### 3:1 deload cadence degrades to an isolated single hard week before the Base retest

**Observation** Base deloads fire on `(i+1)%4===0` independently of the forced end-of-Base retest-deload (js/program.js:78, 82-87). At the default 12-week comp cycle (base=6) this yields `[H,H,H,deload(wk4),H(wk5),Retest-deload(wk6)]`; 14-week shows the same shape (`[H,H,H,d,H,H,R]`). The C2 guard only clears a natural deload *directly* adjacent to the retest (it inspects `arr[base-2]`, wk5, which is hard), so the wk4 deload stands with a lone hard wk5 between it and the retest. This is PARTIALLY_CONFIRMED: the code facts and the wording-accuracy point are real, but the reader's "detraining/rebound" framing is weak. As the verifier notes, a deload + one hard week + a volume-reduced retest week is a normal mini-freshening into a max test, not detraining — and freshness before a max test aids retest validity, which the finding itself concedes. The `3 hard : 1 deload` branding at docs/training-philosophy.md:38-40 carries no end-of-Base exception, so it is not uniformly true.

**Why it matters** The philosophy/CONTEXT docs sell a uniform "3:1" cadence; the final Base sub-block at the two most common cycle lengths is really "deload → 1 hard → retest." This is a minor accuracy gap in the doc wording, not a training hazard. The deload policy itself is well within surveyed practice (Bell et al. 2023: coaches deload every ~5.6 ± 2.3 weeks; Horst's "every 3-4 weeks" supports every-4th for climbers).

**Potential impact** Retest benchmarks at 12/14-week cycles are taken after a truncated final Base block, arguably understating accumulated adaptation slightly and feeding marginally conservative Build loads (loads are %-of-benchmark). Small and self-limiting.

**Recommendation** The primary schedule-changing fix the reader proposed (extend C2 to suppress the near-adjacent wk4 deload) is self-defeating and should NOT be done: suppressing it yields five consecutive hard weeks into the retest (`[H,H,H,H,H,R]`), breaking the very "every 3-4 weeks" Horst bound the cadence exists to honor. Achieving a genuine 2-3 week loading run would require relocating the deload, not removing it. The worthwhile action is cosmetic: soften the philosophy/CONTEXT "3:1" wording to note the end-of-Base tail exception.

**Trade-offs** Current spacing errs toward recovery, which is G3-consistent; this is a refinement of documentation, not a safety fix.

**Priority** Low — basis: coaching-consensus.

### Inter-cycle progression rests entirely on benchmark retest → load autoscaling; structure never advances

**Observation** Every cycle regenerates from the same `buildPhasePattern` + identical session library; `buildPhasePattern(weeks, peakType)` (js/program.js:35) derives the phase split solely from user settings, and `resolveDate` (js/program.js:1127) plus the session builders take no cross-cycle progression input. The within-cycle base ramp (`hardPhasePos`, js/program.js:829,993) scales volume only inside a cycle. The sole cross-cycle lever is load: kg is %-of-benchmark and benchmarks live in `globalBenchmarks`, updated only at retest — so plateaued benchmarks reproduce an identical plan. There is no phase-aggressiveness progression, no cross-cycle volume progression, and no plan-mutating stagnation response. This is honestly disclosed: training-philosophy.md:60 states the open question verbatim, and KG-A8 marks the automation half Won't-fix (2026-07-23). One nuance the verifier adds: stagnation *is* detected as an advisory — `retestTrajectorySignal` (js/monitoring.js:98-117) emits a `retest-plateau` flag when the last two retests are flat-or-down — but its `actionKey` is `review-checklist` and it never mutates the plan, so "structural progression is manual" still holds.

**Why it matters** G1 is a multi-cycle goal (reach V7/7b). The app's long-term progression engine is exactly one lever: if the retest shows higher numbers, loads rise. If benchmarks plateau (common for a 3-year climber), the plan repeats identically with no structural response — no added Build density, no protocol rotation, no limiter-driven emphasis shift. The design is honest about this, but it means periodization does not itself drive long-term progression; it relies on the athlete manually re-baselining and acting on the nudge.

**Potential impact** Across several cycles an athlete can stall at V6 running an unchanged template, with the app giving no periodization-level adjustment — G1 support is thinner than the confident three-goal framing implies.

**Recommendation** Nothing to build if the shipped end-of-cycle-review checklist + plateau nudge is considered sufficient (a defensible "simple over clever" call). But the philosophy/goals docs should state plainly that inter-cycle progression is benchmark-load-scaling only and that structural progression is manual, so the limitation is not obscured by the G1 framing in project-goals.md.

**Trade-offs** Automated inter-cycle progression was deliberately ruled Won't-fix (complexity vs single-athlete value); documentation clarity is the proportionate response.

**Priority** Low — basis: coaching-consensus.


---

## 3. Weekly Program Design

This is an unusually well-documented repo — ADR-0006, ADR-0010 and the training philosophy doc spell out the weekly skeleton and its rationale explicitly, which made both of the findings below verifiable against a stated intent rather than guessed convention. The everyday Mon/Thu/Sat rhythm is defensible and the single-system-per-session specificity model is sound coaching consensus. The two issues that survive scrutiny are (1) a self-authored safety guardrail the code never actually enforces, worst in the Peak block, and (2) a specificity gap: hybrid Build under-serves the lead half of the athlete's stated goal.

### ADR-0006's ≥72h-between-high-intensity guardrail is never enforced; Peak stacks its two hardest sessions 48h apart

**Observation:** The day→slot map is fixed to Mon/Thu/Sat regardless of phase (`js/program.js:122-130`), with no phase parameter and no spacing/consecutive-day logic anywhere in the codebase (a repo-wide grep found no 72h/spacing guard). This means the schedule structurally cannot honor ADR-0006's own stated guardrail: "≥72h between high-intensity power sessions, so the 3-slot athlete's aggregate stays inside injury caps" (`docs/adr/0006-power-endurance-two-band-model.md:25`). In Peak, Thursday is the single most intense session of the whole cycle — 30/30 at RPE 9.5–10, "deep pump expected" (`js/program.js:482-487`) — and Saturday is limit/redpoint at RPE 9–9.5 (`sat-proj-boulder`/`sat-redpoint-peak`, `js/program.js:565`, `:665`). Thu→Sat = 48h and Sat→Mon = 48h; only Mon→Thu meets 72h. The same 48h stack recurs in Build odd/boulder weeks between Thu limit bouldering and Sat boulder-triples (both RPE 8.5–9.5). With 3 high-intensity sessions in a 7-day week, ≥72h between each is mathematically impossible (it would need 9 days), so the guardrail is structurally unmeetable and silently ignored rather than reconciled by dropping to 2 hard sessions in Peak. Two facts bound the severity: the delivered 48h spacing sits *within* the widely cited 48–72h tendon-recovery consensus (so the athlete is not being loaded outside safe practice — no two heavy finger days are adjacent), and `README.md:62` already frames the app's rule as "48–72h tendon recovery," implicitly conceding 48h. So this is genuine doc/code drift on an over-strict, self-authored guardrail, not an active hazard beyond consensus. The drift is untracked in `knowledge-gaps.md`.

**Why it matters:** G3 (durability) is stated to gate G1/G2. The app wrote itself a specific injury-cap guardrail for exactly this athlete and the implementation does not meet it in the highest-risk weeks — the goal-run Peak, where fatigue is highest and finger/pulley load is maximal. A written safety rule that the code never checks is an integrity defect: it gives false assurance and can drift further unnoticed.

**Potential impact:** Two maximal power/lactic sessions 48h apart (30/30 deep-pump Thursday → limit/redpoint Saturday) during Peak, layered on the already-flagged six-consecutive-loaded-weeks pattern (`docs/coach-review.md:31`), keeps A2-pulley/finger-tendon and elbow overuse risk near the top of the range in the exact weeks the plan wants the athlete freshest. It can also blunt performance: the Saturday limit session is done on incompletely recovered fingers.

**Recommendation:** Either (a) reconcile the guardrail in practice — in Peak drop to 2 high-intensity climbing sessions/week (e.g. make Peak Saturday a lighter expression/mobility day, or move the 30/30 so the two maximal sessions sit 72h apart around a mid-week rest); or (b) formally amend ADR-0006 to state that on a fixed 3-day Mon/Thu/Sat skeleton the achievable floor is ~48h and the ≥72h rule applies only between the two most maximal sessions — then actually enforce even that narrowed rule (Peak Thu→Sat is 48h and violates it today). Whichever is chosen, stop leaving a written safety guardrail that the code never checks.

**Trade-offs:** The research corpus (`docs/research/climbing-training-report.html:322`) and coach review both accept ~48h between hard finger days generally, so the everyday Mon/Thu/Sat rhythm is fine; the sharp edge is specifically the two most maximal Peak sessions. Cutting a Peak hard session costs peaking stimulus in a 2-week window — but G3 is stated to win when it conflicts with G2.

**Priority:** High — basis: coaching-consensus.

### Hybrid Build provides almost no lead/route-specific climbing, under-serving the 7b lead goal in the block meant to build it

**Observation (PARTIALLY_CONFIRMED):** The structural code claims all hold. In hybrid mode (both goals live) the Build phase locks Thursday to limit bouldering always (`hybridBuildMix`, `js/program.js:1208`, forced into boulder-only `thu-limit`, `:392-400`, `:1250-1251`) and Saturday alternates boulder-triples on odd/boulder weeks (`sat-boulder-triples`, `:604-615`) with a format-agnostic 60/60 threshold session on even/sport weeks (`buildSat6060Threshold`, `:531-538`, `:1253-1255`; week flavor odd=boulder/even=sport at `:117-119`). Lead falling practice is only an optional Tuesday skill drill (`js/drills.js:49-50`). What holds firmly is the residual: **no hybrid-Build session explicitly directs lead-specific pacing, clipping, lead-head, or redpoint mileage** — dedicated route work (route pyramid, 4×4 routes, redpoint) appears only in non-hybrid sport focus or in Peak/Taper. Two overstatements in the original claim must be corrected: (1) it said route work appears "only" in non-hybrid or Peak/Taper — but hybrid *Base* sport weeks do carry `thu-route-pyramid` (kind `route`, `:448-461`) and `sat-arc` (`:620-628`), so the aerobic route base is built in hybrid mode, just in Base not Build; and (2) the even-week Saturday 60/60 (`SIXTY_SIXTY_EXERCISE`, `:375`) is format-agnostic aerobic-power interval work a lead athlete would naturally run on routes — a route-endurance engine present weekly on sport weeks — so "almost no route-specific climbing" understates what exists. The confirmed gap is confined to the Build block and to lead-*specific* skill/pacing volume, not to route endurance wholesale.

**Why it matters:** One of the two G1 goals is ~7b lead. Build is the block meant to build the sport engine and route-specific capacity, but in default hybrid mode the athlete boulders every Thursday and does boulder circuits or format-neutral intervals on Saturday. Lead-specific pacing, sustained clipping, and lead-head confidence get no *dedicated* Build volume — arriving to Peak, that quality can only be expressed, not built.

**Potential impact:** The athlete reaches Peak boulder-strong but with under-rehearsed lead pacing and head-game, making the 7b goal materially less likely (G1). Per the evidence bundle, the energy-system specificity principle (bias emphasis toward the goal discipline) is coaching consensus (Hörst energy-system training; support level: coaching-consensus/weak), so a lead goal argues for at least one lead-framed Build slot.

**Recommendation:** Low-cost fix — explicitly label the even-week Saturday 60/60 as a lead/route session (it is already format-agnostic and can be run on routes), and/or surface a note that hybrid Build is boulder-biased and lead pacing/clipping volume should come from the optional Tuesday drill and self-directed Sunday climbing. A heavier option is converting even-week Thursday to a route-based limit/4×4 on sport-parity weeks, at the cost of the shared-finger-strength bouldering dose.

**Trade-offs:** ADR-0010 deliberately fixed Thursday to limit bouldering because it is the highest-value, freshest-day strength/power stimulus that both goals share, and chose mix-within-week with single-system specificity per slot. Adding route specificity to a 3-day week necessarily dilutes the bouldering dose — the fundamental tension of chasing V7 and 7b simultaneously on 3 sessions. This is a goals-vs-capacity design trade-off, not purely a bug, and it is a G1 effectiveness concern rather than a G3 safety issue.

**Priority:** Medium — basis: coaching-consensus.


---

## 4. Exercise Prescription

This dimension is, on balance, the strongest and best-documented part of the repo. The load bands, repeater dosing, reserve-based (not-to-failure) hangboarding, full-crimp omission, campus-board prerequisites, and taper structure are all either coaching-consensus or better, and the ADRs are unusually honest about where a number is an app convention versus a cited finding. The four items below are refinements and one genuine progression-dose question, not safety defects — none of them threaten G3 durability, and one (the finger-frequency floor) is actually a G3-conservative choice with a real G1 cost.

### Dedicated progressive-overload finger training is only 1x/week, below the 2x/week of the protocols the philosophy calls the #1 grade lever

**Observation.** Load-tracked finger work (`kind:'hangboard'`, produced only by `hangboardExercise()` at js/program.js:315-317) is called from exactly one place — `buildMonHangboard`, js/program.js:335-336 — so a structured progressive-overload finger stimulus exists on Monday only; no no-hang or repeater stimulus lands on any other day. Yet the philosophy names half-crimp max finger strength "the single best predictor of climbing grade" (docs/training-philosophy.md:44), and the protocols it leans on run twice weekly (ADR-0005:30 "a dedicated 2x/week 8-week fingerboard cycle"; the corpus caps intense fingerboarding at 2 days/week, docs/research/verified-findings.md:666). The second finger day is deferred *reactively*, gated on documented stagnation ("the first lever is a second weekly finger stimulus", ADR-0005:45).

**Why it matters.** For the very quality the plan calls its top grade driver (G1, path to V7/7b), one measurable progressive-overload session per week sits at the low end of the effective dose in the evidence the repo itself cites. This is not doc/code drift — code and ADRs agree — it is a deliberate under-dose relative to the referenced science.

**Potential impact.** Finger-strength progression may plateau, and because the second day is added only after a full cycle of observed stagnation, the athlete can burn a whole ~12-week cycle before the lever is pulled.

**Recommendation.** Consider programming a second, *lighter/complementary* finger stimulus proactively — low-intensity repeaters or no-hangs on a separate day, which the corpus (Gilmore et al. 2024; philosophy:51) reports is additive and lower-risk — rather than waiting for stagnation, while staying inside the existing ≤2 intense fingerboard days / ≤4 total climbing days caps.

**Trade-offs.** Thursday limit bouldering already supplies a second high-intensity finger exposure, so *hard* finger days are effectively ~2/week — this genuinely softens the concern and is a legitimate G3-conservative posture (heavy finger loading wants 36-72h recovery; 1x dedicated is the safe floor). A second *dedicated* max-hang day would add tendon load on an already-3-day week; a low-intensity additive stimulus is the safer way to raise frequency. Note also that the general 2-3x/week hangboard evidence is on isometric protocols in intermediates, not RCT-grade — the repo rates its own synthesis "medium-high, not high," which is fair.

**Priority.** Medium — basis: scientific. (Efficacy of the app's self-declared top grade driver; G3 is not threatened — indeed 1x/week serves it.)

### Base boulder Thursday prescription is internally muddled

**Observation (partially confirmed).** The Base boulder Thursday prescribes "60-90 min of 4x4-style projecting on submaximal problems" at RPE 7.5-9 (js/program.js:441), and — unlike its sibling sessions — carries no `howto` field. The wording conflates three incompatible ideas: *projecting* (limit/near-max), *4x4-style* (high-volume power-endurance format), and *submaximal problems*. This string nit is real and worth a one-line rewrite. **However, the finding's larger claim does not hold.** It argued this session runs "hotter than the deliberately-capped Base sport session" (the KG-B9 route pyramid capped to RPE 7-8 at js/program.js:458) and flattens the base→build ramp. But this session is deliberately *not* on the aerobic ladder KG-B9 governs: js/program.js:439 labels it `energySystem: 'Skill / Strength'`, and ADR-0009:34 states it explicitly ("projecting unchanged (Skill/Strength, not aerobic)"). The boulder base→build progression is intact — Base projecting 7.5-9 steps up to Build limit bouldering at RPE [8.5, 9.5] (js/program.js:398) — and the genuine boulder-side aerobic analogue (Saturday) was already handled as KG-B12 by making Base Saturday the aerobic flash pyramid. RPE 9 on *submaximal* Base problems also sits below Build/Peak limit intensities, so there is no G3 issue.

**Why it matters.** The self-contradictory instruction gives the athlete no clear, actionable target for the session — is it mileage, power-endurance, or limit projecting? That is a clarity defect, not a periodization or safety defect.

**Potential impact.** The athlete guesses at intent; on a bad guess they project near-limit in a phase meant for accumulation. Low-consequence given the RPE cap and the session's Skill/Strength framing.

**Recommendation.** Rewrite the string to one coherent intent (e.g. technique/mileage projecting on submax problems) and drop either "projecting" or "4x4-style" so the two formats stop colliding. Add a `howto` line to match its siblings.

**Trade-offs.** None material — this is a copy fix. Do *not* import the KG-B9 aerobic RPE cap here; that rationale applies to aerobic-ladder sessions, and this session is correctly excluded by design.

**Priority.** Low — basis: coaching-consensus. (Clarity nit; the progression-flattening and safety claims were refuted on the code.)

### ADR-0006 density progression is barely realized and the ADR overstates what it accomplishes

**Observation (partially confirmed).** `densityRest` (js/program.js:365-370) starts from a 240s (4:00) base and subtracts 5s per remaining week only inside the final 4 weeks (`weeksLeft<=3`), floored at 150s: the sequence is 3:55 / 3:50 / 3:45 / 3:40 — a 20s total reduction (~8% off a 4:00 rest), and the 2:30 floor is never approached. The 60/60 threshold stimulus carries no density wiring at all — `SIXTY_SIXTY_EXERCISE` is a fixed string (js/program.js:375), explicitly acknowledged at js/program.js:528-530. ADR-0006:15,22 frames the 5s/week cut as the mechanism that "shifts band 1 toward band 2 as the goal nears." **Two corrections to the reader's framing:** (1) `densityRest` does *not* only feed the 4x4/triples circuits — it also feeds the Peak 30/30 lactic session (js/program.js:480), i.e. it *is* wired onto the band-2 sharpening tool where the ADR wants it. (2) The 60/60 exclusion is documented intent, not an accident — ADR-0006:21 explicitly prescribes "little density change" for the Build 60/60 band-1 block. So the genuine residue is narrow: shaving 20s off a 4-minute rest is a mild manipulation relative to the ADR's grand "shifts band 1 toward band 2" language.

**Why it matters.** This is doc-overstatement, not a functional gap. The mechanism does run where the ADR designed it to; the ADR's prose just claims more transformation than a 20s density change delivers.

**Potential impact.** Minimal. Power-endurance sharpening into the goal date rests mainly on the phase structure and the RPE bands, not on this small rest-density tweak; the overstatement misleads a reader of the ADR more than it harms the athlete.

**Recommendation.** Take the finding's own fallback clause: note in ADR-0006 that the density ramp is deliberately mild for injury reasons, rather than presenting it as *the* band-1→band-2 shifting mechanism. Do **not** steepen the ramp toward the 2:30 floor — on the 30/30 that directly conflicts with the separate contradicted finding (the 30/30 is a protocol Horst designed to stay aerobic/low-lactate; shortening its rest pushes it glycolytic, the wrong direction under G3).

**Trade-offs.** The 5s/week increment is faithful to the cited Lattice convention; making it steeper would depart from the citation *and* the source protocol's intent. A documentation fix is the correct, lowest-risk resolution.

**Priority.** Low — basis: weak. (Cosmetic doc-overstatement; no performance or safety consequence.)

### Monday warm-up ramps only to 80% before near-max hangs; posterior-cuff dosing is thinner than claimed

**Observation (partially confirmed).** The hangboard warm-up tops out at "2 hangs @ 80% load" (js/warmup.js:14) before working sets that reach 87-92% in Build (js/program.js:172) and 92-96% in Peak (js/program.js:185) — a real ~7-16 percentage-point primer-to-working jump on the heaviest days. **But the antagonist claim is misread.** The finding calls "Inverted rows / band cactus" "one pickable slot," implying a choose-1 among four items. That is wrong: js/program.js:353 pushes an antagonist block whose items are the *entire* `ANTAGONIST_BLOCK` array — all four are prescribed, not one. Push-ups (a pressing antagonist to the day's pulling) are therefore *always* present (js/program.js:210); only external rotation *specifically* is substitutable within its item, and inverted rows themselves load scapular retractors/rear delts (a standard postural counter for climbers), so posterior-shoulder work is not "entirely absent" even when rows are chosen. Dedicated external rotation (band cactus) does land as only a 2x12-15 dose on Tuesday (js/program.js:241).

**Why it matters.** The first near-limit hang is where finger-tendon strain is highest, and an 80% primer before a 96% Peak hang leaves the single largest load jump partly unprimed — a reasonable, low-cost tightening. The shoulder-prehab half of the finding, however, rests on a premise this run's evidence digest rates MIXED/weak: there is no climber RCT for antagonist injury-prevention, and "antagonist strengthening alone does not prevent injury." So making external rotation mandatory is not an evidence-backed G3 imperative.

**Potential impact.** Marginally elevated first-rep finger risk on the heaviest hangboard days. The shoulder-dosing concern is smaller than stated, since a pressing antagonist is always present and rows load the posterior chain.

**Recommendation.** Add one intermediate ramp step (e.g. a ~90% primer hang) before Peak/Build working sets — a defensible refinement, noting working sets already start with a reserve and ±kg ramping (js/program.js:166). Optionally ensure at least one external-rotation movement is non-optional on Monday, but treat this as a quality preference, not a durability fix.

**Trade-offs.** The existing two-stage warm-up is already better than most published plans (docs/coach-review.md:95), so this is a tweak, not a rebuild; extra warm-up hangs add a little finger volume on the day, which must stay modest. 80% of *total* load is itself a substantial primer under the ADR-0013 convention.

**Priority.** Low — basis: coaching-consensus. (A low-cost warm-up refinement; the antagonist claim was partly misread and the G3 elevation is not evidence-supported.)


---

## 5. Individualization

This dimension asks a pointed question of a self-described "digital coach": once you strip away the single hard-coded athlete, how much of the plan actually bends to *who is using it*? The honest answer is that the app individualizes **absolute load well and everything else barely**. Benchmarks (bodyweight, maxHang20mm, pullup1RM) convert phase-keyed percentages into per-athlete kilograms, and a genuine autoregulation stack (readiness multiplier, layoff decay, RPE thermostat, targets-hit progression, +5% session cap) tunes those loads to day-to-day state. That is real, and it is the safety-relevant axis. What is *not* individualized is the training *structure* — volume, rep schemes, RPE ceilings, session selection, style emphasis — and several intake fields that a human coach would ask about on day one are either absent or present-but-uneditable. None of these rise to a G3 durability breach for this one known athlete, which is why every finding below lands at Medium or Low. But two of them (missing current-ability and injury-history intake) are the individualization gaps most worth closing if the tool is ever pointed at a second person, and one (finding 3) is a real doc/code drift where a "Closed" gap ships a personalization that can never personalize.

It is worth stating plainly, given the skeptical brief: this repo is unusually well-documented and unusually honest about its own limits. Several of the findings below are already conceded in `docs/knowledge-gaps.md` or an ADR. The criticism is about scope and shipped-vs-claimed state, not about hidden dishonesty.

### Prescription structure never scales to current ability — only target grade and discipline are captured

**Observation.** Onboarding records discipline and a *target* grade only; it never captures the athlete's *current* grade. `js/views/onboarding.js:415-416` writes the selected target grade straight into `benchmarks.boulderGrade`/`sportGrade` (the field labelled "Target grade" at `onboarding.js:123`), and `js/storage.js:204` defaults hold only `sportGrade`/`boulderGrade`/`dominantStyle`/`dominantAngle` — no current-grade or training-age field exists anywhere. Structural prescription is keyed on phase alone: sets, reps and RPE bands are static across athletes, and the only per-athlete anchoring is the benchmark → kg conversion in `js/loads.js` (`prescribeLoadKg`). The verifier corrected one detail in the reader's example: `js/program.js:301-302` (5×5 @ 75–82% RPE 7–8.5; 5×3 @ 84–89%) is the **weighted pull-up** prescription (`pullupPrescription`), *not* Base hangboard — Base hangboard is `BASE_REPEATERS` + `BASE_MAX_INTRO` at `js/program.js:335`. The structural point still holds regardless of which exercise you cite: two climbers of the same discipline but very different training age get byte-identical set/rep/RPE schemes.

**Why it matters.** Current ability and training age are the *first* things a coach individualizes: a newer climber needs lower finger-loading volume and slower progression; a seasoned one needs more. Anchoring absolute load via benchmarks is necessary but not sufficient — a weaker climber correctly gets fewer kg, but still gets the same *number of hangs at the same RPE ceiling*, which is a tissue-exposure decision, not just an intensity one.

**Potential impact.** Under-dosing advanced athletes (stalled G1) and over-exposing less-adapted ones (G3 risk), because volume and RPE ceilings ignore training history and tissue readiness.

**Recommendation.** Capture current grade and training age at onboarding and branch at least finger-loading *volume* and the progression step on them (e.g. reduce hangboard volume and cap targets-hit progression to the +2.5% floor for lower training age). At minimum, gate the highest-risk sessions (limit boulder, max-hangs) behind a current-ability tier.

**Trade-offs.** Adds an intake field and a branching table — more prescription branches to keep internally consistent (the `project-goals.md` "simple over clever" surface-area cost, which CLAUDE.md is explicit is the *only* legitimate cost here since dev time is not). For the single real athlete this is latent, not an active mis-prescription, and multiple autoregulation/safety layers already blunt the downside.

**Priority.** Medium — basis: coaching-consensus. (The claim that structural individualization comes before load individualization is coaching consensus; there is no RCT dictating a specific volume-by-training-age table.)

### No injury-history intake — finger loading is only ever moderated reactively, never pre-softened

**Observation.** `defaultSettings`/`defaultBenchmarks` (`js/storage.js:20-49`) contain no injury-history field, and onboarding has no such step — benchmarks track bodyweight/maxHang/pullup/grades/style/angle/`history[]`, with `history[]` being retest snapshots, not prior injury. The only injury-aware logic is *reactive*: the daily pain check-in (`js/monitoring.js:122-147`, which only fires when the athlete types a pain value today) and layoff decay (`js/loads.js:35-38`, keyed on days-since-previous, i.e. time *off*, not history). A climber with a documented A2 pulley or medial-epicondyle history therefore starts at exactly the same max-hang percentages, volume and progression rate as one with none.

**Why it matters.** G3 (durability) is the gating goal and finger/elbow tendon injuries are the dominant climbing injury (Vigouroux 2006 / Schweizer 2008 establish the crimp-A2 loading mechanism — consensus). A coach's first individualization for a return-from-injury or injury-prone athlete is a reduced starting load and slower finger progression; this app has no channel to know or apply that.

**Potential impact.** An injury-prone or recently-recovered athlete is loaded as if healthy from day one — the exact re-injury pattern the layoff-decay logic (ADR-0008) was itself written to guard against, but only for time-off, not for history.

**Recommendation.** Add an injury-history intake that, when finger/elbow injury is flagged, lowers the initial hangboard % band and caps targets-hit progression to the bottom of the band for the first block; keep it advisory/editable.

**Trade-offs.** Self-reported history is imperfect and could make the plan over-cautious — but erring conservative aligns with G3-gates-everything. Note two real mitigations already in place: the plan *categorically* pre-softens the Peak block for exactly this climber's cohort (ADR-0001 / Sjöman 2023 — campus removed, pull-ups capped 90%, limit volume cut for the <6yr sub-7a+ injury-prone group, `js/program.js:303`), and reactive pain-red skips finger loading. So this is a latent individualization gap, not an open safety hole.

**Priority.** Medium — basis: coaching-consensus. (Staged/reduced return-to-load for prior finger injury is well-established PT/coaching practice, e.g. the Hooper's Beta A2 model; no head-to-head RCT proves a specific de-load magnitude.)

### Anti-style cue is hard-coded to a crimp/overhang specialist — the personalization fields have no editor (KG-A10 marked Closed but not usable)

**Observation.** CONFIRMED. The "train your weakness" cue reads `benchmarks.dominantStyle`/`dominantAngle` (`buildAntiStyleCue`, `js/program.js:276-283`; attached via `attachStyleNote` at `:287-290`) and renders as a session note (`js/views/today.js:228`). Those fields default to `'crimp'`/`'slight-overhang'` (`js/storage.js:44-45`). But there is **no UI to set them**: onboarding writes only maxHang/pullup/bodyweight/grades (`onboarding.js:410-418`), the Profile benchmarks card edits only maxHang20mm/pullup1RM/bodyweight (`js/views/profile.js:86-88`), and a grep across `js/views` finds no writer for the style/angle fields — the old `benchmarks.js` editor was deleted, so there is not even an orphaned writer. Yet `docs/knowledge-gaps.md:30` lists KG-A10 ("Style individualization unused") as **Closed (issue #41)**. So the cue can only ever emit its default: every athlete permanently gets "include 2 anti-style problems — slopers/pinches, slab or vertical."

**Why it matters.** This is genuine doc/code drift: a gap is marked Closed and an ADR-backed feature shipped, but the feature is structurally incapable of doing its job because its inputs are uneditable. It bakes in the assumption that the user is a crimp/steep specialist who should train slopers/slab — which for a natural slab/sloper climber is exactly backwards.

**Potential impact.** Mild G1 misallocation: an athlete may be steered toward an "anti-style" that is already a strength. The cue is advisory session *text* only — it gates no prescription, computes no load, and touches no G3 path — so the blast radius is small.

**Recommendation.** Add a style/angle selector to onboarding or the Profile benchmarks card (the fields and rendering already exist — only the input is missing). If it genuinely can't be individualized for the single user, stop emitting a confidently-personalized cue and reopen KG-A10 rather than leaving it "Closed."

**Trade-offs.** Two more controls, trivial versus the current state of shipping a personalization that cannot personalize. Softening: this is a single-user app for one climber for whom the crimp/slight-overhang default is a plausible guess, and `knowledge-gaps.md:102` already openly defers "automated style programming beyond text bias" — so the drift is more a stale status label than a live defect.

**Priority.** Low — basis: software-only.

### No equipment constraints — the plan assumes hangboard, campus board, lead wall and boulder wall are all available

**Observation.** CONFIRMED. There is no equipment field anywhere (`js/storage.js:20-49`; a grep for "equipment" across `js/**/*.js` returns zero hits), and onboarding is a fixed 5-step wizard (welcome/goal/maxes/schedule/review) with no equipment step. Sessions freely prescribe campus board (`js/program.js:388`), lead-wall route pyramids / 4×4 / ARC (`js/program.js:458,627,640`) and hangboard, with only inline "gate:" *text* on campus (`js/program.js:388`) — never a data check. No substitution mechanism exists (grep for "substitut" is empty).

**Why it matters.** Equipment availability is a first-order individualization: prescribing lead 4×4s to someone with no rope access, or campus ladders to someone with no campus board, produces sessions that are simply undoable.

**Potential impact.** Silent non-compliance — the athlete skips or improvises the unsupported session, which the gap detector (`js/replan.js`) then reads as missed training and can convert into a spurious plan shift. This is a usability/undoability failure, never an injurious one.

**Recommendation.** Capture available equipment at onboarding and gate/substitute the affected sessions (this connects to the missing general substitution mechanism).

**Trade-offs.** Requires a substitution table the app currently lacks, plus more session-selection branches. The onboarding header comment (`onboarding.js:4-6`) is explicit that the fixed Mon/Thu/Sat+Tue+Sun layout is a core invariant (KG-A3/KG-D3), and this is by design a single-user PWA for one climber with a known, fixed training setup — so per-user equipment capture is genuinely low-value here and would only earn its keep if this athlete routinely trained across venues with differing kit.

**Priority.** Low — basis: coaching-consensus.

### Limiter is detected but deliberately never feeds the plan — strengths/weaknesses change no prescription

**Observation.** PARTIALLY_CONFIRMED (the factual half is exactly right; the framing as a defect is not). `limiterReadout` (`js/limiter.js:42-93`) computes whether fingers sit below the target-grade norm and whether pulling is at the diminishing-returns ceiling, and emits an "elsewhere/fingers/pullups" verdict. But the module header states it plainly — "Informational only: changes no prescription" (`js/limiter.js:6`) — and the only consumer is the Profile card (`js/views/profile.js:10,98-107`, labelled "Changes no prescription" at `:97`). Grep confirms no prescription path imports the verdict: `program.js` and `loads.js` never reference it, and the two `today.js` "limiter" hits (lines 171, 814) are unrelated prose. So the app's single most coach-like diagnosis is surfaced and then ignored by the program.

**Why it matters.** On its face this looks like the tool diagnosing then doing nothing. But it is a **deliberate, documented, and evidence-aligned** decision, not an oversight: ADR-0011 chose informational-only, and CLAUDE.md's change-guidance explicitly instructs "never wire a limiter verdict into a prescription path." The rationale is sound — the module's own caveat (`js/limiter.js:91`) notes strength explains only ~17% (finger) / ~8–12% (pulling) of grade variance *at this ability tier and via this noisy benchmark-vs-norm comparison*, and the readout is anchored to norm tables the code itself rates medium/low confidence. (The evidence bundle's Winkler 2024 figure of 48–58% of bouldering-grade variance from half-crimp strength is a *tested-max* relationship, not the same as this weak benchmark-vs-norm signal — so it does not license auto-driving the plan.)

**Potential impact.** Some wasted adaptation and a minor trust cost (diagnose-but-don't-act). Against this: auto-biasing the block toward finger strength on a low-R² readout would *raise* finger-loading exposure for a ~3-yr intermediate — the exact injury profile ADR-0001 softens the plan for. G3-gates-everything cuts squarely in favour of keeping the limiter advisory.

**Recommendation.** If anything, let the verdict *nudge* emphasis within the existing session library behind an explicit one-tap "apply this focus" consent step (preserving the plan-adapts-with-consent posture). This is an optional enhancement, not a fix — the current behaviour is working as intended.

**Trade-offs.** Any wiring must stay conservative given the weak signal; the safest posture is the one the repo already chose.

**Priority.** Low — basis: weak. (The underlying limiter-diagnosis signal is weakly evidenced at this tier; the *decision to keep it advisory* is the correct, evidence-aligned call.)


---

## 6. Climbing Performance Development

This dimension asks whether the plan actually develops the qualities that move a ~3-yr V5-V6 intermediate toward V7/7b. The repo's strength-and-endurance engine is genuinely well-built and unusually well-documented (ADRs, a training-philosophy doc, a knowledge-gaps register, and a `coach-review.md` that already names several of these gaps). The findings below are breadth gaps and one measurement-validity bug, not durability failures — none clears the "High" bar reserved for real G3 risks, and in a couple of cases the natural "fix" pushes against the repo's deliberate, evidence-based injury-conservative posture.

### Power, contact strength, and coordination are thin for the actual (hybrid) athlete

**Observation:** The target user trains both disciplines (`focus === 'hybrid'`). Campus/explosive work appears in only two gated places: a low-intensity "Campus warmup ladders" block on Build Monday, gated `if (focus === 'boulder' && phase === 'build')` (js/program.js:342-344), and the Peak boulder-flavored Thursday `thu-limit-campus` (js/program.js:383-390). The Build-Monday campus never fires in hybrid mode; the Peak campus fires only on a Peak Thursday that is boulder-flavored, and since Peak is 2 weeks with weekly-alternating flavor, that is roughly once per cycle. Explicit dynamic drills (1-5-9, bumps, jump-catch) were deliberately removed in ADR-0001 and not replaced (program.js:381,388 comments). The verifier corrected the finding's framing: it is **not** true that power is "trained only incidentally." For a hybrid athlete, Build Thursday is forced to boulder flavor (styleFlavor, program.js:1212,1251) → `thu-limit` limit boulders at RPE 8.5-9.5 every Build week (program.js:394-399), and Peak adds `sat-proj-boulder`/`limit-boulder` (program.js:560-568). Limit/max-effort bouldering is the recognized primary vehicle for contact strength, RFD, and coordinated dynamic movement at this level; campus is the deliberately higher-risk advanced tier. So the real, narrow defect is an asymmetry: pure-boulder focus gets a warmup campus dose the hybrid athlete never sees.

**Why it matters:** Fast/dynamic force production and coordinated dynamic movement are distinct adaptations from the max-strength and power-endurance the plan covers well, and V6→V7 problems frequently gate on them. That said, the evidence bundle rates campus prerequisites and conservative scope as sound consensus and specifically supports gating dynamic finger loading behind a strength base for a <2-3 yr / sub-7a+ climber (Sjoman 2023 injury association for less-experienced climbers doing high-intensity fingerboard/campus).

**Potential impact:** A hybrid athlete could plateau on powerful, coordination-dependent problems relative to a boulder-focus user, purely because the low-intensity campus warmup skill dose is behind a gate they never trigger.

**Recommendation:** Make the existing low-intensity campus/warmup-ladder dose (RPE 7-8) available to hybrid boulder-flavored Build weeks, not just `focus==='boulder'`. Do not follow the reader's original "campus in Build regardless of flavor" recommendation — keep the existing pull-up/ladder readiness prerequisites and skin/finger checks. Limit bouldering remains the main power vehicle and already fires weekly.

**Trade-offs:** Any added dynamic finger loading raises finger/elbow/shoulder exposure for a 3-yr intermediate — exactly what ADR-0001's removal guarded against, and what G3-gates-G1 exists to prevent. The safe version is small: extend the warmup-ladder dose's gate, not the intensity.

**Priority:** Medium — basis: coaching-consensus. (A G1 progression asymmetry, not a safety issue; the reader's original "High" and the "power only incidental" framing were both overstated.)

### All fingerboard work is 20mm half-crimp/open-crimp only — no pinch, sloper, or drag

**Observation:** Every hangboard exercise hard-codes `grip: 'half-crimp + open-crimp'` on a 20mm edge: `hangboardExercise` (js/program.js:326) is the sole builder for all hangboard exercises across all phases (`buildMonHangboard`, program.js:334-336), and every proto pins `edge:'20mm'` (BASE_REPEATERS:144, BASE_MAX_INTRO:154, HANGBOARD.build:169, .peak:181, .taper:197). No pinch, sloper/open-drag, or 3-finger-drag grip is trained in any phase; the only pinch/sloper/drag strings in the code are in `STYLE_OPPOSITES` (program.js:255-260), which is the KG-A10 anti-style boulder-*selection* text cue, not a structured grip stimulus. `coach-review.md:77` (W7) states this verbatim and leaves it open. Confirmed. The verifier trimmed the finding's secondary "crimp-only stress concentration" injury angle: 20mm half-crimp+open-crimp at RPE 8-9 is precisely the low-pulley-stress loading the repo deliberately chose (full-crimp omitted, min-edge deleted per ADR-0005), so this is a breadth gap, not a durability risk.

**Why it matters:** Grip-type strength is position-specific and largely non-transferable — crimp hangs do not build pinch or sloper/compression strength, and boulder grades past V6 routinely gate on those grips. This is a real breadth limit on the strength program directed at the V7 goal.

**Potential impact:** Style-dependent plateau — the athlete keeps getting stronger on crimps while failing compression/sloper/pinch problems at the same grade, capping G1 progression.

**Recommendation:** Add at least a pinch block and an open-hand/sloper or 3-finger-drag hang as rotating grip options in Base/Build. These can carry a second added-kg benchmark field, or run as RPE-capped accessory hangs without a benchmark. The KG-A10 anti-style cue only nudges climbing selection, not fingerboard grip, so it does not close this.

**Trade-offs:** Adds a benchmark/UI field or an un-benchmarked accessory and slightly more Monday volume. Honestly tracked as open (W7), so this is a known scope decision rather than hidden drift.

**Priority:** Medium — basis: coaching-consensus. (Real gap for the V7/7b goal; not a safety issue and openly logged.)

### Limiter readout compares a 10-second benchmark against a 7-second norm table

**Observation:** The finger benchmark `maxHang20mm` is a 10-second max hang ("Max 10s hang on 20mm edge · find heaviest 10s hold (RPE 9.5 cap)" — buildRetestSession program.js:709 and post-goal program.js:695). `limiterReadout` compares `maxHang20mm / bodyweight` (js/limiter.js:49-53) directly against `FINGER_NORM_ADDED_PCT` (limiter.js:13), whose source table is explicitly a **7-second** hang (docs/benchmark-norms.md:41 header), and benchmark-norms.md:43 wrongly claims that table "is the same measurement this app's maxHang20mm benchmark tracks." There is no 7s↔10s conversion anywhere in the module. Confirmed. A maximal 10s hold uses lighter added weight than a maximal 7s hold, so the stored number is systematically low relative to a 7s norm, biasing the verdict toward "below → finger limiter." The verifier bounded the size: the "below" branch requires a full grade step (`GRADE_STEP_ADDED_PCT = 0.06`, limiter.js:26,53) while the 7s→10s load delta is only a few percent-of-BW, so the bias can flip a borderline athlete but is modest, not large.

**Why it matters:** The limiter feature exists to steer training focus. A false finger-limiter verdict would misdirect the athlete toward more finger volume — worse for G1 (their real limiter is more likely technique/tactics, per the doc's own ~17% R² finding) and, secondarily, more finger loading. The evidence bundle rates the underlying finger-norm→grade signal as only weakly predictive at this tier, which further argues against acting hard on it.

**Potential impact:** Mis-diagnosed limiter → misallocated emphasis toward fingers, both ineffective and injury-additive — though bounded, because the human must act on it manually.

**Recommendation:** Standardize the test duration — measure the benchmark at 7s to match the table, or apply a documented 7s↔10s conversion before comparing, or widen the "below" threshold to absorb the difference. Surface the hang duration in the UI so the comparison is honest, and fix benchmark-norms.md:43.

**Trade-offs:** Changing the test duration breaks historical benchmark continuity; a conversion factor is itself approximate. Blast radius is bounded — the limiter is informational-only and never mutates a prescription (limiter.js:2,6; CLAUDE.md's "never wire a limiter verdict into a prescription path").

**Priority:** Medium — basis: weak. (Genuine doc/code drift and a measurement-validity bug worth fixing; not a direct safety issue, and the reader's G3 framing was overstated.)

### Lock-off and single-arm/max pulling strength are not developed

**Observation:** The only dedicated pulling-strength exercise is bilateral weighted pull-ups (`pullupPrescription`, js/program.js:294-313; 5×5 Base:301, 5×3 Build:302, 5×2 Peak:306). No lock-off/isometric hold, offset pull, one-arm progression (frenchies, assisted one-armers), or explicit explosive pull exists — grep for lock-off/one-arm/frenchie/offset yields nothing. Partially confirmed. The verifier corrected two overstatements: (1) campus ladders are explicit explosive/contact-strength pulling (program.js:343, 388), so "power only incidental" is inaccurate; (2) this exact gap is already adjudicated in the repo — `coach-review.md:152-153` rates pulling strength "Good" and lock-off a "Gap (minor) — acceptable; add lock-off holds to Build pull-up top sets if route goals demand it," i.e. documented, deemed minor, conditionally deferred.

**Why it matters:** Lock-off and single-arm pulling are distinct climbing-specific qualities (holding a position to reach, controlling deadpoints) that concentric bilateral pull-ups don't build. But the repo's own research (benchmark-norms.md:87-99) shows pulling strength is a far weaker grade predictor than finger strength (R² ~0.08 sport / 0.12 boulder, and a 2024 systematic review found the 1RM weighted pull-up did not significantly track grade), so the leverage here is low.

**Potential impact:** A ceiling on tension- and lock-off-dependent moves on steeper terrain that raw bilateral pulling numbers won't lift — but a minor one relative to the finger and technique limiters.

**Recommendation:** Optionally add a lock-off/isometric or offset-pull progression as a Build accessory (it fits the `antagonist-block` card pattern), conditional on route goals demanding it — matching coach-review.md's own deferred plan. Not urgent.

**Trade-offs:** Minor added Monday volume; single-arm/explosive loading needs sensible progression to avoid overuse — added joint/tendon exposure for a 3-yr intermediate, exactly the loading the plan deliberately softens under G3.

**Priority:** Low — basis: coaching-consensus. (A genuine but minor content enhancement, already logged as minor/deferred; not a defect.)

### Technique and tactics reach the athlete only as optional, non-progressed drill text

**Observation:** The 19-drill catalog (js/drills.js) is real and well-built, but reaches the athlete only through opt-in surfaces: the Tuesday skill drill is `optional: true` ("pick one drill to focus on today", js/program.js:729), the Thu/Sat warm-up drill picker is an optional list (`WARMUP_DRILLS or null`, js/warmup.js:60), and the only dedicated tactical session is comp-peakType-gated Taper text (`thu-comp-touch-boulder`, program.js:412-420). No drill is assigned, progressed, rotated, or logged for quality. Confirmed. Two minor verifier corrections that don't change the substance: KG-A10 anti-style cues also inject technique text into Base/Build boulder Thu/Sat, and KG-A13 adds `sat-comp-sim-*` Peak Saturdays — but all remain text-only and non-progressed.

**Why it matters:** The repo's own research (benchmark-norms.md:122) concludes ~70-85% of Advanced-tier grade variance is technique/tactics/mileage/mental — none of which the strength engine trains. Delivering the highest-leverage quality for G1 as opt-in text with no accountability means it is the least-supported part of the plan. Notably, the KG-A9 verdict itself endorsed a "rotating drill-of-the-week," which shipped only as a manual optional pick — so this aligns with the repo's own stated-but-undelivered intent.

**Potential impact:** The athlete drills technique inconsistently or not at all, leaving the largest grade-limiting quality under-trained despite good content sitting in the catalog.

**Recommendation:** Assign a rotating drill-of-the-week as a non-optional Tuesday focus with a simple done/quality log, and consider a technique/tactics self-benchmark so the limiter readout isn't strength-only.

**Trade-offs:** Technique quality is hard to quantify and forcing a drill risks box-ticking; but even light accountability beats fully-optional text. The team made a documented, defensible "simple over clever" scope decision here (KG-A9 Closed).

**Priority:** Low — basis: coaching-consensus. (G3 durability not implicated; a defensible scope call that the finding's recommendation would partly reverse in line with the repo's own earlier intent.)


---

## 7. Injury Prevention

This is the dimension the repo takes most seriously, and it mostly earns the reputation: full-crimp hangboarding is omitted on solid biomechanical grounds (A2 pulley force ~36x higher in crimp than slope grip, Vigouroux 2006 — SUPPORTED/consensus), the min-edge-to-failure block was deleted as an unvetted exposure, Peak stimuli are softened for exactly the <6yr/7a+ profile that Sjoman et al. 2023 associates with fingerboard injury, campus work is gated behind a real strength prerequisite, and the team correctly declined to bolt on an ACWR model that the literature has largely debunked. The documentation is unusually candid about what is consensus versus proven. That said, the audit surfaced one genuine unenforced-guardrail drift on weekly finger density, one program-balance gap in the antagonist block, and three smaller design re-evaluations that are correctly self-flagged rather than defects. They are ordered below by corrected priority.

### ADR-0006's ">=72h between high-intensity sessions" guardrail is documented but never enforced

**Observation:** Session slots are assigned purely by weekday (`DOW_TO_SLOT`, js/program.js:122-130) with no spacing logic anywhere in `program.js` or `monitoring.js`. On the fixed Mon/Thu/Sat schedule this puts hard finger/power days 48h apart by construction. A Build boulder week runs Thu limit bouldering RPE 8.5-9.5 (`thu-limit`, js/program.js:392-400) then Sat boulder triples RPE 8.5-9.5 (`sat-boulder-triples`, js/program.js:604-615), 48h apart. A Peak boulder week is worse: Mon 7-53 hangs + weighted pull-ups RPE 9-9.5 (`HANGBOARD.peak`, js/program.js:180), Thu limit boulders + campus RPE 9-9.5 (js/program.js:387-388), Sat project boulders RPE 9-9.5 (js/program.js:565) — three near-maximal finger-loading days at 72/48/48h. ADR-0006:25 verbatim sets the guardrail ">=72h between high-intensity power sessions," but nothing checks it. README:62 separately asserts "48-72h tendon recovery between hard days," presenting 48h as adequate — a real internal disagreement with the ADR's stricter number. Note the verifier's fair tempering: on a fixed 3x/week schedule with three hard days, >=72h between all of them is *mathematically impossible* (Thu->Sat and Sat->Mon are always 48h), so this is a structurally unsatisfiable guardrail requiring a design change, not merely a missed check. The other half of the same ADR-0006:25 rule (<=1 lactic session/week) *is* honored in code (30/30 confined to Peak-Thu, js/program.js:477-490); the finding correctly targets only the spacing half. Exposure is also bounded — Peak is fixed at 2 weeks, `weekFlavor` alternates so the three-near-max-finger week recurs ~1x/cycle, and reactive readiness/pain gates exist.

**Why it matters:** This athlete (V5-V6/7a, ~3yr) is precisely the profile ADR-0001 cites Sjoman et al. 2023 (PMID 37550103) for — the injury-association direction of that study (less-experienced climbers more likely injured by high-intensity fingerboard) is confirmed and correctly represented in the repo. ADR-0001 softened within-session density but left weekly finger-loading density untouched, and a Peak boulder week with two 48h gaps between near-maximal finger days is exactly the aggregate the ADR-0006 guardrail was written to prevent. Consensus (Horst/PhysiVantage) puts hard hangboard recovery at 48-72h precisely because tendon blood supply is poor and back-to-back high loads risk reactive tendinopathy.

**Potential impact:** Elevated pulley/flexor overuse risk in Build and especially Peak, where the failure mode — a finger injury — wipes out the entire cycle. That is the exact G3-gates-G1/G2 scenario the project says it prioritizes.

**Recommendation:** Add a real spacing check: when two high-intensity finger/power sessions (limit-boulder, campus, 30/30, Peak hangboard) would land <72h apart, down-shift one (e.g. Sat -> capacity/PE rather than a second limit day, or auto-apply the readiness "Lighter" levers). Because the schedule makes strict >=72h unsatisfiable with three hard days, the durable fix is a design choice — cap boulder-flavored Peak/Build weeks at two near-maximal finger days, or accept 48h between two of them but never three at RPE 9.5. At minimum, surface a weekly-finger-density warning in the monitoring layer, which currently has no proactive density guard (`readinessTrend`/`rpeDrift`/`retestTrajectory`/`painCheckIn` only; `painCheckIn` is reactive same-day). Reconcile README:62 with ADR-0006:25 — they disagree on whether 48h is acceptable for high-intensity work.

**Trade-offs:** Costs one hard limit/power exposure per week in boulder-flavored Build/Peak weeks; the athlete gives up peak stimulus for lower injury risk — the trade ADR-0001 already endorsed. The change touches the fixed weekday->slot mapping, so it is a genuine architectural edit rather than a one-line pass.

**Priority:** High — basis: coaching-consensus.

### Antagonist block is pull-dominant with only one pressing movement and no vertical/scapular press

**Observation:** `ANTAGONIST_BLOCK` (js/program.js:209-214) contains push-ups (the only true press), "Inverted rows / band cactus" (line 211), wrist extensor curls, and farmer's carry; `TUE_ANTAGONIST_BLOCK` (js/program.js:239-242) is only wrist extensor curls + band cactus, with no pressing at all. Monday pairs these with weighted pull-ups 5x3/5x2 (js/program.js:337-341). So across a week the athlete gets a single pressing exercise (push-ups, Monday only) against three climbing days plus weighted pull-ups — everything else is pulling, and there is no overhead/vertical pressing anywhere. Those code facts hold (PARTIALLY_CONFIRMED). Two corrections sharpen the reader's claim: (1) line 211 is an either/or — "Inverted rows / band cactus" — and band cactus is external rotation (genuine prehab), so the athlete can complete the item with *zero* pulling; it is an oddly-paired option, not forced added pull volume as the finding's title implies. (2) Rotator-cuff external rotation is already covered (band cactus + the Y-T-W warm-up in js/warmup.js:8), so the gap is specifically pressing/scapular strength, not cuff. The repo labels the whole block honestly: training-philosophy.md:57 calls antagonist work "coaching consensus; no controlled trial in climbers."

**Why it matters:** Climbing is overwhelmingly a pulling/closed-chain sport, and unopposed pull dominance is coaching-associated with anterior-shoulder posture and medial-elbow overuse. A block named "antagonist" that offers a horizontal pull as one option and only one pressing movement does not meaningfully balance the weekly pull:push ratio. Important calibration from the evidence bundle: the injury-prevention premise here is weak — antagonist strengthening alone is not shown to prevent injury, there is no climber RCT, and "imbalance causes injury" is sparsely supported (cuff-ER prevention RCTs exist only in adjacent overhead sports like swimming). The highest-evidence prehab (cuff ER) is already present. So omitting a vertical press/serratus foregoes a modestly-and-weakly-evidenced addition rather than creating a hazard.

**Potential impact:** Cumulative shoulder-impingement and medial-epicondylalgia risk over a full cycle — a slow-onset pattern the plan does little to counter, but with genuinely uncertain magnitude given the thin evidence base.

**Recommendation:** Reclassify inverted rows out of the "antagonist" framing (it is not antagonist work), add a genuine pressing progression (overhead/dip or pike push-up) plus a scapular push (serratus), and dose pressing 2x/week (Monday full item + a Tuesday item) to move the weekly pull:push ratio toward balance.

**Trade-offs:** Adds ~5-10 min to Monday and one Tuesday item; the cost is trivial and the direction is well-supported, but because the benefit is consensus-level and not RCT-backed, the expected injury-reduction magnitude is uncertain — this is program completeness and balance, not a safety fix.

**Priority:** Medium — basis: coaching-consensus.

### Fingers never receive an intensity deload; deload/retest weeks hold near-max hangboard load

**Observation:** By design (ADR-0003) deloads cut volume only: `applyDeloadVolume` (js/program.js:773-799) scales `prescribedSets` x0.6 and annotates text but never touches kg, and `Loads.resolveEffective` has no deload parameter at all (module comment js/loads.js:2-4). So every Monday — including the week-4 deload and, for Thu/Sat, retest weeks — still prescribes hangboard at phase intensity (Build 0.87-0.92 at js/program.js:172, Peak 0.92-0.96 at :185, Taper 0.90-0.94 at :200). The only Monday without near-max hangs is the single retest Monday, which instead stacks three maximal tests (`buildRetestSession`, js/program.js:702-715). All literal claims verified (PARTIALLY_CONFIRMED). The framing overstates the exposure, however: the deload *does* cut near-max finger exposure, just via sets not %. On a deload Monday Build hangboard drops `prescribedSets` 2->1 and Peak 3->1 (js/program.js:167,179,783-784), so with only one dedicated finger day/week a deload week is ~1 set of ~4 near-max hangs — a real reduction in tendon time-under-load, not "no scheduled reprieve." An opportunistic intensity cut also already exists via the ADR-0015 readiness "Lighter" x0.85 gate (js/loads.js:27), just not scheduled.

**Why it matters:** Volume-cut/intensity-hold is defensible for neural strength retention. But the evidence bundle is explicit that this pattern *is* the consensus deload+taper approach and "the safest of the available options... physiologically sound" for a tendon-limited climber — drop time-under-load on slow-turnover connective tissue while preserving the neuromuscular signal. Cutting intensity is the one taper/deload manipulation the literature says reliably degrades outcomes, so the recommendation to down-shift finger % runs mildly *against* consensus.

**Potential impact:** Low. Cumulative finger-tendon load has a genuine, if softer, reprieve every 4th week already; the theoretical concern is only that longer (up to 40-week) cycles hold phase intensity on every non-deload Monday.

**Recommendation:** Optionally consider a light-intensity finger week (repeaters at reduced % or an intensity down-shift) on the deepest deload of long cycles only. This is a documented decision (ADR-0003), so treat it as a re-evaluation, not a bug — and weigh it against the taper literature that favors holding intensity.

**Trade-offs:** An intensity deload trades a little strength retention for tissue recovery; reasonable coaches differ, and the current design is the evidence-endorsed pattern. Not a G3 durability defect.

**Priority:** Low — basis: coaching-consensus.

### Default 12-week cycle runs five consecutive loaded weeks into a single-week comp taper

**Observation:** Confirmed by running `buildPhasePattern(12,'comp')` against the code: peak=2, taper=1, remaining=9, build=round(9*0.33)=3, base=6 (js/program.js:52-59). `_composeSingle` (js/program.js:76-88) yields W1-3 base, W4 base-deload (`(i+1)%4` at i=3), W5 base, W6 base retest+deload (forced at line 83), W7-9 build (the `(i+1)%4` counter resets per-phase at line 79, and a 3-week block never reaches i=3, so Build carries *no* deload), W10-11 peak, W12 taper. So W7->W11 are five straight loaded weeks (Build + Peak) discharged by one comp taper week. The retest-Monday-only volume-cut exemption is real (js/program.js:1000: `env.deload && !(env.retest && env.slot === 'mon-main')`), so W6 Thu/Sat *do* get cut (the older "retest week isn't cut at all" claim is thus superseded). All file:line claims hold (PARTIALLY_CONFIRMED), but the interpretation is overstated: two of the five weeks are Peak — the intentional loaded culmination you cannot deload inside by definition — so the only real gap is a 3-week Build with no intra-block deload, and a 3-week block is too short to warrant the 3:1 rule firing. Five loaded weeks between deloads also sits right at the surveyed norm (Bell et al. 2023: coaches deload every 5.6 +/- 2.3 weeks).

**Why it matters:** The fitness-fatigue model needs fatigue to dissipate for peak expression, so in principle five loaded weeks into a 1-week taper is at the short end. But the recommendation to insert a half-deload at the Build->Peak boundary is weakly supported and arguably counterproductive: Coleman et al. 2024 found a mid-program 1-week deload slightly *reduced* strength gains, and the peaking literature says you accumulate then taper, not deload immediately before peak expression. The 1-week comp taper it feeds into is the best-evidenced decision in the repo (ADR-0007, taper band [0.87,0.90] at js/program.js:312, volume cut, mandatory rest-day-before-goal; a 1-2 week taper is the meta-analytic optimum), so the "fatigue not dissipated" underperformance argument is thin.

**Potential impact:** Marginal. Some risk the athlete arrives fit but not fully fresh in longer/denser configurations, but the ADR-0014 readiness-trend early-taper signal already exists as an escape valve for exactly the fatigue case this worries about.

**Recommendation:** Treat as a periodization re-evaluation, not a durability fix. If anything, prefer the existing readiness-trend early-taper trigger or a slightly longer default cycle over inserting a pre-Peak half-deload, which the evidence suggests could cost gains.

**Trade-offs:** Any inserted unload costs a hard week in an already-tight 12-week calendar; largely a cross-dimension periodization concern, noted here for completeness.

**Priority:** Low — basis: coaching-consensus.

### No cumulative finger-load ceiling; the +5% cap is per-session only while hangboard recurs weekly

**Observation:** `MAX_SESSION_PROGRESS = 1.05` (js/loads.js:265) caps any single session's upward move at +5% of the decayed previous actual (js/loads.js:176-186), and the Base volume ramp is gated to aerobic sessions only (`/^aerobic/i.test(session.energySystem)`, js/program.js:856) so it never scales hangboard kg. There is no weekly/monthly cumulative cap, and `monitoring.js` has no signal watching kg rise-rate (`rpeDrift` fires on RPE *above* target — the opposite direction; `retestTrajectory` fires on flat/down retests). So hitting the per-session cap repeatedly permits ~+5%/week compounding in principle, governed only by self-reported RPE. Code facts verified (PARTIALLY_CONFIRMED), but the feared runaway is overstated: +5% is only reached when `autoAdjust` returns x1.05, which requires `previousAvgRpe < rpeRange[0]` (js/loads.js:46-47) — i.e. the athlete rated the load genuinely too easy. Targets-hit alone gives only +2.5% (js/loads.js:264). The seed is the previous *actual* kg (js/loads.js:162), not the prescription, so a week without a real load increase resets the base lower. To sustain +5%/week the athlete must keep reporting sub-range RPE, and the moment load catches up to capacity RPE enters range and the engine drops to hold-or-+2.5%. That is autoregulation working as designed.

**Why it matters:** The per-session cap is a genuine, well-designed safety feature — it correctly bounds the `autoAdjust` x readiness multiplier stacking (preventing x1.05 auto-adjust x x1.05 "Push" readiness from producing +10.25% jumps). The residual dependency is "athlete RPE honesty," but that underpins the *entire* autoregulation chain, not finger loads specifically, so it is not a finger-specific hole. Note `clampToBenchmark` is a deliberate no-op for positive added-weight benchmarks (js/loads.js:251-252) to allow PRs past a stale benchmark, so there is intentionally no hard added-weight ceiling.

**Potential impact:** Low in typical use — the +2.5% targets-hit floor and in-range RPE hold dominate. A motivated athlete chronically under-reporting RPE could ramp fingers faster than tissue tolerates over a block, but that is a self-report-integrity edge case, not an open-loop hazard.

**Recommendation:** Optionally add a cheap soft cumulative guard via the existing monitoring layer — e.g. flag if maxHang-derived load has risen >~10% over 3-4 weeks — rather than only per-session bounding. Enhancement, not a fix.

**Trade-offs:** Adds a monitoring signal to maintain; likely unnecessary given RPE governance and the conservative default progression. Does not rise to a G3 safety defect.

**Priority:** Low — basis: coaching-consensus.


---

## 8. Coaching Logic

This dimension examines the day-to-day autoregulation and recovery-week logic — the part of the app that acts as a "live coach" adjusting loads session to session. The repo is unusually honest here: its own code comments and ADRs disclose most of the limitations below before an auditor could find them. That candor is a genuine strength and is noted where it applies. The four findings are internal-logic quirks and evidence-depth caveats, not safety failures — all direction-of-effect choices are conservative and G3-aligned.

### Deload weeks silently progress finger/pull load +2.5%, contradicting the "deload = intensity held" invariant

**Observation.** CLAUDE.md and ADR-0003/0004 state deload cuts volume and holds intensity ("kg is not scaled — `Loads.resolveEffective` has no deload parameter at all"). The literal wording holds — there is genuinely no deload kg-scaling parameter. But the always-on progression engine still fires on a deload week: the targets-hit step bumps kg ×1.025 (`TARGETS_HIT_PROGRESS`, `js/loads.js:264`) whenever prior avg RPE was in range AND prior sets met *today's* prescribed sets (`js/loads.js:153-161`). On a deload week `applyDeloadToExercise` cuts hangboard/pullup `prescribedSets` ~40% (`js/program.js:783-784`; e.g. Build max-hang 2→1, `js/program.js:167`), so the previous full-volume session trivially clears the reduced deload target in `targetsHit` (`js/loads.js:58-63`) → +2.5% fires. `resolveForDay`/`resolveEffective` have no deload awareness (`js/loads.js:125,214-235`), and the only progression guard, `holdProgression`, is set solely on amber pain (`js/views/today.js:973`), never on deload. The asymmetry is explicit in code: the comment at `js/loads.js:56-57` guards the deload→full-week direction (ADR-0009), but the full-week→deload direction is unguarded. The verifier sharpens this: `autoAdjust` (±5%, `js/loads.js:44-49`) is equally deload-unaware, so intensity is never literally "frozen" on a deload week regardless of this step — this is a tension with the *intent* ("intensity held during recovery"), not a violation of the literal "no deload parameter" wording.

**Why it matters.** Intensity on the fingers — the highest injury-cost tissue — is nudged up during the recovery week whose entire purpose is to dissipate fatigue. It is a real, reachable contradiction between the stated 3:1 recovery intent and the progression engine.

**Potential impact.** The deload's finger-recovery signal is partially undercut on every deload. Magnitude is bounded and small: +2.5%, hard-capped at +5% (`MAX_SESSION_PROGRESS`, `js/loads.js:181,265`), while volume is simultaneously cut ~40% — net deload finger tonnage ≈ 0.6 × 1.025 ≈ 0.62 of the prior week, so the recovery stimulus is overwhelmingly preserved. The bump is also earned progression applied one week early (it seeds the next full week), not phantom double-counted volume. No plausible single-nudge injury pathway.

**Recommendation.** Thread a deload/retest flag into `Loads.resolveForDay` and suppress the targets-hit +2.5% step on deload weeks (hold, don't progress), mirroring the guard ADR-0009 already applies in the reverse direction and the amber-pain `holdProgression` path.

**Trade-offs.** Threads one more flag through the load door; negligible complexity for restoring a stated invariant. The volume-cut-with-intensity-held policy this protects is itself well-grounded consensus (evidence bundle, periodization: 41–60% volume reduction with intensity maintained is the standard recovery/taper pattern; support: consensus).

**Priority.** Medium — basis: software-only.

### The autoregulation layer's magnitudes (±5% RPE step, readiness ×0.85/1.05, −3%/wk decay, +2.5% targets-hit, +5% cap) are app-invented and unvalidated

**Observation.** Every autoregulation *constant* is an app convention. `computeReadinessMultiplier` returns ×1.05/1.00/0.85/0 at avg cutoffs 4.5/3.5/2.5 (`js/loads.js:21-29`), directly preceded by a comment labelling these "an APP CONVENTION, UNVALIDATED ... the exact numbers are not evidence" (KG-C7, `js/loads.js:14-20`). `autoAdjust` is a flat ±5% thermostat (`js/loads.js:44-49`) with the comment "the 5% magnitude is not a cited finding" (`js/loads.js:42-43`). Layoff constants (grace 10d / −3%/wk / floor 0.85, `js/loads.js:257-259`) carry "direction is evidence-backed, exact numbers are not" (`js/loads.js:255-256`). `TARGETS_HIT_PROGRESS=1.025` / `MAX_SESSION_PROGRESS=1.05` (`js/loads.js:264-265`). Only the pain-gate boundaries are RCT-extrapolated (Silbernagel; `js/monitoring.js:119-121`), and even that is extrapolated from Achilles tendinopathy, not fingers. This is a characterization of evidence depth, not a code defect — the values are implemented correctly and match the ADRs.

**Why it matters.** The DIRECTION of each rule is defensible consensus, and the evidence bundle confirms this at every point: RPE autoregulation is valid (autoreg topic: r=0.88 convergent validity, SUPPORTED/consensus); down-regulating on poor readiness is sound (Saw 2016, SUPPORTED/consensus); +2.5–10% once targets are hit is the NSCA 2-for-2 rule (SUPPORTED/consensus); layoff-decay guards the recognized pulley re-load injury trigger (SUPPORTED/weak). But the MAGNITUDES are uncited guesses presented with kg precision — the app's day-to-day "coaching" is a stack of plausible numbers, so its autoregulation depth is thinner than the 0.5 kg step precision implies. The bundle separately confirms two limits the numbers don't reflect: the readiness *formula* (mapping a 3-item questionnaire to a fixed multiplier) has NO_EVIDENCE and Saw et al. caution questionnaires are "status indicators … only," not prescription formulas; and RPE reliability degrades sharply below failure (RIR error ~2 reps at RPE 9 vs ~5 at RPE 5), yet the same ±5%/+2.5% thermostat governs sub-maximal ARC/60-60 sessions without widening tolerance.

**Potential impact.** False precision in suggested loads. Not dangerous — the readiness and layoff multipliers are downward/conservative, the ±5% step is small and self-correcting session to session, and the +5% cap deliberately bounds upside stacking (the bundle notes this prevents ×1.05 auto-adjust stacking with ×1.05 readiness into a +10.25% jump). The residual concern is coaching effectiveness (G1) and over-trust, not injury (G3). Notably there is no per-athlete tuning mechanism despite the code repeatedly promising it.

**Recommendation.** Keep the honest labeling, but close the loop the comments themselves promise ("Tune them from the athlete's own logs via the KG-A4 monitoring signals" — `js/loads.js:18-19`): use the accumulating readiness/RPE/retest history to fit the multipliers to this athlete rather than leaving them permanently at invented defaults. `monitoring.js` surfaces advisory signals today but nothing auto-calibrates these constants. For the sub-maximal regime specifically, consider suppressing or widening the RPE thermostat below the near-failure zone where RPE is a noisy input.

**Trade-offs.** Self-tuning adds real complexity and needs enough logged history to be stable; until then the invented defaults must stand.

**Priority.** Medium — basis: speculative.

### Deload cut and readiness-"Lighter" scaling stack multiplicatively on climbing volume with no combined floor (~×0.51)

**Observation.** PARTIALLY_CONFIRMED: the code behaves exactly as described; the severity framing was overstated. On a deload week that is also a "Lighter" readiness day both passes fire — deload-volume-cut scales climbing `prescribedTarget` ×0.6 (`js/program.js:1000-1001` → `applyDeloadVolume`:773-778 → `applyDeloadToExercise`:786-788; `scaleTarget` default 0.6 at `js/program.js:764`), then the readiness-gate pass scales the already-cut target ×0.85 (`js/program.js:1027-1036` → `applyReadinessLighter`:916-925, `READINESS_LIGHTER_MULTIPLIER`:905). Net ≈ ×0.51. The "exactly one volume-cut pass may fire" contract (`js/program.js:966`) covers only deload/taper/forced-cut; the readiness gate is a separate later pass, and ADR-0015 explicitly intends this composition (`js/program.js:975-976`). The one caveat that holds fully: there is no *combined* floor — only `scaleTarget`'s per-exercise minimum of 1 rep / 5 min (`js/program.js:767,770`).

**Why it matters.** Two independent down-regulators compound without a shared floor, and the ~50% reduction's reasoning is split across two separate notes, hurting clarity.

**Potential impact.** Minor. The per-exercise floor bounds the worst case: a value-2 limit-boulder session (`js/program.js:387`) floors at 1 (a 50% cut, not a collapse to zero); larger targets stay substantial (14→8→6). Both regulators are downward-only, so compounding produces *less* volume on a week that is simultaneously a scheduled recovery week and a poor-readiness morning — the conservative, G3-aligned direction with no injury exposure. The cost is a possible near-token stimulus on a low-volume day (small G1 cost) plus a two-note clarity nit.

**Recommendation.** Either treat readiness-Lighter as mutually exclusive with an already-cut week, or apply a combined-cut floor (e.g. never below ~0.5 of the template) and surface a single merged note explaining both reductions.

**Trade-offs.** ADR-0015 deliberately chose composition for consistency with the kg chain; changing it trades that stated consistency for a bounded stimulus. This is intended design, not a bug.

**Priority.** Low — basis: software-only.

### RPE-drift monitoring signal and the autoAdjust thermostat react to the same input at cross purposes

**Observation.** PARTIALLY_CONFIRMED: file:line claims hold, "defect" framing overstated. `autoAdjust` returns ×0.95 when prior avg RPE exceeds the range top (`js/loads.js:46`). Separately, `rpeDriftSignal` fires on two consecutive above-range sessions with `kgNotIncreased = latest.kg <= prev.kg` (`js/monitoring.js:82-85`) and tells the athlete to "confirm with a micro-retest before adjusting anything" (`js/monitoring.js:89`). So the athlete can see a "don't adjust, go retest" banner next to a suggested-kg number the engine has already moved 5% downward. The verifier corrects two prongs of the original framing: (1) "self-fulfilling" is inaccurate — `kgNotIncreased` legitimately screens OUT the benign "RPE high because load was pushed up" case (the engine raises kg via targets-hit +2.5% and the +5% cap, `js/loads.js:158,181-185`, plus manual override), so it is redundant only within the narrow subpopulation of an athlete passively following the thermostat; (2) this is intentional layered design, not conflict — `js/monitoring.js:1-8` states the signals are "reactive exception-catcher signals layered on top of the already-implemented proactive system," where the thermostat does the routine nudge and the drift signal escalates to a benchmark micro-retest (ADR-0012) only after two sessions of failed self-correction. The thermostat's own reason string points to the same micro-retest for the mirror case (`js/loads.js:137-138`), so the two systems converge rather than contradict.

**Why it matters.** The residual truth is a copy-clarity issue: showing "don't adjust, retest" beside a suggested load that visibly changed can read as mixed messaging to the athlete, even though the two subsystems are doing complementary jobs (routine small nudge vs. escalate-to-re-baseline).

**Potential impact.** Possible momentary confusion or double-response (accept the lower load *and* burn a session on a micro-retest). No safety dimension — both paths are load-neutral or downward.

**Recommendation.** Reconcile the copy so the two systems tell one story — e.g. have the drift banner acknowledge the engine's own auto-reduction ("load already eased; if RPE stays high, confirm with a micro-retest") rather than the bare "before adjusting anything."

**Trade-offs.** Slightly more coupling between `monitoring.js` and `loads.js`, which are today cleanly independent pure functions; the fix can stay at the copy level to avoid that.

**Priority.** Low — basis: software-only.


---

## 9. Software Design

This is an unusually well-documented single-athlete codebase: the domain is layered cleanly (views → storage → sync), decisions are captured in ADRs, and load-math constants in `js/loads.js` are named, grouped, and evidence-labeled. The findings below are code-organization and maintainability observations only — none touches a prescription value, load-math result, or the G3 durability path, and none is a correctness or safety defect. They are ordered by corrected priority.

### Domain logic leaked into the Today view (micro-retest staleness, readiness-label mapping)

**Observation** The Build-Monday micro-retest staleness rule is an inline arrow-IIFE inside `renderToday` (`js/views/today.js:516-524`): it reads `Storage.get().benchmarks`, does `history.filter(e=>e?.date).map(e=>e.date).sort().pop()`, falls back to `localIso(new Date(bm.updatedAt))`, and compares `daysBetween(anchor,date) > Warmup.MICRO_RETEST_STALE_DAYS` — only the 28-day threshold is extracted (`js/warmup.js:35,63`). The readiness key→gate-label mapping is inlined at `js/views/today.js:489` (`rdKey==='lighter'?'lighter':rdKey==='rest'?'suggestRest':null`). This is PARTIALLY_CONFIRMED: the staleness IIFE is the genuine part of the finding — it is untestable without mounting the view and can drift from `warmup.js` where the rest of that logic lives. Two corrections tighten the reader's framing. (1) The readiness mapping is thin translation glue, not a domain decision: the actual tiering lives in `Loads.computeReadinessMultiplier`, which emits the stable `key`; line 489 merely renames `'rest'`→`'suggestRest'` into `Program.build`'s label vocabulary, and the inline comment at `today.js:486-488` documents this as a deliberate gate-on-key-not-label choice — moving it is cosmetic. (2) The harder domain decision, the micro-retest applicability gate (`today.js:516-517`), already correctly delegates to `Program.isBuildRunStart`; only the storage-shape plumbing (which date is the freshness anchor) is inline.

**Why it matters** CLAUDE.md's own layering diagram puts views as a "pure read of plan + math," not owners of math. Deciding when a benchmark is stale enough to warrant a micro-retest is a training-domain rule; sitting in the presentation layer, it is invisible to `program.js`/`warmup.js` and can silently diverge from the threshold and history-shape conventions those modules own.

**Potential impact** A change to staleness semantics or the benchmark-history shape must be made in the view and can't be unit-tested in isolation, inviting inconsistency with the domain modules.

**Recommendation** Move the staleness computation into `warmup.js` (e.g. `Warmup.isMicroRetestDue(benchmarks, dateISO)`) so the view calls rather than computes. The readiness-label rename is low value to relocate; leave it or fold it into `loads.js` only opportunistically.

**Trade-offs** Minor churn and slightly more surface in `warmup.js`; no behavioral change if extracted faithfully.

**Priority** Medium — basis: software-only.

### Inconsistent magic-number discipline: some constants named and cited, others inlined and duplicated

**Observation** CONFIRMED. `js/loads.js:255-265` models good practice — `LAYOFF_GRACE_DAYS`/`DECAY_PER_WEEK`/`FLOOR` and `TARGETS_HIT_PROGRESS`/`MAX_SESSION_PROGRESS` are named, grouped, and each block carries an ADR plus evidence-status note. `program.js` does not follow suit: the build-fraction `0.33` is inlined verbatim at three sites — `js/program.js:57` (`_singleBlock`, `Math.round(remaining * 0.33)`), `:69` (`_doubleBlock` build1), and `:71` (build2); `densityRest` hardcodes `baseSec` 240, the 5s/week step, and the 150s floor inline at `js/program.js:365-368` (`Math.max(150, baseSec - 5 * (4 - weeksLeft))`); `weekFlavor`'s odd/even rule is inline at `js/program.js:117-118`; and `DOUBLE_BLOCK_THRESHOLD` is named at `js/program.js:17` but its value 20 carries only a coach-consensus comment, no citation.

**Why it matters** The base/build split is a core structural parameter of every generated cycle, and duplicating it across three sites means a future ratio change can update one or two and silently desync single- vs double-block cycles. More broadly, mixed discipline makes it hard to tell deliberate tunable parameters from incidental literals — which slightly undercuts CLAUDE.md's "values are deliberate, evidence-based" claim, though only by leaving the values undiscoverable, not by contradicting them (the evidence bundle notes ADR-0002 itself concedes the exact 20-week cutoff is "thin," and the densityRest 5s/week increment is a fine-grained coaching convention, not a validated figure — support level: weak).

**Potential impact** An edit to the base/build ratio touches one or two of three sites and desyncs the block builders. The hazard is modest — all three `0.33` sites sit within ~15 lines of one small file — so this is discoverability, not a live bug.

**Recommendation** Extract `BUILD_FRACTION = 0.33` once, shared by both `_singleBlock` and `_doubleBlock`, and lift the `densityRest` parameters to named constants alongside the `loads.js`-style block, each with a one-line provenance note.

**Trade-offs** Trivial refactor, no behavior change.

**Priority** Medium — basis: software-only.

### Coaching knowledge is hardcoded as branching JS in program.js, not editable structured data

**Observation** PARTIALLY_CONFIRMED. The factual core is accurate: the session library — `buildMonHangboard` (`js/program.js:330`), `buildThuMain` (`js/program.js:377-523`), `buildSatMain` (`js/program.js:540-680`), plus the KG-A13 comp-format variants — is ~350 lines of phase/flavor/peakType if-else with inline prescription literals, and only a minority is extracted to data (`BASE_REPEATERS` :137, `BASE_MAX_INTRO` :147, `HANGBOARD` :161, `SIXTY_SIXTY_EXERCISE` :375). `PRESCRIPTION_PASSES` (:982) is correctly cited as the extracted-pipeline model. But the High-priority defect framing does not hold, which is why this is downgraded to Low. (1) The recommendation runs against the repo's own "simple over clever" principle: a declarative `(phase,slot,flavor,peakType)` registry plus a lookup engine is *more* machinery, and the current linear if-else is trivially readable and AI-navigable. (2) The builders are not pure data — they carry genuine logic: comp-vs-trip/project variants (e.g. :407, :496, :550, :650), `densityRest(weeksLeft)` interpolation wired per-session (:480, :603, :634), and deliberately-shared constants (`SIXTY_SIXTY_EXERCISE` used at :474 and :536 to prevent drift). Tabling this relocates complexity into sparse rows plus special-case handlers rather than removing it. (3) The "a coach/athlete can't tune without JS" motivation is a strawman for a single-user, agent-authored app whose whole point is a fixed evidence-based plan tied to ADRs — there is no non-programmer authoring workflow in scope, and CLAUDE.md explicitly rules dev-time friction out as a cost. (4) Data would still live in `.js` ES modules and still require `generate-sw.mjs --bump` + `generate-schedule.mjs`, so the cited tooling burden does not decrease.

**Why it matters** The most frequent kind of change (prescription tuning) does touch control flow rather than isolated values, and ADR→code traceability requires reading the if-else. That is a real ergonomic cost — but a bounded one in a linear, well-commented file.

**Potential impact** Some regression surface on prescription tweaks; no correctness or safety implication.

**Recommendation** Continue the partial extraction opportunistically (as with the shared 60/60 constant) where a value is genuinely duplicated, but do not build a config language or a general registry engine — the marginal cases (KG-A13 swaps, hybrid Build mixing) resist it.

**Trade-offs** A full table-driven refactor carries real regression risk against a browser-only smoke suite and adds machinery the repo philosophy deliberately avoids; partial extraction is the pragmatic stopping point.

**Priority** Low — basis: software-only.

### Test suite is browser-only with no CLI runner; sync, charts, and service worker partially uncovered

**Observation** PARTIALLY_CONFIRMED. The infrastructure facts hold: `tests/harness.js:5` states outright there is "no CLI runner" and has no headless entry, the suite is 17 browser-mounted case files loaded by `tests/index.html`, and `drawLineChart` (`js/views/log.js:532`) and `sw.js` are genuinely untested. But the finding's central claim — that `mergeRemote`/sync is "the least tested" and its recommendation to add DOM-free tests for the `mergeRemote` conflict/prune/`activePlanId` cases — is refuted by existing coverage: those exact tests already exist. Phantom-plan pruning plus keep-offline-plan is `tests/cases/10-phase-regressions.js:79` (S4, the very invariant CLAUDE.md flags); LWW remote-wins/local-wins/remote-add at :170/:190/:218; `activePlanId` syncs from remote at :245; `globalBenchmarks.history` round-trip at `tests/cases/15-monitoring.js:179`; `sync.js` retry backoff at `10-phase-regressions.js:265`. The only truly uncovered piece is the Firebase-coupled orchestration (debounce/`onSnapshot` wiring, and the `suppressEmit` no-emit loop guard is not asserted by name), which the suite itself flags as needing a Firebase mock (`10-phase-regressions.js:29`).

**Why it matters** CLAUDE.md flags `mergeRemote`'s invariants as easy to break with silent data consequences. The reassuring finding here is that the pure, high-consequence merge logic is in fact tested; the residual gap is the Firebase orchestration around it, plus canvas rendering and the SW update flow — and a browser-only runner cannot gate CI without a headless harness.

**Potential impact** A regression in the Firebase debounce/`onSnapshot` wiring or the unasserted `suppressEmit` guard could still slip through; chart-rendering exceptions surface only in manual use.

**Recommendation** Add a named assertion for the `suppressEmit` no-emit loop guard and a faked-Firestore test of the debounce/merge orchestration; optionally add a minimal headless (jsdom or a Playwright run of the existing page) entry so the suite can gate CI. The broad "add mergeRemote unit tests" recommendation is largely already satisfied.

**Trade-offs** jsdom would introduce a dev dependency the repo has deliberately avoided; keep it dev-only or script a Playwright run of the existing page instead.

**Priority** Low — basis: software-only.

### program.js (1289 lines) and today.js (1388 lines) concentrate mixed responsibilities in single files

**Observation** PARTIALLY_CONFIRMED. The factual core holds: `js/program.js` is 1289 lines and `js/views/today.js` is 1388 lines, and both mix concerns — `today.js` has date formatting (`prettyDate` :18), a banner registry (`SIGNAL_ORDER` :262, `BANNER` :363-390), exercise rendering (`renderExercise` :90), and domain computation (`retestBenchmarkValues` :42, `cycleStats`/`isCycleComplete` :119-153); `program.js` holds phase math, the session library, `PRESCRIPTION_PASSES`, and the public API. But the finding's load-bearing justification is false: it claims "CLAUDE.md itself calls out single-file size risk for exactly these two files." It does not — CLAUDE.md's only "split" references are to the phase-split domain term, not file size, and it instead deliberately names `program.js` and `today.js` as the intended single entry points for their respective changes ("Common entry points for changes"). The finding manufactures a CLAUDE.md endorsement that does not exist, and the repo philosophy is "code is cheap / simple over clever."

**Why it matters** Large mixed-responsibility files do raise merge-conflict and navigation surface. But with no manufactured endorsement behind it, this is a pure code-taste observation with no impact on any prescription, load-math, or durability path.

**Potential impact** Somewhat higher merge/regression surface and slower navigation for humans and agents; no athlete-facing consequence.

**Recommendation** If splitting at all, extract the session library from `program.js` into a module the `Program` API composes, and separate `today.js`'s `wire()`/input-rendering from view-assembly — but treat this as optional hygiene, not a defect fix, given the repo's explicit single-entry-point design.

**Trade-offs** More files and imports (cheap here — explicit `.js` ES-module paths), and some churn to the auto-generated `sw.js` SHELL.

**Priority** Low — basis: software-only.

### Benchmark grade fields default to inconsistent empty types (null vs '') across code paths

**Observation** CONFIRMED. `defaultBenchmarks()` sets `sportGrade`/`boulderGrade` to `null` (`js/storage.js:42-43`), while `defaultState().globalBenchmarks` sets them to `''` (`js/storage.js:79-80`), the v4→v5 migration backfills with `?? ''` (`js/storage.js:181-182`), and the normalise fallback also uses `''` (`js/storage.js:204`). The live path is `globalBenchmarks` (`''`); `defaultBenchmarks()` feeds the per-plan benchmarks that CLAUDE.md documents as largely dead code (`setPlanBenchmarks` has zero callers). The sole consumer, `limiter.js`'s `normalizeGrade`, does `if (!g) return null` (`js/limiter.js:29`), so it currently coerces both `null` and `''` to `null` — the inconsistency is latent, not an active bug.

**Why it matters** Two representations of "unset" for the same field invite subtle bugs in any future consumer that distinguishes `null` from `''` (a truthy check behaves the same today, but an `=== ''` or `=== null` check would not). It is a small consistency smell in the storage layer that is the source of truth.

**Potential impact** Low today; a future consumer using a strict-equality check could behave differently depending on which default path produced the value.

**Recommendation** Pick one empty representation — prefer `null`, to match the numeric benchmark fields — and use it in both `defaultBenchmarks()` and the `globalBenchmarks`/migration paths.

**Trade-offs** Trivial; ensure any code doing `=== ''` checks is updated in the same change.

**Priority** Low — basis: software-only.


---

## 10. Evidence Quality

Overall, this repo sets an unusually high bar for evidence hygiene: most magnitudes are labelled as app conventions where they are conventions (see `loads.js`'s KG-C7 disclosures, faithfully mirrored by the autoregulation evidence in the bundle), and the ADRs repeatedly concede where no climber RCT exists. The findings below are not cases of hidden fabrication in the prescriptions — they are places where the *framing* claims more evidentiary standing than the underlying source carries, or where an athlete-facing doc describes behaviour the generator does not actually produce. That distinction matters: none of these is a G3 safety defect, but each erodes the "evidence-based" trust the app trades on.

### Advertised "3:1 / deload every 4th week" cadence is not what the generator produces near the retest seam

**Observation.** `docs/training-philosophy.md:38-40` states flatly "Three weeks hard, one week deload — across Base and Build" and that "This 3:1 cadence matches Lattice's published default," with no caveat; `CLAUDE.md`'s deload section is headed "cadence is 3:1" (though it is more precise, adding "plus the forced retest-deload at the end of each Base block"). The generator does not honour a uniform 3:1. `buildPhasePattern` applies natural deloads at `(i+1)%4===0`, then forces a retest-deload on the last Base week (`arr[base-1]`, `js/program.js:83`, `:95`, `:102`), then runs the C2 no-adjacent-deloads guard (`js/program.js:86`, `:96`, `:103`) that *clears* the immediately-preceding natural deload. Verified against the code and a live generator run, the cited patterns hold exactly: 12-wk comp default = wk4 deload, wk5 hard, wk6 retest-deload — a **1:1 seam** (a single hard week wedged between two reduced weeks); 16-wk comp = wk4 deload then weeks 5–8 all hard then wk9 retest-deload — a **4:1 run**, because C2 cleared the natural wk8 deload; 12-wk trip = weeks 1–4 all hard with **no mid-base deload** before the wk5 retest. `ADR-0004:28` does acknowledge "longer uninterrupted loading runs at some cycle lengths" as residual risk, but its two enumerated examples are Build/Peak runs, not the base/retest double-deload or the 4-hard-week Base openings; the philosophy doc carries no caveat at all.

**Why it matters.** Deload cadence is the primary fatigue-management lever (G3), and `training-philosophy.md` is the authoritative athlete-facing description of it. Claiming a uniform 3:1 that "matches Lattice's published default" is evidence-dressed convention the code visibly violates in the *default* 12-week plan — the exact "uncited convention presented as behaviour" the audit brief targets. The deload-cadence claim is at best coaching-consensus to begin with (the evidence bundle rates the 3:1 rhythm SUPPORTED but only at consensus level — surveyed coaches deload every ~5.6 ± 2.3 wk, and Coleman et al. 2024 even found a mid-program deload slightly *reduced* strength gains), so overstating its regularity compounds an already-soft base.

**Potential impact.** The athlete plans recovery expecting a predictable three-weeks-on/one-off rhythm; actual load is lumpier. The 12-wk default double-deloads the end of Base (wk4 + wk6 with one hard week between) — mild under-dosing that contradicts ADR-0004's own concern about under-stimulus. Short/trip cycles instead open with four straight hard Base weeks, more accumulation than advertised. Because all the extra loading runs fall in Base (the lowest-intensity phase — exactly the mitigation ADR-0004 articulates in principle), this is an accuracy problem, not an injury problem.

**Recommendation.** Either (a) make the cadence match the claim — insert a compensating mid-base deload so no run exceeds three hard weeks even when the forced retest-deload displaces a natural one; or (b) correct `training-philosophy.md` and `CLAUDE.md` to state the real per-length cadence (retest-deload can create a 1:1 seam or a 4:1 run), ideally with a generated table so the doc can never drift from the generator again. Option (b) is cheap and honest; (a) better serves G1 dosing.

**Trade-offs.** Adding a base deload in short cycles costs a hard week in an already-thin base — a real G1 cost. Given the benign safety profile, the cleanest honest fix is (b): document reality and lean on the autoregulation signals ADR-0004 already points to.

**Priority.** Medium — basis: coaching-consensus.

### Weighted pull-up %-bands carry the same load-precision framing as finger bands despite being non-climbing-specific convention

**Observation.** `pullupPrescription` (`js/program.js:294-313`) applies ADR-0013 total-load percentages (Base `[0.75,0.82]`, Build `[0.84,0.89]`, Peak `[0.88,0.90]`, Taper `[0.87,0.90]` — lines 301, 302, 306, 312) with the same structural rigor as the finger bands. This part of the finding holds fully, and — importantly — code and disclosure *agree*: both the code comment (`js/program.js:298-300`) and `training-philosophy.md:28` honestly label these as "general strength-training rep-max relationships... coaching convention, not climbing-specific." This is not doc/code drift. The evidence bundle concurs: the finger bands trace to Lattice's published total-load intensity statement (SUPPORTED, consensus), whereas the pull-up bands are the NSCA-style rep-max heuristic borrowed from general barbell strength and mapped onto weighted pull-ups (a defensible but weaker extrapolation). The finding's "equal UI precision" harm is **partially confirmed and somewhat overstated**: the athlete never sees the percentages — `today.js` renders only a kg Load range, and the `pctRange` is an internal input to the kg math. So there is no on-screen percentage whose confidence is inflated; the parity that actually exists is that both families reduce to an equally-precise-looking kg range with no evidentiary label attached to either.

**Why it matters.** The pull-up numbers rest on a weaker source than the finger numbers, yet a suggested kg is presented identically for both. An athlete has no cue that a pull-up load suggestion is a general-strength convention rather than a climbing-validated one.

**Potential impact.** Low — the bands are conservative (the 90% Peak cap, `js/program.js:303-306`, is the safe choice) and G3 durability is untouched. The only risk is misplaced confidence, not injury.

**Recommendation.** Keep the bands; the code comments are already honest. If/when the `reason[]` tooltip is surfaced in the UI, add a one-line note on the pull-up load row that pull-up % is a general-strength convention — matching the transparency the app already applies to its readiness multipliers. Purely a transparency nice-to-have.

**Trade-offs.** None beyond the `reason[]`-surfacing work; label/documentation only.

**Priority.** Low — basis: coaching-consensus.

### Double-block threshold (20 wk) and the 1/3 build split are app-invented numbers presented with tri-source "consensus" framing

**Observation.** `js/program.js:14-16` comments the `DOUBLE_BLOCK_THRESHOLD` as "Coach consensus (Lattice, Hörst, Anderson) says single-block adaptations plateau beyond ~20 wk without phase transitions." The specific 20-week cutoff (`js/program.js:17`) and the `build = Math.max(2, Math.round(remaining * 0.33))` split (`js/program.js:57`, `:69`, `:71`) have no citation. The repo itself concedes elsewhere that this is convention: `training-philosophy.md:54` says the double-block switch "reflects coaching convention, not data" (note: the concession is at :54, not :36 — line 36 says it "mirrors Lattice's stated preference"), and KG-C2 (no macrocycle-length RCT) is filed Won't-fix. Two things make the "consensus" label worse than a mere over-claim: the evidence bundle rates block-beats-linear as only weakly/MIXED supported (head-to-head meta-analyses find no meaningful linear-vs-block difference, and "beats linear beyond 16–20 weeks" is an extrapolation, not a finding); and the sole citation ADR-0002 offers for the plateau (Mundry, PMID 34188125) is flagged elsewhere this audit as unverifiable/apparently fabricated — so the "consensus" claim is not just uncited, it rests on a bad reference.

**Why it matters.** The brief is to catch uncited convention dressed as behaviour. The 20-week threshold and the 1/3 build fraction are reasonable app defaults, but "consensus (Lattice, Hörst, Anderson) says" overstates them as evidence-fixed. The build fraction in particular governs how much of every cycle is the goal-critical Build phase, so a future maintainer treating 0.33 as validated rather than tunable would be misled.

**Potential impact.** Low training impact — the defaults are plausible and both single- and double-block preserve the injury-protective phase structure, so no G3 implication. The harm is to maintainer trust and to the corpus's evidentiary integrity.

**Recommendation.** Downgrade the comment from "Coach consensus (Lattice, Hörst, Anderson) says..." to something like "app default; no climber RCT for the cutoff (KG-C2)," matching how `loads.js` already labels its KG-C7 conventions. Keep the numbers; label them honestly. Separately, purge or correct the Mundry citation wherever ADR-0002/0003 lean on it.

**Trade-offs.** None; documentation-only.

**Priority.** Low — basis: speculative.


---

## 11. User Experience

This app is unusually well-documented for a single-athlete side project, and its UX intent — a crisp glanceable "what do I do today" target plus honest disclosure of autoregulation limits — is stated clearly in the code comments and ADRs. The three findings below are all comprehension/transparency gaps, not safety or correctness defects: in every case the underlying load math is computed and clamped correctly, and only the *explanation* shown to the athlete is missing, jargon-laden, or dense. None touch G3 durability. Two of them also involve stale comments that assert a UI surface which does not exist — that doc/code drift is worth fixing in its own right.

### Suggested load is shown with no explanation — the reason[] trail is computed but never rendered

**Observation:** `Loads.resolveEffective` builds a detailed `reason[]` array on every kg suggestion (js/loads.js:135-199): the total-load convention note (`base.conventionNote`, :135), the ADR-0013 re-base migration hint (:138), "targets hit → +2.5%" (:159), the prev-actual/auto-adjust line (:163), layoff decay (:164), the readiness multiplier (:173), the "capped at +5% per session" guardrail (:184), and the negative-benchmark clamp (:196). Comments assert this feeds the UI: js/loads.js:130 ("UI range tooltip reads it") and CLAUDE.md's load-chain note ("Each step appends to `reason[]` for the UI tooltip"). Verified against the code: a grep across `js/views/` for `reason` / `conventionNote` / "targets hit" / "capped at" / "layoff" returns **no files** — nothing outside loads.js consumes the array. `today.js` renders only `suggestion.range` and `suggestion.suggestedKg` (js/views/today.js:975, 1003, 784). The verifier confirms the "About these numbers" `<details>` at today.js:589-595 is the readiness-multiplier disclosure, *not* the load-reason trail, so it is not a substitute. The athlete sees a bare "Suggested: X kg" that silently changes week to week with zero visible cause.

**Why it matters:** For a self-coached athlete, the entire value of autoregulation is understanding *why* today's load differs from last session — progressed because targets were hit, decayed after a layoff, cut for poor readiness, or capped by the guardrail. Hiding the rationale turns an evidence-based progression engine into an opaque oracle. Autoregulating load from RPE and a targets-hit rule is well-supported in principle (evidence bundle: RPE convergent validity r=0.88, PMC8742800; the NSCA "2-for-2" progression rule — both coaching-to-strong consensus), but the athlete can only benefit from — or sanity-check — a suggestion they can see the derivation of. This directly undercuts the app's own "trust your own logged trends over the multiplier" disclosure.

**Potential impact:** The athlete cannot distinguish a deliberate +2.5% progression step from a readiness cut or a layoff decay; a mis-seeded suggestion looks identical to a correct one. Reduced adherence and reduced ability to catch the app under- or over-loading them.

**Recommendation:** Render `suggestion.reason` in the load row as an expandable "why this load?" disclosure, mirroring the existing readiness `<details>` block at today.js:589-595. The data is already built on every suggestion object, so surface area is minimal. At the very least, delete the now-false comments at loads.js:130 and in CLAUDE.md that claim a tooltip already exists — but surfacing the trail is the correct fix given the code already pays the full cost of building it.

**Trade-offs:** Adds a small amount of UI copy per exercise card; risk of information overload if shown expanded by default — mitigated by collapsing it behind a disclosure.

**Priority:** Medium — basis: software-only. (A transparency gap plus false comments, with no impact on load correctness or G3 durability; suggestions are still computed and clamped correctly.)

### Internal jargon "flavor" is surfaced to the athlete unexplained

**Observation:** The Today header renders `ctx.flavor` as a badge reading "boulder" or "sport" (js/views/today.js:209, built as `<span class="badge focus-…">${ctx.flavor}</span>`, rendered :217) with **no** `title`/tooltip — contrast the adjacent energy-system tip at :208, which does carry a `title` attribute. No legend for "flavor" exists anywhere in the app: the only in-app legend (calendar.js:83-90) covers phases only. `ctx.flavor` resolves to `focus === 'hybrid' ? weekFlavor(weekIdx) : focus` (js/program.js:1051, 1199), so on a hybrid plan the badge shows the app's odd/even week alternation as raw "boulder"/"sport" text with no indication it is automatic. The verifier trims one overstatement in the reader's title: the Today badge surfaces only `flavor`, never `focus` (focus is shown with descriptions in profile.js/onboarding.js), so the "flavor/focus collapsed into one badge" framing is slightly loose — but the core defect (an unexplained `flavor` badge) holds.

**Why it matters:** An athlete who considers this a bouldering block and sees a "sport" badge has no way to know it is the app's week-index alternation rather than a mistake. Unexplained internal terminology reduces comprehension of why a given session was prescribed. The flavor split itself (boulder weeks bias anaerobic capacity, sport weeks bias aerobic power) is a defensible app-design synthesis — the evidence bundle rates the specificity principle as coaching consensus but the exact mapping as weakly evidenced — so the athlete has all the more reason to want it named plainly rather than shown as a bare label.

**Potential impact:** Confusion and mistrust ("why does it say sport today?"), especially in hybrid Build, where the badge and the session content can genuinely diverge: on an even/sport hybrid Build week `styleFlavor` is forced to "boulder" for Thursday and the content is limit bouldering (js/program.js:1208-1212, :1253) while `ctx.flavor` stays "sport" — so the badge can contradict the prescribed session.

**Recommendation:** Replace the raw `flavor` badge with a plain-language label ("this week: bouldering emphasis") or add a one-tap explanation, and reconcile it with the hybrid-Build override so it reflects the session actually prescribed rather than the raw week-alternation value.

**Trade-offs:** Slightly more header copy; requires reconciling the badge with the hybrid-mix override (js/program.js:1208-1212) so it does not contradict the session shown.

**Priority:** Medium — basis: software-only. (Pure comprehension issue; no bearing on prescription safety or G3.)

### Target-provenance callout can render dense, ambiguous phrasing on stacked-pass days

**Observation:** `targetCalloutHtml` (js/views/today.js:865-892) composes provenance from `readinessScaledFrom`, `originalTarget`, and `rampedFrom` — three fields set by independent, non-mutually-exclusive passes (program.js: `originalTarget` :787/:886, `rampedFrom` :865, `readinessScaledFrom` :924; CLAUDE.md confirms notes are not mutually exclusive). The verifier confirms the rendering: on a poor-readiness day the readiness branch (:873-881) composes up to three values into one line — final value + "↓ from {pre-readiness}" + "template {originalTarget||rampedFrom}", yielding the cited "Readiness target 3 problems ↓ from 4 · template 4"; the deload branch (:884) renders "`<s>4</s>2`". This is PARTIALLY_CONFIRMED: two of the reader's framings are overstated. (1) The title's "stacked callouts" is inaccurate — `targetCalloutHtml` returns a *single* `<div>`, and the readiness branch deliberately collapses everything into one (comment :869-872). (2) The recommendation is already partly implemented in the readiness branch: the final number renders first and provenance is wrapped in `<span style="opacity:.6">`. What genuinely remains is that the **deload branch (:884) is full-opacity strikethrough**, not dimmed, and provenance sits inline rather than on its own secondary line.

**Why it matters:** The callout is the athlete's single glanceable "what do I actually do today" number. Layered from/template annotations at full opacity require decoding which reduction came from where, working against the crisp-headline-target intent the code cites — on exactly the days (deload plus poor readiness) when clarity matters most.

**Potential impact:** The athlete misreads the actual target or the reason for it on compounded-pass days; the crisp-target goal is softened precisely when several passes fire together.

**Recommendation:** Apply the readiness branch's own pattern to the deload branch — dim the struck-through provenance (`opacity:.6`) and optionally move all provenance to a single secondary line ("was 4, cut for deload + readiness") beneath one bold final number, rather than an inline full-opacity strikethrough chain.

**Trade-offs:** Slightly less information at a glance for athletes who want the full derivation; mitigated by keeping it visible, just demoted.

**Priority:** Low — basis: software-only. (Minor UX polish; the readiness path already largely does the right thing, and there is no safety or correctness implication.)


---

## 12. Missing Features

This dimension covers coaching capabilities a human coach would routinely provide that the app does not — plateau detection, injury return-to-load management, and exercise substitution. The repo is unusually candid about its scope boundaries (many are argued out explicitly in ADRs and `knowledge-gaps.md`), so the real question below is which absences are defensible single-athlete scoping choices and which are genuine coaching gaps against the stated goals G1 (progression to V7/7b), G2 (peaking), and G3 (durability, which gates the others).

### Plateau detection is limited to strength retests and never sees climbing-grade progress

**Observation:** `retestTrajectorySignal` (`js/monitoring.js:98-117`) fires only when it has at least two benchmark-history entries (`:100`), compares the latest two retests (`:101`), and returns `null` unless every measured strength benchmark is flat-or-down (`:107`). It reads only `maxHang20mm` and `pullup1RM` (`:103-104`). The benchmark schema and the appended history snapshots carry only `bodyweight` / `maxHang20mm` / `pullup1RM` (`js/storage.js:39-41`, `435-442`) — there is no field anywhere in `js/` for logged send grade, project attempts, or any climbing-performance measure. Because history is appended only on the retest-save path (once per Base block per CLAUDE.md / ADR-0014), the signal cannot fire until the second retest, roughly two Base blocks. The verifier sharpens the reader's original wording in two ways that do not change the conclusion: (1) the check is a single latest-vs-previous flat interval, not two independently-flat transitions, so "two flat cycles in a row" is slightly loose; and (2) a double-block macrocycle (>20 wk) contains two Base blocks, so two retests can land inside one macrocycle — meaning "~6+ months" is the default single-block case, not a hard floor. The core gap holds: a plateau in *actual climbing grade* — which is the literal G1 target — is invisible to the app.

**Why it matters:** G1 is defined in grade terms (reach V7/7b), yet the only progression signal the app can raise keys off finger-strength and pull-up proxies. A coach spots a stall within a cycle and looks first at what the athlete is actually sending, not just hang numbers. The app's plateau detector is both slower (needs two retests to fire) and narrower (strength only) than that.

**Potential impact:** An athlete whose fingers keep getting stronger but whose climbing grade has stalled — a technique, tactics, or head-game plateau, which is extremely common at the V5→V7 transition — receives no signal at all, because the strength proxies are still trending up. Conversely, a true strength plateau is only flagged after months of retests have already been logged flat. The autoregulation chain keeps nudging load, but nothing tells the athlete the *program itself* may need to change emphasis.

**Recommendation:** Add a lightweight climbing-performance log (hardest send and/or project attempt count per cycle) and a within-cycle stall heuristic on top of it, so plateau detection reflects G1 directly rather than only the strength benchmarks. This need not be elaborate — even a per-cycle "hardest clean send" field feeding a "grade flat across N cycles" advisory would close most of the gap.

**Trade-offs:** More logging burden on a single self-coached athlete, and grade is a noisy, confounded signal (wall, setting, conditions, indoor vs outdoor), so thresholds must be generous to avoid false "you've plateaued" alarms that would erode trust in the advisory system. The strength retests are deliberately clean, single-variable measures; grade tracking trades that cleanliness for direct relevance to the actual goal.

**Priority:** Medium — basis: coaching-consensus. This is a genuine G1 completeness gap, not a G3 safety issue: no unsafe prescription results, and other within-cycle advisory signals (readiness-trend, RPE-drift) plus continuous autoregulation still operate. It matters because it undercuts the app's ability to detect failure against its own headline goal, but it degrades gracefully, so it stays Medium.

### Injury return-to-load is a doc link, not an in-app graded protocol

**Observation:** The red pain-check-in response (`js/monitoring.js:122-136`) suggests skipping today's finger-loading exercises and links `docs/return-from-tweak.md`; the amber response (`:137-145`) holds progression for the day with no plan mutation. `signalHasAccept` / `acceptSettingsPatch` only wire an "accept" action for `early-deload`, so the return-from-tweak path is dismissal-plus-doc-link only (`:180-192`). There is indeed no in-app graded return ladder, no pain-free-session counter, and no reduced-% re-entry sequence — the literal facts the reader reported are correct. This is a PARTIALLY_CONFIRMED finding: the code observation holds, but the framing as a Medium missing feature does not survive scrutiny. The doc-not-code split is a *deliberate, documented* decision — `docs/return-from-tweak.md:5` states the guide is "deliberately a printed reference, not app logic — every numeric constant below is practitioner convention or a cross-tissue extrapolation, not a validated finger-specific rule … Nothing in this repo enforces, checks, or gates on any of it." The safety-critical behaviors that *do* carry the G3 weight — skip finger loading on red, hold progression on amber — are enforced in code; the graded ladder is guidance layered on top, not the load-bearing safety mechanism.

**Why it matters:** Managing a tweak back to full loading is exactly where G3 (the gating goal) most needs depth, and it is legitimate to note that this is where the app is thinnest in enforced logic. Return too fast risks re-injury; too slow loses training. So the underlying concern is real.

**Potential impact:** In practice the app already prevents the most dangerous move (loading a painful finger today) and defers the graded re-entry judgment to a written protocol. The residual risk is that a self-directed athlete may not consult or follow the doc — but that risk is not fixed by the reader's proposed mechanism.

**Recommendation:** Do *not* encode a "resume at reduced % for N pain-free sessions" ladder as app logic. That recommendation is actively wrong for this repo on three grounds. (1) It would hard-code exactly the unvalidated numbers the repo intentionally keeps out, violating CLAUDE.md's core prohibition on "uncited convention dressed as behaviour"; the evidence bundle itself rates the graded-return protocol only SUPPORTED/weak ("no clinical RCT proves one A2 protocol superior"). (2) A pain-free-session countdown directly contradicts the guide's own evidence-based instruction — `return-from-tweak.md:42`: "There is no validated 'safe to hang again' number — go by the pain gate clearing at each stage, not a calendar countdown"; `:35`: "No source quantifies how much to cut volume for a tweak (this is genuinely silent in the evidence)." (3) Formalizing thin evidence as gated app behaviour would over-formalize the weakest evidence in the corpus — the opposite of a G3 improvement. The defensible enhancement, if any, is a softer nudge (e.g. surfacing the guide's pain-gate stages as an in-app checklist that the athlete self-advances), never a numeric load schedule.

**Trade-offs:** Any medical-adjacent return logic carries liability and framing risk under the app's not-medical-advice disclaimer, which is itself a strong argument for the repo's chosen doc-reference design. Keeping the numbers in a printed reference the athlete reads, rather than behaviour the app appears to endorse, is the more honest posture.

**Priority:** Low — basis: coaching-consensus. Real observation, but it describes a defensible, evidence-honest design choice rather than a defect; there is no safety gap (the enforced skip/hold gates cover the acute risk), and the reader's proposed fix would degrade the repo's evidence integrity.

### Only one exercise substitution exists — no swap for equipment, injury, or preference

**Observation:** This is PARTIALLY_CONFIRMED; the finding's headline is factually inaccurate. The Peak-Thursday 30/30→60/60 swap on a Lighter day (`applyPeakLacticSwap`, `js/program.js:943-952`) is *not* the "sole substitution." The readiness-gate pass swaps the whole session for `LIGHT_DAY` when suggest-rest is accepted (`js/program.js:1031-1032`), `applyReadinessLighter` scales targets down (`:915-935`), and the KG-A13 path swaps the Peak-Saturday project/redpoint session for a comp-format simulation under `comp` peakType (`:543-549`, `645`). The "single adopted substitution" comment the reader leaned on (`:937`) is scoped specifically to the readiness-driven exercise-level swap, not the whole app. Injury is also partly accommodated: `monitoring.js:122-146` fires the pain-amber (hold progression) and pain-red (skip finger loading + guide) responses. So the "take-it-or-skip-it" framing overstates the case — poor readiness → light day and finger pain → skip finger loading both already exist and serve G3. What *is* genuinely absent, and correctly identified, is any substitution keyed on **missing equipment** (no-campus, no-lead, no-hangboard) or on **athlete preference** — a grep found no equipment or preference inputs anywhere. Injury handling is skip/hold, not an alternative same-energy-system session.

**Why it matters:** The equipment/preference case is a real flexibility gap: an athlete who arrives at a wall without a campus board, or can't lead that day, has no supported alternative session and simply logs nothing. The injury case, however, is already covered by the readiness and pain gates, so the "no fallback" concern applies far less there than the reader implied.

**Potential impact:** A skipped session registers as a gap to `js/replan.js` and can trigger a plan shift, so an athlete blocked purely by equipment loses the intended stimulus and may see the plan extend — a G1/G2 continuity cost. The scale is modest for a single athlete with a known, fixed home/gym setup.

**Recommendation:** If added at all, a small substitution table keyed on `kind` + `phase` + constraint (no-campus, no-lead) that swaps to an already-designed session of the same energy system — reusing the `SIXTY_SIXTY_EXERCISE`-style shared-content pattern so no new physiological content is invented — would close the equipment case cleanly. The finger-amber constraint the reader proposed is largely already handled by the pain gate, so it should not be part of such a table.

**Trade-offs:** Every substitution is new surface area that must stay phase-clean; the ADR-0015 authors deliberately limited themselves precisely to avoid inventing content, and CLAUDE.md explicitly weighs ongoing complexity and "simple over clever." For a single-athlete, fixed-equipment app, equipment-swap machinery is a defensible omission rather than a clear win.

**Priority:** Low — basis: coaching-consensus. A Missing Features gap, not a safety issue: G3 is already served by the readiness and pain gates, and the genuinely-absent piece (equipment/preference swaps) is a reasonable scoping choice for this one athlete's known setup.


---

