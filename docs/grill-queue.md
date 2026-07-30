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

Many sessions run at once, so a **claim** is what stops two of them grilling the same item. The claim lives on the **GitHub issue tracker**, not in this file — a markdown claim written on one session's branch is invisible to another until it merges, whereas an issue's state is visible to every session instantly. This mirrors `/wayfinder`'s "assign the ticket to yourself first, before any work."

Every in-flight queue item is backed by a GitHub issue labelled **`grill-queue`**. The wrinkle here: all sessions authenticate as the **same GitHub user** (`slm37102`), so the assignee alone can't tell two sessions apart. So the claim is two-part:

- **Assignee = the coarse "taken" flag.** Open + unassigned = free. `is:issue is:open label:grill-queue no:assignee` lists what's claimable.
- **A `🔒 CLAIM` comment = the fine-grained claim + tiebreak.** It names your **Claude session id**, your **branch**, and the **UTC time**. If, right after claiming, you find an *earlier* `🔒 CLAIM` from a different session on the same issue, **yield** — unassign, take the next item. That comment ordering is the real lock; the assignee is just the fast visual flag.
- **Stale claims release.** A claim with no follow-up activity for a few hours on a still-open issue is abandoned (a dead session); a new session may reclaim it with a `♻️ RECLAIM` comment noting the takeover.

When an item is `Decided`, its issue is **closed** — off the board for everyone.

## How to work this queue — "run a grill section"

Invoke **`/grill-queue`** (or just say "grill the next item"). One item per session. The ritual follows `/grill-with-docs` = `/grilling` + `/domain-modeling`:

1. **Take the top claimable item** — the highest-priority `Queued` row whose issue is **open and unassigned** (or the one the user names). **Claim it** per the section above (assign self + `🔒 CLAIM` comment; yield if an earlier claim exists). Then mark the row `Grilling`.
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

The **Issue** column is the claim surface — open + unassigned = claimable. Priority order; top claimable row is the frontier.

| ID | Decision to settle | P | Issue (claim here) | Status |
|----|--------------------|---|--------------------|--------|
| IB-028 | Should deload/retest weeks set the existing `holdProgression` flag so the +2.5% targets-hit step is suppressed on a reduced-target week? (An ADR-0009 addendum, or a new ADR.) | P1 | [#59](https://github.com/slm37102/simple-climbing-training-planner/issues/59) | Queued |
| IB-014 | What injury-history intake should exist, and how should it pre-soften finger load (vs. today's purely reactive moderation)? | P1 | [#60](https://github.com/slm37102/simple-climbing-training-planner/issues/60) | Queued |
| IB-024 | Should the antagonist block gain a vertical/scapular press, and what/where? | P1 | [#61](https://github.com/slm37102/simple-climbing-training-planner/issues/61) | Queued |

## Decided

One line per resolved item — the ADR it produced, so the queue stays auditable and resumable. (None yet.)
