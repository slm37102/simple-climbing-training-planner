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

// ─── Gym-ready prescription format (map #8, docs/specs/gym-ready-prescription-format-spec.md) ──
// Fixed anchor 2026-05-04 (Mon), 12-wk cycle, comp peakType unless noted:
// base wks1–6, build wks7–9, peak wks10–11, taper wk12 (comp) / wks11–12 (trip).
// week4 (i=3) is a natural Base deload (not retest — retest is week6).

const CLIMBING_KINDS = new Set(['boulder', 'route', 'circuit', 'arc', 'open-climb', 'limit-boulder', 'campus']);

test('[Gym-ready] every climbing-kind exercise across all phases carries a concrete prescribedTarget', () => {
  const fixtures = [
    ['2026-05-04', 'hybrid'],        // base Mon (no climbing-kind unless build+boulder)
    ['2026-05-07', 'boulder'],       // base Thu boulder
    ['2026-05-07', 'sport'],         // base Thu sport
    ['2026-05-09', 'boulder'],       // base Sat boulder
    ['2026-05-09', 'sport'],         // base Sat sport
    ['2026-06-15', 'boulder'],       // build Mon (campus warmup ladders, boulder focus)
    ['2026-06-25', 'boulder'],       // build Thu boulder
    ['2026-06-25', 'sport'],         // build Thu sport
    ['2026-07-04', 'boulder'],       // build Sat boulder
    ['2026-07-04', 'sport'],         // build Sat sport
    ['2026-07-09', 'boulder'],       // peak Thu boulder
    ['2026-07-09', 'sport'],         // peak Thu sport
    ['2026-07-11', 'boulder'],       // peak Sat boulder
    ['2026-07-11', 'sport'],         // peak Sat sport
    ['2026-07-23', 'boulder'],       // taper Thu boulder (comp)
    ['2026-07-23', 'sport'],         // taper Thu sport (comp)
    ['2026-07-18', 'boulder', 'trip'], // taper Sat boulder (comp's taper Sat is the forced rest-pre-goal day; use trip's 2-wk taper to reach sat-volume-down)
    ['2026-07-18', 'sport', 'trip'],   // taper Sat sport → sat-route-mileage
    ['2026-05-10', 'hybrid'],        // wk1 Sun (sun-optional open-climb)
  ];
  let checked = 0;
  for (const [iso, focus, peakType] of fixtures) {
    const ctx = Program.resolveDate(iso, '2026-05-04', 12, peakType);
    const sess = Program.prescribeForContext(ctx, focus);
    for (const ex of sess.exercises || []) {
      if (!CLIMBING_KINDS.has(ex.kind)) continue;
      assert(ex.prescribedTarget, `${iso}/${focus}: ${ex.kind} "${ex.name}" missing prescribedTarget`);
      assert(typeof ex.prescribedTarget.value === 'number' && ex.prescribedTarget.value > 0,
        `${iso}/${focus}: ${ex.kind} "${ex.name}" prescribedTarget.value must be a positive number`);
      assert(typeof ex.prescribedTarget.unit === 'string' && ex.prescribedTarget.unit.length > 0,
        `${iso}/${focus}: ${ex.kind} "${ex.name}" prescribedTarget.unit must be a non-empty string`);
      checked++;
    }
  }
  assert(checked >= 20, `expected to check at least 20 climbing-kind exercise occurrences, got ${checked}`);
});

test('[Gym-ready] deload week scales a count-unit prescribedTarget: floor(×0.6), min 1', () => {
  const iso = addIsoDays('2026-05-04', (4 - 1) * 7 + 5); // wk4 Sat = 2026-05-30
  const deloadCtx = Program.resolveDate(iso, '2026-05-04', 12);
  assertEq(deloadCtx.phase, 'base');
  assert(deloadCtx.deload && !deloadCtx.retest, `wk4 should be a natural (non-retest) deload, got deload=${deloadCtx.deload} retest=${deloadCtx.retest}`);
  // KG-B12: Base boulder-Saturday is the flash pyramid (kind 'boulder'), not the triples.
  const sess = Program.prescribeForContext(deloadCtx, 'boulder');
  assertEq(sess.sessionId, 'sat-flash-pyramid');
  const pyramid = sess.exercises.find(e => e.kind === 'boulder');
  assert(pyramid.originalTarget, 'deload boulder exercise missing originalTarget');
  assertEq(pyramid.originalTarget, { value: 18, unit: 'problems' });
  assertEq(pyramid.prescribedTarget, { value: 10, unit: 'problems' }, 'floor(18 × 0.6) = 10 problems');
});

