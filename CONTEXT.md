# Glossary

The shared language for this project. Terms here are canonical — code, docs, and conversation should all use them consistently.

## Athlete (the user)

A **single intermediate climber**: V5–V6 boulder, ~7a lead, ~3 years of experience. The plan is built for this one person — there is no support for beginners, no multi-user, and no attempt to be a general-purpose training app.

## Macrocycle

A **single periodised training block** with a configurable length (8–40 weeks, default 12; stored as `settings.cycleWeeks`). The phase split is derived from the chosen length, not hard-coded:

- **Base** (~50% of weeks) — capacity & half-crimp finger strength
- **Build** (~25% of weeks) — power-endurance & projecting prep
- **Peak** (fixed 2 weeks) — max-intensity expression
- **Taper** (1–2 weeks by peak type) — sharpen into the comp / send window: volume cut ~40%, intensity **held** near peak (see `docs/adr/0007`)

For cycles longer than 20 weeks the schedule switches to a **double block** (two base → build cycles, then a single peak + taper) because empirically single-block adaptations plateau. See `docs/adr/0002-configurable-cycle-length.md`.

The macrocycle is anchored either by a chosen **start date** or by a **competition date** (in which case start = comp − (cycleWeeks × 7 − 1) days, so the final taper day = comp day). The day before the final cycle day is always a **forced rest day** (`rest-pre-goal`), whatever weekday it lands on.

## Peak type

`settings.peakType: 'comp' | 'trip' | 'project'` (default `comp`) — what the cycle is peaking *for*, chosen in the onboarding wizard or Profile → plan settings. It drives taper length (`docs/adr/0007`): a **comp** peaks on one day → 1-week taper; a **trip** or open-ended **project** window rides a longer peak → 2-week taper.

## Deload week

A scheduled recovery week interleaved every fourth week (3 hard : 1 deload — see `docs/adr/0004-deload-cadence-3-to-1.md`) inside Base and Build. A deload **drops prescribed volume ~40% while holding intensity** (load kg unchanged) — this preserves the neuromuscular stimulus while letting connective tissue recover. See `docs/adr/0003-deload-as-volume-cut.md`. The last Base deload is also a **retest** week.

## Retest

A **deload Monday session at the end of the Base phase** that replaces the normal hangboard session with re-measuring benchmarks (max 10s hang on 20mm, 1RM weighted pull-up, max boulder grade). Saving the results updates the benchmarks used to prescribe future loads.

## Session slot

One of the seven weekly slots, determined by day-of-week (not cycle day index):

- `mon-main` — Hangboard + S&C
- `tue-light` — mobility / skill drills
- `wed`, `fri` — rest
- `thu-main`, `sat-main` — climbing session (boulder or sport flavor)
- `sun-optional` — open climbing

## Week flavor

Each week is biased toward either **boulder** or **sport** climbing. The plan's `focus` field determines this:

- `focus: 'boulder'` → all Thu/Sat sessions are boulder-flavored
- `focus: 'sport'` → all Thu/Sat sessions are sport-flavored
- `focus: 'hybrid'` → odd weeks boulder, even weeks sport (alternating) — **in Peak and Taper only**

This affects Thu/Sat sessions only — Monday's hangboard protocol is determined by phase, not flavor.

**In Base and Build, hybrid mixes within the week instead (ADR-0010):** the energy system is fixed per slot and `weekFlavor` just picks the format alternating inside it, not the identity of the whole week. Base needs no special case (its Thu/Sat templates already alternate two aerobic-appropriate formats every week). In Build, Thursday is always limit bouldering (`thu-limit`); Saturday alternates boulder triples (odd weeks) with the 60/60 threshold session (even weeks, `sat-6060-threshold` — the same content that serves sport-focus Thursday). `sat-4x4-build` (route 4×4) no longer appears in hybrid mode at all.
