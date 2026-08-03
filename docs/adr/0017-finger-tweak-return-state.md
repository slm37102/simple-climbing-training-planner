# Finger-tweak return: a declared, pain-gated state that pre-softens finger load

**Status:** Decided — 2026-08-03. Decision only; the build runs as its own `/to-spec → /to-tickets` pass. Graduated from **IB-014** (P1, G3) via the grill queue ([#60](https://github.com/slm37102/simple-climbing-training-planner/issues/60)); source finding [`deep-audit.md` §5](../deep-audit.md). Tracked as **KG-B15**.

**Partially reverses the 2026-07-17 KG-A7 decision** that [`return-from-tweak.md`](../return-from-tweak.md) stays a printed reference with no app logic. That reversal is deliberate and is argued below, not drifted into.

## Context

The deep audit's §5 finding was framed as *"no injury-history intake — finger loading is only ever moderated reactively, never pre-softened."* Grilling the finding reframed it, because "injury history" hides two different things:

- **(a) a historical trait** — "I tore an A2 four years ago" — a set-once profile field, and
- **(b) a live episode** — "I tweaked a finger last week and I'm coming back" — a state that arms, shapes prescriptions, and expires.

Only (b) was adopted. The reasoning for dropping (a) is under *Alternatives* below.

### What the app does today, verified against source

| Channel | Trigger | Teeth? |
|---|---|---|
| Pain **amber** (3–5) | athlete types a pain value *that day* | **Yes** — `Loads.holdProgressionFor` returns `'pain-amber'`, suppressing the ADR-0009 +2.5% step |
| Pain **red** (>5, or worse next morning) | same | **No** — advisory text plus a doc link. `Monitoring.signalHasAccept` is true for exactly one actionKey (`early-deload`), so nothing mutates |
| Layoff decay (ADR-0008) | days since *that session type* was last logged | Yes — −3%/wk, floor ×0.85 |
| ADR-0001 / ADR-0016 pre-softening | phase + cohort, hardcoded | Yes — but categorical: identical for every athlete, every week |

So there is a real hole, and it is not the one the audit named. **An athlete who tweaks a finger and keeps training gets nothing**: layoff decay keys on time *off*, and they never stopped. The one signal that fires — pain-red — is the signal with no teeth. Nothing stages a return across the weeks such a return actually takes.

### Two written safety rules the code never honored

The grill surfaced a second instance of the pattern [ADR-0016](0016-weekly-finger-density-guard.md) was written to fix ("a written safety rule the code never honored — false assurance, free to drift"):

1. `js/program.js:403` — the Peak Thursday campus prescription carries, **as prose inside its `prescribed` string**, `gate: 15–20 strict pull-ups + 1-2-3-4-5 ladder without matching · skip on any finger tweak`. Nothing checks it. The app has never had the *data* to.
2. `js/program.js:333` — hangboard exercises carry `grip: 'half-crimp + open-crimp'`, and a grep across `js/` finds **no consumer**. Grip position reaches the athlete only as prose inside `BASE_REPEATERS.sets`.

Arming a tweak state is the first time either becomes enforceable.

### Two load-chain facts that shape the mechanism

- **A multiplier on suggested kg is nearly a no-op in intensity terms.** [ADR-0013](0013-total-load-intensity-convention.md) holds that physiological intensity tracks *total system load*, but suggestions are in *added* kg. At bw 70 / maxHang +20 (totalMax 90), Peak's `[0.92, 0.96]` gives ~14.6 kg added. A ×0.85 on that yields 12.4 kg added — total load 84.6 → 82.4, i.e. **×0.974**. A 15% cut in the displayed number is a 2.6% cut in the quantity that matters. Any softening expressed as a kg multiplier is therefore mostly theatre.
- **Lowering a band alone changes nothing once the athlete has history.** `Loads.resolveEffective` seeds from `previousActualKg × decay × adj` and only falls back to the band midpoint when there is *no* previous actual. There is **no clamp of the final kg into `range`** — only `clampToBenchmark` for negative benchmarks. The band is advisory for an established athlete.

Together these mean the softening must be a **clamp expressed as a total-load percentage**, or it will not be a softening at all.

## Decision

**Add a declared, pain-gated `finger-tweak return` state that lowers finger-loading intensity via a ramping ceiling, regresses grip, and enforces the campus gate — while leaving volume alone.**

### 1. Arming — one-tap accept, plus a manual control, behind a red-flag screen

A second `actionKey` (`start-tweak-return`) joins `Monitoring.signalHasAccept` / `acceptSettingsPatch`, so the **pain-red banner finally offers an action that does something**. A manual start/stop also exists, for a tweak that was never logged as a pain value.

Arming is gated on a **red-flag acknowledgement** drawn from [`return-from-tweak.md`](../return-from-tweak.md) §4 (audible pop, swelling beyond mild, bruising, visible bowstringing, pain at rest / loss of force, sharp pain beyond 1–2 weeks). One confirmation that none apply; if any do, the flow **refuses to arm** and hands off to "stop loading and get evaluated."

This gate is not decoration. Until now the app *described* a tweak and the athlete acted. Once it reshapes prescriptions around an injury, an athlete with a torn A2 tapping "Start tweak-return" would receive a structured *loading* protocol from a tool that states it is not medical advice. §4 is exactly where the tweak zone hands off to the diagnosed-injury literature, and the app must draw that line at the one moment it matters.

### 2. Levers — grip and intensity, **not** volume

This **inverts the house lever, on purpose.** ADR-0003 (deload), ADR-0007 (taper) and ADR-0016 (density guard) all cut volume and hold intensity. `return-from-tweak.md` §2 says the opposite for a tweak, explicitly:

> No source quantifies how much to cut *volume* for a tweak (this is genuinely silent in the evidence) — the deload playbook's "cut volume, hold intensity" doesn't transfer here. For a tweak, treat grip position and intensity as the levers you cut first, and reduce volume by feel rather than by a specific number.

And of that entire document, **grip regression is the one VALIDATED mechanism** — an open-hand grip keeps flexor-tendon force vectors near-parallel to the bone so A2 carries little load, while a full crimp turns A2 into a fulcrum. The stages, the pain cutoffs and the reload ramp are all CONVENTION or EXTRAPOLATION.

So while armed:

- **Grip → open-hand**, surfacing the dead `grip` field (a render path must be built; the value alone reaches nobody).
- **Intensity → the tweak ceiling** (§3).
- **Volume → untouched.** `DELOAD_VOLUME_MULTIPLIER` is deliberately *not* reused. Inventing a volume number the evidence declines to give is the KG-C7 anti-pattern this repo has spent real effort disclosing away from.

### 3. Mechanism — a ramping ceiling, applied last

```
kg = min(normal chain result, tweakCeiling)
```

applied at the end of `resolveEffective`, beside `clampToBenchmark`.

- **Starts** at `BASE_MAX_INTRO`'s band top — `0.85` of total load — **regardless of phase**. Reuses a band the app already ships rather than inventing one, and reasons in the units ADR-0013 says matter. At the worked example this is ~14.6 kg added → 2–6.5 kg.
- **Clamps.** This is the load-bearing half: without it the prev-actual seed ignores the lowered band entirely.
- **Ramps +1 percentage point of total load per week** while the pain gate is clear.
- **Disarms** when the ceiling rejoins the phase band — ~7 weeks to Build's `0.92`, ~11 to Peak's `0.96`. A manual off also exists.

Applying it **last, as a ceiling**, is what makes the composition safe: armed can only ever *reduce*. Readiness, layoff decay and the deload/taper/density passes all continue to operate underneath and can take the load lower still, but nothing can amplify a reduction into a stacked one. No combined-floor question arises, which leaves **IB-030** ([#69](https://github.com/slm37102/simple-climbing-training-planner/issues/69)) free to decide the general stacking-floor question on its own terms.

The ramp unit was grilled specifically, because "2.5%" is ambiguous here and the readings differ by an order of magnitude:

| Ramp rule | Week 0 | Week 1 | Added-kg change |
|---|---|---|---|
| ceiling ×1.025 of total load | 0.85 → 6.5 kg added | 0.871 → 8.4 kg | **+29%/wk** — far outside the doc's 2–5% |
| added kg ×1.025 | 6.5 kg | 6.66 kg | +2.5%/wk, but at 2 kg added it is +50 g/wk — **stalls** |
| **ceiling +1 pp of total load** | 0.85 → 6.5 kg | 0.86 → 7.4 kg | +14%/wk, **monotone at any base** |

The third is adopted: it never stalls near zero added kg, and it produces a plausible rehab timeline. It costs one new constant.

**The ramp is pain-gated, not calendrical**, per §3 of the guide: *"There is no validated 'safe to hang again' number — go by the pain gate clearing at each stage, not a calendar countdown."* The gate is the **existing** amber-pain hold in `holdProgressionFor`; no second progression engine is built.

### 4. Blast radius

- **Hangboard** — ceiling + open-hand grip.
- **Campus — actually suppressed while armed**, honoring the `program.js:403` prose gate for the first time.
- **limit-boulder / boulder / route** — an advisory session note only. Volume there stays "by feel," which is both what the evidence supports and what the athlete controls anyway; saying nothing would be less honest, since those sessions are genuinely unchanged.

Registered as a pass (`tweak-return-guard`) in `PRESCRIPTION_PASSES` per the ADR-0016 convention, ordered **after `finger-density-guard`**. Ordering matters: suppressing campus can drop a week's near-max-day count below `MAX_NEAR_MAX_DAYS_PER_WEEK`, which would **un-fire** the density guard and hand Saturday back its full volume — a volume *increase* caused by being injured. Running last makes that impossible. The armed state cuts no volume, so the pipeline's "exactly one volume-cut pass fires per session" contract is preserved.

### 5. Missing data never argues for more load

`painCheckInSignal(null)` returns `null`, which reads identically to green. While armed, that is not good enough: the ceiling steps up **only** off a logged, clear check-in, and the Today card states why ("log your pain to progress the return"). Deliberately scoped to the armed state, so **IB-058** ([#70](https://github.com/slm37102/simple-climbing-training-planner/issues/70)) keeps its general "what does a missing check-in mean?" question intact.

### 6. State

`globalBenchmarks.fingerTweak`, absent = disarmed:

```js
fingerTweak: { armedAt, ceilingPct, lastRampIso, redFlagsAckAt }
```

Athlete-scoped, not plan-scoped. This is a safety choice, not a tidiness one: **a plan-scoped state would silently vanish the moment the athlete starts a new cycle mid-tweak**, restoring full finger load to a still-sore finger with no notification. Starting a new cycle is a normal thing to do.

`globalBenchmarks` is the athlete profile in practice — it already carries non-measurement traits (`dominantStyle`, `dominantAngle`) alongside `history[]` — it merges LWW in `mergeRemote`, and `setGlobalBenchmarks` is the existing writer. Read defensively so **no migration bump is required**. (`globalSettings` was the semantically cleanest home but is **never merged in `mergeRemote`** and has no `updatedAt`, so state there would upload and silently never sync back.)

### 7. Vocabulary

*finger-tweak return* (the state) · *tweak ceiling* (the clamp) · `tweak-return-guard` (the pass) · `start-tweak-return` (the actionKey) · `tweakNote` (the note field, joining `NOTE_FIELDS`).

### 8. Evidence posture

Every new number — the `0.85` intro-band floor, the +1 pp/wk ramp — is an **app convention, unvalidated (KG-C7 posture)**, and must be labelled so in code and disclosed in the UI. What is evidence-backed is the *direction* (soften on a tweak) and the *grip mechanism* (VALIDATED). The pain-gate boundaries remain the Silbernagel EXTRAPOLATION they already are.

## Why reversing the doc-only decision is right

KG-A7's return-from-tweak half closed on 2026-07-17 as a printed reference, explicitly: *"every numeric constant below is practitioner convention or a cross-tissue extrapolation… Nothing in this repo enforces, checks, or gates on any of it."* That was correct **for the deliverable it was scoping** — a full three-stage rehab ladder with per-stage protocols, encoded as app logic, would bake a pile of CONVENTION into behaviour.

This decision does not do that. It app-ifies the **narrow, validated slice**:

- grip regression (VALIDATED mechanism, not a convention),
- a ceiling that can only *reduce* load,
- gated on a signal the app already computes and already acts on (amber pain),
- ramped by a rule that is disclosed as convention, in the same breath as every other constant in the chain.

The three-stage ladder, the eccentric protocol, the per-stage rep schemes and the red-flag clinical detail **all stay in the doc**. What moves into code is the thing a printed reference structurally cannot do: notice that the athlete is mid-return *every time a load is suggested*, on every device, for weeks.

## Alternatives considered

- **(a) Historical injury-trait intake, as the audit wrote it — a set-once onboarding field lowering the initial band for the first block.** Rejected. [ADR-0001](0001-soften-peak-phase-for-intermediate-athlete.md) already pre-softens *categorically* for precisely this athlete's cohort (Sjöman et al. 2023: <6 yr experience at 7a+ with regular fingerboard training, p=0.03), so the highest-value pre-softening is shipped and unconditional. A permanent history flag would also keep softening for tissue that has since adapted, and the audit itself rated it latent-not-active for the single known athlete. Reopens if the app is ever pointed at a second person; the current-ability half is separately catalogued as **IB-013**.
- **A ×0.85 kg multiplier** (reusing `LAYOFF_FLOOR` / readiness-Lighter's magnitude, no new constant). Rejected on the arithmetic above: it moves total load ~2.6%. A softening that mostly isn't one is worse than none, because it reads as protection.
- **Cutting volume too**, for consistency with the other softening passes. Rejected: the evidence explicitly declines to quantify it, and it risks double-cutting against deload/taper/density.
- **Skipping finger loading entirely while armed** (what the pain-red banner text currently suggests). Rejected: KG-A7's own framing is that a tweak needs *"structured de-escalation, not binary rest,"* and detraining has its own cost.
- **Encoding the doc's full three-stage ladder** with athlete-advanced stages. Rejected for this pass: the stages are labelled CONVENTION, and it needs alternate protocols plus a stage-advance UI for a gain the ceiling already delivers. It remains available later if the ceiling proves too blunt.
- **A fixed-length window that auto-expires** (the `earlyVolumeCuts` idiom). Rejected: it is precisely the calendar countdown §3 warns against.
- **Auto-arming on pain-red without consent.** Rejected: breaks the advisory + one-tap-accept posture of ADR-0008/0014, and cannot be declined. The consent step is also what makes the red-flag screen possible.
- **Plan-scoped state** in `plan.settings`, mirroring `earlyVolumeCuts` exactly and costing no migration. Rejected for the silent-disarm-on-new-cycle failure above.

## Consequences

- **Pain-red gains teeth for the first time.** The most severe signal the app computes stops being text-only.
- **Two prose-only safety rules become enforceable** — the campus tweak gate and grip position — closing the ADR-0016 false-assurance pattern in two more places.
- **The `grip` field gets a consumer**, which means building a render path. A field authored and never read is the same drift as KG-A10's uneditable style fields; this fixes it as a side effect.
- **A new note field** (`tweakNote`) joins `NOTE_FIELDS`; views render it through the existing `session.notes[]` array.
- **The athlete can under-load themselves** by arming and forgetting, since silence stalls the ramp rather than releasing it. That is the intended direction under G3-gates-everything, and the Today card's standing prompt is the mitigation.
- **`return-from-tweak.md` needs a header amendment** noting that its §1 pain gate and §3 reload principle now have a code consumer, so the doc's "nothing in this repo enforces any of it" line does not become the next piece of drift.
- **No migration.** `globalBenchmarks.fingerTweak` is read defensively; absent means disarmed.

## Sources

- [`return-from-tweak.md`](../return-from-tweak.md) — §1 pain gate (Silbernagel, EXTRAPOLATION), §2 grip mechanism (**VALIDATED**) and ladder (CONVENTION), §3 reload ramp (CONVENTION), §4 red flags. Evidence mapping: [`research/return-from-tweak-evidence.md`](../research/return-from-tweak-evidence.md).
- Sjöman AE et al. *Wilderness Environ Med.* 2023;34(4):435–441. PMID 37550103 — the cohort ADR-0001 softens for.
- Vigouroux & Quaine 2006; Schweizer 2008 — crimp/A2 loading mechanism (consensus).
- [ADR-0013](0013-total-load-intensity-convention.md) (total-load convention), [ADR-0016](0016-weekly-finger-density-guard.md) (registered-pass convention, unenforced-rule pattern), [ADR-0014](0014-monitoring-model.md) (signal + one-tap-accept lifecycle), [ADR-0009](0009-intra-phase-progression.md) (progression hold), [ADR-0008](0008-missed-session-replanning.md) (layoff decay, advisory-banner idiom).
- Grill record: [#60](https://github.com/slm37102/simple-climbing-training-planner/issues/60).
