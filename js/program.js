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
  // ADR-0013: total-system-load convention — this is the Lattice band's
  // lower end ("first trying max hangs"), a real intro at last (true
  // intensity was ~90–93% under the old added-only math).
  loadPctRange: [0.80, 0.85]
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
    // ADR-0013: total-system-load convention — Lattice band mid, consistent
    // with the existing RPE 8–9 / "1–2s in reserve" cue.
    loadPctRange: [0.87, 0.92]
  },
  peak: {
    name: '7-53 protocol',
    hang: '7s weighted',
    rest: '53s within set, 3 min between sets',
    sets: '3 hangs × 3–4 sets',
    prescribedSets: 3, prescribedReps: 3,
    rpeRange: [9, 9.5],
    edge: '20mm',
    // ADR-0013: total-system-load convention — published 7-53 load is
    // near-limit (~97–100% of the 10s max), softened one notch per
    // ADR-0001's standing Peak posture.
    loadPctRange: [0.92, 0.96]
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
    // ADR-0013: total-system-load convention — one notch under Peak, matching
    // "near-peak intensity held" (ADR-0007).
    loadPctRange: [0.90, 0.94]
  }
};

// ============== Antagonist / accessory block ==============
// KG-A7: consensus dosing is 2–3x/week (coaching consensus) — the block used to ride
// only Monday and get dropped entirely on deloads. It now also runs a short
// ~10-min version on Tuesday's light day, and Monday's is volume-cut (not
// dropped) on deload weeks like every other exercise.
const ANTAGONIST_BLOCK = [
  { name: 'Push-ups', prescribed: '3 × 15–25 · 60–90s rest between sets' },
  { name: 'Inverted rows / band cactus', prescribed: '3 × 10–15 · 60–90s rest between sets' },
  { name: 'Wrist extensor curls', prescribed: '3 × 20 · 60s rest between sets' },
  { name: "Farmer's carry", prescribed: '3 × 20–30 steps · 60–90s rest between sets' }
];

// Core used to live as a 5th item buried inside the antagonist-block accordion
// (easy to miss/skip since the block collapses by default and shares one
// notes field across all 5 items). It's promoted to its own Monday exercise
// so it gets a normal card, its own notes, and shows up in the deload-note
// pipeline like any other plain-prescribed exercise (applyDeloadToExercise's
// generic `prescribed` branch, not the antagonist-block-items branch).
//
// Phase-shaped like the hangboard slot (ADR-0005 precedent): Base keeps the
// general anti-extension/anti-rotation holds (plank/HKR/L-sit — this trio is
// what the project's own gathered research recommends for climbers, see
// docs/research/deep-research-report.md). Build/Peak/Taper swap in a
// climbing-specific tension progression instead — coach-review.md's W7 flagged
// the old single "3 sets, 1×/week, no progression" prescription as a token
// (planks plateau within weeks); Lattice's own core-conditioning guidance
// calls for varied planes/tools rather than one static hold, and the tuck
// front lever is a standard graduated progression (negative tuck → tuck →
// advanced tuck → straddle) that builds the hollow-body tension steep
// climbing actually uses, unlike a flat plank.
const CORE_BASE = { kind: 'core', name: 'Core', prescribed: 'choose 1: 3 × 60–90s plank · 3 × 10 HKR · 3 × 10s L-sit · 60s rest between sets' };
const CORE_TENSION = { kind: 'core', name: 'Core', prescribed: 'choose 1: 3 × 10–20s tuck front lever hold · 3 × 8 hanging leg raise to toes · 3 × 10s L-sit · 60s rest between sets · increase hold time or reps week to week as each becomes controlled' };

// ~10-minute Tuesday version — a subset sized for the light day, distinct from
// Monday's full block so a skipped/short session is visible in the logs.
const TUE_ANTAGONIST_BLOCK = [
  { name: 'Wrist extensor curls', prescribed: '3 × 20 · 60s rest between sets' },
  { name: 'Band cactus (external rotation)', prescribed: '2 × 12–15 · 45–60s rest between sets' }
];

// ============== Anti-style prescription cue (KG-A10) ==============
// dominantStyle/dominantAngle are global benchmark fields (js/storage.js,
// defaults 'crimp'/'slight-overhang') collected but read by no prescription
// path. Base/Build boulder-flavor Thu/Sat sessions bias their prescription
// text toward the OPPOSITE profile — text only, the athlete still picks
// their own boulders (docs/knowledge-gaps.md KG-A10, ticket #41).
//
// Grip styles pair by grip mechanics: crimp/pocket are closed-chain, discrete
// -edge/hole grips; sloper/pinch are open-hand or thumb-opposition grips —
// so each pair is the other's anti-style.
const STYLE_OPPOSITES = {
  crimp:  ['sloper', 'pinch'],
  pocket: ['sloper', 'pinch'],
  sloper: ['crimp', 'pocket'],
  pinch:  ['crimp', 'pocket'],
};
const STYLE_LABEL_PLURAL = { crimp: 'crimps', sloper: 'slopers', pinch: 'pinches', pocket: 'pockets' };

