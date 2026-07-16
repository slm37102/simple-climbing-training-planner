// Macrocycle definition + session library + protocol generators.
// Cycle length is configurable per-plan via settings.cycleWeeks (default 12, min 8, max 40).
// Phase split scales with length; Peak (2 wk) and Taper (1–2 wk) are fixed, Base/Build scale.
// Each main day (Mon/Thu/Sat) gets a session keyed by phase + week-flavor (boulder|sport).
//
// See docs/training-philosophy.md and docs/adr/0002-configurable-cycle-length.md for rationale.

import { snapToMonday, addDays } from './dates.js';
import { SKILL_DRILLS } from './drills.js';

export const MIN_CYCLE_WEEKS = 8;
export const MAX_CYCLE_WEEKS = 40;
export const DEFAULT_CYCLE_WEEKS = 12;
// Above this threshold we switch to a double-block (Base→Build → Base→Build → Peak→Taper)
// instead of stretching a single Base further. Coach consensus (Lattice, Hörst, Anderson)
// says single-block adaptations plateau beyond ~20 wk without phase transitions.
const DOUBLE_BLOCK_THRESHOLD = 20;

export function clampCycleWeeks(weeks) {
  const n = Math.round(Number(weeks) || DEFAULT_CYCLE_WEEKS);
  return Math.max(MIN_CYCLE_WEEKS, Math.min(MAX_CYCLE_WEEKS, n));
}

export function cycleDays(weeks) {
  return clampCycleWeeks(weeks) * 7;
}


// Build the per-week phase pattern for any supported cycle length.
// Single block ≤ DOUBLE_BLOCK_THRESHOLD weeks; double block above.
// Deload every 4th week within Base and Build (3 hard : 1 deload — ADR-0004);
// retest = last week of Base (each Base block).
// Taper length comes from the plan's peakType (ADR-0007): comp = 1 wk, trip/project = 2 wk.
const _patternCache = new Map();
export function buildPhasePattern(weeks, peakType = 'comp') {
  const w = clampCycleWeeks(weeks);
  const pt = (peakType === 'trip' || peakType === 'project') ? peakType : 'comp';
  const key = `${w}:${pt}`;
  if (_patternCache.has(key)) return _patternCache.get(key);
  const arr = (w > DOUBLE_BLOCK_THRESHOLD) ? _doubleBlock(w, pt) : _singleBlock(w, pt);
  _patternCache.set(key, arr);
  return arr;
}

// ADR-0007: event-type scaled taper. A comp peaks on one day → short 1-wk step
// taper (plus the mandatory rest day before the goal); a trip or open project
// rides the ~1-month peak window → 2 wk.
function taperWeeksFor(peakType) {
  return (peakType === 'trip' || peakType === 'project') ? 2 : 1;
}

function _singleBlock(weeks, peakType) {
  const peak  = 2;
  const taper = taperWeeksFor(peakType);
  const remaining = weeks - peak - taper; // base + build
  // Build = ~1/3 of remaining, min 2; Base takes the rest.
  const build = Math.max(2, Math.round(remaining * 0.33));
  const base  = Math.max(2, remaining - build);
  return _composeSingle({ base, build, peak, taper });
}

function _doubleBlock(weeks, peakType) {
  const peak  = 2;
  const taper = taperWeeksFor(peakType);
  const remaining = weeks - peak - taper;
  // Split into two sub-blocks (Base→Build each).
  const sub1 = Math.floor(remaining / 2);
  const sub2 = remaining - sub1;
  const build1 = Math.max(2, Math.round(sub1 * 0.33));
  const base1  = Math.max(2, sub1 - build1);
  const build2 = Math.max(2, Math.round(sub2 * 0.33));
  const base2  = Math.max(2, sub2 - build2);
  return _composeDouble({ base1, build1, base2, build2, peak, taper });
}

function _composeSingle({ base, build, peak, taper }) {
  const arr = [];
  for (let i = 0; i < base; i++)  arr.push({ phase: 'base',  deload: ((i + 1) % 4 === 0), retest: false });
  for (let i = 0; i < build; i++) arr.push({ phase: 'build', deload: ((i + 1) % 4 === 0), retest: false });
  for (let i = 0; i < peak; i++)  arr.push({ phase: 'peak',  deload: false, retest: false });
  for (let i = 0; i < taper; i++) arr.push({ phase: 'taper', deload: false, retest: false });
  if (base > 0) {
    arr[base - 1].deload = true; arr[base - 1].retest = true;
    // C2: the forced retest-deload must not land back-to-back with a natural deload.
    // Clear the immediately preceding week's natural deload if it was set.
    if (base > 1 && arr[base - 2].deload) arr[base - 2].deload = false;
  }
  return arr;
}

