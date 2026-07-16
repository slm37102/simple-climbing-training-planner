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

The Peak protocol was softened from the published Lattice/Anderson defaults for this athlete — see ADR 0001 (re-adjudicated against the verified research and implemented 2026-07-02; see the ADR's addendum).

## Year-level shape (80/20)

Even within a single macrocycle the planner reflects the **Lattice 80/20 rule**: across the year, roughly 80% of training time should be capacity / base / "easy mileage" work, 20% high-intensity. A 12-week cycle compresses this to ~50% Base, ~25% Build, ~17% Peak, ~8% Taper, but the same principle holds — most of the volume sits in Base, with Peak treated as a brief, intense expression of the work done earlier.

For longer cycles the planner switches to a **double-block** structure above 20 weeks (ADR 0002). This mirrors Lattice's stated preference for repeating base→build mesocycles in annual plans over a single long base period.

## Deload cadence (3:1 — every 4th week)

Three weeks hard, one week deload — across Base and Build. The last Base deload is also a **retest** (re-measure max hang, weighted pull-up 1RM, current best boulder grade). Updated benchmarks reset load prescriptions for the Build phase. This 3:1 cadence matches Lattice's published default and sits inside Hörst's "every 3–4 weeks of hard training" bound. Decided in [ADR-0004](adr/0004-deload-cadence-3-to-1.md) and implemented 2026-07-04 (`(i+1)%4` in `buildPhasePattern`) — the code previously deloaded every 3rd week, a 2:1 cadence mislabeled "3:1" (see [KG-B3](knowledge-gaps.md#kg-b3--deload-cadence-code-is-21-doc-says-31-lattices-31-is-every-4th-week-p2-g1g3), Closed).

## Half-crimp dominance in Base

Base-phase hangboard work emphasises half-crimp (or half-crimp + open-crimp mixed sessions). Lattice's published research (the public summary of their member-data analysis) found half-crimp max strength is the single best predictor of climbing grade for intermediate climbers, plausibly because most edges encountered on V4–V8 / 6c–7b terrain are best held in half-crimp. Full-crimp work is omitted at this athlete's level on injury-risk grounds — full-crimp loading dramatically increases A2 pulley strain (Schweizer 2001; Vigouroux 2006).

## Peer-reviewed support and gaps

**Supported by controlled trials:**
- Short-cycle (4–10 week) max-hang and repeater protocols produce measurable strength gains in trained climbers. López-Rivera & González-Badillo 2019 (PMID 30988852, n=26, 8 weeks) — significant max-hang and force gains under structured fingerboard protocols.
- Strength-endurance specifically targeted in advanced climbers responds to short structured blocks. Mundry et al. 2021 (PMID 34188125, review).
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
- Mundry S et al. *Front Sports Act Living.* 2021;3:651651. PMID 34188125.
- Gilmore NK et al. *Sports Medicine – Open.* 2024. PMID 39560837. (Loading programs & finger strength in climbers.)
- Schweizer A. *J Biomech.* 2001;34(2):217–223. (A2 pulley loading in crimp grips.)
- Vigouroux L et al. *J Biomech.* 2006;39(14):2583–2592. (Finger pulley forces under crimp.)
- Sjöman AE et al. *Wilderness Environ Med.* 2023;34(4):435–441. PMID 37550103. (Injury association in intermediate climbers — basis for ADR 0001.)
