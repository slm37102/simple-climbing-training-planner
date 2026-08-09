# Max-hang duration mismatch — is there a 10-second, 20 mm, grade-anchored norm table?

**Date:** 2026-08-09
**Question:** The app's limiter readout (`js/limiter.js`, `FINGER_NORM_ADDED_PCT`) compares a stored
**10-second** weighted hang on a 20 mm edge against a **7-second** Lattice-derived norm table
(**IB-020**, disclosed in `docs/benchmark-norms.md`). The benchmark protocol is fixed — it anchors every
hangboard prescription — so: **can the norm table be swapped for a duration-matched (10 s, 20 mm) one?**
Primary target: Power Company Climbing's strength standards, which `verified-findings.md:722` already
establishes (3-0) *is* a weighted 10-second hang on a 20 mm edge.

---

## Bottom line

**Not adoptable — but for a logistical reason, not an evidential one, and the trip surfaced a finding
that matters more than the original question.** Power Company Climbing (PCC) is confirmed as a genuinely
duration-matched source and its **unit convention is now pinned down** — `Str:Wt ratio = (Body Weight +
Added Weight) ÷ Body Weight`, i.e. **TOTAL load**, directly convertible to the app's ADDED %BW by
`ADDED %BW = (ratio − 1) × 100` — but **the actual cell values could not be obtained**:
`powercompanyclimbing.com` is blocked by this environment's egress proxy (403 on CONNECT), as is every
other external host, so no page could be read verbatim (see [What was blocked](#what-was-blocked)).
No other duration-matched, grade-anchored 10 s / 20 mm table exists from any other source that this
search could find — **a clean negative**. Separately, the sweep found **no peer-reviewed quantification
of the 7 s → 10 s load difference at all**; the only figures in circulation are two mutually
inconsistent, unit-ambiguous numbers from a single secondary site (Low). Under their plausible
readings, the 7 s → 10 s delta spans **≈1 pp to ≈7 pp of bodyweight** — meaning
`docs/benchmark-norms.md`'s current reassurance that the mismatch is "bounded... a few percent of
bodyweight" versus a 6 pp threshold is **not established**, and under one reading the bias is a full
grade step. That is the actionable result. **Recommended action: change nothing in `js/limiter.js`, and
soften the "bounded" claim in `docs/benchmark-norms.md` to "direction known, magnitude unquantified."**

---

## What was blocked

This matters for reading everything below, so it goes first.

**Every external HTTPS host is blocked by this session's egress proxy.** Both channels fail:

- `WebFetch` → `EGRESS_BLOCKED` on **every** domain attempted: `www.powercompanyclimbing.com`,
  `strengthclimbing.com`, `www.athletepath.com`, `pmc.ncbi.nlm.nih.gov`, `latticetraining.com`,
  `www.trainingbeta.com`, `en.wikipedia.org`, `en-eva-lopez.blogspot.com`, `www.mountainproject.com`,
  `www.projectdirectcoaching.com`, `static1.squarespace.com`, `web.archive.org`.
- `curl` through the proxy → `CONNECT tunnel failed, response 403` for all of the above.

Per `/root/.ccr/README.md`, a 403 on CONNECT is an organization egress-policy denial: **do not retry or
route around it**. No mirror, cache, or archive was used to fetch blocked content.

**Consequence for evidence quality:** the only working channel was `WebSearch`, which returns the search
provider's *summary* of pages, not their text. **Nothing in this document was read verbatim from a
primary source in this session.** Statements below are therefore search-summary-derived and are tiered
accordingly — no claim here reaches the repo's **High** or even a clean **Medium**, and the numeric
table values were never surfaced at all. This is exactly the failure mode the brief warned against, so
to be explicit: **no secondary blog's recollection of the PCC table is presented here as the table,
because no such recollection was found either.**

---

## 1. Power Company Climbing — protocol and units confirmed, values not obtained

### What was confirmed (and re-confirmed across independent queries)

Consistent across four separately-worded searches, and consistent with the repo's own already-adjudicated
3-0 claims at `verified-findings.md:721-725`:

| Attribute | Finding | Tier |
|---|---|---|
| **Protocol** | Max hang = **20 mm edge, half crimp, 10 seconds** | **Medium** — 3-0 in-repo (`verified-findings.md:722`), re-corroborated by three independent searches |
| **Unit convention** | `Str:wt ratio = (Body Weight (lb) + Added Weight (lb)) ÷ Body Weight (lb)` — a dimensionless **TOTAL-load** ratio | **Low-Medium** — search-summary only, but surfaced verbatim-looking and identically across three separate queries |
| **Grade columns** | "**max outdoor grade**", listed across the top; the companion heatmaps article scores it as *median self-reported maximum outdoor grade in the previous 12 months* | **Low-Medium** — search-summary; consistent with in-repo 2-1 claim (`verified-findings.md:721`) |
| **Cell semantics** | Each cell is a **range: (mean − 1 SD) to (mean + 1 SD)** for that measurement at that grade; ~68% of that grade's population under normality. Mean = (high + low) ÷ 2; SD = high − mean | **Medium** — 2-1 in-repo (`verified-findings.md:721`), re-corroborated |
| **Table split** | **Four tables: male/female × bouldering/sport** | **Medium** — 2-1 in-repo (`verified-findings.md:724`), re-corroborated |
| **Stated caveat** | Framed as a **diagnostic guide, not a goal** — "a very small piece of a much more complex puzzle"; falling below your project grade's range "maybe" warrants adding hangs ~2×/week, with repeating hard finger-y boulders offered as a more sport-specific alternative | **Medium** — 3-0 and 2-1 in-repo (`verified-findings.md:722-725`) |
| **Not peer-reviewed** | Proprietary client dataset, 600+ **assessments** (not necessarily 600 distinct climbers — repeat submissions possible) | **Medium** — 2-1 in-repo (`verified-findings.md:721`) |

**The unit question is answered, and the answer is good news.** PCC uses the *same* convention family as
Lattice — total system load — so the two tables are directly comparable once converted, and the app's
existing conversion discipline (`docs/benchmark-norms.md`) applies unchanged:

```
PCC Str:Wt ratio  →  TOTAL %BW = ratio × 100
                  →  ADDED %BW = (ratio − 1) × 100
                  →  added kg  = bodyweight_kg × (ratio − 1)
```

The lb in PCC's formula is irrelevant — the ratio is dimensionless, so no kg/lb conversion is needed.
This is the one unambiguous win of the exercise: **had the values been obtainable, they would have
dropped into `FINGER_NORM_ADDED_PCT` with a one-line conversion and no unit risk.**

### What was NOT obtained

**The cell values.** Six differently-phrased searches (including ones naming specific grades and specific
candidate ratio values) returned the same set of PCC URLs and the same methodological summary, never a
number. The search provider stated explicitly, twice, that the values are presented on the page as
tables/heat-map graphics whose contents it could not extract. No third party — forum thread, coaching
blog, review article, or calculator site — was found reproducing them either.

**Tier: cannot be assigned.** There is no finding to tier. This is a **retrieval failure, not a negative
result**: the table almost certainly exists and is almost certainly usable; this session simply could
not see it.

### Two structural notes for whoever does obtain it

1. **Which of the four tables?** The athlete is male and trains **both** disciplines with a ~V7 boulder /
   ~7a–7b lead target. That maps to two different PCC tables (male-boulder and male-sport) which will
   almost certainly disagree, since the grade scales differ and PCC's own companion analysis reports the
   bouldering model as the more convincing of the two. Picking one — or reading the boulder table because
   the app's `boulderGrade` field is the limiter's key — is a **training-content decision**, not a
   transcription detail.
2. **Cells are bands, not points.** PCC publishes mean ± 1 SD. `js/limiter.js` currently stores a single
   point per grade and invents a "meaningfully below" threshold (`GRADE_STEP_ADDED_PCT = 0.06`, flagged
   in-code as "app convention, unvalidated", KG-C7 posture). A PCC swap could **replace that invented
   constant with the source's own SD** — "below the mean − 1 SD band for your target grade" is a
   published band, not an app convention. That is arguably a bigger quality gain than fixing the duration
   mismatch itself, and it is worth noting so the opportunity isn't lost if this is revisited.

---

## 2. Does anything quantify the 7 s vs 10 s difference?

**Peer-reviewed: no. Nothing was found.** The climbing finger-strength literature that this sweep
surfaced (Giles/Fryer critical-force work; Winkler et al. IJSPP 2024 grip-technique validity; the EJAP
2025 study already in the corpus at `verified-findings.md:706-710`) fixes a *single* protocol duration
per study and never compares maximal load across hold durations. The critical-force literature does
characterise a force–time-to-exhaustion hyperbola (Giles et al., mean critical force 425.7 ± 82.8 N ≈
41.0 ± 6.2% MVC), but that describes **intermittent 7:3 work to failure**, not maximum load for a fixed
7 s vs 10 s hold — it cannot be used to derive a 7 s ↔ 10 s conversion. **This is a clean negative and
should be recorded as one.**

**Non-peer-reviewed: two numbers exist, they disagree, and both are unit-ambiguous.** Both trace to the
same secondary site (`strengthclimbing.com`, itself egress-blocked, so neither could be read in context
or checked for its own citation):

- **(a) A duration-scaling ladder expressed as % of MVC-7:** 5 s = 102%, **7 s = 100%**, **10 s = 96%**,
  12 s = 94%, 15 s = 90%. Presented in association with Eva López's MaxHangs/MAW framework, but **not
  verified as López's own published figure** — the blogspot source could not be reached to check.
- **(b) A flat statement:** *"Most climbers can hang about 7% more weight for 7 seconds than for
  10 seconds."*

These are **not reconcilable**. If (a)'s percentages are of TOTAL load, then at a typical 1.4 total-load
ratio a 4% total-load drop is ≈14% of *added* weight — not 7%. If (a)'s percentages are of ADDED weight,
the drop is ≈4% of added — again not 7%. Whichever reading you take, (a) and (b) contradict each other,
and **neither source states which quantity its percentage is a percentage of** — precisely the
total-vs-added trap `docs/benchmark-norms.md` opens with.

**Tier: Low** for both. Single secondary source, unread verbatim, mutually inconsistent, unit-ambiguous,
no sample described. **Neither should be adopted as a conversion factor in code.**

### Why this is the finding that matters

The direction is not in doubt — a maximal 10 s hold sits at lower load than a maximal 7 s hold, so
`maxHang20mm` reads **low** against the Lattice 7 s table and the readout is biased toward "fingers are a
limiter". `js/limiter.js` and `docs/benchmark-norms.md` both already say this. What they *also* say is
that the bias is **bounded** — "the 7s→10s load delta is a few percent of bodyweight" against a 6 pp
threshold. **That bound is not evidenced.** Working the two circulating figures through both unit
readings:

| Scenario | Reading | 7 s → 10 s shift in ADDED %BW | vs. the app's 6 pp `GRADE_STEP_ADDED_PCT` |
|---|---|---|---|
| **A** | (a) 96% of **TOTAL** load | **−5.1 to −6.8 pp** (grows with grade) | **≈ one full grade step — the "bounded" claim fails** |
| **B** | (a) 96% of **ADDED** weight | −1.1 to −2.8 pp | comfortably inside the threshold |
| **C** | (b) 7% more **added** weight at 7 s | −1.8 to −4.6 pp | inside, but over half a step at the top end |
| **D** | (b) 7% more **total** load at 7 s | −8.4 to −11.1 pp | implausibly large; noted only to bracket the space |

**Scenario A is not an outlandish reading** — MVC in hang testing is conventionally the total load on the
fingers (that is what the tissue sees), which is also Lattice's convention. If A is right, the app's
limiter is biased by approximately one full grade for this athlete, i.e. it can flip a *clear* verdict,
not merely a borderline one — contradicting the reassurance currently written into both the code comment
(`js/limiter.js:17-20`) and `docs/benchmark-norms.md:52-56`.

---

## 3. Any other duration-matched (10 s, 20 mm) grade-anchored table?

**No. Clean negative.** Every candidate checked fails on protocol match, on having no grade-anchored
table at all, or on both:

| Source | Protocol | Grade-anchored table? | Verdict |
|---|---|---|---|
| **Lattice Training** | **7 s**, 18–22 mm | Yes (the app's current table) | Duration-mismatched — this is the problem, not the fix |
| **Eva López** | **MVC-7** (7 s) is the reference measure; MAW protocols run 5–15 s | No grade-anchored norm table found | Not a norm source |
| **Beastmaker** | 10 s hangs common in its app protocols (per secondary description) | No published grade-anchored max-hang norm table found | Nothing to adopt |
| **Steve Bechtel / Climb Strong** | Protocols (3-6-9 ladders etc.) | No grade-anchored finger-strength norm table found | Nothing to adopt |
| **Tension Climbing** | Board/hold manufacturer | No norm table found | Nothing to adopt |
| **Hooper's Beta** | — | No norm table surfaced | Nothing to adopt |
| **Emil Abrahamsson** | Low-intensity long-duration hangs | No norm table | Nothing to adopt |
| **Beast Fingers Climbing** | **Load-cell MVC** ("Grippūl", 20 mm lift) — not a weighted hang at all | Has a grade calculator | **Protocol-incompatible**: a load-cell MVC is a different measurement from a max weighted hang; not duration-matched, and not convertible without evidence the repo does not have |
| **Hörst / Training for Climbing** | **5 s**, **10 mm** edge (`verified-findings.md:714`) | Informal ("elite ≈ +1/3 BW", explicitly uncited observation in the source) | Wrong edge, wrong duration, no table |
| **Peer-reviewed literature** | Varies; typically brief MVC on a force plate or 22 mm edge | Group means by ability, not grade-anchored norm bands | No usable table |
| **Climbapedia / wmgclimbing** | Approximations *of Lattice's* 7 s dataset | Yes, but derived from Lattice | Same 7 s mismatch, one step further from source |

**Power Company Climbing remains the only known duration-matched, grade-anchored, publicly-published
option.** That is a meaningful narrowing: the search space is not "which of several tables should we
pick", it is "get the PCC values, or change nothing."

---

## 4. Reconciliation against the app's current table

The intended side-by-side (PCC-10 s vs Lattice-7 s) **cannot be produced** — no PCC values were obtained.
What follows is the **next-best empirical test available**: apply the (Low-confidence, unit-ambiguous)
duration scaling from §2 to the app's own table, to show a human the *shape and size* of the answer a
real 10 s table would give. **These are not norms. Do not put any column of this into
`FINGER_NORM_ADDED_PCT`.**

App's current table (Lattice, 7 s) versus the two credible scenarios, all in **ADDED %BW** (the app's
native unit), with added kg at the athlete's ~70 kg reference:

| Grade | **App now (7 s)** | Scenario A (96% of total) | Δ (A) | Scenario B (96% of added) | Δ (B) | Scenario C (7% more added @7 s) | Δ (C) |
|---|---|---|---|---|---|---|---|
| V4  | **+28%** (+19.6 kg) | +22.9% (+16.0 kg) | −5.1 pp | +26.9% (+18.8 kg) | −1.1 pp | +26.2% (+18.3 kg) | −1.8 pp |
| V5  | **+34%** (+23.8 kg) | +28.6% (+20.0 kg) | −5.4 pp | +32.6% (+22.8 kg) | −1.4 pp | +31.8% (+22.2 kg) | −2.2 pp |
| V6  | **+40%** (+28.0 kg) | +34.4% (+24.1 kg) | −5.6 pp | +38.4% (+26.9 kg) | −1.6 pp | +37.4% (+26.2 kg) | −2.6 pp |
| **V7** | **+46%** (+32.2 kg) | **+40.2%** (+28.1 kg) | **−5.8 pp** | **+44.2%** (+30.9 kg) | **−1.8 pp** | **+43.0%** (+30.1 kg) | **−3.0 pp** |
| V8  | **+52%** (+36.4 kg) | +45.9% (+32.1 kg) | −6.1 pp | +49.9% (+34.9 kg) | −2.1 pp | +48.6% (+34.0 kg) | −3.4 pp |
| V9  | **+58%** (+40.6 kg) | +51.7% (+36.2 kg) | −6.3 pp | +55.7% (+39.0 kg) | −2.3 pp | +54.2% (+37.9 kg) | −3.8 pp |
| V10 | **+64%** (+44.8 kg) | +57.4% (+40.2 kg) | −6.6 pp | +61.4% (+43.0 kg) | −2.6 pp | +59.8% (+41.9 kg) | −4.2 pp |
| V11 | **+70%** (+49.0 kg) | +63.2% (+44.2 kg) | −6.8 pp | +67.2% (+47.0 kg) | −2.8 pp | +65.4% (+45.8 kg) | −4.6 pp |

**Answers to the empirical question posed in the brief:**

- **Direction: yes, unambiguously.** A duration-matched 10 s table sits **systematically LOWER** than the
  Lattice 7 s table at every grade, and the gap **widens with grade** under all scenarios (the app's
  athlete sits in the narrower part of the fan, which mildly helps).
- **Size: unresolved, spanning roughly 1 pp to 7 pp of bodyweight** — i.e. anywhere from "one third of a
  grade step, safely absorbed by the existing threshold" to "one full grade step, capable of flipping a
  clear verdict." **The magnitude cannot be pinned down without either the real PCC values or a sourced,
  unit-explicit duration conversion, and this session obtained neither.**

---

## Confidence summary

Using the key in [`../benchmark-norms.md`](../benchmark-norms.md#confidence-key):

| Finding | Tier | Why |
|---|---|---|
| PCC max hang = 10 s on 20 mm, half crimp | **Medium** | 3-0 adversarially verified in-repo; re-corroborated by independent searches this session |
| PCC unit = TOTAL load ratio, `(BW + added) ÷ BW` | **Low-Medium** | Consistent across three independent search summaries and internally coherent with PCC's own heat-map framing — but **not read verbatim from the source**, so short of Medium |
| PCC cells = mean ± 1 SD at each max-outdoor-grade column; 4 tables (M/F × boulder/sport) | **Medium** | 2-1 in-repo, re-corroborated |
| **PCC cell values** | **— (not obtained)** | Domain egress-blocked; no third-party reproduction found |
| A 7 s → 10 s conversion factor exists in the literature | **Refuted / clean negative** | No peer-reviewed source found; the critical-force literature does not answer this question |
| The circulating 7 s→10 s figures (96% of MVC-7; "7% more weight") | **Low** | Single secondary site, unread verbatim, mutually inconsistent, unit-ambiguous |
| No other duration-matched grade-anchored table exists | **Low-Medium** (negative result) | Broad search over ten named candidate sources found none; absence-of-evidence caveats apply, but the search was wide |
| The mismatch's *direction* (10 s reads low vs the 7 s table) | **Medium** | Follows from basic muscle physiology and is agreed by every source consulted, including the ones that disagree on magnitude |
| The mismatch's *magnitude* is "bounded / a few pp" (the repo's current claim) | **Not established** | Scenario A puts it at a full grade step; the claim rests on an unstated unit assumption |

---

## Recommendation

1. **Do not swap `FINGER_NORM_ADDED_PCT`.** The one viable replacement table's values are unavailable, and
   nothing else on the market is duration-matched. The brief's explicit fallback — change nothing —
   is the correct outcome today. **IB-020 stays open.**
2. **Do not add a 7 s→10 s conversion constant.** The only candidate factors are Low-tier, mutually
   contradictory, and unit-ambiguous; hard-coding one would replace a *disclosed* error with a
   *hidden* one, which is the opposite of the KG-C7 honest-labelling posture the limiter already follows.
3. **Soften the "bounded" claim** in `docs/benchmark-norms.md:52-56` and the matching comment at
   `js/limiter.js:17-20`, from "the 7s→10s delta is a few percent of bodyweight" (which cites nothing) to
   "direction known, magnitude unquantified — plausibly up to a full grade step." *Not done in this pass —
   this document was scoped read-only outside `docs/research/`.*
4. **What would unblock this in one step:** an unblocked read of
   `https://www.powercompanyclimbing.com/blog/metrics-for-climbers` — specifically the **male ×
   bouldering** table's max-hang row, transcribed as `Str:Wt` ranges per max-outdoor-grade column.
   Convert with `ADDED %BW = (ratio − 1) × 100`. That single retrieval turns this whole question from
   "unresolved" into a straightforward table swap **plus** the opportunity to retire the invented
   `GRADE_STEP_ADDED_PCT` constant in favour of PCC's published ±1 SD band (§1, note 2).

---

## Sources

**Reachable only as search-engine summaries — none read verbatim** (see [What was blocked](#what-was-blocked)):

- Power Company Climbing, *Strength + Endurance Standards for Rock Climbers* — https://www.powercompanyclimbing.com/blog/metrics-for-climbers **(BLOCKED — the primary target)**
- Power Company Climbing, *The Two Things You Need for Climbing Harder* (heatmaps) — https://www.powercompanyclimbing.com/blog/heatmaps **(BLOCKED)**
- Power Company Climbing, *How to Climb Harder: What Data from 600+ Climbers Tells Us* — https://www.powercompanyclimbing.com/blog/climb-harder-data **(BLOCKED)**
- StrengthClimbing, *Finger Strength Analyzer* — https://strengthclimbing.com/finger-strength-analyzer/ **(BLOCKED)** — origin of both §2 duration figures
- StrengthClimbing, *Eva López MaxHangs* — https://strengthclimbing.com/eva-lopez-maxhangs/ **(BLOCKED)**
- AthletePath, *Hangboard Max Weight Calculator 7s/10s* — https://www.athletepath.com/climbing-hangboard-calculator/ **(BLOCKED)**
- Eva López, *Maximal hangs, Intermittent Hangs or a Combination* — http://en-eva-lopez.blogspot.com/2018/03/maximal-hangs-intermittent-hangs.html **(BLOCKED)** — would settle the MVC-7 unit question
- Project Direct Coaching, *Are max hangs all they are cracked up to be?* — https://www.projectdirectcoaching.com/blog/whatmetricsmatter **(BLOCKED)**
- Giles/Fryer et al., *The Determination of Finger-Flexor Critical Force in Rock Climbers* — https://pubmed.ncbi.nlm.nih.gov/30676817/ **(BLOCKED)** — checked and ruled out as a source of a duration conversion
- Beast Fingers Climbing, *Finger Strength Calculator* — https://beastfingersclimbing.com/training/strength-calculator **(BLOCKED)** — ruled out (load-cell MVC, protocol-incompatible)

**Read directly (in-repo, higher trust than anything above):**

- [`../benchmark-norms.md`](../benchmark-norms.md) — unit discipline, the Lattice 7 s table, confidence key
- [`verified-findings.md`](verified-findings.md) — the 2026-07-08 assessment-norms batch, esp. lines 690–702 (Lattice) and 719–725 (Power Company Climbing)
- `js/limiter.js` — the current `FINGER_NORM_ADDED_PCT` table and the IB-020 disclosure

## Disclaimer

Training information only — **not medical advice**. Nothing in this document was verified against a
primary source in this session; treat every external claim here as provisional pending an unblocked read.
