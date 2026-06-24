// Today view: prescribed session for today, readiness, warm-up, exercises with loads, log form, cooldown.
import { Storage } from '../storage.js';
import { Program } from '../program.js';
import { Loads } from '../loads.js';
import { Warmup } from '../warmup.js';
import { inputVisibility, repsLabel } from '../exercise-inputs.js';

const SELECTED_DATE_KEY = 'todaySelectedDate';

function todayIso() {
  const d = new Date();
  const m = String(d.getMonth()+1).padStart(2,'0'), day = String(d.getDate()).padStart(2,'0');
  return `${d.getFullYear()}-${m}-${day}`;
}

function addDaysIso(iso, n) {
  const d = new Date(iso + 'T00:00:00');
  d.setDate(d.getDate() + n);
  const mm = String(d.getMonth()+1).padStart(2,'0'), dd = String(d.getDate()).padStart(2,'0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

function getSelectedDate() {
  return sessionStorage.getItem(SELECTED_DATE_KEY) || todayIso();
}

function setSelectedDate(iso) {
  sessionStorage.setItem(SELECTED_DATE_KEY, iso);
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

function retestBenchmarkValues(session, date = getSelectedDate()) {
  if (!session?.isRetest) return null;
  const dayExercises = Storage.get().days?.[date]?.exercises || [];
  let maxHang20mm = null;
  let pullup1RM = null;

  session.exercises.forEach((ex, i) => {
    const actual = asActualObj(dayExercises[i]?.actual);
    if (!Number.isFinite(actual.kg)) return;
    if (/max 10s hang on 20mm edge/i.test(ex.name)) maxHang20mm = actual.kg;
    if (/1rm weighted pull-up/i.test(ex.name)) pullup1RM = actual.kg;
  });

  if (!Number.isFinite(maxHang20mm) || !Number.isFinite(pullup1RM)) return null;
  return { maxHang20mm, pullup1RM };
}

function retestBenchmarkBtn(session, date, saved = false) {
  if (saved) {
    return '<div class="muted" style="margin-top:6px;font-weight:600">✓ Benchmarks updated — future loads recalculated</div>';
  }
  if (!retestBenchmarkValues(session, date)) return '';
  return '<button class="primary" type="button" data-retest-benchmark>📊 Save as Benchmark</button>';
}

function retestBenchmarkSection(session, date) {
  if (!session?.isRetest) return '';
  const content = retestBenchmarkBtn(session, date);
  return `<div class="field" id="retestBenchmarkBox" style="${content ? '' : 'display:none'}">${content}</div>`;
}

function tomorrowIso() {
  return addDaysIso(todayIso(), 1);
}

function cycleEndIso(settings) {
  const start = Program.effectiveStart(settings);
  if (!start) return null;
  return addDaysIso(start, Program.cycleDays(Program.cycleWeeksOf(settings)) - 1);
}

function isCycleComplete(settings, isoDate = todayIso()) {
  const endIso = cycleEndIso(settings);
  if (!endIso) return false;
  const d = new Date(isoDate + 'T00:00:00');
  const cycleEnd = new Date(endIso + 'T00:00:00');
  return d >= cycleEnd;
}

function hasActualResult(actual) {
  if (!actual || typeof actual !== 'object') return false;
  return actual.kg != null || actual.sets != null || actual.reps != null || actual.rpe != null || actual.done === true || (typeof actual.raw === 'string' && actual.raw.trim());
}

function formatKgStat(v) {
  if (v == null) return '—';
  return `${parseFloat(Number(v).toFixed(1))} kg`;
}

function cycleStats(plan) {
  const start = Program.effectiveStart(plan?.settings);
  if (!start) return { bestHang: null, bestPull: null, totalSessions: 0, cycleEnd: null, totalDays: 0 };

  const totalDays = Program.cycleDays(Program.cycleWeeksOf(plan?.settings));
  let bestHang = null;
  let bestPull = null;
  let totalSessions = 0;

  for (const [iso, entry] of Object.entries(plan.days || {})) {
    const d = new Date(iso + 'T00:00:00');
    const dayIdx = Math.floor((d - new Date(start + 'T00:00:00')) / 86400000);
    if (dayIdx < 0 || dayIdx >= totalDays) continue;

    const exList = entry?.exercises || [];
    if (exList.some(ex => hasActualResult(asActualObj(ex?.actual)))) totalSessions++;

    for (const ex of exList) {
      const actual = asActualObj(ex?.actual);
      const kg = Number(actual.kg);
      if (!Number.isFinite(kg)) continue;

      const name = String(ex?.name || '').toLowerCase();
      const isHang = ex?.kind === 'hangboard' || (ex?.kind === 'test' && /\bhang\b/.test(name));
      const isPull = ex?.kind === 'pullup' || (ex?.kind === 'test' && /pull[\s-]?up/.test(name));

      if (isHang) bestHang = Math.max(bestHang ?? kg, kg);
      if (isPull) bestPull = Math.max(bestPull ?? kg, kg);
    }
  }

  return { bestHang, bestPull, totalSessions, cycleEnd: cycleEndIso(plan?.settings), totalDays };
}

function cycleCompleteHtml(plan) {
  const { bestHang, bestPull, totalSessions, cycleEnd, totalDays } = cycleStats(plan);
  const weeks = Program.cycleWeeksOf(plan?.settings);
  const defaultStart = tomorrowIso();
  const defaultComp = addDaysIso(defaultStart, Program.cycleDays(weeks) - 1);

  return `<div class="card" data-cycle-complete style="text-align:center;padding:24px 16px">
    <div style="font-size:2rem;margin-bottom:8px">🎉</div>
    <h2 style="margin:0 0 4px">🎉 Cycle Complete!</h2>
    <p class="muted" style="margin:0 0 8px">${weeks} weeks done. Here's how you got on:</p>
    <p class="muted" style="margin:0 0 16px;font-size:.85rem">Cycle end: ${cycleEnd || '—'}</p>
    <div class="row" style="justify-content:center;gap:24px;margin-bottom:20px;flex-wrap:wrap">
      <div><div class="muted" style="font-size:.8rem">Sessions logged</div><b>${totalSessions} / ${totalDays} days</b></div>
      <div><div class="muted" style="font-size:.8rem">Best hang</div><b>${formatKgStat(bestHang)}</b></div>
      <div><div class="muted" style="font-size:.8rem">Best pull</div><b>${formatKgStat(bestPull)}</b></div>
    </div>
    <button class="primary" type="button" data-cycle-open>Start New Cycle</button>
    <div data-cycle-form hidden style="margin-top:16px;text-align:left;max-width:420px;margin-left:auto;margin-right:auto">
      <div class="field">
        <label style="display:flex;gap:8px;align-items:center"><input type="radio" name="cycleAnchorMode" value="startDate" checked> Start from date</label>
      </div>
      <div class="field">
        <label style="display:flex;gap:8px;align-items:center"><input type="radio" name="cycleAnchorMode" value="compDate"> Work back from comp</label>
      </div>
      <div class="field">
        <label for="newCycleStartDate">Start date</label>
        <input id="newCycleStartDate" type="date" value="${defaultStart}">
      </div>
      <div class="field">
        <label for="newCycleCompDate">Competition date</label>
        <input id="newCycleCompDate" type="date" value="${defaultComp}" disabled>
      </div>
      <div class="row" style="align-items:center;justify-content:center;gap:8px;flex-wrap:wrap">
        <button class="primary" type="button" data-cycle-start>Start</button>
        <span class="muted" data-cycle-error hidden style="color:#fca5a5"></span>
      </div>
    </div>
  </div>`;
}

export function renderToday(root) {
  const activePlan = Storage.getActivePlan();
  const date = getSelectedDate();
  const realToday = todayIso();
  const start = Program.effectiveStart(activePlan.settings);
  const showCycleComplete = isCycleComplete(activePlan.settings, date);
  const completionHtml = showCycleComplete ? cycleCompleteHtml(activePlan) : '';

  // Date navigation row — always visible at the top of the view
  const isToday = date === realToday;
  const dateLabel = isToday
    ? `<b style="min-width:140px;text-align:center">${date} (Today)</b>`
    : `<button class="ghost date-jump-today" data-date-nav="today" title="Jump to today" style="min-width:140px;font-weight:600">${date}</button>`;
  const dateNavHtml = `<div class="card date-nav-card">
    <div class="row" style="align-items:center;justify-content:center;gap:8px;flex-wrap:nowrap">
      <button class="ghost" data-date-nav="-1" title="Previous day">◀</button>
      ${dateLabel}
      <button class="ghost" data-date-nav="1" title="Next day">▶</button>
    </div>
    ${isToday ? '' : '<div class="muted" style="text-align:center;font-size:.75rem;margin-top:4px">Tap date to jump back to today</div>'}
  </div>`;

  // Plan switcher — only shown when 2+ non-archived plans exist
  const allPlans = Storage.listPlans().filter(p => !p.archived);
  let planSwitcherHtml = '';
  if (allPlans.length >= 2) {
    const tabs = allPlans.map(p =>
      `<button class="plan-tab ${p.id === activePlan.id ? 'active' : ''}" data-plan-id="${p.id}" style="--plan-color:${p.color}">
        ${p.name}<span class="badge focus-${p.focus}">${p.focus[0].toUpperCase()}</span>
      </button>`
    ).join('');
    planSwitcherHtml = `<div class="card plan-switcher" id="planSwitcher">
      <div class="row" style="align-items:center;gap:8px">
        <span class="muted" style="font-size:.8rem">Plan:</span>${tabs}
      </div>
    </div>`;
  }

  if (!start) {
    root.innerHTML = dateNavHtml + planSwitcherHtml + `<div class="card"><h2>Set up your cycle</h2>
      <p class="muted">Configure your active plan with a start date or comp date.</p>
      <button class="primary" onclick="location.hash='#plans'">Go to Plans</button></div>`;
    wireDateNav(root);
    wireCycleComplete(root, activePlan);
    wirePlanSwitcher(root, root);
    return;
  }

  const ctx = Program.resolveDate(date, Program.effectiveStart(activePlan.settings), Program.cycleWeeksOf(activePlan.settings));
  if (ctx?.outOfCycle) {
    if (showCycleComplete) {
      root.innerHTML = dateNavHtml + planSwitcherHtml + completionHtml;
      wireDateNav(root);
      wireCycleComplete(root, activePlan);
      wirePlanSwitcher(root, root);
      return;
    }
    const which = activePlan.settings.anchorMode === 'compDate'
      ? `Cycle window: ${start} → ${activePlan.settings.compDate}`
      : `Cycle starts ${start}`;
    const weeks = Program.cycleWeeksOf(activePlan.settings);
    root.innerHTML = dateNavHtml + planSwitcherHtml + `<div class="card"><h2>Outside cycle</h2>
      <p class="muted">${date} is outside the ${weeks}-week window. ${which}.</p>
      <button class="ghost" onclick="location.hash='#plans'">Adjust in Plans</button></div>`;
    wireDateNav(root);
    wireCycleComplete(root, activePlan);
    wirePlanSwitcher(root, root);
    return;
  }

  const session = Program.build(activePlan, date);
  const dayLog = Storage.getDay(date) || {};
  const readiness = dayLog.readiness || { sleep:3, soreness:3, fatigue:3 };
  const { multiplier, label: rdLabel, avg: rdAvg } = Loads.computeReadinessMultiplier(readiness);

  const phaseBadge = `<span class="badge ${ctx.phase}">${ctx.phase}</span>`;
  const deloadBadge = ctx.deload ? `<span class="badge deload">DELOAD</span>` : '';
  const retestBadge = session.isRetest ? `<span class="badge">RETEST</span>` : '';
  const energyTip = session.energySystem ? `<span class="info-badge" title="Energy system: ${session.energySystem}">i</span>` : '';

  const { warmup, cooldown } = Warmup.forSession(session);

  const subtitleParts = [];
  if (ctx.flavor) subtitleParts.push(ctx.flavor.charAt(0).toUpperCase() + ctx.flavor.slice(1));
  if (session.label) subtitleParts.push(session.label);
  const subtitle = subtitleParts.join(' · ');

  let body = dateNavHtml + planSwitcherHtml + completionHtml + `<div class="card">
    <div class="session-head">
      <h2>Wk ${ctx.weekIdx}</h2>
      ${phaseBadge}${deloadBadge}${retestBadge}${energyTip}
    </div>
    ${subtitle ? `<div class="muted" style="margin-top:6px">${subtitle}</div>` : ''}
    ${session.deloadNote ? `<div class="muted" style="margin-top:6px;font-size:.85rem;padding:6px 8px;background:#ffffff10;border-radius:6px">⚙️ ${session.deloadNote}</div>` : ''}
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
    wireDateNav(root);
    wireCycleComplete(root, activePlan);
    wirePlanSwitcher(root, root);
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
    body += `<div class="card"><details>
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
    </div>
    ${retestBenchmarkSection(session, date)}</div>`;

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
  wireDateNav(root);
  wireCycleComplete(root, activePlan);
  wire(root, date, session, ctx, multiplier);
  wirePlanSwitcher(root, root);
}

function wireDateNav(root) {
  root.querySelectorAll('button[data-date-nav]').forEach(btn => {
    btn.addEventListener('click', () => {
      const action = btn.dataset.dateNav;
      const cur = getSelectedDate();
      let next;
      if (action === 'today')      next = todayIso();
      else if (action === '-1')    next = addDaysIso(cur, -1);
      else if (action === '1')     next = addDaysIso(cur, 1);
      else return;
      setSelectedDate(next);
      renderToday(root);
    });
  });
}

function wirePlanSwitcher(root, container) {
  container.querySelectorAll('button[data-plan-id]').forEach(btn => {
    btn.addEventListener('click', () => {
      Storage.setActivePlan(btn.dataset.planId);
      renderToday(root);
    });
  });
}

function wireCycleComplete(root, activePlan) {
  const openBtn = root.querySelector('button[data-cycle-open]');
  const form = root.querySelector('[data-cycle-form]');
  if (!openBtn || !form) return;

  const startInput = root.querySelector('#newCycleStartDate');
  const compInput = root.querySelector('#newCycleCompDate');
  const errorEl = root.querySelector('[data-cycle-error]');
  const radios = [...root.querySelectorAll('input[name="cycleAnchorMode"]')];

  function setError(msg = '') {
    if (!errorEl) return;
    errorEl.textContent = msg;
    errorEl.hidden = !msg;
  }

  function selectedMode() {
    return root.querySelector('input[name="cycleAnchorMode"]:checked')?.value || 'startDate';
  }

  function syncMode() {
    const mode = selectedMode();
    if (startInput) startInput.disabled = mode !== 'startDate';
    if (compInput) compInput.disabled = mode !== 'compDate';
    setError('');
  }

  openBtn.addEventListener('click', () => {
    form.hidden = !form.hidden;
    openBtn.textContent = form.hidden ? 'Start New Cycle' : 'Cancel';
    syncMode();
    if (!form.hidden) {
      if (selectedMode() === 'compDate') compInput?.focus();
      else startInput?.focus();
    }
  });

  radios.forEach(radio => radio.addEventListener('change', syncMode));
  syncMode();

  root.querySelector('[data-cycle-start]')?.addEventListener('click', () => {
    const anchorMode = selectedMode();
    const startDate = anchorMode === 'startDate' ? (startInput?.value || null) : null;
    const compDate = anchorMode === 'compDate' ? (compInput?.value || null) : null;

    if (anchorMode === 'startDate' && !startDate) {
      setError('Choose a start date.');
      return;
    }
    if (anchorMode === 'compDate' && !compDate) {
      setError('Choose a competition date.');
      return;
    }

    const patch = { anchorMode, startDate, compDate };
    Storage.setSettings(patch);
    const nextStart = Program.effectiveStart({ ...activePlan.settings, ...patch });
    if (nextStart) setSelectedDate(nextStart);
    renderToday(root);
  });
}

// Build the structured stepper inputs for an exercise.
function exerciseInputs(i, ex, actual, suggestion) {
  const vis = inputVisibility(ex);
  if (vis.none) return '';

  if (vis.optional) {
    const done = !!actual.done;
    return `<label class="optional-done"><input type="checkbox" data-optional-done="${i}" ${done ? 'checked' : ''}> <span>Done</span></label>`;
  }

  // Defaults so the user is one tap away from logging, not many.
  // sets/reps default to prescribed; kg to the suggestion; rpe to mid of target range.
  // All four are marked as "default" until the user touches them — `readExerciseInputs`
  // ignores default-flagged values so we don't persist values the user didn't confirm.
  const setsDefault  = ex.prescribedSets ?? '';
  const repsDefault  = ex.prescribedReps ?? '';
  const kgDefault    = suggestion?.suggestedKg ?? '';
  const rpeDefault   = ex.rpeRange ? Math.round(((ex.rpeRange[0] + ex.rpeRange[1]) / 2) * 2) / 2 : '';
  const setsValue    = actual.sets ?? setsDefault;
  const repsValue    = actual.reps ?? repsDefault;
  const kgValue      = actual.kg   ?? kgDefault;
  const rpeValue     = actual.rpe  ?? rpeDefault;
  const setsIsDefault = actual.sets == null && setsDefault !== '';
  const repsIsDefault = actual.reps == null && repsDefault !== '';
  const kgIsDefault   = actual.kg   == null && kgDefault   !== '';
  const rpeIsDefault  = actual.rpe  == null && rpeDefault  !== '';

  const count = [vis.sets, vis.kg, vis.reps, vis.rpe].filter(Boolean).length;
  const rowCls = count >= 4 ? 'stepper-row four' : count === 2 ? 'stepper-row two' : count === 1 ? 'stepper-row one' : 'stepper-row';
  let row = `<div class="${rowCls}">`;
  if (vis.sets) row += stepper(`ex-${i}-sets`, n(setsValue), 'sets', 1, setsIsDefault);
  if (vis.kg)   row += stepper(`ex-${i}-kg`,   n(kgValue),  'kg',   0.5, kgIsDefault);
  if (vis.reps) row += stepper(`ex-${i}-reps`, n(repsValue), repsLabel(ex), 1, repsIsDefault);
  if (vis.rpe)  row += stepper(`ex-${i}-rpe`,  n(rpeValue), 'RPE',  0.5, rpeIsDefault);
  row += '</div>';

  let suggestionBtn = '';
  // Hide the "tap to use" button when kg is already pre-filled with the suggestion —
  // it would be a no-op. Show it only when the user has a logged kg that differs.
  if (suggestion && suggestion.suggestedKg != null && !kgIsDefault && actual.kg != null && actual.kg !== suggestion.suggestedKg) {
    suggestionBtn = `<button class="suggest-btn" data-suggest-btn="${i}" data-suggest-kg="${suggestion.suggestedKg}">Suggested: ${suggestion.suggestedKg} kg → tap to use</button>`;
  }
  return suggestionBtn + row;
}

function stepper(id, value, label, step, isDefault = false) {
  const wrapCls = isDefault ? 'stepper stepper-default' : 'stepper';
  const inputAttrs = isDefault ? ' data-default="1"' : '';
  return `<div>
    <div class="${wrapCls}">
      <button type="button" data-step="-" data-target="${id}" data-step-amount="${step}">−</button>
      <input type="number" id="${id}" inputmode="decimal" step="${step}" value="${value}" placeholder=""${inputAttrs}>
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
        });
        if (eff && eff.suggestedKg != null) {
          btn.textContent = `Suggested: ${eff.suggestedKg} kg → tap to use`;
          btn.dataset.suggestKg = eff.suggestedKg;
        }
      });
    });
  });

  // ===== Steppers =====
  function clearDefaultFlag(inp) {
    if (!inp) return;
    if (inp.hasAttribute('data-default')) {
      inp.removeAttribute('data-default');
      inp.closest('.stepper')?.classList.remove('stepper-default');
    }
  }

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
      clearDefaultFlag(inp);
      inp.dispatchEvent(new Event('change', { bubbles: true }));
    });
  });

  // Typing in the input directly: drop the "default" flag so we persist it.
  root.querySelectorAll('.stepper input[type=number]').forEach(inp => {
    inp.addEventListener('input', () => clearDefaultFlag(inp));
  });

  // ===== Suggestion buttons (pre-fill kg) =====
  root.querySelectorAll('button[data-suggest-btn]').forEach(btn => {
    btn.addEventListener('click', () => {
      const i = btn.dataset.suggestBtn;
      const kg = parseFloat(btn.dataset.suggestKg);
      const inp = root.querySelector(`#ex-${i}-kg`);
      if (inp) {
        inp.value = kg;
        clearDefaultFlag(inp);
        inp.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });
  });

  // ===== Exercise field updates =====
  function readExerciseInputs(i) {
    const setsEl = root.querySelector(`#ex-${i}-sets`);
    const kgEl   = root.querySelector(`#ex-${i}-kg`);
    const repsEl = root.querySelector(`#ex-${i}-reps`);
    const rpeEl  = root.querySelector(`#ex-${i}-rpe`);
    const out = {};
    const live = el => el && el.value !== '' && !el.hasAttribute('data-default');
    if (live(setsEl)) out.sets = parseInt(setsEl.value, 10);
    if (live(kgEl))   out.kg   = parseFloat(kgEl.value);
    if (live(repsEl)) out.reps  = parseFloat(repsEl.value);
    if (live(rpeEl))  out.rpe   = parseFloat(rpeEl.value);
    return out;
  }
  function refreshRetestBenchmarkBox(saved = false) {
    const box = root.querySelector('#retestBenchmarkBox');
    if (!box) return;
    const content = retestBenchmarkBtn(session, getSelectedDate(), saved);
    box.style.display = content ? '' : 'none';
    box.innerHTML = content;
  }

  function updateExerciseActual(i) {
    const d = getOrInitDay();
    const cur = d.exercises[i] || { name: session.exercises[i].name };
    const merged = { ...asActualObj(cur.actual), ...readExerciseInputs(i) };
    d.exercises[i] = { ...cur, actual: merged };
    persist({ exercises: d.exercises });
    refreshRetestBenchmarkBox();
  }

  for (let i = 0; i < session.exercises.length; i++) {
    ['sets','kg','reps','rpe'].forEach(k => {
      const inp = root.querySelector(`#ex-${i}-${k}`);
      if (inp) inp.addEventListener('change', () => {
        clearDefaultFlag(inp);
        updateExerciseActual(i);
      });
    });
  }

  // Optional exercise "Done ✓" checkboxes
  root.querySelectorAll('input[data-optional-done]').forEach(cb => {
    cb.addEventListener('change', () => {
      const i = +cb.dataset.optionalDone;
      const d = getOrInitDay();
      const cur = d.exercises[i] || { name: session.exercises[i].name };
      d.exercises[i] = { ...cur, actual: { ...asActualObj(cur.actual), done: cb.checked } };
      persist({ exercises: d.exercises });
    });
  });

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
  });
  root.querySelector('#markPartial')?.addEventListener('click', () => {
    persist({ status: 'partial' });
  });
  root.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-retest-benchmark]');
    if (!btn) return;
    const values = retestBenchmarkValues(session, getSelectedDate());
    if (!values) return;
    const { benchmarks } = Storage.get();
    Storage.setGlobalBenchmarks({
      bodyweight: benchmarks.bodyweight ?? null,
      maxHang20mm: values.maxHang20mm,
      pullup1RM: values.pullup1RM
    });
    refreshRetestBenchmarkBox(true);
  });
}
