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

// ─── Deepening refactors: loads history seam · one-door resolve · signal lifecycle ───

test('Loads.resolveForDay owns the previous-same-session scan — ADR-0009 progression fires without caller-fed fields', () => {
  resetStorage();
  const bm = { bodyweight: 70, maxHang20mm: 30 };
  const ex = { kind: 'hangboard', loadPctRange: [0.8, 0.9], rpeRange: [8, 9], prescribedSets: 5 };
  // Previous same-session day: targets hit (5 sets) at in-range RPE → +2.5%.
  Storage.setDay('2026-05-04', { sessionId: 'mon-hangboard-build', exercises: [
    { kind: 'hangboard', actual: { kg: 20, rpe: 8.5, sets: 5, reps: 10 } }
  ] });
  // Decoy: a NEWER day with a different sessionId must not be the continuity match.
  Storage.setDay('2026-05-07', { sessionId: 'thu-limit', exercises: [
    { kind: 'hangboard', actual: { kg: 99, rpe: 5, sets: 1 } }
  ] });
  const eff = Loads.resolveForDay({
    exercise: ex, exerciseIndex: 0, sessionId: 'mon-hangboard-build',
    dateISO: '2026-05-11', days: Storage.listDays(), benchmarks: bm
  });
  assertEq(eff.suggestedKg, 20.5, '20kg × 1.025 targets-hit progression — the module found sets/reps itself');
  assert(eff.reason.some(r => /targets hit/.test(r)), 'progression step must appear in the reason trail');
});

test('Program.resolveForSettings derives peakType — trip plans keep their 2-week taper shape', () => {
  const settings = { anchorMode: 'startDate', startDate: '2026-05-04', cycleWeeks: 12, peakType: 'trip' };
  // Wk 11 Monday: trip taper spans wks 11–12 (ADR-0007); the positional
  // resolveDate with a forgotten 4th arg would default to comp (peak here).
  const ctx = Program.resolveForSettings(settings, '2026-07-13');
  assertEq(ctx.phase, 'taper', 'trip peakType must thread through the one-door resolve');
  assertEq(Program.resolveDate('2026-07-13', '2026-05-04', 12).phase, 'peak', 'fixture check: the comp default really does differ here');
  assertEq(Program.resolveForSettings({}, '2026-07-13'), null, 'no anchor → null');
});

test('Monitoring lifecycle: dismissPatch shape + the actionKey accept adapter', () => {
  const patched = Monitoring.dismissPatch({ status: 'partial', dismissedSignals: { old: true } }, 'rpeDrift');
  assertEq(patched.status, 'partial', 'other day fields preserved');
  assertEq(patched.dismissedSignals, { old: true, rpeDrift: true });
  const sig = { actionKey: 'early-deload' };
  assert(Monitoring.signalHasAccept(sig), 'early-deload is the accept-able action');
  assert(!Monitoring.signalHasAccept({ actionKey: 'confirm-retest' }), 'advisory actions are dismissal-only');
  const patch = Monitoring.acceptSettingsPatch(sig, { earlyVolumeCuts: [{ from: 'a', to: 'b' }] }, '2026-05-04');
  assertEq(patch.earlyVolumeCuts.length, 2, 'appends to existing cuts');
  assertEq(patch.earlyVolumeCuts[1], { from: '2026-05-04', to: '2026-05-11' }, 'ADR-0014: the coming 7 days');
  assertEq(Monitoring.acceptSettingsPatch({ actionKey: 'confirm-retest' }, {}, '2026-05-04'), null);
});

test('[ADR-0014] REGRESSION: Log signals panel accept converges with Today — readiness-trend accept cuts the coming week', () => {
  resetStorage();
  const plan = Storage.getActivePlan();
  Storage.setPlanSettings(plan.id, { anchorMode: 'startDate', startDate: datesToday(), cycleWeeks: 12, peakType: 'comp' });
  for (let offset = 0; offset <= 27; offset++) {
    const iso = datesAddDays(datesToday(), -offset);
    const score = offset <= 6 ? 2 : 4;
    Storage.setDay(iso, { readiness: { sleep: score, soreness: score, fatigue: score } });
  }
  const root = document.createElement('div');
  document.body.appendChild(root);
  try {
    renderLog(root);
    const acceptBtn = document.querySelector('[data-log-signal-accept="readinessTrend"]');
    assert(acceptBtn, 'the Log panel must offer the same accept as the Today banner (was dismiss-only)');
    acceptBtn.click();
    const cuts = Storage.getActivePlan().settings.earlyVolumeCuts;
    assert(Array.isArray(cuts) && cuts.length === 1, 'accept from Log persists the early volume cut');
    assertEq(cuts[0], { from: datesToday(), to: datesAddDays(datesToday(), 7) });
    assert(!document.querySelector('[data-log-signal="readinessTrend"]'), 'accepted signal is dismissed from the panel');
  } finally { root.remove(); }
});

