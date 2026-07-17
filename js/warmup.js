// Warm-up & cooldown checklists by session type.
import { WARMUP_DRILLS } from './drills.js';

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

// ADR-0012: staleness-gated Build-Monday micro-retest — a 15-minute max-hang
// -only re-measurement folded into the first Build Monday's warm-up, only
// when the stored benchmark is older than ~4 weeks (silent at the default
// 12-week cycle shape, where the week-6 retest just ran). Threshold is an
// app convention (unvalidated — KG-C7 posture), not a validated cutoff.
const MICRO_RETEST_STALE_DAYS = 28;

export const Warmup = {
  // opts.microRetest (ADR-0012, optional): true when this session is the
  // first Build Monday AND the stored benchmark is stale — appends a
  // 15-minute max-hang-only micro-retest step to the warm-up.
  forSession(session, opts = null) {
    if (!session) return { warmup: [], cooldown: [], skillDrills: null };
    const id = session.sessionId || '';
    const isHangboard = id.startsWith('mon-hangboard') || id === 'mon-retest';
    const isClimbing  = id.startsWith('thu-') || id.startsWith('sat-');
    if (session.isRest) return { warmup: [], cooldown: [], skillDrills: null };

    let warmup = [...TWO_STAGE_WARMUP];
    if (isHangboard) warmup = warmup.concat(HANGBOARD_PROGRESSION);
    if (isClimbing)  warmup = warmup.concat(CLIMBING_PROGRESSION);
    if (opts?.microRetest) {
      warmup = warmup.concat(['15-min micro-retest: find today\'s heaviest 10s max hang on 20mm (RPE 9.5 cap) — your last benchmark is 4+ weeks old (ADR-0012)']);
    }

    return {
      warmup,
      cooldown: COOLDOWN_GENERIC,
      // Optional technique-drill picker (KG-A9 addendum), Thu/Sat only — narrowed
      // to footwork+positioning so it doesn't clutter the pre-session checklist.
      skillDrills: isClimbing ? WARMUP_DRILLS : null
    };
  },
  MICRO_RETEST_STALE_DAYS,
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
