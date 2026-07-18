---
name: test
description: Run or extend this repo's in-browser smoke test suite (tests/index.html) for the simple-climbing-training-planner PWA. There is no CLI test runner and no test framework — use this skill whenever the user asks to run tests, verify a bug fix, check a storage/schema change, or add a test case for this project, even if they just say "test this" or "make sure this didn't break anything."
---

# Running this project's test suite

There is **no build, no lint, no CLI test runner** for this repo. Tests are an in-browser smoke suite: `tests/index.html` is the shell, `tests/harness.js` is the runner (`test`/`assert`/`assertEq`/`resetStorage`), and the cases live in **`tests/cases/*.js`** — one ES module per domain area, imported by the page in display order.

## Running the suite

1. Serve the repo root as static files (see the project's Commands): `npx http-server . -p 8765 -c-1` or `python -m http.server 8765`.
2. Open `http://127.0.0.1:8765/tests/` — tests auto-run on load.
3. **The page mutates `localStorage`.** Click **Clear** before returning to the live app, or leftover test state will pollute the real app's data.

## What's covered

`Storage` round-trips + merge/LWW, `Today` input persistence + pre-fill defaults, `inputVisibility` per kind, optional Done, `Program.resolveForSettings`/`resolveDate`, `buildPhasePattern` for various cycle lengths, deload semantics, the prescription pipeline (notes[] + provenance), loads chain (`resolveForDay`), monitoring signals, readiness gating, and the view smoke tests (Log is read-only; Calendar summary card).

## Running a single test

There's no filter flag — comment out the other `import './cases/…'` lines in `tests/index.html` to run one file, or temporarily filter the `tests` array in `tests/harness.js`, then reload.

## When to add a case

Add a test case before or after any bug fix or input/storage change, so the regression can't silently come back. Put it in the matching `tests/cases/` file (each carries the same import block, so moving cases between files is trivial); a genuinely new area gets a new numbered file plus an `import` line in `tests/index.html`.

## End-to-end checks with Playwright MCP

The Playwright MCP browser is available for driving the app live. Init scripts for `Date` overrides do **not** reliably apply in this project — don't rely on time-travel to simulate "today." Instead, seed fake data directly via module imports, e.g.:

```js
evaluate('async () => { const {Storage} = await import("/js/storage.js"); ... }')
```
