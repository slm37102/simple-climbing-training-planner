// Limiter readout (ADR-0011, closes KG-A1/KG-D2): a small, informational,
// target-grade-anchored comparison of stored strength benchmarks against
// Lattice's Advanced-tier norm bands (docs/benchmark-norms.md). Deliberately
// narrow — that doc's own R² finding (~17% finger / ~8-12% pulling explain
// grade variance at this ability tier) means this is a sanity check, not a
// diagnosis. Informational only: changes no prescription. Pure function of
// (benchmarks) -> verdict lines; recomputed by the caller on any benchmark
// change (including a retest save).

// Added-%BW finger-strength norm table (Lattice, 901 participants;
// confidence: medium — see benchmark-norms.md's caveats). Keyed by boulder
// grade, anchored on the athlete's TARGET grade, not their current one.
//
// IB-020 — DURATION MISMATCH, deliberately un-corrected here: this table is a
// 7-second hang, but `maxHang20mm` stores a 10-second hold (program.js:710).
// A max 10s hold sits at lower added load than a max 7s one, so the stored
// number reads low against this table, biasing the fingers line toward
// "below → fingers are a limiter".
//
// The ADR-0011 addendum (2026-08-09, KG-B22) settled how to live with that —
// read it for the argument; the load-bearing facts here are:
//   · Direction known, MAGNITUDE UNQUANTIFIED. An earlier version of this
//     comment called the error "bounded — a few pp"; a /research pass found
//     that bound unsourced. Nothing quantifies the 7s→10s delta, and the only
//     circulating figures span ≈1–7 pp against a 6 pp GRADE_STEP_ADDED_PCT —
//     so the bias can manufacture a *clear* below-band reading. Don't let the
//     "bounded" reassurance back in.
//   · So the below-band branch states the comparison and WITHHOLDS THE VERDICT
//     (`verdict: 'below-unresolved'`). at-or-above and `elsewhere` stay: the
//     same error biases them *against* themselves, so it can't produce them
//     spuriously.
//   · No conversion factor, and the threshold is NOT widened — both would be
//     fresh invented constants papering over an unquantified one (the posture
//     ADR-0020 refused). Nor does the benchmark move: `maxHang20mm` is also
//     `prescribeLoadKg`'s `baseMax`, and ADR-0013 builds every hangboard band
//     on it, so retesting at 7s would raise every prescription to fix a
//     readout. Honest labeling instead — the KG-C7 posture.
// IB-073 tracks the clean exit: a duration-matched 10s/20mm table (Power
// Company) would replace this one and reverse the suppression.
const FINGER_NORM_ADDED_PCT = {
  V4: 0.28, V5: 0.34, V6: 0.40, V7: 0.46, V8: 0.52, V9: 0.58, V10: 0.64, V11: 0.70
};

// Diminishing-returns pull-up ceiling (Lattice, men) — not grade-anchored;
// the point beyond which more pulling strength buys no further performance.
// Confidence: low-medium (no grade table exists for pulling strength at all).
const PULLUP_CEILING_ADDED_PCT = 0.65;

// "Meaningfully below" the finger norm band — an app convention (unvalidated,
// KG-C7 posture), not a Lattice-published threshold: one full grade-step under
// the target's norm band (the table above steps roughly +6pp added per grade).
// Since the ADR-0011 addendum this selects *which withheld-conclusion wording*
// renders, not whether a verdict is issued — deliberately NOT widened to
// absorb the duration mismatch (see the IB-020 note above).
const GRADE_STEP_ADDED_PCT = 0.06;

function normalizeGrade(g) {
  if (!g) return null;
  const m = String(g).trim().match(/v\s*(\d+)/i);
  return m ? `V${m[1]}` : null;
}

function addedPct(benchmarkKg, bodyweightKg) {
  if (benchmarkKg == null || !bodyweightKg) return null;
  return benchmarkKg / bodyweightKg;
}

