// Technique-drill catalog (KG-A9 addendum — docs/specs/technique-drill-library-spec.md).
// Single source of truth for both the Tuesday light-day picker (all 19 drills,
// grouped by category) and the Thu/Sat warm-up picker (WARMUP_DRILLS subset).
export const DRILL_CATEGORIES = [
  { key: 'footwork', name: 'Footwork & balance' },
  { key: 'positioning', name: 'Body positioning' },
  { key: 'reading', name: 'Route-reading & beta' },
  { key: 'pacing', name: 'Pacing & resting' },
  { key: 'mental', name: 'Mental & composure' },
];

export const SKILL_DRILLS = [
  { key: 'silent-feet', name: 'Silent feet', category: 'footwork', contexts: ['tuesday', 'warmup'],
    focus: 'Place each foot once, deliberately, with no readjusting or scraping. Look at the hold, commit, weight it fully before moving your hands.' },
  { key: 'flagging', name: 'Flagging', category: 'footwork', contexts: ['tuesday', 'warmup'],
    focus: 'Use inside/outside flags on steep or off-balance moves instead of pulling in harder. Keep your hips close to the wall.' },
  { key: 'target-practice', name: 'Target practice', category: 'footwork', contexts: ['tuesday', 'warmup'],
    focus: 'Before each foot move, pick the single best spot on the hold, then place your toe on that exact spot without taking your eyes off it. Keep the foot still once placed — move your body, not your foot.' },
  { key: 'downclimbing', name: 'Downclimbing', category: 'footwork', contexts: ['tuesday', 'warmup'],
    focus: 'After topping out an easy climb, downclimb it on the same holds — look for feet, weight them precisely, control your hips. Keep it 2+ grades below max and stop before your forearms load up.' },
  { key: 'edge-pivoting', name: 'Edge pivoting', category: 'footwork', contexts: ['tuesday', 'warmup'],
    focus: 'Place the inside edge of your big toe on a hold, then pivot round so the outside edge takes the same hold, without lifting off. Start on big holds and shrink the hold as it gets smooth.' },

  { key: 'quiet-hands', name: 'Quiet hands', category: 'positioning', contexts: ['tuesday', 'warmup'],
    focus: 'Rest on straight arms between moves. Minimize grip time — move your hands quickly and precisely instead of death-gripping while you look for the next hold.' },
  { key: 'turn-and-reach', name: 'Turn-and-reach', category: 'positioning', contexts: ['tuesday', 'warmup'],
    focus: 'Every time you reach, rotate the same-side hip into the wall first, then extend off a straight arm. Feel the reach get longer without pulling harder.' },
  { key: 'backstep-ladder', name: 'Backstep / drop-knee ladder', category: 'positioning', contexts: ['tuesday'],
    focus: 'On an easy overhanging route, backstep or drop-knee every single move — no square-on climbing allowed. Keep hips sucked into the wall and arms long.' },
  { key: 'straight-arm-traverse', name: 'Straight-arm traverse', category: 'positioning', contexts: ['tuesday', 'warmup'],
    focus: "Traverse or climb easy ground keeping your arms straight the whole time — move by shifting hips and bending legs, never by bending elbows. Unlike quiet hands' static rests, this is straight arms as your default while moving." },
  { key: 'open-closed-hips', name: 'Open vs. closed hips', category: 'positioning', contexts: ['tuesday'],
    focus: 'Climb the same easy route twice: once square to the wall with hips open and frogged, once with hips closed using backsteps and drop-knees on every move. Notice which moves each style makes cheap.' },

  { key: 'ground-up-read', name: 'Ground-up read & mime', category: 'reading', contexts: ['tuesday', 'warmup'],
    focus: 'Before pulling on, read the whole line: pick every handhold, mime the sequence with your eyes on the route, note the crux. Climb it, then compare what happened with your plan.' },
  { key: 'first-touch', name: 'First touch', category: 'reading', contexts: ['tuesday', 'warmup'],
    focus: 'Use every handhold exactly as you first touch it — no readjusting, no regripping. Wrong grab? Live with it to the next hold.' },
  { key: 'rest-spotting-read', name: 'Rest-spotting read', category: 'reading', contexts: ['tuesday', 'warmup'],
    focus: 'Before a route, identify from the ground every rest and clipping stance you expect to use — then verify each one on the way up.' },

  { key: 'g-tox', name: 'G-tox shakeout', category: 'pacing', contexts: ['tuesday', 'warmup'],
    focus: 'At every rest, alternate shaking each arm overhead and hanging at your side, 5–10 seconds per position. Gravity drains the pump faster than a dangle-only shake.' },
  { key: 'pace-shifting', name: 'Pace shifting', category: 'pacing', contexts: ['tuesday', 'warmup'],
    focus: 'Match your speed to the terrain: attack hard sections fast and decisive, then deliberately slow down, relax your grip, and breathe on easy ground.' },
  { key: 'continuous-breathing', name: 'Continuous breathing', category: 'pacing', contexts: ['tuesday', 'warmup'],
    focus: 'Climb an easy route breathing steadily and audibly the whole way — exhale on hard pulls. Caught holding your breath? Pause, reset with one slow breath, continue.' },

  { key: 'falling-practice', name: 'Falling practice (lead)', category: 'mental', contexts: ['tuesday'],
    focus: 'With a spotter or top-rope backup, practice controlled falls a few bolts up on steep terrain. Builds fall confidence for lead climbing.' },
  { key: 'centering-breath', name: 'Pre-climb centering breath', category: 'mental', contexts: ['tuesday', 'warmup'],
    focus: 'Before every attempt, stand at the base and box-breathe — in for 4, hold 4, out 4 — until your shoulders drop. Same ritual, every climb.' },
  { key: 'no-take-lap', name: 'No-take commitment lap', category: 'mental', contexts: ['tuesday'],
    focus: "Pick an easy lead and ban the word 'take': you climb to the anchor or fall trying — no grabbing draws, no hanging to think." },
];

// Thu/Sat warm-up picker subset — narrowed to pure-movement categories only
// (footwork + body positioning) per ticket #18; reading/pacing/mental drills
// stay Tuesday-only in practice even though some carry a 'warmup' context tag.
export const WARMUP_DRILLS = SKILL_DRILLS.filter(d =>
  d.contexts.includes('warmup') && (d.category === 'footwork' || d.category === 'positioning')
);
