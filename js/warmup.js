// Warm-up & cooldown checklists by session type.
const TWO_STAGE_WARMUP = [
  '5 min easy cardio (jog / bike / row)',
  'Synovial: wrist / elbow / shoulder / hip joint circles 30s each',
  'Fascial: dynamic mobility — arm swings, leg swings, T-spine rotations',
  'Shoulder band routine: external rotations, Y-T-W (10–12 reps each)'
];

const HANGBOARD_PROGRESSION = [
  '3 progressive hangs on jug @ 40% load · 5s',
  '3 progressive hangs @ 60% load · 5s',
  '2 hangs @ 80% load · 5s'
];

const CLIMBING_PROGRESSION = [
  '4–6 easy boulders / routes V0–V3 (or 5.7–5.9), focus footwork',
  '2–3 moderate problems (~2 grades below working level)',
  '1 problem near working level to flip the switch'
];

const COOLDOWN_GENERIC = [
  'Easy traverse 5–10 min OR walk 5 min',
  'Forearm flexor + extensor stretches (30s × 2 each)',
  'Shoulder & lat stretches (30s each)',
  'Hydrate, refuel within 30 min'
];

export const Warmup = {
  forSession(session) {
    if (!session) return { warmup: [], cooldown: [] };
    const id = session.sessionId || '';
    const isHangboard = id.startsWith('mon-hangboard') || id === 'mon-retest';
    const isClimbing  = id.startsWith('thu-') || id.startsWith('sat-');
    if (session.isRest) return { warmup: [], cooldown: [] };

    let warmup = [...TWO_STAGE_WARMUP];
    if (isHangboard) warmup = warmup.concat(HANGBOARD_PROGRESSION);
    if (isClimbing)  warmup = warmup.concat(CLIMBING_PROGRESSION);

    return {
      warmup,
      cooldown: COOLDOWN_GENERIC
    };
  },
  restRecoveryChecklist() {
    return [
      'Sleep 8h target',
      'Hydration: water + electrolytes throughout day',
      'Protein with each meal (~20–25g)',
      'Optional: 20–30 min easy walk / bike / swim',
      '5–10 min mobility (hips, shoulders, wrists)',
      'No hangboard, no climbing today'
    ];
  }
};
