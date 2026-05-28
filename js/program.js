// Macrocycle definition + session library + protocol generators.
// Cycle length is configurable per-plan via settings.cycleWeeks (default 12, min 8, max 40).
// Phase split scales with length; Peak (2 wk) and Taper (1–2 wk) are fixed, Base/Build scale.
// Each main day (Mon/Thu/Sat) gets a session keyed by phase + week-flavor (boulder|sport).
//
// See docs/training-philosophy.md and docs/adr/0002-configurable-cycle-length.md for rationale.

export const MIN_CYCLE_WEEKS = 8;
export const MAX_CYCLE_WEEKS = 40;
export const DEFAULT_CYCLE_WEEKS = 12;
// Above this threshold we switch to a double-block (Base→Build → Base→Build → Peak→Taper)
// instead of stretching a single Base further. Coach consensus (Lattice, Hörst, Anderson)
// says single-block adaptations plateau beyond ~20 wk without phase transitions.
const DOUBLE_BLOCK_THRESHOLD = 20;

export function clampCycleWeeks(weeks) {
  const n = Math.round(Number(weeks) || DEFAULT_CYCLE_WEEKS);
  return Math.max(MIN_CYCLE_WEEKS, Math.min(MAX_CYCLE_WEEKS, n));
}

export function cycleDays(weeks) {
  return clampCycleWeeks(weeks) * 7;
}

// Build the per-week phase pattern for any supported cycle length.
// Single block ≤ DOUBLE_BLOCK_THRESHOLD weeks; double block above.
// Deload every 3rd week within Base and Build; retest = last week of Base (each Base block).
const _patternCache = new Map();
export function buildPhasePattern(weeks) {
  const w = clampCycleWeeks(weeks);
  if (_patternCache.has(w)) return _patternCache.get(w);
  const arr = (w > DOUBLE_BLOCK_THRESHOLD) ? _doubleBlock(w) : _singleBlock(w);
  _patternCache.set(w, arr);
  return arr;
}

function _singleBlock(weeks) {
  const peak  = 2;
  const taper = weeks >= 14 ? 2 : 1;
  const remaining = weeks - peak - taper; // base + build
  // Build = ~1/3 of remaining, min 2; Base takes the rest.
  const build = Math.max(2, Math.round(remaining * 0.33));
  const base  = Math.max(2, remaining - build);
  return _composeSingle({ base, build, peak, taper });
}

function _doubleBlock(weeks) {
  const peak  = 2;
  const taper = 2;
  const remaining = weeks - peak - taper;
  // Split into two sub-blocks (Base→Build each).
  const sub1 = Math.floor(remaining / 2);
  const sub2 = remaining - sub1;
  const build1 = Math.max(2, Math.round(sub1 * 0.33));
  const base1  = Math.max(2, sub1 - build1);
  const build2 = Math.max(2, Math.round(sub2 * 0.33));
  const base2  = Math.max(2, sub2 - build2);
  return _composeDouble({ base1, build1, base2, build2, peak, taper });
}

function _composeSingle({ base, build, peak, taper }) {
  const arr = [];
  for (let i = 0; i < base; i++)  arr.push({ phase: 'base',  deload: ((i + 1) % 3 === 0), retest: false });
  for (let i = 0; i < build; i++) arr.push({ phase: 'build', deload: ((i + 1) % 3 === 0), retest: false });
  for (let i = 0; i < peak; i++)  arr.push({ phase: 'peak',  deload: false, retest: false });
  for (let i = 0; i < taper; i++) arr.push({ phase: 'taper', deload: false, retest: false });
  if (base > 0) { arr[base - 1].deload = true; arr[base - 1].retest = true; }
  return arr;
}

function _composeDouble({ base1, build1, base2, build2, peak, taper }) {
  const arr = [];
  for (let i = 0; i < base1; i++)  arr.push({ phase: 'base',  deload: ((i + 1) % 3 === 0), retest: false });
  if (base1 > 0) { arr[base1 - 1].deload = true; arr[base1 - 1].retest = true; }
  for (let i = 0; i < build1; i++) arr.push({ phase: 'build', deload: ((i + 1) % 3 === 0), retest: false });
  const base2Start = arr.length;
  for (let i = 0; i < base2; i++)  arr.push({ phase: 'base',  deload: ((i + 1) % 3 === 0), retest: false });
  if (base2 > 0) { arr[base2Start + base2 - 1].deload = true; arr[base2Start + base2 - 1].retest = true; }
  for (let i = 0; i < build2; i++) arr.push({ phase: 'build', deload: ((i + 1) % 3 === 0), retest: false });
  for (let i = 0; i < peak; i++)   arr.push({ phase: 'peak',  deload: false, retest: false });
  for (let i = 0; i < taper; i++)  arr.push({ phase: 'taper', deload: false, retest: false });
  return arr;
}

