# Grill queue

The **decision worklist**. Where `docs/improvement-backlog.md` (the `IB-*` ledger) is the full catalogue of everything the app should get better at, this file is the short, ordered list of items that are blocked on a **training-content decision** — the human-gated work that `/audit-loop` can find and file but structurally cannot build, because a change to prescription math must be decided (and reviewed) before it ships.

It exists because that work was the loop's dead end: `/audit-loop` drains the *engineering* backlog on its own, but every training item and every prescription-math trip-wire routes to the multi-session `/grill-with-docs → /to-spec → /to-tickets` path, and the first step of that path needs a live human. Rather than let those items sit as scattered "routed to multi-session" notes that never move, they collect here and get worked one at a time.

This is a lightweight, markdown-native cousin of the `/wayfinder` map: same philosophy (chart the decisions, resolve them one at a time until the way is clear), without the issue-tracker machinery. If this queue ever outgrows a flat list — real blocking edges, parallel sessions, fog that needs charting — graduate it to an actual `wayfinder:map` and retire this file.

## How to read this doc

- The queue below is **ordered by priority** (safety G3 > correctness G1/G2 > convenience > polish — the same order the backlog uses). The top unblocked row is the **frontier**: the next thing to grill.
- Each row is a **pointer**, not a write-up — the finding's detail lives in its `IB-*` backlog row and the source audit. The queue carries only: the ID, a one-line question, and status.
- This is **not a mirror of the training backlog.** Only items that are *ready to decide* live here. The rest stay in the backlog as the catalogue; `/audit-loop` and the user graduate them in as they rise to the frontier (wayfinder's "fog of war" — don't pre-slice what you can't yet phrase as a sharp question).
- **Status:** Queued / Grilling / Decided / Dropped.

## Coordination across sessions — the claim

Many sessions run at once (all yours), so a **claim** is what stops two of them grilling the same item. The claim lives on the **GitHub issue tracker**, not in this file — a markdown claim written on one session's branch is invisible to another until it merges, whereas an issue's comments are visible to every session instantly.

Every in-flight queue item is backed by a GitHub issue labelled **`grill-queue`**. Since every session is **you** (one GitHub user), an assignee would read the same on all of them, so it's skipped — the claim is simply a **comment**:

- **Claim = a `🔒 CLAIM` comment** naming your **Claude session id**, **branch**, and **UTC time**. An open `grill-queue` issue whose latest claim is an unresolved `🔒 CLAIM` is **taken**; one with no `🔒 CLAIM` (or only a stale one) is **free**.
- **Tiebreak:** right after commenting, re-read the issue; if an *earlier* `🔒 CLAIM` from a different session exists, **yield** and take the next item. Comment order is the lock.
- **Stale claims release.** A `🔒 CLAIM` with no follow-up for a few hours on a still-open issue is a dead session; reclaim it with a `♻️ RECLAIM` comment noting the takeover.

When an item is `Decided`, its issue is **closed** — off the board for everyone.

## How to work this queue — "run a grill section"

Invoke **`/grill-queue`** (or just say "grill the next item"). One item per session. The ritual follows `/grill-with-docs` = `/grilling` + `/domain-modeling`:

1. **Take the top claimable item** — the highest-priority `Queued` row whose issue is **open with no active `🔒 CLAIM`** (or the one the user names). **Claim it** per the section above (post a `🔒 CLAIM` comment; yield if an earlier claim exists). Then mark the row `Grilling`.
2. **Grill interactively — HITL.** One question at a time, each with a recommended answer, waiting for the user's answer before the next. Look **facts** up in the code and the `docs/` (training-philosophy, the ADRs, knowledge-gaps); put **decisions** to the user. The agent **never answers its own questions** — a grill where the agent supplies the human's side is broken. Ground every branch in the evidence the way `docs/adr/` already does.
3. **Produce a decision, not a deliverable.** The output of a grill is a settled call — what to build and why — not the code. Stop when there's shared understanding and nothing left to decide before someone builds it.
4. **Record it** (this is where a training finding **graduates**, per the repo convention):
   - Write the decision as a new **ADR** in `docs/adr/`, and add a **`KG-*`** row to `docs/knowledge-gaps.md` carrying the adjudicated verdict.
   - Mark the queue row **Decided**, linking the ADR.
   - Update the item's `IB-*` backlog row: it's now decided, so it's ready for the **build** path (`/to-spec → /to-tickets → PR`).
5. **Graduate fog.** If the decision makes a previously-vague backlog item phrasable as a sharp question, add it to the queue. If it reveals an item is out of scope, drop it (status `Dropped`, one-line why).

Grilling settles the *decision*; it does not ship code. Once an item is `Decided`, the build still runs as its own multi-session `/to-spec → /to-tickets` pass — but the hard, human-only part is done and captured durably.

## Queue

Ordered; top unblocked row is the frontier.

The **Issue** column is the claim surface — an open issue with no active `🔒 CLAIM` comment is claimable. Priority order; top claimable row is the frontier.

| ID | Decision to settle | P | Issue (claim here) | Status |
|----|--------------------|---|--------------------|--------|
| IB-014 | What injury-history intake should exist, and how should it pre-soften finger load (vs. today's purely reactive moderation)? | P1 | [#60](https://github.com/slm37102/simple-climbing-training-planner/issues/60) | **Decided** → [ADR-0017](adr/0017-finger-tweak-return-state.md) |
| IB-024 | Should the antagonist block gain a vertical/scapular press, and what/where? | P1 | [#61](https://github.com/slm37102/simple-climbing-training-planner/issues/61) | Queued |
| IB-056 | Should taper weeks hold the +2.5% targets-hit progression (like deload/retest now do), or does the taper *want* its near-max touch to creep? | P2 | [#68](https://github.com/slm37102/simple-climbing-training-planner/issues/68) | Queued |
| IB-058 | Should a day with **no readiness check-in** default to Normal (×1.0, matching `computeReadinessMultiplier(null)`) or stay at today's `{3,3,3}` = Lighter (×0.85 + RPE cap)? | P2 | [#70](https://github.com/slm37102/simple-climbing-training-planner/issues/70) | Queued |
| IB-030 | On a deload + Lighter-readiness day, climbing volume is cut ×0.6 then ×0.85 = ×0.51 with no combined floor — is that intended, or should a floor apply? | P3 | [#69](https://github.com/slm37102/simple-climbing-training-planner/issues/69) | Queued |

## Decided

One line per resolved item — the ADR it produced, so the queue stays auditable and resumable.

- **IB-014** ([#60](https://github.com/slm37102/simple-climbing-training-planner/issues/60), 2026-08-03) — reframed during the grill: not a historical injury-trait intake (that branch was **dropped** — ADR-0001 already pre-softens categorically for this exact cohort, and a permanent flag would soften forever for tissue that has adapted) but a **declared, pain-gated finger-tweak return state**. Armed by a one-tap accept on the pain-red banner — which today has *no* teeth — behind a red-flag acknowledgement screen. Lowers finger intensity via a **ramping ceiling** (`min(chain, ceiling)`, applied last so armed can only ever reduce), regresses grip to open-hand, enforces the prose-only `skip on any finger tweak` campus gate, and **leaves volume alone** — deliberately inverting the repo's cut-volume/hold-intensity lever, because the evidence declines to quantify volume for a tweak and grip regression is the one VALIDATED mechanism. → [ADR-0017](adr/0017-finger-tweak-return-state.md), KG-B15. **Partially reverses** the 2026-07-17 KG-A7 doc-only call, argued explicitly in the ADR. Two code facts found during the grill drove the mechanism: a kg multiplier moves *total* load only ~2.6% (so it isn't a softening), and `resolveEffective` never clamps into `range` (so lowering a band alone does nothing once history exists). Left deliberately untouched for their own grills: IB-030 (#69) stacking floor, IB-058 (#70) missing-check-in default. Ready for `/to-spec → /to-tickets`.
- **IB-028** ([#59](https://github.com/slm37102/simple-climbing-training-planner/issues/59), 2026-07-30) — set the existing `holdProgression` flag on deload/retest weeks to suppress the +2.5% step; ±5% thermostat left running (minimal fix). → [ADR-0009 addendum](adr/0009-intra-phase-progression.md), KG-B14. **Built and merged 2026-07-31** — spec [#62](https://github.com/slm37102/simple-climbing-training-planner/issues/62) → [#63](https://github.com/slm37102/simple-climbing-training-planner/issues/63)/[PR #65](https://github.com/slm37102/simple-climbing-training-planner/pull/65) → [#64](https://github.com/slm37102/simple-climbing-training-planner/issues/64)/[PR #66](https://github.com/slm37102/simple-climbing-training-planner/pull/66). Two corrections to the decision came out of the build, both recorded as a second dated ADR-0009 addendum: the "no `js/loads.js` change" line no longer holds (IB-041 made the load-reason trail user-visible, so the hardcoded "pain amber" message had to go), and the retest leg of the rationale is **unreachable** — no retest-week session carries a kg-bearing exercise. Also spawned **IB-056**: taper weeks have the same defect and, unlike retest, it *is* reachable.
