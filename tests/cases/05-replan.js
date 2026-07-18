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

// ─── ADR-0008: missed-session detection & replanning (closes KG-A3/KG-D3) ─
// Fixed Monday anchor '2026-05-04' (already validated by earlier ADR tests).
// Replan.detectGap/Program.effectiveStart/Loads.layoffDecay are all pure
// functions of their inputs — no Storage/resetStorage needed here.

test('[ADR-0008] detectGap: fresh plan (createdAt=today) ignores a stale effectiveStart', () => {
  const todayIso = addIsoDays('2026-05-04', 70); // 10 weeks in — still inside an 40-wk cycle
  const plan = {
    createdAt: todayIso,
    settings: { anchorMode: 'startDate', startDate: '2026-05-04', cycleWeeks: 40 },
    days: {}
  };
  assertEq(Replan.detectGap(plan, todayIso), null,
    'a plan created today should not flag a gap even though effectiveStart is 70 days old');
});

test('[ADR-0008] detectGap: null at exactly a 7-day gap (the "≤1wk" rule)', () => {
  const plan = { createdAt: '2026-05-04', settings: { anchorMode: 'startDate', startDate: '2026-05-04', cycleWeeks: 12 }, days: {} };
  assertEq(Replan.detectGap(plan, addIsoDays('2026-05-04', 7)), null, '7-day gap should be silent');
});

test('[ADR-0008] detectGap: soft severity at 8 and 13 days', () => {
  const plan = { createdAt: '2026-05-04', settings: { anchorMode: 'startDate', startDate: '2026-05-04', cycleWeeks: 12 }, days: {} };
  const g8 = Replan.detectGap(plan, addIsoDays('2026-05-04', 8));
  assert(g8 && g8.severity === 'soft', `expected soft at 8 days, got ${JSON.stringify(g8)}`);
  assertEq(g8.gapDays, 8);
  const g13 = Replan.detectGap(plan, addIsoDays('2026-05-04', 13));
  assert(g13 && g13.severity === 'soft', `expected soft at 13 days, got ${JSON.stringify(g13)}`);
});

test('[ADR-0008] detectGap: major severity at 14+ days, with a missedCount of main sessions', () => {
  const plan = { createdAt: '2026-05-04', settings: { anchorMode: 'startDate', startDate: '2026-05-04', cycleWeeks: 12 }, days: {} };
  const gap = Replan.detectGap(plan, addIsoDays('2026-05-04', 14));
  assert(gap && gap.severity === 'major', `expected major at 14 days, got ${JSON.stringify(gap)}`);
  // Mon/Thu/Sat strictly between day0 and day14: wk1 Thu/Sat + wk2 Mon/Thu/Sat = 5.
  assertEq(gap.missedCount, 5);
});

test('[ADR-0008] detectGap: anchor advances to the most recent logged main-slot day', () => {
  const loggedIso = addIsoDays('2026-05-04', 21); // a Monday — main slot
  const todayIso = addIsoDays('2026-05-04', 27);
  const withLog = {
    createdAt: '2026-05-04',
    settings: { anchorMode: 'startDate', startDate: '2026-05-04', cycleWeeks: 12 },
    days: { [loggedIso]: { sessionId: 'mon-hangboard-base', exercises: [] } }
  };
  assertEq(Replan.detectGap(withLog, todayIso), null,
    'anchor should advance to the logged day, leaving only a 6-day gap');

  const withoutLog = { ...withLog, days: {} };
  const gap = Replan.detectGap(withoutLog, todayIso);
  assert(gap && gap.severity === 'major', 'without the log, the same "today" should show a 27-day major gap');
  assertEq(gap.gapDays, 27);
});

test('[ADR-0008] detectGap: gapAcknowledgedThrough suppresses a previously-handled gap', () => {
  const ackIso = addIsoDays('2026-05-04', 30);
  const plan = {
    createdAt: '2026-05-04',
    settings: { anchorMode: 'startDate', startDate: '2026-05-04', cycleWeeks: 12, gapAcknowledgedThrough: ackIso },
    days: {}
  };
  assertEq(Replan.detectGap(plan, addIsoDays(ackIso, 5)), null, 'gap should stay suppressed shortly after acknowledgment');
  const fresh = Replan.detectGap(plan, addIsoDays(ackIso, 15));
  assert(fresh && fresh.severity === 'major', 'a new gap should open once enough time passes after the acknowledgment');
  assertEq(fresh.gapDays, 15);
});

test('[ADR-0008] detectGap: canShift is false in compDate mode (fixed goal date)', () => {
  const compDateIso = addIsoDays('2026-05-04', 83); // back-solves effectiveStart to exactly 2026-05-04
  const plan = {
    createdAt: '2026-05-04',
    settings: { anchorMode: 'compDate', compDate: compDateIso, cycleWeeks: 12 },
    days: {}
  };
  const gap = Replan.detectGap(plan, addIsoDays('2026-05-04', 20));
  assert(gap, 'expected a gap to be detected');
  assertEq(gap.severity, 'major');
  assertEq(gap.canShift, false, 'compDate mode must not offer a shift — goal date is fixed');
});

test('[ADR-0008] detectGap: shiftDays rounds DOWN to a whole week (never exceeds gapDays)', () => {
  const plan = { createdAt: '2026-05-04', settings: { anchorMode: 'startDate', startDate: '2026-05-04', cycleWeeks: 12 }, days: {} };
  const gap = Replan.detectGap(plan, addIsoDays('2026-05-04', 16));
  assertEq(gap.gapDays, 16);
  assertEq(gap.shiftDays, 14, 'floor(16/7)*7 = 14 — must stay <= gapDays, see the overshoot regression test below');
});

