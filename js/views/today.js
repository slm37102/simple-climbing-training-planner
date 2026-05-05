// Today view: prescribed session for today, readiness, warm-up, exercises with loads, log form, cooldown.
import { Storage } from '../storage.js';
import { Program } from '../program.js';
import { Loads } from '../loads.js';
import { Warmup } from '../warmup.js';

function todayIso() {
  const d = new Date();
  const m = String(d.getMonth()+1).padStart(2,'0'), day = String(d.getDate()).padStart(2,'0');
  return `${d.getFullYear()}-${m}-${day}`;
}

function findPrevSameSession(date, sessionId) {
  const days = Storage.listDays();
  for (let i = days.length - 1; i >= 0; i--) {
    const [d, entry] = days[i];
    if (d >= date) continue;
    if (entry.sessionId === sessionId && entry.exercises) return entry;
  }
  return null;
}

function asActualObj(a) {
  if (!a) return {};
  if (typeof a === 'string') {
    // legacy fallback (shouldn't happen post-migration)
    return { raw: a };
  }
  return a;
}

function n(v) { return v == null || v === '' ? '' : v; }

export function renderToday(root) {
  const state = Storage.get();
  const date = todayIso();
  const start = Program.effectiveStart(state.settings);

  if (!start) {
    root.innerHTML = `<div class="card"><h2>Set up your cycle</h2>
      <p class="muted">Add benchmarks and pick a cycle anchor (start date or competition date) to begin.</p>
      <button class="primary" onclick="location.hash='#benchmarks'">Go to Benchmarks</button></div>`;
    return;
  }

  const ctx = Program.resolveDate(date, start);
  if (ctx?.outOfCycle) {
    const which = state.settings.anchorMode === 'compDate'
      ? `Cycle window: ${start} → ${state.settings.compDate}`
      : `Cycle starts ${start}`;
    root.innerHTML = `<div class="card"><h2>Outside cycle</h2>
      <p class="muted">Today (${date}) is outside the 12-week window. ${which}.</p>
      <button class="ghost" onclick="location.hash='#benchmarks'">Adjust cycle</button></div>`;
    return;
  }

  const session = Program.prescribeForContext(ctx);
  const dayLog = Storage.getDay(date) || {};
  const readiness = dayLog.readiness || { sleep:3, soreness:3, fatigue:3 };
  const { multiplier, label: rdLabel, avg: rdAvg } = Loads.computeReadinessMultiplier(readiness);

  const phaseBadge = `<span class="badge ${ctx.phase}">${ctx.phase}</span>`;
  const flavorBadge = `<span class="badge">${ctx.flavor}</span>`;
  const deloadBadge = ctx.deload ? `<span class="badge deload">DELOAD</span>` : '';
  const retestBadge = session.isRetest ? `<span class="badge">RETEST</span>` : '';
  const energyTip = session.energySystem ? `<span class="info-badge" title="Energy system: ${session.energySystem}">i</span>` : '';

  const { warmup, cooldown } = Warmup.forSession(session);

  let body = `<div class="card">
    <div class="session-head">
      <h2>${date} · Wk ${ctx.weekIdx}</h2>
      ${phaseBadge}${flavorBadge}${deloadBadge}${retestBadge}${energyTip}
    </div>
    <div class="muted" style="margin-top:6px">${session.label}</div>
  </div>`;

  if (session.isRest) {
    body += `<div class="card"><h2>Recovery checklist</h2>
      <ul class="checklist">${Warmup.restRecoveryChecklist().map((t,i) =>
        `<li><label style="display:flex;gap:8px;cursor:pointer"><input type="checkbox" data-rest-check="${i}" ${dayLog?.recovery?.[i]?'checked':''}> ${t}</label></li>`).join('')}</ul>
      <p class="muted">Recovered well? It will improve tomorrow's readiness.</p></div>`;
    root.innerHTML = body;
    root.querySelectorAll('input[data-rest-check]').forEach(cb => {
      cb.addEventListener('change', () => {
        const cur = dayLog.recovery || {};
        cur[cb.dataset.restCheck] = cb.checked;
        Storage.setDay(date, { sessionId: 'rest', status: 'rest', recovery: cur });
      });
    });
    return;
  }

  // Readiness — pill selectors
  const readinessRow = (key) => `
    <div class="field">
      <label>${key}</label>
      <div class="pill-group" data-pill-group="${key}">
        ${[1,2,3,4,5].map(v =>
          `<div class="pill ${readiness[key]===v?'active':''}" data-pill="${key}" data-val="${v}">${v}</div>`
        ).join('')}
      </div>
    </div>`;

  body += `<div class="card"><h2>Readiness</h2>
    ${readinessRow('sleep')}
    ${readinessRow('soreness')}
    ${readinessRow('fatigue')}
    <p class="muted" data-readiness-summary>Avg ${rdAvg ? rdAvg.toFixed(1) : '—'} → <b>${rdLabel}</b> ${multiplier ? `(×${multiplier})` : ''}</p>
  </div>`;

  // Warm-up — collapsed
  if (warmup.length) {
    const checkedCount = Object.values(dayLog?.warmup || {}).filter(Boolean).length;
    body += `<div class="card"><details ${checkedCount === 0 ? '' : ''}>
      <summary>Warm-up <span class="count">${checkedCount}/${warmup.length}</span></summary>
      <ul class="checklist">${warmup.map((t,i) =>
        `<li><label style="display:flex;gap:8px;cursor:pointer"><input type="checkbox" data-warmup="${i}" ${dayLog?.warmup?.[i]?'checked':''}> ${t}</label></li>`).join('')}</ul>
    </details></div>`;
  }

  // Exercises — main focus, always visible
  body += `<div class="card"><h2>Exercises</h2>${session.exercises.map((ex, i) => renderExercise(ex, i, dayLog, ctx, multiplier, date, session.sessionId)).join('')}</div>`;

  // Session feel + notes + status
  body += `<div class="card"><h2>Session</h2>
    <div class="field">
      <label>Session feel</label>
      <div class="pill-group" data-pill-group="sessionFeel">
        ${[1,2,3,4,5].map(v =>
          `<div class="pill ${(dayLog.sessionFeel ?? 3)===v?'active':''}" data-pill="sessionFeel" data-val="${v}">${v}</div>`
        ).join('')}
      </div>
    </div>
    <div class="field"><label>Notes</label>
      <textarea id="sessionNotes" placeholder="anything to remember">${dayLog.sessionNotes || ''}</textarea></div>
    <div class="row">
      <button class="primary" id="markCompleted">${dayLog.status === 'completed' ? '✓ Completed' : 'Mark completed'}</button>
      <button class="ghost" id="markPartial">Partial</button>
    </div></div>`;

  // Cooldown — collapsed
  if (cooldown.length) {
    const checkedCount = Object.values(dayLog?.cooldown || {}).filter(Boolean).length;
    body += `<div class="card"><details>
      <summary>Cooldown <span class="count">${checkedCount}/${cooldown.length}</span></summary>
      <ul class="checklist">${cooldown.map((t,i) =>
        `<li><label style="display:flex;gap:8px;cursor:pointer"><input type="checkbox" data-cooldown="${i}" ${dayLog?.cooldown?.[i]?'checked':''}> ${t}</label></li>`).join('')}</ul>
    </details></div>`;
  }

  root.innerHTML = body;
  wire(root, date, session, ctx, multiplier);
}

