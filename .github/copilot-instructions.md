# Copilot instructions — simple-climbing-training-planner

A single-user offline-first PWA that prescribes a periodized climbing macrocycle (configurable length, default 12 weeks). **Vanilla HTML/CSS/JS ES modules — no build step, no bundler, no test framework.** Optional Firebase Auth + Firestore sync.

## Run locally

Any static server pointed at the repo root works. Examples:

```powershell
npx http-server . -p 8765 -c-1
# or
python -m http.server 8765
```

Then open `http://127.0.0.1:8765/`. `firebase-config.js` is already wired to the `simple-climbing-planner` Firebase project, so you can "Sign in with Google" or click **"Use locally only"** to skip sync. The service worker only activates over `https://` or `localhost`.

There is no linter and no build script. There **is** an in-browser smoke-test page at `tests/index.html` — open `http://127.0.0.1:8765/tests/` and tests auto-run. Add new cases there whenever you fix a bug or add input/storage logic (it covers `Storage` round-trips, `Today` input persistence + pre-fill defaults, `Log` edit Save, `inputVisibility` per kind, optional Done, `Program.resolveDate`, `buildPhasePattern` across cycle lengths, deload semantics, and the Cycle summary card). The page mutates `localStorage` — click **Clear** before returning to the live app. The Playwright MCP browser is also available for end-to-end checks; init scripts for `Date` overrides do not always apply, so prefer fake-data + module imports via `evaluate('async () => { const {Storage} = await import("/js/storage.js"); ... }')` over time-travel.

## Architecture (the parts you can't get from one file)

`js/app.js` is the entry. Tabs map to renderers in `js/views/*.js`; each renderer takes `(root, ctx)` and replaces `#view`'s innerHTML, then wires its own listeners. There is no framework — re-rendering on state change is done by re-calling the view function. `ctx` bundles `{ Storage, Program, Loads, Warmup, Sync }`.

The data flow is layered:

```
views/*  → reads Storage.get(), Program.*, Loads.*    (pure read of plan + math)
         → writes via Storage.setDay / setPlanSettings / setGlobalBenchmarks
Storage  → LocalStorage (source of truth) + emits change events
Sync     → subscribes Storage.onChange, debounced 800ms upload to
           Firestore users/{uid}/state/main; onSnapshot merges remote
           via Storage.mergeRemote (per-plan, per-day Last-Write-Wins on updatedAt)
```

Key invariants worth preserving when editing:

