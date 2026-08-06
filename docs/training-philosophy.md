# Training philosophy

This document grounds the planner's prescriptions in the published coaching literature it draws from. It is descriptive (what the plan does and why), not normative — the plan is built for one athlete (V5–V6 boulder / ~7a lead, ~3 years experience) and the choices are biased toward that profile.

> Known unknowns and doc/code divergences are tracked in [`knowledge-gaps.md`](knowledge-gaps.md) with stable KG-* IDs. Sections below carry a ⚠ marker where a divergence is known — check the referenced gap entry before treating either the doc or the code as authoritative.

## Three influences

The macrocycle is a synthesis of three widely-cited frameworks:

1. **Lattice Training** (Tom Randall, Ollie Torr — UK). Block-periodised, finger-strength-led, 3:1 deload cadence. Half-crimp dominates the Base phase. Deloads cut volume by 40–60% while holding intensity (see ADR 0003).
2. **Eric Hörst — *Training for Climbing*** (USA). Four-protocol fingerboard library (max hangs, repeaters, density, no-hang) mapped to phases. Strong emphasis on technique work alongside strength.
3. **Mike & Mark Anderson — *Rock Climber's Training Manual*** (USA). The "Rock Prodigy" template: Base / Strength / Power / Power-Endurance / Performance cycle of ~14–18 weeks, with explicit deload weeks and a fixed taper into a performance peak.

The three converge more than they diverge. Where they differ — e.g. Anderson favours density hangs in Strength phase, Lattice favours max hangs — the planner picks whichever protocol best suits the **athlete's level**, which for a V5–V6 intermediate climbing 3× per week is generally the Lattice path: max-hang based Base, with Hörst-style repeaters in Build for capacity.

## Mapped phases

| Phase | Lattice equivalent | Hörst equivalent | Anderson equivalent | Planner's hangboard |
|-------|--------------------|-------------------|----------------------|---------------------|
| Base | Capacity block | Strength-Endurance + max hangs | Base + Strength | 7/3 repeaters (capacity) + intro weighted max hangs |
| Build | Power block | Power phase | Power + PE | Weighted max hangs, 6–8 hangs @ RPE 8–9 |
| Peak | Peak performance | Power phase tail | Performance | 7-53 (Lattice) — heaviest, lowest volume |
| Taper | Taper | Performance week | Performance | Low-volume near-max hang — hold intensity, cut volume |

The Base/Build hangboard protocols above are the decided **and implemented** design ([ADR-0005](adr/0005-base-build-hangboard-protocols.md), implemented 2026-07-04): repeaters build capacity in Base, weighted max hangs build recruitment in Build, and the old min-edge-to-failure Base protocol is deleted. The Taper row matches [ADR-0007](adr/0007-taper-hold-intensity-peaktype.md) (hold intensity, cut volume), also in code.

**Intensity percentages are of total system load** (bodyweight + the added benchmark), not the added weight alone — [ADR-0013](adr/0013-total-load-intensity-convention.md), implemented 2026-07-17 (band derivation: [`specs/total-load-bands-spec.md`](specs/total-load-bands-spec.md)). Lattice's published max-hang intensity is explicitly stated in total-load terms ("80–95% of maximum total load, lower end for climbers first trying max hangs" — `research/verified-findings.md` ~L281); the planner's bands sit inside that: Base intro 80–85%, Build 87–92%, Peak (7-53) 92–96%, Taper 90–94% — a real, monotone ramp, versus the ~90→99% the old added-only math actually produced. Weighted pull-up bands (Base 75–82%, Build 84–89%, Peak 88–90%, Taper 87–90%) follow general strength-training rep-max relationships (5-rep ≈75–85%, 3-rep ≈84–89%, 2-rep ≈88–93% of 1RM) — coaching convention, not climbing-specific, labelled as such.

