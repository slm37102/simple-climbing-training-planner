# Deload cadence: move from every-3rd-week (2:1) to every-4th-week (3:1)

**Status:** Accepted — implementation deferred to the design phase (KG-B3). No code changed by this ADR.

## Context

`buildPhasePattern` in `js/program.js` marks every 3rd week of each Base/Build block as a deload (`(i + 1) % 3 === 0`). That is a **2 hard : 1 deload** cadence — two loading weeks, then a deload. `docs/training-philosophy.md` labelled it "3:1", but Lattice's published 3:1 means **3 hard weeks then a deload** (every 4th week). The code therefore matched *no* source — stricter than Lattice, Hörst, and Anderson, and stricter than its own documentation. It was an artifact of `% 3` reading as "3:1", not a decision anyone made.

The grill also ran a **total-dose check** (see `docs/research/` briefs): with the ADR-0001 Peak softening already in place, a 12-week cycle under 2:1 leaves only **2 full-dose Build weeks** feeding a deliberately-softened 2-week Peak — the V6→V7 strength-conversion pipeline is conservative on both the intensity axis *and* the weekly-dose axis simultaneously, while Base (6 weeks, un-softened) is generously dosed. The under-dose is real but localised to Build, and it is a weekly-dose problem, not an intensity problem.

## Decision

**Move to 3:1 — deload every 4th week** (`(i + 1) % 4 === 0` in the six loop sites of `_composeSingle`/`_composeDouble`).

- Aligns with every source at once: Lattice's published 3-on/1-off cadence [verified :640], Hörst's outer bound of "every 3–4 weeks of hard training" even for the *aging* athlete [verified :624], and the "deload every 4–6 weeks" strength guidance [verified :305]. General strength-sport survey practice is even sparser (every 5.6 ± 2.3 weeks) [web, un-adjudicated].
- Recovers exactly **+1 full-dose hard week per 12-week cycle**, all of it in Build (2→3 hard Build weeks, +50% strength-conversion stimulus), directly answering the compounded-conservatism concern **without touching any ADR-0001 intensity protection** — the documented injury association (Sjöman 2023) is with high-intensity fingerboarding, not with a third consecutive moderate loading week.
- Restoring hard *weeks* is the cheap, correct lever: Lattice's own data shows weekly session load grows only ~1.6× across the entire V1→V12+ span and elites progress by tightening per-session focus, not adding volume [new-verified 256/257].

## Considered options

- **Keep 2:1** — rejected: matches no source, double-taxes the goal-critical Build phase, and is a naming accident rather than a decision. The only argument for it (lower accumulated fatigue [new-verified 259, 142]) is already served by holding intensity on deloads (ADR-0003) and by the RPE/readiness autoregulation in `js/loads.js`.
- **3:1 + deeper ~50% volume cut now** — rejected *for now*, kept as a fast follow-up: deepening the cut from 40% to 50% (inside Lattice's verified 40–60% band, and consistent with "cut retained high-intensity work roughly in half" [new-verified 138]) is the right response *if* the athlete tolerates 3 consecutive loading weeks poorly (rising RPE at fixed loads, readiness dipping in week 3 of blocks). Not needed pre-emptively.

## Consequences / residual risk

- No comparative climber study of 2:1 vs 3:1 exists — this is convention-matching plus dose arithmetic, not outcome evidence (confidence: moderately-high).
- The athlete's age/recovery profile is undocumented, and Hörst's rule is age-sensitive; 3:1 sits at the outer edge of his rule if they recover like his "aging" profile.
- Mod-4 creates longer uninterrupted loading runs at some cycle lengths (12 wk: Build+Peak wk7–11; 24 wk: a 6-week Build1+early-Base2 run). Early-Base weeks are the cycle's lowest intensity, so this is acceptable, but it is the real residual risk — watch it via the autoregulation signals.

## Implementation checklist (deferred round)

- `js/program.js`: `(i + 1) % 3 === 0` → `(i + 1) % 4 === 0` in the **6 loop sites** (`_composeSingle` base+build; `_composeDouble` base1/build1/base2/build2); update the comment near the pattern derivation. The C2 no-adjacent-deloads guard, `_patternCache`, and the `PHASE_PATTERN` back-compat export recompute correctly (simulation confirmed no adjacent deloads at 8/12/16/24 wk under mod-4).
- `tests/index.html`: the wk3/wk9 deload assertions and the "wk3 = deload, not retest" fixture move to wk4; the `[Phase2 C2]` adjacency sweep needs no change and is the regression guard.
- `docs/training-philosophy.md`: retitle the deload section to "every 4th week", remove the KG-B3 divergence note.
- `sw.js`: bump `CACHE`.
- **Effective-from:** apply from the **next** cycle. `buildPhasePattern` is a pure derivation, so shipping this mid-cycle would silently shift the in-flight (Firebase-logged) cycle's deload weeks — note it in the release.