// Build the structured stepper inputs for an exercise.
function exerciseInputs(i, ex, actual, suggestion) {
  const showKg = ex.kind === 'hangboard' || ex.kind === 'pullup' || ex.kind === 'test';
  const showReps = ex.kind !== 'antagonist-block' && ex.kind !== 'mobility' && ex.kind !== 'skill';
  const showRpe = !!ex.rpeRange;

  const cols = [showKg, showReps && showKg, showRpe].filter(Boolean).length;
  const rowClass = showKg && showReps && showRpe ? '' : (cols === 2 ? 'two' : (cols === 1 ? 'one' : ''));

  // For hangboard/pullup: kg + sets×reps + rpe
  // For boulder/route/circuit/arc/test: reps + rpe (sets implicit)
  // For antagonist: no inputs (notes only)

  if (ex.kind === 'antagonist-block') return '';

  let row = '<div class="stepper-row';
  if (rowClass) row += ' ' + rowClass;
  row += '">';

  if (showKg) {
    row += stepper(`ex-${i}-kg`, n(actual.kg), 'kg', 0.5);
  }
  if (showReps) {
    if (showKg) row += stepper(`ex-${i}-reps`, n(actual.reps), 'reps', 1);
    else {
      // For non-kg exercises, show sets/reps as a single short field
      row += stepper(`ex-${i}-reps`, n(actual.reps), ex.kind === 'arc' || ex.kind === 'open-climb' ? 'min' : 'reps', 1);
    }
  }
  if (showRpe) {
    row += stepper(`ex-${i}-rpe`, n(actual.rpe), 'RPE', 0.5);
  }
  row += '</div>';

  let suggestionBtn = '';
  if (suggestion) {
    suggestionBtn = `<button class="suggest-btn" data-suggest-btn="${i}" data-suggest-kg="${suggestion.suggestedKg}">Suggested: ${suggestion.suggestedKg} kg → tap to use</button>`;
  }

  return suggestionBtn + row;
}