function _composeDouble({ base1, build1, base2, build2, peak, taper }) {
  const arr = [];
  for (let i = 0; i < base1; i++)  arr.push({ phase: 'base',  deload: ((i + 1) % 4 === 0), retest: false });
  if (base1 > 0) {
    arr[base1 - 1].deload = true; arr[base1 - 1].retest = true;
    if (base1 > 1 && arr[base1 - 2].deload) arr[base1 - 2].deload = false; // C2
  }
  for (let i = 0; i < build1; i++) arr.push({ phase: 'build', deload: ((i + 1) % 4 === 0), retest: false });
  const base2Start = arr.length;
  for (let i = 0; i < base2; i++)  arr.push({ phase: 'base',  deload: ((i + 1) % 4 === 0), retest: false });
  if (base2 > 0) {
    arr[base2Start + base2 - 1].deload = true; arr[base2Start + base2 - 1].retest = true;
    if (base2 > 1 && arr[base2Start + base2 - 2].deload) arr[base2Start + base2 - 2].deload = false; // C2
  }
  for (let i = 0; i < build2; i++) arr.push({ phase: 'build', deload: ((i + 1) % 4 === 0), retest: false });
  for (let i = 0; i < peak; i++)   arr.push({ phase: 'peak',  deload: false, retest: false });
  for (let i = 0; i < taper; i++)  arr.push({ phase: 'taper', deload: false, retest: false });
  return arr;
}

// Back-compat export: the 12-week default pattern as a static array.
// Existing callers that read PHASE_PATTERN keep working; new code should call
// Program.phasePattern(plan) or buildPhasePattern(weeks).
export const PHASE_PATTERN = buildPhasePattern(DEFAULT_CYCLE_WEEKS);

// Boulder-emphasis on odd weeks, sport-emphasis on even weeks (alternating).
export function weekFlavor(weekIdx /* 1..N */) {
  return (weekIdx % 2 === 1) ? 'boulder' : 'sport';
}

// Day-of-week → session slot. Mon=1, Tue=2, Wed=3, Thu=4, Fri=5, Sat=6, Sun=0.
const DOW_TO_SLOT = {
  1: 'mon-main',
  2: 'tue-light',
  3: 'rest',
  4: 'thu-main',
  5: 'rest',
  6: 'sat-main',
  0: 'sun-optional'
};

// ============== Hangboard protocols by phase ==============
// Base is a two-exercise pair (ADR-0005): capacity-building repeaters plus an
// introductory low-end weighted max-hang block. The old min-edge-to-failure
// protocol was deleted — no source provenance, and RPE-10 hangs on the smallest
// holdable edge were the plan's largest unvetted injury exposure.
const BASE_REPEATERS = {
  name: '7/3 Repeaters',
  hang: '7s × 6 reps',
  rest: '3s within / 3 min between sets',
  sets: '2 sets per grip (half-crimp + open-crimp)',
  prescribedSets: 2, prescribedReps: 6,
  rpeRange: [7.5, 8.5],
  edge: '20mm',
  loadPctRange: null
};
const BASE_MAX_INTRO = {
  name: 'Max hangs (intro)',
  hang: '10s weighted',
  rest: '3 min',
  sets: '3 hangs × 2 sets — low-end load, crisp form',
  prescribedSets: 2, prescribedReps: 3,
  rpeRange: [8, 9],
  edge: '20mm',
  loadPctRange: [0.55, 0.70]
};

const HANGBOARD = {
  build: {
    name: 'Max-Weight 10s',
    hang: '10s weighted',
    rest: '3 min',
    sets: '4 hangs × 2 sets — leave 1–2s in reserve; ±2–5 kg between sets by margin',
    prescribedSets: 2, prescribedReps: 4,
    rpeRange: [8, 9],
    edge: '20mm',
    loadPctRange: [0.80, 0.90]
  },
  peak: {
    name: '7-53 protocol',
    hang: '7s weighted',
    rest: '53s within set, 3 min between sets',
    sets: '3 hangs × 3–4 sets',
    prescribedSets: 3, prescribedReps: 3,
    rpeRange: [9, 9.5],
    edge: '20mm',
    loadPctRange: [0.85, 0.95]
  },
  // Taper holds intensity and cuts volume (ADR-0007): a short near-max touch keeps
  // the nervous system sharp; the old 50–60% "light repeaters" shed fitness
  // (cutting intensity 30–60% costs 20–30% performance — verified taper research).
  taper: {
    name: 'Near-max hangs (taper touch)',
    hang: '10s weighted',
    rest: '3 min',
    sets: '2–3 hangs × 1 set — short & crisp, stop fresh',
    prescribedSets: 1, prescribedReps: 3,
    rpeRange: [8.5, 9],
    edge: '20mm',
    loadPctRange: [0.80, 0.85]
  }
};

// ============== Antagonist / accessory block ==============
const ANTAGONIST_BLOCK = [
  { name: 'Push-ups', prescribed: '3 × 15–25 · 60–90s rest between sets' },
  { name: 'Inverted rows / band cactus', prescribed: '3 × 10–15 · 60–90s rest between sets' },
  { name: 'Wrist extensor curls', prescribed: '3 × 20 · 60s rest between sets' },
  { name: "Farmer's carry", prescribed: '3 × 20–30 steps · 60–90s rest between sets' },
  { name: 'Core (plank or hanging knee raise or L-sit)', prescribed: 'choose 1: 3 × 60–90s plank · 3 × 10 HKR · 3 × 10s L-sit · 60s rest between sets' }
];

// ============== Session generators (per slot per phase per flavor) ==============

