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
const FINGER_NORM_ADDED_PCT = {
  V4: 0.28, V5: 0.34, V6: 0.40, V7: 0.46, V8: 0.52, V9: 0.58, V10: 0.64, V11: 0.70
};

// Diminishing-returns pull-up ceiling (Lattice, men) — not grade-anchored;
// the point beyond which more pulling strength buys no further performance.
// Confidence: low-medium (no grade table exists for pulling strength at all).
const PULLUP_CEILING_ADDED_PCT = 0.65;

// "Meaningfully below" the finger norm band, per the ADR-0011 verdict — an
// app convention (unvalidated, KG-C7 posture), not a Lattice-published
// threshold: one full grade-step under the target's norm band (the table
// above steps roughly +6pp added per grade).
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
      verdict: fingersAtOrAbove ? 'at-or-above' : (meaningfullyBelow ? 'below' : 'near'),
      text: fingersAtOrAbove
        ? `Fingers: at or above the ${grade} norm band — fingers likely aren't your main limiter.`
        : meaningfullyBelow
          ? `Fingers: meaningfully below the ${grade} norm band — a limiter candidate.`
          : `Fingers: a little below the ${grade} norm band — not yet a clear limiter candidate.`
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
  return {
    lines,
    caveat: 'Strength explains only ~17% of grade variance at this ability tier (finger) and ~8–12% (pulling) — treat this as a sanity check, not a diagnosis.'
  };
}

export const Limiter = { limiterReadout, FINGER_NORM_ADDED_PCT, PULLUP_CEILING_ADDED_PCT };
