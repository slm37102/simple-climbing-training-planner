// Split from the old monolithic tests/index.html — sections preserved
// verbatim and in original order. Cases register via test() from the harness;
// tests/index.html imports every file in tests/cases/ (import order = display
// order) and runs the suite. Unused app imports are harmless — every case
// file carries the same block so moving tests between files stays trivial.
import { test, assert, assertEq, resetStorage, localIso, addIsoDays } from '../harness.js';
import { Storage, newer } from '../../js/storage.js';
import { Program, buildPhasePattern, hardPhasePos, DEFAULT_CYCLE_WEEKS, MIN_CYCLE_WEEKS, MAX_CYCLE_WEEKS } from '../../js/program.js';
import { Loads } from '../../js/loads.js';
import { Warmup } from '../../js/warmup.js';
import { SKILL_DRILLS, DRILL_CATEGORIES, WARMUP_DRILLS } from '../../js/drills.js';
import { Replan, MAJOR_GAP_DAYS } from '../../js/replan.js';
import { limiterReadout } from '../../js/limiter.js';
import { Monitoring } from '../../js/monitoring.js';
import { inputVisibility, repsLabel, actualHasResult, howto, unitLabel } from '../../js/exercise-inputs.js';
import { today as datesToday, addDays as datesAddDays, daysBetween, snapToMonday as datesSnapToMonday } from '../../js/dates.js';
import { renderToday } from '../../js/views/today.js';
import { renderLog }   from '../../js/views/log.js';
import { renderCalendar } from '../../js/views/calendar.js';
import { renderProfile } from '../../js/views/profile.js';

// ─── ADR-0009: intra-phase progression (closes KG-A2, KG-B5, KG-D5) ──────
// Same fixed anchor 2026-05-04 (Mon), 12-wk comp cycle: base wks1–6 with
// deload wk4 + retest wk6 → hard base weeks are 1, 2, 3, 5 (positions 1–4).

test('[ADR-0009] hardPhasePos: counts hard weeks per phase run, null on deload/retest', () => {
  const pattern = buildPhasePattern(12, 'comp');
  assertEq(hardPhasePos(pattern, 1), 1);
  assertEq(hardPhasePos(pattern, 2), 2);
  assertEq(hardPhasePos(pattern, 3), 3);
  assertEq(hardPhasePos(pattern, 4), null, 'wk4 is a deload — no ramp position');
  assertEq(hardPhasePos(pattern, 5), 4);
  assertEq(hardPhasePos(pattern, 6), null, 'wk6 is the retest week');
  assertEq(hardPhasePos(pattern, 7), 1, 'position restarts at the Build boundary');
  assertEq(hardPhasePos(pattern, 9), 3);
});

test('[ADR-0009] Base aerobic ramp: wk2 pyramid 10 → 11 routes, ARC 30 → 35 min, rampNote set', () => {
  const thu = Program.prescribeForContext(Program.resolveDate('2026-05-14', '2026-05-04', 12), 'hybrid');
  assertEq(thu.sessionId, 'thu-route-pyramid');
  const pyramid = thu.exercises.find(e => e.kind === 'route');
  assertEq(pyramid.prescribedTarget, { value: 11, unit: 'routes' }, 'wk2 (hard week 2) ramps ×1.1');
  assertEq(pyramid.rampedFrom, { value: 10, unit: 'routes' });
  assert(thu.rampNote && /\+10%/.test(thu.rampNote), `rampNote should state +10%, got "${thu.rampNote}"`);

  const sat = Program.prescribeForContext(Program.resolveDate('2026-05-16', '2026-05-04', 12), 'hybrid');
  assertEq(sat.sessionId, 'sat-arc');
  const arc = sat.exercises.find(e => e.kind === 'arc');
  assertEq(arc.prescribedTarget, { value: 35, unit: 'min' }, 'round(30 × 1.1 / 5) × 5 = 35 min');
});

test('[ADR-0009] ramp caps at ×1.3 (hard week 4 = wk5) and is absent in hard week 1', () => {
  const wk5 = Program.prescribeForContext(Program.resolveDate('2026-06-04', '2026-05-04', 12), 'sport');
  assertEq(wk5.sessionId, 'thu-route-pyramid');
  assertEq(wk5.exercises[0].prescribedTarget, { value: 13, unit: 'routes' }, 'round(10 × 1.3) = 13');

  const wk1 = Program.prescribeForContext(Program.resolveDate('2026-05-07', '2026-05-04', 12), 'sport');
  assertEq(wk1.exercises[0].prescribedTarget, { value: 10, unit: 'routes' }, 'hard week 1 = template volume');
  assert(!wk1.rampNote, 'no rampNote in hard week 1');
});

