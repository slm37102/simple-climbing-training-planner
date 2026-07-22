# Benchmark norms — finger & pulling strength vs. grade

Closes [KG-C6](knowledge-gaps-archive.md#kg-c6--norms-data-provenance-p2). Produced by a 12-agent adversarial
verification round (2026-07-08) over the corpus's "Assessment, benchmarks & finger-strength metrics"
subtopic (29 claims, 3-vote check per claim — see the dated batch in
[`research/verified-findings.md`](research/verified-findings.md#2026-07-08-assessment-norms-batch)),
plus two supplementary single-pass gathers (pull-up norms; independent finger-strength tables) that have
**not** yet been through the 3-vote process — flagged inline wherever used.

This is reference material for a human to read, not something the app consumes. It is the prerequisite
for [KG-D2](knowledge-gaps.md#lens-d--feature-gaps) (an in-app "likely limiter" readout), which remains
unbuilt — see [Should this become a feature?](#should-this-become-a-feature) below.

## Read this first: two incompatible units are in circulation

Every finger-strength chart on the internet reports "%BW," but two different conventions hide behind
that label, and mixing them up produces numbers that are wrong by a factor of ~2:

- **TOTAL load %BW** = (bodyweight + added weight) ÷ bodyweight × 100. **This is Lattice Training's
  convention**, confirmed verbatim in their own testing-instructions PDF: *"80kg (total load) = 70kg
  (body weight) + 10kg (max load) → 114.3% (body weight %)."* Under this convention, 100% = an unweighted
  bodyweight hang; anything above 100% means added weight.
- **ADDED load %BW** = added weight ÷ bodyweight × 100. This is Hörst's and Climbapedia's convention,
  and **it is this app's convention** — `js/loads.js` stores `benchmarks.maxHang20mm` and
  `benchmarks.pullup1RM` as raw added kilograms (the code comment says so explicitly: `// added kg, may
  be negative`).

**Every table below is given in both units, with the app's native unit (ADDED %BW / added kg) called
out explicitly**, because the verification round itself tripped over this exact confusion: a widely-
quoted Lattice table (claim 165 in the corpus) was originally logged as "added load," which would mean
a V4 boulderer hanging **2.28× bodyweight** on two arms — physically absurd. The reviewers traced it to
Lattice's own PDF and corrected the unit before this table was built. Convert with:

```
ADDED %BW = TOTAL %BW − 100
added kg  = bodyweight_kg × (ADDED %BW ÷ 100)
```

**Update 2026-07-17 ([ADR-0013](adr/0013-total-load-intensity-convention.md)):** `js/loads.js` now computes *prescription* percentages (the phase bands — Base intro 80–85%, Build 87–92%, etc.) on **total system load** too — `added = pct × (bodyweight + benchmark) − bodyweight` — matching the TOTAL %BW convention this doc already uses for the norm tables above. Stored benchmarks (`maxHang20mm`, `pullup1RM`) themselves are still ADDED kg — that hasn't changed, and the conversion formulas above remain correct for reading the norm tables. What's changed is only how the app turns "today's benchmark" into "today's prescribed load"; this doc's dual-unit discipline is the reason that switch didn't require re-deriving anything here.

## Finger strength — two-arm, 20mm edge, 7-second hang, half-crimp or open (Lattice, 901 participants)

This is the same measurement this app's `maxHang20mm` benchmark tracks (two-arm, added kg). Confidence:
**medium** — the source dataset is large but proprietary/self-selected, and see the [important caveat](#the-uncomfortable-part-how-much-this-actually-predicts) on predictive power below.

| Grade | TOTAL %BW | ADDED %BW (app's unit) | Added kg @ 70kg bodyweight |
|-------|-----------|--------------------------|----------------------------|
| V4    | 128%      | +28%                     | +19.6 kg |
| V5    | 134%      | +34%                     | +23.8 kg |
| V6    | 140%      | +40%                     | +28.0 kg |
| V7    | 146%      | +46%                     | +32.2 kg |
| V8    | 152%      | +52%                     | +36.4 kg |
| V9    | 158%      | +58%                     | +40.6 kg |
| V10   | 164%      | +64%                     | +44.8 kg |
| V11   | 170%      | +70%                     | +49.0 kg |

Source: Lattice's "Finger Strength Vs Climbing Ability" video-derived table, corroborated independently
by a third-party dataset approximation (wmgclimbing.wordpress.com) and by Lattice's own PDF confirming
the total-load unit. This exact table is **not** in either of the two Lattice blog posts most claims in
this doc cite — those posts give the *correlation statistics* (R, R²) for the same measurement, not the
grade table itself.

**Independent cross-check (peer-reviewed, different edge size, different scale):** Buraas, Brobakken &
Wang (2025, *European Journal of Applied Physiology*) measured 19 male sport climbers (mean redpoint 7b+,
range 6b+–8c) on a 22mm edge and found mean **added** weight of 31 ± 13 kg. For a ~70kg climber that's
≈ **+44% BW added** — close to this table's V7 anchor (+46% added), despite a completely independent
sample, a slightly easier edge (22mm vs 20mm), and sport-grade rather than boulder-grade scoring. This
convergence is the single strongest piece of evidence in this whole exercise that the Lattice table is in
the right ballpark for this athlete's target range.

### One-arm equivalent (supplementary — not verified, secondary source)

Total load %BW, per arm, 20mm edge, 7–10s. **This app has no one-arm benchmark field** — included only
for context if a future feature wants it. Source: wmgclimbing.wordpress.com's approximation of Lattice's
dataset; not adversarially verified.

| Grade | V4  | V5  | V6  | V7  | V8  | V9  |
|-------|-----|-----|-----|-----|-----|-----|
| Total %BW | 49% | 55% | 61% | 67% | 73% | 79% |

## Pulling strength — weighted pull-up (Lattice)

This app's `pullup1RM` is also stored as **added kg**. Confidence: **low-medium** — Lattice never
published a grade-anchored pull-up table (unlike fingers); what exists is correlation strength plus one
ceiling benchmark.

- Lattice's own numbers say pulling strength is a **much weaker signal than finger strength specifically
  in this athlete's ability tier**: in their Advanced band (~V4–V8 boulder / ~7a–7b+ sport — this app's
  home range), pulling strength explains only **R²≈0.08 (sport) to 0.12 (boulder)** of grade variance,
  versus **R²≈0.17** for finger strength in the same band (boulder tier — the sport-tier finger figure
  was not captured). Both are weak in absolute terms.
- Diminishing-returns ceiling (not grade-anchored): 2 pull-ups at **165% total BW (men) / 135% total BW
  (women)** — i.e. **+65% / +35% added** — is the point beyond which Lattice's data shows no further
  performance benefit.
- A **2024 peer-reviewed systematic review** found the 1RM weighted pull-up **did not significantly
  correlate with or discriminate climbing level at all** in their sample — a sharper caution than
  Lattice's own weak-but-nonzero finding.
- **Not directly comparable, different metric:** a 2025 peer-reviewed study of 28 advanced/elite climbers
  found max pull-up *reps* (not weighted 1RM) averaged 22.5 ± 7.7 and correlated significantly with grade
  (r > 0.39) — reps-based testing may carry more signal than a weighted 1RM for this population, but this
  app doesn't track reps-to-failure.

No grade table is given for pulling strength — the evidence doesn't support one with any confidence.

## The uncomfortable part: how much this actually predicts

This is the finding that should most shape how (or whether) these numbers get used: **within this
athlete's specific ability tier, these benchmarks explain surprisingly little of grade variance.**
Lattice's own 901-participant regression, split by tier:

| Tier | Boulder grade band | Finger strength R² | Pulling strength R² |
|------|--------------------|--------------------:|----------------------:|
| Combined (all levels) | — | ~50% | ~34% |
| **Advanced (this app's athlete)** | **~V4–V8** | **~17%** | **~8–12%** |
| Elite | ~V9–V12 | ~10% | ~5% |

At the Combined level, finger strength alone explains about half of who climbs what grade — an
impressively strong single-variable predictor. But that number is inflated by *range restriction*: it's
easy to predict grade from finger strength when the sample spans total beginners to elite climbers. Once
you narrow to just the Advanced band — exactly where this app's athlete sits, working V5–V6 toward V7 —
finger strength explains only ~17% of the remaining variance, and pulling strength ~8–12%. **Roughly
70–85% of what separates one Advanced climber's grade from another's is something other than these two
strength numbers** — most plausibly technique, tactics, mileage, and mental game, none of which this app
measures.

## Should this become a feature?

This was researched to support [KG-A1 / KG-D2](knowledge-gaps-archive.md#kg-a1--no-limiter-diagnosis-p1-g1) (an
in-app "likely limiter" readout). Given the R² finding above, the honest scope for that feature is narrow:

- **What it could say, defensibly:** whether the athlete's finger strength and pull strength sit at,
  above, or meaningfully below the Advanced-tier norm band for their target grade — a rough sanity check,
  phrased as "your fingers are roughly where V7 climbers tend to be; that suggests fingers aren't your
  main limiter" rather than a confident diagnosis.
- **What it cannot say:** which of endurance or technique is the limiter (the app tracks no benchmark for
  either), or anything precise, given ~17% R² even for the strength half of the question.
- **Recommendation:** if built, keep it to a single static comparison (current benchmark vs. this table,
  recomputed only when benchmarks are retested) with the uncertainty stated in the UI copy itself — not a
  trend engine or an automated program-changer. See KG-D2 for the implementation-sizing discussion.

## Confidence key

- **High** — peer-reviewed + independently replicated (e.g. the Buraas cross-check).
- **Medium** — large proprietary dataset (Lattice), corroborated by independent secondary analysis and
  the primary source's own PDF, but self-selected/non-random sample.
- **Low** — single secondary source, not adversarially verified (one-arm table; 9c-test pull-up scale
  mentioned in the corpus gather but omitted here for being too indirect to include responsibly).

## Sources

Full citations, direct quotes, and vote tallies are in the dated batch of
[`research/verified-findings.md`](research/verified-findings.md#2026-07-08-assessment-norms-batch). The
two supplementary gathers (pull-up norms; independent finger-strength cross-checks) are single-pass —
not yet run through the 3-vote adversarial check — and are queued alongside the rest of
[KG-C1](knowledge-gaps-archive.md#kg-c1--the-research-corpus-is-half-verified-p2--closed-2026-07-10)'s
backlog for future verification.