test('[ADR-0008] REGRESSION: accepting the extend action never pushes "today" outside the cycle', () => {
  // Caught by adversarial review: an earlier ceil()-based shiftDays could push
  // effectiveStart PAST today whenever the anchor was the raw (unlogged) cycle
  // start and gapDays wasn't an exact multiple of 7 — stranding the athlete on
  // an "Outside cycle" screen for days after clicking "Extend plan."
  // Sweep every gap size from the major threshold up through several weeks —
  // for each one, applying the offered shift must leave "today" resolvable.
  for (let gapDays = MAJOR_GAP_DAYS; gapDays <= 30; gapDays++) {
    const todayIso = addIsoDays('2026-05-04', gapDays);
    const plan = { createdAt: '2026-05-04', settings: { anchorMode: 'startDate', startDate: '2026-05-04', cycleWeeks: 12 }, days: {} };
    const gap = Replan.detectGap(plan, todayIso);
    assert(gap && gap.canShift, `gapDays=${gapDays}: expected a shiftable major gap`);
    assert(gap.shiftDays <= gapDays, `gapDays=${gapDays}: shiftDays (${gap.shiftDays}) must not exceed gapDays`);

    const shiftedStart = Program.effectiveStart({ ...plan.settings, scheduleShiftDays: gap.shiftDays });
    const ctx = Program.resolveDate(todayIso, shiftedStart, 12);
    assert(ctx && !ctx.outOfCycle,
      `gapDays=${gapDays}: shiftDays=${gap.shiftDays} pushed effectiveStart to ${shiftedStart}, ` +
      `making today (${todayIso}) unresolvable (${JSON.stringify(ctx)})`);
    assert(ctx.diffDays >= 0 && ctx.diffDays < 7,
      `gapDays=${gapDays}: post-shift offset should land within the first week (got diffDays=${ctx.diffDays})`);
  }
});

test('[ADR-0008] detectGap: null when the resolved "today" is out-of-cycle', () => {
  const plan = { createdAt: '2026-05-04', settings: { anchorMode: 'startDate', startDate: '2026-05-04', cycleWeeks: 8 }, days: {} };
  assertEq(Replan.detectGap(plan, addIsoDays('2026-05-04', 100)), null, 'out-of-cycle "today" should not flag a gap');
});

test('[ADR-0008] effectiveStart: scheduleShiftDays=14 shifts start by 14 days, stays Monday', () => {
  const start = Program.effectiveStart({ anchorMode: 'startDate', startDate: '2026-05-04', cycleWeeks: 12, scheduleShiftDays: 14 });
  assertEq(start, addIsoDays('2026-05-04', 14));
  assertEq(new Date(start + 'T00:00:00').getDay(), 1, 'shifted start should still be a Monday');
});

test('[ADR-0008] effectiveStart: a non-multiple-of-7 shift still re-snaps to Monday', () => {
  const start = Program.effectiveStart({ anchorMode: 'startDate', startDate: '2026-05-04', cycleWeeks: 12, scheduleShiftDays: 16 });
  assertEq(new Date(start + 'T00:00:00').getDay(), 1, 'result must be a Monday even for a non-week-multiple shift');
  assertEq(start, addIsoDays('2026-05-04', 14), 'day 16 (Wed) snaps back to day 14 (Mon)');
});

test('[ADR-0008] effectiveStart: compDate mode ignores scheduleShiftDays entirely', () => {
  const compDateIso = addIsoDays('2026-05-04', 83);
  const withShift = Program.effectiveStart({ anchorMode: 'compDate', compDate: compDateIso, cycleWeeks: 12, scheduleShiftDays: 30 });
  const withoutShift = Program.effectiveStart({ anchorMode: 'compDate', compDate: compDateIso, cycleWeeks: 12 });
  assertEq(withShift, withoutShift, 'scheduleShiftDays must not affect compDate-mode start');
  assertEq(withShift, '2026-05-04');
});

test('[ADR-0008] layoffDecay: full credit through the grace window, floored by ~5+ weeks off', () => {
  assertEq(Loads.layoffDecay(null), 1.0);
  assertEq(Loads.layoffDecay(0), 1.0);
  assertEq(Loads.layoffDecay(10), 1.0);
  const at17 = Loads.layoffDecay(17);
  assert(Math.abs(at17 - 0.97) < 0.005, `expected ~0.97 at 17 days, got ${at17}`);
  assertEq(Loads.layoffDecay(60), 0.85, 'well past the grace window should clamp to the 0.85 floor');
  assertEq(Loads.layoffDecay(90), 0.85, 'floor should not go below 0.85');
});

test('[ADR-0008] resolveEffective applies layoff decay to a stale previous-actual seed', () => {
  const exercise = { kind: 'hangboard', loadPctRange: [0.5, 0.7], rpeRange: [8, 9] };
  const benchmarks = { maxHang20mm: 20, bodyweight: 70 };
  const fresh = Loads.resolveEffective({ exercise, previousActualKg: 20, previousAvgRpe: 8.5, daysSincePrevious: 5, benchmarks });
  assertEq(fresh.suggestedKg, 20, 'within the grace window, no decay applied (RPE mid-range → auto-adj ×1.0)');
  assert(!fresh.reason.some(r => /layoff/i.test(r)), 'no layoff mention when within the grace window');

  const stale = Loads.resolveEffective({ exercise, previousActualKg: 20, previousAvgRpe: 8.5, daysSincePrevious: 60, benchmarks });
  assertEq(stale.suggestedKg, 17, '20kg × 0.85 floor × auto-adj 1.0 = 17kg');
  assert(stale.reason.some(r => /layoff/i.test(r)), 'reason should mention the layoff decay');
});
