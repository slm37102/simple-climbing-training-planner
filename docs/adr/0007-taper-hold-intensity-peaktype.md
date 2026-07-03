# Taper: hold intensity, step-cut volume, event-type length lever

**Status:** Accepted — implementation deferred to the design phase (KG-A5). No code changed by this ADR.

## Context

The current taper **drops intensity**: `HANGBOARD.taper.loadPctRange` and `pullupPrescription('taper')` are both `[0.50, 0.60]` — a ~30–45% intensity cut vs Peak's `[0.85, 0.95]`. Every credible source says the opposite: hold intensity, cut only volume/frequency. Cutting intensity 30–60% costs **20–30% of performance** [new-verified 243]. This is a genuine code/evidence conflict and the highest-priority item in the taper — the current taper actively sheds the fitness the whole cycle built.

## Decision

**Hold intensity, step-cut volume, rest day before the goal — plus a `peakType` length lever (brief "Option B + peakType", adopted at the owner's request).**

- **Hold intensity:** raise taper `loadPctRange` to a near-peak band (below Peak but well above "light") and RPE toward 8.5–9; keep sets/reps low. Intensity lives entirely in the prescription (no taper multiplier in `Loads.resolveEffective`). [verified 522, 530]
- **Cut volume via a step cut**, reusing `applyDeloadVolume`. For the app's short (<10-day, 2–6-session) taper windows the literature prefers **step / fast-decay**, not progressive [new-verified 244; web]. A 41–60% load reduction with intensity held matches the deload machinery already in place [new-verified 242].
- **Mandatory full rest day before the goal/send day** [new-verified 250], and one early strength touch, then freshness only (only one touch fits a 1–2-week window anyway).
- **`settings.peakType` length lever:**
  - `comp` — 1-week step taper + rest day before the comp.
  - `trip` — 2-week taper (rides the ~1-month peak window [new-verified 249]; rest day before each outdoor day).
  - `project` — rolling taper, strength touched every 5–10 days (open-ended send campaign [new-verified 248]).
  Event-type length scaling is evidence-backed [verified 526, 249]; keep `project`'s per-day scheduling minimal, since content differences beyond *length* rest on thinner evidence.

## Considered options

- **Progressive/exponential volume decay** — rejected: it is the best-supported *pattern* in the general literature, but that evidence is for tapers with ≥10 days to express the decay; across the app's 2–6 taper sessions it cannot be resolved, and for <10-day windows the literature explicitly recommends step/fast-decay instead.
- **Fixed cycle-length taper rule only (no `peakType`)** — superseded by the owner's decision to adopt the event-type lever now rather than deferring it.

## Consequences

- Confidence: **high** on the intensity fix (the load-bearing change); **moderate** on step-vs-progressive shape and on length. The intensity fix *reduces* an existing over-softening — it does not stack a new conservatism and never raises injury risk (volume falls, not load), so it is safe against the compounding-conservatism concern while directly serving G2.
- `peakType` is the one decision in this round that carries a **schema cost** when implemented (new setting → `SCHEMA_VERSION` bump).

## Implementation checklist (deferred round)

- `js/program.js`: raise `HANGBOARD.taper` load to a near-peak band + RPE ~8.5–9, rename from "7/3 Repeaters (light)" to a low-volume near-max hang; raise `pullupPrescription('taper')` to ~`[0.80, 0.90]`, RPE ~`[9, 9.5]`, low sets. Extend the deload-volume guard in `prescribeForContext` to also apply a step volume cut on taper weeks (taper-specific note, not `deloadNote`). Force a rest day on the day before the final cycle day / `compDate`.
- `settings.peakType`: add to `defaultSettings()` (backfilled by `migrate()`'s shallow-merge); **bump `SCHEMA_VERSION` in `storage.js`**. Taper length in `_composeSingle`/`_composeDouble` becomes a function of `peakType` rather than the `weeks >= 14 ? 2 : 1` rule; taper session builders branch on `peakType`. New UI in the settings/plan view; add `peakType` to `CONTEXT.md` glossary.
- `tests/index.html`: taper holds near-peak `loadPctRange` (regression against the 0.50–0.60 bug); rest-day-before-goal fires; `peakType` drives taper length.
- `sw.js`: bump `CACHE`. **Effective-from:** the intensity fix is safe to apply **immediately** (it only removes an over-softening); the `peakType` lever and length changes apply from the next cycle.
