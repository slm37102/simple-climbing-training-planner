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

// ─── Coach-review §8: Sunday pre-heavy-Monday warning hint ───────────────
// start Mon 2026-05-04, 12-wk cycle (base wk1-6, build wk7-9, peak wk10-11,
// taper wk12) unless noted otherwise. The hint is a Sunday-only lookahead:
// present only when tomorrow (Monday) is a hard (non-deload, non-retest)
// Build or Peak main session; absent for Base/deload/retest/taper Mondays
// and on every non-Sunday day.

test('[Coach-§8] Sunday before a hard Build Monday: preHeavyMonday + sunHint present', () => {
  // wk7 Mon (build, non-deload) = 2026-06-15 → Sunday before = 2026-06-14
  const mon = Program.resolveDate('2026-06-15', '2026-05-04', 12);
  assertEq(mon.phase, 'build');
  assert(!mon.deload && !mon.retest, 'sanity: wk7 build Monday must be a hard week');
  const sunCtx = Program.resolveDate('2026-06-14', '2026-05-04', 12);
  assertEq(sunCtx.slot, 'sun-optional');
  assert(sunCtx.preHeavyMonday, 'ctx.preHeavyMonday should be true before a hard Build Monday');
  const sess = Program.prescribeForContext(sunCtx, 'hybrid');
  assert(sess.sunHint && /heavy fingers tomorrow/i.test(sess.sunHint), `expected sunHint, got ${sess.sunHint}`);
  assertEq(sess.exercises[0].optional, true, 'Sunday session must stay optional');
  assertEq(sess.exercises[0].prescribedTarget, { value: 60, unit: 'min' }, 'Sunday prescribed target must be unchanged');
});

test('[Coach-§8] Sunday before a hard Peak Monday: preHeavyMonday + sunHint present', () => {
  // wk10 Mon (peak) = 2026-07-06 → Sunday before = 2026-07-05
  const mon = Program.resolveDate('2026-07-06', '2026-05-04', 12);
  assertEq(mon.phase, 'peak');
  assert(!mon.deload && !mon.retest, 'sanity: peak weeks are never deload/retest');
  const sunCtx = Program.resolveDate('2026-07-05', '2026-05-04', 12);
  assertEq(sunCtx.slot, 'sun-optional');
  assert(sunCtx.preHeavyMonday, 'ctx.preHeavyMonday should be true before a hard Peak Monday');
  const sess = Program.prescribeForContext(sunCtx, 'hybrid');
  assert(sess.sunHint, 'sunHint should be set before a hard Peak Monday');
});

test('[Coach-§8] Sunday before a Base Monday: absent', () => {
  // wk2 Mon (base, non-deload) = 2026-05-11 → Sunday before = 2026-05-10
  const mon = Program.resolveDate('2026-05-11', '2026-05-04', 12);
  assertEq(mon.phase, 'base');
  const sunCtx = Program.resolveDate('2026-05-10', '2026-05-04', 12);
  assert(!sunCtx.preHeavyMonday, 'preHeavyMonday must be false before a Base Monday');
  const sess = Program.prescribeForContext(sunCtx, 'hybrid');
  assert(!sess.sunHint, 'sunHint must be absent before a Base Monday');
});

test('[Coach-§8] Sunday before a retest Monday: absent', () => {
  // wk6 Mon (base, retest+deload) = 2026-06-08 → Sunday before = 2026-06-07
  const mon = Program.resolveDate('2026-06-08', '2026-05-04', 12);
  assert(mon.retest, 'sanity: wk6 Monday must be the retest week');
  const sunCtx = Program.resolveDate('2026-06-07', '2026-05-04', 12);
  assert(!sunCtx.preHeavyMonday, 'preHeavyMonday must be false before a retest Monday');
  const sess = Program.prescribeForContext(sunCtx, 'hybrid');
  assert(!sess.sunHint, 'sunHint must be absent before a retest Monday');
});

test('[Coach-§8] Sunday before a taper Monday: absent', () => {
  // wk12 Mon (taper) = 2026-07-20 → Sunday before = 2026-07-19
  const mon = Program.resolveDate('2026-07-20', '2026-05-04', 12);
  assertEq(mon.phase, 'taper');
  const sunCtx = Program.resolveDate('2026-07-19', '2026-05-04', 12);
  assert(!sunCtx.preHeavyMonday, 'preHeavyMonday must be false before a taper Monday');
  const sess = Program.prescribeForContext(sunCtx, 'hybrid');
  assert(!sess.sunHint, 'sunHint must be absent before a taper Monday');
});

