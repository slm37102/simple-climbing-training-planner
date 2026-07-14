# Spec: expanded technique-drill library (Tuesday picker + Thu/Sat warm-up)

**Status:** Spec locked 2026-07-14 via wayfinder [map #14](https://github.com/slm37102/simple-climbing-training-planner/issues/14), tickets [#15](https://github.com/slm37102/simple-climbing-training-planner/issues/15) (research) → [#16](https://github.com/slm37102/simple-climbing-training-planner/issues/16) (drill list) → [#17](https://github.com/slm37102/simple-climbing-training-planner/issues/17) (schema/data model) → [#18](https://github.com/slm37102/simple-climbing-training-planner/issues/18) (UI) → [#19](https://github.com/slm37102/simple-climbing-training-planner/issues/19) (this ticket). **Not yet implemented** — hand off for a separate build session, per the map's plan-only Notes.

> **This is a decision/spec, not the change itself.** It defines *what* to build; the `js/` edits are the hand-off.

## Purpose

[KG-A9](../knowledge-gaps.md) closed 2026-07-14 with a deliberately small scope: 4 finger-neutral drills, one Tuesday picker. The athlete asked to revisit that with more variety. This spec grows the catalog to 19 drills across 5 categories and adds a second surface (Thu/Sat warm-up), while holding the same line KG-A9 drew: manual pick only, no progression/rotation engine, no style-bias automation ([KG-A10](../knowledge-gaps.md) stays separate and open).

**Out of scope** (unchanged from the map): style/weakness-biased drill suggestions (KG-A10); drill progression, phase-awareness, rotation, or anti-repeat logic; drill pickers on Mon (hangboard) or Sun (optional open-climb); implementation itself (this spec is the hand-off).

## 1. Catalog module — `js/drills.js`

New file. Exports:

```js
export const DRILL_CATEGORIES = [
  { key: 'footwork',    name: 'Footwork & balance' },
  { key: 'positioning', name: 'Body positioning' },
  { key: 'reading',     name: 'Route-reading & beta' },
  { key: 'pacing',      name: 'Pacing & resting' },
  { key: 'mental',      name: 'Mental & composure' },
];

export const SKILL_DRILLS = [
  { key, name, focus, category, contexts: ['tuesday'] | ['tuesday','warmup'] },
  // ...19 entries
];
```

`program.js`, `warmup.js`, `today.js`, and `log.js` all import from here instead of `program.js`'s current inline `SKILL_DRILLS` (`program.js:482-487`). `program.js` re-exports `SKILL_DRILLS` for back-compat if anything outside this spec's touched files still imports it from there.

### Locked drill list (19 total — full detail and cut rationale in [ticket #16](https://github.com/slm37102/simple-climbing-training-planner/issues/16))

| Category | Drill (`key`) | Contexts |
|---|---|---|
| Footwork & balance | `silent-feet` *(existing)* | tuesday, warmup |
| | `flagging` *(existing)* | tuesday, warmup |
| | `target-practice` | tuesday, warmup |
| | `downclimbing` | tuesday, warmup |
| | `edge-pivoting` | tuesday, warmup |
| Body positioning | `quiet-hands` *(existing)* | tuesday, warmup |
| | `turn-and-reach` | tuesday, warmup |
| | `backstep-ladder` | tuesday only |
| | `straight-arm-traverse` | tuesday, warmup |
| | `open-closed-hips` | tuesday only |
| Route-reading & beta | `ground-up-read` | tuesday, warmup |
| | `first-touch` | tuesday, warmup |
| | `rest-spotting-read` | tuesday, warmup |
| Pacing & resting | `g-tox` | tuesday, warmup |
| | `pace-shifting` | tuesday, warmup |
| | `continuous-breathing` | tuesday, warmup |
| Mental & composure | `falling-practice` *(existing)* | tuesday only |
| | `centering-breath` | tuesday, warmup |
| | `no-take-lap` | tuesday only |

Focus text for each drill is drafted in ticket #16's resolution comment and the (now-deleted) prototype from #18; carry those strings verbatim into `js/drills.js`, with the two required edits: `downclimbing`'s focus keeps its "2+ grades below max, stop before forearms load up" caution; `straight-arm-traverse`'s focus explicitly distinguishes itself from `quiet-hands` (static rests vs. straight arms while moving).

## 2. Warm-up data model — `js/warmup.js`

`Warmup.forSession(session)` gains a third return field:

```js
return { warmup, cooldown, skillDrills };
```

- `skillDrills` is the **filtered drill array** the warm-up picker offers, computed as:
  ```js
  SKILL_DRILLS.filter(d => d.contexts.includes('warmup') && (d.category === 'footwork' || d.category === 'positioning'))
  ```
  — **8 drills**: `silent-feet`, `flagging`, `target-practice`, `downclimbing`, `edge-pivoting`, `quiet-hands`, `turn-and-reach`, `straight-arm-traverse`. (Narrowed from the full warmup-tagged set per [ticket #18](https://github.com/slm37102/simple-climbing-training-planner/issues/18) — the athlete found the full set cluttered for a pre-session pick.)
- `skillDrills` is this array on climbing sessions (`isClimbing` — `sessionId` starts with `thu-`/`sat-`) and `null` everywhere else (Mon/Tue/Wed/Fri/Sun/rest), matching the map's out-of-scope list.
- `warmup`/`cooldown` are unchanged plain-string arrays — the existing checkbox checklist behavior is untouched.

## 3. Storage

- New optional day field: **`dayLog.warmupDrill: '<key>'`** — a top-level field alongside `warmup`/`cooldown`, set when the athlete picks a drill during warm-up. Additive → **no `SCHEMA_VERSION` bump, no migration** (same precedent as `settings.peakType`). The pick is recorded only — it does not feed the warm-up `n/m` checkbox count.
- **Stop persisting the drills array onto stored days.** Today, `today.js`'s `getOrInitDay()` copies `ex.drills` onto the stored exercise (`log.js:735-740` reads it back). Going forward, only the picked **key** is stored (`actual.drill`, `dayLog.warmupDrill`); `log.js` resolves display name/focus by looking the key up in `js/drills.js`'s `SKILL_DRILLS`, falling back in this order: legacy stored `drills` array (old days, pre-migration) → catalog lookup by key → raw key string (never crash on an unknown/renamed key).

## 4. Tuesday UI — `js/views/today.js`

- `drillPickerHtml` (today.js:633-642) is rewritten to render a **category-chip filter**: a row of 5 chips (`DRILL_CATEGORIES`, one active at a time) above the pill group; the pill group shows only `SKILL_DRILLS` filtered to the active category. Clicking a chip re-renders the pill group for that category; it does **not** change the selected drill. All 19 drills are reachable, just one category's worth visible at a time. Confirmed in [ticket #18](https://github.com/slm37102/simple-climbing-training-planner/issues/18)'s prototype.
- Selecting a pill behaves exactly as today: sets `actual.drill`, marks the exercise done, updates the focus panel — no change to that interaction.
- **CSS fix required** (surfaced during prototyping): `.pill` (`css/styles.css:113`) uses `flex:1; min-width:42px` with no `white-space` override, which clips/badly-wraps once a category holds 4-5 drills with longer names (e.g. "Backstep / drop-knee ladder"). Add a scoped override for pill groups holding more than ~3 items — verified fix: `flex:0 1 auto; min-width:0; white-space:normal` lets pills size to their own content and wrap onto more rows. Scope this so it doesn't regress any other `.pill-group` usage (check for other callers before a global change).

## 5. Warm-up UI — `js/views/today.js`

- The warm-up `<details>` block (today.js:373-380) renders the drill picker (chip-filtered the same way, restricted to the 2 categories in `skillDrills`) **at the end** of the checklist — after the last existing warm-up line, before the `</details>` close. Confirmed position from ticket #18's prototype (athlete rejected top/middle placements).
- Only rendered when `warmup.skillDrills` is non-null (i.e., Thu/Sat sessions).
- Picking a drill here writes `dayLog.warmupDrill` via the existing `persist()` helper (today.js:744-745 area) — same pattern as the Tuesday pick, but to the new top-level field instead of an exercise's `actual.drill`.

## 6. Log-tab parity — `js/views/log.js`

- `editFormHtml(date, entry, plan)` resolves the day's slot: `Program.resolveDate(date, Program.effectiveStart(plan.settings), Program.cycleWeeksOf(plan.settings), plan.settings?.peakType)`. When the slot is `thu-main` or `sat-main`, render a **`<select>` labeled "Warm-up drill"** — options: `—` (none) + the 8 `skillDrills`-eligible drills — placed next to the existing Feel-stars row, before the session-notes textarea (same tier as status/feel: a day-level field, not an exercise). Not rendered for any other slot.
- Tuesday's existing exercise-level drill `<select>` (log.js:122-134) is unchanged in position/behavior, just now sourced from `js/drills.js`'s fuller catalog and only offering that exercise's own `drills` (i.e. still all 19, since Tuesday's `LIGHT_DAY` skill exercise carries the full list).
- Save handler (log.js:239-278): reads the new select's value into `patch.warmupDrill` (top-level, alongside `sessionNotes`/`status`/`sessionFeel`) — not into the per-exercise `exercises` map, since it isn't tied to an exercise index.

## 7. Service worker

Add `js/drills.js` to `sw.js`'s `SHELL` array; bump `CACHE` (per `CLAUDE.md`'s convention — check the current value at `sw.js:2` before incrementing, don't trust this doc for it).

## 8. Tests (`tests/index.html`)

New/updated regression cases needed:
- `SKILL_DRILLS`/`DRILL_CATEGORIES` shape and count (19 drills, 5 categories, each drill has a valid `category` key).
- `Warmup.forSession` returns `skillDrills` = the 8-drill footwork+positioning subset on `thu-main`/`sat-main` sessions, `null` on all others.
- Storage round-trip: `dayLog.warmupDrill` persists and survives `mergeRemote` without triggering a schema migration.
- `log.js` edit-form gating: warm-up drill select appears only when the resolved slot is `thu-main`/`sat-main`.
- Legacy-day fallback: a day with a persisted `drills` array (pre-this-change) still resolves a display name via `log.js`'s fallback chain.

## 9. Docs

KG-A9 gets an addendum (not a re-open, not a new gap ID — the original verdict boundary held) noting the expanded list and second surface, plus a dated maintenance-log line. See the addendum applied alongside this spec.
