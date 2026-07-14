# External Coaching Review — Training Plan Audit

*Reviewed 2026-07-14, against the code in `js/program.js` / `js/loads.js` / `js/warmup.js` (not just the docs) and the generated 12-week hybrid schedule in [`training-plan.md`](training-plan.md). Perspective: elite coaching + sport-science review, deliberately adversarial. Athlete context: intermediate (V5–V6 boulder / ~7a lead), hybrid boulder+sport, 3 main sessions/week, injury-averse (per `project-goals.md` G1–G3).*

*Where a weakness is already tracked in [`knowledge-gaps.md`](knowledge-gaps.md) its KG-ID is cited — the repo deserves credit for knowing it — but a tracked weakness is still a weakness in the plan the athlete trains on today. Findings marked **[new]** are not tracked anywhere in the repo.*

---

## 1. Periodization

**Phase structure is orthodox and defensible.** Base → Build → Peak → Taper with a derived split (6/3/2/1 at 12 weeks), 3:1 deloads, retest closing Base, two-band power-endurance model confined to the correct phases (ADR-0006), taper holding intensity (ADR-0007). This matches Lattice/Hörst consensus closely and the two-band PE taxonomy is genuinely better-reasoned than most commercial plans.

### W1 — Build phase is only 3 weeks at the default length (Medium)

- **Observation:** At 12 weeks the formula gives Base 6, Build 3, Peak 2, Taper 1. The max-strength conversion block — the phase most correlated with grade gains for an intermediate — is the shortest trainable block in the plan, and it contains no deload (correct at 3 weeks, but see W3).
- **Why it matters:** Neural strength adaptations need ~4–6 weeks of exposure; tendon stiffness adaptations longer. Three exposures to Build Monday max hangs (one of which may be flavor-diluted, see W4) is a thin dose.
- **Potential impact:** Retest-to-retest strength gains will mostly reflect Base repeaters, not the Build block; Build becomes a bridge rather than a driver.
- **Recommendation:** For strength-limited cycles, bias the split toward Build (e.g. `remaining * 0.4`, or a per-plan base/build ratio lever). At 16 weeks the formula already gives Build 4–5 — steer the athlete toward ≥14-week cycles when the goal is a grade, not a date.
- **Trade-offs:** Less aerobic base for the 7a→7b sport goal; longer cycles delay the feedback loop.
- **Priority:** Medium.

### W2 — The retest week is labelled a deload but isn't one **[new]** (High)

