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

// ─── Program ──────────────────────────────────────────────────────────────

test('Program.resolveDate inside cycle window', () => {
  const ctx = Program.resolveDate('2026-05-18', '2026-05-04');
  assert(ctx && !ctx.outOfCycle, 'should be in cycle');
  assert(typeof ctx.weekIdx === 'number');
  assert(typeof ctx.phase   === 'string');
});

test('Program.resolveDate before start → outOfCycle', () => {
  const ctx = Program.resolveDate('2026-04-01', '2026-05-04');
  assert(!ctx || ctx.outOfCycle, 'should be outOfCycle or null');
});

// ─── Configurable cycle length ────────────────────────────────────────────

test('buildPhasePattern(12) preserves single-block shape (6 base, 3 build, 2 peak, 1 taper)', () => {
  const p = buildPhasePattern(12);
  assertEq(p.length, 12);
  const counts = { base: 0, build: 0, peak: 0, taper: 0 };
  p.forEach(w => counts[w.phase]++);
  assertEq(counts, { base: 6, build: 3, peak: 2, taper: 1 });
  // retest = end of base (week 6)
  assert(p[5].retest, 'wk6 should be retest');
  assert(p[5].deload, 'wk6 should be deload (retest implies deload reset)');
  // deload cadence — every 4th week within base/build (3:1 — ADR-0004)
  assert(p[3].deload, 'wk4 should be deload');
  assert(!p[2].deload, 'wk3 should NOT be deload under 3:1');
  assert(!p[8].deload, 'wk9 should NOT be deload (3-wk build has no natural deload)');
});

test('buildPhasePattern(8) shortest single-block', () => {
  const p = buildPhasePattern(8);
  assertEq(p.length, 8);
  assertEq(p[p.length - 1].phase, 'taper');
  assertEq(p[p.length - 2].phase, 'peak');
  assertEq(p[p.length - 3].phase, 'peak');
});

test('buildPhasePattern(16) single-block scaled', () => {
  const p = buildPhasePattern(16);
  assertEq(p.length, 16);
  const counts = { base: 0, build: 0, peak: 0, taper: 0 };
  p.forEach(w => counts[w.phase]++);
  assert(counts.peak === 2, 'peak fixed at 2');
  assert(counts.taper === 1, 'comp taper stays 1 wk regardless of length (ADR-0007)');
  assert(counts.base >= 2 * counts.build, 'base should dominate over build');
});

test('buildPhasePattern peakType scales taper: comp 1 wk, trip/project 2 wk (ADR-0007)', () => {
  const taperWeeks = p => p.filter(w => w.phase === 'taper').length;
  assertEq(taperWeeks(buildPhasePattern(12, 'comp')), 1);
  assertEq(taperWeeks(buildPhasePattern(12, 'trip')), 2);
  assertEq(taperWeeks(buildPhasePattern(12, 'project')), 2);
  assertEq(taperWeeks(buildPhasePattern(12)), 1, 'default peakType is comp');
});

test('buildPhasePattern(24) switches to double-block', () => {
  const p = buildPhasePattern(24);
  assertEq(p.length, 24);
  // double-block = two base→build cycles before peak
  const sequence = p.map(w => w.phase).join(',');
  // count base→build transitions
  let transitions = 0;
  for (let i = 1; i < p.length; i++) {
    if (p[i - 1].phase === 'base' && p[i].phase === 'build') transitions++;
  }
  assertEq(transitions, 2, 'double-block has two base→build transitions');
});

test('buildPhasePattern clamps out-of-range weeks', () => {
  assertEq(buildPhasePattern(4).length, MIN_CYCLE_WEEKS);
  assertEq(buildPhasePattern(100).length, MAX_CYCLE_WEEKS);
});

test('Program.resolveDate with cycleWeeks=16 keeps day 100 inside cycle', () => {
  const ctx = Program.resolveDate('2026-08-12', '2026-05-04', 16);
  assert(ctx && !ctx.outOfCycle, 'should be inside 16-wk cycle');
  assertEq(ctx.cycleWeeks, 16);
  assertEq(ctx.totalDays, 112);
});

