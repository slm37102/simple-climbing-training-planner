# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A single-user, offline-first **PWA** that prescribes a periodized climbing training macrocycle (Base → Build → Peak → Taper) for one intermediate climber (V5–V6 boulder / ~7a lead) doing both bouldering and sport. **Vanilla HTML / CSS / JS ES modules — no build step, no bundler, no npm runtime deps, no test framework.** Optional Firebase Auth (Google) + Firestore sync.

## Commands

There is **no build, no lint, no `package.json`**. Everything is served as static files.

```powershell
# Run locally — any static server pointed at repo root:
npx http-server . -p 8765 -c-1
# or
python -m http.server 8765
```

Then open `http://127.0.0.1:8765/` and click **"Use locally only"** on the auth gate. The service worker only activates over `https://` or `localhost`.

**Tests** are an in-browser smoke suite at `tests/index.html`, no CLI runner. See the `test` skill for how to run it, what it covers, and Playwright MCP notes.

## Deploy

Static host anywhere; canonical target is Firebase Hosting. See the `deploy` skill for the command, auto-deploy pipeline, and hosting URL.

## Architecture

`js/app.js` is the entry point: registers the service worker, wires tab nav, gates on auth, and mounts views. Tabs map to renderers in `js/views/*.js`. **There is no framework** — each renderer takes `(root, ctx)`, replaces `#view`'s `innerHTML`, then wires its own listeners via `data-*` attributes. Re-rendering on state change = re-calling the view function. `ctx` bundles the domain singletons `{ Storage, Program, Loads, Warmup, Sync }`.

Data flow is layered:

```
js/views/*   → read Storage.get(), Program.*, Loads.*   (pure read of plan + math)
             → write via Storage.setDay / setPlanSettings / setGlobalBenchmarks
js/storage.js→ LocalStorage is the source of truth; emits change events
js/sync.js   → subscribes Storage.onChange, debounced 800ms upload to
               Firestore users/{uid}/state/main; onSnapshot merges remote back
               via Storage.mergeRemote (per-plan, per-day Last-Write-Wins on updatedAt)
```

### Domain model (the parts that need multiple files to understand)

The training logic lives in two modules and is grounded in `docs/training-philosophy.md` + the ADRs in `docs/adr/`. **Read those before changing prescriptions** — the values are deliberate, evidence-based, and sometimes intentionally softened from the source frameworks (Lattice / Hörst / Anderson) for this athlete's injury risk. **Also read `docs/knowledge-gaps.md`**: known doc/code divergences are tracked there with stable KG-* IDs and a status per gap — don't "fix" a divergence without checking its gap entry first. Project goals live in `docs/project-goals.md`.

- **`js/program.js`** — the macrocycle. `Program.build(plan, dateISO)` is the primary entry point: it resolves the date to a `{weekIdx, phase, deload, retest, flavor, slot}` context, then builds the prescribed session (exercise list with prescriptions, but no kg yet).
- **`js/loads.js`** — turns prescribed % ranges + benchmarks into kg, then applies the adjustment chain.

### Key invariants (preserve these when editing)