function pullupPrescription(phase) {
  // NOTE: this field must be named rpeRange, not rpe — Loads.autoAdjust and every
  // rendering path (today.js/log.js) read exercise.rpeRange; a differently-named
  // field is silently ignored (no RPE target shown, autoAdjust always no-ops).
  if (phase === 'base')  return { pctRange: [0.55, 0.70], reps: '5 × 5', rest: '2 min between sets', prescribedSets: 5, prescribedReps: 5, rpeRange: [7, 8.5] };
  if (phase === 'build') return { pctRange: [0.80, 0.90], reps: '5 × 3', rest: '3 min between sets', prescribedSets: 5, prescribedReps: 3, rpeRange: [8.5, 9.5] };
  // Peak capped at 90% 1RM (not 95) for this athlete's shoulder/tendon recovery — ADR-0001.
  if (phase === 'peak')  return { pctRange: [0.85, 0.90], reps: '5 × 2', rest: '3 min between sets', prescribedSets: 5, prescribedReps: 2, rpeRange: [9, 9.5] };
  // Taper: intensity held near peak, volume cut to a single low-set touch (ADR-0007).
  return { pctRange: [0.80, 0.90], reps: '2 × 2', rest: '3 min between sets', prescribedSets: 2, prescribedReps: 2, rpeRange: [9, 9.5] }; // taper
}

function hangboardExercise(proto) {
  return {
    kind: 'hangboard',
    name: proto.name,
    hang: proto.hang,
    rest: proto.rest,
    sets: proto.sets,
    prescribedSets: proto.prescribedSets,
    prescribedReps: proto.prescribedReps,
    rpeRange: proto.rpeRange,
    loadPctRange: proto.loadPctRange,
    grip: 'half-crimp + open-crimp'
  };
}

function buildMonHangboard(phase, isDeload, focus = 'hybrid') {
  // ADR-0005: Base = capacity (repeaters) + intro weighted max-hangs; other
  // phases keep their single protocol. No bonus repeater block anywhere —
  // repeaters are first-class in Base, and doubling them was unprescribed volume.
  const exercises = phase === 'base'
    ? [hangboardExercise(BASE_REPEATERS), hangboardExercise(BASE_MAX_INTRO)]
    : [hangboardExercise(HANGBOARD[phase])];
  exercises.push({
    kind: 'pullup',
    name: 'Weighted pull-ups',
    ...pullupPrescription(phase)
  });
  if (focus === 'boulder' && phase === 'build') {
    exercises.push({ kind: 'campus', name: 'Campus warmup ladders', prescribed: '2–3 ladders × 5 min rest', rpeRange: [7, 8], prescribedTarget: { value: 3, unit: 'ladders' } });
  }
  // No campus on Peak Mondays: 7-53 hangs + max pull-ups + campus in one session
  // stacks max stimuli beyond this athlete's connective-tissue recovery — ADR-0001.
  // Peak campus work (basic ladders only) lives in Thursday's session.
  if (!isDeload) {
    exercises.push({ kind: 'antagonist-block', name: 'S&C antagonist block', items: ANTAGONIST_BLOCK });
  }
  return {
    sessionId: `mon-hangboard-${phase}`,
    label: `Hangboard (${phase}) + S&C`,
    energySystem: 'Strength / alactic',
    exercises
  };
}

// ADR-0006: interval rest tightens by 5s per week across the final 4 weeks of
// the cycle (Lattice density progression toward the goal). weeksLeft counts
// full weeks remaining AFTER the current one (final week → 0). Clamped ≥ 2:30.
function densityRest(weeksLeft, baseSec = 240) {
  if (weeksLeft == null || weeksLeft > 3) return null; // outside the final 4 weeks
  const sec = Math.max(150, baseSec - 5 * (4 - weeksLeft)); // wkLeft 3→-5s … 0→-20s
  const m = Math.floor(sec / 60), s = String(sec % 60).padStart(2, '0');
  return `${m}:${s}`;
}

