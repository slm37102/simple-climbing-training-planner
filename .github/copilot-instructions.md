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

There is no linter and no build script. There **is** an in-browser smoke-test page at `tests/index.html` — open `http://127.0.0.1:8765/tests/` and tests auto-run. It can also be driven **headlessly from a terminal** with `node tools/run-tests.mjs` (exit 0 = all green, 1 = any failure; needs Playwright, which is a dev/CI tool, not an app dep) — that runner only *drives* the existing harness, it is not a test framework and `tests/` is unchanged. The cases themselves live in **`tests/cases/*.js`** (one file per domain area), which `tests/index.html` imports; add a case to the matching file — or a new numbered file plus an import line — whenever you fix a bug or add input/storage logic (the suite covers `Storage` round-trips + merge/LWW, `Today` input persistence + pre-fill defaults, `inputVisibility` per kind, optional Done, `Program.resolveForSettings`/`resolveDate`, `buildPhasePattern` across cycle lengths, deload semantics, the prescription pipeline (`notes[]` + provenance), the `Loads` chain (`resolveForDay`), monitoring signals, readiness gating, and the view smoke tests — Log renders **read-only** now, plus the Calendar summary card). The page mutates `localStorage` — click **Clear** before returning to the live app. The Playwright MCP browser is also available for end-to-end checks; init scripts for `Date` overrides do not always apply, so prefer fake-data + module imports via `evaluate('async () => { const {Storage} = await import("/js/storage.js"); ... }')` over time-travel.

## Architecture (the parts you can't get from one file)

