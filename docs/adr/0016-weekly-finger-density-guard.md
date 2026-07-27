# Weekly finger-density guard: cap FULL-VOLUME near-maximal finger days at two per week

**Status:** Implemented — 2026-07-25. Replaces the (unsatisfiable, unenforced) spacing half of [ADR-0006](0006-power-endurance-two-band-model.md)'s guardrail with an enforceable rule. Closes the top finding of the 2026-07-25 deep audit (findings #7 / #25).

## Context

ADR-0006 wrote a guardrail for itself:

> ≥72h between high-intensity power sessions, so the 3-slot athlete's aggregate stays inside injury caps

**Nothing in the code ever checked it, and on this schedule it could not have.** Session slots come from a fixed weekday map (`DOW_TO_SLOT`, `js/program.js`) with no spacing logic anywhere in the repo. On the Mon/Thu/Sat skeleton the gaps are **Mon→Thu 72h, Thu→Sat 48h, Sat→Mon 48h** — so ≥72h between *three* hard days is arithmetically impossible (it needs 9 days in a 7-day week). The rule was structurally unmeetable and silently ignored rather than reconciled.

What the athlete actually got:

- **Peak boulder week** — Mon 7-53 hangs + weighted pull-ups (RPE 9–9.5), Thu limit boulders + campus (9–9.5), Sat project attempts (9–9.5): **three near-maximal finger days at 72/48/48h**, in the two weeks the plan most wants them fresh.
- **Build boulder weeks** — Thu limit bouldering and Sat boulder triples, both topping RPE 9.5, 48h apart.

Two facts bound the severity, and this ADR does not overstate the risk: 48h sits *inside* the widely cited 48–72h tendon-recovery consensus (no two heavy finger days are ever adjacent), and `README.md` already described the app's rule as "48–72h tendon recovery," implicitly conceding 48h. So the defect is primarily **a written safety rule the code never honored** — false assurance, free to drift further — plus a genuine three-hard-finger-days-per-week aggregate in the highest-risk weeks. The athlete is the profile ADR-0001 cites Sjöman et al. 2023 for (<6 yr at 7a+, the group associated with fingerboard injury), and `project-goals.md` states G3 durability gates G1/G2.

## Decision

**Cap the week at two _full-volume_ near-maximal finger/power days; when a third would land, cut Saturday's volume and hold its intensity.**

Stated precisely, because the original defect was a rule the code didn't deliver: **this ADR replaces ADR-0006's literal clause rather than satisfying it.** ≥72h between all three hard days is arithmetically impossible here, and because the guard *holds intensity*, Saturday remains a high-RPE day — the week still has three high-RPE sessions. What is actually enforced, and tested, is that **only two of them (Mon + Thu, 72h apart) carry full template volume**; the third runs volume-reduced.

1. **Saturday is the day that gives.** It is the unique slot whose gaps are 48h on *both* sides (Thu before, next Mon after). Down-shifting Saturday leaves **Mon + Thu — a real 72h apart — as the only full-volume maximal days**, which is the achievable form of what ADR-0006 was reaching for.
2. **Cut volume, hold intensity** — the repo's established lever (ADR-0003 deload, ADR-0007 taper), reusing the same `DELOAD_VOLUME_MULTIPLIER` (0.6) and rounding conventions rather than inventing a new constant (KG-C7 posture). The athlete keeps the max-recruitment / goal-simulation stimulus, which *requires* the high RPE, at a lower cumulative finger load. In Peak this is also textbook peaking: fewer, higher-quality goes beats a softened session.
3. **Detection reads the built sessions, not a hardcoded list of week shapes.** A day counts as near-maximal when any exercise of a finger/power kind (`hangboard`, `limit-boulder`, `campus`, `boulder`, `route`, `circuit`) tops RPE ≥ 9.0. Keyed on data rather than sessionId so it keeps working if a template's RPE or flavor split later changes — the same reasoning as KG-A10's phase/flavor/slot gate.
4. **Implemented as a registered pass** (`finger-density-guard` in `PRESCRIPTION_PASSES`), not an if-block, per the repo convention for post-build session mutation. Its guard is disjoint from the other three volume cuts (deload / taper / forced), preserving the pipeline's "exactly one volume-cut pass fires per session" contract — verified across every cycle length.

### What this changes in practice

| Week | Before | After |
|------|--------|-------|
| Base (all) | 0–1 near-max days | unchanged — guard never fires |
| Build sport weeks | 60/60 threshold, RPE ≤8.5 | unchanged — guard never fires |
| Build boulder weeks | Mon + Thu + Sat all near-max | Sat triples volume-cut, intensity held |
| Peak (both flavors) | 3 near-max days @ 72/48/48h | Sat cut (e.g. 4 → 2 problems), RPE band untouched |
| Taper | already cut by ADR-0007 | unchanged — excluded, no double-cut |
| Deload weeks | already cut by ADR-0003 | unchanged — excluded, no double-cut |

## Alternatives considered

- **Amend ADR-0006 down to "~48h is the achievable floor" and enforce only that.** Honest, and the README already implies it — but it resolves a safety guardrail by weakening it to whatever the code happens to do, and still leaves three near-max finger days per week in Peak. Rejected: the aggregate, not the pairwise gap, is the injury-relevant quantity here.
- **Down-shift Monday's hangboard instead** (the least *specific* stimulus — in Peak you express finger strength rather than build it). Genuinely attractive coaching, and it would preserve Saturday's goal simulation completely. Rejected because it leaves Thu + Sat as the two full-volume maximal days at **48h**; Saturday is the only choice that puts the surviving pair 72h apart.
- **Cap Saturday's RPE (reuse ADR-0015's Lighter levers).** Rejected: capping RPE in Peak destroys the peak. Intensity is the one thing a peaking block must keep.
- **Move the schedule off Mon/Thu/Sat** (e.g. Mon/Thu/Sun for 72h everywhere). Rejected as out of scope — the fixed weekday skeleton is a hard constraint of the athlete's life, not a program variable.

## Consequences

- The athlete loses roughly 40% of the *volume* of one Saturday session in boulder-flavored Build weeks and both Peak weeks — bought for a real reduction in weekly finger-loading density in exactly the weeks the audit flagged. This is the G3-over-G2 trade `project-goals.md` and ADR-0001 already endorse.
- ADR-0006's guardrail is now **enforced rather than aspirational** — but as a *replaced, achievable* rule, not a satisfied one. Saturday is still a high-RPE session; what the code guarantees (and a test asserts across every cycle length) is at most two full-volume near-max days per week, 72h apart.
- `README.md`'s "48–72h" line and ADR-0006's "≥72h" line no longer disagree — both now describe the same two-tier rule (see the note added to ADR-0006).
- A new note field (`densityNote`) joins `NOTE_FIELDS`; views render it through the existing `session.notes[]` array with no view changes needed.
- **Not** a monitoring signal: this is proactive prescription shaping, so it belongs in the program pipeline, not in `js/monitoring.js` (which stays reactive per ADR-0014).

The RPE ≥ 9.0 near-max threshold, the two-day-per-week cap, and the choice to spend the reduction on volume rather than intensity are **app conventions, unvalidated** (KG-C7 posture) — the 48–72h recovery window they operationalize is coaching consensus, but these specific cut points are this app's own operationalization of it.