function buildThuMain(phase, flavor, isDeload, weeksLeft = null) {
  if (flavor === 'boulder') {
    if (phase === 'peak') {
      // Softened per ADR-0001: reduced limit volume (quality over fatigue), basic
      // campus ladders only (1-5-9 / bumps / jump-catch removed for this athlete's level).
      return {
        sessionId: 'thu-limit-campus',
        label: 'Limit Bouldering + Campus (Peak)',
        energySystem: 'Strength → Power',
        exercises: [
          { kind:'limit-boulder', name: 'Limit boulders', prescribed: '1–3 limit move-sequences (3–5 moves) · 4–8 attempts each · 3–5 min rest · stop when power drops (~20–30 min)', rpeRange: [9, 9.5], prescribedTarget: { value: 2, unit: 'sequences' } },
          { kind:'campus', name: 'Campus board: basic ladders (1-3-5, matched feet)', prescribed: '2–3 attempts × 2 sets · 3–5 min rest · gate: 15–20 strict pull-ups + 1-2-3-4-5 ladder without matching · skip on any finger tweak', rpeRange: [8.5, 9], prescribedTarget: { value: 2, unit: 'sets' } }
        ]
      };
    }
    if (phase === 'build') {
      return {
        sessionId: 'thu-limit',
        label: 'Limit Bouldering (Build)',
        energySystem: 'Strength',
        exercises: [
          { kind:'limit-boulder', name: 'Limit boulders', prescribed: '3–5 problems · 3–5 attempts · 3–5 min rest · 2–3 sets', rpeRange: [8.5, 9.5], prescribedTarget: { value: 4, unit: 'problems' } }
        ]
      };
    }
    if (phase === 'taper') {
      return {
        sessionId: 'thu-flash',
        label: 'Flash-grade boulders (Taper)',
        energySystem: 'Power',
        exercises: [
          { kind:'boulder', name: 'Flash-grade boulders', prescribed: '6–10 problems below max · long rest', rpeRange: [7, 8.5], prescribedTarget: { value: 8, unit: 'problems' },
            howto: 'Flash or send quickly on problems below your max. Long rest between goes — stay fresh, don’t chase pump.' }
        ]
      };
    }
    // base
    return {
      sessionId: 'thu-projecting-base',
      label: 'Projecting / technique boulders',
      energySystem: 'Skill / Strength',
      exercises: [
        { kind:'boulder', name: 'Projecting (mid-grade)', prescribed: '60–90 min of 4×4-style projecting on submaximal problems', rpeRange: [7.5, 9], prescribedTarget: { value: 75, unit: 'min' } }
      ]
    };
  }
  // sport-emphasis
  if (phase === 'base') {
    return {
      sessionId: 'thu-route-pyramid',
      label: 'Route pyramid (Base)',
      // KG-B9: energy system corrected to base-appropriate capacity work — the
      // prior "Aerobic power / Anaerobic capacity" label matched Build/PE
      // intensity, not what a base-phase session should be training.
      energySystem: 'Aerobic capacity',
      exercises: [
        // KG-B9: RPE capped 7.5–9 → 7–8 so Build's 60/60 threshold work remains
        // a genuine step up — otherwise base already runs near-Build intensity
        // and the base→build progression flattens.
        { kind:'route', name: 'Route pyramid', prescribed: 'pyramid 4-3-2-1 routes · walking rest between routes; 1 grade below redpoint', rpeRange: [7, 8], prescribedTarget: { value: 10, unit: 'routes' },
          howto: 'Climb 4, then 3, then 2, then 1 routes back-to-back, resting between routes. Comfortably hard — save intensity for Build.' }
      ]
    };
  }
  if (phase === 'build') {
    // ADR-0006 band 1 — the aerobic-power "engine": 60/60 threshold intervals at
    // RPE 7–8.5, deliberately below the deep-pump zone. The old 1-on-1-off at
    // RPE 8.5–9.5 straddled the band boundary.
    return {
      sessionId: 'thu-6060-threshold',
      label: '60/60 threshold intervals (Build)',
      energySystem: 'Aerobic power',
      exercises: [
        { kind:'circuit', name: '60/60 intervals', prescribed: '60s moderately hard climbing / 60s rest · 10–30 min total · stop before the deep pump (never above 8.5)', rpeRange: [7, 8.5], prescribedTarget: { value: 20, unit: 'min' } }
      ]
    };
  }
  if (phase === 'peak') {
    // ADR-0006 band 2 — anaerobic-lactic sharpening, only inside the final ≤4
    // weeks (which Peak always is), density-progressed toward the goal date.
    const rest = densityRest(weeksLeft, 240) || '4:00';
    return {
      sessionId: 'thu-3030-lactic',
      label: '30/30 lactic sharpening (Peak)',
      energySystem: 'Anaerobic lactic',
      exercises: [
        { kind:'circuit', name: '30/30 intervals', prescribed: `30s all-out / 30s rest × 6 = 1 set · ${rest} between sets · 2–3 sets · deep pump expected, stop when movement degrades`, rpeRange: [9.5, 10], prescribedTarget: { value: 2, unit: 'sets' },
          howto: 'All-out 30s bursts, full 30s rest, 6 = 1 set. Expect a deep pump — that\'s the point. Stop the session when movement quality degrades.' }
      ]
    };
  }
  // taper
  return {
    sessionId: 'thu-projects',
    label: 'Project routes (Taper)',
    energySystem: 'Sport-specific',
    exercises: [
      { kind:'route', name: 'Project / redpoint attempts', prescribed: '2–3 quality goes on a project · 20+ min rest between goes', rpeRange: [9, 9.5], prescribedTarget: { value: 2, unit: 'goes' },
        howto: 'A few quality, well-rested goes on your project. Stop while still fresh — don’t grind out fatigued attempts.' }
    ]
  };
}