- **Cycle length is configurable, not fixed.** `settings.cycleWeeks` (default 12, clamped 8–40 via `clampCycleWeeks`). The phase split is **derived** from length by `buildPhasePattern(weeks, peakType)` — never hardcode a 12-element pattern. Single block ≤ 20 weeks; **double block** (two Base→Build cycles) above the `DOUBLE_BLOCK_THRESHOLD` of 20. Peak is fixed at 2 weeks; Taper length comes from `settings.peakType` (ADR-0007: `'comp'` → 1 wk, `'trip'`/`'project'` → 2 wk). Index into `Program.phasePattern(settings)`; don't re-derive phases. (See `docs/adr/0002`.) `PHASE_PATTERN` is still exported as `buildPhasePattern(12)` (comp) for back-compat callers.
- **Post-build session shaping is a registered pipeline.** `PRESCRIPTION_PASSES` in `js/program.js` runs in registration order (anti-style cue → base ramp → deload cut → taper cut → forced cut → readiness gate), and every `prescribeForContext` path exits through `finishSession`, which returns a fresh copy (shared constants never escape by reference), applies the same ctx-enrichment skeleton to every in-cycle return, and collects `session.notes[]` from the pass note fields in pass order. **Notes are NOT mutually exclusive** — a deload week can also be a Lighter readiness day (ADR-0015) — so views render the whole array, never `a || b || c`. Target provenance lives on the exercise (`originalTarget` for cuts, `rampedFrom` for the ramp, `readinessScaledFrom` for the readiness gate); Today's target callout gives the readiness step priority when present. Rest/Tue/Sun slots return before the pipeline — they are exempt by construction.
- **Deload = volume cut, intensity held; cadence is 3:1.** The intensity/volume split was inverted historically. Deload weeks land every **4th** week within Base/Build (`(i+1)%4` — ADR-0004) plus the forced retest-deload at the end of each Base block; they cut `prescribedSets` ~40% (`applyDeloadVolume` in `program.js`) and append a note to prescription text; kg is **not** scaled — `Loads.resolveEffective` has no deload parameter at all. (See `docs/adr/0003` + `0004`.) Retest weeks are exempt from the volume cut **only on Monday** (the retest protocol itself, not a volume-cuttable template) — Thu/Sat sessions in a retest week still take the same cut (KG-B10). Taper weeks get the same sets cut via `applyTaperVolume` (`taperNote`, ADR-0007) — intensity stays near-peak there too.
- **The cycle is anchored two ways.** `settings.anchorMode: 'startDate' | 'compDate'`. Always resolve via `Program.effectiveStart(settings)` — never read `settings.startDate` directly in views. In `compDate` mode, start = `compDate − (cycleWeeks × 7 − 1)` days, so the final taper day lands on the comp date. The day before the final cycle day is a forced rest day (`rest-pre-goal`, ADR-0007), whatever weekday it is. In `startDate` mode, `settings.scheduleShiftDays` (ADR-0008) pushes `effectiveStart` forward — set by the Today-tab gap banner (`js/replan.js`'s `Replan.detectGap`) when the athlete accepts extending the plan after a missed-session gap; re-snapped to Monday (C1) after shifting. Ignored entirely in `compDate` mode — the goal date is fixed, so a gap there is surfaced as information only, never an automatic shift.
- **Hangboard prescriptions are phase-shaped (ADR-0005/0006).** Base Monday = a two-exercise pair (7/3 repeaters + intro max-hangs at 55–70%); Build = weighted max-hangs 2×4 @ RPE 8–9; min-edge is deleted — don't reintroduce it. Sport-flavor Thursdays: Build = 60/60 threshold (RPE ≤8.5), Peak = 30/30 lactic (RPE 9.5–10, only phase allowed to carry it); interval rest strings tighten 5s/week inside the final 4 weeks via `densityRest(weeksLeft)`.
- **Hybrid mode mixes within the week, not across it, in Base+Build (ADR-0010).** `weekFlavor` no longer picks the whole week's identity in those two phases — it picks the *format* inside a fixed-system slot. Base needs no override (`sat-flash-pyramid`/`sat-arc` already alternate by week, both aerobic). Build's override lives in `prescribeForContext` (`hybridBuildMix = focus === 'hybrid' && phase === 'build'`), never inside the builders: Thursday is always `thu-limit`; Saturday alternates `sat-boulder-triples` (odd/boulder weeks) with `sat-6060-threshold` (even/sport weeks — shares its exercise content with `thu-6060-threshold` via the `SIXTY_SIXTY_EXERCISE` constant; don't let the two drift apart). `sat-4x4-build` no longer appears in hybrid mode at all — sport-focus only. Peak/Taper and non-hybrid focuses are untouched.
- **Day-of-week determines the session slot, not cycle position.** `Program.resolveDate` uses `d.getDay()` to map Mon→`mon-main`, Thu/Sat→main, Wed/Fri→`rest`, Tue→`tue-light`, Sun→`sun-optional`. A non-Monday `startDate` therefore shifts which calendar day is "Wk 1 Mon-main".
- **Percentages are of TOTAL system load, not added weight alone (ADR-0013).** `prescribeLoadKg` computes `added = pct × (bodyweight + benchmark) − bodyweight` for both `hangboard` and `pullup` kinds. **`benchmarks.bodyweight` is required** — when it's unset, `prescribeLoadKg`/`resolveEffective` return `null` outright (never a silent fallback to the old added-only math); views must show a "set bodyweight" hint (see `today.js`'s `bwHint`). The KG-B11a negative-benchmark clamp (`clampToBenchmark`) still runs but is now belt-and-braces — under total-load math a realistic (<1.0) band naturally stays safe for an assisted athlete.
- **Load math chain (in `Loads.resolveEffective`, in order):** `prescribeLoadKg` (% range from benchmarks) → seed by previous-actual kg if present, else range midpoint → `layoffDecay` (ADR-0008: ×1.0 within a 10-day grace period since that session type was last logged, else −3%/week floored at ×0.85 — guards against resuming at full load after a layoff) → `autoAdjust` ±5% (previous avg RPE vs target `rpeRange`), upgraded to **+2.5% when RPE is in range AND `Loads.targetsHit` says the previous actual met today's prescribed sets/reps** (ADR-0009 — pass `previousActualSets`/`previousActualReps` from views or the progression silently never fires) → readiness multiplier (×0.85 / ×1.0 / ×1.05, or 0 = suggest rest) → **upward cap: total move ≤ +5% of the decayed previous actual per session** (ADR-0009; downward is never capped). Each step appends to `reason[]` for the UI tooltip. **No deload multiplier here** (see above).
- **Base aerobic sessions ramp volume within the phase (ADR-0009).** In Base, sessions whose `energySystem` starts with "Aerobic" (route pyramid, ARC) get `prescribedTarget` scaled ×(1 + 0.10×(hardWeekPos−1)), capped ×1.30, via `applyBaseVolumeRamp` + `hardPhasePos` in `program.js`; the pre-ramp value lands in `rampedFrom` (NOT `originalTarget` — that field means "deload/taper cut" to the views) and a `rampNote` is set. Deload/retest weeks are exempt (`hardPhasePos` → null) so the deload cut always scales the unramped template; anaerobic Base sessions are deliberately excluded while KG-B12 is open. After editing `js/program.js`, regenerate the schedule section of `docs/training-plan.md` with `node --experimental-default-type=module tools/generate-schedule.mjs`.
- **`exercise.kind` drives both rendering and load logic.** Only `hangboard` and `pullup` compute kg (`loadPctRange` against `maxHang20mm` / `pullup1RM`). `antagonist-block` has nested `items[]`. `test`, `boulder`, `route`, `circuit`, `arc`, `open-climb`, `mobility`, `skill`, `limit-boulder`, `campus` are prescription-text-only — don't try to compute kg for them.
- **`js/exercise-inputs.js` is the single source of truth for which inputs to show.** `today.js` imports `inputVisibility(ex)` → `{ kg, sets, reps, rpe, optional, none }` and `repsLabel(ex)` (`'min'` for `arc`/`open-climb`, else `'reps'`). Never hardcode per-kind UI rules in a view — extend the sets in this helper (`NO_INPUT_KINDS`, `KG_KINDS`, `NO_SETS_KINDS`).
- **The Log tab is a read-only feed — editing happens on Today.** `log.js`'s in-feed edit form was removed deliberately (it was a second, drift-prone copy of Today's logging surface); editing a past day = navigating the Today tab to that date. Don't reintroduce an edit form in Log. The `missed` status is set from Today's status row (`#markMissed`) — the Calendar's missed-dot depends on it.
- **`exercise.optional: true`** hides all numeric inputs and renders a single "Done ✓" checkbox; the stored field is `actual.done: boolean`.
- **Today tab supports prev/next/jump-to-today navigation.** The selected ISO date lives in `sessionStorage['todaySelectedDate']` (resets on browser close — intentional). Use the view's `getSelectedDate()` when prescribing the visible session, not `today()`.