test('[ADR-0009] deload weeks stay exempt: cut applies to the unramped template, no rampNote', () => {
  const ctx = Program.resolveDate('2026-05-30', '2026-05-04', 12); // wk4 Sat, deload
  assert(ctx.deload, 'fixture: wk4 must be a deload week');
  const sess = Program.prescribeForContext(ctx, 'sport');
  const arc = sess.exercises.find(e => e.kind === 'arc');
  assertEq(arc.prescribedTarget, { value: 20, unit: 'min' }, 'deload cuts 30 → 20, never a ramped value');
  assert(!sess.rampNote, 'deload week must not carry a rampNote');
  assert(!arc.rampedFrom, 'deload week exercises must not be ramped');
});

test('[ADR-0009] ramp is aerobic-only and Base-only: hangboard, projecting, and Build sessions unchanged', () => {
  // wk3 Mon, boulder flavor — strength/alactic hangboard must not ramp despite being a hard base week
  const hangboard = Program.prescribeForContext(Program.resolveDate('2026-05-18', '2026-05-04', 12), 'boulder');
  assertEq(hangboard.sessionId, 'mon-hangboard-base');
  assert(!hangboard.rampNote, 'non-aerobic base session must not ramp');
  // wk3 Sat, boulder flavor — Build's anaerobic triples must not ramp when it recurs there (KG-B12: Base is now the aerobic flash pyramid, tested separately)
  const satBuild = Program.prescribeForContext(Program.resolveDate('2026-06-20', '2026-05-04', 12), 'boulder');
  assertEq(satBuild.sessionId, 'sat-boulder-triples');
  assertEq(satBuild.exercises[0].prescribedTarget, { value: 4, unit: 'sets' });
  assert(!satBuild.rampNote, 'Build sessions must not ramp (ramp is Base-only)');
  // wk3 Thu projecting (Skill / Strength) must not ramp
  const proj = Program.prescribeForContext(Program.resolveDate('2026-05-21', '2026-05-04', 12), 'boulder');
  assertEq(proj.exercises[0].prescribedTarget, { value: 75, unit: 'min' });
  // wk8 Thu Build must not ramp (ramp is Base-only). ADR-0010: hybrid Build
  // Thursday is now always thu-limit (was thu-6060-threshold on this
  // even/sport-parity week) — the load-bearing assertion the mixing spec
  // calls out.
  const thuBuild = Program.prescribeForContext(Program.resolveDate('2026-06-25', '2026-05-04', 12), 'hybrid');
  assertEq(thuBuild.sessionId, 'thu-limit');
  assertEq(thuBuild.exercises[0].prescribedTarget, { value: 4, unit: 'problems' });
  assert(!thuBuild.rampNote, 'Build sessions must not carry a rampNote');
});

// ─── KG-B12: Base boulder-Saturday flash pyramid (closes KG-B12) ──────────
// Same fixed anchor 2026-05-04 (Mon), 12-wk comp cycle: base wks1–6 with
// deload wk4 + retest wk6; build wks7–9. Sat main slot per week: wk1
// 2026-05-09, wk2 2026-05-16, wk4 2026-05-30 (deload), wk7 2026-06-20 (build).

test('[KG-B12] Base boulder-Saturday is the flash pyramid; Build boulder-Saturday is still the 4×4 triples', () => {
  const base = Program.prescribeForContext(Program.resolveDate('2026-05-09', '2026-05-04', 12), 'boulder');
  assertEq(base.sessionId, 'sat-flash-pyramid');
  assertEq(base.energySystem, 'Aerobic capacity');
  const pyramid = base.exercises.find(e => e.kind === 'boulder');
  assert(pyramid, 'flash pyramid exercise (kind boulder) missing');
  assertEq(pyramid.prescribedTarget, { value: 18, unit: 'problems' });
  assert(pyramid.rpeRange[0] >= 6 && pyramid.rpeRange[1] <= 7.5, `expected RPE within [6, 7.5], got ${pyramid.rpeRange}`);
  assert(typeof pyramid.howto === 'string' && pyramid.howto.length > 0, 'flash pyramid must carry a how-to');

  const build = Program.prescribeForContext(Program.resolveDate('2026-06-20', '2026-05-04', 12), 'boulder');
  assertEq(build.sessionId, 'sat-boulder-triples', 'Build boulder-Saturday must still be the unchanged 4×4 triples');
  assertEq(build.energySystem, 'Anaerobic capacity');
  const triples = build.exercises.find(e => e.kind === 'circuit');
  assertEq(triples.prescribedTarget, { value: 4, unit: 'sets' });
});

