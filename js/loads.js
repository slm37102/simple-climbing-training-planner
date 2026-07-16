// Load calculator: turns prescribed % ranges + benchmarks → kg ranges; auto-adjust + readiness.
// NOTE: Deload no longer scales intensity. Per Lattice (see docs/adr/0003-deload-as-volume-cut.md)
// deload weeks cut volume (sets) and hold intensity. The volume cut is applied in program.js
// when building the session; this module is purely about per-rep kg.
import { Storage } from './storage.js';

export const Loads = {
  // ===== readiness =====
  // readiness = {sleep, soreness, fatigue} each 1..5
  computeReadinessMultiplier(readiness) {
    if (!readiness) return { multiplier: 1.0, label: 'Normal' };
    const { sleep = 3, soreness = 3, fatigue = 3 } = readiness;
    const avg = (sleep + soreness + fatigue) / 3;
    if (avg >= 4.5) return { multiplier: 1.05, label: 'Push', avg };
    if (avg >= 3.5) return { multiplier: 1.00, label: 'Normal', avg };
    if (avg >= 2.5) return { multiplier: 0.85, label: 'Lighter', avg };
    return { multiplier: 0,  label: 'Suggest rest / mobility only', avg };
  },

  // ===== Layoff decay (ADR-0008) =====
  // Decay a previous-actual seed for time off *that session type*: full credit
  // within the grace window, then −3% per week, floored at ×0.85 (~5 weeks off).
  // Guards the classic pulley-injury trigger of resuming at full load after a layoff.
  layoffDecay(daysSincePrevious) {
    if (daysSincePrevious == null || daysSincePrevious <= LAYOFF_GRACE_DAYS) return 1.0;
    return Math.max(LAYOFF_FLOOR, 1 - LAYOFF_DECAY_PER_WEEK * (daysSincePrevious - LAYOFF_GRACE_DAYS) / 7);
  },

  // ===== Auto-adjust from previous actual =====
  // Given previous actual avg RPE vs target rpeRange, returns multiplier to apply to previous actual load.
  autoAdjust(previousAvgRpe, rpeRange) {
    if (previousAvgRpe == null || !rpeRange) return 1.0;
    if (previousAvgRpe > rpeRange[1]) return 0.95;
    if (previousAvgRpe < rpeRange[0]) return 1.05;
    return 1.0;
  },

  // ===== Targets-hit progression (ADR-0009, closes KG-B5) =====
  // Previous same-session actual completed all prescribed sets (and reps, when
  // both sides are known) → the session "hit targets". Combined with an
  // in-range RPE this earns +2.5% instead of a flat mirror — the bottom of the
  // verified "+2.5–10% once targets hit" band (research § Strength).
  // Compared against TODAY's prescription, so a deload-week actual (cut sets)
  // never qualifies the following full-volume week — it holds, then progresses.
  targetsHit(exercise, prevSets, prevReps) {
    if (typeof exercise?.prescribedSets !== 'number' || prevSets == null) return false;
    if (prevSets < exercise.prescribedSets) return false;
    if (typeof exercise.prescribedReps === 'number' && prevReps != null && prevReps < exercise.prescribedReps) return false;
    return true;
  },

  // ===== Compute kg range for an exercise =====
  // exercise has { kind, loadPctRange?, pctRange?, ...}
  // Uses benchmarks.maxHang20mm for hangboard, benchmarks.pullup1RM for pullup.
  prescribeLoadKg(exercise, benchmarksOverride = null) {
    const { benchmarks } = benchmarksOverride ? { benchmarks: benchmarksOverride } : Storage.get();
    const bw = benchmarks.bodyweight;
    let baseMax = null;
    let isAddedWeight = false;

    if (exercise.kind === 'hangboard') {
      baseMax = benchmarks.maxHang20mm; // added kg, may be negative
      isAddedWeight = true;
    } else if (exercise.kind === 'pullup') {
      baseMax = benchmarks.pullup1RM; // added kg
      isAddedWeight = true;
    } else {
      return null;
    }

    const pctRange = exercise.loadPctRange || exercise.pctRange;
    if (!pctRange || baseMax == null) return null;

    // KG-B11a: for a negative (assisted) benchmark, more-negative = more assisted
    // = easier; less-negative = less assisted = harder. Naive %-of-benchmark math
    // shrinks the magnitude toward zero, which for a negative baseMax computes a
    // HARDER value than the athlete's own tested max — a supra-max load mislabelled
    // as an "intro" percentage. Clamp each bound so it never exceeds baseMax in the
    // harder (algebraically greater) direction. No-op for positive benchmarks.
    const lo = clampToBenchmark(baseMax * pctRange[0], baseMax);
    const hi = clampToBenchmark(baseMax * pctRange[1], baseMax);
    return {
      isAddedWeight,
      baseMax,
      addedKgRange: [round(Math.min(lo, hi)), round(Math.max(lo, hi))],
      // Total system weight (info only) — derived from the same clamped bounds.
      totalKgRange: bw != null ? [round(bw + lo), round(bw + hi)] : null
    };
  },

  // Resolve effective kg for today's session, applying:
  //   (1) prev-actual seed, (2) layoff decay, (3) auto-adjust, (4) readiness.
  // Deload weeks cut volume (handled in program.js), not intensity — kg is held constant.
  resolveEffective({ exercise, previousActualKg, previousAvgRpe, previousActualSets = null, previousActualReps = null, daysSincePrevious = null, readinessMultiplier = 1.0, benchmarks = null }) {
    const base = this.prescribeLoadKg(exercise, benchmarks);
    if (!base) return null;

    const reason = [];
    const range = base.addedKgRange;

    // C3: when readiness score says "rest", signal that to the UI rather than suggesting 0 kg.
    if (readinessMultiplier <= 0) return { suggestedKg: null, restSuggested: true, range, reason };

    let kg;
    let decay = 1.0;

    if (previousActualKg != null) {
      decay = this.layoffDecay(daysSincePrevious);
      let adj = this.autoAdjust(previousAvgRpe, exercise.rpeRange);
      // ADR-0009: in-range RPE used to mean "mirror the load forever" — the
      // thermostat could oscillate around a fixed kg with no overload. Now an
      // in-range RPE *with all targets hit* earns a +2.5% progression step.
      if (adj === 1.0 && previousAvgRpe != null && exercise.rpeRange
          && this.targetsHit(exercise, previousActualSets, previousActualReps)) {
        adj = TARGETS_HIT_PROGRESS;
        reason.push('targets hit → +2.5%');
      }
      kg = previousActualKg * decay * adj;
      reason.push(`prev ${previousActualKg}kg × auto-adj ${adj.toFixed(3)} (RPE ${previousAvgRpe ?? '—'})`);
      if (decay < 1) reason.push(`layoff decay ×${decay.toFixed(2)} (${daysSincePrevious} days since this session type)`);
    } else {
      // start at midpoint of range
      kg = (range[0] + range[1]) / 2;
      reason.push(`midpoint of range ${range[0]}–${range[1]}kg`);
    }

    if (readinessMultiplier !== 1.0) {
      kg *= readinessMultiplier;
      reason.push(`readiness ×${readinessMultiplier}`);
    }

    // ADR-0009 guardrail: cap the total upward move at +5% of the (decayed)
    // previous actual per session — auto-adjust ×1.05 stacking with "Push"
    // readiness ×1.05 used to allow +10.25% single-session jumps, above the
    // verified +2.5–10% progression band. Downward moves are never capped.
    if (previousActualKg != null) {
      const cap = previousActualKg * decay * MAX_SESSION_PROGRESS;
      if (kg > cap) {
        kg = cap;
        reason.push('capped at +5% per session');
      }
    }

    // KG-B11a: the same negative-benchmark safety cap applies to the final kg,
    // not just the initial range — progression/readiness multipliers can walk a
    // negative-benchmark suggestion past the tested max in the harder direction
    // even when the initial range was clamped correctly (e.g. layoff decay or a
    // "too hard" auto-adjust shrinking a negative previousActualKg toward zero).
    const clampedKg = clampToBenchmark(kg, base.baseMax);
    if (clampedKg !== kg) {
      kg = clampedKg;
      reason.push(`clamped to benchmark ${base.baseMax}kg (negative-benchmark safety cap)`);
    }

    return { suggestedKg: round(kg), range, reason };
  },

  // Format helper
  fmtRange(range, unit = 'kg') {
    if (!range) return '—';
    return `${range[0]}–${range[1]} ${unit}`;
  }
};

function round(x) { return Math.round(x * 2) / 2; } // 0.5 kg precision

// KG-B11a: negative benchmarks (assisted hangs/pull-ups) are inverted — more
// negative = more assisted = easier; less-negative = less assisted = harder.
// No computed value may ever be harder (algebraically greater) than the
// benchmark itself. No-op for positive benchmarks (added-weight PRs must still
// be allowed to progress upward past a stale positive benchmark).
function clampToBenchmark(value, baseMax) {
  return baseMax < 0 ? Math.min(value, baseMax) : value;
}

// ADR-0008 layoff-decay constants. App convention (like the readiness multipliers,
// see docs/knowledge-gaps.md KG-C7) — direction is evidence-backed, exact numbers are not.
const LAYOFF_GRACE_DAYS = 10;
const LAYOFF_DECAY_PER_WEEK = 0.03;
const LAYOFF_FLOOR = 0.85;

// ADR-0009 progression constants: +2.5% is the bottom of the verified
// "+2.5–10% once targets hit" band (research § Strength) — conservative for
// tendon-limited lifts; the cap keeps stacked multipliers inside that band.
const TARGETS_HIT_PROGRESS = 1.025;
const MAX_SESSION_PROGRESS = 1.05;
