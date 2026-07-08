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

    const lo = baseMax * pctRange[0];
    const hi = baseMax * pctRange[1];
    return {
      isAddedWeight,
      addedKgRange: [round(Math.min(lo, hi)), round(Math.max(lo, hi))],
      // Total system weight (info only)
      totalKgRange: bw != null ? [round(bw + lo), round(bw + hi)] : null
    };
  },

  // Resolve effective kg for today's session, applying:
  //   (1) prev-actual seed, (2) layoff decay, (3) auto-adjust, (4) readiness.
  // Deload weeks cut volume (handled in program.js), not intensity — kg is held constant.
  resolveEffective({ exercise, previousActualKg, previousAvgRpe, daysSincePrevious = null, readinessMultiplier = 1.0, benchmarks = null }) {
    const base = this.prescribeLoadKg(exercise, benchmarks);
    if (!base) return null;

    const reason = [];
    const range = base.addedKgRange;

    // C3: when readiness score says "rest", signal that to the UI rather than suggesting 0 kg.
    if (readinessMultiplier <= 0) return { suggestedKg: null, restSuggested: true, range, reason };

    let kg;

    if (previousActualKg != null) {
      const decay = this.layoffDecay(daysSincePrevious);
      const adj = this.autoAdjust(previousAvgRpe, exercise.rpeRange);
      kg = previousActualKg * decay * adj;
      reason.push(`prev ${previousActualKg}kg × auto-adj ${adj.toFixed(2)} (RPE ${previousAvgRpe ?? '—'})`);
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
    return { suggestedKg: round(kg), range, reason };
  },

  // Format helper
  fmtRange(range, unit = 'kg') {
    if (!range) return '—';
    return `${range[0]}–${range[1]} ${unit}`;
  }
};

function round(x) { return Math.round(x * 2) / 2; } // 0.5 kg precision

// ADR-0008 layoff-decay constants. App convention (like the readiness multipliers,
// see docs/knowledge-gaps.md KG-C7) — direction is evidence-backed, exact numbers are not.
const LAYOFF_GRACE_DAYS = 10;
const LAYOFF_DECAY_PER_WEEK = 0.03;
const LAYOFF_FLOOR = 0.85;