function stepper(id, value, label, step) {
  return `<div>
    <div class="stepper">
      <button type="button" data-step="-" data-target="${id}" data-step-amount="${step}">−</button>
      <input type="number" id="${id}" inputmode="decimal" step="${step}" value="${value}" placeholder="">
      <button type="button" data-step="+" data-target="${id}" data-step-amount="${step}">+</button>
    </div>
    <div class="stepper-label">${label}</div>
  </div>`;
}

function renderExercise(ex, i, dayLog, ctx, readinessMult, date, sessionId) {
  const stored = (dayLog.exercises || [])[i] || {};
  const actual = asActualObj(stored.actual);
  const notes = stored.notes || '';
  let prescribedStr = '';
  let suggestion = null;

  if (ex.kind === 'antagonist-block') {
    const items = ex.items.map(it => `<li>${it.name}: <b>${it.prescribed}</b></li>`).join('');
    return `<div class="exercise">
      <div class="exercise-title">${ex.name}</div>
      <ul class="muted" style="margin:4px 0 6px;font-size:.8rem">${items}</ul>
      ${notesField(i, notes, !!notes)}
    </div>`;
  }

  if (ex.kind === 'hangboard' || ex.kind === 'pullup') {
    const prev = findPrevSameSession(date, sessionId);
    const prevEx = prev?.exercises?.[i] || null;
    const prevActual = asActualObj(prevEx?.actual);
    suggestion = Loads.resolveEffective({
      exercise: ex,
      previousActualKg: prevActual?.kg ?? null,
      previousAvgRpe: prevActual?.rpe ?? null,
      readinessMultiplier: readinessMult,
      isDeload: ctx.deload
    });
    const rangeStr = suggestion?.range ? `${suggestion.range[0]}–${suggestion.range[1]} kg` : '';
    const sets = ex.sets || ex.reps || '';
    const rpe  = ex.rpeRange ? `RPE ${ex.rpeRange[0]}–${ex.rpeRange[1]}` : '';
    prescribedStr = [ex.hang, sets, rangeStr, rpe].filter(Boolean).join(' · ');
  } else {
    const rpe = ex.rpeRange ? ` · RPE ${ex.rpeRange[0]}–${ex.rpeRange[1]}` : '';
    prescribedStr = (ex.prescribed || '') + rpe;
  }

  return `<div class="exercise" data-ex="${i}">
    <div class="exercise-title">${ex.name}</div>
    <div class="exercise-prescribe">${prescribedStr}</div>
    ${exerciseInputs(i, ex, actual, suggestion)}
    ${notesField(i, notes, !!notes)}
  </div>`;
}

