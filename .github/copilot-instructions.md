# Copilot instructions — simple-climbing-training-planner

A single-user offline-first PWA that prescribes a 12-week climbing macrocycle. **Vanilla HTML/CSS/JS ES modules — no build step, no bundler, no test framework.** Optional Firebase Auth + Firestore sync.

## Run locally

Any static server pointed at the repo root works. Examples:

```powershell
npx http-server . -p 8765 -c-1
# or
python -m http.server 8765
```

Then open `http://127.0.0.1:8765/` and click **"Use locally only"** on the auth gate (Firebase config is `REPLACE_ME` until the user wires it up — see README). The service worker only activates over `https://` or `localhost`.

There are no tests, no linter, and no build script. Smoke-testing happens in the browser. The Playwright MCP browser is the standard way to drive end-to-end checks (load + click + `evaluate` to inspect state); init scripts for `Date` overrides do not always apply, so prefer fake-data + module imports via `evaluate('async () => { const {Storage} = await import("/js/storage.js"); ... }')` over time-travel.

## Architecture (the parts you can't get from one file)

`js/app.js` is the entry. Tabs map to renderers in `js/views/*.js`; each renderer takes `(root, ctx)` and replaces `#view`'s innerHTML, then wires its own listeners. There is no framework — re-rendering on state change is done by re-calling the view function.

The data flow is layered:

```
views/*  → reads Storage.get(), Program.*, Loads.*    (pure read of plan + math)
         → writes via Storage.setDay/setSettings/setBenchmarks
Storage  → LocalStorage (source of truth) + emits change events
Sync     → subscribes Storage.onChange, debounced 800ms upload to
           Firestore users/{uid}/state/main; onSnapshot merges remote
           via Storage.mergeRemote (per-day Last-Write-Wins on updatedAt)
```

Key invariants worth preserving when editing:

- **`Storage.mergeRemote` must NOT emit change events** — that would re-trigger upload and loop. It uses an internal `suppressEmit` counter.
- **The 12-week cycle is anchored two ways.** Settings has `anchorMode: 'startDate' | 'compDate'`. Always resolve via `Program.effectiveStart(settings)` — never read `settings.startDate` directly in views. When `anchorMode === 'compDate'`, the start is `compDate − 83 days` so day 84 (the last taper day) lands on the comp.
- **Day-of-week determines the session slot, not cycle position.** `Program.resolveDate` uses `d.getDay()` to map Mon/Thu/Sat → main, Wed/Fri → rest, Tue/Sun → light. So a non-Monday `startDate` shifts which day is "Wk 1 Mon-main".
- **Phase pattern is a fixed 12-element array** (`PHASE_PATTERN` in `js/program.js`): Base 1–6 with deloads at 3 & 6 (3 & 6 also flagged `retest`), Build 7–9 with deload at 9, Peak 10–11, Taper 12. Don't re-derive — index into the array.
- **Load math chain (in order):** `prescribeLoadKg` (% range from benchmarks) → seed by previous actual kg if present, else range midpoint → `autoAdjust` ±5% based on previous avg RPE vs target → readiness multiplier (×0.85 / ×1.0 / ×1.05 / 0=rest) → deload ×0.85. Each step appends to `reason` for UI traceability.
- **`exercise.kind` drives rendering and load logic.** Loaded kinds are `hangboard` and `pullup` (use `loadPctRange` against `maxHang20mm` or `pullup1RM`). `antagonist-block` has nested `items[]`. `test`, `boulder`, `route`, `circuit`, `arc`, `open-climb`, `mobility`, `skill`, `limit-boulder`, `campus` exist for prescription text only — don't try to compute kg for them.

## Schema & migrations

`js/storage.js` versions the LocalStorage blob (`SCHEMA_VERSION`). Migrations run in `migrate(s)` on every load — they must be **idempotent and bump `s.version`** at the end of each step. v3's notable rule: every `days[date].exercises[].actual` is an object `{ kg, sets, reps, rpe, raw }`. Legacy strings (e.g. `"5x2 @ 62kg RPE 9"`) are auto-parsed by `parseLegacyActual`. New code must read structured fields, never regex-parse strings. The display string is **derived** in `js/views/log.js`, never persisted.

When you add a settings field, add it to `defaultState().settings` AND let `migrate()` shallow-merge it onto loaded state (already done — just keep the pattern).

Bumping the schema = bump `SCHEMA_VERSION` in `js/storage.js`, AND bump `CACHE` in `sw.js` (e.g. `climb-planner-v3` → `v4`) so PWA clients pick up the new JS.

## Key conventions

- **ES modules with relative paths and `.js` extensions.** Browser resolves them directly — no bundler will rewrite them. `js/views/*.js` import as `'../storage.js'`, etc.
- **Dates are ISO `YYYY-MM-DD` strings** everywhere (LocalStorage keys for `days`, settings, log filters). Convert with `new Date(iso + 'T00:00:00')` to avoid UTC drift on Windows. Helper pattern is duplicated across views — that's deliberate, no shared util.
- **View renderers replace `root.innerHTML` then call a `wire(...)` function** that attaches listeners to the just-rendered DOM via `data-*` attributes. Don't introduce a virtual DOM or templating library.
- **Pill selectors and steppers** (in `today.js`, styled in `css/styles.css`) are the standard input idioms — use them for any new tap-friendly numeric input rather than `<input type="number">` with no buttons.
- **Suggested loads are tap-to-prefill buttons** (`<button class="suggest-btn" data-suggest-btn="i" data-suggest-kg="N">`). Keep the data-attribute contract if you add similar features.
- **Service worker bypasses Firestore/Auth/gstatic URLs explicitly** — see the regex in `sw.js`. Don't cache them; the Firebase SDK has its own offline persistence. The shell list in `sw.js` must be kept in sync when files are added/renamed under `js/`.
- **`firebase-config.js` is intentionally public** (the apiKey is a project identifier, not a secret). Security comes from `firestore.rules` (`request.auth.uid == uid`). Don't move config into env vars or try to "hide" it.
- **No npm dependencies.** `npx http-server` is just a local-dev convenience — it's not a runtime dep. Don't add a `package.json` unless you're adding a real build step (and discuss first).

## Useful entry points when making changes

- New training session type → `js/program.js` (add to `buildMonHangboard` / `buildThuMain` / `buildSatMain`, plus a new `kind` if it has unique inputs).
- Changing how loads are calculated → `js/loads.js`.
- New input UI → add a renderer in `js/views/today.js` (inside `renderExercise`) and CSS in `css/styles.css`.
- New top-level tab → register in `views` map in `js/app.js`, add a `<button data-view="X">` in `index.html`, create `js/views/X.js`, add to `SHELL` in `sw.js`.

## Commit & deploy

Use the conventional commit subject + Co-authored-by trailer (see existing log). Push goes to `origin/main` at <https://github.com/slm37102/simple-climbing-training-planner>. Deploy is "host the static folder anywhere"; no CI runs build/test on push.

**Always deploy to Firebase hosting immediately after every push:**

```powershell
firebase deploy --only hosting
```

Hosting URL: <https://simple-climbing-planner.web.app>