`js/app.js` is the entry. Tabs map to renderers in `js/views/*.js`; each renderer takes **just `(root)`** and replaces `#view`'s innerHTML, then wires its own listeners. There is no framework — re-rendering on state change is done by re-calling the view function. Views **import the domain singletons directly** as ES modules (`import { Storage } from '../storage.js'`, `Program`, `Loads`, `Warmup`, …); the old `ctx` bundle parameter was removed (see the comment at `js/app.js:21`) — don't reintroduce it.

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
- **Cycle length is configurable, not fixed.** `settings.cycleWeeks` (default 12, clamped 8–40). The phase split is **derived** from length by `buildPhasePattern(weeks, peakType)` — never hardcode a 12-element pattern. Single block ≤ 20 weeks; **double block** (two Base→Build cycles) above the `DOUBLE_BLOCK_THRESHOLD` of 20. Peak is fixed at 2 weeks; **taper length is event-scaled** by `taperWeeksFor(peakType)` (ADR-0007): **2 weeks** for a `trip`/`project`, **1 week** for a `comp`. Index into `Program.phasePattern(settings)`; don't re-derive. `PHASE_PATTERN` is still exported for back-compat callers as a **frozen 12-week comp shape** — literally `buildPhasePattern(12, 'comp')`, **not** `buildPhasePattern(DEFAULT_CYCLE_WEEKS)` (IB-069 / the ADR-0002 addendum): the two coincide only because `DEFAULT_CYCLE_WEEKS === 12` today, and binding a back-compat export to the tunable default would silently re-shape it. Pinned by `[IB-069]` in `tests/cases/04-program-core.js`. The **retest** week is the last Base week of each block (e.g. wk 6 in a 12-week cycle, not wk 3). Resolve cycle context through `Program.resolveForSettings(settings, dateISO)`, which derives `peakType` itself — the positional `resolveDate` silently defaults `peakType` and mis-shapes trip/project plans if a caller forgets it. See `docs/adr/0002-configurable-cycle-length.md` + `0007`.
- **Deload = volume cut, intensity held.** Deload weeks cut `prescribedSets` ~40% (`applyDeloadVolume` in `js/program.js`) and append a note to prescription text; kg (intensity) is **NOT** scaled — there is no deload *multiplier* in the load chain. But the chain is **not** deload-blind: `Loads.resolveEffective` carries a `holdProgression` flag (ADR-0014 + the ADR-0009 addendum), set from `Loads.holdProgressionFor({ctx, dayLog})` (returns a *cause* — `'pain-amber'` → `'retest'` → `'deload'` — or null), that suppresses the ADR-0009 +2.5% targets-hit step so a recovery week no longer ratchets kg up (**IB-028**). The ±5% RPE thermostat stays deload-unaware by design. **Taper** weeks still lack this hold (**IB-056**, tracked). Retest weeks are exempt from the volume cut **only on Monday** (`env.slot === 'mon-main'` — the retest protocol itself; Thu/Sat in a retest week still take the cut, **KG-B10**). See `docs/adr/0003-deload-as-volume-cut.md` + `0004`.
- **The cycle is anchored two ways.** Settings has `anchorMode: 'startDate' | 'compDate'`. Always resolve via `Program.effectiveStart(settings)` — never read `settings.startDate` directly in views. When `anchorMode === 'compDate'`, the start is `compDate − (cycleWeeks × 7 − 1)` days, so the final taper day lands on the comp date.
- **Day-of-week determines the session slot, not cycle position.** `Program.resolveDate` uses `d.getDay()` to map Mon→`mon-main`, Thu/Sat→main, Wed/Fri→`rest`, Tue→`tue-light`, Sun→`sun-optional`. So a non-Monday `startDate` shifts which calendar day is "Wk 1 Mon-main".
- **Load math chain (in `Loads.resolveEffective`, in order):** `prescribeLoadKg` (% range from benchmarks) → seed by previous actual kg if present, else range midpoint → `layoffDecay` (ADR-0008: ×1.0 within a 10-day grace since that session last logged, else −3%/week floored at ×0.85) → `autoAdjust` ±5% (previous avg RPE vs target `rpeRange`), **upgraded to +2.5% when RPE is in range AND `Loads.targetsHit` says the previous actual met today's prescribed sets/reps** (ADR-0009) → **`holdProgression`** (ADR-0014) suppresses that +2.5% step while leaving the ±5% thermostat running → readiness multiplier (×0.85 / ×1.0 / ×1.05, or 0 = suggest rest) → **upward cap: total move ≤ +5% of the decayed previous actual per session** (ADR-0009; downward never capped). Views call `Loads.resolveForDay` (exercise + index + sessionId + date + `Storage.listDays()`), which owns the previous-same-session scan and feeds the full previous actual through; `resolveEffective` is the pure internal/test door. Each step appends to `reason[]`, rendered to the athlete as a Today tooltip (IB-041). **No deload multiplier here** — deload is a volume cut applied in `program.js`, not an intensity scale.
- **`exercise.kind` drives rendering and load logic.** Loaded kinds are `hangboard` and `pullup` (use `loadPctRange` against `maxHang20mm` or `pullup1RM`). `antagonist-block` has nested `items[]`. `test`, `boulder`, `route`, `circuit`, `arc`, `open-climb`, `mobility`, `skill`, `limit-boulder`, `campus` exist for prescription text only — don't try to compute kg for them.
- **`js/exercise-inputs.js` is the single source of truth for which inputs to show.** `today.js` — the **only** logging surface — imports `inputVisibility(ex)` → `{ kg, sets, reps, rpe, optional, none }` and `repsLabel(ex)` (returns `'min'` for `arc`/`open-climb`, else `'reps'`). Never hardcode per-kind UI rules in a view — extend the sets here (`NO_INPUT_KINDS`, `KG_KINDS`, `NO_SETS_KINDS`).
- **The Log tab is a read-only feed — editing happens on Today.** `log.js` does **not** import `inputVisibility` and has no edit form: the old in-feed edit form was a second, drift-prone copy of Today's logging surface and was removed deliberately (see the header comment in `js/views/log.js`). Editing a past day = navigating the Today tab to that date. Don't reintroduce an edit form in Log.
- **`exercise.optional: true`** on a program entry hides all numeric inputs and renders a single "Done" checkbox. Storage field is `actual.done: boolean`. Use this for prescribed-but-skippable items (e.g. optional skill drills, easy/open climbing, the optional 1RM pull-up and forearm repeater tests). Five exercises currently use it in `js/program.js`.
- **Today tab supports prev/next/jump-to-today date navigation.** The selected ISO date is stored in `sessionStorage['todaySelectedDate']` (resets on browser close — intentional). Don't read `today()` directly when prescribing the visible session; use the view's `getSelectedDate()`.