function buildSatMain(phase, flavor, isDeload, weeksLeft = null) {
  if (flavor === 'boulder') {
    if (phase === 'peak') {
      return {
        sessionId: 'sat-proj-boulder',
        label: 'Project boulder session',
        energySystem: 'Strength / Power',
        exercises: [
          { kind: 'limit-boulder', name: 'Project attempts', prescribed: '1–3 hard problems · max 5 quality attempts each · 5+ min rest · stop when power drops', rpeRange: [9, 9.5], prescribedTarget: { value: 2, unit: 'problems' } },
          { kind: 'boulder', name: 'Flash/onsight attempts', prescribed: '3–5 problems at 1 grade below max · full rest between attempts', rpeRange: [8, 9], prescribedTarget: { value: 4, unit: 'problems' } }
        ]
      };
    }
    if (phase === 'taper') {
      return {
        sessionId: 'sat-volume-down',
        label: 'Low volume bouldering (Taper)',
        energySystem: 'Maintenance',
        exercises: [
          { kind: 'boulder', name: 'Fun submaximal bouldering', prescribed: '45–60 min at 2–3 grades below max · no projecting', rpeRange: [6, 7.5], prescribedTarget: { value: 50, unit: 'min' },
            howto: 'Easy, fun mileage well below max. No projecting — this is about staying sharp and fresh, not building fitness.' }
        ]
      };
    }
    // base / build — single-system session (ADR-0006): the capacity circuit is
    // the work; open-climb mileage is explicitly optional cool-down volume.
    const triplesRest = densityRest(weeksLeft, 240) || '4 min';
    return {
      sessionId: 'sat-boulder-triples',
      label: 'Boulder triples + open climb',
      energySystem: 'Anaerobic capacity',
      exercises: [
        // KG-B7 / ADR-0006 addendum: grade corrected "1–2" → "2–3 grades below max" —
        // 1–2 below collapsed the intensity gap with dedicated limit bouldering,
        // losing the distinct power-endurance "engine" stimulus this format needs.
        { kind:'circuit', name: 'Boulder triples (4×4)', prescribed: `4 boulders · climbed back-to-back · ${triplesRest} rest · 3–4 sets · 2–3 grades below max`, rpeRange: [8.5, 9.5], prescribedTarget: { value: 4, unit: 'sets' } },
        { kind:'open-climb', name: 'Open climbing (technique)', prescribed: '30–45 min mileage on submax problems', rpeRange: [6, 7.5], optional: true, prescribedTarget: { value: 40, unit: 'min' } }
      ]
    };
  }
  // sport
  if (phase === 'base') {
    return {
      sessionId: 'sat-arc',
      label: 'ARC — aerobic base',
      energySystem: 'Aerobic base',
      exercises: [
        // KG-B8: "@ 60–70% effort" dropped — it contradicted both published ARC
        // intensity (10–40% of max) and this line's own RPE 4–6. RPE + "just
        // below pump" already carry ARC's easy-sustained-pump intent precisely.
        { kind:'arc', name: 'ARC (continuous easy climbing)', prescribed: '2 × 30 min, just below pump · 10 min rest between sets · OR 90 min easy laps', rpeRange: [4, 6], prescribedTarget: { value: 30, unit: 'min' } }
      ]
    };
  }
  if (phase === 'build') {
    // Band-1 anaerobic-capacity work; rest tightens 5s/week once inside the
    // final 4 weeks of the cycle (ADR-0006 density progression).
    const rest = densityRest(weeksLeft, 240) || '4 min';
    return {
      sessionId: 'sat-4x4-build',
      label: '4×4 power-endurance (Build)',
      energySystem: 'Anaerobic capacity',
      exercises: [
        { kind: 'circuit', name: '4×4 circuits', prescribed: `4 routes/links back-to-back · ${rest} rest · 3 sets · at 50–60% redpoint`, rpeRange: [8.5, 9.5], prescribedTarget: { value: 3, unit: 'sets' } }
      ]
    };
  }
  if (phase === 'peak') {
    return {
      sessionId: 'sat-redpoint-peak',
      label: 'Redpoint session (Peak)',
      energySystem: 'Sport-specific',
      exercises: [
        { kind: 'route', name: 'Redpoint attempts', prescribed: '2–4 quality redpoint attempts · 20+ min rest between goes', rpeRange: [9, 9.5], prescribedTarget: { value: 3, unit: 'attempts' } }
      ]
    };
  }
  // taper (and any other phase)
  return {
    sessionId: 'sat-route-mileage',
    label: 'Sport route mileage',
    energySystem: 'Aerobic power',
    exercises: [
      { kind:'route', name: 'Route mileage', prescribed: '6–10 routes 1–2 grades below redpoint, walking rest', rpeRange: [7, 8.5], prescribedTarget: { value: 8, unit: 'routes' } }
    ]
  };
}

// Retest replaces Mon main on retest deload weeks.
function buildRetestSession() {
  return {
    sessionId: 'mon-retest',
    label: 'Re-test benchmarks',
    energySystem: 'Test',
    isRetest: true,
    exercises: [
      { kind:'test', name: 'Max 10s hang on 20mm edge', prescribed: 'find heaviest 10s hold (RPE 9.5 cap) · 3–5 min rest between attempts' },
      { kind:'test', name: '1RM weighted pull-up', prescribed: 'work up to 1 hard rep · 3–5 min rest between attempts' },
      { kind:'test', name: 'Max boulder grade today', prescribed: 'flash/send the hardest you can in 60 min' },
      { kind:'test', name: '(optional) Forearm repeater test', prescribed: '7/3 to failure on 20mm @ BW', optional: true }
    ]
  };
}

// ============== Tuesday skill drills (KG-A9 + addendum) ==============
// Catalog lives in js/drills.js (shared with js/warmup.js's Thu/Sat warm-up
// picker); imported above, re-exported below for callers that still import
// SKILL_DRILLS from this module.

// Light / rest / optional templates
const LIGHT_DAY = {
  sessionId: 'light',
  label: 'Light: mobility or skill drills',
  energySystem: '—',
  exercises: [
    { kind:'mobility', name: '15–20 min mobility', prescribed: 'shoulders, hips, wrists' },
    { kind:'skill', name: 'Skill drill (optional, no fingers)', prescribed: 'pick one drill to focus on today', drills: SKILL_DRILLS, optional: true }
  ]
};