- **`Storage.mergeRemote` must NOT emit change events** — that would re-trigger upload and loop. It uses an internal `suppressEmit` counter. It also prunes local empty plans not present in remote and syncs `activePlanId` — preserve this or login will silently re-add phantom "Plan 1" entries.
- **Cycle length is configurable, not fixed.** `settings.cycleWeeks` (default 12, clamped 8–40 via `clampCycleWeeks`). The phase split is **derived** from length by `buildPhasePattern(weeks)` — never hardcode a 12-element pattern. Single block ≤ 20 weeks; **double block** (two Base→Build cycles) above the `DOUBLE_BLOCK_THRESHOLD` of 20. Peak is fixed at 2 weeks; Taper is 1–2. Index into `Program.phasePattern(settings)`; don't re-derive. `PHASE_PATTERN` is still exported as `buildPhasePattern(12)` for back-compat callers. The **retest** week is the last Base week of each block (e.g. wk 6 in a 12-week cycle, not wk 3). See `docs/adr/0002-configurable-cycle-length.md`.
- **Deload = volume cut, intensity held.** Deload weeks cut `prescribedSets` ~40% (`applyDeloadVolume` in `js/program.js`) and append a note to prescription text; kg (intensity) is **NOT** scaled — `Loads.resolveEffective` has no deload parameter at all. Retest weeks are exempt from the volume cut. See `docs/adr/0003-deload-as-volume-cut.md`.
- **The cycle is anchored two ways.** Settings has `anchorMode: 'startDate' | 'compDate'`. Always resolve via `Program.effectiveStart(settings)` — never read `settings.startDate` directly in views. When `anchorMode === 'compDate'`, the start is `compDate − (cycleWeeks × 7 − 1)` days, so the final taper day lands on the comp date.
- **Day-of-week determines the session slot, not cycle position.** `Program.resolveDate` uses `d.getDay()` to map Mon→`mon-main`, Thu/Sat→main, Wed/Fri→`rest`, Tue→`tue-light`, Sun→`sun-optional`. So a non-Monday `startDate` shifts which calendar day is "Wk 1 Mon-main".
- **Load math chain (in `Loads.resolveEffective`, in order):** `prescribeLoadKg` (% range from benchmarks) → seed by previous actual kg if present, else range midpoint → `autoAdjust` ±5% (previous avg RPE vs target `rpeRange`) → readiness multiplier (×0.85 / ×1.0 / ×1.05, or 0 = suggest rest). Each step appends to `reason[]` for UI traceability. **No deload multiplier here** — deload is a volume cut applied in `program.js`, not an intensity scale.
- **`exercise.kind` drives rendering and load logic.** Loaded kinds are `hangboard` and `pullup` (use `loadPctRange` against `maxHang20mm` or `pullup1RM`). `antagonist-block` has nested `items[]`. `test`, `boulder`, `route`, `circuit`, `arc`, `open-climb`, `mobility`, `skill`, `limit-boulder`, `campus` exist for prescription text only — don't try to compute kg for them.
- **`js/exercise-inputs.js` is the single source of truth for which inputs to show.** Both `today.js` (live session) and `log.js` (edit-past-day form) import `inputVisibility(ex)` → `{ kg, sets, reps, rpe, optional, none }` and `repsLabel(ex)` (returns `'min'` for `arc`/`open-climb`, else `'reps'`). Never hardcode per-kind UI rules in a view — extend the sets here (`NO_INPUT_KINDS`, `KG_KINDS`, `NO_SETS_KINDS`) so the two surfaces stay in sync.
- **`exercise.optional: true`** on a program entry hides all numeric inputs and renders a single "Done" checkbox. Storage field is `actual.done: boolean`. Use this for prescribed-but-skippable items (e.g. optional skill drills, easy open climbing, optional forearm test). Three exercises currently use it in `js/program.js`.
- **Today tab supports prev/next/jump-to-today date navigation.** The selected ISO date is stored in `sessionStorage['todaySelectedDate']` (resets on browser close — intentional). Don't read `today()` directly when prescribing the visible session; use the view's `getSelectedDate()`.

## Schema & migrations

`js/storage.js` versions the LocalStorage blob (`SCHEMA_VERSION`, currently **5**). Migrations run in `migrate(s)` on every load — they must be **idempotent and bump `s.version`** at the end of each step.

- **v3:** every `days[date].exercises[].actual` is an object `{ kg, sets, reps, rpe, done, raw }` (the `done` boolean is for optional exercises). Legacy strings (e.g. `"5x2 @ 62kg RPE 9"`) are auto-parsed by `parseLegacyActual`. New code must read structured fields, never regex-parse strings. The display string is **derived** in `js/views/log.js`, never persisted.
- **v4 — multi-plan:** state is `{ version, activePlanId, plans: {id: plan}, globalSettings, globalBenchmarks }`. Each plan has its own `settings`, `days`, and (legacy) `benchmarks`. The per-plan data setters (`getDay`/`setDay`/`deleteDay`/`listDays`) accept both the old active-plan arity (`setDay(date, patch)`) and the new explicit arity (`setDay(planId, date, patch)`).
- **v5 — global benchmarks:** `Storage.get().benchmarks` returns `state.globalBenchmarks`, and `setBenchmarks` shims to `setGlobalBenchmarks`. The prescriptive benchmarks the app reads (`maxHang20mm`, `pullup1RM`, `bodyweight`) are now **global**, shared across plans. The retest "Save as Benchmark" path writes via `setGlobalBenchmarks` (no history is kept). `setPlanBenchmarks` still exists but has zero callers — dead code for the legacy per-plan shape.