test('[Gym-ready] deload week scales the Build boulder-triples count-unit target too: floor(×0.6), min 1', () => {
  // wk7 Sat build fixture has no deload week in a 12-wk cycle; use a longer
  // cycle so Build actually carries a deload week for the triples session.
  const pattern = buildPhasePattern(24, 'comp');
  const buildDeloadIdx = pattern.findIndex(w => w.phase === 'build' && w.deload);
  assert(buildDeloadIdx >= 0, 'fixture: 24-wk cycle must have a Build deload week');
  const iso = addIsoDays('2026-05-04', buildDeloadIdx * 7 + 5); // Sat of that week
  const ctx = Program.resolveDate(iso, '2026-05-04', 24);
  assertEq(ctx.phase, 'build');
  assert(ctx.deload, 'fixture week must be a Build deload week');
  const sess = Program.prescribeForContext(ctx, 'boulder');
  assertEq(sess.sessionId, 'sat-boulder-triples');
  const triples = sess.exercises.find(e => e.kind === 'circuit');
  assert(triples.originalTarget, 'deload circuit exercise missing originalTarget');
  assertEq(triples.originalTarget, { value: 4, unit: 'sets' });
  assertEq(triples.prescribedTarget, { value: 2, unit: 'sets' }, 'floor(4 × 0.6) = 2 sets');
});

test('[Gym-ready] deload week rounds a duration-unit ("min") prescribedTarget to the nearest 5', () => {
  const iso = addIsoDays('2026-05-04', (4 - 1) * 7 + 5); // wk4 Sat (base, natural deload)
  const ctx = Program.resolveDate(iso, '2026-05-04', 12);
  assert(ctx.deload && !ctx.retest, 'fixture must be a natural deload week');
  const sess = Program.prescribeForContext(ctx, 'sport');
  assertEq(sess.sessionId, 'sat-arc');
  const arc = sess.exercises.find(e => e.kind === 'arc');
  assertEq(arc.originalTarget, { value: 30, unit: 'min' });
  assertEq(arc.prescribedTarget, { value: 20, unit: 'min' }, 'round(30 × 0.6 / 5) × 5 = 20 min');
});

test('[Gym-ready] taper week also scales prescribedTarget (same mechanics as deload — ADR-0007)', () => {
  // KG-A13: comp peakType's taper Thursday is now the comp-format touch
  // (thu-comp-touch-boulder), not thu-flash — use 'trip' explicitly so this
  // test keeps exercising the original template's scaling mechanics.
  const iso = addIsoDays('2026-05-04', (12 - 1) * 7 + 3); // wk12 Thu, trip taper wk1 of 2
  const ctx = Program.resolveDate(iso, '2026-05-04', 12, 'trip');
  assertEq(ctx.phase, 'taper');
  const sess = Program.prescribeForContext(ctx, 'boulder');
  assertEq(sess.sessionId, 'thu-flash');
  const flash = sess.exercises.find(e => e.kind === 'boulder');
  // KG-B13: template now authors full pre-cut volume (14), so the single
  // taper cut lands at 8 — within the "6–10 problems" the text already
  // states — not the pre-fix double-cut result of 4.
  assertEq(flash.originalTarget, { value: 14, unit: 'problems' });
  assertEq(flash.prescribedTarget, { value: 8, unit: 'problems' }, 'floor(14 × 0.6) = 8 problems');
});

test('[Gym-ready] KG-B7: boulder-triples 4×4 grade corrected to "2–3 grades below max"', () => {
  const ctx = Program.resolveDate('2026-06-20', '2026-05-04', 12); // wk7 Sat, build, non-deload (KG-B12: triples are Build-only)
  const sess = Program.prescribeForContext(ctx, 'boulder');
  const triples = sess.exercises.find(e => e.kind === 'circuit');
  assert(/2–3 grades below max/.test(triples.prescribed), `expected "2–3 grades below max", got "${triples.prescribed}"`);
  assert(!/1–2 grades below max/.test(triples.prescribed), 'the pre-KG-B7 "1–2 grades below max" text must be gone');
});

test('[Gym-ready] KG-B8: ARC no longer states a "% effort" figure', () => {
  const ctx = Program.resolveDate('2026-05-09', '2026-05-04', 12); // wk1 Sat, base
  const sess = Program.prescribeForContext(ctx, 'sport');
  assertEq(sess.sessionId, 'sat-arc');
  const arc = sess.exercises.find(e => e.kind === 'arc');
  assert(!/%\s*effort/i.test(arc.prescribed), `"% effort" figure must be gone, got "${arc.prescribed}"`);
  assert(/just below pump/i.test(arc.prescribed), 'RPE + "just below pump" should still carry the intensity');
  assertEq(arc.prescribedTarget, { value: 30, unit: 'min' });
});

test('[Gym-ready] KG-B9: base route pyramid RPE capped at [7, 8] (was [7.5, 9])', () => {
  const ctx = Program.resolveDate('2026-05-07', '2026-05-04', 12); // wk1 Thu, base
  const sess = Program.prescribeForContext(ctx, 'sport');
  assertEq(sess.sessionId, 'thu-route-pyramid');
  const pyramid = sess.exercises.find(e => e.kind === 'route');
  assertEq(pyramid.rpeRange, [7, 8], `expected RPE capped to [7, 8], got ${pyramid.rpeRange}`);
});

test('[Gym-ready] exercise-inputs: climbing-kind exercises show one count input, no separate sets', () => {
  const ex = { kind: 'boulder', prescribedTarget: { value: 4, unit: 'problems' } };
  const vis = inputVisibility(ex);
  assertEq(vis.sets, false, 'climbing-kind exercises must not show a separate Sets input');
  assertEq(vis.reps, true, 'the single count input reuses the reps slot');
  assertEq(repsLabel(ex), 'problems', 'repsLabel should surface prescribedTarget.unit');
});
