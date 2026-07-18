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

// ─── ADR-0015: readiness gating for climbing sessions (closes KG-A14) ─────
// Fixed anchor 2026-05-04 (Mon), 12-wk comp cycle — same fixture geometry as
// the ADR-0009/KG-A10/ADR-0010 blocks above.

test('[ADR-0015] Lighter day scales a climbing-kind prescribedTarget ×0.85 (deload rounding rules)', () => {
  const plan = { settings: { anchorMode: 'startDate', startDate: '2026-05-04', cycleWeeks: 12, peakType: 'comp' }, focus: 'boulder' };
  const normal = Program.build(plan, '2026-05-09'); // wk1 Sat, sat-flash-pyramid
  assertEq(normal.sessionId, 'sat-flash-pyramid');
  const pyramid = normal.exercises.find(e => e.kind === 'boulder');
  assertEq(pyramid.prescribedTarget, { value: 18, unit: 'problems' });

  const lighter = Program.build(plan, '2026-05-09', null, { label: 'lighter' });
  assertEq(lighter.sessionId, 'sat-flash-pyramid');
  const lighterPyramid = lighter.exercises.find(e => e.kind === 'boulder');
  assertEq(lighterPyramid.readinessScaledFrom, { value: 18, unit: 'problems' });
  assertEq(lighterPyramid.prescribedTarget, { value: 15, unit: 'problems' }, 'floor(18 × 0.85) = 15');
  assert(lighter.readinessNote && /lighter/i.test(lighter.readinessNote), 'expected a readiness note');
});

test('[ADR-0015] Lighter day caps RPE-note on campus + limit-boulder (Peak Thursday)', () => {
  const plan = { settings: { anchorMode: 'startDate', startDate: '2026-05-04', cycleWeeks: 12, peakType: 'comp' }, focus: 'boulder' };
  const lighter = Program.build(plan, '2026-07-09', null, { label: 'lighter' }); // wk10 Thu, Peak boulder = thu-limit-campus
  assertEq(lighter.sessionId, 'thu-limit-campus');
  const limitBoulder = lighter.exercises.find(e => e.kind === 'limit-boulder');
  const campus = lighter.exercises.find(e => e.kind === 'campus');
  assert(limitBoulder.rpeRange[1] > 8.5, 'fixture sanity: limit-boulder RPE tops above 8.5');
  assert(campus.rpeRange[1] > 8.5, 'fixture sanity: campus RPE tops above 8.5');
  assertEq(limitBoulder.readinessCapNote, 'today: stay ≤8.5, stop at first quality drop');
  assertEq(campus.readinessCapNote, 'today: stay ≤8.5, stop at first quality drop');
});

test('[ADR-0015] Lighter day on Peak-Thursday sport-flavor swaps 30/30 lactic for the shared 60/60 threshold template', () => {
  const plan = { settings: { anchorMode: 'startDate', startDate: '2026-05-04', cycleWeeks: 12, peakType: 'comp' }, focus: 'sport' };
  const normal = Program.build(plan, '2026-07-09'); // wk10 Thu, Peak sport = thu-3030-lactic
  assertEq(normal.sessionId, 'thu-3030-lactic');
  const lactic = normal.exercises.find(e => e.kind === 'circuit');
  assert(lactic.rpeRange[0] >= 9.5, 'fixture sanity: 30/30 is band-2 lactic');

  const lighter = Program.build(plan, '2026-07-09', null, { label: 'lighter' });
  assertEq(lighter.sessionId, 'thu-3030-lactic', 'sessionId is preserved through the swap');
  const swapped = lighter.exercises.find(e => e.kind === 'circuit');
  assertEq(swapped.prescribedTarget, { value: 20, unit: 'min' });
  assert(swapped.rpeRange[1] <= 8.5, 'swapped-in exercise must be the sub-8.5 60/60 band');
  assert(lighter.readinessNote && /60\/60/.test(lighter.readinessNote));

  // Shared-template guarantee (ADR-0010): identical to whatever Build would prescribe that week.
  const buildSport = Program.build(plan, '2026-06-25'); // wk8 Thu, build sport
  assertEq(buildSport.sessionId, 'thu-6060-threshold');
  assertEq(swapped, buildSport.exercises.find(e => e.kind === 'circuit'));
});

