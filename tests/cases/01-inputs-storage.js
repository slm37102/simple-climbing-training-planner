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

// ─── inputVisibility ──────────────────────────────────────────────────────

test('inputVisibility hangboard → kg+sets+reps+rpe', () => {
  const v = inputVisibility({ kind: 'hangboard' });
  assertEq(v, { kg: true, sets: true, reps: true, rpe: true, optional: false, none: false });
});

test('inputVisibility boulder → reps+rpe (no kg, no sets — gym-ready spec: one count input)', () => {
  const v = inputVisibility({ kind: 'boulder' });
  assertEq(v, { kg: false, sets: false, reps: true, rpe: true, optional: false, none: false });
});

test('inputVisibility test → kg+reps+rpe (no sets — single effort)', () => {
  const v = inputVisibility({ kind: 'test' });
  assertEq(v, { kg: true, sets: false, reps: true, rpe: true, optional: false, none: false });
});

test('inputVisibility arc → reps+rpe (min, no sets/kg)', () => {
  const v = inputVisibility({ kind: 'arc' });
  assertEq(v, { kg: false, sets: false, reps: true, rpe: true, optional: false, none: false });
  assertEq(repsLabel({ kind: 'arc' }), 'min');
  assertEq(repsLabel({ kind: 'boulder' }), 'reps');
});

test('inputVisibility mobility/skill/antagonist-block/core → no inputs', () => {
  for (const k of ['mobility', 'skill', 'antagonist-block', 'core']) {
    const v = inputVisibility({ kind: k });
    assert(v.none === true, `kind ${k} should be none`);
    assert(!v.kg && !v.sets && !v.reps && !v.rpe, `kind ${k} should have no numeric fields`);
  }
});

test('inputVisibility optional flag overrides → checkbox only', () => {
  const v = inputVisibility({ kind: 'test', optional: true });
  assertEq(v, { kg: false, sets: false, reps: false, rpe: false, optional: true, none: false });
});

// ─── Storage ──────────────────────────────────────────────────────────────

test('Storage.setDay → getDay round-trip preserves actual fields', () => {
  resetStorage();
  Storage.setDay('2026-05-20', {
    sessionId: 'mon-hangboard-base',
    status: 'completed',
    exercises: [{ name: 'X', kind: 'hangboard', actual: { kg: 27.5, sets: 5, reps: 3, rpe: 8.5 } }]
  });
  const back = Storage.getDay('2026-05-20');
  assert(back, 'getDay returned null');
  assertEq(back.exercises[0].actual.kg,   27.5);
  assertEq(back.exercises[0].actual.sets, 5);
  assertEq(back.exercises[0].actual.reps, 3);
  assertEq(back.exercises[0].actual.rpe,  8.5);
});

test('Storage.setDay 3-arg writes to specified plan only', () => {
  resetStorage();
  const id1 = Storage.getActivePlan().id;
  const id2 = Storage.addPlan({ name: 'Plan 2' });
  Storage.setDay(id2, '2026-05-20', { exercises: [{ actual: { kg: 99 } }] });
  assert(!Storage.getDay(id1, '2026-05-20'), 'plan1 should not have day');
  const d = Storage.getDay(id2, '2026-05-20');
  assertEq(d.exercises[0].actual.kg, 99);
});

test('Storage: optional.done boolean persists', () => {
  resetStorage();
  Storage.setDay('2026-05-20', { exercises: [{ actual: { done: true } }] });
  const back = Storage.getDay('2026-05-20');
  assertEq(back.exercises[0].actual.done, true);
});