const REST_DAY = {
  sessionId: 'rest',
  label: 'Rest day',
  energySystem: '—',
  isRest: true,
  recoveryChecklist: [
    'Sleep 8h target',
    'Hydration + protein with each meal',
    'Optional 20–30 min easy walk / bike / swim',
    '5–10 min mobility (hips, shoulders, wrists)',
    'No hangboard, no climbing'
  ]
};

// ============== Deload volume cut (Lattice-style) ==============
// Lattice's published deload rule: "drop volume 40–60%, keep intensity."
// We apply this by halving prescribedSets (min 1) on loaded exercises, and
// annotating prescribed-text-only exercises with a "drop a set" note.
// Intensity (kg %) is NOT scaled — see docs/adr/0003-deload-as-volume-cut.md.
const DELOAD_VOLUME_MULTIPLIER = 0.6; // keep 60% of sets

// Gym-ready spec (docs/specs/gym-ready-prescription-format-spec.md §5): scale a
// climbing-kind exercise's concrete prescribedTarget the same way prescribedSets
// is cut, producing a real integer instead of a vague "drop ~40%" note. Count
// units floor to a whole number (min 1); the 'min' duration unit rounds to the
// nearest 5.
function scaleTarget(target) {
  if (!target) return target;
  if (target.unit === 'min') {
    const scaled = Math.max(5, Math.round((target.value * DELOAD_VOLUME_MULTIPLIER) / 5) * 5);
    return { value: scaled, unit: target.unit };
  }
  return { value: Math.max(1, Math.floor(target.value * DELOAD_VOLUME_MULTIPLIER)), unit: target.unit };
}

function applyDeloadVolume(session) {
  if (!session?.exercises) return session;
  const out = { ...session, exercises: session.exercises.map(applyDeloadToExercise) };
  out.deloadNote = 'Deload week — volume cut ~40%, intensity held.';
  return out;
}

function applyDeloadToExercise(ex) {
  if (!ex) return ex;
  const next = { ...ex };
  if (typeof next.prescribedSets === 'number' && next.prescribedSets > 1) {
    next.prescribedSets = Math.max(1, Math.floor(next.prescribedSets * DELOAD_VOLUME_MULTIPLIER));
  }
  if (next.prescribedTarget) {
    next.originalTarget = next.prescribedTarget;
    next.prescribedTarget = scaleTarget(next.prescribedTarget);
  }
  if (next.kind === 'antagonist-block' && Array.isArray(next.items)) {
    next.items = next.items.map(i => ({ ...i, prescribed: appendDeloadNote(i.prescribed) }));
  }
  // Climbing-kind exercises now show the concrete scaled prescribedTarget
  // instead — appending the vague "drop ~40% volume" suffix to their text
  // would restate the same information less precisely.
  if (typeof next.prescribed === 'string' && !next.prescribedTarget) next.prescribed = appendDeloadNote(next.prescribed);
  if (typeof next.sets === 'string')       next.sets       = appendDeloadNote(next.sets);
  return next;
}

function appendDeloadNote(text) {
  if (!text) return text;
  if (/deload/i.test(text)) return text;
  return text + ' · Deload: drop ~40% volume';
}

// ============== Base aerobic volume ramp (ADR-0009) ==============
// Verified base-phase shape (research § Base): ramp volume across the hard
// weeks of an aerobic mesocycle, then a recovery microcycle halves it. The
// existing deload cut IS that recovery step, so the ramp applies only to hard
// (non-deload, non-retest) Base weeks and always scales the unramped template.
const BASE_RAMP_PER_WEEK = 0.10;
const BASE_RAMP_CAP = 1.30;

// 1-based position of weekIdx among the *hard* weeks of its phase run
// (restarts per Base run in double-block cycles); null when the week is
// itself a deload/retest week or out of range.
export function hardPhasePos(pattern, weekIdx) {
  const i = weekIdx - 1;
  const cur = pattern[i];
  if (!cur || cur.deload || cur.retest) return null;
  let pos = 0;
  for (let j = i; j >= 0 && pattern[j].phase === cur.phase; j--) {
    if (!pattern[j].deload && !pattern[j].retest) pos++;
  }
  return pos;
}

// Upward counterpart of scaleTarget: counts round to nearest whole (min 1),
// 'min' durations round to the nearest 5.
function scaleTargetUp(target, mult) {
  if (!target) return target;
  if (target.unit === 'min') {
    return { value: Math.max(5, Math.round((target.value * mult) / 5) * 5), unit: target.unit };
  }
  return { value: Math.max(1, Math.round(target.value * mult)), unit: target.unit };
}

function applyBaseVolumeRamp(session, pos) {
  if (!session?.exercises || pos == null || pos <= 1) return session;
  // Aerobic sessions only (route pyramid, ARC). Anaerobic Base sessions are
  // deliberately excluded — ramping the mis-phased Base triples would compound
  // open KG-B12; when that closes, the energySystem gate picks up its
  // replacement automatically.
  if (!/^aerobic/i.test(session.energySystem || '')) return session;
  const mult = Math.min(BASE_RAMP_CAP, 1 + BASE_RAMP_PER_WEEK * (pos - 1));
  if (mult <= 1) return session;
  const out = {
    ...session,
    exercises: session.exercises.map(ex => {
      if (!ex || ex.optional || !ex.prescribedTarget) return ex;
      // rampedFrom, not originalTarget — the views render originalTarget as a
      // struck-through "Deload target"; a ramp is the opposite direction.
      return { ...ex, rampedFrom: ex.prescribedTarget, prescribedTarget: scaleTargetUp(ex.prescribedTarget, mult) };
    })
  };
  out.rampNote = `Base hard week ${pos} — aerobic volume +${Math.round((mult - 1) * 100)}%.`;
  return out;
}