## Storage, schema & migrations

`js/storage.js` versions a single LocalStorage blob (`SCHEMA_VERSION`, currently **6**). `migrate(s)` runs on every load; each step must be **idempotent and bump `s.version`** at its end.

- **Multi-plan shape (v4+):** state is `{ version, activePlanId, plans: {id: plan}, globalSettings, globalBenchmarks }`. Each plan has its own `settings`, `days`, and (legacy) `benchmarks`.
- **Benchmarks are GLOBAL (v5+).** `Storage.get().benchmarks` returns `state.globalBenchmarks`, and `setBenchmarks` shims to `setGlobalBenchmarks`. The per-plan `setPlanBenchmarks(planId, patch, {archive})` still exists but has **zero callers** — dead code kept for the legacy per-plan shape.
- **Retest saves APPEND history; ad-hoc edits OVERWRITE (v6+, ADR-0014).** `Storage.saveRetestBenchmarks(patch, date)` — used by every retest-save path (`today.js`'s "Save as Benchmark" button, shared by the Base-block retest and the ADR-0012 post-goal retest) — pushes a dated `{date, maxHang20mm, pullup1RM}` snapshot onto `globalBenchmarks.history` before applying the patch, feeding the retest-trajectory monitoring signal. Plain `setGlobalBenchmarks` (manual Profile edits) still just overwrites, no history entry — don't conflate the two paths.
- **Plan-scoped setters have legacy + new arities.** `getDay`/`setDay`/`deleteDay`/`listDays` accept both the old "active-plan" form (`setDay(date, patch)`) and the new explicit form (`setDay(planId, date, patch)`).
- **`actual` is always a structured object** `{ kg, sets, reps, rpe, done, raw }`. Legacy strings like `"5x2 @ 62kg RPE 9"` are auto-parsed by `parseLegacyActual`. New code reads structured fields — never regex-parse strings. The human-readable display string is **derived** in `log.js`, never persisted.
- **`Storage.mergeRemote` must NOT emit change events** — emitting would re-trigger upload and loop. It guards with an internal `suppressEmit` counter. It also **prunes local empty plans not present in remote** and syncs `activePlanId`; preserve this or login will silently re-add phantom "Plan 1" entries.
- **Expansion state is intentionally ephemeral.** `log.js` keeps `expandedSet` in memory only — never persist it.

### When you add a field or file

- New `settings` field → add to `defaultSettings()` AND rely on `migrate()`'s shallow-merge to backfill loaded state (keep the existing pattern — `peakType` shipped this way with no schema bump).
- **Bumping the schema = bump `SCHEMA_VERSION` in `js/storage.js` AND bump `CACHE` in `sw.js`** so PWA clients fetch the new JS. Check the current value at `sw.js:2` (the version string drifts; don't trust docs for it) and increment it whenever anything under `js/` changes.
- **Any file added/renamed under `js/` must be added to the `SHELL` array in `sw.js`** or it won't be cached for offline use.

## Conventions

- **ES modules, relative paths, explicit `.js` extensions** — the browser resolves them directly; nothing rewrites imports.
- **Dates are ISO `YYYY-MM-DD` strings everywhere.** Parse with `new Date(iso + 'T00:00:00')` to avoid UTC drift. Shared helpers live in `js/dates.js` (`localIso`/`today`/`addDays`/`daysBetween`/`snapToMonday`) — `storage.js` imports it, but the views still carry local copies; prefer `js/dates.js` for new code and migrate view copies opportunistically.
- **View pattern:** replace `root.innerHTML`, then call a `wire(...)` function that attaches listeners by `data-*` attribute. No virtual DOM, no templating library.
- **Tap-friendly inputs:** pill selectors and steppers (in `today.js`, styled in `css/styles.css`) are the standard idiom for numeric input — use them over bare `<input type="number">`. Suggested loads are tap-to-prefill buttons (`data-suggest-btn` / `data-suggest-kg`).
- **`firebase-config.js` is intentionally public.** The `apiKey` is a project identifier, not a secret; security is enforced by `firestore.rules` (`request.auth.uid == uid`). Don't move it to env vars or try to hide it. Set `SYNC_ENABLED = false` there for a local-only build.
- **`sw.js` bypasses Firestore / Auth / gstatic URLs explicitly** (see the regex) — the Firebase SDK handles its own offline persistence; don't cache those.

## Common entry points for changes

- New training session type → `js/program.js` (`buildMonHangboard` / `buildThuMain` / `buildSatMain`); add a new `kind` if it has unique inputs, then register that kind in `js/exercise-inputs.js`.
- Change which inputs a kind shows → `js/exercise-inputs.js` only (both Today + Log pick it up).
- Change load calculation → `js/loads.js`.
- New input UI → renderer in `js/views/today.js` (`renderExercise`) + CSS. (Log is read-only — there is no edit form to mirror.)
- New post-build session mutation (a deload-like cut, a note, a swap) → register a pass in `PRESCRIPTION_PASSES` in `js/program.js`, not an if-block in `prescribeForContext`.
- New top-level tab → register in the `views` map in `js/app.js`, add a `<button data-view="X">` in `index.html`, create `js/views/X.js`, add it to `SHELL` in `sw.js`.

## Disclaimer

The training content is not medical advice; that framing is intentional and surfaced in the app.