The Peak protocol was softened from the published Lattice/Anderson defaults for this athlete — see ADR 0001 (re-adjudicated against the verified research and implemented 2026-07-02; see the ADR's addendum).

## Year-level shape and intensity distribution

**Phase duration** follows Lattice's block shape: the default 12-week cycle resolves to ~50% Base, ~25% Build, ~17% Peak, ~8% Taper (6/3/2/1 weeks at the 12-week comp shape — `buildPhasePattern`), so most of the *calendar* sits in Base, with Peak a brief, intense expression of the work done earlier. That much is accurate and implemented.

**The plan is not 80/20 polarized in the intensity sense** — and this section used to claim it was. Lattice's 80/20 rule, and the Seiler-style polarized model behind it, describes an *intensity distribution* (~80% of training time genuinely easy, ~20% hard), not a phase-duration split. Mapping "half the calendar is Base" onto "80% of training is easy mileage" conflates the two. What the prescriptions actually deliver is a **concurrent / threshold-pyramidal** model:

- **Genuinely easy rungs:** ARC (`sat-arc`, RPE 4–6), flash pyramid (RPE 6–7.5), and the optional easy open-climbing day (RPE 4–6). Base Saturdays alternate between the two easy rungs.
- **Deliberately threshold-to-hard rungs, including inside Base:** Base intro max hangs (RPE 8–9, 80–85% total load), Base weighted pull-ups (RPE 7–8.5), Base Thursday projecting (RPE 7.5–9), and an explicit 60/60 threshold interval (`SIXTY_SIXTY_EXERCISE`, RPE 7–8.5) — a rung a genuinely polarized model specifically avoids.

Concretely, a Base week's three loaded sessions are one easy (Saturday) and two that reach RPE 8–9 (Monday hangboard, Thursday projecting) — roughly half hard, not 80% easy.

**This was corrected as a labelling fix, not a prescription change — deliberately.** The concurrent model is defensible, and arguably necessary, for an intermediate climbing 3× per week: few sessions force strength and energy systems to overlap within the week rather than separating into polarized blocks. The Base RPE 8–9 max-hang loading is also evidence-supported (~80–95% of maximal total load is consensus across Lattice and Eva López; López-Rivera & González-Badillo 2019, Medernach 2015) and is what drives the G1 progression goal. This repo's own research review is blunter still: polarized models are "emerging but lack climbing-specific research" ([`research/deep-research-report.md`](research/deep-research-report.md) — Open Questions), so 80/20 was never the better-evidenced choice here, only the better-known label. So **do not add hard work to "fill the 20%"**: reasoning from the old framing over-estimates how much easy mileage this plan contains and would push weekly high-intensity finger load above what a G3-durability-gated plan intends. Corrected per **IB-001** ([`deep-audit.md`](deep-audit.md) §1, adversarially verified); no ADR asserted the 80/20 framing and nothing in the code consumes the label. Should this athlete's frequency ever rise above 3×/week, whether to adopt a genuinely polarized distribution becomes a live training question again — it is not one today.

For longer cycles the planner switches to a **double-block** structure above 20 weeks (ADR 0002). This mirrors Lattice's stated preference for repeating base→build mesocycles in annual plans over a single long base period.

## Deload cadence (3:1 — every 4th week, with a remainder into the Base retest)

Three weeks hard, one week deload — across Base and Build. The last Base deload is also a **retest** (re-measure max hang, weighted pull-up 1RM, current best boulder grade). Updated benchmarks reset load prescriptions for the Build phase. This 3:1 cadence matches Lattice's published default and sits inside Hörst's "every 3–4 weeks of hard training" bound. Decided in [ADR-0004](adr/0004-deload-cadence-3-to-1.md) and implemented 2026-07-04 (`(i+1)%4` in `buildPhasePattern`) — the code previously deloaded every 3rd week, a 2:1 cadence mislabeled "3:1" (see [KG-B3](knowledge-gaps-archive.md#kg-b3--deload-cadence-code-is-21-doc-says-31-lattices-31-is-every-4th-week-p2-g1g3), Closed).

**The cadence is not uniform at the end of Base** — worth knowing before reading a generated schedule. `buildPhasePattern` lays the `(i+1)%4` deloads down first, then **forces the last Base week to be the retest** (itself a deload), then suppresses a natural deload that would land immediately before it (`js/program.js:85–93`; constraint C2, pinned by `[ADR-0004][Phase2 C2]`). So the loading run *into* the retest is whatever the phase arithmetic leaves over — not always three weeks:

| Cycle | Base weeks | Recovery weeks in Base | Hard run into the retest |
|-------|-----------|------------------------|--------------------------|
| 12-wk comp (default) | 6 | 4, 6 (retest) | **1** week |
| 14-wk comp | 7 | 4, 7 (retest) | 2 weeks |
| 16-wk comp | 9 | 4, 9 (retest) | **4** weeks |
| 12-wk trip / project | 5 | 5 (retest) only — C2 suppresses the wk-4 deload | **4** weeks |
| 20-wk comp | 11 | 4, 8, 11 (retest) | 2 weeks |

Both directions of the deviation are consequences of that arithmetic rather than choices: the short run (12-wk comp) errs toward recovery, which is G3-consistent, while the 4-week runs sit at the outer edge of Hörst's "every 3–4 weeks" bound. Making the run uniformly three weeks would mean *relocating* the retest deload, not deleting a deload — removing the wk-4 one at 12-wk comp yields five consecutive hard weeks into the retest (`H H H H H R`), breaking the very bound the cadence exists to honour. So this is **documented rather than "fixed"**, per **IB-038** ([`deep-audit.md`](deep-audit.md) §10, which recommends exactly this wording change and rejects the schedule-changing alternative as self-defeating). The structural questions — whether that truncated final block is the right shape at all — stay open as **IB-005** and **IB-002**.

## Half-crimp dominance in Base

Base-phase hangboard work emphasises half-crimp (or half-crimp + open-crimp mixed sessions). Lattice's published research (the public summary of their member-data analysis) found half-crimp max strength is the single best predictor of climbing grade for intermediate climbers, plausibly because most edges encountered on V4–V8 / 6c–7b terrain are best held in half-crimp. Full-crimp work is omitted at this athlete's level on injury-risk grounds — full-crimp loading dramatically increases A2 pulley strain (Schweizer 2001; Vigouroux 2006).

## Peer-reviewed support and gaps

**Supported by controlled trials:**
- Short-cycle (4–10 week) max-hang and repeater protocols produce measurable strength gains in trained climbers. López-Rivera & González-Badillo 2019 (PMID 30988852, n=26, 8 weeks) — significant max-hang and force gains under structured fingerboard protocols.
- Progressive **added-weight** hangboard training beats climbing alone for grip strength in advanced climbers; a decreasing-hang-time "endurance" protocol did not. Mundry et al. 2021 (PMID 34188125) — an 8-week RCT, n=30 UIAA VI–VIII, three arms (added-weight / endurance / normal climbing), seven grips; added-weight vs control p = 0.032, ES 0.36, endurance arm no different from control. This is the direct evidence for the app's *weighted, progressive* max-hang bias over timed-hang endurance work on the board. **Corrected 2026-08-06 (IB-040):** this bullet previously read "strength-endurance specifically targeted in advanced climbers responds to short structured blocks … (review)", which mislabelled an RCT as a review and **inverted the result** — the endurance arm is the one that failed to beat control.
- Low-intensity finger loading builds finger strength comparably to maximal-load hangs, and combining the two is additive. Gilmore NK et al. 2024 (PMID 39560837, controlled study in healthy climbers).

**Coaching-consensus but no controlled trial:**
- Optimal macrocycle *length* — no head-to-head RCT compares 12 vs 18 vs 24 week cycles in climbers. Our choice of 12-week default and the switch to double-block at >20 weeks reflects coaching convention, not data.
- Optimal deload cadence (3:1 vs 2:1 vs 4:1). Lattice/Hörst/Anderson all use 3:1; no climber-specific RCT.
- Half-crimp dominance over full-crimp in training is a Lattice-internal data finding, not yet replicated externally in peer review.
- Antagonist / posterior-shoulder work reduces overuse incidence. Coaching consensus; no controlled trial in climbers.

**Open question:**
- For this athlete (V5–V6 / 7a, 3 yr) the planner currently uses an intermediate template. As the athlete progresses past V7 / 7b+ the Peak prescriptions may need to ratchet back up toward the published Lattice/Anderson defaults — the planner does not currently auto-detect this and would need a manual phase-aggressiveness setting.

## Sources

- Lattice Training — public coaching content, member-data summaries, Training for Climbing podcast appearances (Tom Randall / Ollie Torr).
- Hörst E. *Training for Climbing*, 3rd ed. (2016).
- Anderson M & M. *The Rock Climber's Training Manual* (2014).
- López-Rivera E, González-Badillo JJ. *J Hum Kinet.* 2019;66:183–195. PMID 30988852.
- Mundry S, Steinmetz G, Atkinson EJ, et al. *Sci Rep.* 2021;11:13530. PMID 34188125. (Hangboard training in advanced climbers: a randomized controlled trial.) — *Corrected 2026-08-06: previously listed as* Front Sports Act Living. *2021;3:651651, which was the wrong journal, volume and article number (IB-040).*
- Gilmore NK et al. *Sports Medicine – Open.* 2024. PMID 39560837. (Loading programs & finger strength in climbers.)
- Schweizer A. *J Biomech.* 2001;34(2):217–223. (A2 pulley loading in crimp grips.)
- Vigouroux L et al. *J Biomech.* 2006;39(14):2583–2592. (Finger pulley forces under crimp.)
- Sjöman AE et al. *Wilderness Environ Med.* 2023;34(4):435–441. PMID 37550103. (Injury association in intermediate climbers — basis for ADR 0001.)