// Back-compat export: the 12-week default pattern as a static array.
// Existing callers that read PHASE_PATTERN keep working; new code should call
// Program.phasePattern(plan) or buildPhasePattern(weeks).
export const PHASE_PATTERN = buildPhasePattern(DEFAULT_CYCLE_WEEKS);

// Boulder-emphasis on odd weeks, sport-emphasis on even weeks (alternating).
export function weekFlavor(weekIdx /* 1..N */) {
  return (weekIdx % 2 === 1) ? 'boulder' : 'sport';
}

// Day-of-week → session slot. Mon=1, Tue=2, Wed=3, Thu=4, Fri=5, Sat=6, Sun=0.
const DOW_TO_SLOT = {
  1: 'mon-main',
  2: 'tue-light',
  3: 'rest',
  4: 'thu-main',
  5: 'rest',
  6: 'sat-main',
  0: 'sun-optional'
};

// ============== Hangboard protocols by phase ==============
const HANGBOARD = {
  base: {
    name: 'Min-Edge hangs',
    hang: '12s on smallest edge you can hold ~15s',
    rest: '3 min',
    sets: '5 hangs × 2 sets (half-crimp + open-crimp)',
    prescribedSets: 2, prescribedReps: 5,
    rpeRange: [9, 10],
    edge: 'smallest holdable',
    loadPctRange: null
  },
  build: {
    name: 'Max-Weight 10s',
    hang: '10s weighted',
    rest: '3 min',
    sets: '5 hangs × 2–3 sets',
    prescribedSets: 2, prescribedReps: 5,
    rpeRange: [9, 9.5],
    edge: '20mm',
    loadPctRange: [0.80, 0.90]
  },
  peak: {
    name: '7-53 protocol',
    hang: '7s weighted',
    rest: '53s within set, 3 min between sets',
    sets: '3 hangs × 3–4 sets',
    prescribedSets: 3, prescribedReps: 3,
    rpeRange: [9, 9.5],
    edge: '20mm',
    loadPctRange: [0.85, 0.95]
  },
  taper: {
    name: '7/3 Repeaters (light)',
    hang: '7s × 6 reps',
    rest: '3s within / 3 min between sets',
    sets: '1–2 sets per grip',
    prescribedSets: 1, prescribedReps: 6,
    rpeRange: [7.5, 8.5],
    edge: '20mm',
    loadPctRange: [0.50, 0.60]
  }
};

// ============== Antagonist / accessory block ==============
const ANTAGONIST_BLOCK = [
  { name: 'Push-ups', prescribed: '3 × 15–25' },
  { name: 'Inverted rows / band cactus', prescribed: '3 × 10–15' },
  { name: 'Wrist extensor curls', prescribed: '3 × 20' },
  { name: "Farmer's carry", prescribed: '3 × 20–30 steps' },
  { name: 'Core (plank or hanging knee raise or L-sit)', prescribed: 'choose 1: 3 × 60–90s plank · 3 × 10 HKR · 3 × 10s L-sit' }
];

// ============== Session generators (per slot per phase per flavor) ==============

function pullupPrescription(phase) {
  if (phase === 'base')  return { pctRange: [0.55, 0.70], reps: '5 × 5', prescribedSets: 5, prescribedReps: 5, rpe: [7, 8.5] };
  if (phase === 'build') return { pctRange: [0.80, 0.90], reps: '5 × 3', prescribedSets: 5, prescribedReps: 3, rpe: [8.5, 9.5] };
  if (phase === 'peak')  return { pctRange: [0.85, 0.95], reps: '5 × 2', prescribedSets: 5, prescribedReps: 2, rpe: [9, 9.5] };
  return { pctRange: [0.50, 0.60], reps: '3 × 5', prescribedSets: 3, prescribedReps: 5, rpe: [7, 8] }; // taper
}