## Schema & migrations

`js/storage.js` versions the LocalStorage blob (`SCHEMA_VERSION`, currently **6**). Migrations run in `migrate(s)` on every load — they must be **idempotent and bump `s.version`** at the end of each step.

- **v3:** every `days[date].exercises[].actual` is an object `{ kg, sets, reps, rpe, done, raw }` (the `done` boolean is for optional exercises). Legacy strings (e.g. `"5x2 @ 62kg RPE 9"`) are auto-parsed by `parseLegacyActual`. New code must read structured fields, never regex-parse strings. The display string is **derived** in `js/views/log.js`, never persisted.
- **v4 — multi-plan:** state is `{ version, activePlanId, plans: {id: plan}, globalSettings, globalBenchmarks }`. Each plan has its own `settings`, `days`, and (legacy) `benchmarks`. The per-plan data setters (`getDay`/`setDay`/`deleteDay`/`listDays`) accept both the old active-plan arity (`setDay(date, patch)`) and the new explicit arity (`setDay(planId, date, patch)`).
- **v5 — global benchmarks:** `Storage.get().benchmarks` returns `state.globalBenchmarks`, and `setBenchmarks` shims to `setGlobalBenchmarks`. The prescriptive benchmarks the app reads (`maxHang20mm`, `pullup1RM`, `bodyweight`) are now **global**, shared across plans. `setPlanBenchmarks` still exists but has zero callers — dead code for the legacy per-plan shape.
- **v6 — retest history (ADR-0014):** `globalBenchmarks.history` is an array of dated `{date, maxHang20mm, pullup1RM}` snapshots. **Retest saves APPEND; ad-hoc edits OVERWRITE.** `Storage.saveRetestBenchmarks(patch, date)` — every "Save as Benchmark" path (Base-block retest + the ADR-0012 post-goal retest) — pushes a snapshot onto `history` **before** applying the patch, feeding the retest-trajectory monitoring signal. Plain `setGlobalBenchmarks` (manual Profile edits) still just overwrites, no history entry — don't conflate the two.

**Log tab render pattern:** Cards are collapsed by default. `renderLog` keeps a single in-memory `expandedSet` (keys with detail visible); clicking a row header toggles it. There is no `editingSet` and no Edit button — the feed is read-only (see above). `keyMetric(entry)` formats a one-liner. Do not persist expanded state to LocalStorage — it is intentionally ephemeral (reset when the user navigates away).

When you add a settings field, add it to `defaultSettings()` AND let `migrate()` shallow-merge it onto loaded state (already done — just keep the pattern).

**`sw.js` is generated, not hand-edited.** After changing anything under `js/` or `css/`, run `node tools/generate-sw.mjs` — it regenerates the `SHELL` list and sets the `CACHE` key to a content hash of the shell assets so PWA clients pick up the new payload. There is no `--bump`: the key is derived from content (IB-055), so regeneration is idempotent and two branches can't collide on a version. CI **hard-fails** the deploy when `js/`/`css/` changed but the `CACHE` line did not (`.github/workflows/firebase-deploy.yml`) — i.e. a forgotten regeneration — so don't skip it. Bumping the schema still means bumping `SCHEMA_VERSION` in `js/storage.js` as well.

## Key conventions

