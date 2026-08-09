---
name: grill-queue
description: Work the training-decision queue — grill the next item that /audit-loop routed to the multi-session path, interactively, until it becomes a settled ADR decision ready to build.
disable-model-invocation: true
argument-hint: "[IB-### to grill a specific item | empty to take the frontier]"
---

# Grill queue

The companion to `/audit-loop`. The loop finds and files work; it drains the engineering backlog itself, but every training-content item and every prescription-math trip-wire needs a **human decision** before it can be built. Those collect in `docs/grill-queue.md`. This skill works that queue — one item per session, interactively — turning a raw finding into a settled ADR decision.

Grilling settles the **decision**; it does not ship code. Once decided, the build runs later as its own `/to-spec → /to-tickets` pass.

## Do this

1. **Load the queue.** Read `docs/grill-queue.md`. The frontier is the highest-priority `Queued` row whose **GitHub issue is open with no active `🔒 CLAIM` comment** (`is:issue is:open label:grill-queue`, then read the top candidate's comments) — many sessions run at once, so a row's markdown status can lag; the issue is the source of truth. Say the frontier and the claimable count out loud. An `IB-###` argument names the item instead.

2. **Claim it — on the tracker, before any work.** This is what stops two of your sessions grilling the same item. Every session is the same GitHub user, so the claim is a comment, not an assignee. On the item's issue:
   - Read its comments; if a non-stale `🔒 CLAIM` is already there, it's taken — take the next claimable row.
   - Post a `🔒 CLAIM` comment naming your **Claude session id**, **branch**, and **UTC time**.
   - Re-read the comments: if an **earlier** `🔒 CLAIM` from a different session exists, **yield** (drop a one-line "yielding to <session>" note) and take the next item. That ordering is the lock.
   - A `🔒 CLAIM` stale for hours on a still-open issue is a dead session — reclaim it with a `♻️ RECLAIM` comment.

   Then mark the row `Grilling` in `docs/grill-queue.md` and read the item's full detail: its `IB-*` row in `docs/improvement-backlog.md`, the audit section it points to, and the training docs that bear on it (`docs/training-philosophy.md`, the relevant `docs/adr/`, `docs/knowledge-gaps.md`).

3. **Grill — `/grilling` using `/domain-modeling`.** Invoke `/grilling` (it is model-invocable). Its discipline governs:
   - One question at a time, each with your recommended answer, waiting for the user's answer before the next.
   - Facts you can find in the code or docs, you **look up** — never ask what you can check. Decisions are the user's; put each one to them and wait.
   - **HITL — never answer your own questions.** A grill where the agent supplies the human's side is broken. This is the whole reason the item is here and not built inline.
   - **`/wait-what` means the round didn't land — re-pitch, then *stay* re-pitched.** It is `disable-model-invocation: true`, so it only ever arrives from the keyboard: the user telling you a round was too dense to answer, not asking for more detail. Re-pitch with a little context, in ASD-STE100 Simplified Technical English, using the `CONTEXT.md` ubiquitous language — then hold that register for the rest of the grill. Drifting back to the dense one is what earns the second `/wait-what`. A round the human can't answer is a wasted round, and the answers are the only thing this skill is here to collect.
   - Ground each branch in real evidence, the way `docs/adr/` already does — this is a G3-sensitive athlete, so "uncited convention dressed as behaviour" is not enough.
   - Do not enact anything until the user confirms shared understanding.

4. **Record the decision** — this is where a training finding **graduates**:
   - Write a new **ADR** in `docs/adr/` (via `/domain-modeling`), and add a **`KG-*`** row to `docs/knowledge-gaps.md` with the adjudicated verdict.
   - Post the decision as a **resolution comment** on the GitHub issue and **close** it (`state_reason: completed`) — that releases the claim and takes the item off every session's board.
   - Mark the queue row **Decided**, linking the ADR; add a line to the `## Decided` section.
   - Update the `IB-*` backlog row so it reads as decided and ready for the build path.
   - Graduate any fog the decision sharpened into new `Queued` rows (mint each one's `grill-queue` issue too); drop anything the decision put out of scope.

5. **Stop.** One item per session. The build (`/to-spec → /to-tickets → PR`) is a separate pass — report that the item is `Decided` and ready for it, and stop.

## Boundaries

- **Decisions, not deliverables.** If you feel the pull to just write the code, that is the signal the decision is settled and it's time to hand off to the build path — not to build here.
- **One item per session**, like `/audit-loop` and `/wayfinder`.
- If the queue is empty, say so and point back at `/audit-loop` to surface and file more.