function buildMonHangboard(phase, isDeload, focus = 'hybrid') {
  const hb = HANGBOARD[phase];
  const exercises = [
    {
      kind: 'hangboard',
      name: hb.name,
      hang: hb.hang,
      rest: hb.rest,
      sets: hb.sets,
      rpeRange: hb.rpeRange,
      loadPctRange: hb.loadPctRange,
      grip: 'half-crimp + open-crimp'
    },
    {
      kind: 'pullup',
      name: 'Weighted pull-ups',
      ...pullupPrescription(phase)
    }
  ];
  if (focus === 'boulder' && phase === 'build') {
    exercises.push({ kind: 'campus', name: 'Campus warmup ladders', prescribed: '2–3 ladders × 5 min rest', rpeRange: [7, 8] });
  }
  if (focus === 'boulder' && phase === 'peak') {
    exercises.push({ kind: 'campus', name: 'Campus board (1-5-9 / bumps)', prescribed: '3–5 reps × 5 min rest · 20 min cap', rpeRange: [9, 9.5] });
  }
  if (!isDeload) {
    if (focus === 'sport' && (phase === 'base' || phase === 'build')) {
      exercises.push({ kind: 'hangboard', name: '7/3 Repeaters (endurance)', hang: '7s × 6 reps on 20mm', rest: '3s within / 3 min between sets', sets: '3–4 sets', rpeRange: [7.5, 8.5], edge: '20mm', loadPctRange: null });
    }
    exercises.push({ kind: 'antagonist-block', name: 'S&C antagonist block', items: ANTAGONIST_BLOCK });
  }
  return {
    sessionId: `mon-hangboard-${phase}`,
    label: `Hangboard (${phase}) + S&C`,
    energySystem: 'Strength / alactic',
    exercises
  };
}

function buildThuMain(phase, flavor, isDeload) {
  if (flavor === 'boulder') {
    if (phase === 'peak') {
      // Limit + campus
      return {
        sessionId: 'thu-limit-campus',
        label: 'Limit Bouldering + Campus (Peak)',
        energySystem: 'Strength → Power',
        exercises: [
          { kind:'limit-boulder', name: 'Limit boulders', prescribed: '3–5 problems · 3–5 attempts · 3–5 min rest · 2–3 sets', rpeRange: [9, 9.5] },
          { kind:'campus', name: 'Campus board (rotate: ladders / bumps / 1-5-9 / jump-catch)', prescribed: '3–6 reps × 2–5 min rest · 20–30 min cap', rpeRange: [9, 9.5] }
        ]
      };
    }
    if (phase === 'build') {
      return {
        sessionId: 'thu-limit',
        label: 'Limit Bouldering (Build)',
        energySystem: 'Strength',
        exercises: [
          { kind:'limit-boulder', name: 'Limit boulders', prescribed: '3–5 problems · 3–5 attempts · 3–5 min rest · 2–3 sets', rpeRange: [8.5, 9.5] }
        ]
      };
    }
    if (phase === 'taper') {
      return {
        sessionId: 'thu-flash',
        label: 'Flash-grade boulders (Taper)',
        energySystem: 'Power',
        exercises: [
          { kind:'boulder', name: 'Flash-grade boulders', prescribed: '6–10 problems below max · long rest', rpeRange: [7, 8.5] }
        ]
      };
    }
    // base
    return {
      sessionId: 'thu-projecting-base',
      label: 'Projecting / technique boulders',
      energySystem: 'Skill / Strength',
      exercises: [
        { kind:'boulder', name: 'Projecting (mid-grade)', prescribed: '60–90 min of 4×4-style projecting on submaximal problems', rpeRange: [7.5, 9] }
      ]
    };
  }
  // sport-emphasis
  if (phase === 'base') {
    return {
      sessionId: 'thu-route-pyramid',
      label: 'Route pyramid (Base)',
      energySystem: 'Aerobic power / Anaerobic capacity',
      exercises: [
        { kind:'route', name: 'Route pyramid', prescribed: 'pyramid 4-3-2-1 routes climbed back to back; 1 grade below redpoint', rpeRange: [7.5, 9] }
      ]
    };
  }
  if (phase === 'build') {
    return {
      sessionId: 'thu-1on1off',
      label: '1-on-1-off intervals',
      energySystem: 'Aerobic power',
      exercises: [
        { kind:'route', name: '1-on / 1-off intervals', prescribed: '6–8 routes near redpoint, ~1:1 work:rest', rpeRange: [8.5, 9.5] }
      ]
    };
  }
  if (phase === 'peak') {
    return {
      sessionId: 'thu-4x4-routes',
      label: '4×4 route circuits (Peak)',
      energySystem: 'Anaerobic capacity',
      exercises: [
        { kind:'route', name: '4×4 routes (linked boulders/short routes)', prescribed: '4 routes back-to-back · 4 min rest · 3–4 sets', rpeRange: [9, 9.5] }
      ]
    };
  }
  // taper
  return {
    sessionId: 'thu-projects',
    label: 'Project routes (Taper)',
    energySystem: 'Sport-specific',
    exercises: [
      { kind:'route', name: 'Project / redpoint attempts', prescribed: '2–3 quality goes on a project', rpeRange: [9, 9.5] }
    ]
  };
}

