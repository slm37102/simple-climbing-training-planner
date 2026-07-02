# Climbing Training Research

Evidence-based research backing the planner's training prescriptions, produced by a
multi-agent deep-research process: parallel web search → source extraction →
adversarial fact-check → synthesis.

## Scope

One intermediate climber, **V4–V6 bouldering / ~6c–7a sport**, training **both**
disciplines. Deepest coverage on (1) **periodization & planning** and (2)
**specific exercises & protocols**, with concrete numbers (sets / reps / rest /
%-bodyweight / edge size / durations). Independent of this app's code.

## Contents

| File | What it is |
|------|------------|
| `climbing-training-report.html` | The polished, human-readable report. Open in a browser. The synthesized findings: periodization models, the Base→Build→Peak→Taper macrocycle, weekly templates, and every major protocol (hangboard, max strength, limit bouldering, power-endurance, ARC, injury prevention, assessment). |
| `verified-findings.md` | Every individual claim that passed the adversarial fact-check, grouped by topic, with vote tallies, sources, and supporting quotes. |
| `data/gathered-claims.json` | All ~300 falsifiable claims extracted from sources — the raw research corpus. |
| `data/verification-results.json` | Verdicts from the bulk reasoning-verification pass. |
| `deep-research-report.md` | **Predecessor artifact** — an earlier single-pass web-research survey (from the repo's initial commit, before this verified corpus existed). Kept for reference; its claims did **not** go through the adversarial fact-check — prefer `verified-findings.md` when the two disagree. |

## How it was produced

1. **Gather** — parallel web searches across 5 broad angles + 10 detailed
   sub-topics; ~300 falsifiable claims extracted, each with a direct quote, from
   reputable sources (Lattice Training, Eric Hörst / *Training for Climbing*, the
   Anderson brothers' *Rock Climber's Training Manual*, climbing.com, Dr. Jared
   Vagy, and peer-reviewed sport science).
2. **Verify** — each claim run through a **3-vote adversarial fact-check** (kept
   only if fewer than two of three skeptical reviewers refute it). Two rigor levels:
   - **search-verified** — reviewers ran live web searches to corroborate/refute (highest rigor).
   - **reasoning-verified** — reviewers judged claim-vs-quote fidelity and
     consistency with established climbing-training science, without live search (lighter check).
3. **Synthesize** — confirmed claims folded into the report.

## Status (as of this commit)

- **150 distinct claims verified** (31 search-verified + 119 reasoning-verified); **3 refuted**.
- Verification was **paused mid-way** (weekly usage limit). **~152 gathered claims
  remain un-adjudicated** and are resumable from `data/gathered-claims.json`.

## Relationship to the app

This is **reference material**, not a change to app behavior. It independently
corroborates [`docs/training-philosophy.md`](../training-philosophy.md): the
research confirms the planner's core choices — the Base→Build→Peak→Taper
sequence, deload = volume cut with intensity held, the 20 mm max-hang benchmark,
and the max-hangs / repeaters protocols.

## Disclaimer

Training information only — **not medical advice**. "Verified" means cross-checked
by skeptical AI review, **not ground truth**. All numbers are evidence-based
starting points to adjust, not laws.
