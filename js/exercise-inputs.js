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
// Climbing-kind exercises carry a single concrete prescribedTarget (see
// js/program.js) instead of a separate sets+reps pair — one count input,
// labelled by the target's unit (see repsLabel), replaces both.
const NO_SETS_KINDS  = new Set(['arc', 'open-climb', 'test', 'boulder', 'route', 'circuit', 'limit-boulder', 'campus']);

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
  if (ex?.prescribedTarget?.unit) return ex.prescribedTarget.unit;
  return (ex?.kind === 'arc' || ex?.kind === 'open-climb') ? 'min' : 'reps';
}

// KG-B13: prescribedTarget.unit is always stored plural ('goes', 'problems', …);
// singularize for display when the value is exactly 1 so a cut-down taper
// target reads "1 go" instead of "1 goes". Regular units just drop the
// trailing 's'; 'goes' is the one irregular case in the catalog.
const IRREGULAR_SINGULAR_UNITS = { goes: 'go' };

export function unitLabel(value, unit) {
  if (!unit) return unit;
  if (value !== 1) return unit;
  return IRREGULAR_SINGULAR_UNITS[unit] || (unit.endsWith('s') ? unit.slice(0, -1) : unit);
}

// Per-kind default execution cues (gym-ready spec: docs/specs/gym-ready-prescription-format-spec.md
// §4 — hybrid how-to). A session can override with its own `ex.howto` string for
// phase-specific nuance; this map covers what's true of the kind in any phase.
const HOWTO_BY_KIND = {
  boulder: 'Pick problems near the target grade. Rest until fresh between attempts.',
  route: 'Climb at the target grade/intensity. Full rest between goes.',
  circuit: 'Complete each set back-to-back as prescribed. Rest fully between sets.',
  arc: 'Climb continuously, never stopping. Hold a mild, sustainable pump — never a deep pump.',
  'open-climb': 'Easy mileage. Move well, don\'t push grade.',
  'limit-boulder': 'One all-out go per attempt. Rest fully between attempts. Stop the session when power output drops.',
  campus: 'Big rungs, big moves, minimal contact time on the lower rung. Skip entirely on any finger tweak.',
};

export function howto(ex) {
  if (!ex) return '';
  return ex.howto ?? HOWTO_BY_KIND[ex.kind] ?? '';
}

// Returns true when an actual object has at least one logged value.
// Used by Today (progress count) and Calendar (day-completed indicator).
export function actualHasResult(actual) {
  if (!actual || typeof actual !== 'object') return false;
  return actual.kg != null || actual.sets != null || actual.reps != null ||
    actual.rpe != null || actual.done === true ||
    (typeof actual.raw === 'string' && actual.raw.trim());
}