function buildSatMain(phase, flavor, isDeload) {
  if (flavor === 'boulder') {
    if (phase === 'peak') {
      return {
        sessionId: 'sat-proj-boulder',
        label: 'Project boulder session',
        energySystem: 'Strength / Power',
        exercises: [
          { kind: 'limit-boulder', name: 'Project attempts', prescribed: '3–5 hard problems · max 5 attempts each · 5+ min rest', rpeRange: [9, 9.5] },
          { kind: 'boulder', name: 'Flash/onsight attempts', prescribed: '3–5 problems at 1 grade below max', rpeRange: [8, 9] }
        ]
      };
    }
    if (phase === 'taper') {
      return {
        sessionId: 'sat-volume-down',
        label: 'Low volume bouldering (Taper)',
        energySystem: 'Maintenance',
        exercises: [
          { kind: 'boulder', name: 'Fun submaximal bouldering', prescribed: '45–60 min at 2–3 grades below max · no projecting', rpeRange: [6, 7.5] }
        ]
      };
    }
    // base / build
    return {
      sessionId: 'sat-boulder-triples',
      label: 'Boulder triples + open climb',
      energySystem: 'Anaerobic capacity / Aerobic base',
      exercises: [
        { kind:'circuit', name: 'Boulder triples (4×4)', prescribed: '4 boulders · climbed back-to-back · 4 min rest · 3–4 sets · 1–2 grades below max', rpeRange: [8.5, 9.5] },
        { kind:'open-climb', name: 'Open climbing (technique)', prescribed: '30–45 min mileage on submax problems', rpeRange: [6, 7.5] }
      ]
    };
  }
  // sport
  if (phase === 'base') {
    return {
      sessionId: 'sat-arc',
      label: 'ARC — aerobic base',
      energySystem: 'Aerobic base',
      exercises: [
        { kind:'arc', name: 'ARC (continuous easy climbing)', prescribed: '2 × 30 min @ 60–70% effort, just below pump · OR 90 min easy laps', rpeRange: [4, 6] }
      ]
    };
  }
  if (phase === 'build') {
    return {
      sessionId: 'sat-4x4-build',
      label: '4×4 power-endurance (Build)',
      energySystem: 'Anaerobic capacity',
      exercises: [
        { kind: 'circuit', name: '4×4 circuits', prescribed: '4 routes/links back-to-back · 4 min rest · 3 sets · at 50–60% redpoint', rpeRange: [8.5, 9.5] }
      ]
    };
  }
  if (phase === 'peak') {
    return {
      sessionId: 'sat-redpoint-peak',
      label: 'Redpoint session (Peak)',
      energySystem: 'Sport-specific',
      exercises: [
        { kind: 'route', name: 'Redpoint attempts', prescribed: '2–4 quality redpoint attempts · 20+ min rest between goes', rpeRange: [9, 9.5] }
      ]
    };
  }
  // taper (and any other phase)
  return {
    sessionId: 'sat-route-mileage',
    label: 'Sport route mileage',
    energySystem: 'Aerobic power',
    exercises: [
      { kind:'route', name: 'Route mileage', prescribed: '6–10 routes 1–2 grades below redpoint, walking rest', rpeRange: [7, 8.5] }
    ]
  };
}

