# Deload weeks cut volume, not intensity

The original deload implementation in `js/loads.js` multiplied prescribed load (kg) by **0.85** on deload weeks (`DELOAD_INTENSITY = 0.85`) and left set/rep counts unchanged. This is **inverted** relative to the consensus periodisation literature, which deloads by **cutting volume while holding intensity** so that the neuromuscular adaptation is preserved while tendons, pulleys, and the central nervous system recover.

We now:

- **Hold intensity (kg) constant** on deload weeks. `resolveEffective()` no longer applies an intensity multiplier; it just appends `"deload: intensity held, volume cut"` to the prescription reasoning chain.
- **Cut volume ~40%** via `applyDeloadVolume(session)` in `js/program.js`, applied during `prescribeForContext` when `ctx.deload && !ctx.retest`. This:
  - Multiplies any numeric `exercise.prescribedSets` by `0.6` (floor, min 1).
  - Appends `" · Deload: drop ~40% volume"` to any string-based prescription text.
  - Sets `session.deloadNote = "Deload week — volume cut ~40%, intensity held."` so the UI can surface a clear banner.

Retest weeks are exempt — they have their own structure (single max attempts at benchmark exercises) and should not be diluted further.

## Why this matters

Climbing-specific recovery is dominated by **finger flexor connective tissue** (A2 pulley, FDP tendon sheath), which has a slower turnover than muscle. Holding intensity on a deload week keeps the strength stimulus on the muscle while dropping total time-under-load on the connective tissue. The opposite policy (cut intensity, keep volume) gives the worst of both worlds — high cumulative load on tissue plus a sub-threshold strength signal.

Lattice Training documents this rule explicitly in their public coaching content: *"Reduce volume by 40–60%, keep intensity at or near working level."* Tom Randall (Lattice co-founder) reiterates this in the Training for Climbing podcast finger-strength series. Hörst and the Anderson brothers (Rock Climber's Training Manual) describe the same principle as "deload by reducing reps per set, not load per rep."

## Trade-offs

- **Pro:** matches consensus practice — much easier to reason about and consistent with the cited research.
- **Pro:** the retest at the end of Base remains valid as a true assessment because the preceding deload preserved strength, not just volume.
- **Con:** the volume cut ripples through to UI strings — the prescribed text on a hangboard session still reads `"5 hangs × 2 sets"` with `"Deload: drop ~40% volume"` appended, rather than rewriting to `"5 hangs × 1 set"`. The current implementation prefers the appended note (athlete reads it and adjusts) to avoid rewriting all prescription text generators. The `prescribedSets` numeric field IS cut for exercises that use it (e.g. weighted pull-ups: 5 → 3 sets), so the Today tab's set counter reflects the deload directly.
- **Con:** the `isDeload` arg on `Loads.resolveEffective` is still accepted but ignored, kept only for call-site compatibility. Future cleanup could remove it.

## Sources

- Lattice Training — *Training Series: Finger Strength* (Tom Randall): "On a deload, drop your volume by 40 to 60 percent and keep intensity at or near your normal working level."
- Anderson M & M. *The Rock Climber's Training Manual* (2014) — Periodisation chapter; deload defined as reduced sets/reps at maintained loads.
- Hörst E. *Training for Climbing* (3rd ed.) — Recovery week prescriptions: reduce volume, maintain finger-strength intensity.
- ~~Mundry S et al. *Front Sports Act Living.* 2021;3:651651. PMID 34188125. — General periodisation review; volume-deload as canonical recovery week pattern.~~ **Withdrawn 2026-08-06 — see the addendum below.**

## Addendum (2026-08-06) — the Mundry citation is withdrawn; the Decision stands

**The Decision above does not change** — deload remains a volume cut with intensity held. Only this ADR's source list changes, recorded here per ratchet 4 (**IB-040**).

PMID 34188125 is **Mundry S, Steinmetz G, Atkinson EJ, et al. "Hangboard training in advanced climbers: A randomized controlled trial." *Sci Rep.* 2021;11:13530** — an 8-week hangboard RCT in 30 climbers measuring grip strength. It is **not** a "general periodisation review", and it says nothing about deloads or recovery-week patterns; it also carried the wrong journal, volume, and article number here (only the PMID was correct). See [ADR-0002's addendum](0002-configurable-cycle-length.md) for the full trace.

This one is the least consequential of the ADRs that leaned on it: the volume-cut-with-intensity-held decision is independently supported by the three coaching sources still listed above (Lattice's explicit "drop volume 40–60%, keep intensity at or near normal working level", Anderson, and Hörst), all of which state the pattern directly. Removing Mundry costs this ADR no substantive support — it was decoration, and inaccurate decoration at that.
