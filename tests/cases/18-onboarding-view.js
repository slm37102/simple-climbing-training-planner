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
import { openOnboarding } from '../../js/views/onboarding.js';

// ─── IB-060: the new-plan wizard (onboarding.js) was the one view with zero
// coverage — every other view is mounted somewhere in the suite. These smoke
// tests mount the wizard the way app.js does (openOnboarding appends its own
// overlay to document.body) and drive the shared render/wire loop, so a throw
// or an empty first screen — which would leave the athlete unable to create a
// plan — can't regress silently. They don't run the full create() path (which
// writes a plan); they cover open → step 0 → advance → cancel/teardown. ───

test('[IB-060] openOnboarding mounts a modal wizard on step 1 of 5 without throwing', () => {
  resetStorage();
  openOnboarding({ onDone: () => {} });
  try {
    const wiz = document.querySelector('.wizard');
    assert(wiz, 'openOnboarding must append a .wizard overlay to the document');
    assertEq(wiz.getAttribute('role'), 'dialog');
    assertEq(wiz.getAttribute('aria-modal'), 'true');
    assert(/1 \/ 5/.test(wiz.textContent), 'the wizard opens on step 1 of 5');
    assert(wiz.querySelector('[data-ob="next"]'), 'step 0 must offer a Next affordance');
    assert(!wiz.querySelector('[data-ob="back"]'), 'step 0 has no Back button');
  } finally {
    document.querySelector('.wizard')?.remove();
  }
});

test('[IB-060] the wizard advances a step and Cancel tears the overlay down', () => {
  resetStorage();
  let doneCalled = false;
  openOnboarding({ onDone: () => { doneCalled = true; } });
  try {
    const wiz = document.querySelector('.wizard');
    // advance step 0 → 1 (step 0 is always valid, so Next is enabled)
    wiz.querySelector('[data-ob="next"]').click();
    const after = document.querySelector('.wizard');
    assert(/2 \/ 5/.test(after.textContent), 'clicking Next moves to step 2 of 5');
    assert(after.querySelector('[data-disc]'), 'step 2 shows the discipline selector');
    assert(after.querySelector('[data-ob="back"]'), 'a Back button appears once past step 0');
    // Cancel removes the overlay and must NOT fire onDone (that is reserved for create)
    after.querySelector('[data-ob="cancel"]').click();
    assert(!document.querySelector('.wizard'), 'Cancel removes the overlay');
    assert(!doneCalled, 'Cancel must not invoke onDone');
  } finally {
    document.querySelector('.wizard')?.remove();
  }
});
