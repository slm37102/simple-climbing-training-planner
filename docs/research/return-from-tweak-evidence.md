# Return-From-Finger-Tweak — Evidence Sweep (KG-A7)

**Purpose.** Feed the KG-A7 return-from-tweak decision ([ticket #28](https://github.com/slm37102/simple-climbing-training-planner/issues/28)) an evidence-mapped picture of what governs the **"finger tweaked but not injured"** sub-clinical zone — the niggle/strain an intermediate climber (V5–V6 boulder / ~7a lead) *feels* but that is **not** a diagnosed pulley rupture. The right answer there is structured **de-escalation**, not binary rest (KG-A7). Research ticket: [#27](https://github.com/slm37102/simple-climbing-training-planner/issues/27).

**This document is descriptive, not decisional.** It maps what the evidence supports and where it is silent, mixed, or contested. It does **not** adopt a protocol, pick pain numbers, or decide whether return-from-tweak becomes a printed reference or app logic — that is [#28](https://github.com/slm37102/simple-climbing-training-planner/issues/28)'s job.

**Scope.** Return-from-tweak **only** — the de-escalation / reload / red-flag axis. Antagonist and shoulder *dosing* (the other half of KG-A7) is a separate concern owned elsewhere and is out of scope here.

**Evidence labels (hard rule, no uncited constants):**
- **VALIDATED** — primary-sourced / RCT / validated measurement.
- **CONVENTION** — practitioner consensus (coach/PT blog-level), not primary-validated.
- **CONTESTED** — actively disputed in the literature.

## Two evidence streams

1. **In-repo corpus** — `docs/research/verified-findings.md`, § *"Finger/pulley injury prevention, load mgmt & antagonists"* (26 confirmed claims, ~lines 1141–1245), the project's adversarially fact-checked climbing-training corpus. Higher-trust, climbing-specific. **Used as-is below, not re-derived.**
2. **Net-new web sweep** — a focused pass strictly on the tweak / sub-clinical zone, verified against first-party sources and labelled by evidence quality.

## The headline finding, up front

Like the monitoring-signals sweep, the gap between the streams **is** the finding — and here it is a *double* miss on the exact target:

- **The in-repo stream is injury-rehab-heavy, not tweak-zone.** Its finger content is about *diagnosed injury*: Schöffl-grade tears, the Hooper's Beta staged A2-rehab protocol (7s/3s repeaters, 3×7, open-hand→half-crimp), the climber's-elbow eccentric protocols, and 1–2-month graded return-to-climbing. That answers **"what to do once you've torn a pulley,"** a *different question* from **"what to do with a niggle that isn't an injury."** The one directly on-target corpus fact is a negative one: **"no clinical RCT proves any one A2 rehab protocol superior to another"** (verified-findings line 1215).
- **The web stream's single best piece of evidence is neither finger nor climber.** The only genuine RCT in this whole space is **Silbernagel 2007** — a *pain-monitoring loading model for Achilles tendinopathy*. Everything climbing-and-finger-specific (Hooper's Beta, Lattice, Tyler Nelson, The Climbing Doctor, maxclimbing) is **practitioner CONVENTION**, explicitly grounded in biomechanical reasoning + clinical experience rather than head-to-head trials.

So KG-A7 sits in a genuine evidence gap, and the **de-escalation sub-question (Q1) is the least-evidenced of the three** — it is governed almost entirely by convention. The honest options for #28 are mostly *"adopt a practitioner convention, labelled unvalidated"* or *"transfer a non-finger RCT model by analogy, labelled as an extrapolation."* Note prominently: **no RCT proves one finger-rehab/reload protocol superior to another** is already established in-corpus — so #28 cannot expect the literature to break a tie between candidate forms.

---

## Q1 — Structured DE-ESCALATION through a tweak (load / intensity / volume / grip regression)

*The least-evidenced sub-question. No primary source tests a de-escalation protocol for a sub-clinical finger tweak. What exists is (a) one validated loading-through-pain **principle** borrowed from tendon rehab, (b) validated grip **biomechanics**, and (c) practitioner **protocols** built on top of both.*

### The loading-through-pain principle (the "traffic-light" model)

- **Principle — VALIDATED, but double-extrapolated.** The **Silbernagel pain-monitoring model** ([Silbernagel, Thomeé, Eriksson & Karlsson 2007, *Am J Sports Med*](https://journals.sagepub.com/doi/abs/10.1177/0363546506298279), RCT) is the primary source behind "load through acceptable pain rather than rest." Its rule (per the sagepub abstract, and corroborated verbatim by the already-vetted in-repo `monitoring-signals-evidence.md` Signal 7): continue loading if pain **during** activity stays acceptable (operationalised **≤ 5/10** on the NPRS), pain **after** activity ≤ 5/10, pain **the next morning** does **not** exceed 5/10, **and** pain/stiffness **does not increase week to week.** Result: no negative effect from continuing loading vs. rest during Achilles-tendinopathy rehab. (The full-text PDF did not fetch cleanly; the four-part criteria rest on the abstract + in-repo corroboration, not a read of the full text.)
  - **Two extrapolation gaps, flag both.** (i) It is **Achilles tendinopathy** — a degenerative *tendon* condition. A finger pulley is an **annular ligament**, not a tendon, and a fresh tweak is often **acute**, not degenerative. So even the one RCT is a loading-model **by analogy** for finger tweaks. (ii) It is **not tested in climbers.** [E3 Rehab](https://e3rehab.com/how-to-rehab-tendon-injuries-and-pain/) confirms Silbernagel "helped popularize" the model and frames it explicitly for *tendinopathy*, not ligament/pulley.
- **The 0–10 traffic-light tiers (≤3 green / 3–5 amber / >5 red) — CONVENTION.** The specific tiering laid on top of the Silbernagel principle is later practitioner convention, not from the RCT. Even the core threshold is unsettled: E3 Rehab notes "some [PTs] recommend staying at 3/10 pain or less while others might suggest 5/10 pain or less — you get to decide." (This matches the monitoring-signals doc's Signal 7 conclusion.)

### Grip regression (crimp → open-hand) — split the label

- **The biomechanical mechanism — VALIDATED.** Open-hand keeps flexor-tendon force vectors near-parallel to the bone so the A2 is barely loaded, whereas a full crimp with the PIP joint flexed ≥ 90° turns the A2 into a fulcrum and spikes pulley load (verified-findings line 1167; primary lineage: Schweizer 2001, Vigouroux 2006, both cited in `docs/training-philosophy.md`). This is why "drop to open-hand" is a mechanically sound de-escalation lever.
- **The de-escalation *protocol* built on it — CONVENTION.** The step-down sequence itself (regress crimp → half-crimp → open-hand; cut intensity; hold larger edges) is practitioner consensus, not trial-tested for tweaks:
  - **Hooper's Beta A2 manual** ([hoopersbeta.com](https://www.hoopersbeta.com/library/a2-pulley-manual-for-climbers)) — its earliest rehab loading is **"light isometrics on large edges, OPEN-HAND only, low intensity ~20–30% effort,"** with the explicit framing **"controlled loading, not avoidance"** (verified-findings lines 1155–1157). Grip is staged open-hand → half-crimp before any progression. Hooper's own disclaimer: no RCT backs this; it is biomechanical reasoning + clinical experience.
  - **maxclimbing "Safe Return to Load"** ([maxclimbing.com](https://www.maxclimbing.com/blogs/knowledge-hub-injury-prevention/finger-pulley-injuries-a2-a3-a4-mechanics-symptoms-safe-return-to-load)) — an aggregated de-escalation ladder: Phase 1 pain-phase isometrics (3–5 reps, 30–45s holds, **20–40% intensity**, large edge/jug, progress when pain ≤ 3/10 open-hand); Phase 2 controlled eccentrics (open-hand only, minimal pain < 3/10); Phase 3 progressive loading via a **"2–5% weekly increase" rule**, **half-crimp first, full crimp last** (reintroduced only at "zero pain, zero swelling"). Blog-level CONVENTION, but internally consistent with the mechanism above.
  - **Lattice** ([climbing.com/Lattice hangboarding](https://www.climbing.com/skills/lattice-hangboarding-part-2/)) — de-escalate to **larger holds** (spreads load across soft tissue) and **low RPE (5–7)** rather than testing to max, "under the guidance of a professional." CONVENTION.
- **Volume vs. intensity split — SILENT.** No source specifies *how much* to cut volume for a tweak (the deload analogue). The corpus's "cut volume, hold intensity" deload rule is for *scheduled fatigue*, not tweak de-escalation, and does not transfer cleanly — for a tweak, intensity/grip is exactly what the conventions cut first. This is a genuine silence for #28.

---

## Q2 — Load THRESHOLDS for RESUMING hangboarding

*Better-supported than Q1 on the "how" (low intensity, big holds, open-hand first), but every numeric go/no-go threshold is CONVENTION. There is no validated finger-specific "safe-to-reload" cutoff.*

- **Reload *modality* — supported by adjacent VALIDATED evidence.** [**Gilmore et al. 2024**](https://pubmed.ncbi.nlm.nih.gov/39560837/) (Gilmore NK, Klimek P, Abrahamsson E, Baar K, *Sports Medicine – Open*, Nov 2024, PMID 39560837) found **frequent low-intensity finger loading ("Abrahangs," a 10-min low-intensity hangboard protocol) was as effective at building grip strength as maximal-load "Max Hangs,"** and combining them was additive. **Caveat / scope:** this is a *training-adaptation study in healthy climbers* — it does **not** test tweak-return or reloading. Its relevance is indirect: it means a **low-intensity reload ramp** is not a strength-cost compromise, which removes one objection to reloading gently. (See also the corpus's Hörst "protective finger protocol": a ~6-min, low-to-moderate, near-daily non-fatiguing loading routine — verified-findings lines 1143–1153 — a candidate reload/prehab modality, but framed as *prehab*, not tweak-return.)
- **Reload *criteria / thresholds* — CONVENTION (no validated number):**
  - **Symptom-gated (most common):** resume only when the de-escalation gate clears — e.g. pain-free / ≤ 3/10 in open-hand pulling, no next-day flare (maxclimbing; mirrors the Silbernagel next-morning rule). Convention.
  - **Force-gated (Tyler Nelson / Camp4):** [Nelson's auto-regulation model](https://www.camp4humanperformance.com/blog/2018/9/20/program-auto-regulation-and-its-implications-on-finger-training-tyler-nelson-dc-ms-cscs-camp4-human-performance) uses **measured force on a scale**, not RPE: retest daily and **only train fingers when you can reproduce a set percentage (~85%) of your baseline max** — his worked example didn't clear the cutoff until four days post-session. A concrete, objective readiness rule, but demonstrated n=1 and **not validated as a tweak-return threshold** — CONVENTION (and it presumes a load cell the app doesn't have).
  - **Intensity/RPE to *restart* at:** low — Lattice **RPE 5–7**; Hooper's **~20–30% effort**; maxclimbing **20–40%** — on **large holds, open-hand first**. Cross-source convergence, all CONVENTION.
  - **Progression rate back up:** maxclimbing's **2–5%/week**; grip-position sequence open-hand → half-crimp → full-crimp-last. CONVENTION.
- **What's SILENT:** no source gives a validated *finger* threshold for "you are now safe to hang," and none quantifies "how flat/how sore = not yet." This parallels the monitoring-signals doc's finding that finger-strength *measurement* is climbing-validated (retest ICC > 0.75) but has **no validated monitoring/decision threshold.**

---

## Q3 — RED-FLAG criteria: stop entirely / see a professional

*The best-defined of the three sub-questions, because it overlaps the (VALIDATED) diagnosed-injury literature — but note that "red flag" here means "this is probably no longer a tweak," i.e. the point where the tweak question ends and the injury literature (out of KG-A7's tweak scope) takes over.*

- **Cross-source red-flag list (CONVENTION / clinical-exam consensus):** the tweak-vs-injury sources agree on the escalation signs —
  - **Audible pop / snap at onset** (hallmark of partial/complete tear — though popping *alone* isn't definitive; Hooper's).
  - **Swelling** (none-to-mild = strain; moderate-to-immediate = tear).
  - **Bruising.**
  - **Visible bowstringing** (tendon lifting off bone under load) — the strongest single red flag.
  - **Pain limiting range of motion / pain at rest / loss of force.**
  - **Persistent sharp pain beyond 1–2 weeks, recurring swelling, nerve symptoms, mechanical locking/catching** (maxclimbing).
  Sources: [Hooper's Beta A2 manual](https://www.hoopersbeta.com/library/a2-pulley-manual-for-climbers) (mild tenderness + full pain-free ROM + no bowstringing = likely strain; bowstringing / moderate-severe swelling / ROM-limiting pain = get evaluated); [maxclimbing](https://www.maxclimbing.com/blogs/knowledge-hub-injury-prevention/finger-pulley-injuries-a2-a3-a4-mechanics-symptoms-safe-return-to-load); [Hooper's finger self-assessment tool](https://www.hoopersbeta.com/finger-tool).
- **Bowstringing specifically — VALIDATED clinical sign (but for diagnosed injury).** Clinical "bowstringing" on exam is a recognised grade-III finding; imaging (dynamic ultrasound, "highly sensitive and specific") confirms the underlying injury ([Lutter et al. 2021, "Finger Flexor Pulley Injuries in Rock Climbers," PMID 33966972](https://pubmed.ncbi.nlm.nih.gov/33966972/)). This is injury-grade, not tweak-zone.
- **The grading system it escalates into — VALIDATED, out of tweak scope.** The **Schöffl I–IV** classification ([Schöffl et al. 2003, *Wilderness Environ Med*](https://dx.doi.org/10.1580/1080-6032(2003)014[0094:PIIRC]2.0.CO;2); review [Current Sports Medicine Reports 25(6):196–202, June 2026](https://journals.lww.com/acsm-csmr/abstract/2026/06000/climbing_pulley_injuries__evaluation,_treatment.8.aspx)): Grade I = strain (<2 mm, no dehiscence), II–III = partial/complete A2/A3 rupture, IV = multiple/complex → surgery. Return-to-sport timelines are **6–8 weeks (grade I–II)** and **~3 months (grade III)**, with protective taping for months. **This is the diagnosed-injury track and lies outside KG-A7's tweak zone** — surfaced here only so #28 knows exactly where the red-flag boundary hands off.

---

## What the in-repo corpus already covers (and doesn't) for the tweak zone

- **Covers (diagnosed injury):** Hooper's Beta staged A2 rehab (7s/3s repeaters, 3×7, 3 min rest, 3×/wk, open-hand → half-crimp; verified-findings 1155–1166); grip biomechanics (1167); H-taping (−16% bone-tendon distance, +13% crimp strength; 1211); climber's-elbow eccentrics + staged tendon loading (1195–1245); graded return-to-climbing over 1–2 months (1235); Hörst 6-min protective finger protocol (1143–1153).
- **Does NOT cover (the tweak zone):** a daily pain-gate for deciding whether to load *today* on a niggle; a de-escalation ladder for sub-clinical tweaks; a reload threshold. (The monitoring-signals doc reached the same conclusion from the KG-A4 side — "no finger/pulley pain check-in distinct from generic soreness," and its Signal 7 overlaps KG-A7 directly.)
- **The anchor fact:** verified-findings line 1215 — **"No clinical randomized controlled trial proves any one A2 rehab protocol superior to another."** Combined with the tweak-zone being convention-only, #28 should not expect evidence to rank candidate forms.

## App state (brief context for #28's app-logic option)

Two facts bound the "app logic" branch — kept short by design:
- **No finger-specific pain input exists.** The daily readiness check-in is `{sleep, soreness, fatigue}` (`js/loads.js`); its "soreness" is generic, not a tendon/finger pain gate (KG-A4). A Silbernagel-style pain-gate would need a **new** input.
- **A layoff-reload mechanic already exists** — `layoffDecay` in `js/loads.js` (ADR-0008): ×1.0 within a 10-day grace period since a session type was last logged, else −3%/week floored at ×0.85. It guards against resuming at full load after *any* gap, but it is time-based, not tweak/symptom-aware — it is the nearest existing hook a return-from-tweak feature could extend or sit beside.

---

## What this feeds

This map feeds **decision ticket [#28](https://github.com/slm37102/simple-climbing-training-planner/issues/28): return-from-tweak as a printed reference vs. app logic** (KG-A7's verdict was research-first, "possibly a printed reference rather than app logic"). Mirroring how the monitoring-signals doc handed off to [#26](https://github.com/slm37102/simple-climbing-training-planner/issues/26):

- **What the evidence supports (safe to build on, with labels):** load-through-*acceptable*-pain rather than binary rest is a real RCT-backed **principle** (Silbernagel, VALIDATED — but tendon, not pulley); grip regression crimp → open-hand rests on **validated biomechanics**; low-intensity reloading costs no strength (Gilmore 2024, VALIDATED in healthy climbers); the **red-flag list** (pop, swelling, bruising, bowstringing, rest/night pain, ROM loss) is well-converged and marks the tweak/injury boundary.
- **Where it's CONVENTION only (must be labelled unvalidated wherever adopted):** every numeric constant in the tweak zone — the ≤3 vs ≤5 pain tier, "20–40% / RPE 5–7" restart intensity, "2–5%/week" progression, "~85% force = ready," the grip-regression *ladder* itself. These are practitioner consensus, not primary-validated, and the sources disagree on the numbers.
- **Where it's SILENT / MIXED / CONTESTED:** no source quantifies the *volume* cut for a tweak; no validated *finger* reload threshold exists; the single best RCT is a **tissue-type and population extrapolation** (Achilles tendinopathy → finger pulley → climber). And the corpus's own verdict stands — **no RCT proves one protocol superior**, so #28 cannot lean on evidence to choose a specific form. If #28 goes to app logic, a new finger-pain input is required (KG-A4 adjacency); the existing `layoffDecay` grace period is the nearest reusable hook.

---

## Empty / unresolved search leads (reported, not fabricated)

- **"Gilmore 2024" — RESOLVED, but not what the repo docs say.** PMID 39560837 resolves to **Gilmore NK, Klimek P, Abrahamsson E, Baar K, "Effects of Different Loading Programs on Finger Strength in Rock Climbers," *Sports Medicine – Open*, Nov 2024** — a *finger-strength training-adaptation* study in **healthy** climbers (low-intensity Abrahangs ≈ Max Hangs). It does **not** cover return-from-tweak or antagonist work. Note a **citation discrepancy in the repo**: `docs/training-philosophy.md` (line 49/66) and `docs/knowledge-gaps.md` (KG-A7) cite the same PMID 39560837 as *"Gilmore et al. 2024, Sports Health, antagonist/injury review"* — the PMID, journal, and topic don't match (it's *Sports Medicine – Open*, finger loading, not *Sports Health*, antagonists). **Corrected in the repo docs 2026-07-16:** the finger-loading citation was fixed everywhere (PMID verified via NCBI), the antagonist/overuse claim was moved from the "controlled-trial" tier to "coaching consensus" (no valid PMID exists for it), and the `js/program.js` KG-A7 comment attribution was corrected — the 2–3×/week dosing figure itself was left untouched.
- **No dedicated *sub-clinical-tweak* RCT exists.** The climbing-medicine literature in this space (Lutter 2021 PMID 33966972; the 2026 CSMR review; Schöffl 2003) is about **diagnosed** pulley injury, not the niggle zone. The tweak zone remains **practitioner-convention-only** — which is itself the finding.

## Sources

**In-repo corpus:** `docs/research/verified-findings.md` § *Finger/pulley injury prevention* (lines 1141–1245, esp. 1155–1169, 1211, 1215, 1235) and § *Assessment/benchmarks*; `docs/research/monitoring-signals-evidence.md` (Signal 7, pain-monitoring); `docs/training-philosophy.md` (Schweizer 2001, Vigouroux 2006, Gilmore 2024 citation); `docs/knowledge-gaps.md` KG-A4, KG-A7.

**Web sweep (first-party / primary where possible):**
- Silbernagel, Thomeé, Eriksson & Karlsson (2007), *Am J Sports Med* — pain-monitoring model RCT (Achilles): [sagepub](https://journals.sagepub.com/doi/abs/10.1177/0363546506298279). Model summary / tendinopathy-scope confirmation: [E3 Rehab](https://e3rehab.com/how-to-rehab-tendon-injuries-and-pain/).
- Hooper's Beta — [A2 Pulley Manual](https://www.hoopersbeta.com/library/a2-pulley-manual-for-climbers) (tweak-vs-injury criteria, staged loading, "no RCT proves one protocol superior"); [Finger self-assessment tool](https://www.hoopersbeta.com/finger-tool).
- maxclimbing — [Finger Pulley Injuries (A2/A3/A4): Mechanics, Symptoms & Safe Return to Load](https://www.maxclimbing.com/blogs/knowledge-hub-injury-prevention/finger-pulley-injuries-a2-a3-a4-mechanics-symptoms-safe-return-to-load) (grip-regression ladder, pain tiers, 2–5% rule).
- Tyler Nelson / CAMP4 — [Program Auto-Regulation and Its Implications on Finger Training](https://www.camp4humanperformance.com/blog/2018/9/20/program-auto-regulation-and-its-implications-on-finger-training-tyler-nelson-dc-ms-cscs-camp4-human-performance) (force-gated readiness ~85%).
- Lattice Training — [Guide to Better Hangboarding, Part 2](https://www.climbing.com/skills/lattice-hangboarding-part-2/) (low RPE 5–7 reload, larger holds, professional guidance).
- Gilmore NK, Klimek P, Abrahamsson E, Baar K (2024), *Sports Medicine – Open*, PMID 39560837 — [PubMed](https://pubmed.ncbi.nlm.nih.gov/39560837/) (low-intensity ≈ max-load finger strength; healthy climbers).
- Lutter et al. (2021), "Finger Flexor Pulley Injuries in Rock Climbers," PMID 33966972 — [PubMed](https://pubmed.ncbi.nlm.nih.gov/33966972/) (bowstringing, ultrasound, conservative grade I–III).
- Schöffl et al. (2003), *Wilderness Environ Med* — [pulley-injury grading I–IV](https://dx.doi.org/10.1580/1080-6032(2003)014[0094:PIIRC]2.0.CO;2); review: [Current Sports Medicine Reports 25(6):196–202 (June 2026)](https://journals.lww.com/acsm-csmr/abstract/2026/06000/climbing_pulley_injuries__evaluation,_treatment.8.aspx).

_Generated for wayfinder research ticket [#27](https://github.com/slm37102/simple-climbing-training-planner/issues/27), resolving KG-A7's return-from-tweak evidence question. Descriptive evidence map — no decision taken; hands off to [#28](https://github.com/slm37102/simple-climbing-training-planner/issues/28)._