// Retest replaces Mon main on retest deload weeks.
function buildRetestSession() {
  return {
    sessionId: 'mon-retest',
    label: 'Re-test benchmarks',
    energySystem: 'Test',
    isRetest: true,
    exercises: [
      { kind:'test', name: 'Max 10s hang on 20mm edge', prescribed: 'find heaviest 10s hold (RPE 9.5 cap)' },
      { kind:'test', name: '1RM weighted pull-up', prescribed: 'work up to 1 hard rep' },
      { kind:'test', name: 'Max boulder grade today', prescribed: 'flash/send the hardest you can in 60 min' },
      { kind:'test', name: '(optional) Forearm repeater test', prescribed: '7/3 to failure on 20mm @ BW', optional: true }
    ]
  };
}

// Light / rest / optional templates
const LIGHT_DAY = {
  sessionId: 'light',
  label: 'Light: mobility or skill drills',
  energySystem: '—',
  exercises: [
    { kind:'mobility', name: '15–20 min mobility', prescribed: 'shoulders, hips, wrists' },
    { kind:'skill', name: 'Optional skill drills (no fingers)', prescribed: 'footwork / silent feet / flagging', optional: true }
  ]
};

const REST_DAY = {
  sessionId: 'rest',
  label: 'Rest day',
  energySystem: '—',
  isRest: true,
  recoveryChecklist: [
    'Sleep 8h target',
    'Hydration + protein with each meal',
    'Optional 20–30 min easy walk / bike / swim',
    '5–10 min mobility (hips, shoulders, wrists)',
    'No hangboard, no climbing'
  ]
};

// ============== Deload volume cut (Lattice-style) ==============
// Lattice's published deload rule: "drop volume 40–60%, keep intensity."
// We apply this by halving prescribedSets (min 1) on loaded exercises, and
// annotating prescribed-text-only exercises with a "drop a set" note.
// Intensity (kg %) is NOT scaled — see docs/adr/0003-deload-as-volume-cut.md.
const DELOAD_VOLUME_MULTIPLIER = 0.6; // keep 60% of sets

function applyDeloadVolume(session) {
  if (!session?.exercises) return session;
  const out = { ...session, exercises: session.exercises.map(applyDeloadToExercise) };
  out.deloadNote = 'Deload week — volume cut ~40%, intensity held.';
  return out;
}

function applyDeloadToExercise(ex) {
  if (!ex) return ex;
  const next = { ...ex };
  if (typeof next.prescribedSets === 'number' && next.prescribedSets > 1) {
    next.prescribedSets = Math.max(1, Math.floor(next.prescribedSets * DELOAD_VOLUME_MULTIPLIER));
  }
  if (next.kind === 'antagonist-block' && Array.isArray(next.items)) {
    next.items = next.items.map(i => ({ ...i, prescribed: appendDeloadNote(i.prescribed) }));
  }
  if (typeof next.prescribed === 'string') next.prescribed = appendDeloadNote(next.prescribed);
  if (typeof next.sets === 'string')       next.sets       = appendDeloadNote(next.sets);
  return next;
}

function appendDeloadNote(text) {
  if (!text) return text;
  if (/deload/i.test(text)) return text;
  return text + ' · Deload: drop ~40% volume';
}