// ADR-0007: the taper is a step volume cut with intensity held — the same
// mechanics as a deload week, but labelled as the taper so the athlete knows
// this is sharpening, not recovery. Loads stay near peak (see HANGBOARD.taper).
function applyTaperVolume(session) {
  if (!session?.exercises) return session;
  const out = {
    ...session,
    exercises: session.exercises.map(ex => {
      if (!ex) return ex;
      const next = { ...ex };
      if (typeof next.prescribedSets === 'number' && next.prescribedSets > 1) {
        next.prescribedSets = Math.max(1, Math.floor(next.prescribedSets * DELOAD_VOLUME_MULTIPLIER));
      }
      if (next.prescribedTarget) {
        next.originalTarget = next.prescribedTarget;
        next.prescribedTarget = scaleTarget(next.prescribedTarget);
      }
      return next;
    })
  };
  out.taperNote = 'Taper — volume cut, intensity held. Short, crisp, stop fresh.';
  return out;
}

// ===== Public API =====
export const Program = {
  PHASE_PATTERN,
  HANGBOARD,
  ANTAGONIST_BLOCK,
  SKILL_DRILLS,
  DEFAULT_CYCLE_WEEKS,
  MIN_CYCLE_WEEKS,
  MAX_CYCLE_WEEKS,

  weekFlavor,
  buildPhasePattern,
  cycleDays,
  clampCycleWeeks,

  // Resolve cycleWeeks from settings (default to DEFAULT_CYCLE_WEEKS).
  cycleWeeksOf(settings) {
    return clampCycleWeeks(settings?.cycleWeeks ?? DEFAULT_CYCLE_WEEKS);
  },

  // Per-plan phase pattern.
  phasePattern(settings) {
    return buildPhasePattern(this.cycleWeeksOf(settings), settings?.peakType);
  },

  // Given a comp/peak date (ISO YYYY-MM-DD) and cycle length (weeks), returns the
  // cycle start date that places the final cycle day on the comp date.
  computeStartFromComp(compDateIso, cycleWeeks = DEFAULT_CYCLE_WEEKS) {
    if (!compDateIso) return null;
    const d = new Date(compDateIso + 'T00:00:00');
    d.setDate(d.getDate() - (cycleDays(cycleWeeks) - 1));
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    // Snap to Monday so weekIdx always aligns with calendar weeks (C1).
    return snapToMonday(`${d.getFullYear()}-${m}-${day}`);
  },

  // Resolve the effective cycle start date based on settings.anchorMode + cycleWeeks.
  // Always snapped to Monday so all days in a calendar week share the same weekIdx (C1).
  // In startDate mode, settings.scheduleShiftDays (ADR-0008) pushes the start forward to
  // absorb a missed-session gap; ignored in compDate mode where the goal date is fixed.
  effectiveStart(settings) {
    if (!settings) return null;
    if (settings.anchorMode === 'compDate' && settings.compDate) {
      return this.computeStartFromComp(settings.compDate, this.cycleWeeksOf(settings));
    }
    if (!settings.startDate) return null;
    const base = snapToMonday(settings.startDate);
    const shift = Number(settings.scheduleShiftDays) || 0;
    // Re-snap after shifting so C1 holds even if a non-multiple-of-7 shift is ever stored.
    return shift > 0 ? snapToMonday(addDays(base, shift)) : base;
  },

  // Returns {weekIdx 1..N, dayIdx 0..6, phase, deload, retest, flavor, slot} for a given date relative to startDate.
  // cycleWeeks defaults to 12 for back-compat with callers that haven't been updated.
  // peakType (ADR-0007) shapes the taper length; omitted → 'comp'.
  resolveDate(dateStr, startDateStr, cycleWeeks = DEFAULT_CYCLE_WEEKS, peakType = 'comp') {
    if (!startDateStr) return null;
    const start = new Date(startDateStr + 'T00:00:00');
    const d = new Date(dateStr + 'T00:00:00');
    const diffDays = Math.floor((d - start) / 86400000);
    const totalDays = cycleDays(cycleWeeks);
    if (diffDays < 0 || diffDays >= totalDays) return { outOfCycle: true, diffDays };
    const pattern = buildPhasePattern(cycleWeeks, peakType);
    const weekIdx = Math.floor(diffDays / 7) + 1;
    const dayInWeek = diffDays % 7; // 0=Mon
    const dow = d.getDay();
    const slot = DOW_TO_SLOT[dow];
    const ph = pattern[weekIdx - 1];
    // Coach-review §8: on a Sunday, look ahead to tomorrow's (Monday's) phase
    // slot so the sun-optional session can carry a "heavy fingers tomorrow"
    // hint. Weeks are always Monday-anchored (effectiveStart is snapped to
    // Monday — C1), so tomorrow always falls in the very next pattern entry —
    // no second date resolve needed.
    let preHeavyMonday = false;
    if (dow === 0) {
      const tomorrowPh = pattern[weekIdx]; // weekIdx is 1-based; pattern[weekIdx] = next week's entry
      preHeavyMonday = !!tomorrowPh && (tomorrowPh.phase === 'build' || tomorrowPh.phase === 'peak') && !tomorrowPh.deload && !tomorrowPh.retest;
    }
    return {
      weekIdx,
      dayInWeek,
      dow,
      slot,
      diffDays,
      phase: ph.phase,
      deload: !!ph.deload,
      retest: !!ph.retest,
      flavor: weekFlavor(weekIdx),
      isMain: slot === 'mon-main' || slot === 'thu-main' || slot === 'sat-main',
      isRest: slot === 'rest',
      cycleWeeks: clampCycleWeeks(cycleWeeks),
      // Carried so prescribeForContext can rebuild the same phase pattern the
      // resolver used (taper length shifts the Base/Build split — ADR-0009).
      peakType: (peakType === 'trip' || peakType === 'project') ? peakType : 'comp',
      totalDays,
      // Coach-review §8: true only for a Sunday whose following Monday is a
      // non-deload, non-retest Build or Peak main session.
      preHeavyMonday
    };
  },

  // Builds the prescribed session for a given resolved date context (no load resolution yet).
  prescribeForContext(ctx, focus = 'hybrid') {
    const weeks = ctx?.cycleWeeks ?? DEFAULT_CYCLE_WEEKS;
    if (!ctx || ctx.outOfCycle) {
      return { sessionId: 'out-of-cycle', label: `Outside ${weeks}-week cycle`, exercises: [] };
    }
    const { phase, flavor, slot, deload, retest } = ctx;
    const resolvedFlavor = focus === 'hybrid' ? flavor : focus;
    // Full weeks remaining after the current one (final week → 0) — drives the
    // ADR-0006 density progression inside the final 4 weeks.
    const weeksLeft = ctx.weekIdx != null ? weeks - ctx.weekIdx : null;

    // ADR-0007: mandatory full rest the day before the goal/comp day, whatever
    // weekday it lands on — arrive fresh.
    if (ctx.diffDays === ctx.totalDays - 2) {
      return {
        ...REST_DAY,
        sessionId: 'rest-pre-goal',
        label: 'Full rest — goal day tomorrow',
        phase, flavor: resolvedFlavor, focus, deload, retest, weekIdx: ctx.weekIdx, cycleWeeks: weeks
      };
    }

    if (slot === 'rest') return REST_DAY;
    if (slot === 'tue-light') return LIGHT_DAY;
    if (slot === 'sun-optional') {
      const session = {
        sessionId: 'sun-optional',
        label: 'Optional: easy open climb or rest',
        energySystem: 'Aerobic base / —',
        exercises: [
          { kind:'open-climb', name: 'Easy open climbing (optional)', prescribed: '45–90 min mileage well below max', rpeRange: [4, 6], optional: true, prescribedTarget: { value: 60, unit: 'min' } }
        ]
      };
      // Coach-review §8: athlete agency is preserved — the prescription and
      // optional status are untouched; this is a hint only, surfaced when
      // tomorrow is a hard (non-deload/retest) Build or Peak Monday.
      if (ctx.preHeavyMonday) {
        session.sunHint = 'Heavy fingers tomorrow — consider keeping this under ~60 minutes of easy mileage.';
      }
      return session;
    }

    let session;
    if (slot === 'mon-main') {
      if (deload && retest) session = buildRetestSession();
      else session = buildMonHangboard(phase, deload, focus);
    } else if (slot === 'thu-main') {
      session = buildThuMain(phase, resolvedFlavor, deload, weeksLeft);
    } else if (slot === 'sat-main') {
      session = buildSatMain(phase, resolvedFlavor, deload, weeksLeft);
    } else {
      session = LIGHT_DAY;
    }

    // ADR-0009: Base aerobic volume ramp across the hard weeks of the phase.
    // Mutually exclusive with the deload cut below (hardPhasePos returns null
    // on deload/retest weeks), so the deload always cuts the unramped template.
    if (phase === 'base' && !deload && !retest) {
      const pattern = buildPhasePattern(weeks, ctx.peakType);
      session = applyBaseVolumeRamp(session, hardPhasePos(pattern, ctx.weekIdx));
    }

    // Apply Lattice-style volume cut on deload weeks (not for retest — that has its own structure).
    if (deload && !retest && !session.isRest) {
      session = applyDeloadVolume(session);
    }
    // ADR-0007: the taper is a step volume cut with intensity held — same
    // machinery as a deload, taper-flavored note.
    if (phase === 'taper' && !session.isRest) {
      session = applyTaperVolume(session);
    }

    return { ...session, phase, flavor: resolvedFlavor, focus, deload, retest, weekIdx: ctx.weekIdx, cycleWeeks: weeks };
  },

  // Primary entry point: builds a session from a plan object and an ISO date string.
  build(plan, dateISO) {
    const start = this.effectiveStart(plan?.settings);
    const ctx = this.resolveDate(dateISO, start, this.cycleWeeksOf(plan?.settings), plan?.settings?.peakType);
    return this.prescribeForContext(ctx, plan?.focus || 'hybrid');
  }
};