// Angles split by steepness into a low-angle half (slab/vert) and an
// overhung half (slight-overhang/steep/roof); each half's anti-style is the
// other half's low-angle or overhung pair respectively.
const ANGLE_OPPOSITES = {
  slab:              ['steep', 'roof'],
  vert:              ['steep', 'roof'],
  'slight-overhang': ['slab', 'vert'],
  steep:             ['slab', 'vert'],
  roof:              ['slab', 'vert'],
};
const ANGLE_LABEL = { slab: 'slab', vert: 'vertical', 'slight-overhang': 'slight overhang', steep: 'steep overhang', roof: 'roof' };

// Builds the anti-style prescription cue, or null when the stored style/angle
// are unset/unrecognised — never guess a cue from incomplete data.
export function buildAntiStyleCue(dominantStyle, dominantAngle) {
  const styleOpp = STYLE_OPPOSITES[dominantStyle];
  const angleOpp = ANGLE_OPPOSITES[dominantAngle];
  if (!styleOpp || !angleOpp) return null;
  const styleText = styleOpp.map(s => STYLE_LABEL_PLURAL[s]).join('/');
  const angleText = angleOpp.map(a => ANGLE_LABEL[a]).join(' or ');
  return `include 2 anti-style problems — ${styleText}, ${angleText}`;
}

// Attaches a session-level styleNote (mirrors the deloadNote/rampNote/
// taperNote precedent) when benchmarks carry a recognised style+angle pair.
function attachStyleNote(session, benchmarks) {
  const cue = buildAntiStyleCue(benchmarks?.dominantStyle, benchmarks?.dominantAngle);
  return cue ? { ...session, styleNote: cue } : session;
}

// ============== Session generators (per slot per phase per flavor) ==============