test('[Coach-§8] Sunday before a deload Monday inside Build phase: absent (deload beats phase)', () => {
  // 20-wk cycle (still single-block, threshold is ">20") → base=11wk, build=6wk,
  // peak=2wk, taper=1wk. Build's 4th hard week (i+1===4) is a natural deload —
  // absolute weekIdx = 11 (base) + 4 = 15.
  const monIso = addIsoDays('2026-05-04', (15 - 1) * 7);
  const mon = Program.resolveDate(monIso, '2026-05-04', 20);
  assertEq(mon.weekIdx, 15);
  assertEq(mon.phase, 'build');
  assert(mon.deload, 'sanity: wk15 of the 20-wk cycle must be the build deload week');
  const sunIso = addIsoDays(monIso, -1);
  const sunCtx = Program.resolveDate(sunIso, '2026-05-04', 20);
  assertEq(sunCtx.slot, 'sun-optional');
  assert(!sunCtx.preHeavyMonday, 'preHeavyMonday must be false before a deload Monday even in Build phase');
  const sess = Program.prescribeForContext(sunCtx, 'hybrid');
  assert(!sess.sunHint, 'sunHint must be absent before a deload Build Monday');
});

test('[Coach-§8] preHeavyMonday/sunHint never appear on non-Sunday days', () => {
  // Same week as the hard-Build case above, but check every other day of the week.
  for (const iso of ['2026-06-09', '2026-06-10', '2026-06-11', '2026-06-12', '2026-06-13']) {
    const ctx = Program.resolveDate(iso, '2026-05-04', 12);
    assert(!ctx.preHeavyMonday, `${iso}: preHeavyMonday must only ever be set on a Sunday`);
    const sess = Program.prescribeForContext(ctx, 'hybrid');
    assert(!sess.sunHint, `${iso}: sunHint must only ever appear on a Sunday`);
  }
  // The hard-Build Monday itself must not carry the Sunday-only hint either.
  const monSess = Program.prescribeForContext(Program.resolveDate('2026-06-15', '2026-05-04', 12), 'hybrid');
  assert(!monSess.sunHint, 'Monday session itself must never carry sunHint');
});

test('[Coach-§8] end-to-end via Program.build with a plan object', () => {
  const plan = { settings: { anchorMode: 'startDate', startDate: '2026-05-04', cycleWeeks: 12, peakType: 'comp' }, focus: 'hybrid' };
  const hintSess = Program.build(plan, '2026-06-14'); // Sunday before hard Build Monday
  assert(hintSess.sunHint, 'Program.build should surface sunHint end-to-end');
  const noHintSess = Program.build(plan, '2026-05-10'); // Sunday before Base Monday
  assert(!noHintSess.sunHint, 'Program.build must not surface sunHint before a Base Monday');
});

// ─── KG-A10: anti-style prescription text from dominantStyle/dominantAngle ─
// Fixed anchor 2026-05-04 (Mon), 12-wk comp cycle (base wks1-6, build wks7-9,
// peak wks10-11, taper wk12 — same fixture geometry as the ADR-0009 block
// above). Base boulder Thu = 2026-05-21 (wk3, thu-projecting-base); Base
// boulder Sat = 2026-05-09 (wk1, currently sat-boulder-triples — not pinned
// below since a parallel change may split Base Saturday onto its own
// sessionId; the cue is gated on phase/flavor/slot in prescribeForContext,
// not on sessionId, so it must survive that regardless); Build boulder Thu =
// 2026-06-18 (wk7, thu-limit); Build boulder Sat = 2026-06-20 (wk7,
// sat-boulder-triples).

test('[KG-A10] default profile (crimp/slight-overhang) gets the anti-style cue on Base boulder Thu + Sat', () => {
  const benchmarks = { dominantStyle: 'crimp', dominantAngle: 'slight-overhang' };
  const expected = 'include 2 anti-style problems — slopers/pinches, slab or vertical';

  const thu = Program.prescribeForContext(Program.resolveDate('2026-05-21', '2026-05-04', 12), 'boulder', benchmarks);
  assertEq(thu.sessionId, 'thu-projecting-base');
  assertEq(thu.styleNote, expected);

  const sat = Program.prescribeForContext(Program.resolveDate('2026-05-09', '2026-05-04', 12), 'boulder', benchmarks);
  assertEq(sat.phase, 'base');
  assertEq(sat.flavor, 'boulder');
  assertEq(sat.styleNote, expected);
});

test('[KG-A10] a different explicit profile (pinch/vert) gets the opposite cue on Build boulder Thu + Sat', () => {
  const benchmarks = { dominantStyle: 'pinch', dominantAngle: 'vert' };
  const expected = 'include 2 anti-style problems — crimps/pockets, steep overhang or roof';

  const thu = Program.prescribeForContext(Program.resolveDate('2026-06-18', '2026-05-04', 12), 'boulder', benchmarks);
  assertEq(thu.sessionId, 'thu-limit');
  assertEq(thu.styleNote, expected);

  const sat = Program.prescribeForContext(Program.resolveDate('2026-06-20', '2026-05-04', 12), 'boulder', benchmarks);
  assertEq(sat.sessionId, 'sat-boulder-triples');
  assertEq(sat.styleNote, expected);
});