test('Program.resolveDate with default cycleWeeks=12 → same day is outOfCycle', () => {
  const ctx = Program.resolveDate('2026-08-12', '2026-05-04');
  assert(!ctx || ctx.outOfCycle, '12-wk cycle ends much earlier');
});

test('Program.cycleWeeksOf falls back to default when settings missing', () => {
  assertEq(Program.cycleWeeksOf({}), DEFAULT_CYCLE_WEEKS);
  assertEq(Program.cycleWeeksOf({ cycleWeeks: 20 }), 20);
  assertEq(Program.cycleWeeksOf({ cycleWeeks: 5 }), MIN_CYCLE_WEEKS); // clamped
});

// ─── Deload semantics (volume cut, intensity held) ───────────────────────

test('Deload week (non-retest) sets deloadNote and cuts prescribedSets ~40%', () => {
  // wk4 of 12-wk cycle = deload but NOT retest (3:1 cadence — ADR-0004; retest is wk6)
  const ctx = Program.resolveDate('2026-05-25', '2026-05-04', 12); // start Mon 2026-05-04, wk4 Mon
  assert(ctx.deload && !ctx.retest, 'wk4 should be deload-only');
  assertEq(ctx.weekIdx, 4);
  const sess = Program.prescribeForContext(ctx, 'hybrid');
  assert(sess.deloadNote && /volume/i.test(sess.deloadNote), 'session should have deloadNote');
  // find the weighted pullup (started at 5 sets)
  const pull = sess.exercises.find(e => e.kind === 'pullup');
  assert(pull, 'should have pullup');
  assert(pull.prescribedSets < 5, `pullup sets should be cut, got ${pull.prescribedSets}`);
  assert(pull.prescribedSets >= 1, 'should be ≥1');
});

test('Retest week skips volume cut (it has its own structure)', () => {
  // wk6 of 12-wk cycle = retest
  const ctx = Program.resolveDate('2026-06-08', '2026-05-04', 12);
  assertEq(ctx.weekIdx, 6);
  assert(ctx.retest, 'wk6 should be retest');
  const sess = Program.prescribeForContext(ctx, 'hybrid');
  assert(!sess.deloadNote, 'retest week should not emit volume-cut note');
});

// ─── ADR-0001: softened Peak phase (closes KG-B1) ────────────────────────
// start Mon 2026-05-04, 12-wk cycle → peak = wks 10–11
// Mon wk10 = 2026-07-06 · Thu wk10 = 2026-07-09 · Sat wk10 = 2026-07-11

test('[ADR-0001] Peak weighted pull-ups capped at 90% 1RM', () => {
  const ctx = Program.resolveDate('2026-07-06', '2026-05-04', 12);
  assertEq(ctx.phase, 'peak');
  const sess = Program.prescribeForContext(ctx, 'boulder');
  const pull = sess.exercises.find(e => e.kind === 'pullup');
  assert(pull, 'peak Monday should have weighted pull-ups');
  assert(pull.pctRange[1] <= 0.90, `peak pull-up ceiling must be ≤0.90, got ${pull.pctRange[1]}`);
});

test('[ADR-0001] Mon Peak does not stack campus with 7-53 hangboard', () => {
  const ctx = Program.resolveDate('2026-07-06', '2026-05-04', 12);
  const sess = Program.prescribeForContext(ctx, 'boulder');
  assert(sess.exercises.some(e => e.kind === 'hangboard'), 'peak Monday keeps the 7-53 protocol');
  assert(!sess.exercises.some(e => e.kind === 'campus'), 'campus must not share a session with 7-53 at max RPE');
});

test('[ADR-0001] no 1-5-9 / bumps / jump-catch anywhere in Peak sessions', () => {
  const banned = /1-5-9|bumps|jump-catch/i;
  for (const iso of ['2026-07-06', '2026-07-09', '2026-07-11']) {
    const ctx = Program.resolveDate(iso, '2026-05-04', 12);
    assertEq(ctx.phase, 'peak', `${iso} should resolve to peak`);
    const sess = Program.prescribeForContext(ctx, 'boulder');
    for (const ex of sess.exercises) {
      const txt = `${ex.name} ${ex.prescribed || ''}`;
      assert(!banned.test(txt), `${iso}: banned campus move in "${txt}"`);
    }
  }
});