test('[ADR-0015] suggest-rest: declining keeps the planned session with Lighter levers; accepting swaps for the light template', () => {
  const plan = { settings: { anchorMode: 'startDate', startDate: '2026-05-04', cycleWeeks: 12, peakType: 'comp' }, focus: 'boulder' };
  const declined = Program.build(plan, '2026-05-09', null, { label: 'suggestRest', acceptRestSwap: false });
  assertEq(declined.sessionId, 'sat-flash-pyramid', 'declining must not change session identity');
  const pyramid = declined.exercises.find(e => e.kind === 'boulder');
  assertEq(pyramid.prescribedTarget, { value: 15, unit: 'problems' }, 'declined suggest-rest still gets the Lighter target scaling');

  const accepted = Program.build(plan, '2026-05-09', null, { label: 'suggestRest', acceptRestSwap: true });
  assertEq(accepted.sessionId, 'readiness-rest-swap');
  assert(accepted.exercises.some(e => e.kind === 'mobility'));
  assert(accepted.exercises.some(e => e.kind === 'antagonist-block'));
});

test('[ADR-0015] Push day is a no-op for climbing sessions', () => {
  const plan = { settings: { anchorMode: 'startDate', startDate: '2026-05-04', cycleWeeks: 12, peakType: 'comp' }, focus: 'boulder' };
  const normal = Program.build(plan, '2026-05-09');
  const push = Program.build(plan, '2026-05-09', null, { label: 'push' });
  assertEq(push, normal, 'push-day climbing session must be byte-identical to the unmodified prescription');
});

test('[ADR-0015] composes with an existing deload cut (readiness scaling applies on top of the already-cut value)', () => {
  const plan = { settings: { anchorMode: 'startDate', startDate: '2026-05-04', cycleWeeks: 12, peakType: 'comp' }, focus: 'boulder' };
  const ctx = Program.resolveDate('2026-05-30', '2026-05-04', 12); // wk4 Sat, natural deload
  assert(ctx.deload && !ctx.retest, 'fixture must be a natural deload week');
  const lighter = Program.build(plan, '2026-05-30', null, { label: 'lighter' });
  assertEq(lighter.sessionId, 'sat-flash-pyramid');
  const pyramid = lighter.exercises.find(e => e.kind === 'boulder');
  assertEq(pyramid.originalTarget, { value: 18, unit: 'problems' }, 'deload records the pre-cut template value');
  assertEq(pyramid.readinessScaledFrom, { value: 10, unit: 'problems' }, 'readiness scaling composes on top of the deload-cut value: floor(18×0.6)=10');
  assertEq(pyramid.prescribedTarget, { value: 8, unit: 'problems' }, 'floor(10 × 0.85) = 8');
  assert(lighter.deloadNote, 'the natural deload note must still be present');
  assert(lighter.readinessNote, 'the readiness note must also be present, composing rather than replacing');
});

test('[ADR-0015] REGRESSION: suggest-rest banner renders on Today with accept/decline, and accept persists + renders the swap', () => {
  resetStorage();
  const plan = Storage.getActivePlan();
  Storage.setPlanSettings(plan.id, { anchorMode: 'startDate', startDate: '2026-05-04', cycleWeeks: 12, peakType: 'comp' });
  sessionStorage.setItem('todaySelectedDate', '2026-05-09'); // wk1 Sat
  Storage.setDay('2026-05-09', { readiness: { sleep: 1, soreness: 1, fatigue: 1 } }); // avg 1.0 → suggest-rest
  const root = document.createElement('div');
  document.body.appendChild(root);
  try {
    renderToday(root);
    const banner = root.querySelector('[data-readiness-swap-banner]');
    assert(banner, 'expected the suggest-rest swap banner');
    const acceptBtn = root.querySelector('[data-readiness-swap-accept]');
    assert(acceptBtn, 'expected the accept button');
    acceptBtn.click();

    const day = Storage.getDay('2026-05-09');
    assertEq(day.acceptedReadinessSwap, true);
    renderToday(root);
    assert(!root.querySelector('[data-readiness-swap-banner]'), 'banner should not re-appear once accepted');
    assert(/mobility/i.test(root.textContent), 'expected the light-day session to render');
  } finally { root.remove(); }
});

test('[ADR-0015] REGRESSION: RPE-cap note renders on the Today tab for a capped climbing exercise', () => {
  resetStorage();
  const plan = Storage.getActivePlan();
  Storage.updatePlan(plan.id, { focus: 'boulder' });
  Storage.setPlanSettings(plan.id, { anchorMode: 'startDate', startDate: '2026-05-04', cycleWeeks: 12, peakType: 'comp' });
  sessionStorage.setItem('todaySelectedDate', '2026-07-09'); // wk10 Thu, Peak boulder = thu-limit-campus
  Storage.setDay('2026-07-09', { readiness: { sleep: 3, soreness: 3, fatigue: 3 } }); // avg 3.0 → Lighter
  const root = document.createElement('div');
  document.body.appendChild(root);
  try {
    renderToday(root);
    assert(/stay ≤8\.5/i.test(root.textContent), 'expected the RPE-cap note text in the rendered session');
  } finally { root.remove(); }
});
