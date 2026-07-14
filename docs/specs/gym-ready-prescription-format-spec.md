# Spec: gym-ready concrete prescriptions for climbing-kind exercises

**Status:** Implemented 2026-07-10 in `js/program.js` / `js/exercise-inputs.js` / `js/views/today.js` / `css/styles.css`, with `[Gym-ready]` regression tests in `tests/index.html`. Produced by wayfinder [map #8](https://github.com/slm37102/simple-climbing-training-planner/issues/8), ticket [#12](https://github.com/slm37102/simple-climbing-training-planner/issues/12). Format mock (throwaway, for reference): the prototype published from ticket #12.

> **This is a decision/spec, not the change itself.** It defines *what* to build; the `js/` edits are the hand-off. It folds in the three prescription corrections already decided in [ADR-0006 addendum + KG-B7/B8/B9](../knowledge-gaps.md).

## Purpose

Today the climbing-kind exercises (`boulder`, `route`, `circuit`, `arc`, `open-climb`, `limit-boulder`, `campus`) carry only a free-text `prescribed` string — vague ranges ("6–10 problems"), no single target to aim for, and on deload weeks a generic "drop ~40% volume" suffix with no actual number. This spec gives each a **concrete target + glanceable how-to**, extending the rigor hangboard/pullup already have (they resolve to a concrete kg + `grip` + `edge`). North star: *open the app at the gym and know exactly what to do without thinking about the plan.*

**Out of scope** (unchanged from the map): `antagonist-block` S&C accessories; the `test`/retest kind; hangboard/pullup (already concrete). Periodization structure is validated, not redesigned.

## 1. Data model — the `prescribedTarget` field

Add one structured field to every climbing-kind exercise object in `js/program.js`, mirroring how hangboard carries `prescribedSets`/`prescribedReps`:

```js
prescribedTarget: { value: Number, unit: String }   // e.g. { value: 4, unit: 'problems' }
```

- `value` is the **single volume number** the athlete aims for (see §3 for which number, per kind).
- `unit` is a short plural noun: `'problems'`, `'sequences'`, `'routes'`, `'sets'`, `'attempts'`, `'ladders'`, `'min'`.
- Duration kinds that keep a set structure (ARC) use `unit: 'min'` with `value` = minutes-per-set, plus an existing structural note ("2 ×") carried in text — see §3.
- The secondary numbers (rest, attempts-per-problem, grade-below-max, "stop when power drops") stay in the free-text `prescribed` string, which becomes the **secondary line** (§2).

Rationale (Q2, confirmed): a machine-readable target is the single thing that makes the crisp headline, the deload scaling, and the stepper pre-fill all work; parsing a number out of prose is the brittle regex the codebase already forbids for `actual` strings.

## 2. Display format (Today tab)

Three-part card, **collapsed by default** (Q1, confirmed):

- **Closed accordion sub-line** — one crisp string, matching the hangboard idiom (`2×5 · 62 kg suggested · RPE 8–9`):
  `4 problems · 1 grade below max · RPE 8–9`
  (target · one key qualifier · RPE — never the truncated 46-char prose it shows today.)
- **Expanded** adds:
  - a **target callout** (the app's `.callout` idiom — big accent number): `Today's target → 4 problems`;
  - a **How** line (execution cues, glanceable — §4);
  - the **secondary line** (muted): the leftover numbers (`1 grade below max · full rest between`);
  - the **steppers**: a single count input pre-filled from `prescribedTarget.value` (labelled by `unit`) + the RPE stepper. This replaces the current `sets`+`reps` pair for climbing-kind exercises (see §5).

Mirror in `js/views/log.js`'s edit form for parity.

## 3. Per-kind volume-axis + target table

**Principle (Q3, confirmed):** headline the **outermost count of distinct hard efforts** (problems / sequences / routes / sets / minutes). Inner sub-counts (attempts-per-problem, moves-per-sequence, boulders-per-set) are fixed structure — they live in the secondary line and do **not** scale on deload. The three genuinely-ambiguous kinds are pinned explicitly (chosen 2026-07-10):

| Exercise (kind · phase/slot) | `prescribedTarget` | Unit | Secondary (stays text) | RPE |
|---|---|---|---|---|
| boulder — projecting (Thu base) | 75 | min | 4×4-style on submaximal problems | 7.5–9 |
| limit-boulder — build (Thu build) | **4** | **problems** | 3–5 attempts each · ~4 min rest *(pinned: axis = problems; the muddled "2–3 sets" is cleaned up at impl)* | 8.5–9.5 |
| limit-boulder — peak (Thu peak) | 2 | sequences | 3–5 moves · 4–8 attempts each · 3–5 min rest · stop when power drops | 9–9.5 |
| campus — peak (Thu peak) | 2 | sets | 2–3 attempts/set · 3–5 min rest · gate: 15–20 pull-ups + 1-2-3-4-5 ladder · skip on tweak | 8.5–9 |
| boulder — flash-grade (Thu taper) | 8 | problems | below max · long rest | 7–8.5 |
| circuit — boulder triples 4×4 (Sat base/build) | 4 | sets | 4 boulders/set back-to-back · **2–3 grades below max** (KG-B7) · ~4 min rest | 8.5–9.5 |
| open-climb — technique (Sat base/build, optional) | 40 | min | mileage on submax problems | 6–7.5 |
| limit-boulder — project (Sat peak) | 2 | problems | max 5 quality attempts each · 5+ min rest · stop when power drops | 9–9.5 |
| boulder — flash/onsight (Sat peak) | 4 | problems | 1 grade below max | 8–9 |
| boulder — fun submaximal (Sat taper) | 50 | min | 2–3 grades below max · no projecting | 6–7.5 |
| route — pyramid (Thu base) | 4-3-2-1 (10) | routes | 1 grade below redpoint · pyramid shape · **RPE capped 7–8** (KG-B9) | 7–8 |
| circuit — 60/60 threshold (Thu build) | 20 | min | 60s on / 60s off · never above the deep pump | 7–8.5 |
| circuit — 30/30 lactic (Thu peak) | 2 | sets | 30s all-out / 30s × 6 = 1 set · density rest · deep pump expected | 9.5–10 |
| route — project/redpoint (Thu taper) | 2 | goes | quality goes on a project | 9–9.5 |
| arc — base (Sat base) | 30 | min | **2 ×** 30 min · just below pump · OR 90 min easy laps *(«60–70% effort» dropped — KG-B8)* | 4–6 |
| circuit — 4×4 (Sat build) | 3 | sets | 4 routes/links back-to-back · at 50–60% redpoint · density rest | 8.5–9.5 |
| route — redpoint (Sat peak) | 3 | attempts | quality redpoint goes · 20+ min rest between | 9–9.5 |
| route — mileage (Sat taper/other) | 8 | routes | 1–2 grades below redpoint · walking rest | 7–8.5 |
| campus — warmup (Thu build, boulder-focus) | 3 | ladders | × 5 min rest · submaximal priming | 7–8 |
| open-climb — easy (Sun optional) | 60 | min | mileage well below max | 4–6 |

Target `value`s are a single working number picked from each current range (roughly the midpoint, rounded to a sensible unit); the athlete adjusts from there. The corrected/dropped numbers from KG-B7/B8/B9 are already reflected above.

## 4. How-to text — hybrid authoring (Q4, confirmed)

- A **per-`kind` default how-to template** provides the execution cues shared by every session of that kind (e.g. all `limit-boulder`: *"3–5 hard moves. One all-out go per attempt, rest fully between. Stop when power drops."*). Natural home: alongside `js/exercise-inputs.js` (already the per-kind source of truth for inputs) — add a `howto(kind)` map, or a sibling module.
- An **optional per-exercise `howto` override string** on the exercise object handles phase-specific nuance (taper "stay fresh, stop early"; ARC "just below pump, never a deep pump").
- Resolution: `exercise.howto ?? howToTemplate[exercise.kind]`.

## 5. Deload / taper scaling (closes the original complaint)

The existing volume-cut machinery (`applyDeloadVolume`, `applyTaperVolume` in `js/program.js`, `DELOAD_VOLUME_MULTIPLIER = 0.6`) gains a step that scales `prescribedTarget.value` and produces a **concrete integer**, replacing the generic "drop ~40% volume" text suffix.

**Rounding rule (confirmed):**
- **Count units** (problems, sequences, routes, sets, attempts, ladders): `Math.max(1, Math.floor(value * 0.6))`. E.g. `4 sets → 2`, `3 problems → 1`, pyramid `4-3-2-1 (10) → 3-2-1 (6)`.
- **Duration unit** (`min`): round to nearest 5: `round((value * 0.6)/5)*5`. E.g. `30 → 20`, `45 → 25`.

**Deload display (Q1 refinement, confirmed):** the deload card keeps the **full exercise detail** — the How line and secondary line render exactly as a normal week. Only the target scales, shown as a struck-through original + new value (`4 sets → 2 sets`) with a small deload banner ("volume cut ~40%, intensity held — same exercise, fewer sets"). The deload framing must **not** replace the exercise instructions. Intensity (RPE / any kg) is unchanged — consistent with ADR-0003/0007.

Pyramid special case: the pyramid shape is the target; deload drops the base tier (`4-3-2-1 → 3-2-1`), which is ~60% of routes — consistent with the count rule.

## 6. Integration points (the hand-off checklist) — all shipped 2026-07-10

- [x] **`js/program.js`** — `prescribedTarget` added to every climbing-kind exercise per §3; `howto` overrides added where §4 needed them; the three corrections applied (KG-B7 grade → "2–3 below max"; KG-B8 dropped ARC "60–70% effort"; KG-B9 capped base pyramid RPE → 7–8, `energySystem` relabelled "Aerobic capacity"); `applyDeloadVolume`/`applyTaperVolume` extended with a `scaleTarget()` helper per §5.
- [x] **`js/exercise-inputs.js`** — climbing-kind exercises now log a **single count** (matching `prescribedTarget.unit`) + RPE (`NO_SETS_KINDS` generalized to all climbing-kind kinds; `repsLabel` prefers `prescribedTarget.unit`). Added the per-kind `HOWTO_BY_KIND` template map + exported `howto(ex)`.
- [x] **`js/views/today.js`** — `accSub` renders the crisp closed sub-line from `prescribedTarget`; `renderExercise` adds the target callout (reusing `.callout`) + How line + secondary text + the single count stepper (pre-filled from `prescribedTarget.value`).
- **`js/views/log.js`** — parity came for free: it already drives its edit form from the shared `inputVisibility`/`repsLabel` helpers, so the `js/exercise-inputs.js` generalization propagated automatically with no `log.js` edit needed.
- [x] **`sw.js`** — `CACHE` bumped to `v27`. No new file was added, so `SHELL` needed no change.
- [x] **`tests/index.html`** — `[Gym-ready]` test block added: `prescribedTarget` present across all phases/flavors; deload/taper scale count and duration units correctly; the three corrections land; `inputVisibility`/`repsLabel`/`howto` behavior. One pre-existing test asserting the old sets+reps boulder behavior was updated to match the new one. 93/93 passing, verified live in-browser via Playwright (single exercise, deload strikethrough, multi-exercise session, hangboard/pullup regression check).
- [x] **Docs** — KG-B7/B8/B9 closed in `knowledge-gaps.md`; this spec's status updated. `training-philosophy.md`/`CONTEXT.md` were not touched — the existing "Mapped phases" table and glossary didn't reference the old vague-range prescriptions specifically, so nothing there was stale.

## 7. Disclaimer

Training content only — not medical advice. Targets are evidence-based starting points to adjust for the individual athlete, not laws.
