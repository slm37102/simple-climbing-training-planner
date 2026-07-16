# Athlete-Monitoring Signals — Evidence Sweep (KG-A4)

**Purpose.** Feed the KG-A4 grilling ([issue #26](https://github.com/slm37102/simple-climbing-training-planner/issues/26)) an evidence-mapped menu of candidate monitoring signals, so it chooses 3–5 **signals + lookback windows + thresholds + responses** from evidenced options instead of inventing more uncited constants (the KG-C7 lesson). Research ticket: [#25](https://github.com/slm37102/simple-climbing-training-planner/issues/25).

**This document is descriptive, not decisional.** It lays out what the evidence supports and where it is silent, mixed, or contested. It does **not** rank the signals or recommend a monitoring model — that is #26's job.

## Two evidence streams

1. **In-repo corpus** — `docs/research/verified-findings.md`, the project's adversarially fact-checked climbing-training corpus (332 confirmed claims). This is the higher-trust, climbing-specific stream.
2. **Public sport-science sweep** — a focused literature pass on general athlete-monitoring signals (team-sport / endurance / tendon-rehab). Primary sources cited inline.

## The headline finding, up front

The two streams barely overlap, and the gap between them **is** the finding:

- **The in-repo corpus contains almost no trend-monitoring thresholds.** It is rich on *prescriptions* (RPE targets per protocol), *proactive fatigue management* (deload cadence, overtraining cautions), and *single-session autoregulation* (per-set load adjustment) — but it defines **no** "signal X over window Y crossing threshold Z → response" rule. The one longitudinal signal it validates is the **retest** (finger-strength testing is highly reliable), and even there it gives no "how flat = plateau" number.
- **The public sport-science literature has the trend-monitoring vocabulary** (wellness questionnaires, sRPE/monotony/strain, ACWR, HRV, pain-monitoring model) — but **almost none of it is validated in climbers**, several of its famous thresholds are **practitioner convention rather than primary-sourced**, and one flagship threshold (ACWR) is **actively contested** in the primary literature.

So KG-A4 sits in a genuine evidence gap. The honest options for #26 are mostly *"adopt a general-sport convention, labelled unvalidated"* or *"use the one climbing-validated measurement (retest) but accept there is no evidenced threshold for it."* Where a signal would require data the app does not currently collect, that is noted per-signal — because a signal the app can't feed is not a real option for #26.

## What the app already collects (baseline for feasibility notes)

- **Daily readiness check-in:** `{sleep, soreness, fatigue}` each 1–5, averaged → a single-day multiplier at boundaries 2.5 / 3.5 / 4.5 (`js/loads.js` `computeReadinessMultiplier`). **Single day, no baseline, no trend.** These bucket boundaries and multipliers are already flagged **"app convention, unvalidated"** in `docs/knowledge-gaps.md` (KG-C7 note).
- **Per-set RPE** on logged sessions (`actual.rpe`). Session *duration* is not logged.
- **Per-session load autoregulation** already exists: `Loads.autoAdjust` compares the previous session's avg RPE to the target `rpeRange` and nudges load ±5% (ADR-0009 upgrades this to a progression when RPE-in-range **and** prescribed sets/reps were hit).
- **Max-hang benchmark (retest)** once per Base block via `setGlobalBenchmarks` — but **no history is kept**: `globalBenchmarks` has no `history` array (CLAUDE.md; the retest "Save as Benchmark" path overwrites). The previous value is gone.
- **No pain check-in distinct from generic soreness** (KG-A4 names this explicitly; the readiness "soreness" item is not tendon/finger-specific).
- **No HRV, resting HR, bodyweight, or objective sleep-duration capture.**

---

## Signal-by-signal

Each block: **what it is → lookback → threshold → response → evidence quality → what the in-repo corpus says → app feasibility.** The first four signals are the ones KG-A4 named; the rest were surfaced by the sweep.

### Signal 1 — Subjective readiness / wellness questionnaire

- **Signal.** Daily self-report of fatigue, sleep, soreness, stress, mood. Canonical instrument: the **Hooper–Mackinnon index** (4 items, summed). The app's `{sleep, soreness, fatigue}` check-in is a shortened variant.
- **Lookback.** Daily reading compared against the athlete's **own rolling baseline** (commonly 7- or 28-day personal average) — a *deviation-from-baseline* signal, not an absolute cut.
- **Threshold.** **No validated numeric threshold.** The evidenced trigger is "meaningfully below your own norm." Any fixed number (e.g. "act below 2 SD") is convention.
- **Response.** Reduce planned load/intensity or add recovery when below baseline — response protocols are convention, not RCT-derived.
- **Evidence quality.** General-athlete; **no climbing validation.** Key primary source: **Saw, Main & Gastin (2016)**, *Br J Sports Med* — a systematic review finding subjective wellness measures track load with **better sensitivity than common objective markers** (HR, hormones). Establishes *responsiveness to load*, **not a decision threshold.** Instrument: Hooper & Mackinnon 1995.
- **In-repo corpus.** No wellness-questionnaire claim. `knowledge-gaps.md` independently notes wellness-questionnaire evidence in sport science is **"mixed"** and the app's readiness multipliers are **"app convention, unvalidated."**
- **App feasibility.** Data is **already collected daily.** A *trend* version needs (a) storing the daily readiness as history and (b) a rolling personal baseline — neither exists today (readiness feeds a single-day multiplier only).

### Signal 2 — Session-RPE, load, monotony & strain (Foster)

- **Signal.** **sRPE = RPE (0–10) × duration (min)** = internal load (AU). Weekly: **monotony** = weekly mean daily load ÷ SD; **strain** = weekly load × monotony.
- **Lookback.** Per-session for load; **rolling 7-day** for monotony/strain.
- **Threshold.** **Monotony > ~2.0** is the commonly cited flag — but this is **practitioner convention, not a validated cutoff.** Foster (1998) observed load/monotony/strain spikes *preceding* illness in a small sample; he did not validate 2.0.
- **Response.** Add day-to-day load variation (hard/easy alternation) to lower monotony. Convention-level.
- **Evidence quality.** General-athlete; **no climbing validation.** **sRPE-as-load is well validated** (Foster et al. 2001; Haddad et al. 2017 review); the **monotony/strain thresholds are weak/convention** (Foster 1998, small-n observational). Caveat: session *duration* is awkward for climbing — long inter-attempt rests inflate "duration."
- **In-repo corpus.** Has the RPE *anchors* this would build on (60/60 = RPE 7–8.5; 30/30 = RPE 9–10; max hangs / pull-ups = RPE 8–9) and qualitative overtraining cautions, but **no sRPE / monotony / strain concept.**
- **App feasibility.** RPE is logged per set; **session duration is not** → sRPE, monotony, and strain are **not computable** without a new input.

### Signal 3 — Acute:Chronic Workload Ratio (ACWR)

- **Signal.** **7-day acute load ÷ 28-day chronic load** (any load unit; sRPE-AU works).
- **Lookback.** 7-day acute, 28-day chronic (rolling-average or EWMA).
- **Threshold.** Reported **"sweet spot" ~0.8–1.3**, **"danger zone" > ~1.5** (and < 0.8 also elevated). **Observational and contested.**
- **Response.** Keep weekly acute load within ~0.8–1.3 of the 28-day average; avoid spikes. (Causal "manipulate ACWR to prevent injury" has never been tested.)
- **Evidence quality.** General-athlete (cricket, rugby league, AFL); **no climbing validation.** **CONTESTED — this is the headline caveat.** Original support is observational (Gabbett, *Br J Sports Med* 2016; Hulin 2014–16). Major published critiques: **Lolli et al. (2019)** — mathematical coupling produces spurious correlation (acute load is *inside* chronic load); **Impellizzeri et al. (2020)**, *IJSPP*, "Conceptual Issues and Fundamental Pitfalls" — the ratio adds no predictive value beyond acute load and the risk relationship **disappears** when data are treated as continuous. Critique-literature consensus: **no evidence supports using ACWR for training/injury decisions.**
- **In-repo corpus.** Nothing. (KG-A12 separately rules an ACWR-style cross-session fatigue model **won't-fix as a model.**)
- **App feasibility.** Needs a continuous load unit the app doesn't compute (see Signal 2's duration gap). Also collides with the existing KG-A12 decision.

### Signal 4 — RPE drift at constant load

- **Signal.** The **same absolute load feeling progressively harder** — RPE creeping up for a fixed kg / grade / effort — read as accumulating fatigue / early non-functional overreaching (NFOR).
- **Lookback.** Multi-session / multi-week trend of RPE on a repeated, **load-matched** task. Not single-day.
- **Threshold.** **No validated numeric threshold.** A conceptual NFOR marker within the overreaching continuum; the literature does not define "X points over Y weeks." Treated as a flag to be **confirmed by a performance test** (Signal 6), not a standalone trigger.
- **Response.** Investigate recovery; reduce load / add a recovery period; confirm functional vs non-functional retrospectively by whether performance rebounds.
- **Evidence quality.** General/endurance; **no climbing validation.** Expert consensus: **Meeusen et al. (2013)**, ECSS/ACSM overtraining consensus statement (defines FOR→NFOR→OTS). Consensus/definitional, **not a measurable threshold**; RPE drift alone is nonspecific (heat, sleep, illness move it too).
- **In-repo corpus.** **The most corpus-aligned trend signal.** The corpus supplies fixed RPE anchors per protocol (above), so "RPE above target for the prescribed load" is *detectable*. The corpus also backs the **single-session** version — load autoregulation by RPE / margin (Eva López max-hangs; "top sets RPE 8–9, ~1–2 s in reserve") — which the app already implements as `autoAdjust`. The trend version is the multi-week extension of that.
- **App feasibility.** RPE is logged; "constant load" is **clean only on `hangboard`/`pullup` kinds** (kg is computed/logged there). On climbing kinds load is unquantified, so constant-load drift can't be cleanly defined. Would extend the existing per-session RPE comparison across weeks.

### Signal 5 — Heart-rate variability (HRV)

- **Signal.** Parasympathetic tone via **lnRMSSD** from a short morning reading (phone camera-PPG or chest strap).
- **Lookback.** **7-day rolling average of lnRMSSD**, plus weekly **CV** as an instability index.
- **Threshold.** **Smallest Worthwhile Change (SWC) = 0.5 × individual CV** (≈ mean ± 0.5 SD of baseline). 7-day average below the lower SWC bound = suppressed. A **method convention**, individualized — not a universal number.
- **Response.** HRV-guided training: hard work when HRV ≥ SWC band, easy/recovery when below. Complicated by a documented divergence — some athletes overload with *suppressed* HRV, others with *elevated* HRV + reduced variability.
- **Evidence quality.** **MIXED / mostly endurance.** Favorable HRV-guided-training RCTs are in runners/cyclists (Kiviniemi 2007; Vesterinen 2016; Javaloyes 2019). **WEAK for resistance-trained athletes** (largely n=1 case studies, Flatt et al.) and a **parasympathetic-saturation** confound undermines "low = bad." **No climbing validation.** Methods: Plews & Buchheit (~2013, *Sports Med*).
- **In-repo corpus.** Nothing.
- **App feasibility.** **Not collectable today** — no HRV input, no sensor integration. Highest data-collection cost of any signal here.

### Signal 6 — Performance / retest trajectory

- **Signal.** Repeated standardized benchmark (max finger-strength / max-hang; or a jump test) tracked for rise / flatline / decline.
- **Lookback.** Test-to-test over weeks / mesocycles (phase boundaries, or every 2–4 wk).
- **Threshold.** **No validated individual threshold for "how flat = meaningful."** A **performance decrement is the *defining* criterion of NFOR/OTS** (Meeusen 2013) but is not quantified per-athlete. S&C practice uses a test-specific SWC (~half the between-day CV) — general convention, not climbing-validated.
- **Response.** A confirmed decline (or failure to rebound after planned recovery) distinguishes functional overreaching (rebounds) from non-functional (stays suppressed → reduce load, extend recovery).
- **Evidence quality.** **Measurement is climbing-validated; the threshold is not.** In-repo corpus: finger-strength testing is **highly reliable** — 14/15 studies ICC > 0.75, 12 studies very-high ICC (0.85–0.99); the **20 mm edge** is validated for standardized progress tracking; the 7 s 20 mm max-hang %BW predicts boulder grade (R² = 0.496 combined, but only **0.167 among advanced climbers** — predictive power fades as you get stronger). Threshold interpretation is consensus (Meeusen) + S&C convention only.
- **App feasibility.** **Blocked by a storage fact:** the max-hang benchmark keeps **no history** (`globalBenchmarks` overwrites; no `history` array). "Retest flat two cycles → plateau" is **literally not computable today** — the prior value is gone. This is the single most important feasibility note for #26: the app's one climbing-validated longitudinal signal currently discards the data a trend needs. (Note the adjacency to ADR-0009's *progression* trigger — "increase load 2.5–10% once all targets hit" — of which plateau detection is the inverse, and which is *not* implemented.)

### Signal 7 — Pain monitoring (tendon / finger load management)

- **Signal.** **0–10 pain rating** gating continued loading of a tendon/finger, judged during activity **and by how it settles afterward.**
- **Lookback.** **Per-session and next-morning** — pain during loading, after, and on waking; trend over 24 h and week-to-week.
- **Threshold.** Two layers:
  - **Validated model (Silbernagel):** continue loading if pain during activity stays acceptable (operationalized ~**≤ 5/10**), **does not increase week to week**, and **symptoms/morning stiffness are not worse the next morning.**
  - **Traffic-light 0–10 (≤3 green / 3–5 amber / >5 red):** this specific tiering is **later practitioner convention** on top of the Silbernagel principle.
- **Response.** Green → continue; amber → hold, don't progress; red or not-settled-by-morning → reduce load. Progress only when pain stays acceptable and stable.
- **Evidence quality.** **The strongest single primary source in the sweep — but it is tendon-rehab, not training-monitoring, and not in climbers.** Original: **Silbernagel et al. (2007)**, *Am J Sports Med* — RCT, Achilles tendinopathy ("Continued Sports Activity, Using a Pain-Monitoring Model…"), later extended to patellar tendinopathy. The climbing/finger-pulley application (Vagy / The Climbing Doctor; pulley-rehab guides) is **practitioner blog-level, not RCT-tested in climbers**; the 0–10 traffic-light numbers are convention.
- **In-repo corpus.** Has load-*staging* rehab protocols (Hooper's Beta A2 staged loading; climber's-elbow eccentrics; graded return-to-climbing over 1–2 months; tendon loading staged by injury phase) — i.e. **what to do once tweaked**, but **not a daily pain-gate for deciding whether to load today.** Directly answers KG-A4's "no finger/pulley pain check-in distinct from generic soreness" and overlaps KG-A7 (return-from-tweak).
- **App feasibility.** Needs a **new pain input** distinct from the generic `soreness` readiness item. Lowest-tech of the "new data" signals — one 0–10 field + a "settled by morning?" follow-up.

### Signal 8 — Sleep, resting HR, bodyweight

- **Signal.** Simple daily markers — sleep duration/quality, morning RHR, morning bodyweight.
- **Lookback.** Daily vs 7-day personal baseline.
- **Threshold.** **No validated daily thresholds from primary sources.** The quoted **"RHR up 5–7 bpm or ~10% above baseline"** traces to **fitness/practitioner blogs, not a primary study.** Sleep and bodyweight have no validated single-day trigger for a recreational athlete — evidenced value is as *context*, not standalone cuts.
- **Response.** Convention: sustained RHR rise / poor sleep / unexplained weight drop → caution. Not from controlled trials.
- **Evidence quality.** General-athlete; **no climbing validation. Weak / practitioner-convention** for the numbers. The broad *sleep-loss impairs performance/recovery* claim is well established (review literature) but yields no daily threshold. RHR overlaps HRV (Signal 5) and shares its confounds.
- **In-repo corpus.** Nothing beyond the general fitness-minus-fatigue rationale (below).
- **App feasibility.** Sleep is **partially collected** (a subjective 1–5 item, not duration); RHR and bodyweight are **not collected.**

---

## Two more phone-accessible retest options the sweep surfaced

- **Countermovement jump via validated phone app** (My Jump 2 / My Jump Lab; validated vs force plates, Balsalobre-Fernández et al. 2015) — a neuromuscular-fatigue retest. Cheap and phone-native, but jump height is a **lower-limb** measure with **no climbing validation** for a climber's fatigue.
- **Grip / finger dynamometry** (handheld dynamometer, or load-cell hangboard tools like Tindeq) — the most climbing-face-valid version of Signal 6, with reasonable test-retest reliability in climbing research. But its use as an **overreaching/plateau *monitoring* threshold is not validated** — no "decline of X% = overreached."

---

## The proactive-vs-reactive framing (context for #26)

The app already manages fatigue **proactively**, and the corpus backs that approach strongly: the fitness-minus-fatigue rationale for scheduled deloads (verified-findings § Deload), the **3:1 cadence** (Lattice; Hörst "don't go >3–4 weeks without a deload or you accumulate deep fatigue"), and "cut volume, hold intensity." Monitoring (KG-A4) is the **reactive complement** to that already-implemented proactive system — a guard-rail for when the *pre-scheduled* deload isn't enough (the KG-A12 "Push-days stacking onto deep fatigue" residual risk that KG-A4 was asked to absorb). Framing the monitoring signals as *exception-catchers on top of the deload cadence*, rather than as a standalone training-load model, keeps them consistent with what the corpus actually supports and with the KG-A12 won't-fix-a-model decision.

---

## Signals with essentially no usable threshold evidence

Theoretical/consensus backing but **no validated numeric trigger** a phone-logging climber can apply off-the-shelf:

1. **RPE drift at constant load (S4)** — conceptual NFOR marker (Meeusen); no number; needs performance-test confirmation.
2. **Performance/retest trajectory (S6)** — decrement *defines* NFOR but "how flat = meaningful" is unquantified; only a general S&C SWC convention exists. (Plus: app keeps no benchmark history.)
3. **Sleep / RHR / bodyweight (S8)** — the "+5–7 bpm / 10% RHR" and any sleep/weight cut are **blog-level convention.**
4. **Wellness questionnaire (S1)** — strong evidence it *tracks* load (Saw 2016), but **no fixed threshold**; deviation-from-baseline only.
5. **Monotony/strain cutoff (part of S2)** — the ">2.0" flag is **convention** on top of Foster's small-n 1998 observation; sRPE-as-load itself is validated, the threshold is not.

**Best-supported operational rules in the set (still non-climbing):** the HRV **SWC = 0.5 × CV** rule (endurance RCTs) and the Silbernagel **pain-monitoring model** (a genuine RCT) are the only two with real primary-sourced operational rules — respectively endurance-only and tendon-rehab-only, with climbing use resting on extrapolation. ACWR's 0.8–1.3 is the most *famous* threshold and the most **contested** (Lolli 2019; Impellizzeri 2020).

## Cross-cutting climbing finding (explicit)

The climbing literature that surfaced here is **overuse-injury risk-factor reviews** and **practitioner RPE how-tos (Lattice)** — *not* validation of any monitoring signal above in a climbing population. So sRPE-trend, monotony/strain, ACWR, HRV, and wellness questionnaires are **essentially unvalidated in climbers**; the pain-monitoring model is adapted to fingers/pulleys by practitioners but **not RCT-tested in climbers**; and the retest is climbing-validated as a *measurement* but has **no evidenced monitoring threshold.** Whether any of these transfers to climbing is itself an open question — which is exactly why KG-A4's verdict was "define signals on paper first" and why #26 should expect to label its picks **"app convention, unvalidated"** wherever it goes beyond deviation-from-baseline.

---

## Sources

**In-repo corpus:** `docs/research/verified-findings.md` — § Deload/recovery/frequency; § Assessment, benchmarks & finger-strength metrics; § Finger/pulley injury prevention; § Strength/Power-endurance protocol RPE anchors; Eva López load-autoregulation claim. `docs/knowledge-gaps.md` — KG-A4, KG-A7, KG-A12, KG-C7.

**Public sport-science sweep (primary where possible):**
- Saw, Main & Gastin (2016), *Br J Sports Med* — subjective wellness measures (systematic review). Hooper & Mackinnon (1995) — index.
- Foster (1998), *Med Sci Sports Exerc* — monotony/strain, load-spike-precedes-illness (observational). Foster et al. (2001) — sRPE validity. Haddad et al. (2017), *Front Neurosci* — sRPE validity review.
- Gabbett (2016), *Br J Sports Med* — ACWR "training-injury prevention paradox"; Hulin et al. (2014–16). **Critiques:** Lolli et al. (2019) — mathematical coupling; Impellizzeri et al. (2020), *IJSPP* — "Conceptual Issues and Fundamental Pitfalls."
- Meeusen et al. (2013), ECSS/ACSM consensus — overtraining/overreaching continuum.
- Plews, Laursen, Stanley, Kilding & Buchheit (~2013), *Sports Med* — HRV monitoring methods; Kiviniemi 2007; Vesterinen 2016; Javaloyes 2019 (endurance RCTs); Flatt et al. (resistance-training case studies).
- Silbernagel, Thomeé, Eriksson & Karlsson (2007), *Am J Sports Med* — pain-monitoring model RCT (Achilles). Climbing adaptation: Vagy / The Climbing Doctor (practitioner, not primary).
- Balsalobre-Fernández et al. (2015) — My Jump app validation.

_Generated for wayfinder map [#22](https://github.com/slm37102/simple-climbing-training-planner/issues/22), ticket [#25](https://github.com/slm37102/simple-climbing-training-planner/issues/25). Descriptive evidence map — no decision taken._
