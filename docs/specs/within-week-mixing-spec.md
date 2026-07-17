# Spec: within-week mixing restructure (ADR-0010 implementation)

**Status:** Spec locked 2026-07-17 via wayfinder [map #22](https://github.com/slm37102/simple-climbing-training-planner/issues/22), ticket [#45](https://github.com/slm37102/simple-climbing-training-planner/issues/45). **Not yet implemented** — implementation ticket cut at the map's assembly step ([#33](https://github.com/slm37102/simple-climbing-training-planner/issues/33)).

> **This is a decision/spec, not the change itself.** [ADR-0010](../adr/0010-hybrid-within-week-mixing.md) records *why*; this spec defines *what* to build against the code as it stands after the Group 1 implementation wave (flash pyramid, comp templates, taper single-cut all landed).

## Purpose

In hybrid mode, `weekFlavor` currently alternates the entire week between boulder and sport, halving the weekly frequency of every adaptation (coach W4). ADR-0010's fix: **fix the energy system per slot, let the format alternate by week** — scoped to Base and Build only.

## The load-bearing discovery: Base is already done

Since the KG-B12 fix shipped (`sat-flash-pyramid`, `Aerobic capacity`), plain flavor alternation already produces ADR-0010's Base row:

| Base | odd (boulder-format) | even (sport-format) | System per slot? |
|---|---|---|---|
| Thu | `thu-projecting-base` (Skill/Strength) | `thu-route-pyramid` (Aerobic capacity) | ✔ by design — "flavor-specific quality, alternating" |
| Sat | `sat-flash-pyramid` (Aerobic capacity) | `sat-arc` (Aerobic base) | ✔ already always-aerobic |

**No Base code changes.** The implementation is confined to **Build**, plus regression protection everywhere else.

Likewise, ADR-0010's "campus stays fortnightly" resolves to **no change**: `buildMonHangboard` gates the campus appendix on `focus === 'boulder'` (plan-level), so hybrid Mondays carry no campus today and continue not to. (The ADR's "fortnightly in hybrid" framing followed the coach review's reading; the code's actual gate is stricter. The conservative intent — don't add weekly campus — holds trivially.)

## 1. Build-phase restructure (hybrid focus only)

Current hybrid Build week vs. target:

| Slot | Today (flavor-alternated) | Target (system-per-slot) |
|---|---|---|
| Thu, odd | `thu-limit` (limit bouldering) | `thu-limit` — **every week** |
| Thu, even | `thu-6060-threshold` | `thu-limit` |
| Sat, odd | `sat-boulder-triples` | `sat-boulder-triples` (unchanged, incl. `densityRest` + optional open-climb) |
| Sat, even | `sat-4x4-build` (route 4×4) | **`sat-6060-threshold`** — the 60/60 threshold session, moved to Saturday |

- **`sat-6060-threshold` (new session identity):** same exercise content as `thu-6060-threshold` (60/60 intervals, RPE 7–8.5, `Aerobic power`, `prescribedTarget {20, 'min'}`), same `densityRest`-independence (band-1 60/60 today carries no density string — confirm and keep whatever `thu-6060-threshold` does at implementation time). Extract the shared exercise template into one constant used by both sessions rather than duplicating the prescription string — the two must never drift apart.
- **`sat-4x4-build` leaves hybrid mode.** Its band (anaerobic capacity) is served weekly by the odd-week boulder triples; the session remains reachable in **sport-focus** mode, unchanged.
- **`thu-6060-threshold` remains** the sport-focus Build Thursday, unchanged.
- Peak and Taper: **no changes in any mode** (ADR-0010 scope decision — and the comp templates just shipped there).

## 2. Mechanism: where the override lives

`prescribeForContext` currently computes `resolvedFlavor = focus === 'hybrid' ? flavor : focus` and hands it to the builders. The mixing override belongs **in `prescribeForContext`, not inside the builders**: when `focus === 'hybrid' && phase === 'build'`,

- `thu-main` → call the Thursday builder with the **boulder** path (yielding `thu-limit`), regardless of `weekFlavor`;
- `sat-main` → odd weeks call the Saturday builder with the boulder path (`sat-boulder-triples`); even weeks return the new `sat-6060-threshold` session.

Builders stay pure functions of `(phase, flavor, isDeload, weeksLeft, peakType)` with unchanged signatures; non-hybrid callers hit them exactly as today. Keeping the branch at the `prescribeForContext` seam preserves the invariant that `Program.build` is the single externally-tested entry point, and makes the hybrid-only nature of the change legible in one place.

## 3. `weekFlavor` semantics (docs + naming, no logic change)

`weekFlavor` survives with narrowed meaning: it picks the **format** inside a fixed-system slot (Base Thu/Sat formats; Build Sat format) rather than the identity of the whole week. Required doc updates at implementation time:

- `CLAUDE.md` invariants: rewrite the "weekly flavor alternation" description to the system-per-slot model; note Build Thu is always limit in hybrid.
- `CONTEXT.md` glossary: update the Flavor/`weekFlavor` definition.
- `docs/training-plan.md`: regenerate via `tools/generate-schedule.mjs` (Build weeks change substantially).
- Calendar/week views need **no logic change** (they render whatever `Program.build` returns), but check any hardcoded "boulder week / sport week" copy for accuracy against the narrowed semantics.

## 4. Interactions (verify, mostly free)

- **ADR-0009 Base ramp** — untouched (Base sessions unchanged; the ramp's `energySystem` gate already picks up flash pyramid + ARC + route pyramid).
- **ADR-0006 density progression** — `sat-boulder-triples` keeps its `densityRest` weeksLeft wiring; band-2 (30/30) stays Peak-Thursday-only, so "≤1 lactic session/week" holds by construction.
- **Deload cuts** — `applyDeloadVolume` applies to the new arrangement with no changes (it operates on whatever session is returned).
- **ADR-0015 readiness gating** (not yet implemented) — its 30/30→60/60 substitution references the 60/60 *template*; with the shared-constant extraction (§1) that substitution can target the template rather than a sessionId. Note for whichever ticket lands second.
- **Previous-actual load seeding / layoffDecay** — keyed by session type; `sat-6060-threshold` is a new sessionId, so its first occurrence has no previous actual (range-midpoint seeding, standard for new sessions). No special handling.
- **KG-B4 closes** when this ships (its DECIDED note already says so): Base aerobic lands every Saturday + even Thursdays ≈ 1.5–2×/week.

## 5. Tests (`tests/index.html`, `[ADR-0010]` block)

Assert via `Program.build(plan, dateISO)` fixtures only:

- **Hybrid Build, odd week:** Thu → `thu-limit`; Sat → `sat-boulder-triples`.
- **Hybrid Build, even week:** Thu → `thu-limit` (the load-bearing assertion — was 60/60); Sat → `sat-6060-threshold` with the 60/60 exercise content.
- **Hybrid Base, odd + even weeks:** byte-identical sessionIds to today (regression: projecting/pyramid Thu, flash-pyramid/ARC Sat).
- **Sport-focus and boulder-focus plans:** byte-identical sessionIds to today across all phases (the non-hybrid invariance promise).
- **Peak/Taper hybrid:** unchanged sessionIds, both peakTypes.
- **Deload week in hybrid Build:** both new arrangements carry the volume cut.
- Conventions: `sw.js` CACHE bump; schedule regeneration; KG-B4 closure lines in `knowledge-gaps.md`.

## Out of scope

- Any Base, Peak, Taper, or Monday session change (§ above — Base is already conformant; Peak/Taper excluded by ADR-0010; Monday campus unchanged).
- Readiness gating (ADR-0015) and monitoring (ADR-0014) — separate tickets; only the shared-template note in §4 links them.
- Per-cycle focus prompts/onboarding — rejected by ADR-0010.