test('[KG-B12] flash pyramid ramps across hard Base weeks (ADR-0009): wk2 hard week 2 → 18 → 20 problems', () => {
  const wk1 = Program.prescribeForContext(Program.resolveDate('2026-05-09', '2026-05-04', 12), 'boulder');
  assertEq(wk1.sessionId, 'sat-flash-pyramid');
  assertEq(wk1.exercises[0].prescribedTarget, { value: 18, unit: 'problems' }, 'hard week 1 = template volume, no ramp');
  assert(!wk1.rampNote, 'no rampNote in hard week 1');

  const wk2 = Program.prescribeForContext(Program.resolveDate('2026-05-16', '2026-05-04', 12), 'boulder');
  assertEq(wk2.sessionId, 'sat-flash-pyramid');
  assertEq(wk2.exercises[0].prescribedTarget, { value: 20, unit: 'problems' }, 'round(18 × 1.1) = 19.8 → 20');
  assertEq(wk2.exercises[0].rampedFrom, { value: 18, unit: 'problems' });
  assert(wk2.rampNote && /\+10%/.test(wk2.rampNote), `rampNote should state +10%, got "${wk2.rampNote}"`);
});

test('[KG-B12] flash pyramid cuts correctly on deload weeks: floor(18 × 0.6) = 10 problems, from the unramped template', () => {
  const ctx = Program.resolveDate('2026-05-30', '2026-05-04', 12); // wk4 Sat, natural (non-retest) deload
  assert(ctx.deload && !ctx.retest, `fixture must be a natural deload week, got deload=${ctx.deload} retest=${ctx.retest}`);
  const sess = Program.prescribeForContext(ctx, 'boulder');
  assertEq(sess.sessionId, 'sat-flash-pyramid');
  const pyramid = sess.exercises.find(e => e.kind === 'boulder');
  assertEq(pyramid.originalTarget, { value: 18, unit: 'problems' }, 'deload must cut the unramped template, not a ramped value');
  assertEq(pyramid.prescribedTarget, { value: 10, unit: 'problems' }, 'floor(18 × 0.6) = 10');
  assert(!pyramid.rampedFrom, 'deload week exercise must not carry a rampedFrom');
  assert(!sess.rampNote, 'deload week must not carry a rampNote');
});

// ─── KG-A13: comp-format Peak Saturday + taper Thursday templates ─────────
// Fixed anchor 2026-05-04 (Mon), 12-wk cycle. Comp peak Sat = wk11
// (2026-07-11), comp taper Thu = wk12 (2026-07-23) — same fixture dates
// used by the [Gym-ready] fixtures test above. Trip/project dates are
// derived from buildPhasePattern(12, 'trip') since taper=2wk shifts Peak
// a week earlier on the calendar than comp's taper=1wk.

test('[KG-A13] comp peakType: Peak Saturday becomes a comp simulation (unseen problems/routes, no beta rehearsal)', () => {
  const ctxBoulder = Program.resolveDate('2026-07-11', '2026-05-04', 12, 'comp');
  assertEq(ctxBoulder.phase, 'peak');
  const boulderSess = Program.prescribeForContext(ctxBoulder, 'boulder');
  assertEq(boulderSess.sessionId, 'sat-comp-sim-boulder');
  const boulderEx = boulderSess.exercises.find(e => e.kind === 'limit-boulder');
  assert(boulderEx, 'comp Peak Saturday must carry a limit-boulder exercise');
  assert(/unseen/i.test(boulderEx.prescribed), 'boulder comp-sim text should mention unseen problems');
  assert(/no beta rehearsal/i.test(boulderEx.prescribed), 'boulder comp-sim text should rule out beta rehearsal');
  assert(boulderEx.prescribedTarget && boulderEx.prescribedTarget.value > 0, 'must carry a concrete prescribedTarget');

  const ctxSport = Program.resolveDate('2026-07-11', '2026-05-04', 12, 'comp');
  const sportSess = Program.prescribeForContext(ctxSport, 'sport');
  assertEq(sportSess.sessionId, 'sat-comp-sim-sport');
  const sportEx = sportSess.exercises.find(e => e.kind === 'route');
  assert(sportEx, 'comp Peak Saturday (sport) must carry a route exercise');
  assert(/unseen/i.test(sportEx.prescribed), 'sport comp-sim text should mention unseen routes');
  assert(/no beta rehearsal/i.test(sportEx.prescribed), 'sport comp-sim text should rule out beta rehearsal');
  assert(sportEx.prescribedTarget && sportEx.prescribedTarget.value > 0, 'must carry a concrete prescribedTarget');
});