// ===== Public API =====
export const Program = {
  PHASE_PATTERN,
  HANGBOARD,
  ANTAGONIST_BLOCK,
  DEFAULT_CYCLE_WEEKS,
  MIN_CYCLE_WEEKS,
  MAX_CYCLE_WEEKS,

  weekFlavor,
  buildPhasePattern,
  cycleDays,
  clampCycleWeeks,

  // Resolve cycleWeeks from settings (default to DEFAULT_CYCLE_WEEKS).
  cycleWeeksOf(settings) {
    return clampCycleWeeks(settings?.cycleWeeks ?? DEFAULT_CYCLE_WEEKS);
  },

  // Per-plan phase pattern.
  phasePattern(settings) {
    return buildPhasePattern(this.cycleWeeksOf(settings));
  },

  // Given a comp/peak date (ISO YYYY-MM-DD) and cycle length (weeks), returns the
  // cycle start date that places the final cycle day on the comp date.
  computeStartFromComp(compDateIso, cycleWeeks = DEFAULT_CYCLE_WEEKS) {
    if (!compDateIso) return null;
    const d = new Date(compDateIso + 'T00:00:00');
    d.setDate(d.getDate() - (cycleDays(cycleWeeks) - 1));
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${m}-${day}`;
  },

  // Resolve the effective cycle start date based on settings.anchorMode + cycleWeeks.
  effectiveStart(settings) {
    if (!settings) return null;
    if (settings.anchorMode === 'compDate' && settings.compDate) {
      return this.computeStartFromComp(settings.compDate, this.cycleWeeksOf(settings));
    }
    return settings.startDate || null;
  },

  // Returns {weekIdx 1..N, dayIdx 0..6, phase, deload, retest, flavor, slot} for a given date relative to startDate.
  // cycleWeeks defaults to 12 for back-compat with callers that haven't been updated.
  resolveDate(dateStr, startDateStr, cycleWeeks = DEFAULT_CYCLE_WEEKS) {
    if (!startDateStr) return null;
    const start = new Date(startDateStr + 'T00:00:00');
    const d = new Date(dateStr + 'T00:00:00');
    const diffDays = Math.floor((d - start) / 86400000);
    const totalDays = cycleDays(cycleWeeks);
    if (diffDays < 0 || diffDays >= totalDays) return { outOfCycle: true, diffDays };
    const pattern = buildPhasePattern(cycleWeeks);
    const weekIdx = Math.floor(diffDays / 7) + 1;
    const dayInWeek = diffDays % 7; // 0=Mon
    const dow = d.getDay();
    const slot = DOW_TO_SLOT[dow];
    const ph = pattern[weekIdx - 1];
    return {
      weekIdx,
      dayInWeek,
      dow,
      slot,
      phase: ph.phase,
      deload: !!ph.deload,
      retest: !!ph.retest,
      flavor: weekFlavor(weekIdx),
      isMain: slot === 'mon-main' || slot === 'thu-main' || slot === 'sat-main',
      isRest: slot === 'rest',
      cycleWeeks: clampCycleWeeks(cycleWeeks),
      totalDays
    };
  },

  // Builds the prescribed session for a given resolved date context (no load resolution yet).
  prescribeForContext(ctx, focus = 'hybrid') {
    const weeks = ctx?.cycleWeeks ?? DEFAULT_CYCLE_WEEKS;
    if (!ctx || ctx.outOfCycle) {
      return { sessionId: 'out-of-cycle', label: `Outside ${weeks}-week cycle`, exercises: [] };
    }
    const { phase, flavor, slot, deload, retest } = ctx;
    const resolvedFlavor = focus === 'hybrid' ? flavor : focus;

    if (slot === 'rest') return REST_DAY;
    if (slot === 'tue-light') return LIGHT_DAY;
    if (slot === 'sun-optional') {
      return {
        sessionId: 'sun-optional',
        label: 'Optional: easy open climb or rest',
        energySystem: 'Aerobic base / —',
        exercises: [
          { kind:'open-climb', name: 'Easy open climbing (optional)', prescribed: '45–90 min mileage well below max', rpeRange: [4, 6], optional: true }
        ]
      };
    }

    let session;
    if (slot === 'mon-main') {
      if (deload && retest) session = buildRetestSession();
      else session = buildMonHangboard(phase, deload, focus);
    } else if (slot === 'thu-main') {
      session = buildThuMain(phase, resolvedFlavor, deload);
    } else if (slot === 'sat-main') {
      session = buildSatMain(phase, resolvedFlavor, deload);
    } else {
      session = LIGHT_DAY;
    }

    // Apply Lattice-style volume cut on deload weeks (not for retest — that has its own structure).
    if (deload && !retest && !session.isRest) {
      session = applyDeloadVolume(session);
    }

    return { ...session, phase, flavor: resolvedFlavor, focus, deload, retest, weekIdx: ctx.weekIdx, cycleWeeks: weeks };
  },

  // Primary entry point: builds a session from a plan object and an ISO date string.
  build(plan, dateISO) {
    const start = this.effectiveStart(plan?.settings);
    const ctx = this.resolveDate(dateISO, start, this.cycleWeeksOf(plan?.settings));
    return this.prescribeForContext(ctx, plan?.focus || 'hybrid');
  }
};
