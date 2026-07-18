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

// ─── Calendar view ────────────────────────────────────────────────────────

test('Cycle: summary card shows week progress + cycle bests', () => {
  resetStorage();
  const plan = Storage.getActivePlan();
  const now = new Date();
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dow = monday.getDay();
  monday.setDate(monday.getDate() - (dow === 0 ? 6 : dow - 1));
  const start = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate());
  start.setDate(start.getDate() - 7);
  const startIso = localIso(start);
  const weekStartIso = localIso(monday);

  Storage.setPlanSettings(plan.id, { anchorMode: 'startDate', startDate: startIso });
  Storage.setDay(weekStartIso, {
    exercises: [{ name: 'Hangboard', kind: 'hangboard', actual: { kg: 25, rpe: 8 } }]
  });
  Storage.setDay(addIsoDays(startIso, 1), {
    exercises: [{ name: 'Retest', kind: 'test', actual: { kg: 30, reps: 1, rpe: 9 } }]
  });
  Storage.setDay(addIsoDays(startIso, 3), {
    exercises: [{ name: 'Pull-ups', kind: 'pullup', actual: { kg: 42.5, reps: 3, rpe: 9 } }]
  });

  const root = document.createElement('div');
  renderCalendar(root);
  const card = root.querySelector('[data-cycle-summary]');
  assert(card, 'summary card missing');
  const text = card.textContent.replace(/\s+/g, ' ');
  assert(text.includes('Week 2 of 12'), text);
  assert(text.includes('Base'), text);
  assert(text.includes('1 / 5 sessions'), text);
  assert(text.includes('30 kg'), text);
  assert(text.includes('42.5 kg'), text);
});

test('Cycle: summary card shows future-cycle messaging', () => {
  resetStorage();
  const plan = Storage.getActivePlan();
  const todayIso = localIso(new Date());
  const startIso = addIsoDays(todayIso, 7);
  Storage.setPlanSettings(plan.id, { anchorMode: 'startDate', startDate: startIso });

  // After C1, effectiveStart snaps any startDate to the Monday of its week.
  // Compute the expected snapped Monday so the assertion stays accurate.
  const snapD = new Date(startIso + 'T00:00:00');
  const dow = snapD.getDay();
  snapD.setDate(snapD.getDate() - (dow === 0 ? 6 : dow - 1));
  const snappedStartIso = localIso(snapD);

  const root = document.createElement('div');
  renderCalendar(root);
  const card = root.querySelector('[data-cycle-summary]');
  assert(card, 'summary card missing');
  const text = card.textContent.replace(/\s+/g, ' ');
  assert(text.includes('Cycle not started'), text);
  assert(text.includes(snappedStartIso), text);
});

test('Cycle: grid groups days under their calendar month (straddling week splits)', () => {
  resetStorage();
  const plan = Storage.getActivePlan();
  // Mon 2026-07-06 start → training week 4 (Jul 27 – Aug 2) straddles July/August.
  Storage.setPlanSettings(plan.id, { anchorMode: 'startDate', startDate: '2026-07-06' });

  const root = document.createElement('div');
  renderCalendar(root);

  // Walk month labels and day cells in document order: every cell must sit
  // under the header of its own calendar month.
  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  let curLabel = null;
  let checked = 0;
  root.querySelectorAll('.wk-month .mlabel, .cyc-cell[data-date]').forEach(node => {
    if (node.classList.contains('mlabel')) { curLabel = node.textContent.trim(); return; }
    assert(curLabel, 'day cell rendered before any month label');
    const d = new Date(node.dataset.date + 'T00:00:00');
    assertEq(curLabel, `${MONTHS[d.getMonth()]} ${d.getFullYear()}`,
      `cell ${node.dataset.date} under wrong month header`);
    checked++;
  });
  assertEq(checked, 12 * 7, 'every cycle day should render exactly once');

  // The straddling week splits across sections but keeps its rail number on both halves.
  const julRow = root.querySelector('[data-date="2026-07-27"]').closest('.wk-row');
  const augRow = root.querySelector('[data-date="2026-08-01"]').closest('.wk-row');
  assert(julRow !== augRow, 'straddling week should split across month sections');
  assertEq(julRow.querySelector('.rail').textContent, '4', 'July half keeps week number');
  assertEq(augRow.querySelector('.rail').textContent, '4', 'August half keeps week number');
});