function pullupPrescription(phase) {
  // NOTE: this field must be named rpeRange, not rpe — Loads.autoAdjust and every
  // rendering path (today.js/log.js) read exercise.rpeRange; a differently-named
  // field is silently ignored (no RPE target shown, autoAdjust always no-ops).
  // ADR-0013: pctRange is now of TOTAL system load (bodyweight + added
  // benchmark) — rep-max relationships (general strength-training convention,
  // not climbing-specific): 5-rep work ≈75–85%, 3-rep ≈84–89%, 2-rep ≈88–93%.
  if (phase === 'base')  return { pctRange: [0.75, 0.82], reps: '5 × 5', rest: '2 min between sets', prescribedSets: 5, prescribedReps: 5, rpeRange: [7, 8.5] };
  if (phase === 'build') return { pctRange: [0.84, 0.89], reps: '5 × 3', rest: '3 min between sets', prescribedSets: 5, prescribedReps: 3, rpeRange: [8.5, 9.5] };
  // Peak capped at 90% 1RM (not 95) for this athlete's shoulder/tendon recovery — ADR-0001.
  // Under total-load math this cap is now literally true (it capped ~97% real
  // intensity under the old added-only math).
  if (phase === 'peak')  return { pctRange: [0.88, 0.90], reps: '5 × 2', rest: '3 min between sets', prescribedSets: 5, prescribedReps: 2, rpeRange: [9, 9.5] };
  // Taper: intensity held near peak, volume cut to a single low-set touch (ADR-0007).
  // KG-B13: authored at full (pre-cut) volume — prescribedSets: 4 here, so
  // applyTaperVolume's ×0.6 cut (the single layer of reduction) lands on the
  // intended final 2 × 2 the `reps` text already states, instead of cutting an
  // already-reduced 2 down to 1.
  return { pctRange: [0.87, 0.90], reps: '2 × 2', rest: '3 min between sets', prescribedSets: 4, prescribedReps: 2, rpeRange: [9, 9.5] }; // taper
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
  // KG-A7: always push the block, even on deload weeks — applyDeloadVolume's
  // existing antagonist-block branch (below) volume-cuts it via a per-item
  // deload note instead of dropping it entirely (isDeload param kept for
  // call-site clarity even though it's no longer read here).
  exercises.push({ ...(phase === 'base' ? CORE_BASE : CORE_TENSION) });
  exercises.push({ kind: 'antagonist-block', name: 'S&C antagonist block', items: ANTAGONIST_BLOCK });
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

// ADR-0006 band 1 exercise content, shared between sport-focus Build Thursday
// (thu-6060-threshold) and hybrid Build's even-week Saturday (ADR-0010,
// sat-6060-threshold) — extracted so the two sessions can never drift apart.
const SIXTY_SIXTY_EXERCISE = { kind:'circuit', name: '60/60 intervals', prescribed: '60s moderately hard climbing / 60s rest · 10–30 min total · stop before the deep pump (never above 8.5)', rpeRange: [7, 8.5], prescribedTarget: { value: 20, unit: 'min' } };

function buildThuMain(phase, flavor, isDeload, weeksLeft = null, peakType = 'comp') {
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
      // KG-A13: comp peakType gets a comp-specificity touch instead of more
      // flash-grade mileage — unseen-style problems, single-attempt comp
      // rhythm, no beta rehearsal. Gated on peakType so trip/project tapers
      // (still just sharpening on known grades) are byte-for-byte unchanged.
      if (peakType === 'comp') {
        // Single-cut convention (KG-B13): prescribedTarget authored at the
        // FULL pre-cut volume (6) — applyTaperVolume's single 0.6× cut
        // (floor(6 × 0.6) = 3) lands on the "3–4 problems" the text argues
        // for; don't pre-reduce this number too.
        return {
          sessionId: 'thu-comp-touch-boulder',
          label: 'Comp-format touch — boulder (Taper)',
          energySystem: 'Power',
          exercises: [
            { kind:'boulder', name: 'Unseen-style problems — comp touch', prescribed: '3–4 problems below max · comp round format (~4 min limit, single-attempt rhythm, no beta rehearsal) · full rest between', rpeRange: [7.5, 9], prescribedTarget: { value: 6, unit: 'problems' },
              howto: 'Treat each problem like a single competition go — read, commit, one clean attempt, move on. Short and sharp, not a volume session; stay fresh for comp day.' }
          ]
        };
      }
      // KG-B13: prescribedTarget authored at full pre-cut volume (14) so
      // applyTaperVolume's single ×0.6 cut lands the target at the intended
      // 8 problems the "6–10" text already argues for.
      return {
        sessionId: 'thu-flash',
        label: 'Flash-grade boulders (Taper)',
        energySystem: 'Power',
        exercises: [
          { kind:'boulder', name: 'Flash-grade boulders', prescribed: '6–10 problems below max · long rest', rpeRange: [7, 8.5], prescribedTarget: { value: 14, unit: 'problems' },
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
    // RPE 8.5–9.5 straddled the band boundary. ADR-0010: the same exercise
    // content also serves hybrid Build's even-week Saturday session
    // (buildSat6060Threshold) via the shared SIXTY_SIXTY_EXERCISE constant so
    // the two sessions can never drift apart.
    return {
      sessionId: 'thu-6060-threshold',
      label: '60/60 threshold intervals (Build)',
      energySystem: 'Aerobic power',
      exercises: [{ ...SIXTY_SIXTY_EXERCISE }]
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
  // KG-A13: comp peakType gets a comp-specificity touch instead of more
  // project/redpoint goes on a known route — brief onsight-style attempts
  // on unfamiliar routes, no beta rehearsal. Gated on peakType so trip/project
  // tapers (still projecting a known line) are byte-for-byte unchanged.
  if (peakType === 'comp') {
    // Single-cut convention (KG-B13): prescribedTarget authored at the FULL
    // pre-cut volume (4) — applyTaperVolume's single 0.6× cut
    // (floor(4 × 0.6) = 2) lands on the "2–3 routes" the text argues for;
    // don't pre-reduce this number too.
    return {
      sessionId: 'thu-comp-touch-sport',
      label: 'Comp-format touch — sport (Taper)',
      energySystem: 'Sport-specific',
      exercises: [
        { kind:'route', name: 'Unseen-route touches — comp touch', prescribed: '2–3 routes, ideally unfamiliar · brief preview only (no beta rehearsal), one attempt each · full rest between', rpeRange: [8, 9], prescribedTarget: { value: 4, unit: 'routes' },
          howto: 'Simulate the comp read-and-go rhythm on routes you haven\'t worked — one committed attempt, no rehearsing moves. Stay sharp, not fatigued.' }
      ]
    };
  }
  // KG-B13: prescribedTarget authored at full pre-cut volume (4) so
  // applyTaperVolume's single ×0.6 cut lands at the intended 2 goes the
  // "2–3 quality goes" text already argues for (was shipping as 1).
  return {
    sessionId: 'thu-projects',
    label: 'Project routes (Taper)',
    energySystem: 'Sport-specific',
    exercises: [
      { kind:'route', name: 'Project / redpoint attempts', prescribed: '2–3 quality goes on a project · 20+ min rest between goes', rpeRange: [9, 9.5], prescribedTarget: { value: 4, unit: 'goes' },
        howto: 'A few quality, well-rested goes on your project. Stop while still fresh — don’t grind out fatigued attempts.' }
    ]
  };
}

// ADR-0010: hybrid Build's even-week Saturday session — the 60/60 threshold
// band moved here from sport-focus Thursday so it lands weekly (alternating
// with odd-week sat-boulder-triples) instead of fortnightly in hybrid mode.
// Same exercise content as thu-6060-threshold (shared SIXTY_SIXTY_EXERCISE);
// no densityRest wiring, matching that session (band-1 60/60 carries no
// density string today).
function buildSat6060Threshold() {
  return {
    sessionId: 'sat-6060-threshold',
    label: '60/60 threshold intervals (Build, Sat)',
    energySystem: 'Aerobic power',
    exercises: [{ ...SIXTY_SIXTY_EXERCISE }]
  };
}

function buildSatMain(phase, flavor, isDeload, weeksLeft = null, peakType = 'comp') {
  if (flavor === 'boulder') {
    if (phase === 'peak') {
      // KG-A13: comp peakType swaps the Peak Saturday project session for a
      // comp-format simulation — unseen problems, timed rounds, limited
      // attempts, no beta rehearsal — instead of repeated project attempts
      // on a known line. Gated on peakType so trip/project peaks (still
      // projecting known problems toward a send) are byte-for-byte unchanged.
      // Peak phase is never a deload week (buildPhasePattern always sets
      // deload:false for 'peak'), so no volume-cut interaction to worry about.
      if (peakType === 'comp') {
        return {
          sessionId: 'sat-comp-sim-boulder',
          label: 'Boulder comp simulation (Peak)',
          energySystem: 'Strength / Power',
          exercises: [
            { kind: 'limit-boulder', name: 'Unseen problems — comp rounds', prescribed: '4–5 unseen (or long-unseen) problems · one round each, ~4 min limit · max 4–5 attempts per problem, no beta rehearsal · full rest between rounds', rpeRange: [8.5, 9.5], prescribedTarget: { value: 4, unit: 'problems' } }
          ]
        };
      }
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
      // KG-B13: prescribedTarget authored at full pre-cut volume (80) so
      // applyTaperVolume's single ×0.6 cut lands at the intended 50 min the
      // "45–60 min" text already argues for.
      return {
        sessionId: 'sat-volume-down',
        label: 'Low volume bouldering (Taper)',
        energySystem: 'Maintenance',
        exercises: [
          { kind: 'boulder', name: 'Fun submaximal bouldering', prescribed: '45–60 min at 2–3 grades below max · no projecting', rpeRange: [6, 7.5], prescribedTarget: { value: 80, unit: 'min' },
            howto: 'Easy, fun mileage well below max. No projecting — this is about staying sharp and fresh, not building fitness.' }
        ]
      };
    }
    if (phase === 'base') {
      // KG-B12: high-volume flash pyramid replaces the anaerobic-capacity 4×4
      // triples in Base — the triples' RPE 8.5–9.5 density work matches Build
      // intensity (ADR-0006 band boundaries), not a Base aerobic mesocycle.
      // energySystem 'Aerobic capacity' lets ADR-0009's Base volume ramp pick
      // this session up automatically; the triples remain Build-only below,
      // where the density-rest progression already lives.
      return {
        sessionId: 'sat-flash-pyramid',
        label: 'Flash pyramid (Base)',
        energySystem: 'Aerobic capacity',
        exercises: [
          { kind:'boulder', name: 'Flash pyramid', prescribed: '15–20 problems well below max · pyramid up and down through 2–3 grades · brief rest between problems', rpeRange: [6, 7.5], prescribedTarget: { value: 18, unit: 'problems' },
            howto: 'Climb a high volume of problems 2–3 grades below your flash level, pyramiding up and down through that grade band. Rest just enough to reset between problems — this is mileage and movement quality, not projecting. Stay comfortably hard throughout.' }
        ]
      };
    }
    // build — single-system session (ADR-0006): the capacity circuit is
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
    // KG-A13: comp peakType swaps the Peak Saturday redpoint session for a
    // lead-comp simulation — unseen route, brief preview only, single
    // attempt — instead of repeated redpoint goes on a known project. Gated
    // on peakType so trip/project peaks are byte-for-byte unchanged. Peak
    // phase is never a deload week, so no volume-cut interaction here.
    if (peakType === 'comp') {
      return {
        sessionId: 'sat-comp-sim-sport',
        label: 'Lead comp simulation (Peak)',
        energySystem: 'Sport-specific',
        exercises: [
          { kind: 'route', name: 'Unseen routes — single-attempt simulation', prescribed: '2–3 unseen (or long-unseen) routes · brief preview only, no beta rehearsal · one redpoint-style attempt each · full rest between routes', rpeRange: [9, 9.5], prescribedTarget: { value: 2, unit: 'routes' } }
        ]
      };
    }
    return {
      sessionId: 'sat-redpoint-peak',
      label: 'Redpoint session (Peak)',
      energySystem: 'Sport-specific',
      exercises: [
        { kind: 'route', name: 'Redpoint attempts', prescribed: '2–4 quality redpoint attempts · 20+ min rest between goes', rpeRange: [9, 9.5], prescribedTarget: { value: 3, unit: 'attempts' } }
      ]
    };
  }
  // taper (and any other phase) — KG-B13: prescribedTarget authored at full
  // pre-cut volume (14) so applyTaperVolume's single ×0.6 cut lands at the
  // intended 8 routes the "6–10" text already argues for.
  return {
    sessionId: 'sat-route-mileage',
    label: 'Sport route mileage',
    energySystem: 'Aerobic power',
    exercises: [
      { kind:'route', name: 'Route mileage', prescribed: '6–10 routes 1–2 grades below redpoint, walking rest', rpeRange: [7, 8.5], prescribedTarget: { value: 14, unit: 'routes' } }
    ]
  };
}

// ADR-0012: post-goal retest slot — unconditional, in the out-of-cycle
// window immediately after the goal/comp day (goal day +1..+7). Maximum-
// validity measurement (tapered, peaked, zero further training cost since
// the cycle is over): max hang mandatory, pull-up 1RM optional (the athlete
// may not want a second max-effort test the same day). Feeds cycle N+1's
// starting benchmark and the end-of-cycle review checklist.
function buildPostGoalRetestSession() {
  return {
    sessionId: 'post-goal-retest',
    label: 'Post-goal retest',
    energySystem: 'Test',
    isRetest: true,
    exercises: [
      { kind:'test', name: 'Max 10s hang on 20mm edge', prescribed: 'find heaviest 10s hold (RPE 9.5 cap) · 3–5 min rest between attempts' },
      { kind:'test', name: '1RM weighted pull-up', prescribed: 'work up to 1 hard rep · 3–5 min rest between attempts', optional: true }
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
    { kind:'skill', name: 'Skill drill (optional, no fingers)', prescribed: 'pick one drill to focus on today', drills: SKILL_DRILLS, optional: true },
    // KG-A7: 2x/week antagonist/shoulder dosing — a short ~10-min version here,
    // distinct from Monday's full block, so the block never disappears entirely.
    { kind: 'antagonist-block', name: 'Tuesday antagonist/shoulder block', items: TUE_ANTAGONIST_BLOCK }
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
// nearest 5. mult defaults to the deload cut but is parameterized so ADR-0015's
// readiness "Lighter" scaling (×0.85) can reuse the same downward rounding
// convention.
function scaleTarget(target, mult = DELOAD_VOLUME_MULTIPLIER) {
  if (!target) return target;
  if (target.unit === 'min') {
    const scaled = Math.max(5, Math.round((target.value * mult) / 5) * 5);
    return { value: scaled, unit: target.unit };
  }
  return { value: Math.max(1, Math.floor(target.value * mult)), unit: target.unit };
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

// ADR-0012: identifies the first week of ANY Build run — both blocks of a
// double-block cycle qualify ("fires on … the second block of double-block
// cycles" per the ADR); the >4-week staleness gate is what keeps the slot
// silent when a recent retest already refreshed the benchmark. Used to gate
// the staleness-gated micro-retest warm-up step.
export function isBuildRunStart(pattern, weekIdx) {
  const cur = pattern[weekIdx - 1];
  if (!cur || cur.phase !== 'build') return false;
  return weekIdx === 1 || pattern[weekIdx - 2].phase !== 'build';
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
  // Aerobic sessions only (route pyramid, ARC, and — since KG-B12 closed —
  // the Base boulder-Saturday flash pyramid). Anaerobic Base sessions are
  // deliberately excluded; the energySystem gate picks up KG-B12's flash
  // pyramid automatically since it's labelled 'Aerobic capacity'.
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

// ============== Readiness gating for climbing sessions (ADR-0015) ==============
// Extends the readiness signal (already modulating hangboard/pullup kg via
// Loads.resolveEffective) to climbing (non-kg) kinds, which previously got
// zero same-day modulation despite carrying the highest injury/overreach
// exposure. Downward-only, matching ADR-0009's asymmetric posture (Push is a
// no-op for climbing here — controlled upward progression already belongs
// to the kg-side progression engine). Both constants are app conventions,
// unvalidated (KG-C7 posture) — they inherit the readiness multiplier's
// existing convention status rather than adding new ones.
const READINESS_LIGHTER_MULTIPLIER = 0.85;
const READINESS_RPE_CAP = 8.5;
const READINESS_RPE_CAP_NOTE = 'today: stay ≤8.5, stop at first quality drop';
const CLIMBING_KINDS = new Set(['boulder', 'route', 'circuit', 'arc', 'open-climb', 'limit-boulder', 'campus']);

// Scales climbing-kind prescribedTarget ×0.85 (deload's rounding rules) and
// caps any climbing exercise whose rpeRange tops out above 8.5 with a note —
// campus/limit-boulder are the kinds this actually catches (their sport-
// climbing-kind siblings don't run that hot outside Peak/PE work). Hangboard/
// pullup are untouched here; their readiness modulation is already the
// existing kg-side readinessMultiplier in Loads.resolveEffective.
function applyReadinessLighter(session) {
  if (!session?.exercises) return session;
  const out = {
    ...session,
    exercises: session.exercises.map(ex => {
      if (!ex || !CLIMBING_KINDS.has(ex.kind)) return ex;
      const next = { ...ex };
      if (next.prescribedTarget) {
        next.readinessScaledFrom = next.prescribedTarget;
        next.prescribedTarget = scaleTarget(next.prescribedTarget, READINESS_LIGHTER_MULTIPLIER);
      }
      if (Array.isArray(next.rpeRange) && next.rpeRange[1] > READINESS_RPE_CAP) {
        next.readinessCapNote = READINESS_RPE_CAP_NOTE;
      }
      return next;
    })
  };
  out.readinessNote = 'Readiness: lighter — climbing targets scaled ×0.85, cap on higher-intensity work.';
  return out;
}

// The single adopted substitution: Peak-Thursday sport-flavor 30/30 lactic
// (RPE 9.5–10) swaps to the 60/60 threshold template on a Lighter day —
// phase-clean by ADR-0006's own taxonomy (band-1 is legal wherever band-2
// is), and it reuses an already-designed session rather than inventing
// content. The shared SIXTY_SIXTY_EXERCISE constant (ADR-0010) means this
// is byte-identical to whatever Build would prescribe that week.
function applyPeakLacticSwap(session) {
  if (session?.sessionId !== 'thu-3030-lactic') return null;
  return {
    sessionId: session.sessionId,
    label: session.label,
    energySystem: 'Aerobic power',
    exercises: [{ ...SIXTY_SIXTY_EXERCISE }],
    readinessNote: 'Readiness: lighter — swapped 30/30 lactic for 60/60 threshold (ADR-0015).'
  };
}

// ============== Prescription pipeline ==============
// The ordered post-build passes that shape a slot's built session. This used
// to be an unnamed run of if-blocks inside prescribeForContext whose ordering,
// exclusivity, and note semantics lived in scattered comments — now each pass
// declares its firing guard next to its work, and the shared contract is
// stated once:
//
//   • Ordering is the registration order below. The ramp runs before the
//     volume cuts (mutually exclusive by guard — hardPhasePos returns null on
//     deload/retest weeks, so a cut always scales the unramped template); the
//     readiness gate runs last, mirroring where the kg chain applies its own
//     readiness multiplier.
//   • Exactly one volume-cut pass may fire per session (the deload / taper /
//     forced-cut guards are disjoint) — KG-B13's taper templates are authored
//     pre-cut and only display correctly if the cut runs exactly once.
//   • A pass that scales a prescribedTarget records provenance on the
//     exercise: originalTarget (cuts), rampedFrom (ramp), readinessScaledFrom
//     (readiness gate). Views render target provenance from these.
//   • A pass with something to tell the athlete writes its note field
//     (deloadNote / taperNote / rampNote / readinessNote); finishSession
//     collects every note into session.notes[] in pass order. Notes are NOT
//     mutually exclusive — a deload week can also be a Lighter readiness day
//     (ADR-0015) — so views must render the whole array.
//
// Rest / tue-light / sun-optional slots return before the pipeline runs —
// they are pipeline-exempt by construction (a deload cut must never touch
// Tuesday's antagonist block, and the readiness gate has no climbing kinds
// to scale there).
const PRESCRIPTION_PASSES = [
  {
    name: 'anti-style-cue', // KG-A10
    when: (s, env) => (env.slot === 'thu-main' || env.slot === 'sat-main')
      && env.styleFlavor === 'boulder' && (env.phase === 'base' || env.phase === 'build'),
    apply: (s, env) => attachStyleNote(s, env.benchmarks)
  },
  {
    name: 'base-volume-ramp', // ADR-0009
    when: (s, env) => env.phase === 'base' && !env.deload && !env.retest,
    apply: (s, env) => applyBaseVolumeRamp(
      s, hardPhasePos(buildPhasePattern(env.weeks, env.ctx.peakType), env.ctx.weekIdx))
  },
  {
    // Retest weeks are only exempt on Monday (KG-B10) — that's the
    // non-cuttable retest protocol; Thu/Sat retest-week sessions still take
    // the cut, or the athlete tests benchmarks on accumulated fatigue.
    name: 'deload-volume-cut', // ADR-0003/0004
    when: (s, env) => env.deload && !(env.retest && env.slot === 'mon-main') && !s.isRest,
    apply: s => applyDeloadVolume(s)
  },
  {
    name: 'taper-volume-cut', // ADR-0007 — same machinery, taper-flavored note
    when: (s, env) => env.phase === 'taper' && !s.isRest,
    apply: s => applyTaperVolume(s)
  },
  {
    // ADR-0014: the readiness-trend signal's one-tap "accept" — an athlete-
    // triggered early volume cut, reusing the deload mechanism as a pass
    // rather than touching the phase-pattern's deload/retest flags. The guard
    // is what makes it never double-cut an already-cut week.
    name: 'forced-volume-cut',
    when: (s, env) => !!env.overrides?.forceVolumeCut
      && !env.deload && env.phase !== 'taper' && !s.isRest && !s.isRetest,
    apply: s => ({
      ...applyDeloadVolume(s),
      deloadNote: 'Early volume cut — accepted from the readiness-trend signal (ADR-0014).'
    })
  },
  {
    // ADR-0015: readiness gating for climbing sessions. Downward-only:
    // 'push'/'normal'/absent are no-ops. 'suggestRest' with an explicit
    // one-tap accept swaps the whole session for the light template;
    // declining (or not yet answering) falls through to the same Lighter
    // levers 'lighter' gets.
    name: 'readiness-gate',
    when: (s, env) => (env.overrides?.readinessLabel === 'lighter' || env.overrides?.readinessLabel === 'suggestRest')
      && !s.isRest && !s.isRetest,
    apply: (s, env) => {
      if (env.overrides.readinessLabel === 'suggestRest' && env.overrides.acceptRestSwap) {
        return { ...LIGHT_DAY, sessionId: 'readiness-rest-swap', readinessNote: 'Readiness: suggested rest — session swapped for a light day.' };
      }
      return applyPeakLacticSwap(s) || applyReadinessLighter(s);
    }
  }
];

// Note fields collected into session.notes[], in pass order (sunHint last —
// it's written by the sun-optional builder, not a pass).
const NOTE_FIELDS = ['deloadNote', 'taperNote', 'rampNote', 'readinessNote', 'sunHint'];

// Single exit for prescribeForContext: every session leaves as a fresh copy
// (shared constants like REST_DAY/LIGHT_DAY must not escape by reference),
// carries the same ctx-enrichment field skeleton on every in-cycle path, and
// gets notes[] built from whatever note fields the builders/passes wrote.
function finishSession(session, env) {
  const out = { ...session };
  if (env) {
    out.phase = env.phase;
    out.flavor = env.resolvedFlavor;
    out.focus = env.focus;
    out.deload = env.deload;
    out.retest = env.retest;
    out.weekIdx = env.ctx.weekIdx;
    out.cycleWeeks = env.weeks;
  }
  out.notes = NOTE_FIELDS.map(f => out[f]).filter(Boolean);
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
    // Snap to Monday so weekIdx always aligns with calendar weeks (C1).
    return snapToMonday(addDays(compDateIso, -(cycleDays(cycleWeeks) - 1)));
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

  // The one public door for "what cycle context is this date in?" given a
  // plan's settings: derives effectiveStart, the clamped cycleWeeks, and
  // peakType so callers can't forget one of them (resolveDate's silently
  // defaulted peakType yields a comp-shaped pattern — the wrong Base/Build
  // split for trip/project plans, a bug class this wrapper retires). Returns
  // null when the plan has no anchor yet. Views and replan should call this;
  // the positional resolveDate below stays as the internal/test door.
  resolveForSettings(settings, dateISO) {
    const start = this.effectiveStart(settings);
    if (!start) return null;
    return this.resolveDate(dateISO, start, this.cycleWeeksOf(settings), settings?.peakType);
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
    // ADR-0012: totalDays/cycleWeeks carry through even when out of cycle so
    // prescribeForContext can detect the post-goal retest window (goal day
    // +1..+7) without a second date resolve.
    if (diffDays < 0 || diffDays >= totalDays) return { outOfCycle: true, diffDays, totalDays, cycleWeeks: clampCycleWeeks(cycleWeeks) };
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
  // benchmarks (KG-A10, optional): { dominantStyle, dominantAngle } — when supplied with a
  // recognised pair, Base/Build boulder-flavor Thu/Sat sessions get a session-level
  // `styleNote` anti-style cue. Omitted/unrecognised → no cue (back-compat default).
  // overrides (ADR-0014, optional): { forceVolumeCut } — the readiness-trend
  // signal's one-tap accept action.
  prescribeForContext(ctx, focus = 'hybrid', benchmarks = null, overrides = null) {
    const weeks = ctx?.cycleWeeks ?? DEFAULT_CYCLE_WEEKS;
    if (!ctx || ctx.outOfCycle) {
      // ADR-0012: the post-goal retest window — goal day +1 through +7 — is
      // the only out-of-cycle state with real behavior. diffDays/totalDays
      // are only reliable when ctx actually came from resolveDate's
      // out-of-cycle branch (both null-checked; a bare `{outOfCycle:true}`
      // caller shape still falls through to the generic message below).
      if (ctx && ctx.diffDays != null && ctx.totalDays != null) {
        const postGoalOffset = ctx.diffDays - ctx.totalDays; // 0-indexed: 0 = goal day +1
        if (postGoalOffset >= 0 && postGoalOffset <= 6) {
          return finishSession(buildPostGoalRetestSession(), null);
        }
      }
      return finishSession({ sessionId: 'out-of-cycle', label: `Outside ${weeks}-week cycle`, exercises: [] }, null);
    }
    const { phase, flavor, slot, deload, retest } = ctx;
    const resolvedFlavor = focus === 'hybrid' ? flavor : focus;
    // Full weeks remaining after the current one (final week → 0) — drives the
    // ADR-0006 density progression inside the final 4 weeks.
    const weeksLeft = ctx.weekIdx != null ? weeks - ctx.weekIdx : null;
    // ADR-0010: in hybrid Build, fix the energy system per slot instead of
    // letting weekFlavor alternate the whole week — Thursday is always limit
    // bouldering, Saturday alternates boulder-triples (odd/boulder weeks) with
    // the 60/60-threshold session (even/sport weeks). Base, Peak, Taper, and
    // non-hybrid focuses are untouched (KG-B4).
    const hybridBuildMix = focus === 'hybrid' && phase === 'build';
    // KG-A10: Thursday's actual content-flavor follows the hybridBuildMix
    // override (thu-limit is always a boulder/problems session in hybrid
    // Build, even on nominally sport-parity weeks).
    const styleFlavor = (slot === 'thu-main' && hybridBuildMix) ? 'boulder' : resolvedFlavor;
    const env = { ctx, weeks, phase, slot, deload, retest, focus, resolvedFlavor, styleFlavor, benchmarks, overrides };

    // ADR-0007: mandatory full rest the day before the goal/comp day, whatever
    // weekday it lands on — arrive fresh.
    if (ctx.diffDays === ctx.totalDays - 2) {
      return finishSession({
        ...REST_DAY,
        sessionId: 'rest-pre-goal',
        label: 'Full rest — goal day tomorrow'
      }, env);
    }

    // Pipeline-exempt slots (see PRESCRIPTION_PASSES header).
    if (slot === 'rest') return finishSession(REST_DAY, env);
    if (slot === 'tue-light') return finishSession(LIGHT_DAY, env);
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
      return finishSession(session, env);
    }

    let session;
    if (slot === 'mon-main') {
      if (deload && retest) session = buildRetestSession();
      else session = buildMonHangboard(phase, deload, focus);
    } else if (slot === 'thu-main') {
      session = buildThuMain(phase, styleFlavor, deload, weeksLeft, ctx.peakType);
    } else if (slot === 'sat-main') {
      session = (hybridBuildMix && flavor === 'sport')
        ? buildSat6060Threshold()
        : buildSatMain(phase, resolvedFlavor, deload, weeksLeft, ctx.peakType);
    } else {
      session = LIGHT_DAY;
    }

    for (const pass of PRESCRIPTION_PASSES) {
      if (pass.when(session, env)) session = pass.apply(session, env);
    }
    return finishSession(session, env);
  },

  // Primary entry point: builds a session from a plan object and an ISO date string.
  // benchmarks (KG-A10, optional) — see prescribeForContext. ADR-0014: reads
  // settings.earlyVolumeCuts — [{from, to} ISO date ranges, to exclusive] —
  // an accepted readiness-trend signal cuts "the coming week's sessions"
  // (the ADR's words): the 7 days from acceptance, whatever the week
  // boundary, not the already-in-progress calendar week's index.
  // readinessCtx (ADR-0015, optional): { label: 'lighter'|'suggestRest'|'push'|'normal', acceptRestSwap }
  // — label maps from Loads.computeReadinessMultiplier's key; 'push'/'normal'/absent are no-ops.
  build(plan, dateISO, benchmarks = null, readinessCtx = null) {
    const start = this.effectiveStart(plan?.settings);
    const ctx = this.resolveDate(dateISO, start, this.cycleWeeksOf(plan?.settings), plan?.settings?.peakType);
    const forceVolumeCut = !!(ctx && !ctx.outOfCycle
      && Array.isArray(plan?.settings?.earlyVolumeCuts)
      && plan.settings.earlyVolumeCuts.some(r => r && r.from && r.to && dateISO >= r.from && dateISO < r.to));
    return this.prescribeForContext(ctx, plan?.focus || 'hybrid', benchmarks, {
      forceVolumeCut,
      readinessLabel: readinessCtx?.label ?? null,
      acceptRestSwap: !!readinessCtx?.acceptRestSwap
    });
  },

  buildAntiStyleCue,
  isBuildRunStart
};
