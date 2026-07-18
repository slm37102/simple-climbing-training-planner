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

// ─── KG-A9 addendum: expanded technique-drill library ──────────────────────

test('[KG-A9 addendum] catalog: 19 drills across 5 categories; WARMUP_DRILLS is the footwork+positioning subset', () => {
  assertEq(SKILL_DRILLS.length, 19, `expected 19 drills, got ${SKILL_DRILLS.length}`);
  assertEq(DRILL_CATEGORIES.length, 5, `expected 5 categories, got ${DRILL_CATEGORIES.length}`);
  const catKeys = new Set(DRILL_CATEGORIES.map(c => c.key));
  for (const d of SKILL_DRILLS) {
    assert(d.key && d.name && d.focus, `drill missing key/name/focus: ${JSON.stringify(d)}`);
    assert(catKeys.has(d.category), `drill ${d.key} has unknown category ${d.category}`);
    assert(Array.isArray(d.contexts) && d.contexts.includes('tuesday'), `drill ${d.key} should always be tuesday-eligible`);
  }
  assertEq(WARMUP_DRILLS.length, 8, `expected 8 warm-up drills, got ${WARMUP_DRILLS.length}`);
  for (const d of WARMUP_DRILLS) {
    assert(d.category === 'footwork' || d.category === 'positioning', `warmup drill ${d.key} should be footwork/positioning, got ${d.category}`);
    assert(d.contexts.includes('warmup'), `warmup drill ${d.key} missing warmup context`);
  }
  for (const key of ['backstep-ladder', 'open-closed-hips', 'falling-practice', 'no-take-lap']) {
    assert(!WARMUP_DRILLS.some(d => d.key === key), `${key} is tuesday-only and must not appear in WARMUP_DRILLS`);
  }
});

test('[KG-A9 addendum] Warmup.forSession: skillDrills is the WARMUP_DRILLS subset on Thu/Sat only', () => {
  const thu = Program.resolveDate('2026-05-07', '2026-05-04', 12); // Thu wk1
  const sat = Program.resolveDate('2026-05-09', '2026-05-04', 12); // Sat wk1
  const mon = Program.resolveDate('2026-05-04', '2026-05-04', 12); // Mon wk1
  const tue = Program.resolveDate('2026-05-05', '2026-05-04', 12); // Tue wk1
  assertEq(thu.slot, 'thu-main'); assertEq(sat.slot, 'sat-main');
  assertEq(mon.slot, 'mon-main'); assertEq(tue.slot, 'tue-light');

  const thuSess = Program.prescribeForContext(thu, 'hybrid');
  const satSess = Program.prescribeForContext(sat, 'hybrid');
  const monSess = Program.prescribeForContext(mon, 'hybrid');
  const tueSess = Program.prescribeForContext(tue, 'hybrid');

  assertEq(Warmup.forSession(thuSess).skillDrills.length, WARMUP_DRILLS.length, 'Thu should offer the warm-up drill picker');
  assertEq(Warmup.forSession(satSess).skillDrills.length, WARMUP_DRILLS.length, 'Sat should offer the warm-up drill picker');
  assertEq(Warmup.forSession(monSess).skillDrills, null, 'Mon hangboard should not offer the warm-up drill picker');
  assertEq(Warmup.forSession(tueSess).skillDrills, null, 'Tue light day has its own dedicated picker, not this one');
});

test('[KG-A9 addendum] REGRESSION: picking a warm-up drill on the Today tab persists dayLog.warmupDrill without touching exercises', () => {
  resetStorage();
  const plan = Storage.getActivePlan();
  Storage.setPlanSettings(plan.id, { anchorMode: 'startDate', startDate: '2026-05-04' });
  sessionStorage.setItem('todaySelectedDate', '2026-05-07'); // Thu wk1
  const root = document.createElement('div');
  document.body.appendChild(root);
  try {
    renderToday(root);
    const warmupPills = root.querySelectorAll('button[data-drill-pill][data-drill-slug="warmup"]');
    assert(warmupPills.length >= 3, `expected several warm-up drill pills, got ${warmupPills.length}`);

    const silentFeet = [...warmupPills].find(p => /silent feet/i.test(p.textContent));
    assert(silentFeet, 'expected a Silent feet pill in the warm-up picker');
    silentFeet.click();

    const back = Storage.getDay('2026-05-07');
    assertEq(back.warmupDrill, 'silent-feet');
    assert(back.exercises.every(ex => ex.actual?.drill == null), 'warm-up pick must not write to any exercise.actual.drill');

    const focusText = root.querySelector('#drill-focus-warmup')?.textContent || '';
    assert(/foot/i.test(focusText), `warm-up focus panel should update, got "${focusText}"`);
  } finally { root.remove(); }
});

test('[KG-A9 addendum] category chips filter the visible pill-group without changing the selection', () => {
  resetStorage();
  const plan = Storage.getActivePlan();
  Storage.setPlanSettings(plan.id, { anchorMode: 'startDate', startDate: '2026-05-04' });
  sessionStorage.setItem('todaySelectedDate', '2026-05-05'); // Tue wk1 — full 19-drill Tuesday picker
  const root = document.createElement('div');
  document.body.appendChild(root);
  try {
    renderToday(root);
    const slug = [...root.querySelectorAll('button[data-drill-chip]')][0]?.dataset.drillSlug;
    assert(slug, 'expected at least one category chip');

    const mentalChip = [...root.querySelectorAll(`button[data-drill-chip][data-drill-slug="${slug}"]`)]
      .find(c => /mental/i.test(c.textContent));
    assert(mentalChip, 'expected a Mental & composure chip');
    mentalChip.click();

    const mentalGroup = root.querySelector(`[data-drill-cat-group="mental"][data-drill-slug="${slug}"]`);
    const footworkGroup = root.querySelector(`[data-drill-cat-group="footwork"][data-drill-slug="${slug}"]`);
    assert(mentalGroup && mentalGroup.style.display !== 'none', 'mental group should now be visible');
    assert(footworkGroup && footworkGroup.style.display === 'none', 'footwork group should now be hidden');

    // Switching categories is a view-only filter — it must not touch storage.
    const back = Storage.getDay('2026-05-05');
    assert(!back, 'switching category chips must not persist anything');
  } finally { root.remove(); }
});

test('[Gym-ready] howto(): per-kind default, per-exercise override', () => {
  assert(howto({ kind: 'limit-boulder' }).length > 0, 'limit-boulder should have a per-kind default how-to');
  assert(howto({ kind: 'arc' }).length > 0, 'arc should have a per-kind default how-to');
  assertEq(howto(null), '');
  assertEq(howto({ kind: 'unknown-kind-xyz' }), '', 'unknown kind with no override should return empty string');
  const overridden = howto({ kind: 'boulder', howto: 'custom cue' });
  assertEq(overridden, 'custom cue', 'a per-exercise howto override must win over the kind default');
});