test('[ADR-0001] Thu Peak campus is gated basic ladders at sub-max RPE', () => {
  const ctx = Program.resolveDate('2026-07-09', '2026-05-04', 12);
  const sess = Program.prescribeForContext(ctx, 'boulder');
  const campus = sess.exercises.find(e => e.kind === 'campus');
  assert(campus, 'Thu peak boulder session keeps a campus exercise');
  assert(/ladder/i.test(campus.name), `campus should be basic ladders, got "${campus.name}"`);
  assert(/gate/i.test(campus.prescribed), 'campus prescription must carry the readiness gate');
  assert(campus.rpeRange[1] <= 9, `campus RPE ceiling should be ≤9, got ${campus.rpeRange[1]}`);
});

// ─── ADR-0007: taper holds intensity, cuts volume ─────────────────────────
// start Mon 2026-05-04, 12-wk cycle → taper = wk 12; Mon wk12 = 2026-07-20

test('[ADR-0007] Taper holds near-peak intensity and cuts volume', () => {
  const ctx = Program.resolveDate('2026-07-20', '2026-05-04', 12);
  assertEq(ctx.phase, 'taper');
  const sess = Program.prescribeForContext(ctx, 'boulder');
  const hang = sess.exercises.find(e => e.kind === 'hangboard');
  const pull = sess.exercises.find(e => e.kind === 'pullup');
  assert(hang && hang.loadPctRange[0] >= 0.75,
    `taper hangboard must hold near-peak load%, got ${hang && hang.loadPctRange}`);
  assert(pull && pull.pctRange[0] >= 0.75,
    `taper pull-up must hold near-peak load%, got ${pull && pull.pctRange}`);
  assert(hang.prescribedSets <= 2 && pull.prescribedSets <= 3,
    'taper volume must stay low (the cut is volume, not intensity)');
});

test('[ADR-0001] Peak limit-boulder volume reduced (quality over fatigue)', () => {
  const thu = Program.prescribeForContext(Program.resolveDate('2026-07-09', '2026-05-04', 12), 'boulder');
  const limit = thu.exercises.find(e => e.kind === 'limit-boulder');
  assert(limit, 'Thu peak should have limit boulders');
  assert(/1–3/.test(limit.prescribed) && /power drops/i.test(limit.prescribed),
    `expected reduced-volume prescription, got "${limit.prescribed}"`);
  // KG-A13: comp peakType's Peak Saturday is now the comp simulation
  // (sat-comp-sim-boulder) — use 'trip' explicitly to keep exercising the
  // original project-boulder session this test targets.
  const sat = Program.prescribeForContext(Program.resolveDate('2026-07-11', '2026-05-04', 12, 'trip'), 'boulder');
  const proj = sat.exercises.find(e => e.kind === 'limit-boulder');
  assert(proj && /1–3/.test(proj.prescribed) && /power drops/i.test(proj.prescribed),
    `expected reduced Sat project volume, got "${proj && proj.prescribed}"`);
});

// ─── ADR-0005: hangboard protocol ladder (closes KG-B2) ──────────────────
// start Mon 2026-05-04, 12-wk cycle → Base Mon wk1 = 2026-05-04,
// Build Mon wk7 = 2026-06-15.

test('[ADR-0005] Base Monday = 7/3 repeaters + intro max-hangs, no min-edge', () => {
  const ctx = Program.resolveDate('2026-05-04', '2026-05-04', 12);
  assertEq(ctx.phase, 'base');
  const sess = Program.prescribeForContext(ctx, 'hybrid');
  const hangs = sess.exercises.filter(e => e.kind === 'hangboard');
  assertEq(hangs.length, 2, 'Base Monday should prescribe exactly two hangboard blocks');
  const rep   = hangs.find(h => /repeater/i.test(h.name));
  const intro = hangs.find(h => /intro/i.test(h.name));
  assert(rep,   '7/3 repeaters missing');
  assert(intro, 'intro max-hangs missing');
  assert(!sess.exercises.some(e => /min.?edge/i.test(e.name || '')), 'min-edge protocol must be gone');
  assertEq(rep.loadPctRange, null, 'repeaters are bodyweight — no load %');
  // ADR-0013: total-system-load convention — Base intro is the Lattice band's
  // low end (80–85% of total), not "≤70% added" (which was ~90–93% true
  // intensity under the old added-only math this replaced).
  assert(intro.loadPctRange[0] >= 0.80 && intro.loadPctRange[1] <= 0.85, `intro max-hangs stay at the Lattice band's low end (80–85% of total), got ${intro.loadPctRange}`);
});