test('[KG-A13] comp peakType: taper Thursday becomes a comp-format touch, authored full-volume per the KG-B13 single-cut convention', () => {
  const ctxBoulder = Program.resolveDate('2026-07-23', '2026-05-04', 12, 'comp');
  assertEq(ctxBoulder.phase, 'taper');
  const boulderSess = Program.prescribeForContext(ctxBoulder, 'boulder');
  assertEq(boulderSess.sessionId, 'thu-comp-touch-boulder');
  const boulderEx = boulderSess.exercises.find(e => e.kind === 'boulder');
  assertEq(boulderEx.originalTarget, { value: 6, unit: 'problems' }, 'authored full pre-cut volume');
  assertEq(boulderEx.prescribedTarget, { value: 3, unit: 'problems' }, 'applyTaperVolume single cut: floor(6 × 0.6) = 3');
  assert(boulderSess.taperNote, 'taper session must still carry the taperNote from applyTaperVolume');

  const ctxSport = Program.resolveDate('2026-07-23', '2026-05-04', 12, 'comp');
  const sportSess = Program.prescribeForContext(ctxSport, 'sport');
  assertEq(sportSess.sessionId, 'thu-comp-touch-sport');
  const sportEx = sportSess.exercises.find(e => e.kind === 'route');
  assertEq(sportEx.originalTarget, { value: 4, unit: 'routes' }, 'authored full pre-cut volume');
  assertEq(sportEx.prescribedTarget, { value: 2, unit: 'routes' }, 'applyTaperVolume single cut: floor(4 × 0.6) = 2');
  assert(sportSess.taperNote, 'taper session must still carry the taperNote from applyTaperVolume');
});

test('[KG-A13] trip/project peakType: Peak Saturday and taper Thursday stay byte-for-byte unchanged', () => {
  for (const peakType of ['trip', 'project']) {
    const pattern = buildPhasePattern(12, peakType);
    const peakIdx = pattern.findIndex(w => w.phase === 'peak');
    const taperIdx = pattern.findIndex(w => w.phase === 'taper');
    assert(peakIdx >= 0 && taperIdx >= 0, `fixture: ${peakType} 12-wk cycle must have both a peak and a taper week`);

    const satIso = addIsoDays('2026-05-04', peakIdx * 7 + 5); // Saturday of the first peak week
    const satCtx = Program.resolveDate(satIso, '2026-05-04', 12, peakType);
    assertEq(satCtx.phase, 'peak', `${peakType}: fixture date must resolve to phase peak`);
    const satBoulder = Program.prescribeForContext(satCtx, 'boulder');
    assertEq(satBoulder.sessionId, 'sat-proj-boulder', `${peakType}: boulder Peak Saturday must be unchanged`);
    const satSport = Program.prescribeForContext(satCtx, 'sport');
    assertEq(satSport.sessionId, 'sat-redpoint-peak', `${peakType}: sport Peak Saturday must be unchanged`);

    const thuIso = addIsoDays('2026-05-04', taperIdx * 7 + 3); // Thursday of the first taper week
    const thuCtx = Program.resolveDate(thuIso, '2026-05-04', 12, peakType);
    assertEq(thuCtx.phase, 'taper', `${peakType}: fixture date must resolve to phase taper`);
    const thuBoulder = Program.prescribeForContext(thuCtx, 'boulder');
    assertEq(thuBoulder.sessionId, 'thu-flash', `${peakType}: boulder taper Thursday must be unchanged`);
    const thuSport = Program.prescribeForContext(thuCtx, 'sport');
    assertEq(thuSport.sessionId, 'thu-projects', `${peakType}: sport taper Thursday must be unchanged`);
  }
});

test('[ADR-0009] targetsHit: sets and reps compared against today\'s prescription', () => {
  const ex = { prescribedSets: 2, prescribedReps: 4 };
  assert(Loads.targetsHit(ex, 2, 4), 'sets and reps met → hit');
  assert(Loads.targetsHit(ex, 3, 5), 'exceeding targets → hit');
  assert(!Loads.targetsHit(ex, 1, 4), 'missing a set → not hit');
  assert(!Loads.targetsHit(ex, 2, 3), 'missing reps → not hit');
  assert(Loads.targetsHit(ex, 2, null), 'unknown reps → judged on sets alone');
  assert(!Loads.targetsHit(ex, null, 4), 'unknown sets → never hit');
  assert(!Loads.targetsHit({}, 2, 4), 'no prescribedSets on the exercise → never hit');
});