function notesField(i, value, openByDefault) {
  if (openByDefault) {
    return `<textarea data-ex-notes="${i}" placeholder="notes" style="margin-top:6px">${value}</textarea>`;
  }
  return `<button type="button" class="notes-toggle" data-notes-toggle="${i}">+ note</button>
    <textarea data-ex-notes="${i}" placeholder="notes" style="margin-top:6px;display:none"></textarea>`;
}

function wire(root, date, session, ctx, readinessMult) {
  function getOrInitDay() {
    const cur = Storage.getDay(date) || {};
    return {
      week: ctx.weekIdx, phase: ctx.phase, weekFlavor: ctx.flavor, isDeload: ctx.deload,
      sessionId: session.sessionId,
      status: cur.status || 'partial',
      readiness: cur.readiness || { sleep:3, soreness:3, fatigue:3 },
      sessionFeel: cur.sessionFeel ?? 3,
      exercises: cur.exercises || session.exercises.map(ex => ({ name: ex.name, prescribed: '', actual:{}, notes:'' })),
      sessionNotes: cur.sessionNotes || '',
      warmup: cur.warmup || {},
      cooldown: cur.cooldown || {}
    };
  }

  function persist(patch) {
    const d = getOrInitDay();
    Storage.setDay(date, { ...d, ...patch });
  }

  // ===== Pill selectors =====
  root.querySelectorAll('.pill[data-pill]').forEach(p => {
    p.addEventListener('click', () => {
      const key = p.dataset.pill;
      const val = parseInt(p.dataset.val, 10);
      // Toggle active state for siblings
      const group = root.querySelector(`[data-pill-group="${key}"]`);
      group.querySelectorAll('.pill').forEach(s => s.classList.remove('active'));
      p.classList.add('active');

      if (key === 'sessionFeel') {
        persist({ sessionFeel: val });
        return;
      }
      // readiness keys
      const d = getOrInitDay();
      const r = { ...d.readiness, [key]: val };
      const { multiplier, label, avg } = Loads.computeReadinessMultiplier(r);
      r.multiplier = multiplier;
      persist({ readiness: r });
      const summaryEl = root.querySelector('[data-readiness-summary]');
      if (summaryEl) summaryEl.innerHTML =
        `Avg ${avg ? avg.toFixed(1) : '—'} → <b>${label}</b> ${multiplier ? `(×${multiplier})` : ''}`;
      // Update suggestion buttons
      session.exercises.forEach((ex, i) => {
        if (ex.kind !== 'hangboard' && ex.kind !== 'pullup') return;
        const btn = root.querySelector(`[data-suggest-btn="${i}"]`);
        if (!btn) return;
        const prev = findPrevSameSession(date, session.sessionId);
        const prevEx = prev?.exercises?.[i] || null;
        const prevActual = asActualObj(prevEx?.actual);
        const eff = Loads.resolveEffective({
          exercise: ex,
          previousActualKg: prevActual?.kg ?? null,
          previousAvgRpe: prevActual?.rpe ?? null,
          readinessMultiplier: multiplier,
          isDeload: ctx.deload
        });
        if (eff) {
          btn.textContent = `Suggested: ${eff.suggestedKg} kg → tap to use`;
          btn.dataset.suggestKg = eff.suggestedKg;
        }
      });
    });
  });

  // ===== Steppers =====
  root.querySelectorAll('button[data-step]').forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.dataset.target;
      const amount = parseFloat(btn.dataset.stepAmount);
      const dir = btn.dataset.step === '+' ? 1 : -1;
      const inp = root.querySelector(`#${targetId}`);
      if (!inp) return;
      const cur = parseFloat(inp.value);
      const next = (isNaN(cur) ? 0 : cur) + dir * amount;
      inp.value = next;
      inp.dispatchEvent(new Event('change', { bubbles: true }));
    });
  });

  // ===== Suggestion buttons (pre-fill kg) =====
  root.querySelectorAll('button[data-suggest-btn]').forEach(btn => {
    btn.addEventListener('click', () => {
      const i = btn.dataset.suggestBtn;
      const kg = parseFloat(btn.dataset.suggestKg);
      const inp = root.querySelector(`#ex-${i}-kg`);
      if (inp) {
        inp.value = kg;
        inp.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });
  });

  // ===== Exercise field updates =====
  function readExerciseInputs(i) {
    const kgEl = root.querySelector(`#ex-${i}-kg`);
    const repsEl = root.querySelector(`#ex-${i}-reps`);
    const rpeEl = root.querySelector(`#ex-${i}-rpe`);
    const out = {};
    if (kgEl && kgEl.value !== '') out.kg = parseFloat(kgEl.value);
    if (repsEl && repsEl.value !== '') out.reps = parseFloat(repsEl.value);
    if (rpeEl && rpeEl.value !== '') out.rpe = parseFloat(rpeEl.value);
    return out;
  }
  function updateExerciseActual(i) {
    const d = getOrInitDay();
    const cur = d.exercises[i] || { name: session.exercises[i].name };
    const merged = { ...asActualObj(cur.actual), ...readExerciseInputs(i) };
    d.exercises[i] = { ...cur, actual: merged };
    persist({ exercises: d.exercises });
  }

  for (let i = 0; i < session.exercises.length; i++) {
    ['kg','reps','rpe'].forEach(k => {
      const inp = root.querySelector(`#ex-${i}-${k}`);
      if (inp) inp.addEventListener('change', () => updateExerciseActual(i));
    });
  }

  // ===== +note toggle =====
  root.querySelectorAll('button[data-notes-toggle]').forEach(btn => {
    btn.addEventListener('click', () => {
      const i = btn.dataset.notesToggle;
      const ta = root.querySelector(`textarea[data-ex-notes="${i}"]`);
      if (ta) {
        ta.style.display = '';
        ta.focus();
      }
      btn.style.display = 'none';
    });
  });

  // ===== Notes per-exercise =====
  root.querySelectorAll('textarea[data-ex-notes]').forEach(inp => inp.addEventListener('change', () => {
    const d = getOrInitDay();
    const idx = +inp.dataset.exNotes;
    const cur = d.exercises[idx] || { name: session.exercises[idx].name };
    d.exercises[idx] = { ...cur, notes: inp.value };
    persist({ exercises: d.exercises });
  }));

  // ===== Warmup / cooldown =====
  root.querySelectorAll('input[data-warmup]').forEach(cb => cb.addEventListener('change', () => {
    const d = getOrInitDay();
    const w = { ...d.warmup, [cb.dataset.warmup]: cb.checked };
    persist({ warmup: w });
    const sum = cb.closest('details')?.querySelector('summary .count');
    if (sum) {
      const total = root.querySelectorAll('input[data-warmup]').length;
      const checked = [...root.querySelectorAll('input[data-warmup]')].filter(x => x.checked).length;
      sum.textContent = `${checked}/${total}`;
    }
  }));
  root.querySelectorAll('input[data-cooldown]').forEach(cb => cb.addEventListener('change', () => {
    const d = getOrInitDay();
    const w = { ...d.cooldown, [cb.dataset.cooldown]: cb.checked };
    persist({ cooldown: w });
    const sum = cb.closest('details')?.querySelector('summary .count');
    if (sum) {
      const total = root.querySelectorAll('input[data-cooldown]').length;
      const checked = [...root.querySelectorAll('input[data-cooldown]')].filter(x => x.checked).length;
      sum.textContent = `${checked}/${total}`;
    }
  }));

  // ===== Session-level =====
  const notes = root.querySelector('#sessionNotes');
  notes?.addEventListener('change', () => persist({ sessionNotes: notes.value }));

  root.querySelector('#markCompleted')?.addEventListener('click', () => {
    persist({ status: 'completed' });
    const btn = root.querySelector('#markCompleted');
    if (btn) btn.textContent = '✓ Completed';
    if (session.isRetest) alert('Retest done — update Benchmarks with new max-hang / 1RM. Old values are archived.');
  });
  root.querySelector('#markPartial')?.addEventListener('click', () => {
    persist({ status: 'partial' });
  });
}
