---
name: audit-loop
description: Survey the repo for improvements, file them to the backlog ledger, and close one — then hand off to the main flow.
disable-model-invocation: true
argument-hint: "[--full to force the deep lens fan-out | IB-### to work one item]"
---

# Audit loop

An **on-ramp** in the `/ask-matt` sense: it generates work, files it, and merges onto the main flow. It owns the survey and the ledger. The main flow owns the build — this skill never restates `/implement`, `/tdd` or `/code-review`, it defers to them.

**Two of those skills answer to the keyboard, not to an agent.** `/implement`, `/grill-with-docs`, `/to-spec`, `/to-tickets` and `/improve-codebase-architecture` are all `disable-model-invocation: true`, so a running agent cannot call them — only the reachable four (`/tdd`, `/code-review`, `/test`, `/diagnosing-bugs`) can be invoked mid-pass. Where a stage below names an un-invokable skill, an agent does one of two things: **does the work that skill describes, inline, following its discipline**, or, when the pass is interactive and the user would rather drive, **hands back and names the slash command for them to type**. It never pretends to have invoked one. (This constraint is itself IB-051.)

The ledger is `docs/improvement-backlog.md`. It is what makes the survey **cumulative**: `/improve-codebase-architecture` writes its report to a temp dir by design, so without a durable ledger nothing accrues between passes and nothing gets drained.

## The ratchet

A **ratchet** turns one way. Every pass preserves these five, so the repo can only improve:

1. **Ship only a green suite.** Green → the branch test decides where it goes. Red or un-runnable → commit on the branch, stop, and report which of the two it was. Un-runnable is an ordinary outcome: the suite needs a static server plus Playwright MCP, and the `test` skill documents how often that is not connected on this machine. A diff that touches none of `js/`, `css/`, `sw.js` or `tests/` satisfies this trivially — there is nothing the suite could catch — so a docs-only pass ships without one.
2. **One item per pass.**
3. **Close findings; leave them in place.** IDs are stable and never reused, so a closed row keeps its provenance.
4. **Decisions in `docs/adr/` stand.** To change one, add a dated `## Addendum (YYYY-MM-DD)` section to that ADR — the mechanism ADR-0001 already uses.
5. **Leave the tree clean.** A lens that regenerates an artifact to detect drift restores it before moving on.

## 1 · Survey

Read `docs/improvement-backlog.md` first and say out loud the open count and the **frontier** — the highest-priority open item whose blockers are all closed. An `IB-###` argument names the item instead, skipping the frontier pick.

If that frontier item is a trip-wire item that has already been enqueued in `docs/grill-queue.md`, it isn't this pass's inline work — its next step is a human decision via `/grill-queue`, not a build here. Note it, then take the highest-priority item that is actually buildable inline (no trip-wire) as the pass's item. That is the division of labour: this loop drains the *engineering* backlog; the grill queue drains the *decisions*.

**Running several sessions at once.** Each session works its own designated branch, so commits never clobber — but two passes could still pick the *same* inline item and duplicate it, surfacing as a ledger conflict at merge. The strong cross-session claim (GitHub-issue assignment) lives in the grill queue, where sessions are long and human-driven; inline eng passes are short and cheap, so rather than mint a claim issue every pass (IB-051 removed that noise), coordinate the light way: if the user is dispatching parallel passes, give each a distinct `IB-###` argument. Absent that, a pass takes the frontier inline item and states which `IB-###` it claimed in its opening line, so a second session reading the branch/PR sees it taken and takes the next.

Then run the lenses in [LENSES.md](LENSES.md). **L1–L3** are cheap and run every pass. **L4–L6** fan out to sub-agents and fire only on `--full`, or when fewer than five P1/P2 items remain open — that is what keeps a pass affordable while the queue is deep.

*Done when* every lens has either produced findings or been recorded as clean in the pass-log line, and each new finding has been checked against every existing ID before a new one is minted: `IB-*` here, `KG-*` in `docs/knowledge-gaps.md` (+ its archive), the `S/C/U/P/Q` families in `docs/improvement-audit.md`, and `W*` in `docs/coach-review.md`.

## 2 · File

Append rows following the ledger's own "How to read this doc" rules — pointer not write-up, `eng` when code alone settles it and `training` when a training-content decision comes first, priority by `docs/project-goals.md`'s order (**safety G3 > prescription correctness G1/G2 > convenience > polish**). Per `CLAUDE.md`, implementation effort is not an input to priority.