test('[ADR-0009] in-range RPE + targets hit progresses +2.5% (was: mirror forever)', () => {
  const exercise = { kind: 'hangboard', loadPctRange: [0.8, 0.9], rpeRange: [8, 9], prescribedSets: 2, prescribedReps: 4 };
  const benchmarks = { maxHang20mm: 20, bodyweight: 70 };
  const hit = Loads.resolveEffective({ exercise, previousActualKg: 20, previousAvgRpe: 8.5, previousActualSets: 2, previousActualReps: 4, daysSincePrevious: 5, benchmarks });
  assertEq(hit.suggestedKg, 20.5, '20 × 1.025 = 20.5');
  assert(hit.reason.some(r => /targets hit/i.test(r)), 'reason should state the progression');

  const noSets = Loads.resolveEffective({ exercise, previousActualKg: 20, previousAvgRpe: 8.5, daysSincePrevious: 5, benchmarks });
  assertEq(noSets.suggestedKg, 20, 'without set/rep data the old mirror behavior holds');

  const overRpe = Loads.resolveEffective({ exercise, previousActualKg: 20, previousAvgRpe: 9.5, previousActualSets: 2, previousActualReps: 4, daysSincePrevious: 5, benchmarks });
  assertEq(overRpe.suggestedKg, 19, 'RPE above range still backs off ×0.95 even with targets hit');
});

test('[ADR-0009] total upward move capped at +5%/session; downward moves never capped', () => {
  const exercise = { kind: 'hangboard', loadPctRange: [0.8, 0.9], rpeRange: [8, 9], prescribedSets: 2, prescribedReps: 4 };
  const benchmarks = { maxHang20mm: 20, bodyweight: 70 };
  // RPE below range (×1.05) stacking with Push readiness (×1.05) → raw 22.05, capped to 21
  const stacked = Loads.resolveEffective({ exercise, previousActualKg: 20, previousAvgRpe: 7, daysSincePrevious: 5, readinessMultiplier: 1.05, benchmarks });
  assertEq(stacked.suggestedKg, 21, '20 × min(1.05×1.05, 1.05) = 21');
  assert(stacked.reason.some(r => /capped/i.test(r)), 'reason should mention the cap');
  // Lighter readiness is not capped
  const lighter = Loads.resolveEffective({ exercise, previousActualKg: 20, previousAvgRpe: 8.5, daysSincePrevious: 5, readinessMultiplier: 0.85, benchmarks });
  assertEq(lighter.suggestedKg, 17, '20 × 0.85 = 17, no cap on the way down');
});

test('[Gym-ready] hangboard and pull-up exercises carry a rest field + a well-formed rpeRange across all phases', () => {
  // Monday, one date per phase, all non-deload/non-retest.
  const mondays = {
    base:  '2026-05-04',
    build: '2026-06-15',
    peak:  '2026-07-06',
    taper: '2026-07-20',
  };
  for (const [phase, iso] of Object.entries(mondays)) {
    const ctx = Program.resolveDate(iso, '2026-05-04', 12);
    assertEq(ctx.phase, phase, `fixture date ${iso} should be ${phase}`);
    const sess = Program.prescribeForContext(ctx, 'hybrid');
    for (const ex of sess.exercises || []) {
      if (ex.kind !== 'hangboard' && ex.kind !== 'pullup') continue;
      assert(typeof ex.rest === 'string' && ex.rest.length > 0, `${phase} ${ex.kind} "${ex.name}" missing a rest field`);
      assert(Array.isArray(ex.rpeRange) && ex.rpeRange.length === 2,
        `${phase} ${ex.kind} "${ex.name}" must carry rpeRange (not a differently-named field), got ${JSON.stringify(ex.rpeRange)}`);
    }
  }
});

test('[Gym-ready] REGRESSION: pull-up rest time and RPE target render in the Today tab', () => {
  resetStorage();
  const plan = Storage.getActivePlan();
  Storage.setPlanSettings(plan.id, { anchorMode: 'startDate', startDate: '2026-05-04' });
  sessionStorage.setItem('todaySelectedDate', '2026-05-04'); // Mon wk1, base
  const root = document.createElement('div');
  document.body.appendChild(root);
  try {
    renderToday(root);
    const hangText = root.querySelector('[data-ex="0"] .exercise-prescribe')?.textContent || '';
    assert(/min/.test(hangText), `hangboard exercise-prescribe should mention rest, got "${hangText}"`);

    const pullEx = root.querySelector('[data-ex="2"] .acc-title');
    assert(pullEx && /pull-up/i.test(pullEx.textContent), `expected exercise 2 to be pull-ups, got "${pullEx && pullEx.textContent}"`);
    const pullText = root.querySelector('[data-ex="2"] .exercise-prescribe')?.textContent || '';
    assert(/min between sets/.test(pullText), `pull-up exercise-prescribe missing rest time, got "${pullText}"`);
    assert(/RPE 7–8\.5/.test(pullText), `pull-up exercise-prescribe missing its RPE target, got "${pullText}"`);
  } finally { root.remove(); }
});

