// Monitoring signals (ADR-0014, closes KG-A4/KG-D6): four reactive
// exception-catcher signals layered on top of the already-implemented
// proactive system (3:1 deloads, taper, readiness multiplier, layoff decay)
// — not a training-load model (KG-A12 stays won't-fix). Every threshold
// below beyond "deviation from your own baseline" is an app convention,
// unvalidated (KG-C7 posture); the pain-gate boundaries are the one
// RCT-extrapolated rule in the evidence sweep (Silbernagel 2007 — see
// docs/return-from-tweak.md).
//
// Pure functions of stored history (Storage.listDays()-shaped day entries,
// globalBenchmarks.history) -> flags. Nothing here mutates anything — the
// caller decides how/whether to act on a returned flag (advisory + one-tap
// accept, the ADR-0008 banner idiom).
import { daysBetween } from './dates.js';

const READINESS_SHORT_WINDOW = 7;
const READINESS_LONG_WINDOW = 28;
const READINESS_DROP_THRESHOLD = 0.5; // 1-5 scale points, app convention

function readinessScore(r) {
  if (!r) return null;
  const { sleep, soreness, fatigue } = r;
  if (sleep == null || soreness == null || fatigue == null) return null;
  return (sleep + soreness + fatigue) / 3;
}

function avg(nums) {
  if (!nums.length) return null;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

// days: array of [dateIso, dayLog] (Storage.listDays() shape). asOfIso: the
// date to evaluate as "today" — passed explicitly so this stays a pure
// function of its inputs rather than reading the wall clock.
export function readinessTrendSignal(days, asOfIso) {
  const scored = (days || [])
    .filter(([iso]) => iso <= asOfIso)
    .map(([iso, day]) => ({ iso, score: readinessScore(day?.readiness) }))
    .filter(d => d.score != null);
  const inWindow = (w) => scored.filter(d => daysBetween(d.iso, asOfIso) < w);
  const shortWindow = inWindow(READINESS_SHORT_WINDOW);
  const longWindow = inWindow(READINESS_LONG_WINDOW);
  // Require a reasonably populated window so a couple of stray entries
  // can't produce a misleading average early in a cycle.
  if (shortWindow.length < 4 || longWindow.length < 10) return null;
  const shortAvg = avg(shortWindow.map(d => d.score));
  const longAvg = avg(longWindow.map(d => d.score));
  if ((longAvg - shortAvg) < READINESS_DROP_THRESHOLD) return null;
  return {
    key: 'readiness-trend',
    message: `Readiness has trended down: 7-day avg ${shortAvg.toFixed(1)} vs your 28-day baseline ${longAvg.toFixed(1)}.`,
    action: "Cut this week's volume early, like a deload",
    actionKey: 'early-deload'
  };
}

// The last two logged occurrences of a given exercise kind across all days,
// in chronological order — each needs both kg and rpe logged to count.
function lastTwoOccurrences(days, kind, asOfIso) {
  const occ = [];
  for (const [iso, day] of days || []) {
    if (iso > asOfIso) continue;
    for (const ex of (day?.exercises || [])) {
      if (ex.kind !== kind) continue;
      const a = ex.actual;
      if (a && a.kg != null && a.rpe != null) occ.push({ iso, kg: a.kg, rpe: a.rpe, rpeRange: ex.rpeRange });
    }
  }
  occ.sort((a, b) => a.iso.localeCompare(b.iso));
  return occ.slice(-2);
}

// 2 consecutive load-matched hangboard/pullup sessions with avg RPE above
// the target range at non-increased kg. Requires the logged exercise to
// carry its own rpeRange (persisted alongside the actual — see
// today.js's getOrInitDay) since a historical day's target range isn't
// otherwise reconstructible (phases change which range applied).
export function rpeDriftSignal(days, asOfIso) {
  for (const kind of ['hangboard', 'pullup']) {
    const [prev, latest] = lastTwoOccurrences(days, kind, asOfIso);
    if (!prev || !latest || !prev.rpeRange || !latest.rpeRange) continue;
    const prevAbove = prev.rpe > prev.rpeRange[1];
    const latestAbove = latest.rpe > latest.rpeRange[1];
    const kgNotIncreased = latest.kg <= prev.kg;
    if (prevAbove && latestAbove && kgNotIncreased) {
      return {
        key: 'rpe-drift',
        message: `${kind === 'hangboard' ? 'Hangboard' : 'Pull-up'} RPE has run above target for 2 sessions in a row at the same load.`,
        action: 'Confirm with a micro-retest before adjusting anything',
        actionKey: 'confirm-retest'
      };
    }
  }
  return null;
}

// history: globalBenchmarks.history — each entry {maxHang20mm, pullup1RM, date}.
export function retestTrajectorySignal(history) {
  const h = (history || []).filter(e => e && e.date).slice().sort((a, b) => a.date.localeCompare(b.date));
  if (h.length < 2) return null;
  const [prev, latest] = h.slice(-2);
  const measured = [];
  if (latest.maxHang20mm != null && prev.maxHang20mm != null) measured.push(latest.maxHang20mm <= prev.maxHang20mm);
  if (latest.pullup1RM != null && prev.pullup1RM != null) measured.push(latest.pullup1RM <= prev.pullup1RM);
  // Only fire when every benchmark measured in both retests is flat-or-down
  // — a mixed result (fingers up, pulling down) should not read as a plateau.
  if (!measured.length || measured.some(flat => !flat)) return null;
  return {
    key: 'retest-plateau',
    message: 'Your last two retests show no improvement — two flat cycles in a row.',
    action: "Review the end-of-cycle checklist's stimulus-rotation questions",
    actionKey: 'review-checklist',
    // Rendered by the views as a link — the checklist is a repo doc served
    // alongside the app's static files.
    href: 'docs/end-of-cycle-review.md'
  };
}

// Silbernagel pain-monitoring model (EXTRAPOLATION from Achilles tendinopathy
// — see docs/return-from-tweak.md): green ≤3 / amber 3-5 (hold progression) /
// red >5 or worse-next-morning (skip finger loading today).
export function painCheckInSignal(pain) {
  if (!pain || pain.value == null) return null;
  const worseNextMorning = pain.settledByMorning === false;
  if (pain.value > 5 || worseNextMorning) {
    return {
      key: 'pain-red',
      severity: 'red',
      message: "Pain above the amber zone (or worse this morning) — suggest skipping today's finger-loading exercises.",
      action: 'See the return-from-tweak guide',
      actionKey: 'return-from-tweak',
      // ADR-0014: the pain-red response links the KG-A7 return-from-tweak
      // doc (the reason ticket #47 blocked #52) — served as a repo file.
      href: 'docs/return-from-tweak.md'
    };
  }
  if (pain.value >= 3) {
    return {
      key: 'pain-amber',
      severity: 'amber',
      message: "Pain in the amber zone — hold today's progression, don't advance load.",
      action: "Hold today's progression",
      actionKey: 'hold-progression'
    };
  }
  return null; // green — no flag
}

// Aggregate entry point: everything a caller needs in one call.
export function computeSignals({ days, benchmarkHistory, todayPain, asOfIso }) {
  return {
    readinessTrend: readinessTrendSignal(days, asOfIso),
    rpeDrift: rpeDriftSignal(days, asOfIso),
    retestPlateau: retestTrajectorySignal(benchmarkHistory),
    painCheckIn: painCheckInSignal(todayPain)
  };
}

export const Monitoring = {
  readinessTrendSignal,
  rpeDriftSignal,
  retestTrajectorySignal,
  painCheckInSignal,
  computeSignals
};
