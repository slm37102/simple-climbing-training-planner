---
name: audit-loop
description: Survey the repo for improvements, file them to the backlog ledger, and close one — then hand off to the main flow.
disable-model-invocation: true
argument-hint: "[--full to force the deep lens fan-out | IB-### to work one item]"
---

# Audit loop

An **on-ramp** in the `/ask-matt` sense: it generates work, files it, and merges onto the main flow. It owns the survey and the ledger. The main flow owns the build — this skill never restates `/implement`, `/tdd` or `/code-review`, it calls them.

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

**No trip-wire — build it here.** Run `/implement` in this same window. This is a single-session build.

**Any trip-wire — hand it to the multi-session path.** `/grill-with-docs` to sharpen it, then `/to-spec`, then `/to-tickets`; report the tickets and stop. Each is worked later in a fresh context and ships as a PR. This is `/ask-matt` main-flow step 3 answering *yes*: a change to the training math is a multi-session build, and the same answer sends it to review rather than to `main`.

**Seams.** Prefer the one that already exists — a `test(...)` case in `tests/cases/*.js` calling a domain module directly, or a view mounted into a detached div. A new seam needs the user's sign-off before `/implement` starts. Name the case for its governing ID, `[IB-028] REGRESSION: …`, matching the `[ADR-0016]` / `[KG-B13]` idiom already in the suite.

**After the edits, before committing:**
- `node tools/generate-sw.mjs --bump` when anything under `js/` or `css/` changed. CI hard-fails without it.
- `node tools/generate-schedule.mjs` when `js/program.js` changed.

*Done when* `/implement` has run `/code-review` and the suite has been run — or ratchet 1 has been invoked and the reason named.

## 4 · Ship and log

Mint a GitHub issue for the item being worked, labelled `ready-for-agent`, so `/implement` has a ticket and the closed row has provenance. These findings are self-generated and agent-ready by construction, so `/triage` — which exists for issues that arrive raw — stays out of this flow.

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
