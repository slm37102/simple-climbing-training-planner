# Improvement audit — 2026-06-24

> **Status (2026-07-02): implemented.** All four phases below shipped and merged to `main`
> (commits `e5d8a1b` phase 1 · `9efceeb` phase 2 · `f4bc0cc` phase 3 · `e1da784` phase 4 ·
> `2d778cd` review fixes; merged in `5c08003`), verified against current code. Remaining:
> **Q1 is partial** — `js/dates.js` exists and `storage.js` uses it, but the views still carry
> local date-helper copies; **S3's** whole-state replace on import is now intentional behavior
> behind an explicit destructive confirm. Treat the findings below as a historical record, not
> a to-do list. New engineering findings belong here; training-content gaps live in
> [`knowledge-gaps.md`](knowledge-gaps.md).

A multi-agent review of the whole app across 6 dimensions (correctness, dates/timezone, sync/data-integrity, UX/a11y, code quality, PWA/offline). Each finding was independently re-checked by a skeptical verifier; **33 of 34 raw findings survived**. Severities below are the *verified* (post-adversarial) ones, which are often lower than the initial flag.

Distribution: **1 high · 6 medium · the rest low/enhancement.**

IDs are stable handles for the plan in the second half of this doc. `file:line` references are approximate to the code at audit time.

---

## Findings

### Sync & data integrity — the highest-risk area

The upload path is `setDoc(..., {merge:false})` — a blind whole-document overwrite. All Last-Write-Wins protection lives only on the *download* path (`mergeRemote`). So any upload that fires before the first remote snapshot is merged can silently destroy newer data from another device. S1–S4 are facets of this.

