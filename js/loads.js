// Load calculator: turns prescribed % ranges + benchmarks → kg ranges; auto-adjust + readiness + deload.
import { Storage } from './storage.js';

const DELOAD_INTENSITY = 0.85;
const DELOAD_VOLUME = 0.5; // shown as informational text

export const Loads = {
  DELOAD_INTENSITY,
  DELOAD_VOLUME,

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
  prescribeLoadKg(exercise) {
    const { benchmarks } = Storage.get();
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
      addedKgRange: [round(lo), round(hi)],
      // Total system weight (info only)
      totalKgRange: bw != null ? [round(bw + lo), round(bw + hi)] : null
    };
  },

  // Resolve effective kg for today's session, applying:
  //   (1) prev-actual seed, (2) auto-adjust, (3) readiness, (4) deload intensity.
  // Returns { suggestedKg, range, reason: [... steps ...] }
  resolveEffective({ exercise, previousActualKg, previousAvgRpe, readinessMultiplier = 1.0, isDeload = false }) {
    const base = this.prescribeLoadKg(exercise);
    if (!base) return null;

    const reason = [];
    const range = base.addedKgRange;
    let kg;

    if (previousActualKg != null) {
      const adj = this.autoAdjust(previousAvgRpe, exercise.rpeRange);
      kg = previousActualKg * adj;
      reason.push(`prev ${previousActualKg}kg × auto-adj ${adj.toFixed(2)} (RPE ${previousAvgRpe ?? '—'})`);
    } else {
      // start at midpoint of range
      kg = (range[0] + range[1]) / 2;
      reason.push(`midpoint of range ${range[0]}–${range[1]}kg`);
    }

    if (readinessMultiplier !== 1.0) {
      kg *= readinessMultiplier;
      reason.push(`readiness ×${readinessMultiplier}`);
    }
    if (isDeload) {
      kg *= DELOAD_INTENSITY;
      reason.push(`deload ×${DELOAD_INTENSITY}`);
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