test('[ADR-0005] exactly one repeater block in Base (bonus sport repeaters gone)', () => {
  const ctx = Program.resolveDate('2026-05-04', '2026-05-04', 12);
  const sess = Program.prescribeForContext(ctx, 'sport');
  const reps = sess.exercises.filter(e => /repeater/i.test(e.name || ''));
  assertEq(reps.length, 1, 'the old sport-flavor bonus repeater block must be gone');
});

test('[ADR-0005] Build max-weight dose ≤8 total hangs at RPE 8–9 with margin cue', () => {
  const ctx = Program.resolveDate('2026-06-15', '2026-05-04', 12); // wk7 Mon = build
  assertEq(ctx.phase, 'build');
  const sess = Program.prescribeForContext(ctx, 'hybrid');
  const hang = sess.exercises.find(e => e.kind === 'hangboard');
  assert(hang, 'build Monday hangboard missing');
  assert(hang.prescribedSets * hang.prescribedReps <= 8,
    `total hangs must be ≤8, got ${hang.prescribedSets}×${hang.prescribedReps}`);
  assertEq(hang.rpeRange, [8, 9]);
  assert(/reserve/i.test(hang.sets), 'margin cue ("leave 1–2s in reserve") missing');
});

// ─── ADR-0006: PE two-band model (closes KG-C5) ──────────────────────────
// Band 1 (aerobic power / anaerobic capacity) lives in Build; band 2
// (anaerobic lactic, RPE 9.5–10) only inside the final ≤4 weeks, with
// interval rest tightening 5s per week toward the goal (density progression).

test('[ADR-0006] Build sport Thursday is 60/60 threshold at RPE 7–8.5', () => {
  // wk8 (even → sport flavor) Thu = 2026-06-25. Uses 'sport' focus explicitly
  // (not 'hybrid') — ADR-0010 fixes hybrid Build Thursday to thu-limit every
  // week, so this session's properties are exercised via sport-focus instead,
  // which stays byte-identical to pre-ADR-0010 behavior.
  const ctx = Program.resolveDate('2026-06-25', '2026-05-04', 12);
  assertEq(ctx.phase, 'build');
  assertEq(ctx.flavor, 'sport');
  const sess = Program.prescribeForContext(ctx, 'sport');
  assertEq(sess.sessionId, 'thu-6060-threshold');
  const iv = sess.exercises.find(e => e.kind === 'circuit');
  assert(iv, '60/60 circuit missing');
  assert(iv.rpeRange[1] <= 8.5, `band-1 ceiling is RPE 8.5, got ${iv.rpeRange[1]}`);
});

test('[ADR-0006] RPE ≥9.5 interval work never appears outside the final 4 weeks', () => {
  for (let wk = 1; wk <= 8; wk++) {           // wks 9–12 are the final-4 window
    for (const off of [3, 5]) {                // Thu, Sat of each week
      const iso = addIsoDays('2026-05-04', (wk - 1) * 7 + off);
      const sess = Program.prescribeForContext(Program.resolveDate(iso, '2026-05-04', 12), 'hybrid');
      const lactic = (sess.exercises || []).filter(e => e.kind === 'circuit' && e.rpeRange && e.rpeRange[0] >= 9.5);
      assertEq(lactic.length, 0, `wk${wk} ${iso}: band-2 lactic work outside the final 4 weeks`);
    }
  }
});

