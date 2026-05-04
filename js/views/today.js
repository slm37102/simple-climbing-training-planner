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

function avgRpeFromActual(actualStr) {
  if (!actualStr) return null;
  const m = actualStr.match(/RPE\s*([\d.]+)/i);
  return m ? parseFloat(m[1]) : null;
}

function parseKg(actualStr) {
  if (!actualStr) return null;
  const m = actualStr.match(/@\s*(-?[\d.]+)\s*kg/i);
  return m ? parseFloat(m[1]) : null;
}

export function renderToday(root) {
  const state = Storage.get();
  const date = todayIso();
  const startDate = state.settings.startDate;

  if (!startDate) {
    root.innerHTML = `<div class="card"><h2>Set up your cycle</h2>
      <p class="muted">Add benchmarks and a cycle start date to begin.</p>
      <button class="primary" onclick="location.hash='#benchmarks'">Go to Benchmarks</button></div>`;
    return;
  }

  const ctx = Program.resolveDate(date, startDate);
  if (ctx?.outOfCycle) {
    root.innerHTML = `<div class="card"><h2>Outside cycle</h2>
      <p class="muted">Today (${date}) is outside the 12-week window starting ${startDate}.</p>
      <button class="ghost" onclick="location.hash='#settings'">Adjust start date</button></div>`;
    return;
  }

  const session = Program.prescribeForContext(ctx);
  const dayLog = Storage.getDay(date) || {};
  const readiness = dayLog.readiness || { sleep:3, soreness:3, fatigue:3 };
  const { multiplier, label: rdLabel, avg: rdAvg } = Loads.computeReadinessMultiplier(readiness);

  const phaseBadge = `<span class="badge ${ctx.phase}">${ctx.phase}</span>`;
  const flavorBadge = `<span class="badge">${ctx.flavor}-emphasis</span>`;
  const deloadBadge = ctx.deload ? `<span class="badge deload">DELOAD</span>` : '';
  const retestBadge = session.isRetest ? `<span class="badge">RETEST</span>` : '';

  const { warmup, cooldown } = Warmup.forSession(session);

  let body = `<div class="card">
    <h2>${date} · Wk ${ctx.weekIdx}</h2>
    <div class="row">${phaseBadge}${flavorBadge}${deloadBadge}${retestBadge}
      <span class="muted">${session.label}</span></div>
    <p class="muted">Energy system: ${session.energySystem || '—'}</p>
  </div>`;

  if (session.isRest) {
    body += `<div class="card"><h2>Recovery checklist</h2>
      <ul class="checklist">${Warmup.restRecoveryChecklist().map((t,i) =>
        `<li><input type="checkbox" data-rest-check="${i}" ${dayLog?.recovery?.[i]?'checked':''}> ${t}</li>`).join('')}</ul>
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

  // Readiness
  body += `<div class="card"><h2>Readiness</h2>
    <div class="row">
      ${['sleep','soreness','fatigue'].map(k => `
        <div class="field" style="flex:1;min-width:90px">
          <label>${k} (1–5)</label>
          <input type="number" min="1" max="5" data-readiness="${k}" value="${readiness[k]}">
        </div>`).join('')}
    </div>
    <p class="muted" data-readiness-summary>Avg ${rdAvg ? rdAvg.toFixed(1) : '—'} → <b>${rdLabel}</b> ${multiplier ? `(×${multiplier})` : ''}</p>
  </div>`;

  // Warm-up
  if (warmup.length) {
    body += `<div class="card"><h2>Warm-up</h2>
      <ul class="checklist">${warmup.map((t,i) =>
        `<li><input type="checkbox" data-warmup="${i}" ${dayLog?.warmup?.[i]?'checked':''}> ${t}</li>`).join('')}</ul></div>`;
  }

  // Exercises
  body += `<div class="card"><h2>Exercises</h2>${session.exercises.map((ex, i) => renderExercise(ex, i, dayLog, ctx, multiplier, date, session.sessionId)).join('')}</div>`;

  // Session feel + notes + status
  const ex0 = dayLog.exercises || [];
  body += `<div class="card"><h2>Session</h2>
    <div class="field"><label>Session feel (1–5)</label>
      <input type="number" min="1" max="5" id="sessionFeel" value="${dayLog.sessionFeel ?? 3}"></div>
    <div class="field"><label>Notes</label>
      <textarea id="sessionNotes">${dayLog.sessionNotes || ''}</textarea></div>
    <div class="row">
      <button class="primary" id="markCompleted">Mark completed</button>
      <button class="ghost" id="markPartial">Partial</button>
    </div></div>`;

  if (cooldown.length) {
    body += `<div class="card"><h2>Cooldown</h2>
      <ul class="checklist">${cooldown.map((t,i) =>
        `<li><input type="checkbox" data-cooldown="${i}" ${dayLog?.cooldown?.[i]?'checked':''}> ${t}</li>`).join('')}</ul></div>`;
  }

  root.innerHTML = body;
  wire(root, date, session, ctx, multiplier);
}

function renderExercise(ex, i, dayLog, ctx, readinessMult, date, sessionId) {
  const stored = (dayLog.exercises || [])[i] || {};
  let prescribedStr = '';
  let suggestion = '';

  if (ex.kind === 'antagonist-block') {
    const items = ex.items.map(it => `<li>${it.name}: <b>${it.prescribed}</b></li>`).join('');
    return `<div class="exercise"><b>${ex.name}</b><ul>${items}</ul>
      <textarea data-ex-actual="${i}" placeholder="Notes / actual">${stored.actual || ''}</textarea></div>`;
  }

  if (ex.kind === 'hangboard' || ex.kind === 'pullup') {
    const prev = findPrevSameSession(date, sessionId);
    const prevEx = prev?.exercises?.[i] || null;
    const prevActualKg = parseKg(prevEx?.actual);
    const prevAvgRpe = avgRpeFromActual(prevEx?.actual);
    const eff = Loads.resolveEffective({
      exercise: ex,
      previousActualKg: prevActualKg,
      previousAvgRpe: prevAvgRpe,
      readinessMultiplier: readinessMult,
      isDeload: ctx.deload
    });
    const rangeStr = eff?.range ? `${eff.range[0]}–${eff.range[1]} kg added` : '';
    const sets = ex.sets || ex.reps || '';
    const rpe  = ex.rpeRange ? `RPE ${ex.rpeRange[0]}–${ex.rpeRange[1]}` : '';
    prescribedStr = [ex.hang, sets, rangeStr, rpe].filter(Boolean).join(' · ');
    suggestion = eff ? `<div data-suggest="${i}">Suggested: <b>${eff.suggestedKg} kg added</b> <span class="muted">(${eff.reason.join(' → ')})</span></div>` : `<div data-suggest="${i}"></div>`;
  } else {
    const rpe = ex.rpeRange ? ` · RPE ${ex.rpeRange[0]}–${ex.rpeRange[1]}` : '';
    prescribedStr = (ex.prescribed || '') + rpe;
  }

  return `<div class="exercise">
    <div><b>${ex.name}</b></div>
    <div class="muted">${prescribedStr}</div>
    ${suggestion || ''}
    <input type="text" data-ex-actual="${i}" placeholder="actual e.g. 5x2 @ 62kg RPE 9" value="${stored.actual || ''}">
    <input type="text" data-ex-notes="${i}"  placeholder="notes" value="${stored.notes || ''}" style="margin-top:4px">
  </div>`;
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
      exercises: cur.exercises || session.exercises.map(ex => ({ name: ex.name, prescribed: '', actual:'', notes:'' })),
      sessionNotes: cur.sessionNotes || '',
      warmup: cur.warmup || {},
      cooldown: cur.cooldown || {}
    };
  }

  function persist(patch) {
    const d = getOrInitDay();
    Storage.setDay(date, { ...d, ...patch });
  }

  root.querySelectorAll('input[data-readiness]').forEach(inp => {
    // 'change' fires on blur, so we don't disrupt typing. We update only the
    // affected DOM regions instead of re-rendering the whole view.
    inp.addEventListener('change', () => {
      const d = getOrInitDay();
      const r = { ...d.readiness, [inp.dataset.readiness]: parseInt(inp.value,10) || 3 };
      const { multiplier, label, avg } = Loads.computeReadinessMultiplier(r);
      r.multiplier = multiplier;
      persist({ readiness: r });
      // Update readiness summary line in place
      const summary = root.querySelector('.card .muted + .muted, .readiness-summary');
      const summaryEl = root.querySelector('[data-readiness-summary]');
      if (summaryEl) summaryEl.innerHTML =
        `Avg ${avg ? avg.toFixed(1) : '—'} → <b>${label}</b> ${multiplier ? `(×${multiplier})` : ''}`;
      // Update exercise load suggestions in place
      session.exercises.forEach((ex, i) => {
        if (ex.kind !== 'hangboard' && ex.kind !== 'pullup') return;
        const slot = root.querySelector(`[data-suggest="${i}"]`);
        if (!slot) return;
        const prev = findPrevSameSession(date, session.sessionId);
        const prevEx = prev?.exercises?.[i] || null;
        const eff = Loads.resolveEffective({
          exercise: ex,
          previousActualKg: parseKg(prevEx?.actual),
          previousAvgRpe: avgRpeFromActual(prevEx?.actual),
          readinessMultiplier: multiplier,
          isDeload: ctx.deload
        });
        slot.innerHTML = eff
          ? `Suggested: <b>${eff.suggestedKg} kg added</b> <span class="muted">(${eff.reason.join(' → ')})</span>`
          : '';
      });
    });
  });

  root.querySelectorAll('input[data-warmup]').forEach(cb => cb.addEventListener('change', () => {
    const d = getOrInitDay();
    const w = { ...d.warmup, [cb.dataset.warmup]: cb.checked };
    persist({ warmup: w });
  }));
  root.querySelectorAll('input[data-cooldown]').forEach(cb => cb.addEventListener('change', () => {
    const d = getOrInitDay();
    const w = { ...d.cooldown, [cb.dataset.cooldown]: cb.checked };
    persist({ cooldown: w });
  }));

  root.querySelectorAll('[data-ex-actual]').forEach(inp => inp.addEventListener('change', () => {
    const d = getOrInitDay();
    const idx = +inp.dataset.exActual;
    d.exercises[idx] = { ...d.exercises[idx], actual: inp.value };
    persist({ exercises: d.exercises });
  }));
  root.querySelectorAll('[data-ex-notes]').forEach(inp => inp.addEventListener('change', () => {
    const d = getOrInitDay();
    const idx = +inp.dataset.exNotes;
    d.exercises[idx] = { ...d.exercises[idx], notes: inp.value };
    persist({ exercises: d.exercises });
  }));

  const feel = root.querySelector('#sessionFeel');
  const notes = root.querySelector('#sessionNotes');
  feel?.addEventListener('change', () => persist({ sessionFeel: parseInt(feel.value,10) || 3 }));
  notes?.addEventListener('change', () => persist({ sessionNotes: notes.value }));

  root.querySelector('#markCompleted')?.addEventListener('click', () => {
    persist({ status: 'completed' });
    // If retest session, archive benchmarks (user is expected to update them in Benchmarks view)
    if (session.isRetest) alert('Retest done — update Benchmarks with new max-hang / 1RM. Old values are archived.');
    alert('Session marked completed.');
  });
  root.querySelector('#markPartial')?.addEventListener('click', () => {
    persist({ status: 'partial' });
  });
}
