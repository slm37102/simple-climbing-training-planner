# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A single-user, offline-first **PWA** that prescribes a periodized climbing training macrocycle (Base → Build → Peak → Taper) for one intermediate climber (V5–V6 boulder / ~7a lead) doing both bouldering and sport. **Vanilla HTML / CSS / JS ES modules — no build step, no bundler, no npm runtime deps, no test framework.** Optional Firebase Auth (Google) + Firestore sync.

## Weighing work

**Code is cheap here — do NOT weigh development/implementation time as a cost** when recommending whether to build something. "It's a lot of work" / "poor ROI for the effort" / "too many hours to save a few minutes" are not valid arguments in this repo. Judge a build/don't-build call purely on: does it improve training outcomes for this one athlete, is it correct, is it safe (G3 durability outranks everything), is the evidence real (not uncited convention dressed as behaviour), and does the *ongoing* complexity earn its place (the `project-goals.md` "simple over clever" principle — a maintenance/surface-area cost, distinct from build time). If the only thing arguing against a feature is how long it'd take to write, build it.

## Commands

There is **no build, no lint, no `package.json`**. Everything is served as static files.

```powershell
# Run locally — any static server pointed at repo root:
npx http-server . -p 8765 -c-1
# or
python -m http.server 8765
```

Then open `http://127.0.0.1:8765/` and click **"Use locally only"** on the auth gate. The service worker only activates over `https://` or `localhost`.

**Tests** are an in-browser smoke suite at `tests/index.html`, no CLI runner. See the `test` skill for how to run it, what it covers, Playwright MCP notes, and this dev machine's environment quirks (stale `node`/`npx`/`python` PATH, Playwright MCP connection order).

## Deploy

Static host anywhere; canonical target is Firebase Hosting. See the `deploy` skill for the command, auto-deploy pipeline, and hosting URL.

## Architecture

`js/app.js` is the entry point: registers the service worker, wires tab nav, gates on auth, and mounts views. Tabs map to renderers in `js/views/*.js`. **There is no framework** — each renderer takes `(root)`, replaces `#view`'s `innerHTML`, then wires its own listeners via `data-*` attributes; views import the domain singletons (`Storage`, `Program`, `Loads`, …) directly as ES modules. Re-rendering on state change = re-calling the view function.

Data flow is layered:

```
js/views/*   → read Storage.get(), Program.*, Loads.*   (pure read of plan + math)
             → write via Storage.setDay / setPlanSettings / setGlobalBenchmarks
js/storage.js→ LocalStorage is the source of truth; emits change events
js/sync.js   → subscribes Storage.onChange, debounced 800ms upload to
               Firestore users/{uid}/state/main; onSnapshot merges remote back
               via Storage.mergeRemote (per-plan, per-day Last-Write-Wins on updatedAt)
```

### Domain model

The training logic lives in **`js/program.js`** (the macrocycle — `Program.build(plan, dateISO)` resolves a date to its cycle context, then builds the prescribed session) and **`js/loads.js`** (turns prescribed % ranges + benchmarks into kg via the adjustment chain). It's grounded in `docs/training-philosophy.md`, the ADRs in `docs/adr/`, and `docs/knowledge-gaps.md` (tracked KG-* divergences) — **read the relevant ones before changing prescriptions**; the values are deliberate and sometimes intentionally softened from the source frameworks for this athlete's injury risk. Project goals live in `docs/project-goals.md`.

> **The deep invariants, storage schema/migrations, and the "where do I change X" index live in the `domain-invariants` skill.** It auto-loads when you edit `js/program.js` / `js/loads.js` / `js/storage.js` / `js/exercise-inputs.js` / `js/monitoring.js`, change a prescription or the load chain, touch the schema, or add a session type / kind / tab / signal. Consult it before editing the training core — those invariants are load-bearing.

## Conventions

- **ES modules, relative paths, explicit `.js` extensions** — the browser resolves them directly; nothing rewrites imports.
- **Dates are ISO `YYYY-MM-DD` strings everywhere.** Parse with `new Date(iso + 'T00:00:00')` to avoid UTC drift. Date math lives in `js/dates.js` (`localIso`/`today`/`addDays`/`daysBetween`/`snapToMonday`) — every module imports from there; never re-implement these helpers locally (the old view-local copies were migrated out deliberately). Human-readable date *formatters* stay view-local — they're presentation, not math.
- **User-typed strings are escaped at render.** Plan names, session/exercise notes, and anything else the athlete can type must go through `escHtml` (`js/ui.js`) when interpolated into `innerHTML` — notes sync across devices via Firestore, so an unescaped interpolation is not just self-XSS. Program-authored template text (exercise names, prescriptions) is trusted.
- **View pattern:** replace `root.innerHTML`, then call a `wire(...)` function that attaches listeners by `data-*` attribute. No virtual DOM, no templating library.
- **Tap-friendly inputs:** pill selectors and steppers (in `today.js`, styled in `css/styles.css`) are the standard idiom for numeric input — use them over bare `<input type="number">`. Suggested loads are tap-to-prefill buttons (`data-suggest-btn` / `data-suggest-kg`).
- **`firebase-config.js` is intentionally public.** The `apiKey` is a project identifier, not a secret; security is enforced by `firestore.rules` (`request.auth.uid == uid`). Don't move it to env vars or try to hide it. Set `SYNC_ENABLED = false` there for a local-only build.
- **`sw.js` bypasses Firestore / Auth / gstatic URLs explicitly** (see the regex) — the Firebase SDK handles its own offline persistence; don't cache those. `sw.js` is also **derived, not hand-maintained**: run `node tools/generate-sw.mjs --bump` after changing anything under `js/` (see the `domain-invariants` skill).

## Disclaimer

The training content is not medical advice; that framing is intentional and surfaced in the app.

## Agent skills

- **`domain-invariants`** — the load-bearing invariants of the training core, storage schema/migrations, and the "where do I change X" index. Auto-loads when editing the training logic; consult it before touching prescriptions, the load chain, or the schema.
- **Issue tracker** — issues are tracked in GitHub Issues (via the `gh` CLI); external PRs are not pulled into `/triage`. See `docs/agents/issue-tracker.md`.
- **Triage labels** — default label vocabulary (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`) — no repo-specific overrides. See `docs/agents/triage-labels.md`.
- **Domain docs** — single-context layout: `CONTEXT.md` (glossary) + `docs/adr/` at the repo root. See `docs/agents/domain.md`.
- **Improvement backlog** — `docs/improvement-backlog.md` is the **live** to-do ledger (`IB-*` IDs) — engineering findings and, until they graduate to a `KG-*` row, training-content ones too. `docs/improvement-audit.md`, `docs/coach-review.md` and `docs/deep-audit.md` are dated historical audits that feed it, not trackers. The user-invoked **`/audit-loop`** skill surveys the repo, files what it finds there, and closes one item per pass.
