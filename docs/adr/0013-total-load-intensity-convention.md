# Hangboard/pull-up intensity: total-system-load convention, evidence-anchored bands, immediate effect

**Status:** Accepted — decided 2026-07-15 ([wayfinder ticket #32](https://github.com/slm37102/simple-climbing-training-planner/issues/32)); implementation pending (band-derivation spec → tickets via the map's assembly step). Adjudicates KG-B11's convention half (the negative-benchmark clamp, KG-B11a, ships independently — ticket #36).

## Context

All loaded-exercise percentages multiply the *added-kg* benchmark, but physiological intensity tracks *total system load* (bodyweight + added). For this athlete (~70 kg, +20 kg max hang), Base's "intro 55–70%" hangs sit at ~90–93% of true max from week 1; the advertised Base→Peak ramp of 55→95% added is really ~90→99% total (coach-review W12, High). The mapping between the two conventions depends on the athlete's strength-to-bodyweight ratio, so it drifts as benchmarks climb — and the G1 journey is precisely a climb from ~+34% to +46% BW added. The phase tables, "intro/low-end" language, and ADR-0001's 90%-cap rationale all *reason* in true-intensity terms; only the math disagrees. KG-C6's norms verification already caught this exact unit confusion in a published table and standardized the repo's reference material on explicit dual units.

## Decision

1. **Compute prescriptions on total system load:** `added = pct × (bodyweight + benchmark) − bodyweight`, for both `maxHang20mm` and `pullup1RM` paths. Displayed values stay **added kg** (what goes on the belt); only the computation and its explanation change. Negative (assisted) benchmarks become naturally correct under this math — a lower percentage yields *more* assistance — making the KG-B11a clamp belt-and-braces rather than load-bearing. Cost accepted: prescriptions now depend on `bodyweight` being reasonably current; the ADR-0012 retest slots are the natural refresh moments.
2. **Re-derive the phase bands evidence-anchored, not behavior-preserving:** bands come from what the corpus's protocols prescribe in true-intensity terms — approximately Base intro ≈ 80–85% total (a real intro at last), Build weighted max-hangs ≈ high-80s–low-90s (consistent with the existing RPE 8–9 cue), Peak 7-53 ≈ low-to-mid-90s (down from the ~97–99% the current math reaches). Net: Base drops meaningfully, Peak trims slightly — conservative in both directions (G3), and the Base→Peak ramp becomes physiologically real. **Exact digits are NOT set here** — they are derived in the implementation spec with KG-C6's unit-audit discipline (every published "% of max" classified added-vs-total before adoption) and sanity-checked against the athlete's logged RPEs.
3. **Immediate effect, mid-plan** — the ADR-0004–0007 precedent, and the change is load-*lowering*, the safe direction to ship immediately. Previous-actual seeding keeps day-to-day suggestions continuous (the visible shift is mostly the displayed range). The convention is stated in the UI range tooltip, and the first post-change sessions carry a migration line in the load `reason[]` trail.

## Considered and rejected

- **Keep %-added, re-derive the numbers** — calibration is a snapshot of the current strength-to-bodyweight ratio and drifts every cycle in the dangerous direction (Base creeping hotter as fingers strengthen). Re-deriving repeatedly is the same work as switching conventions once.
- **Tooltip-only disclosure** — leaves Base genuinely mislabelled and the ramp fictional; RPE caps rescue execution but not planning.
- **Behavior-preserving relabel** — zero disruption but enshrines the finding it responds to.
- **Next-cycle migration** — weeks more training on mislabelled intensities for no offsetting benefit, given the change lowers loads.

## Consequences

- Every percentage table (`BASE_MAX_INTRO`, `HANGBOARD`, `pullupPrescription`) is re-derived; the phase tables in `training-philosophy.md`/`training-plan.md` and ADR-0001's cap language get restated in total-load terms in the same pass.
- The band-derivation spec is a prerequisite for the implementation ticket (graduated as its own map ticket, blocking assembly).
- Suggested loads shift mid-plan (mostly downward in Base) — migration note + tooltip disclosure required; the next retest re-anchors.
- `benchmark-norms.md`'s dual-unit tables become directly usable by the limiter readout (ADR-0011) and this engine without conversion gymnastics.