// Returns { lines: [{key, text, verdict}], caveat } or null when there isn't
// enough data to say anything at all (missing bodyweight, or both strength
// benchmarks unset). Never guesses from incomplete data.
export function limiterReadout(benchmarks) {
  if (!benchmarks) return null;
  const { bodyweight, maxHang20mm, pullup1RM, boulderGrade } = benchmarks;
  const grade = normalizeGrade(boulderGrade);
  const lines = [];

  let fingersAtOrAbove = null;
  if (bodyweight && maxHang20mm != null && grade && FINGER_NORM_ADDED_PCT[grade] != null) {
    const athletePct = addedPct(maxHang20mm, bodyweight);
    const normPct = FINGER_NORM_ADDED_PCT[grade];
    fingersAtOrAbove = athletePct >= normPct;
    const meaningfullyBelow = athletePct <= normPct - GRADE_STEP_ADDED_PCT;
    lines.push({
      key: 'fingers',
      // 'below-unresolved', not 'below': the comparison resolved, the verdict
      // did not (ADR-0011 addendum §1). IB-073 flips this back to a real
      // verdict if a duration-matched norm table ever lands.
      verdict: fingersAtOrAbove ? 'at-or-above' : (meaningfullyBelow ? 'below-unresolved' : 'near'),
      text: fingersAtOrAbove
        ? `Fingers: at or above the ${grade} norm band — fingers likely aren't your main limiter.`
        : meaningfullyBelow
          ? `Fingers: more than a grade step below the ${grade} norm band — but this is not a verdict: the band is a 7s hang, your benchmark a 10s hold, and that difference is not quantified.`
          : `Fingers: a little below the ${grade} norm band — under one grade step, so no conclusion either way.`
    });
  }

  let pullupsAtCeiling = null;
  if (bodyweight && pullup1RM != null) {
    const athletePct = addedPct(pullup1RM, bodyweight);
    pullupsAtCeiling = athletePct >= PULLUP_CEILING_ADDED_PCT;
    lines.push({
      key: 'pullups',
      verdict: pullupsAtCeiling ? 'at-ceiling' : 'below-ceiling',
      text: pullupsAtCeiling
        ? "Pull-ups: at the diminishing-returns ceiling — more pulling strength likely won't buy grades."
        : 'Pull-ups: below the diminishing-returns ceiling.'
    });
  }

  // Elsewhere-inference: the actionable line, only when both strength lines
  // resolved and both sit at/above norm — per the ADR-0011 decision.
  if (fingersAtOrAbove === true && pullupsAtCeiling === true) {
    lines.push({
      key: 'elsewhere',
      verdict: 'elsewhere',
      text: "Both strength numbers look adequate — your limiter is more likely technique, endurance, or tactics, which this app doesn't measure."
    });
  }

  if (!lines.length) return null;
  // The duration disclosure (IB-020) is only relevant when a fingers line
  // actually rendered — it says nothing about the pulling comparison.
  const showsFingers = lines.some(l => l.key === 'fingers');
  const caveat = 'Strength explains only ~17% of grade variance at this ability tier (finger) and ~8–12% (pulling) — treat this as a sanity check, not a diagnosis.'
    + (showsFingers
      // Direction known, magnitude unquantified — and the magnitude stays OFF
      // the card on purpose. The circulating ≈1–7 pp figures are two
      // inconsistent numbers from one secondary site; printing them would hand
      // the athlete a bound, which is exactly the "bounded" framing the
      // ADR-0011 addendum retracted. They live in docs/benchmark-norms.md.
      ? ' The finger norm band is measured on a 7s hang, but your benchmark is a 10s hang — a 10s hold needs less added weight, so this reads your fingers low. How much lower is not quantified: nothing reliably measures the difference between the two hang durations.'
      : '');
  return { lines, caveat };
}

export const Limiter = { limiterReadout, FINGER_NORM_ADDED_PCT, PULLUP_CEILING_ADDED_PCT };