- **Observation:** Week 6 carries `deload: true, retest: true`, but the volume cut is skipped for the *entire week* (`if (deload && !retest)` in `prescribeForContext` keys off the week-level flag). Generated schedule confirms: Week 6 Thursday (10-route pyramid) and Saturday (2×30 min ARC) run at full volume, and Monday adds three maximal tests (max hang, 1RM pull-up, 60-min max bouldering).
- **Why it matters:** Two failures at once. (a) Testing validity: benchmarks should be taken fresh; here they're taken at the end of a 5-week loading block with no true unload preceding them, so the retest systematically underestimates gains — and those numbers then drive *all* Build/Peak loading. (b) Recovery: the athlete goes Base → "deload" that isn't → straight into the highest-intensity Monday of the cycle (Build max hangs at 80–90%). The 3:1 cadence promised by ADR-0004 is silently 5:0 around the Base/Build boundary.
- **Potential impact:** Depressed benchmarks → mis-calibrated Build/Peak percentages; accumulated fatigue entering Build; elevated tweak risk in Build week 1.
- **Recommendation:** Keep Monday tests but apply the deload cut to Thursday/Saturday of retest weeks (they don't have their "own structure" — only Monday does). Alternatively make the retest week: Mon tests, Thu light technique, Sat short quality session.
- **Trade-offs:** Slightly less Base mileage; trivial code change (`deload && !retest` → per-slot exemption).
- **Priority:** High.

### W3 — Six consecutive loaded weeks into the goal (Medium-High)

- **Observation:** Because Build (3 wk) has no deload and retest week isn't a real one (W2), weeks 5→11 run seven weeks with no genuine volume reduction, ending in the two highest-intensity weeks of the cycle, discharged by only a 1-week comp taper.
- **Why it matters:** The fitness–fatigue model the repo itself cites for deloads: peak-week expression requires fatigue to dissipate. One step-cut week after ~6 loaded weeks is at the short end; the plan's own verified research says taper length scales 4–28 days.
- **Potential impact:** Athlete arrives at the comp fit but not fresh; peak sessions (30/30 at RPE 10, project attempts) underperform in the final fortnight.
- **Recommendation:** Fix W2 (cheapest lever), or insert a half-deload at the Build→Peak boundary for cycles where Build ≥3 weeks. Monitor readiness trend through Peak (KG-A4) and let it trigger an early taper start.
- **Trade-offs:** Any inserted unload costs a hard week — at 12 weeks the calendar is already tight, which is itself an argument for longer default cycles.
- **Priority:** Medium-High.

## 2. Weekly Training Distribution

**The weekly skeleton is excellent.** Mon strength / Tue light / Wed rest / Thu main / Fri rest / Sat main / Sun optional-easy gives 48h+ between hard sessions, two full rest days, and a sane life rhythm for a working adult. This is one of the plan's strongest features and should not be touched.

### W4 — Weekly flavor alternation halves the frequency of every adaptation (High)

- **Observation:** In hybrid mode, odd weeks are boulder-flavored and even weeks sport-flavored, so each specific stimulus lands every *other* week: ARC ~1×/fortnight in Base (KG-B4), limit bouldering 1×/fortnight in Build, 60/60 threshold 1×/fortnight, and the ADR-0006 density progression (5s/week rest cuts) only actually touches a given session format on alternating weeks.
- **Why it matters:** The repo's own verified findings say aerobic adaptation needs 2–3 sessions/week for 6–8 weeks; fortnightly exposure is below the adaptation threshold for essentially every quality being alternated. Weekly whole-flavor alternation is an app invention — the cited frameworks either block one goal at a time or mix modalities *within* the week.
- **Potential impact:** The hybrid athlete develops neither the boulder qualities nor the sport engine at full rate; this is the largest single drag on expected grade progression from the program design (as opposed to from missing features).
- **Recommendation:** Mix within the week instead of across weeks — e.g. in Base: Thu = flavor-specific quality session (alternating), Sat = always endurance-capacity (ARC/pyramids); in Build: Thu = always limit/strength, Sat = always PE. Alternatively, prompt hybrid users to run boulder-focus and sport-focus *cycles* back-to-back (the double-block machinery already exists).
- **Trade-offs:** Within-week mixing reduces per-session specificity variety and needs new session-slot logic; per-cycle focus delays one goal by a full cycle.
- **Priority:** High.

### W5 — Readiness autoregulation never touches climbing sessions **[new]** (Medium)

- **Observation:** The readiness check-in (×0.85 / ×1.0 / ×1.05 / suggest-rest) only feeds `Loads.resolveEffective`, which only computes kg for `hangboard`/`pullup`. The 30/30 at RPE 9.5–10, limit bouldering, and 4×4s — the sessions with the highest injury and overreach exposure — receive zero readiness modulation.
- **Why it matters:** Autoregulation matters most where intensity is maximal and load is unquantified. A "Lighter" day currently reduces the athlete's hangboard by 15% and then sends them into an unmodified all-out lactic session.
- **Potential impact:** The plan's fatigue-management story is weaker in practice than on paper; hard-day-on-bad-day collisions are exactly how overuse injuries happen at this level.
- **Recommendation:** On low readiness, scale climbing `prescribedTarget` (sets/problems/minutes) by the same multiplier and cap RPE (e.g. 30/30 → 60/60 substitution rule); on suggest-rest, surface a session swap, not just a kg suppression.
- **Trade-offs:** More prescription-mutation paths to test; risk of athletes gaming easy days (mitigated by it being single-user).
- **Priority:** Medium.

## 3. Exercise Selection

**What's there is well-chosen.** Repeaters + intro max hangs in Base, weighted max hangs in Build, 7-53 in Peak, weighted pull-ups, antagonist block, two-band PE work — every exercise has provenance and a phase-correct role. The min-edge deletion (ADR-0005) and campus softening (ADR-0001) were correct calls for this athlete.

### W6 — No lower-body, hip-power, or flexibility development (Medium)

- **Observation:** The entire S&C footprint is upper-body + trunk. No squat/hinge pattern, no jumps or hip extension power, no structured hip mobility beyond "15–20 min shoulders, hips, wrists" on Tuesday.
- **Why it matters:** At V6→V7 and 7a→7b, high-steps, heel hooks, mantles, and dynamic hip drive are common limiters; leg strength is also protective for landings (bouldering falls are the sport's biggest acute-injury source, ahead of fingers).
- **Potential impact:** Movement-quality ceiling on steep terrain and slab/mantle tops; missed easy transfer wins.
- **Recommendation:** Add 2 exercises to the Monday antagonist block (e.g. rear-foot-elevated split squat 3×8, box/broad jump 3×5) and give Tuesday a concrete hip-mobility sequence (couch stretch, deep-squat pry, frog — the drill catalog pattern in `js/drills.js` is the obvious vehicle).
- **Trade-offs:** Monday session length grows ~10 min; some athletes will skip it (make it a named block so skipping is visible in logs).
- **Priority:** Medium.

### W7 — Core is a token; grip variety is narrow (Medium)

- **Observation:** Core = "choose 1 of plank/HKR/L-sit, 3 sets, 1×/week", with no progression standard. All fingerboard work is 20mm half-crimp + open-crimp; no pinch, no sloper/drag, no three-finger drag anywhere in the cycle.
- **Why it matters:** Body-tension (front-lever family, toe-pressure work) is the core quality that transfers to steep climbing — planks plateau within weeks. Pinch and drag strength don't develop from crimp hangs, and boulder grades past V6 routinely gate on them. (KG-A10's anti-style logic is the tracked half of this; the untrained grip *types* are untracked.)
- **Potential impact:** Style-dependent plateau: the athlete gets stronger on crimps and keeps failing compression/sloper problems at the same grade.
- **Recommendation:** Rotate the core slot toward tension progressions (tuck front lever rows, hanging leg raise to toes, ab-wheel); add one pinch-block or wide-pinch hang line to Build Mondays as an optional exercise.
- **Trade-offs:** Pinch blocks need equipment; front-lever work adds elbow load (keep volume small, RPE-capped).
- **Priority:** Medium.

### W8 — Comp peak type has no comp-format work **[new]** (Medium, only if `peakType: 'comp'`)

- **Observation:** `peakType` changes taper *length* only. A comp peak prescribes the same project/redpoint sessions as a trip — nothing simulates onsight-under-clock, limited attempts, or 4-problem-round formats.
- **Why it matters:** Peaking specificity is about the demand profile of the goal day. A comp day is: unfamiliar boulders, ~4 minutes each, repeated rounds, no beta rehearsal — almost the opposite of "2–4 quality redpoint goes on a known project".
- **Potential impact:** Physically peaked, tactically unprepared; comp performance under-expresses the fitness the plan built.
- **Recommendation:** For `peakType: 'comp'`, swap Peak Saturdays to comp simulation (e.g. 2 rounds × 4 unseen problems × 4 min on / 4 off, flash-only) and taper Thursday to short onsight bursts.
- **Trade-offs:** Needs fresh problems (commercial set rotation dependency); one more session template per branch.
- **Priority:** Medium.

## 4. Session Design

**Ordering and bracketing are mostly right.** Fingers-first on Monday (hangboard → pull-ups → accessories) is correct; the two-stage warm-up with hangboard/climbing-specific progressions plus a real cool-down (`js/warmup.js`) is better than most published plans; limit work sits on the freshest climbing day.

### W9 — Campus placed after two maximal strength blocks (Low-Medium)

- **Observation:** Build boulder-flavor Mondays append campus ladders *after* max hangs and weighted pull-ups. (Called "warmup ladders", scheduled last.)
- **Why it matters:** Rate-of-force work degrades fastest under fatigue and has the worst injury-cost-per-sloppy-rep. If the ladders are genuinely sub-max skill primers the label should say so; if they're a power stimulus they're in the wrong slot.
- **Recommendation:** Move them between the warm-up and hangboard, or retitle/re-cue them explicitly as light neural priming (RPE cap 7) so nobody progresses them under fatigue.
- **Trade-offs:** None material.
- **Priority:** Low-Medium.

### W10 — Base Thursday "Projecting (mid-grade)" has a muddled objective (Low)

- **Observation:** "60–90 min of 4×4-style projecting on submaximal problems" at RPE 7.5–9 — three intents in one line (projecting, 4×4 format, technique volume), and it overlaps the RPE band of Saturday's actual 4×4 session two days later.
- **Recommendation:** Make it a technique-quality session with an explicit drill focus (the KG-A9 drill catalog is sitting right there) at RPE ≤8, or a movement-problem session with attempt caps. One session, one objective.
- **Priority:** Low.

## 5. Progression Model

### W11 — No progressive overload inside phases (KG-A2/KG-B5 tracked) (**Critical**)

- **Observation:** Every non-deload week of a phase prescribes an identical session. Only hangboard/pull-up kg move, and only by mirroring last time ±5% off RPE — a thermostat, not a progression. Climbing volume, ARC minutes, interval density (outside the final-4-weeks rest cuts), limit difficulty: all static. The repo's own research corpus specifies the missing rules (+2.5–10% when targets hit; volume ramp-then-halve in Base).
- **Why it matters:** Progressive overload is the first principle of training. A static stimulus stops driving adaptation in ~2–3 weeks; a 6-week Base contains ~3 wasted weeks by construction, and the ±5% RPE loop can oscillate around a fixed load indefinitely.
- **Potential impact:** This is the single largest cap on the plan's performance ceiling — bigger than any exercise-selection issue. On long cycles (the app allows 40 weeks) it becomes severe.
- **Recommendation:** Implement KG-D5 in its minimal form: (a) targets-hit → +2.5–5% rule layered above the RPE thermostat; (b) week-index multiplier on climbing `prescribedTarget` within a phase (e.g. Base ARC 30→40→50 min, ramp-then-halve); (c) attempt-quality progression for limit work (grade or angle, not volume).
- **Trade-offs:** More state to track; progression rules need the monitoring guardrails (KG-A4) to avoid ratcheting a fatigued athlete upward.
- **Priority:** **Critical** (performance), not injury.

### W12 — The %-of-added-load convention distorts real intensity **[new]** (High)

- **Observation:** All percentages are % of *added* benchmark load (`js/loads.js` multiplies `maxHang20mm`/`pullup1RM` added-kg by the range). Physiological intensity, however, tracks % of *total system* load (bodyweight + added). For a 70 kg athlete with a +20 kg max hang: "55–70%" intro hangs = +11–14 kg = **90–93% of true max**; Build's "80–90%" = 96–98%; Peak's "85–95%" = 97–99%. The advertised Base→Peak intensity ramp of 55→95% is really ~90→99%, and it compresses further the weaker the fingers (at +10 kg max, Base intro hangs start at 94% of true max). For a *negative* benchmark (assisted hangs — the code explicitly allows `maxHang20mm` to be negative), the math inverts: 55–70% of −10 kg prescribes −5.5 to −7 kg, i.e. *less* assistance than the athlete's tested maximum — a supra-max prescription labelled "intro, low-end".
- **Why it matters:** The %-added convention exists in climbing practice, but the plan reasons about it as if it were %1RM (phase tables, "low-end load" language, ADR-0001's 90%-cap rationale). Base is billed as capacity/intro work while its weighted hangs sit at ~90%+ true intensity weekly from week 1. The RPE ranges partially rescue execution, but the numbers anchor athlete expectations — and the negative-benchmark branch is outright unsafe if it's ever hit.
- **Potential impact:** Under-recovered Base phase for weaker-fingered athletes; misleading "progression" story; a real injury trap in the assisted-hang case.
- **Recommendation:** Compute prescriptions on total system load (`(bw + added) × pct − bw`), or keep the added-load convention but re-derive the phase percentages so true intensity actually ramps (e.g. Base intro ≈ 80–85% total). Guard the negative-benchmark branch explicitly (clamp to "≥ benchmark assistance"). State the convention in the UI tooltip.
- **Trade-offs:** Changing the math shifts every suggested load mid-plan — needs a migration note and probably a retest; the %-added convention does match some published boards' habits, so document whichever is chosen.
- **Priority:** High (Medium for this specific athlete while benchmarks stay positive and RPE caps are obeyed; High for the system).

### W13 — Benchmarks go stale through Build and Peak (Medium)

- **Observation:** The only retest closes Base (week 6 of 12). Build strength gains are never captured; Peak's 85–95% rides week-6 numbers; there is no end-of-cycle retest either, so cycle N+1 starts from a benchmark 7+ weeks old (KG-A8 adjacency).
- **Why it matters:** The plan's whole load engine keys off two numbers. The ±5% thermostat partially compensates upward but is bounded per-session and oscillates (KG-B5).
- **Recommendation:** Add a micro-retest (max hang only, 15 min) to the first Build Monday's warm-up, or an end-of-taper retest slot post-goal; feed either through the existing `setGlobalBenchmarks` path.
- **Trade-offs:** Any test spends a session's freshness; keep it to one lift.
- **Priority:** Medium.

### W14 — Layoff-decay floor and "Push" stacking are aggressive at the edges (Low-Medium)

- **Observation:** (a) `layoffDecay` floors at ×0.85 — after 3 *months* off, the app still suggests 85% of the athlete's old max-hang working load on day one back. (b) On a "Push" readiness day following an easy-RPE session, `autoAdjust` (×1.05) stacks with readiness (×1.05) for a +10.25% single-session jump — above the +2.5–10% band the repo's own research verifies, applied in one step.
- **Why it matters:** Pulley/tendon tolerance detrains slower than muscle but 85% after a quarter off is not conservative; and double-multiplier jumps are exactly how RPE-anchored systems overshoot.
- **Recommendation:** Extend decay below the floor after ~8 weeks (or force "re-benchmark" instead of a suggestion); cap the product of autoAdjust × readiness at ×1.05.
- **Trade-offs:** More conservative returns cost a week of ramp for long-layoff athletes — acceptable given G3.
- **Priority:** Low-Medium (the constants are already flagged as invention in KG-C7; this is about the *edges*, which aren't).

## 6. Physical Adaptations Coverage

| Quality | Coverage | Verdict |
|---|---|---|
| Finger strength | Repeaters, max hangs, 7-53, phase-shaped | **Good** (dose diluted by W4; intensity mislabelled per W12) |
| Pulling strength | Weighted pull-ups, phase-shaped | **Good** |
| Lock-off strength | Nothing direct; implicit in bouldering | **Gap (minor)** — acceptable; add lock-off holds to Build pull-up top sets if route goals demand it |
| Core strength | Choose-1, 1×/wk, no progression | **Weak** (W7) |
| Lower-body power | Absent | **Missing** (W6) |
| Contact strength | Basic campus ladders only (deliberate, ADR-0001) | **Deliberately limited** — correct trade for G3; limit bouldering must carry it, so protect Thursday quality |
| Maximum power | Limit bouldering (fortnightly in hybrid) | **Under-dosed via W4** |
| Power endurance | Two-band model, density progression | **Good design, fortnightly dose** (W4) |
| Aerobic endurance | ARC 1×/fortnight in Base only | **Under-dosed** (KG-B4 + W4) — worst gap for the 7b sport goal |
| Technique | Drill catalog (19 drills), optional pick, Tue + warm-ups | **Present but unforced** — no progression or required focus (KG-A9 partially closed) |
| Mobility | 15–20 min Tue + warm-up | **Thin** (W6) |
| Coordination | Absent (no dynamic/comp-style movement work) | **Missing** (W8) |

## 7. Climbing Specificity

Strong: the plan climbs 2–3×/week, limit work exists, redpoint/project sessions appear in Peak where they belong, and flash-volume tapering is correct. Gaps: **no board-vs-commercial-set guidance** (limit bouldering on commercial sets drifts toward style-comfortable circuits; a spray/board cue on Build Thursdays would sharpen the stimulus); **no outdoor conversion** (KG-A11, accepted won't-fix — but the trip `peakType` exists, so the half-page conversion note the KG proposes is genuinely needed); **base-phase boulder weeks contain no true volume-climbing session** — see W15.

### W15 — Base boulder-flavor Saturdays run Build-intensity PE work **[new]** (Medium-High)

- **Observation:** `buildSatMain` uses the same boulder-triples 4×4 (anaerobic capacity, RPE 8.5–9.5) for *both* Base and Build boulder weeks. The repo caught and fixed exactly this phase-mismatch for sport Thursdays (KG-B9: "base runs too hot") but the boulder Saturday equivalent was never audited. In hybrid Base, boulder weeks therefore contain zero sub-threshold capacity work (Thursday projecting is RPE 7.5–9 too) — the aerobic base the phase is named for exists only on sport weeks.
- **Why it matters:** Same physiology as KG-B9: if Base already trains RPE 9 anaerobic sets, Build's identical session is not a progression (it literally *is* the same session), and the base-phase adaptation target is untrained on half the weeks.
- **Recommendation:** Give Base boulder Saturdays their own session: boulder ARC / continuous easy circuits, or high-volume flash pyramids at RPE 6–7.5; keep triples as the Build session (where its density progression already lives).
- **Trade-offs:** One more template; athletes often *like* 4×4s — expectation management.
- **Priority:** Medium-High (it also flattens the Base→Build progression the repo has twice paid to protect).

## 8. Recovery & Fatigue Management

Mostly strong: 2 full rest days, 48h+ between main sessions, deloads at 3:1, taper mechanics correct, rest-day checklists, readiness check-in, layoff decay. Specific concerns: **retest-week pseudo-deload** (W2) and the **6-week loaded run into the goal** (W3) are the structural ones. Two more:

- **Sunday-before-Monday finger stacking (Low-Medium):** the optional Sunday climb sits directly before the week's heaviest finger session. RPE 4–6 mileage is probably fine, but nothing warns the athlete that a "fun" 90-minute Sunday at the gym compromises Monday max hangs. Cheap fix: cap Sunday at 60 min on the eve of Build/Peak Mondays, or surface a hint.
- **No monitoring model (KG-A4, tracked, High):** readiness is consumed one day at a time; nothing watches trends (readiness sliding for 2 weeks, RPE drifting up at constant load, flat retests). Every autoregulation gap above (W5, W14) would be safer with this in place. It remains the highest-value unfinished feature for G3.

CNS load is managed sensibly — max-stimulus stacking was explicitly removed from Peak Mondays (ADR-0001), and the alactic/strength work is front-loaded early in the week. Sleep guidance exists but is checklist-level (acceptable for scope).

## 9. Injury Risk

The plan's injury posture is its best quality: min-edge deleted, campus gated (pull-up + ladder prerequisites, "skip on any finger tweak"), Peak softened with a written rationale, deloads volume-based, layoff decay on returns. Residual risks, ranked:

1. **Elbow tendinopathy (highest residual):** weekly max hangs + pull-ups + climbing with antagonist/forearm-extensor work only 1×/week *and dropped entirely on deload weeks* (KG-A7). Medial elbow issues are the most common complaint in exactly this athlete profile. → 2×/week dosing (attach a 10-min block to Tuesday), never drop it fully.
2. **Finger/pulley:** structurally well-managed; the residual exposures are the W12 intensity mislabelling (Base hangs at ~90% true load while labelled "intro"), the retest week (three max tests on accumulated fatigue, W2), and Sun→Mon stacking. The 7-53 protocol at 85–95% in Peak is intense but short and phase-appropriate.
3. **Shoulder:** warm-up band work is good; pressing volume (push-ups only) is modest against high pulling volume — acceptable, watch it if pull-up loads climb.
4. **Wrist:** extensor curls 1×/wk is the only direct work; low risk at this volume.
5. **Overtraining/cumulative fatigue:** low risk structurally (3 mains + 2 rests), except the W3 window and the absence of trend monitoring (KG-A4).
6. **Acute (falls):** unaddressed — no landing/deceleration work (part of W6) and falling practice exists only as an optional Tuesday drill despite the lead goal.

## 10. Long-Term Athlete Development

- **Sustainability:** the weekly rhythm is highly sustainable; the *content* is not — with no intra-phase (W11) or inter-cycle (KG-A8) progression, cycle N+1 is byte-identical to cycle N with new kg. **Plateau risk after 2–3 cycles is the plan's defining long-term weakness.**
- **Missing qualities for the stated goals:** aerobic base dose (7a→7b is an endurance jump), coordination/dynamic movement (V7 boulders), pinch/sloper grips (W7), comp tactics if comps are the goal (W8).
- **Skill progression:** drill catalog is a real asset but purely opt-in; nothing rotates focus or ties drills to logged weaknesses (KG-A10 open). At this grade, technique is plausibly the co-limiter (KG-A1) — the plan spends ~80% of its prescription surface on physical qualities it cannot confirm are the limiter.
- **Adaptability:** genuinely good — configurable length, dual anchoring, peak types, missed-session replanning (ADR-0008), readiness. The scaffolding for individualization exists; the *content* individualization (limiter, style) doesn't yet.

## 11. Evidence Consistency

- **Strongly supported:** deload-as-volume-cut; taper holds intensity + cuts volume; hangboard protocol selection and phase mapping; two-band PE taxonomy; 48h spacing; warm-up structure. The repo's 300+ claim adversarial verification is beyond what any commercial plan does — this is the program's moat.
- **Coaching consensus (not RCT):** 3:1 deload cadence (KG-C3); phase-split ratios and the 20-week double-block threshold (KG-C2); retest placement; 12-week default length.
- **Speculative / app inventions (should be labelled as such in-app):** weekly flavor alternation (W4 — no source uses it); readiness multipliers and thresholds (KG-C7); layoff-decay constants (flagged); %-of-added-load phase percentages *as a progression narrative* (W12); the taper double-cut (below).
- **Internal contradictions found:** retest-week deload label vs. behavior (W2); Base Saturday boulder intensity vs. the KG-B9 principle already adopted (W15); taper templates are pre-reduced *and* then scaled again by `applyTaperVolume` — pull-ups 2×2 → 1×2, project goes 2 → 1 (**[new]**, probably unintended double application; one quality redpoint go is below the "2–3 goes" the template itself argues for); the goal/comp day renders as "Optional: easy open climb or rest" (**[new]**, cosmetic but confusing on the one day the plan is anchored to).

---

# Summary

## 1. Executive summary

This is an unusually well-reasoned plan at the architecture level — evidence-audited, injury-aware, honestly documented — wrapped around a static core. The weekly skeleton, phase logic, deload/taper mechanics, and hangboard protocol choices are all defensible against current evidence, and several past flaws were caught and fixed with real rigor (ADRs 0001–0008). The three systemic problems are: **nothing progresses within a phase** (the plan is a thermostat, not a program), **hybrid flavor-alternation halves the dose of every adaptation**, and **the plan cannot see what actually limits the athlete** (limiter, trends, or true intensity — the %-added-load convention masks how hard the hangboard work really is). Injury posture is genuinely good; the dominant risk is stagnation, not damage. Two mechanical contradictions (retest-week pseudo-deload, taper double-cut) and one phase-mismatch (Base boulder Saturdays) should be fixed regardless of any philosophy choices.

## 2. Top 10 improvements by expected performance gain

1. **Intra-phase progressive overload** (W11 / KG-A2+B5): targets-hit → +2.5–5%, ARC ramp, PE density beyond the final-4-weeks window. Biggest single lever.
2. **Fix hybrid dilution** (W4): mix flavors within the week or push per-cycle focus; restores full-frequency dosing to every quality.
3. **Aerobic base dose** (KG-B4 + W15): 2×/week sub-threshold work in Base for both flavors — the 7b lead goal is gated on this.
4. **Limiter diagnosis → biased emphasis** (KG-A1/D2; norms table already exists): stop spending 3 sessions/week on unverified limiters.
5. **True retest-week deload + fresh testing** (W2): better data *and* real recovery, one small code change.
6. **Re-derive hangboard intensity on total load** (W12): honest Base intensity, safe negative-benchmark branch.
7. **Readiness gating for climbing sessions** (W5): scale targets/RPE caps, not just kg.
8. **Antagonist work 2×/week, never fully dropped** (KG-A7): cheapest injury-risk reduction available.
9. **Mid-cycle micro-retest or end-of-cycle retest** (W13): keeps Build/Peak percentages honest, feeds inter-cycle progression (KG-A8).
10. **Base boulder-Saturday session + comp simulation in Peak** (W15, W8): phase-correct capacity work; tactical specificity for comp peaks.

## 3. Biggest strengths

- Weekly structure and recovery spacing (2 full rest days, 48h between mains) — elite-standard fatigue hygiene.
- Evidence discipline: 300+ adversarially verified claims, ADR trail, tracked knowledge gaps — no commercial plan does this.
- Injury-aware softening done *with* rationale (min-edge deletion, campus gating, Peak cap, layoff decay, mandatory pre-goal rest).
- Correct deload and taper mechanics (volume cut, intensity held) — most plans get this backwards.
- Two-band power-endurance model with density progression — sophisticated and correctly phase-confined.
- Warm-up/cool-down system with session-specific progressions.

## 4. Biggest weaknesses

- Zero progressive overload within phases; identical weeks (Critical).
- Weekly flavor alternation under-doses every adaptation in hybrid mode (High).
- Intensity prescriptions in %-added-load misrepresent true intensity and invert for assisted-hang athletes (High).
- No limiter diagnosis or trend monitoring — the plan trains qualities it can't confirm matter (High, tracked).
- Retest week is a deload in name only; taper volume is double-cut (mechanical contradictions).
- No lower-body/coordination work; token core; narrow grip vocabulary.

## 5. Potential injury concerns

Elbow tendinopathy from under-dosed antagonist work (1×/wk, dropped on deloads) is the top residual risk; then Base hangboard true-intensity (~90% from week 1) under an "intro" label; three max tests on accumulated fatigue in retest week; Sunday mileage directly before max-hang Mondays; unguarded supra-max prescriptions if a negative finger benchmark is ever entered; no landing/fall-conditioning despite bouldering volume. Overall risk is *below* typical for the genre — these are edge-trimming items, not red flags.

## 6. Overall rating

**6.5 / 10** as a performance-driving program (architecture 9, progression engine 3, dosing 6, injury management 8.5, specificity 6). With items 1–3 of the top-10 implemented it plausibly becomes an 8.

## 7. Final coaching verdict

**Qualified yes — for this athlete, with fixes; not yet as a general prescription.** I would let the intended athlete (intermediate, injury-averse, 3 days/week, values consistency) run this plan today, because its floor is high: it will not hurt them, the schedule is sustainable, and the strength work is well-chosen. I would *not* expect it to deliver V7/7b on its current trajectory, because a plan whose weeks don't progress and whose stimuli arrive fortnightly trains maintenance, not adaptation, after the first month of each phase. The encouraging part: the repo already knows most of this (KG-A2, B4, A1, A4, A7) — the review's job was mostly to confirm those gaps are the right ones, add the untracked contradictions (retest pseudo-deload, %-added intensity distortion, Base-Saturday phase mismatch, taper double-cut, comp non-specificity), and insist on priority: build the progression engine before any further prescription polish.