- **ES modules with relative paths and `.js` extensions.** Browser resolves them directly — no bundler will rewrite them. `js/views/*.js` import as `'../storage.js'`, etc.
- **Dates are ISO `YYYY-MM-DD` strings** everywhere (LocalStorage keys for `days`, settings, log filters). Parse with `new Date(iso + 'T00:00:00')` to avoid UTC drift. **Date *math* lives in `js/dates.js`** (`localIso`/`today`/`addDays`/`daysBetween`/`snapToMonday`/`mondayDow`) — import from there; never re-implement these locally (the old view-local copies were migrated out deliberately). Human-readable date *formatters* stay view-local — they're presentation, not math.
- **View renderers replace `root.innerHTML` then call a `wire(...)` function** that attaches listeners to the just-rendered DOM via `data-*` attributes. Don't introduce a virtual DOM or templating library.
- **Pill selectors and steppers** (in `today.js`, styled in `css/styles.css`) are the standard input idioms — use them for any new tap-friendly numeric input rather than `<input type="number">` with no buttons.
- **Suggested loads are tap-to-prefill buttons** (`<button class="suggest-btn" data-suggest-btn="i" data-suggest-kg="N">`). Keep the data-attribute contract if you add similar features. Pre-filled defaults carry a `data-default` flag and are NOT persisted until the user touches the field.
- **Service worker bypasses Firestore/Auth/gstatic URLs explicitly** — see the regex in `sw.js`. Don't cache them; the Firebase SDK has its own offline persistence. The `SHELL` list stays in sync **by regeneration, not by hand** — `node tools/generate-sw.mjs` rebuilds it from the files on disk, so a new or renamed `js/` file is picked up automatically.
- **`firebase-config.js` is intentionally public** (the apiKey is a project identifier, not a secret). Security comes from `firestore.rules` (`request.auth.uid == uid`). Don't move config into env vars or try to "hide" it. Set `SYNC_ENABLED = false` there for a local-only build.
- **No npm dependencies.** `npx http-server` is just a local-dev convenience — it's not a runtime dep. Don't add a `package.json` unless you're adding a real build step (and discuss first).

## Useful entry points when making changes

- New training session type → `js/program.js` (add to `buildMonHangboard` / `buildThuMain` / `buildSatMain`, plus a new `kind` if it has unique inputs). If the new kind has different input requirements, update `js/exercise-inputs.js`.
- Changing which inputs an exercise shows → `js/exercise-inputs.js` (`NO_INPUT_KINDS`, `KG_KINDS`, `NO_SETS_KINDS`). Both Today + Log edit pick this up automatically.
- Making an exercise optional → set `optional: true` on its program entry. The Today tab switches it to a Done checkbox.
- Changing how loads are calculated → `js/loads.js`.
- New input UI → add a renderer in `js/views/today.js` (inside `renderExercise`) and CSS in `css/styles.css`. There is nothing to mirror in `js/views/log.js` — it is read-only, and editing a past day already goes through Today's date navigation.
- New top-level tab → register in the `views` map in `js/app.js`, add a `<button data-view="X">` in `index.html`, create `js/views/X.js`, then run `node tools/generate-sw.mjs` (never hand-edit `SHELL` — `sw.js` is generated).
- New behavioural fix → add a case to the matching `tests/cases/*.js` file (or a new numbered file plus its import in `tests/index.html`) before/after the fix so it can't silently regress.

## Commit & deploy

Use the conventional commit subject + Co-authored-by trailer (see existing log). Push goes to `origin/main` at <https://github.com/slm37102/simple-climbing-training-planner>.

**Deploy is automatic.** A push to `main` triggers `.github/workflows/firebase-deploy.yml`, which first **fails the run** if `js/`/`css/` changed without a `CACHE` change in `sw.js` (so run `node tools/generate-sw.mjs` before pushing), then deploys to Firebase Hosting. No manual `firebase deploy` is needed for the normal path. (For a manual deploy you'd still run `firebase deploy --only hosting`.)

Hosting URL: <https://simple-climbing-planner.web.app>
