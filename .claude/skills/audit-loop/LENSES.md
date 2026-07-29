# Lenses

Six ways to look at this repo. **L1–L3** are deterministic and cheap — run them every pass. **L4–L6** are open-ended and fan out to sub-agents, so they fire only on `--full` or when fewer than five P1/P2 items remain open.

Every command below runs from the repo root. If `node` reports as missing, the PATH is stale rather than the install broken — the `test` skill documents the workaround.

---

## L1 · Generated-artifact drift

`sw.js` and the tail of `docs/training-plan.md` are generated, so either can silently fall behind the source it derives from.

```
node tools/generate-sw.mjs          # SHELL only, no version bump
node tools/generate-schedule.mjs
git diff --quiet -- sw.js docs/training-plan.md   # exit 0 = in sync, 1 = drift
git checkout -- sw.js docs/training-plan.md       # ratchet 5, always
```

**Use `git diff --quiet`, not `git status`.** The generators write LF and this checkout is CRLF, so `git status` lists both files as modified even when the content is identical — a false positive every time. The `git checkout --` is unconditional for the same reason: the detection run dirties the tree whether or not it found anything.

**A finding looks like:** the SHELL array gained or lost an entry (a `js/` file was added or renamed without regenerating), or the schedule section no longer matches what `js/program.js` produces.

## L2 · Invariant drift

The `domain-invariants` skill (`.claude/skills/domain-invariants/SKILL.md`, "Key invariants" section) and `.github/copilot-instructions.md` both make specific, checkable claims about the code. Either can go stale, and a stale invariant misleads every future agent that reads it.

Walk each claim and grep it against the code. The two files also disagree with each other, which is itself a finding — `copilot-instructions.md` is the one that has drifted (that is IB-048).

**A finding looks like:** a named function whose signature no longer matches, a threshold quoted at the wrong value, a rule stated without its governing ADR's later correction, or a test cited that no longer exists.

## L3 · ADR fidelity and coverage

Two questions per ADR: is its Decision still literally true in the code, and does a regression test pin it?

```
comm -13 \
  <(grep -oh '\[ADR-[0-9]\+\]' tests/cases/*.js | tr -d '[]' | sed 's/ADR-//' | sort -u) \
  <(ls docs/adr/ | sed -E 's/^([0-9]+)-.*/\1/' | sort -u)
```

This prints the ADRs with no `[ADR-00NN]`-tagged case. Read the result rather than trusting it: an ADR's behaviour can be covered by a case named for something else, so an untagged ADR is a prompt to go look, not a confirmed hole. Tagging the case that already covers it is often the whole fix.

**A finding looks like:** an ADR whose Decision the code contradicts (open a dated addendum — ratchet 4), or a decision with no test pinning it.

---

## L4 · G3 and data integrity

The durability lens, and the one that outranks everything else. `docs/project-goals.md` puts safety first and states that **G3 gates G1 and G2**, so a finding here is P1 by default.

Read for: the four volume cuts staying **mutually disjoint by guard** so nothing double-cuts; the readiness gate and finger-density guard doing what their ADRs claim; `js/sync.js` and `Storage.mergeRemote` / `newer()` / `importJson` on the data-loss surface; anything that can raise load on a recovery week.

**A finding looks like:** a prescription path that can stack two reductions or two intensifications, or a write path that can lose an athlete's logged day.

## L5 · Deepening

Delegate this one — `/improve-codebase-architecture` already owns it, along with the `/codebase-design` vocabulary (**module, interface, depth, seam, adapter, leverage, locality**) and the **deletion test**. Feed its candidates into the ledger instead of letting the temp-dir report evaporate.

Standing hot spots: `js/program.js` and `js/views/today.js` each run ~1350 lines and mix responsibilities; domain logic has leaked into the Today view; the build fraction `0.33` is inlined at three sites.

**A finding looks like:** a shallow module whose interface costs about as much as its implementation, or a concept you can only understand by bouncing between files.

## L6 · Coverage holes

Which kinds, views, and invariants no test would catch a regression in. The suite is 228 cases across `tests/cases/01..17-*.js`, and it is thinnest on sync, charts, and the service worker.

**A finding looks like:** an `exercise.kind` whose input visibility is unasserted, a view that never gets mounted, or a migration step with no round-trip case.

---

## Routing a finding onward

Two outcomes do not belong in the ledger as ordinary rows, per `/ask-matt`:

- **A live bug** → `/diagnosing-bugs` first. It refuses to theorise before it has a loop that goes red on the bug, which is the right order for anything that actually misbehaves.
- **"There is no seam here"** → `/improve-codebase-architecture`. The finding is architectural, not behavioural.