test('[Gym-ready] antagonist-block items each specify rest between sets', () => {
  const ctx = Program.resolveDate('2026-05-04', '2026-05-04', 12); // wk1 Mon, base, non-deload
  const sess = Program.prescribeForContext(ctx, 'hybrid');
  const block = sess.exercises.find(e => e.kind === 'antagonist-block');
  assert(block, 'Monday session should have an antagonist-block');
  assert(block.items.length >= 4, `expected 4 antagonist items, got ${block.items.length}`);
  for (const item of block.items) {
    assert(/rest/i.test(item.prescribed), `antagonist item "${item.name}" missing rest info: "${item.prescribed}"`);
  }
});

test('[Gym-ready] Core is a standalone Monday exercise, not a buried antagonist-block item', () => {
  const ctx = Program.resolveDate('2026-05-04', '2026-05-04', 12); // wk1 Mon, base, non-deload
  const sess = Program.prescribeForContext(ctx, 'hybrid');
  const core = sess.exercises.find(e => e.kind === 'core');
  assert(core, 'Monday session should have a standalone core exercise');
  assert(/rest/i.test(core.prescribed), `core exercise missing rest info: "${core.prescribed}"`);
  const block = sess.exercises.find(e => e.kind === 'antagonist-block');
  assert(!block.items.some(i => /core/i.test(i.name)), 'antagonist-block items should no longer include Core');
});

test('[Gym-ready] Core is phase-shaped: Base = plank/HKR/L-sit, Build+ = tension progression (front lever/HLR-to-toes)', () => {
  const base = Program.prescribeForContext(Program.resolveDate('2026-05-04', '2026-05-04', 12), 'hybrid'); // wk1 Mon, base
  const baseCore = base.exercises.find(e => e.kind === 'core');
  assert(/plank/i.test(baseCore.prescribed), `Base core should include plank, got "${baseCore.prescribed}"`);

  const build = Program.prescribeForContext(Program.resolveDate('2026-06-15', '2026-05-04', 12), 'hybrid'); // wk7 Mon, build, hard week
  const buildCore = build.exercises.find(e => e.kind === 'core');
  assert(/front lever/i.test(buildCore.prescribed), `Build core should include a front-lever progression, got "${buildCore.prescribed}"`);
  assert(!/plank/i.test(buildCore.prescribed), `Build core should not still be the Base plank/HKR/L-sit template, got "${buildCore.prescribed}"`);
});

test('[KG-A7] Tuesday light day carries a short antagonist/shoulder block (2x/week dosing)', () => {
  const ctx = Program.resolveDate('2026-05-05', '2026-05-04', 12); // Tue wk1, base
  assertEq(ctx.slot, 'tue-light');
  const sess = Program.prescribeForContext(ctx, 'hybrid');
  const block = sess.exercises.find(e => e.kind === 'antagonist-block');
  assert(block, 'Tuesday light-day session should carry an antagonist-block exercise');
  assert(block.name && block.name !== 'S&C antagonist block', `Tuesday block should be named distinctly from Monday's, got "${block.name}"`);
  const monCtx = Program.resolveDate('2026-05-04', '2026-05-04', 12); // wk1 Mon, base, hard week
  const monBlock = Program.prescribeForContext(monCtx, 'hybrid').exercises.find(e => e.kind === 'antagonist-block');
  assert(Array.isArray(block.items) && block.items.length >= 1 && block.items.length < monBlock.items.length,
    `Tuesday block should be a shorter ~10-min block than Monday's ${monBlock.items.length}-exercise block, got ${block.items && block.items.length}`);
});

test('[KG-A7] Monday antagonist block is present (not dropped) on a deload week, with a deload note on its items', () => {
  const ctx = Program.resolveDate('2026-05-25', '2026-05-04', 12); // wk4 Mon, base, natural deload (non-retest)
  assert(ctx.deload && !ctx.retest, 'fixture must be a natural (non-retest) deload Monday');
  const sess = Program.prescribeForContext(ctx, 'hybrid');
  const block = sess.exercises.find(e => e.kind === 'antagonist-block');
  assert(block, 'Monday antagonist block must still be present on a deload week (KG-A7 — never fully dropped)');
  assert(block.items.length >= 1, 'deload-week antagonist block should still have items');
  for (const item of block.items) {
    assert(/deload/i.test(item.prescribed), `deload-week antagonist item "${item.name}" should carry a deload note, got "${item.prescribed}"`);
  }
});