test('[ADR-0006] Peak sport Thursday is 30/30 lactic with density-cut rest', () => {
  // wk10 Thu = 2026-07-09; weeksLeft 2 → 4:00 base − 10s = 3:50 between sets
  const ctx = Program.resolveDate('2026-07-09', '2026-05-04', 12);
  assertEq(ctx.phase, 'peak');
  const sess = Program.prescribeForContext(ctx, 'sport');
  assertEq(sess.sessionId, 'thu-3030-lactic');
  const iv = sess.exercises[0];
  assert(iv.rpeRange[0] >= 9.5, `band-2 floor is RPE 9.5, got ${iv.rpeRange[0]}`);
  assert(iv.prescribed.includes('3:50'), `wk10 rest should be density-cut to 3:50, got "${iv.prescribed}"`);
});

test('[ADR-0006] Sat 4×4 rest tightens only inside the final 4 weeks', () => {
  // wk9 Sat = 2026-07-04 (weeksLeft 3): 4:00 − 5s = 3:55
  const wk9 = Program.prescribeForContext(Program.resolveDate('2026-07-04', '2026-05-04', 12), 'sport');
  assertEq(wk9.sessionId, 'sat-4x4-build');
  assert(wk9.exercises[0].prescribed.includes('3:55'), `expected 3:55 rest, got "${wk9.exercises[0].prescribed}"`);
  // wk8 Sat = 2026-06-27 (weeksLeft 4): outside the window → default 4 min
  const wk8 = Program.prescribeForContext(Program.resolveDate('2026-06-27', '2026-05-04', 12), 'sport');
  assertEq(wk8.sessionId, 'sat-4x4-build');
  assert(wk8.exercises[0].prescribed.includes('4 min'), `expected default 4 min rest, got "${wk8.exercises[0].prescribed}"`);
});

test('[ADR-0006] Sat boulder triples: open-climb mileage is optional (single-system)', () => {
  // wk7 Sat = 2026-06-20, build phase, boulder flavor (KG-B12: triples are Build-only)
  const sess = Program.prescribeForContext(Program.resolveDate('2026-06-20', '2026-05-04', 12), 'boulder');
  assertEq(sess.sessionId, 'sat-boulder-triples');
  const open = sess.exercises.find(e => e.kind === 'open-climb');
  assert(open && open.optional === true, 'open-climb cool-down must be optional');
});

// ─── ADR-0007 remainder: peakType taper + rest-before-goal + volume cut ──

test('[ADR-0007] resolveDate peakType=trip stretches taper to 2 wks', () => {
  // 12-wk trip layout: peak wks 9–10, taper wks 11–12 → wk11 Mon = 2026-07-13
  const comp = Program.resolveDate('2026-07-13', '2026-05-04', 12, 'comp');
  const trip = Program.resolveDate('2026-07-13', '2026-05-04', 12, 'trip');
  assertEq(comp.phase, 'peak');
  assertEq(trip.phase, 'taper');
});

test('[ADR-0007] day before the goal is a forced rest day (rest-pre-goal)', () => {
  // 12-wk cycle from 2026-05-04 ends 2026-07-26 → day before = Sat 2026-07-25
  const ctx = Program.resolveDate('2026-07-25', '2026-05-04', 12);
  assertEq(ctx.slot, 'sat-main', 'fixture: totalDays−2 lands on a Saturday main slot');
  const sess = Program.prescribeForContext(ctx, 'hybrid');
  assertEq(sess.sessionId, 'rest-pre-goal');
  assert(sess.isRest, 'must be a rest day');
});

test('[ADR-0007] taper week gets a step volume cut with taperNote, intensity held', () => {
  const ctx = Program.resolveDate('2026-07-20', '2026-05-04', 12); // taper Mon wk12
  assertEq(ctx.phase, 'taper');
  const sess = Program.prescribeForContext(ctx, 'hybrid');
  assert(sess.taperNote && /volume cut/i.test(sess.taperNote), 'taperNote missing');
  const pull = sess.exercises.find(e => e.kind === 'pullup');
  // KG-B13: template now authors full pre-cut volume (4), so the single
  // taper cut lands at 2 — the "2 × 2" the reps text already states — not
  // the pre-fix double-cut result of 1.
  assertEq(pull.prescribedSets, 2, 'taper pull-up 4 (pre-cut) sets → cut to 2');
  assert(pull.pctRange[0] >= 0.75, 'intensity must be held through the taper cut');
});
