// 12-week macrocycle definition + session library + protocol generators.
// Phase pattern: weeks 1-6 Base [B B D B B D], 7-9 Build [B B D], 10-11 Peak [P P], 12 Taper [T].
// Each main day (Mon/Thu/Sat) gets a session keyed by phase + week-flavor (boulder|sport).

export const PHASE_PATTERN = [
  // weeks 1..12
  { phase: 'base',  deload: false }, // 1
  { phase: 'base',  deload: false }, // 2
  { phase: 'base',  deload: true,  retest: true }, // 3
  { phase: 'base',  deload: false }, // 4
  { phase: 'base',  deload: false }, // 5
  { phase: 'base',  deload: true,  retest: true }, // 6
  { phase: 'build', deload: false }, // 7
  { phase: 'build', deload: false }, // 8
  { phase: 'build', deload: true  }, // 9
  { phase: 'peak',  deload: false }, // 10
  { phase: 'peak',  deload: false }, // 11
  { phase: 'taper', deload: false }, // 12
];

// Boulder-emphasis on odd weeks, sport-emphasis on even weeks (alternating).
export function weekFlavor(weekIdx /* 1..12 */) {
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
    rpeRange: [9, 10],
    edge: 'smallest holdable',
    // Load: bodyweight only on small edge (no weight added in base)
    loadPctRange: null
  },
  build: {
    name: 'Max-Weight 10s',
    hang: '10s weighted',
    rest: '3 min',
    sets: '5 hangs × 2–3 sets',
    rpeRange: [9, 9.5],
    edge: '20mm',
    // Add weight = 80–90% of max-hang added load
    loadPctRange: [0.80, 0.90]
  },
  peak: {
    name: '7-53 protocol',
    hang: '7s weighted',
    rest: '53s within set, 3 min between sets',
    sets: '3 hangs × 3–4 sets',
    rpeRange: [9, 9.5],
    edge: '20mm',
    loadPctRange: [0.85, 0.95]
  },
  taper: {
    name: '7/3 Repeaters (light)',
    hang: '7s × 6 reps',
    rest: '3s within / 3 min between sets',
    sets: '1–2 sets per grip',
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
  if (phase === 'base')  return { pctRange: [0.55, 0.70], reps: '5 × 5', rpe: [7, 8.5] };
  if (phase === 'build') return { pctRange: [0.80, 0.90], reps: '5 × 3', rpe: [8.5, 9.5] };
  if (phase === 'peak')  return { pctRange: [0.85, 0.95], reps: '5 × 2', rpe: [9, 9.5] };
  return { pctRange: [0.50, 0.60], reps: '3 × 5', rpe: [7, 8] }; // taper
}

function buildMonHangboard(phase, isDeload) {
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
  if (!isDeload) {
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
  // sport: ARC / mileage
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
      { kind:'test', name: '(optional) Forearm repeater test', prescribed: '7/3 to failure on 20mm @ BW' }
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
    { kind:'skill', name: 'Optional skill drills (no fingers)', prescribed: 'footwork / silent feet / flagging' }
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

// ===== Public API =====
export const Program = {
  PHASE_PATTERN,
  HANGBOARD,
  ANTAGONIST_BLOCK,

  weekFlavor,

  // Given a comp/peak date (ISO YYYY-MM-DD), returns the cycle start date that
  // would place the final cycle day (day 84) on the comp date.
  computeStartFromComp(compDateIso) {
    if (!compDateIso) return null;
    const d = new Date(compDateIso + 'T00:00:00');
    d.setDate(d.getDate() - 83);
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${m}-${day}`;
  },

  // Resolve the effective cycle start date based on settings.anchorMode.
  effectiveStart(settings) {
    if (!settings) return null;
    if (settings.anchorMode === 'compDate' && settings.compDate) {
      return this.computeStartFromComp(settings.compDate);
    }
    return settings.startDate || null;
  },

  // Returns {weekIdx 1..12, dayIdx 0..6, phase, deload, retest, flavor, slot} for a given date relative to startDate.
  resolveDate(dateStr, startDateStr) {
    if (!startDateStr) return null;
    const start = new Date(startDateStr + 'T00:00:00');
    const d = new Date(dateStr + 'T00:00:00');
    const diffDays = Math.floor((d - start) / 86400000);
    if (diffDays < 0 || diffDays >= 84) return { outOfCycle: true, diffDays };
    const weekIdx = Math.floor(diffDays / 7) + 1;
    const dayInWeek = diffDays % 7; // 0=Mon
    const dow = d.getDay();
    const slot = DOW_TO_SLOT[dow];
    const ph = PHASE_PATTERN[weekIdx - 1];
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
      isRest: slot === 'rest'
    };
  },

  // Builds the prescribed session for a given resolved date context (no load resolution yet).
  prescribeForContext(ctx) {
    if (!ctx || ctx.outOfCycle) {
      return { sessionId: 'out-of-cycle', label: 'Outside 12-week cycle', exercises: [] };
    }
    const { phase, flavor, slot, deload, retest } = ctx;

    if (slot === 'rest') return REST_DAY;
    if (slot === 'tue-light') return LIGHT_DAY;
    if (slot === 'sun-optional') {
      return {
        sessionId: 'sun-optional',
        label: 'Optional: easy open climb or rest',
        energySystem: 'Aerobic base / —',
        exercises: [
          { kind:'open-climb', name: 'Easy open climbing (optional)', prescribed: '45–90 min mileage well below max', rpeRange: [4, 6] }
        ]
      };
    }

    let session;
    if (slot === 'mon-main') {
      if (deload && retest) session = buildRetestSession();
      else session = buildMonHangboard(phase, deload);
    } else if (slot === 'thu-main') {
      session = buildThuMain(phase, flavor, deload);
    } else if (slot === 'sat-main') {
      session = buildSatMain(phase, flavor, deload);
    } else {
      session = LIGHT_DAY;
    }

    return { ...session, phase, flavor, deload, retest, weekIdx: ctx.weekIdx };
  }
};
