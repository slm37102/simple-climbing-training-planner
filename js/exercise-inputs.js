// Shared mapping of exercise kind/flags → which input fields to show.
// Used by both Today tab (today.js) and Log edit form (log.js) so they stay in sync.
//
// kg     — weighted load (only meaningful for weighted hangs / pull-ups / test 1RMs)
// sets   — number of sets (skip for single-effort or time-based: test, arc, open-climb)
// reps   — repetitions (or minutes for arc/open-climb)
// rpe    — perceived effort
//
// optional: true on an exercise → hide all numeric inputs; show "Done ✓" checkbox only.
// kind === 'antagonist-block' → no inputs at all (composite item; uses notes).

const NO_INPUT_KINDS = new Set(['antagonist-block', 'mobility', 'skill']);
const KG_KINDS       = new Set(['hangboard', 'pullup', 'test']);
const NO_SETS_KINDS  = new Set(['arc', 'open-climb', 'test']);

export function inputVisibility(ex) {
  if (!ex) return { kg: false, sets: false, reps: false, rpe: false, optional: false, none: true };
  if (ex.optional) {
    return { kg: false, sets: false, reps: false, rpe: false, optional: true, none: false };
  }
  if (NO_INPUT_KINDS.has(ex.kind)) {
    return { kg: false, sets: false, reps: false, rpe: false, optional: false, none: true };
  }
  return {
    kg:    KG_KINDS.has(ex.kind),
    sets:  !NO_SETS_KINDS.has(ex.kind),
    reps:  true,
    rpe:   true,
    optional: false,
    none: false,
  };
}

export function repsLabel(ex) {
  return (ex.kind === 'arc' || ex.kind === 'open-climb') ? 'min' : 'reps';
}

// Returns true when an actual object has at least one logged value.
// Used by Today (progress count) and Calendar (day-completed indicator).
export function actualHasResult(actual) {
  if (!actual || typeof actual !== 'object') return false;
  return actual.kg != null || actual.sets != null || actual.reps != null ||
    actual.rpe != null || actual.done === true ||
    (typeof actual.raw === 'string' && actual.raw.trim());
}