test('[KG-A7] Monday antagonist block is unchanged (full volume, no deload note) on a hard week', () => {
  const ctx = Program.resolveDate('2026-05-04', '2026-05-04', 12); // wk1 Mon, base, hard (non-deload) week
  assert(!ctx.deload, 'fixture must be a hard (non-deload) Monday');
  const sess = Program.prescribeForContext(ctx, 'hybrid');
  const block = sess.exercises.find(e => e.kind === 'antagonist-block');
  assert(block, 'Monday session should have an antagonist-block on a hard week');
  assertEq(block.name, 'S&C antagonist block', 'Monday block name should be unchanged on a hard week');
  assert(block.items.length >= 4, `Monday block should keep its full item count on a hard week, got ${block.items.length}`);
  for (const item of block.items) {
    assert(!/deload/i.test(item.prescribed), `hard-week antagonist item "${item.name}" should NOT carry a deload note, got "${item.prescribed}"`);
  }
});

test('[Gym-ready] retest max-effort tests specify rest between attempts', () => {
  const ctx = Program.resolveDate('2026-06-08', '2026-05-04', 12); // wk6 Mon, retest
  assert(ctx.deload && ctx.retest, 'fixture must be the retest Monday');
  const sess = Program.prescribeForContext(ctx, 'hybrid');
  assert(sess.isRetest, 'expected the retest session');
  const hang = sess.exercises.find(e => /max 10s hang/i.test(e.name));
  const pull = sess.exercises.find(e => /1rm weighted pull-up/i.test(e.name));
  assert(hang && /rest between attempts/i.test(hang.prescribed), `hang test missing rest guidance: "${hang && hang.prescribed}"`);
  assert(pull && /rest between attempts/i.test(pull.prescribed), `pull-up test missing rest guidance: "${pull && pull.prescribed}"`);
});

// ─── KG-B10: retest-week deload exemption scoped to Monday only ───────────
// Same fixed anchor 2026-05-04 (Mon), 12-wk comp cycle: base wks1–6 with
// natural deload wk4 + forced retest-deload wk6. wk6 Mon 2026-06-08 (retest),
// Thu 2026-06-11, Sat 2026-06-13. Only Monday runs the non-cuttable retest
// protocol — Thu/Sat must still take the same ~40% volume cut as any other
// deload week.

test('[KG-B10] retest-week Thursday session still gets the deload volume cut', () => {
  const ctx = Program.resolveDate('2026-06-11', '2026-05-04', 12); // wk6 Thu, retest week
  assert(ctx.deload && ctx.retest, `fixture must be the retest week, got deload=${ctx.deload} retest=${ctx.retest}`);
  assertEq(ctx.slot, 'thu-main');
  const sess = Program.prescribeForContext(ctx, 'boulder');
  assertEq(sess.sessionId, 'thu-projecting-base');
  const ex = sess.exercises[0];
  assertEq(ex.originalTarget, { value: 75, unit: 'min' }, 'deload must record the pre-cut template value');
  assertEq(ex.prescribedTarget, { value: 45, unit: 'min' }, 'round(75 × 0.6 / 5) × 5 = 45');
  assert(sess.deloadNote, 'retest-week Thursday must carry the deload note like any other deload week');
});

test('[KG-B10] retest-week Saturday session still gets the deload volume cut', () => {
  const ctx = Program.resolveDate('2026-06-13', '2026-05-04', 12); // wk6 Sat, retest week
  assert(ctx.deload && ctx.retest, `fixture must be the retest week, got deload=${ctx.deload} retest=${ctx.retest}`);
  assertEq(ctx.slot, 'sat-main');
  const sess = Program.prescribeForContext(ctx, 'boulder');
  assertEq(sess.sessionId, 'sat-flash-pyramid');
  const pyramid = sess.exercises.find(e => e.kind === 'boulder');
  assertEq(pyramid.originalTarget, { value: 18, unit: 'problems' }, 'deload must record the pre-cut template value');
  assertEq(pyramid.prescribedTarget, { value: 10, unit: 'problems' }, 'floor(18 × 0.6) = 10');
  assert(sess.deloadNote, 'retest-week Saturday must carry the deload note like any other deload week');
});