| ID | Sev | Issue | Location | Fix |
|----|-----|-------|----------|-----|
| **S1** | **High** | **First-upload race:** a local edit (or `clearLocal`'s own `emit`) within the snapshot window uploads un-merged state, clobbering newer remote data. | [js/sync.js:96](js/sync.js:96), [js/sync.js:160](js/sync.js:160) | Add a `hydrated` gate: `false` on each `_attachDoc`, set `true` only after the first snapshot merges; `_uploadNow` early-returns while `!hydrated`. Set `true` before the empty-remote upload so new accounts still push. |
| S2 | Med | **Account switch:** `clearLocal()` wipes to the default plan *before* `_attachDoc`, so a pending debounced upload can push the empty default over the new account's remote. | [js/sync.js:78](js/sync.js:78) | Covered by the S1 `hydrated` gate; additionally defer `clearLocal()` until after the first merge, or move the choice to the auth-gate UI instead of a blocking `confirm()`. |
| S3 | Med | **`importJson`** wholly replaces state → on upload clobbers remote plans not in the file; also no shape validation (only the settings.js caller guards it). | [js/storage.js:413](js/storage.js:413) | Validate `incoming.plans` is a non-array object and throw otherwise; route import through the merge path (or `setDoc merge:true`) so remote-only plans survive. |
| S4 | Med | **Phantom-plan prune** deletes *any* empty local plan absent from remote — including a fully configured plan created offline that has no logged days yet. | [js/storage.js:465](js/storage.js:465) | Tag the auto-created default with `auto:true` (cleared on first user edit) and prune only those; or defer pruning until after the first successful upload. |
| S5 | Med | **`mergeRemote` (the riskiest logic in the app) has zero test coverage** — LWW, pruning, `activePlanId` fallback, emit-suppression all untested. | [js/storage.js:427](js/storage.js:427), [tests/index.html](tests/index.html) | Add smoke tests driving `Storage.mergeRemote` + `Storage.raw()`. `export` the private `newer()` to test boundary cases (missing/equal timestamps). |

### Correctness

| ID | Sev | Issue | Location | Fix |
|----|-----|-------|----------|-----|
| **C1** | Med | **Phase/flavor flips mid-week for non-Monday starts:** `weekIdx` counts 7-day blocks from the start date, but the slot uses the real weekday. `compDate` anchoring yields a Monday start *only* when the comp is on a Sunday — so this hits the common case (week.js shows inconsistent phase/deload badges across one calendar week). | [js/program.js:500](js/program.js:500) | Snap `effectiveStart`/`computeStartFromComp` to the Monday of that week (mirror `findMonday` in calendar.js). **Do not** offset `weekIdx` — that overruns the pattern array and throws. Note: in `compDate` mode this shifts the comp off the exact final day by ≤6 days; document the choice. |
| C2 | Low | **Back-to-back deload weeks** for 13 of 33 cycle lengths: the forced retest week lands right after a natural `(i+1)%3` deload. Default 12-week is unaffected. Violates the documented 3:1 cadence. | [js/program.js:67](js/program.js:67) (and 74, 78) | When forcing the retest onto the last Base week, clear the immediately-preceding natural deload. Add a `buildPhasePattern` test asserting no two adjacent weeks are both deload across w∈8..40. |
| C3 | Low | **Readiness multiplier of 0** ("suggest rest") collapses to a tappable "Suggested: 0 kg" instead of suppressing the suggestion. | [js/loads.js:83](js/loads.js:83) | In `resolveEffective`, special-case `readinessMultiplier <= 0` → return `{ suggestedKg: null, restSuggested: true }`; have today.js skip the suggestion button and surface the existing rest label. |
| C4 | Low | **Negative `maxHang20mm`** (assisted climber) produces an inverted `addedKgRange` (`range[0] > range[1]`) → cosmetically backwards label. Midpoint stays correct. | [js/loads.js:51](js/loads.js:51) | Order `lo`/`hi` once with `Math.min`/`Math.max` before building both ranges. Add a negative-benchmark smoke test. |

### UX & accessibility

| ID | Sev | Issue | Location | Fix |
|----|-----|-------|----------|-----|
| **U1** | Med | **Stepper row hardcoded `repeat(3,1fr)`** but hangboard/pull-up (headline exercises) render **4** inputs → the 4th wraps; 2-input exercises leave a gap. The `.two`/`.one` modifier classes exist but are never applied. | [js/views/today.js:480](js/views/today.js:480), [css/styles.css:62](css/styles.css:62) | Count visible steppers and append a matching class; add `.stepper-row.four{grid-template-columns:repeat(2,1fr)}` (2×2 on phones). Or switch `.stepper-row` to `flex-wrap` and delete the modifier machinery. |
| U2 | Low | **Dead no-op ternary** `<details ${checkedCount === 0 ? '' : ''}>` — both branches empty; warm-up always collapses. | [js/views/today.js:321](js/views/today.js:321) | Remove the ternary (plain `<details>`), matching the "collapsed" comment and the cooldown block. |
| U3 | Enh | **Charts tab** renders three blank axis boxes with no "no data yet" message, unlike the Feed/Phases empty states. | [js/views/log.js:451](js/views/log.js:451) | Add a muted empty state when all three series are empty, mirroring Feed (line 294) / Phases (471). |
| U4 | Enh | **Pre-filled defaults** render muted + italic + dashed → read as disabled placeholders, undercutting "one tap to log". | [css/styles.css:276](css/styles.css:276) | Drop the italic, lift color toward `--text` (e.g. `#cbd5e1`); keep the dashed border as the sole "tentative" cue. |
| U5 | Low | **Readiness/session pills are click-only `<div>`s** — no role/tabindex/keydown, unusable by keyboard or screen reader (the primary daily input). (Steppers are fine — real buttons.) | [js/views/today.js:306](js/views/today.js:306) | Render pills as `<button type="button" aria-pressed>`; the existing click handler keeps working. Add `.pill:focus-visible`. |
| U6 | Low | **Pill groups have no accessible name** — a disassociated `<label>` only. | [js/views/today.js:301](js/views/today.js:301) | Add `role="radiogroup"` + `aria-label`/`aria-labelledby` on `.pill-group`; capitalize the visible key. Folds into U5. |
| U7 | Low | **Calendar day cells are click-only `<div>`s** — month grid not keyboard-reachable; day cell has no accessible date label. | [js/views/calendar.js:49](js/views/calendar.js:49), [js/views/calendar.js:144](js/views/calendar.js:144) | Render cells as `<button>` with an `aria-label` carrying the full date + phase/session. |
| U8 | Low | **Auth-gate dialog** (`role=dialog aria-modal`) never moves/traps focus, has no Escape handling, no `aria-labelledby`. | [index.html:28](index.html:28), [js/app.js:64](js/app.js:64) | On show, `focus()` the first button; add `aria-labelledby` to the `<h2>`; optional Tab trap + `inert` on `#view`. |

### PWA & offline

| ID | Sev | Issue | Location | Fix |
|----|-----|-------|----------|-----|
| **P1** | Med | **Navigation handler caches error/5xx/captive-portal/redirected responses**, overwriting cached `./index.html` (= the PWA `start_url`) → next offline launch serves a broken shell. | [sw.js:45](sw.js:45) | Guard the `cache.put` on `r.ok && r.type==='basic' && !r.redirected`. |
| P2 | Low | **Bare cache-first for static assets** never writes back a cache-miss fetch, so an evicted SHELL asset breaks offline next load; also can't pick up a same-version redeploy. | [sw.js:52](sw.js:52) | Write back successful cache-miss fetches (`if (r.ok) cache.put`). Optional stale-while-revalidate (note the mixed-version tradeoff). |
| P3 | Low | **No SW update prompt;** `skipWaiting()` + `clients.claim()` mean an open long-lived tab keeps running stale in-memory modules until a manual reload. (No data-corruption mechanism — all local imports are static.) | [sw.js:29](sw.js:29), [js/app.js:59](js/app.js:59) | Add `navigator.serviceWorker.addEventListener('controllerchange', () => location.reload())` for a clean one-time swap; or an "Update available" banner. |
| P4 | Low | **Firestore rules have no payload/shape/size constraints** and a recursive `{document=**}` write surface the app never uses (only `state/main`). Owner-scoping is correct. | [firestore.rules:4](firestore.rules:4) | Scope to `match /users/{uid}/state/{docId}` with `docId=='main'` + a `request.resource.data.size()` ceiling. Skip strict schema validation. |
| P5 | Low | **Manifest icons declared `"any maskable"`** on one bitmap — not maskable-safe-zone designed; launchers crop corners (cosmetic only here). `apple-touch-icon` absent from manifest array (iOS uses the `<link>`, no effect). | [manifest.webmanifest:10](manifest.webmanifest:10) | Optional: split into separate `purpose:"any"` and padded `purpose:"maskable"` entries. |
| P6 | Enh | **SW bypasses gstatic**, so the Firebase SDK is never cached → cold offline start runs local-only (handled gracefully). Bypass regex is broad. | [sw.js:42](sw.js:42) | No fix needed (documented intent). If offline auth is ever wanted, add the three versioned SDK URLs to SHELL. |

### Dates & code quality

| ID | Sev | Issue | Location | Fix |
|----|-----|-------|----------|-----|
| Q1 | Med | **Local-ISO / `addDays` / Monday-snap helpers re-implemented in 6+ files** under different names — and `storage.js today()` is the one **UTC** outlier (`toISOString().slice(0,10)`), giving an off-by-one `createdAt` for UTC+offset users (incl. UTC+8). | [js/storage.js:18](js/storage.js:18), [js/views/calendar.js:318](js/views/calendar.js:318), today.js / week.js / plans.js / program.js:476 | Extract `js/dates.js` (local-parse convention) and import everywhere, including fixing `today()`. Add it to the `SHELL` array in sw.js and a test case. |
| Q2 | Low | **`js/views/benchmarks.js` is orphaned dead UI** — registered in the router but not in nav, reachable only by typing `#benchmarks`; superseded by settings.js. | [js/views/benchmarks.js](js/views/benchmarks.js) | Delete the file + its import/route in app.js (fold any still-wanted fields — sportGrade/boulderGrade/dominantStyle — into settings.js first). |
| Q3 | Low | **`setBenchmarks(patch, opts)` silently drops `opts`** → the "Save & archive (post-retest)" path records no history (also `globalBenchmarks` has no `history` array). Only the orphaned benchmarks.js calls it. | [js/storage.js:396](js/storage.js:396) | Drop the misleading unused param: `setBenchmarks(patch){ this.setGlobalBenchmarks(patch); }`. Resolved by Q2's deletion. Do **not** add history to `globalBenchmarks` (contradicts the v5 design). |
| Q4 | Low | **`resolveEffective` accepts an `isDeload` arg it ignores** (ADR-0003); the entire returned `reason[]` array is never read by any view. | [js/loads.js:65](js/loads.js:65) | Remove the param + dead block + the `isDeload:` at both today.js call sites. Optionally drop the unused `reason[]` accumulation. |
| Q5 | Low | **Variadic `getDay/setDay/deleteDay/listDays` arity overloading** is a footgun; one genuine silent path: `setDay(planId, date)` with a forgotten patch writes a UUID-keyed day into the active plan. Views mix both contracts. | [js/storage.js:337](js/storage.js:337) | Make `planId` mandatory + add `Storage.activeId()`, or at least validate `date` matches `YYYY-MM-DD` and `patch` is defined. Add a test for the legacy forms. |
| Q6 | Low | **Identical `flash()` toast duplicated verbatim in 3 views** (only diff: 1800 vs 1600 ms). | settings.js:93 / plans.js:24 / benchmarks.js:127 | Extract `flash(msg, ms=1600)` into a shared `js/ui.js`; move the inline style to a `.toast` CSS class. |
| Q7 | Low | **HTML-escape helper duplicated** as `esc` (log.js) and `escHtml` (plans.js), identical bodies. | [js/views/log.js:15](js/views/log.js:15), [js/views/plans.js:32](js/views/plans.js:32) | Consolidate into the same shared `js/ui.js` under one name. |
| Q8 | Low | **"has a logged result" predicate re-implemented twice** (`hasActualResult` in today.js, `hasLoggedDay` in calendar.js), identical field rule. | [js/views/today.js:101](js/views/today.js:101), [js/views/calendar.js:288](js/views/calendar.js:288) | Add `actualHasResult(actual)` to `js/exercise-inputs.js` and reuse. Leave `storage.js:106` migration check alone (deliberately different). |

---

## Implementation plan

Phased by risk/value. Each phase is independently shippable. **Every phase that edits files under `js/` must bump `CACHE` in [sw.js:2](sw.js:2)** (`climb-planner-v14` → next); a new file (e.g. `js/dates.js`, `js/ui.js`) must also be added to the `SHELL` array. No schema bump is needed unless noted (S4's `auto` flag backfills via `migrate()`'s shallow-merge — no `SCHEMA_VERSION` bump). Add a `tests/index.html` case before/after each behavioral change, per repo convention.

### Phase 1 — Stop data loss & wrong prescriptions (critical)
Goal: close every silent-data-loss path and the one common-case correctness bug.

1. **S1 + S2 — `hydrated` gate** in sync.js. The single most important change. Reset on each `_attachDoc`, set after first merge (and before the empty-remote upload), early-return in `_uploadNow`. Also `clearTimeout(saveTimer)` on attach. → manually verify a two-"device" merge can't be clobbered (seed two states, simulate snapshot-after-edit).
2. **S4 — prune only the auto default** (`auto:true` flag on the default plan, cleared on first edit). Prevents losing an offline-configured plan on login.
3. **S3 — `importJson` validation + non-destructive merge** (or `merge:true` upload). Label the import control as destructive if a true replace is kept.
4. **C1 — snap cycle start to Monday** in `effectiveStart`/`computeStartFromComp`. Add a test: for a non-Monday anchor, the Mon/Thu/Sat of one calendar week share `weekIdx`/`phase`/`deload`/`flavor`, and no `weekIdx` exceeds `cycleWeeks`.
5. **P1 — `r.ok` guard** on the SW navigation cache write (one-liner; prevents a poisoned offline shell).

### Phase 2 — High-value, low-risk
6. **S5 — `mergeRemote` test suite** (LWW both directions, remote-only add, empty-plan prune on/off, activePlanId fallback, equal-timestamp keeps local). `export newer()`.
7. **U1 — stepper layout** fix so the 4-input hangboard/pull-up renders cleanly (the headline exercise).
8. **C2 — no back-to-back deloads** + the cross-length test.
9. **U3 + U4 — charts empty state + default-input styling** (small, visible wins).

### Phase 3 — Quick wins (batch into one "polish" commit)
10. **U2** dead warm-up ternary · **Q4** dead `isDeload` param · **C3** readiness-0 suggestion · **C4** negative-range ordering.
11. **P2 + P3 — SW self-heal**: write back cache-miss fetches + `controllerchange` reload.

### Phase 4 — Refactors & hardening (no behavior change; do last)
12. **Q1 — extract `js/dates.js`** and route all callers (incl. the UTC `today()` outlier) through it. Add to `SHELL`. Biggest dedup win; touches many files, so isolate it.
13. **Q2 + Q3 — delete orphaned `benchmarks.js`** + drop the dead `setBenchmarks` arg (fold any wanted fields into settings.js first).
14. **Q6 + Q7 + Q8 — extract `js/ui.js`** (`flash`, `escHtml`) and the `actualHasResult` predicate into `exercise-inputs.js`.
15. **Q5 — tighten the storage arity API** (mandatory `planId` + `Storage.activeId()`, or arg validation).
16. **U5–U8 — accessibility pass** (pills/calendar cells → `<button>`, pill-group names, auth-gate focus). Cheap as `<button>` swaps; low priority for a single-user tool.
17. **P4 + P5 — Firestore rule scoping + maskable icon split.** (**P6** needs no action.)

### Suggested first PR
Phase 1 items **S1/S2, S4, C1, P1** + their tests — the smallest diff that removes the real data-loss and common-case-correctness risks. Hold the larger refactors (Q1, Q2) for separate PRs so review stays focused.
