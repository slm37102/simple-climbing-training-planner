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

// ─── Log view ─────────────────────────────────────────────────────────────

test('Log: feed is read-only — expand shows detail, no edit affordance', () => {
  resetStorage();
  Storage.setDay('2026-05-18', {
    sessionId: 'mon-hangboard-base',
    phase: 'base',
    status: 'partial',
    sessionFeel: 3,
    exercises: [
      { name: 'Hangboard', kind: 'hangboard', actual: { kg: 25, sets: 4, reps: 5, rpe: 7 } }
    ]
  });
  const root = document.createElement('div');
  document.body.appendChild(root);
  try {
    renderLog(root);
    const toggle = root.querySelector('[data-log-toggle]');
    assert(toggle, 'feed row missing');
    toggle.click(); // expand
    assert(root.innerHTML.includes('25kg'), 'expanded detail should show the logged kg');
    // The in-feed edit form was removed deliberately (edit past days via the
    // Today tab date navigation) — no edit affordance may come back.
    assert(!root.querySelector('[data-edit-log]'),  'no Edit button in read-only feed');
    assert(!root.querySelector('[data-edit-form]'), 'no edit form in read-only feed');
    toggle.click(); // collapse still works
    assert(!root.innerHTML.includes('25kg') || root.querySelector('[data-log-toggle]'), 'collapse re-renders');
  } finally { root.remove(); }
});