A `training` row **graduates** to a `KG-*` entry in `docs/knowledge-gaps.md` plus an ADR at the moment a decision is made about it — a KG row carries an adjudicated verdict, so a raw finding is not yet one.

*Done when* every finding has an ID, a kind, a priority and a source pointer.

## 3 · Branch and build

One test settles both how the work runs and how it ships. Read the intended diff against these trip-wires:

1. A changed line in `js/program.js` inside a session builder, a `PRESCRIPTION_PASSES` pass, or a percentage/RPE constant
2. Any changed line in `js/loads.js`, or a threshold in `js/monitoring.js`
3. `js/sync.js`, or `mergeRemote` / `newer()` / `importJson` in `js/storage.js`
4. `SCHEMA_VERSION` bumped, or a `migrate()` step added
5. `firestore.rules`
6. A new ADR is needed, or an existing ADR's Decision is contradicted
7. Ratchet 1 is unsatisfied

**No trip-wire — build it here.** A single-session build in this same window. A human runs `/implement`; an agent, which cannot invoke it, does the implement work directly following that skill's discipline, then invokes the reachable `/code-review` and `/test` to close it out.

**Any trip-wire — it's a multi-session build, and the decision comes first.** A change to prescription math can't be built inline; it needs a human decision, then a spec, then tickets, then a PR. Instead of leaving that as a dead "routed to multi-session" note that never moves, **enqueue it for grilling**:

- Mint its backing **GitHub issue**, labelled `grill-queue`, **unassigned** (unassigned = unclaimed — it's the claim surface, minted here once at enqueue so a later `/grill-queue` claim is just an assign, never a create-race). Body: the one-line *decision to settle*, a pointer to the `IB-*` row + audit source, and the claim protocol (see `docs/grill-queue.md`).
- Add a `Queued` row to `docs/grill-queue.md` linking that issue.
- Record the routing on the `IB-*` backlog row and sharpen the finding in place.

Then tell the user it's queued and they can run **`/grill-queue`** to decide it — that skill runs the interactive `/grilling` + `/domain-modeling` grill (both invocable) and graduates the finding to an ADR + `KG-*` decision. An agent does **not** edit the trip-wired code inline. This grill-queue issue is the *decision* ticket; the *build* ticket (`ready-for-agent`, for `/implement`) is still minted downstream by the build path after the decision is settled — don't mint that one here.

**Seams.** Prefer the one that already exists — a `test(...)` case in `tests/cases/*.js` calling a domain module directly, or a view mounted into a detached div. A new seam needs the user's sign-off before `/implement` starts. Name the case for its governing ID, `[IB-028] REGRESSION: …`, matching the `[ADR-0016]` / `[KG-B13]` idiom already in the suite.

**After the edits, before committing:**
- `node tools/generate-sw.mjs --bump` when anything under `js/` or `css/` changed. CI hard-fails without it.
- `node tools/generate-schedule.mjs` when `js/program.js` changed.

*Done when* the build's `/code-review` and the suite have both run — or ratchet 1 has been invoked and the reason named. (On a trip-wire hand-off nothing was built here, so this reduces to ratchet 1 satisfied trivially by a docs-only diff.)

## 4 · Ship and log

Mint a GitHub issue **only when there is a real handoff to serve** — a trip-wire item going to a separate `/implement`/PR session needs a ticket to carry it and give the closed row provenance, so label it `ready-for-agent`. A no-trip-wire item built and shipped inline in this same window has no downstream consumer for the issue, so **skip it** — the commit that closes the row is its own provenance. (Minting one anyway was noise; that was IB-051.) These findings are self-generated and agent-ready by construction, so `/triage` — which exists for issues that arrive raw — stays out of this flow either way.

```
git checkout -b claude/ib-0NN-<slug>
git add -A && git commit -m "fix: <what changed> (IB-0NN)"
```

Merging `main` deploys to production, which is why ratchet 1 gates it:

```
# no trip-wire, suite green
git checkout main
git merge --no-ff claude/ib-0NN-<slug> -m "Merge IB-0NN: <what changed>"
git push origin main

# any trip-wire
git push -u origin claude/ib-0NN-<slug>
gh pr create --title "IB-0NN: <what changed>" --label ready-for-human
```

*Done when* the row reads `Closed` with its issue and commit, and the pass log has one new dated line naming the lenses run, findings added, what closed, and where it shipped.