test('[KG-B10] retest-week Monday session remains the unmodified retest template', () => {
  const ctx = Program.resolveDate('2026-06-08', '2026-05-04', 12); // wk6 Mon, retest week
  assert(ctx.deload && ctx.retest, 'fixture must be the retest Monday');
  const sess = Program.prescribeForContext(ctx, 'hybrid');
  assert(sess.isRetest, 'Monday of a retest week must return the retest session');
  assert(!sess.deloadNote, 'retest Monday is not volume-cuttable — it must not carry a deload note');
});

test('[KG-B10] normal (non-retest) deload-week Thursday is unaffected by the Monday-only scoping', () => {
  const ctx = Program.resolveDate('2026-05-28', '2026-05-04', 12); // wk4 Thu, natural (non-retest) deload
  assert(ctx.deload && !ctx.retest, `fixture must be a natural deload week, got deload=${ctx.deload} retest=${ctx.retest}`);
  const sess = Program.prescribeForContext(ctx, 'boulder');
  assertEq(sess.sessionId, 'thu-projecting-base');
  const ex = sess.exercises[0];
  assertEq(ex.originalTarget, { value: 75, unit: 'min' });
  assertEq(ex.prescribedTarget, { value: 45, unit: 'min' });
  assert(sess.deloadNote, 'natural deload Thursday must still carry the deload note (regression guard)');
});

test('[Gym-ready] KG-A9: Tuesday skill drill offers named options with focus details', () => {
  const ctx = Program.resolveDate('2026-05-05', '2026-05-04', 12); // Tue wk1
  assertEq(ctx.slot, 'tue-light');
  const sess = Program.prescribeForContext(ctx, 'hybrid');
  const skill = sess.exercises.find(e => e.kind === 'skill');
  assert(skill, 'Tuesday session should have a skill exercise');
  assert(Array.isArray(skill.drills) && skill.drills.length >= 3, `expected several drill options, got ${skill.drills && skill.drills.length}`);
  for (const d of skill.drills) {
    assert(d.key && d.name && d.focus, `drill missing key/name/focus: ${JSON.stringify(d)}`);
  }
  assert(skill.drills.some(d => /falling/i.test(d.name)), 'expected a falling-practice drill (KG-A9 names this explicitly for the 7b lead goal)');
});

test('[Gym-ready] REGRESSION: picking a skill drill on the Today tab persists the choice and marks it done', () => {
  resetStorage();
  const plan = Storage.getActivePlan();
  Storage.setPlanSettings(plan.id, { anchorMode: 'startDate', startDate: '2026-05-04' });
  sessionStorage.setItem('todaySelectedDate', '2026-05-05'); // Tue wk1
  const root = document.createElement('div');
  document.body.appendChild(root);
  try {
    renderToday(root);
    const pills = root.querySelectorAll('button[data-drill-pill]');
    assert(pills.length >= 3, `expected several drill pills, got ${pills.length}`);

    const flagging = [...pills].find(p => /flagging/i.test(p.textContent));
    assert(flagging, 'expected a Flagging pill');
    flagging.click();

    const back = Storage.getDay('2026-05-05');
    assertEq(back.exercises[1].actual.drill, 'flagging'); // LIGHT_DAY exercises are [mobility, skill]
    assertEq(back.exercises[1].actual.done, true);

    const focusText = root.querySelector('[id^="drill-focus-"]')?.textContent || '';
    assert(/flag/i.test(focusText), `focus panel should update to the Flagging drill's text, got "${focusText}"`);
    const subText = root.querySelector('[data-ex="1"] .acc-sub')?.textContent || '';
    assert(/flagging/i.test(subText), `closed accordion line should show the chosen drill, got "${subText}"`);
  } finally { root.remove(); }
});

test('[Gym-ready] REGRESSION: a freshly-initialized day persists kind/drills so log.js can edit it correctly', () => {
  resetStorage();
  const plan = Storage.getActivePlan();
  Storage.setPlanSettings(plan.id, { anchorMode: 'startDate', startDate: '2026-05-04' });
  sessionStorage.setItem('todaySelectedDate', '2026-05-04'); // Mon wk1, base
  const root = document.createElement('div');
  renderToday(root); // touches nothing yet, but mounts the day's default exercise shape via a stepper change below
  document.body.appendChild(root);
  const rpeEl = root.querySelector('#ex-0-rpe');
  rpeEl.value = '8';
  rpeEl.dispatchEvent(new Event('change', { bubbles: true }));
  const day = Storage.getDay('2026-05-04');
  assertEq(day.exercises[0].kind, 'hangboard', 'persisted exercise 0 should carry kind (was previously dropped, breaking log.js editing)');
  root.remove();
});