// ─── Prescription pipeline (notes[] channel + provenance render) ───────────

test('[pipeline] session.notes carries co-occurring notes in pass order (deload + readiness)', () => {
  // Before the pipeline refactor, notes were assumed mutually exclusive and
  // the Today view rendered deloadNote || … || readinessNote — silently
  // dropping the readiness note whenever both fired (possible since ADR-0015).
  const plan = { settings: { anchorMode: 'startDate', startDate: '2026-05-04', cycleWeeks: 12, peakType: 'comp' }, focus: 'boulder' };
  const sess = Program.build(plan, '2026-05-30', null, { label: 'lighter' }); // wk4 Sat, natural deload
  assert(Array.isArray(sess.notes), 'every built session must carry notes[]');
  assert(sess.deloadNote && sess.readinessNote, 'fixture must fire both passes');
  assert(sess.notes.includes(sess.deloadNote),    'notes[] must include the deload note');
  assert(sess.notes.includes(sess.readinessNote), 'notes[] must include the readiness note');
  assert(sess.notes.indexOf(sess.deloadNote) < sess.notes.indexOf(sess.readinessNote),
    'notes[] must be in pass order (cut before readiness gate)');
});

test('[pipeline] REGRESSION: Today renders BOTH notes when deload and readiness co-occur', () => {
  resetStorage();
  const plan = Storage.getActivePlan();
  Storage.updatePlan(plan.id, { focus: 'boulder' });
  Storage.setPlanSettings(plan.id, { anchorMode: 'startDate', startDate: '2026-05-04', cycleWeeks: 12, peakType: 'comp' });
  sessionStorage.setItem('todaySelectedDate', '2026-05-30'); // wk4 Sat, natural deload
  Storage.setDay('2026-05-30', { readiness: { sleep: 3, soreness: 3, fatigue: 3 } }); // avg 3.0 → Lighter
  const root = document.createElement('div');
  document.body.appendChild(root);
  try {
    renderToday(root);
    assert(/Deload week — volume cut/.test(root.textContent), 'deload note must render');
    assert(/Readiness: lighter/.test(root.textContent), 'readiness note must ALSO render (was silently dropped)');
  } finally { root.remove(); }
});

test('[pipeline] REGRESSION: ramp + Lighter callout shows "Readiness target ↓ from", never a no-op "↑ from"', () => {
  // Base wk2 ARC: template 30 min → ramp ×1.1 → 35 → readiness ×0.85 → 30.
  // The old callout could only show rampedFrom, rendering the nonsense
  // "Ramped target 30 min ↑ from 30 min".
  resetStorage();
  const plan = Storage.getActivePlan();
  Storage.setPlanSettings(plan.id, { anchorMode: 'startDate', startDate: '2026-05-04', cycleWeeks: 12, peakType: 'comp' });
  sessionStorage.setItem('todaySelectedDate', '2026-05-16'); // wk2 Sat (hybrid even week → sport → ARC)
  Storage.setDay('2026-05-16', { readiness: { sleep: 3, soreness: 3, fatigue: 3 } }); // avg 3.0 → Lighter
  const root = document.createElement('div');
  document.body.appendChild(root);
  try {
    renderToday(root);
    assert(/Readiness target/.test(root.textContent), 'callout must be owned by the last pass that scaled the target');
    assert(/↓ from 35 min/.test(root.textContent), 'must show the immediate pre-readiness (ramped) value');
    assert(/template 30 min/.test(root.textContent), 'must show the original template value');
    assert(!/↑ from/.test(root.textContent), 'the ramp arrow must not render when readiness owns the callout');
  } finally { root.remove(); }
});

test('Today: Missed status persists from the Today tab (Log is a read-only feed now)', () => {
  resetStorage();
  const plan = Storage.getActivePlan();
  Storage.setPlanSettings(plan.id, { anchorMode: 'startDate', startDate: '2026-05-04' });
  sessionStorage.setItem('todaySelectedDate', '2026-05-18'); // Mon, wk 3
  const root = document.createElement('div');
  document.body.appendChild(root);
  try {
    renderToday(root);
    const btn = root.querySelector('#markMissed');
    assert(btn, 'Missed button missing from the Today status row');
    btn.click();
    assertEq(Storage.getDay('2026-05-18').status, 'missed');
  } finally { root.remove(); }
});