**Log tab render pattern:** Cards are collapsed by default. `renderLog` keeps two `Set`s: `editingSet` (keys with edit form open) and `expandedSet` (keys with detail visible). Clicking a row header toggles `expandedSet`; clicking Edit adds the key to both sets. `keyMetric(entry)` formats a one-liner. Do not store expanded/editing state in LocalStorage — it is intentionally ephemeral (reset when the user navigates away).

When you add a settings field, add it to `defaultSettings()` AND let `migrate()` shallow-merge it onto loaded state (already done — just keep the pattern).

**Bumping the schema = bump `SCHEMA_VERSION` in `js/storage.js`, AND bump `CACHE` in `sw.js`** so PWA clients pick up the new JS. Check the current cache version at `sw.js:2` (it drifts; don't trust docs for it) and increment it whenever anything under `js/` changes.

## Key conventions

- **ES modules with relative paths and `.js` extensions.** Browser resolves them directly — no bundler will rewrite them. `js/views/*.js` import as `'../storage.js'`, etc.
- **Dates are ISO `YYYY-MM-DD` strings** everywhere (LocalStorage keys for `days`, settings, log filters). Convert with `new Date(iso + 'T00:00:00')` to avoid UTC drift on Windows. Helper pattern is duplicated across views — that's deliberate, no shared util.
- **View renderers replace `root.innerHTML` then call a `wire(...)` function** that attaches listeners to the just-rendered DOM via `data-*` attributes. Don't introduce a virtual DOM or templating library.
- **Pill selectors and steppers** (in `today.js`, styled in `css/styles.css`) are the standard input idioms — use them for any new tap-friendly numeric input rather than `<input type="number">` with no buttons.
- **Suggested loads are tap-to-prefill buttons** (`<button class="suggest-btn" data-suggest-btn="i" data-suggest-kg="N">`). Keep the data-attribute contract if you add similar features. Pre-filled defaults carry a `data-default` flag and are NOT persisted until the user touches the field.
- **Service worker bypasses Firestore/Auth/gstatic URLs explicitly** — see the regex in `sw.js`. Don't cache them; the Firebase SDK has its own offline persistence. The `SHELL` list in `sw.js` must be kept in sync when files are added/renamed under `js/`.
- **`firebase-config.js` is intentionally public** (the apiKey is a project identifier, not a secret). Security comes from `firestore.rules` (`request.auth.uid == uid`). Don't move config into env vars or try to "hide" it. Set `SYNC_ENABLED = false` there for a local-only build.
- **No npm dependencies.** `npx http-server` is just a local-dev convenience — it's not a runtime dep. Don't add a `package.json` unless you're adding a real build step (and discuss first).

## Useful entry points when making changes

- New training session type → `js/program.js` (add to `buildMonHangboard` / `buildThuMain` / `buildSatMain`, plus a new `kind` if it has unique inputs). If the new kind has different input requirements, update `js/exercise-inputs.js`.
- Changing which inputs an exercise shows → `js/exercise-inputs.js` (`NO_INPUT_KINDS`, `KG_KINDS`, `NO_SETS_KINDS`). Both Today + Log edit pick this up automatically.
- Making an exercise optional → set `optional: true` on its program entry. The Today tab and Log edit form will switch it to a Done checkbox.
- Changing how loads are calculated → `js/loads.js`.
- New input UI → add a renderer in `js/views/today.js` (inside `renderExercise`) and CSS in `css/styles.css`; mirror the change in `js/views/log.js`'s edit form so editing a past day keeps parity.
- New top-level tab → register in `views` map in `js/app.js`, add a `<button data-view="X">` in `index.html`, create `js/views/X.js`, add to `SHELL` in `sw.js`.
- New behavioural fix → add a case to `tests/index.html` before/after the fix so it can't silently regress.

## Commit & deploy

Use the conventional commit subject + Co-authored-by trailer (see existing log). Push goes to `origin/main` at <https://github.com/slm37102/simple-climbing-training-planner>. Deploy is "host the static folder anywhere"; no CI runs build/test on push.

**Always deploy to Firebase hosting immediately after every push:**

```powershell
firebase deploy --only hosting
```

Hosting URL: <https://simple-climbing-planner.web.app>
