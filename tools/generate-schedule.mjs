// Regenerate the "Generated 12-Week Schedule" section of docs/training-plan.md
// from the app's real Program module (js/program.js). Run from the repo root:
//
//   node --experimental-default-type=module tools/generate-schedule.mjs
//
// The flag is required because the repo has no package.json — it tells Node to
// treat the app's extensionless-".js" ES modules as ESM. The script replaces
// everything from the section marker to end-of-file; content above the marker
// is untouched. Uses a nominal Monday start so day-of-week slots resolve
// exactly as in the app; dates themselves are not shown.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { Program } from '../js/program.js';
import { addDays } from '../js/dates.js';

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DOC_PATH = join(REPO_ROOT, 'docs', 'training-plan.md');
const MARKER = '## Generated 12-Week Schedule';

const START = '2024-01-01'; // a Monday — only used to resolve weekday slots
const plan = { focus: 'hybrid', settings: { cycleWeeks: 12, peakType: 'comp', anchorMode: 'startDate', startDate: START } };
const WEEKS = 12;

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function pct(range) {
  if (!range) return null;
  return `${Math.round(range[0] * 100)}–${Math.round(range[1] * 100)}%`;
}

function targetBit(ex) {
  const t = ex.prescribedTarget;
  if (!t) return null;
  if (ex.originalTarget && ex.originalTarget.value !== t.value) {
    return `target today: ${t.value} ${t.unit} (cut from ${ex.originalTarget.value})`;
  }
  if (ex.rampedFrom && ex.rampedFrom.value !== t.value) {
    return `target today: ${t.value} ${t.unit} (ramped up from ${ex.rampedFrom.value})`;
  }
  return `target: ${t.value} ${t.unit}`;
}

function exLine(ex) {
  const bits = [];
  if (ex.kind === 'hangboard') {
    bits.push(`${ex.hang}, ${ex.sets}`.replace(/\s+/g, ' '));
    if (ex.rest) bits.push(`rest ${ex.rest}`);
    if (ex.loadPctRange) bits.push(`${pct(ex.loadPctRange)} of max-hang added load`);
    else bits.push('bodyweight');
  } else if (ex.kind === 'pullup') {
    bits.push(`${ex.reps}`);
    if (typeof ex.prescribedSets === 'number' && `${ex.prescribedSets} × ${ex.prescribedReps}` !== ex.reps.replace(/\s/g, ' ')) {
      bits.push(`(sets today: ${ex.prescribedSets} × ${ex.prescribedReps})`);
    }
    if (ex.rest) bits.push(ex.rest);
    if (ex.pctRange) bits.push(`${pct(ex.pctRange)} of 1RM added load`);
  } else if (ex.kind === 'antagonist-block') {
    bits.push(ex.items.map(i => `${i.name}: ${i.prescribed}`).join('; '));
  } else if (ex.prescribed) {
    bits.push(ex.prescribed);
  }
  if (ex.rpeRange) bits.push(`RPE ${ex.rpeRange[0]}–${ex.rpeRange[1]}`);
  const target = targetBit(ex);
  if (target) bits.push(target);
  if (ex.optional) bits.push('*(optional)*');
  return `  - **${ex.name}** — ${bits.join(' · ')}`;
}

function sessionBlock(dayName, s) {
  if (s.isRest) {
    const label = s.sessionId === 'rest-pre-goal' ? '**Full rest — goal day tomorrow**' : 'Rest day';
    return [`- **${dayName}** — ${label}`];
  }
  const flags = [];
  if (s.deloadNote) flags.push('deload: volume −40%, intensity held');
  if (s.taperNote) flags.push('taper: volume cut, intensity held');
  if (s.rampNote) flags.push(s.rampNote.replace(/\.$/, '') + ' (ADR-0009)');
  if (s.isRetest) flags.push('retest — benchmarks recalculate after this');
  const head = `- **${dayName}** — ${s.label}${s.energySystem && s.energySystem !== '—' ? ` *(${s.energySystem})*` : ''}${flags.length ? ` — _${flags.join('; ')}_` : ''}`;
  return [head, ...s.exercises.map(exLine)];
}

const out = [];
out.push(MARKER + ' (hybrid focus, comp peak)');
out.push('');
out.push('> **Auto-generated from `js/program.js`** (`Program.build`, default 12-week cycle, `focus: hybrid`, `peakType: comp`).');
out.push('> Regenerate with `node --experimental-default-type=module tools/generate-schedule.mjs` after changing `js/program.js` — do not hand-edit this section.');
out.push('> Loads show the prescribed **% of benchmark added load**; the app converts these to kg from your benchmarks and applies targets-hit progression / auto-adjust / readiness / layoff-decay on the day (ADR-0009).');
out.push('> Deload/taper volume cuts and the Base aerobic volume ramp are shown already applied. Every session gets the standard two-stage warm-up and cool-down from `js/warmup.js`.');
out.push('');

for (let wk = 1; wk <= WEEKS; wk++) {
  const monSession = Program.build(plan, addDays(START, (wk - 1) * 7));
  const { phase, deload, retest, flavor } = monSession;
  const tags = [];
  if (deload && retest) tags.push('deload + retest');
  else if (deload) tags.push('deload');
  out.push(`### Week ${wk} — ${phase[0].toUpperCase()}${phase.slice(1)}${tags.length ? ` (${tags.join(', ')})` : ''} · ${flavor}-flavor week`);
  out.push('');
  for (let d = 0; d < 7; d++) {
    const dayIdx = (wk - 1) * 7 + d;
    const s = Program.build(plan, addDays(START, dayIdx));
    if (dayIdx === WEEKS * 7 - 1) {
      out.push(`- **${DAY_NAMES[d]}** — 🏁 **Goal / comp day** *(app renders this day as “${s.label}”)*`);
      continue;
    }
    out.push(...sessionBlock(DAY_NAMES[d], s));
  }
  out.push('');
}

out.push('_Final cycle day (Week 12 Sunday) is the goal/comp day; the day before is always full rest (ADR-0007)._');
out.push('');

const doc = readFileSync(DOC_PATH, 'utf8');
const idx = doc.indexOf(MARKER);
if (idx === -1) throw new Error(`Marker "${MARKER}" not found in ${DOC_PATH}`);
writeFileSync(DOC_PATH, doc.slice(0, idx) + out.join('\n'));
console.log(`Regenerated "${MARKER}" section of ${DOC_PATH}`);
