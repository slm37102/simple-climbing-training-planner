# Soften Peak phase to match an intermediate athlete's recovery capacity

The original Peak phase (weeks 10–11) was modelled on advanced/elite playbooks (Anderson brothers, Lattice peaking templates): three Mondays/week stacking 7-53 hangboard at 85–95% max-hang + weighted pull-ups at 85–95% 1RM + campus 1-5-9 / bumps, plus limit bouldering and 4×4 route circuits at RPE 9–9.5 on Thu/Sat. **For the actual athlete using this app (V5–V6 / 7a, ~3 years experience) this exceeds connective-tissue recovery ceiling.** Sjöman et al. 2023 (Wilderness Environ Med, PMID 37550103, n=434) found a statistically significant injury association (p=0.03) in climbers with <6 years experience at 7a+ performing regular high-intensity fingerboard training — exactly this profile. Independent coaching consensus (Gresham/Climbing.com, Hörst/TFC) also places the campus-board floor at "approximately V6" for *basic* moves, putting 1-5-9 a tier above the athlete's level.

We therefore soften Peak as follows:

- **Remove campus 1-5-9 / bumps entirely.** Replace with basic ladders only (1-3-5, matched feet) capped at 2–3 attempts per set, or omit campus from Peak altogether.
- **Cap weighted pull-ups at 85–90% 1RM** (was 85–95%). The 95% ceiling adds marginal neural gain at meaningful shoulder-joint cost.
- **Reduce limit-boulder volume.** Was "3–5 problems × 3–5 attempts × 2–3 sets". Now: 1–3 V7 move-sequences, 4–8 attempts each, stop when power drops. ~20–30 min of actual attempts.
- **Do not stack max stimuli in one session.** Hangboard 7-53 and campus work must not appear in the same session at max RPE.

The 7-53 hangboard protocol itself is kept as-is — it's the right tool for Peak; the issue was session density, not the protocol.

Trade-off: the athlete gives up the theoretical maximal peaking stimulus in exchange for measurably lower injury risk. For a single-user recreational app where one tendon injury wipes out the entire cycle, this is the correct trade.

## Sources
- Sjöman AE et al. *Wilderness Environ Med.* 2023;34(4):435–441. PMID 37550103.
- Hörst E. trainingforclimbing.com — campus prerequisites, tendon recovery timelines, 7-53 protocol guidance, limit bouldering guide.
- Gresham N. climbing.com — Phases 3, 5, 8 of the year-long training plan.
- López-Rivera & González-Badillo. *J Hum Kinet.* 2019;66:183–195. PMID 30988852.
- Mundry S et al. *Sci Rep.* 2021;11:13530. PMID 34188125.

## Addendum (2026-07-02) — implementation status & re-adjudication

This ADR was accepted as a docs-only change and **was never implemented** — `js/program.js` kept the original pre-ADR Peak prescriptions (tracked as KG-B1 in `../knowledge-gaps.md`). Before implementing, the four decisions were re-checked against the verified research corpus (`../research/verified-findings.md`):

- **Campus removal — confirmed, and strengthened.** The verified campus-readiness benchmarks (2–5 yr experience, V5–V6 ability, 15–20 strict pull-ups, 1-2-3-4-5 ladder without matching) put this athlete *at the floor* of campus readiness, not above it; the intermediate entry protocol is 2 sets × 2 reps of basic movements on big rungs. Addition beyond the original ADR: the basic-ladder prescription now carries an explicit **readiness gate** ("15–20 strict pull-ups + 1-2-3-4-5 ladder without matching · skip on any finger tweak").
- **Pull-up cap 85–90% — confirmed.** Peaking research holds intensity but prioritizes freshness; nothing in the corpus supports a 95% ceiling for this profile.
- **Reduced limit volume — confirmed.** Verified limit-bouldering guidance: 3–5 move problems, ~100% quality efforts, end the session before power drops ("fatigue has no place in limit bouldering").
- **No max-stimulus stacking — confirmed.** Lattice peak-phase guidance: short, intense sessions so the athlete stays recruited *and* rested. Campus is removed from Peak Mondays entirely (7-53 + max pull-ups remain); Thursday keeps the only Peak campus exposure, as gated basic ladders at RPE ≤9.

Implemented in `js/program.js` (`pullupPrescription`, `buildMonHangboard`, `buildThuMain` peak-boulder, `buildSatMain` peak-boulder) with regression tests in `tests/index.html` (`[ADR-0001]` cases). Closes **KG-B1** / **KG-D1**.

## Addendum (2026-07-17) — the 90% pull-up cap is now literally true

[ADR-0013](0013-total-load-intensity-convention.md) switched percentage prescriptions from %-of-added-weight to %-of-total-system-load. Under the old added-only math, this ADR's "cap weighted pull-ups at 85–90% 1RM" actually landed at ~94–97% of true 1RM — the cap was real in the code's own units but not in the units this ADR reasons in. Peak's pull-up band is now `[0.88, 0.90]` of total load (see `pullupPrescription('peak')` in `js/program.js`), so the 90% ceiling this addendum discusses is now the actual percentage applied, not a mislabelled added-weight fraction.
