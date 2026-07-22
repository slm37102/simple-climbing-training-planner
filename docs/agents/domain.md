# Domain Docs

How the engineering skills should consume this repo's domain documentation when exploring the codebase.

## Before exploring, read these

- **`CONTEXT.md`** at the repo root — the glossary (Athlete, Macrocycle, Peak type, Deload week, Retest, Session slot, etc.).
- **`docs/adr/`** — read ADRs that touch the area you're about to work in (e.g. `0002-configurable-cycle-length.md`, `0003-deload-as-volume-cut.md`, `0004-deload-cadence-3-to-1.md`, `0005`/`0006`-hangboard-and-power-endurance, `0007-taper-hold-intensity-peaktype.md`).
- Also read `docs/training-philosophy.md` and `docs/knowledge-gaps.md` (tracked KG-* divergences) per `CLAUDE.md` — don't "fix" a doc/code divergence without checking its gap entry first.

This repo is **single-context** — there is no `CONTEXT-MAP.md`. If any of these files don't exist yet, **proceed silently**; don't flag their absence.

## File structure

```
/
├── CONTEXT.md
├── docs/
│   ├── adr/
│   │   ├── 0001-soften-peak-phase-for-intermediate-athlete.md
│   │   ├── 0002-configurable-cycle-length.md
│   │   └── ...
│   ├── training-philosophy.md
│   ├── knowledge-gaps.md
│   └── project-goals.md
└── js/
```

## Use the glossary's vocabulary

When your output names a domain concept (in an issue title, a refactor proposal, a hypothesis, a test name), use the term as defined in `CONTEXT.md`. Don't drift to synonyms the glossary explicitly avoids.

If the concept you need isn't in the glossary yet, that's a signal — either you're inventing language the project doesn't use (reconsider) or there's a real gap (note it for `/domain-modeling`).

## Flag ADR conflicts

If your output contradicts an existing ADR, surface it explicitly rather than silently overriding:

> _Contradicts ADR-0007 (taper hold-intensity by peak type) — but worth reopening because…_