test('[KG-A10] no cue when benchmarks are omitted, or when style/angle fields are empty/unset', () => {
  const ctx = Program.resolveDate('2026-05-21', '2026-05-04', 12);

  const noArg = Program.prescribeForContext(ctx, 'boulder');
  assert(!noArg.styleNote, 'omitting benchmarks entirely must not add a styleNote (back-compat with existing callers)');

  const emptyStrings = Program.prescribeForContext(ctx, 'boulder', { dominantStyle: '', dominantAngle: '' });
  assert(!emptyStrings.styleNote, 'empty-string style/angle must not add a styleNote');

  const nullFields = Program.prescribeForContext(ctx, 'boulder', { dominantStyle: null, dominantAngle: null });
  assert(!nullFields.styleNote, 'null style/angle must not add a styleNote');

  const unknown = Program.prescribeForContext(ctx, 'boulder', { dominantStyle: 'nope', dominantAngle: 'nope' });
  assert(!unknown.styleNote, 'unrecognised style/angle values must not add a styleNote');
});

test('[KG-A10] Peak and Taper boulder sessions never carry the cue, even with a full profile set', () => {
  const benchmarks = { dominantStyle: 'crimp', dominantAngle: 'slight-overhang' };
  const start = '2026-05-04';

  // wk11 (odd → naturally boulder-flavor too, but focus is forced explicitly below)
  const peakThuIso = datesAddDays(start, (11 - 1) * 7 + 3);
  const peakSatIso = datesAddDays(start, (11 - 1) * 7 + 5);
  const peakThu = Program.prescribeForContext(Program.resolveDate(peakThuIso, start, 12), 'boulder', benchmarks);
  const peakSat = Program.prescribeForContext(Program.resolveDate(peakSatIso, start, 12), 'boulder', benchmarks);
  assertEq(peakThu.phase, 'peak');
  assertEq(peakSat.phase, 'peak');
  assert(!peakThu.styleNote, 'Peak Thursday must never carry the anti-style cue');
  assert(!peakSat.styleNote, 'Peak Saturday must never carry the anti-style cue');

  // wk12 is the (single-week, comp) taper; force boulder flavor explicitly.
  const taperThuIso = datesAddDays(start, (12 - 1) * 7 + 3);
  const taperSatIso = datesAddDays(start, (12 - 1) * 7 + 5);
  const taperThu = Program.prescribeForContext(Program.resolveDate(taperThuIso, start, 12), 'boulder', benchmarks);
  const taperSat = Program.prescribeForContext(Program.resolveDate(taperSatIso, start, 12), 'boulder', benchmarks);
  assertEq(taperThu.phase, 'taper');
  assertEq(taperSat.phase, 'taper');
  assert(!taperThu.styleNote, 'Taper Thursday must never carry the anti-style cue');
  assert(!taperSat.styleNote, 'Taper Saturday must never carry the anti-style cue');
});

test('[KG-A10] sport-flavor sessions never carry the cue, even in Base/Build with a full profile set', () => {
  const benchmarks = { dominantStyle: 'crimp', dominantAngle: 'slight-overhang' };

  const baseThuSport = Program.prescribeForContext(Program.resolveDate('2026-05-21', '2026-05-04', 12), 'sport', benchmarks);
  assertEq(baseThuSport.sessionId, 'thu-route-pyramid');
  assert(!baseThuSport.styleNote, 'sport-flavor Base Thursday must never carry the anti-style cue');

  const baseSatSport = Program.prescribeForContext(Program.resolveDate('2026-05-09', '2026-05-04', 12), 'sport', benchmarks);
  assertEq(baseSatSport.sessionId, 'sat-arc');
  assert(!baseSatSport.styleNote, 'sport-flavor Base Saturday must never carry the anti-style cue');

  const buildThuSport = Program.prescribeForContext(Program.resolveDate('2026-06-18', '2026-05-04', 12), 'sport', benchmarks);
  assertEq(buildThuSport.sessionId, 'thu-6060-threshold');
  assert(!buildThuSport.styleNote, 'sport-flavor Build Thursday must never carry the anti-style cue');

  const buildSatSport = Program.prescribeForContext(Program.resolveDate('2026-06-20', '2026-05-04', 12), 'sport', benchmarks);
  assertEq(buildSatSport.sessionId, 'sat-4x4-build');
  assert(!buildSatSport.styleNote, 'sport-flavor Build Saturday must never carry the anti-style cue');
});

test('[KG-A10] threads end-to-end through Program.build(plan, dateISO, benchmarks)', () => {
  const plan = { settings: { startDate: '2026-05-04', anchorMode: 'startDate', cycleWeeks: 12, peakType: 'comp' }, focus: 'boulder' };
  const benchmarks = { dominantStyle: 'crimp', dominantAngle: 'slight-overhang' };

  const withBenchmarks = Program.build(plan, '2026-05-21', benchmarks);
  assertEq(withBenchmarks.sessionId, 'thu-projecting-base');
  assertEq(withBenchmarks.styleNote, 'include 2 anti-style problems — slopers/pinches, slab or vertical');

  // Back-compat: existing callers that don't pass a 3rd arg get no cue.
  const noBenchmarks = Program.build(plan, '2026-05-21');
  assert(!noBenchmarks.styleNote, 'Program.build without a benchmarks arg must not add a styleNote');
});
