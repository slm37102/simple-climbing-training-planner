// Today view: prescribed session for today, readiness, warm-up, exercises with loads, log form, cooldown.
// ASCENT design: eyebrow + display title, accordion exercise cards, stepper inputs.
import { Storage } from '../storage.js';
import { Program } from '../program.js';
import { Loads } from '../loads.js';
import { Warmup } from '../warmup.js';
import { Replan } from '../replan.js';
import { Monitoring } from '../monitoring.js';
import { daysBetween, localIso, today as todayIso, addDays as addDaysIso } from '../dates.js';
import { inputVisibility, repsLabel, actualHasResult, howto, unitLabel } from '../exercise-inputs.js';
import { escHtml as esc } from '../ui.js';
import { DRILL_CATEGORIES, WARMUP_DRILLS } from '../drills.js';

const SELECTED_DATE_KEY = 'todaySelectedDate';

const DOW = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const MON = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
function prettyDate(iso) {
  const d = new Date(iso + 'T00:00:00');
  return `${DOW[d.getDay()]} · ${d.getDate()} ${MON[d.getMonth()]}`;
}

function getSelectedDate() {
  return sessionStorage.getItem(SELECTED_DATE_KEY) || todayIso();
}

function setSelectedDate(iso) {
  sessionStorage.setItem(SELECTED_DATE_KEY, iso);
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
  let pullupOptional = false;

  session.exercises.forEach((ex, i) => {
    if (/1rm weighted pull-up/i.test(ex.name) && ex.optional) pullupOptional = true;
    const actual = asActualObj(dayExercises[i]?.actual);
    if (!Number.isFinite(actual.kg)) return;
    if (/max 10s hang on 20mm edge/i.test(ex.name)) maxHang20mm = actual.kg;
    if (/1rm weighted pull-up/i.test(ex.name)) pullup1RM = actual.kg;
  });

  // ADR-0012: the post-goal retest's pull-up test is optional (max hang is
  // the only mandatory measurement there) — don't block the save on a
  // skipped optional pull-up, but still require both on the Base-block
  // retest, where pull-up isn't optional.
  if (!Number.isFinite(maxHang20mm)) return null;
  if (!pullupOptional && !Number.isFinite(pullup1RM)) return null;
  return { maxHang20mm, pullup1RM: Number.isFinite(pullup1RM) ? pullup1RM : null };
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

// ADR-0012: post-goal retest offer (goal day +1..+7) — a small standalone
// card, not the full weekly session UI (there's no phase/week context to
// show; it's an out-of-cycle measurement). Reuses renderExercise (which
// never reads its ctx param) and the existing retest-benchmark save flow.
function postGoalRetestCardHtml(session, date) {
  const dayLog = Storage.getDay(date) || {};
  return `<div class="card" data-post-goal-retest>
    <h2 style="margin:0 0 4px">Post-goal retest</h2>
    <p class="muted" style="margin:0 0 14px;font-size:.85rem">Your cycle's goal day has passed — a fresh, tapered measurement now (max hang; pull-up optional) captures this cycle's gains and gives your next cycle an honest starting benchmark.</p>
    <div style="display:flex;flex-direction:column;gap:10px">
      ${session.exercises.map((ex, i) => renderExercise(ex, i, dayLog, null, 1.0, date, session.sessionId)).join('')}
    </div>
    ${retestBenchmarkSection(session, date)}
  </div>`;
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
    if (exList.some(ex => actualHasResult(asActualObj(ex?.actual)))) totalSessions++;

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
    <h2 style="margin:0 0 4px">Cycle Complete!</h2>
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
        <label style="display:flex;gap:8px;align-items:center;text-transform:none;letter-spacing:0;font:500 13px 'Archivo';color:var(--text)"><input type="radio" name="cycleAnchorMode" value="startDate" checked> Start from date</label>
      </div>
      <div class="field">
        <label style="display:flex;gap:8px;align-items:center;text-transform:none;letter-spacing:0;font:500 13px 'Archivo';color:var(--text)"><input type="radio" name="cycleAnchorMode" value="compDate"> Work back from comp</label>
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
        <span class="muted" data-cycle-error hidden style="color:#F0607A"></span>
      </div>
    </div>
  </div>`;
}

// Big display title: session label with the "(phase)" parenthetical stripped —
// the phase already lives in the eyebrow line.
function displayTitle(session) {
  return (session.label || '').replace(/\s*\([^)]*\)\s*/g, ' ').trim().replace(/\s+·\s+/g, ' · ');
}

function headerHtml(date, ctx, session) {
  const phaseName = ctx.phase.charAt(0).toUpperCase() + ctx.phase.slice(1);
  const deloadBadge = ctx.deload ? `<span class="badge deload">Deload</span>` : '';
  const retestBadge = session?.isRetest ? `<span class="badge taper">Retest</span>` : '';
  const energyTip = session?.energySystem ? `<span class="info-badge" title="Energy system: ${session.energySystem}">i</span>` : '';
  const flavor = ctx.flavor ? `<span class="badge focus-${ctx.flavor === 'boulder' ? 'boulder' : ctx.flavor === 'sport' ? 'sport' : 'hybrid'}">${ctx.flavor}</span>` : '';
  return `<div>
    <div class="eyebrow">
      <span>${prettyDate(date)}</span>
      <span class="dot"></span>
      <span class="phase-txt">Week ${ctx.weekIdx} · ${phaseName}</span>
    </div>
    <div class="display-title">${displayTitle(session)}</div>
    <div class="row" style="margin-top:9px">${flavor}${deloadBadge}${retestBadge}${energyTip}</div>
    ${(() => {
      // Phase-mechanics notes from the prescription pipeline (session.notes,
      // in pass order): deload/taper cut, ADR-0009 ramp, ADR-0015 readiness
      // gating, coach-review §8 Sunday hint. Notes are NOT mutually
      // exclusive — a deload week can also be a Lighter readiness day — so
      // every entry renders. Legacy fallback covers stored/older sessions.
      const notes = session?.notes
        || [session?.deloadNote, session?.taperNote, session?.rampNote, session?.readinessNote, session?.sunHint].filter(Boolean);
      return notes.map(n => `<div class="deload-note" style="margin-top:10px">⚙ ${n}</div>`).join('');
    })()}
    ${session?.styleNote ? `<div class="deload-note" style="margin-top:10px">↔ ${session.styleNote}</div>` : ''}
  </div>`;
}

// ADR-0008: informational for a short gap, actionable for a ≥2wk gap.
function gapBannerHtml(gap) {
  if (!gap) return '';
  if (gap.severity === 'soft') {
    return `<div class="gap-note">⏸ ${gap.gapDays} days since your last main session — easing back in; suggested loads below account for the time off.</div>`;
  }
  const weeks = gap.shiftDays / 7;
  const missedTxt = `${gap.missedCount} main session${gap.missedCount === 1 ? '' : 's'} missed`;
  if (gap.canShift) {
    return `<div class="gap-note major">
      <p>⏸ It's been ${gap.gapDays} days (${missedTxt}). Extend the plan to resume where you left off, or keep the original schedule.</p>
      <div class="row" style="gap:8px;margin-top:8px">
        <button type="button" class="primary" data-gap-extend>Extend plan by ${weeks} week${weeks === 1 ? '' : 's'}</button>
        <button type="button" class="ghost" data-gap-ack>Keep original schedule</button>
      </div>
    </div>`;
  }
  return `<div class="gap-note major">
    <p>⏸ It's been ${gap.gapDays} days (${missedTxt}). Your goal date is fixed, so the schedule can't shift — consider adjusting your cycle or peak settings.</p>
    <div class="row" style="gap:8px;margin-top:8px">
      <button type="button" class="ghost" onclick="location.hash='#profile'">Adjust in Profile</button>
      <button type="button" class="ghost" data-gap-ack>Got it</button>
    </div>
  </div>`;
}

// ADR-0014: monitoring signals — advisory banners, nothing mutates without a
// tap (same idiom as the gap banner above). Only readinessTrend has a real
// accept mutation (the early volume cut); the others are informational
// pointers, so their "accept" is just a dismissal.
const SIGNAL_ORDER = ['painCheckIn', 'readinessTrend', 'rpeDrift', 'retestPlateau'];

function signalsBannerHtml(signals) {
  if (!signals) return '';
  return SIGNAL_ORDER.map(key => {
    const sig = signals[key];
    if (!sig) return '';
    const major = sig.severity === 'red' ? ' major' : '';
    // Every signal surfaces its prescribed response (ADR-0014), not just the
    // one with a mutation: readinessTrend gets the accept button (the only
    // response that changes the plan); doc-pointer responses render as links
    // (pain-red → return-from-tweak guide, retest-plateau → end-of-cycle
    // checklist); the rest show the response as advisory text.
    let actionEl = '';
    if (Monitoring.signalHasAccept(sig)) {
      actionEl = `<button type="button" class="primary" data-signal-accept="${key}">${sig.action}</button>`;
    } else if (sig.href) {
      actionEl = `<a class="ghost" style="text-decoration:none" href="${sig.href}" target="_blank" rel="noopener" data-signal-link="${key}">${sig.action} →</a>`;
    } else if (sig.action) {
      actionEl = `<span class="muted">→ ${sig.action}</span>`;
    }
    return `<div class="gap-note${major}" data-signal-banner="${key}">
      <p>⚠ ${sig.message}</p>
      <div class="row" style="gap:8px;margin-top:8px;align-items:center;flex-wrap:wrap">
        ${actionEl}
        <button type="button" class="ghost" data-signal-dismiss="${key}">${Monitoring.signalHasAccept(sig) ? 'Not now' : 'Got it'}</button>
      </div>
    </div>`;
  }).join('');
}

// ADR-0015: suggest-rest one-tap session swap. Swap-by-consent (ADR-0008/
// 0014 idiom) — declining keeps the planned session with the Lighter levers
// (applied unconditionally in prescribeForContext whenever it's not
// swapped, per the ADR's "keeps the planned session with Lighter levers"
// framing), not a further reduction.
function readinessSwapBannerHtml() {
  // The show/hide guard lives in the TOP_BANNERS registry model below.
  return `<div class="gap-note major" data-readiness-swap-banner>
    <p>⏸ Readiness suggests rest today. Swap this session for a light day (mobility + skill drill + antagonist mini-block)?</p>
    <div class="row" style="gap:8px;margin-top:8px">
      <button type="button" class="primary" data-readiness-swap-accept>Swap for a light day</button>
      <button type="button" class="ghost" data-readiness-swap-decline>Keep planned session</button>
    </div>
  </div>`;
}

function wireReadinessSwapBanner(root, date) {
  root.querySelector('[data-readiness-swap-accept]')?.addEventListener('click', () => {
    const day = Storage.getDay(date) || {};
    Storage.setDay(date, { ...day, acceptedReadinessSwap: true });
    renderToday(root);
  });
  root.querySelector('[data-readiness-swap-decline]')?.addEventListener('click', () => {
    const day = Storage.getDay(date) || {};
    Storage.setDay(date, { ...day, declinedReadinessSwap: true });
    renderToday(root);
  });
}

function dismissSignalForDay(date, key) {
  Storage.setDay(date, Monitoring.dismissPatch(Storage.getDay(date), key));
}

function wireSignalsBanner(root, activePlan, date, signals) {
  root.querySelectorAll('[data-signal-accept]').forEach(btn => {
    btn.addEventListener('click', () => {
      const key = btn.dataset.signalAccept;
      // Monitoring owns what an accept DOES (the actionKey adapter) — the
      // view only persists the returned patch.
      const patch = Monitoring.acceptSettingsPatch(signals?.[key], activePlan.settings, date);
      if (patch) Storage.setPlanSettings(activePlan.id, patch);
      dismissSignalForDay(date, key);
      renderToday(root);
    });
  });
  root.querySelectorAll('[data-signal-dismiss]').forEach(btn => {
    btn.addEventListener('click', () => {
      dismissSignalForDay(date, btn.dataset.signalDismiss);
      renderToday(root);
    });
  });
}

function wireGapBanner(root, activePlan, gap) {
  if (!gap) return;
  root.querySelectorAll('[data-gap-extend]').forEach(btn => {
    btn.addEventListener('click', () => {
      const cur = Number(activePlan.settings.scheduleShiftDays) || 0;
      Storage.setPlanSettings(activePlan.id, { scheduleShiftDays: cur + gap.shiftDays, gapAcknowledgedThrough: todayIso() });
      renderToday(root);
    });
  });
  root.querySelectorAll('[data-gap-ack]').forEach(btn => {
    btn.addEventListener('click', () => {
      Storage.setPlanSettings(activePlan.id, { gapAcknowledgedThrough: todayIso() });
      renderToday(root);
    });
  });
}

// The top-of-page advisory banners (gap · monitoring signals · suggest-rest
// swap) as data instead of a per-branch list of render/wire calls. Each is the
// same consent-banner idiom — a condition, some copy, an accept/dismiss, a
// persisted flag, a re-render — so adding the next one (ADR-00NN) is one entry
// here, not an edit to every `renderToday` branch. `model(env)` returns the
// data the banner needs (falsy = don't show); `html`/`wire` are the existing
// implementations above, adapted. Interventions that aren't top-of-page consent
// banners stay where they are: the retest "Save as Benchmark" lives inside the
// session card, the pain check-in is an input row, and cycle-complete replaces
// the whole page.
const TOP_BANNERS = [
  {
    key: 'gap',
    model: env => env.gap,
    html: gap => gapBannerHtml(gap),
    wire: (root, gap, env) => wireGapBanner(root, env.activePlan, gap)
  },
  {
    key: 'signals',
    model: env => env.signals,
    html: signals => signalsBannerHtml(signals),
    wire: (root, signals, env) => wireSignalsBanner(root, env.activePlan, env.date, signals)
  },
  {
    key: 'readinessSwap',
    // Only where a swap is actionable: a suggest-rest readiness tier on a
    // non-rest session the athlete hasn't already answered. (The pre-registry
    // code rendered this on rest days too, where its buttons went unwired.)
    model: env => env.readinessGateLabel === 'suggestRest' && !env.session.isRest
      && !env.dayLog.acceptedReadinessSwap && !env.dayLog.declinedReadinessSwap,
    html: () => readinessSwapBannerHtml(),
    wire: (root, _m, env) => wireReadinessSwapBanner(root, env.date)
  }
];

function topBannersHtml(env) {
  return TOP_BANNERS.map(b => { const m = b.model(env); return m ? b.html(m, env) : ''; }).join('');
}

function wireTopBanners(root, env) {
  for (const b of TOP_BANNERS) {
    const m = b.model(env);
    if (m) b.wire(root, m, env);
  }
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
    ? `<div style="flex:1;text-align:center;font:700 13px 'Archivo';color:var(--text2)">${prettyDate(date)} <span class="muted">(Today)</span></div>`
    : `<button class="ghost date-jump-today" data-date-nav="today" title="Jump back to today">${prettyDate(date)} · tap for today</button>`;
  const dateNavHtml = `<div class="date-nav-card">
    <button class="ghost" data-date-nav="-1" title="Previous day" aria-label="Previous day">‹</button>
    ${dateLabel}
    <button class="ghost" data-date-nav="1" title="Next day" aria-label="Next day">›</button>
  </div>`;

  // Plan switcher — only shown when 2+ non-archived plans exist
  const allPlans = Storage.listPlans().filter(p => !p.archived);
  let planSwitcherHtml = '';
  if (allPlans.length >= 2) {
    const tabs = allPlans.map(p =>
      `<button class="plan-tab ${p.id === activePlan.id ? 'active' : ''}" data-plan-id="${p.id}" style="--plan-color:${p.color}">
        ${esc(p.name)}
      </button>`
    ).join('');
    planSwitcherHtml = `<div class="row" id="planSwitcher" style="gap:6px">${tabs}</div>`;
  }

  if (!start) {
    root.innerHTML = dateNavHtml + planSwitcherHtml + `<div class="card"><h2>Set up your cycle</h2>
      <p class="muted">Configure your active plan with a start date or comp date.</p>
      <button class="primary" onclick="location.hash='#profile'">Go to Profile</button></div>`;
    wireDateNav(root);
    wireCycleComplete(root, activePlan);
    wirePlanSwitcher(root, root);
    return;
  }

  const ctx = Program.resolveForSettings(activePlan.settings, date);
  if (ctx?.outOfCycle) {
    // ADR-0012: post-goal retest offer, goal day +1..+7 — composes with the
    // existing Cycle Complete celebration below rather than replacing it (in
    // practice the two windows always coincide: showCycleComplete is true
    // for every date on/after cycle end, exactly the window this can ever
    // be true in; it's false only when browsing before the cycle's start).
    const postGoalSession = Program.build(activePlan, date, Storage.get().benchmarks);
    const postGoalHtml = postGoalSession?.isRetest ? postGoalRetestCardHtml(postGoalSession, date) : '';
    const wirePostGoal = () => { if (postGoalSession?.isRetest) wire(root, date, postGoalSession, { weekIdx: null, phase: 'post-goal', flavor: null, deload: false, retest: true }, 1.0); };

    if (showCycleComplete) {
      root.innerHTML = dateNavHtml + planSwitcherHtml + completionHtml + postGoalHtml;
      wireDateNav(root);
      wireCycleComplete(root, activePlan);
      wirePlanSwitcher(root, root);
      wirePostGoal();
      return;
    }
    const which = activePlan.settings.anchorMode === 'compDate'
      ? `Cycle window: ${start} → ${activePlan.settings.compDate}`
      : `Cycle starts ${start}`;
    const weeks = Program.cycleWeeksOf(activePlan.settings);
    root.innerHTML = dateNavHtml + planSwitcherHtml + `<div class="card"><h2>Outside cycle</h2>
      <p class="muted">${date} is outside the ${weeks}-week window. ${which}.</p>
      <button class="ghost" onclick="location.hash='#profile'">Adjust in Profile</button></div>` + postGoalHtml;
    wireDateNav(root);
    wireCycleComplete(root, activePlan);
    wirePlanSwitcher(root, root);
    wirePostGoal();
    return;
  }

  const dayLog = Storage.getDay(date) || {};
  const readiness = dayLog.readiness || { sleep:3, soreness:3, fatigue:3 };
  const { multiplier, label: rdLabel, key: rdKey, avg: rdAvg } = Loads.computeReadinessMultiplier(readiness);
  // ADR-0015: readiness gating for climbing (non-kg) sessions — gates on the
  // stable `key` tier from Loads (never the display label, which is free to
  // be reworded without silently disabling the gating).
  const readinessGateLabel = rdKey === 'lighter' ? 'lighter' : rdKey === 'rest' ? 'suggestRest' : null;
  const session = Program.build(activePlan, date, Storage.get().benchmarks, {
    label: readinessGateLabel,
    acceptRestSwap: dayLog.acceptedReadinessSwap === true
  });
  // Only surface a gap on the real current date — not while browsing history (ADR-0008).
  const gap = date === realToday ? Replan.detectGap(activePlan, realToday) : null;

  // ADR-0014: monitoring signals — same real-current-date restriction as the
  // gap banner; dismissed-today signals stay hidden until they re-fire.
  const signals = date === realToday
    ? Monitoring.activeSignals({
        days: Storage.listDays(activePlan.id),
        benchmarkHistory: Storage.get().benchmarks?.history,
        dayLog,
        asOfIso: date
      })
    : null;

  // ADR-0012: Build-Monday micro-retest gate — the Monday opening any Build
  // run (both blocks of a double-block cycle), only when the stored max-hang
  // BENCHMARK is >4 weeks old. Benchmark age comes from the last retest-save
  // history entry (ADR-0014's history is the canonical freshness record) —
  // not benchmarks.updatedAt, which any Profile edit (even bodyweight-only)
  // bumps and would silently suppress a due micro-retest. Fallback to
  // updatedAt (converted to a LOCAL date — it's a UTC timestamp) covers a
  // manually-entered benchmark that has never been through a retest save.
  const microRetest = ctx.slot === 'mon-main' && ctx.phase === 'build'
    && Program.isBuildRunStart(Program.phasePattern(activePlan.settings), ctx.weekIdx)
    && (() => {
      const bm = Storage.get().benchmarks;
      const lastRetest = (bm?.history || []).filter(e => e?.date).map(e => e.date).sort().pop();
      const anchor = lastRetest || (bm?.updatedAt ? localIso(new Date(bm.updatedAt)) : null);
      if (!anchor) return true; // never benchmarked at all — treat as maximally stale
      return daysBetween(anchor, date) > Warmup.MICRO_RETEST_STALE_DAYS;
    })();
  const { warmup, cooldown, skillDrills } = Warmup.forSession(session, { microRetest });

  const bannerEnv = { activePlan, date, gap, signals, readinessGateLabel, dayLog, session };
  let body = dateNavHtml + planSwitcherHtml + completionHtml + headerHtml(date, ctx, session) + topBannersHtml(bannerEnv);

  if (session.isRest) {
    body += `<div class="card"><h2>Recovery checklist</h2>
      <ul class="checklist">${Warmup.restRecoveryChecklist().map((t,i) =>
        `<li><label style="display:flex;gap:8px;cursor:pointer;text-transform:none;letter-spacing:0;font:400 13px 'Archivo';color:var(--text2)"><input type="checkbox" data-rest-check="${i}" ${dayLog?.recovery?.[i]?'checked':''}> ${t}</label></li>`).join('')}</ul>
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
    wireTopBanners(root, bannerEnv);
    wirePlanSwitcher(root, root);
    return;
  }

  // Readiness — pill selectors (sleep / soreness / fatigue, 1–5)
  const readinessRow = (key) => `
    <div class="field">
      <label id="pill-lbl-${key}">${key.charAt(0).toUpperCase() + key.slice(1)}</label>
      <div class="pill-group" role="group" aria-labelledby="pill-lbl-${key}" data-pill-group="${key}">
        ${[1,2,3,4,5].map(v =>
          `<button type="button" class="pill ${readiness[key]===v?'active':''}" data-pill="${key}" data-val="${v}" aria-pressed="${readiness[key]===v}">${v}</button>`
        ).join('')}
      </div>
    </div>`;

  // ADR-0014: pain check-in — distinct from generic soreness (0-10 finger/
  // elbow pain + a "worse this morning?" flag), the Silbernagel-model input.
  const pain = readiness.pain || null;
  // Zone coloring mirrors the Silbernagel gate this input feeds (monitoring.js):
  // 0–2 fine, 3–5 hold progression, 6–10 skip finger loading. The colored track
  // + end anchors say which way the scale runs without a separate legend.
  const painZone = v => v <= 2 ? 'pz-green' : v <= 5 ? 'pz-amber' : 'pz-red';
  const painRow = `
    <div class="field">
      <label id="pill-lbl-pain">Finger/elbow pain</label>
      <div class="pill-group pain-scale" role="group" aria-labelledby="pill-lbl-pain" data-pill-group="pain" style="flex-wrap:wrap">
        ${Array.from({ length: 11 }, (_, v) => v).map(v =>
          `<button type="button" class="pill ${painZone(v)} ${pain?.value === v ? 'active' : ''}" data-pain-pill data-val="${v}" aria-pressed="${pain?.value === v}">${v}</button>`
        ).join('')}
      </div>
      <div class="scale-anchors"><span>0 · no pain</span><span>10 · severe</span></div>
      <label style="display:flex;gap:8px;align-items:center;margin-top:8px;cursor:pointer;text-transform:none;letter-spacing:0;font:400 13px 'Archivo';color:var(--text2)">
        <input type="checkbox" data-pain-worse ${pain?.settledByMorning === false ? 'checked' : ''}> Worse this morning than after yesterday's session
      </label>
    </div>`;

  body += `<div>
    <div class="section-label" style="margin-bottom:9px">Readiness</div>
    <div class="card">
      ${readinessRow('sleep')}
      ${readinessRow('soreness')}
      ${readinessRow('fatigue')}
      <p class="muted" data-readiness-summary style="margin:4px 0 0">Avg ${rdAvg ? rdAvg.toFixed(1) : '—'} → <b>${rdLabel}</b> ${multiplier ? `(×${multiplier})` : ''}</p>
      <details class="muted" style="margin-top:6px;font-size:0.85em">
        <summary style="cursor:pointer">About these numbers</summary>
        The readiness multipliers (×1.05 / ×1.0 / ×0.85 / rest) and the ±5% RPE
        step are an app convention, not clinical thresholds — the direction is
        sound, the exact numbers aren't validated. Trust your own logged trends
        over the multiplier, and adjust it if it consistently reads wrong for you.
      </details>
    </div>
    <div class="card" style="margin-top:10px">
      ${painRow}
    </div>
  </div>`;

  // Warm-up — collapsed
  if (warmup.length) {
    const checkedCount = Object.values(dayLog?.warmup || {}).filter(Boolean).length;
    body += `<div class="card" style="padding-top:6px;padding-bottom:6px"><details>
      <summary>Warm-up <span class="count">${checkedCount}/${warmup.length}</span></summary>
      <ul class="checklist">${warmup.map((t,i) =>
        `<li><label style="display:flex;gap:8px;cursor:pointer"><input type="checkbox" data-warmup="${i}" ${dayLog?.warmup?.[i]?'checked':''}> ${t}</label></li>`).join('')}</ul>
      ${warmupDrillPickerHtml(skillDrills, dayLog?.warmupDrill)}
    </details></div>`;
  }

  // Exercises — accordion cards, first open
  body += `<div style="display:flex;flex-direction:column;gap:10px">
    <div class="section-label">Session · tap to open &amp; log</div>
    ${session.exercises.map((ex, i) => renderExercise(ex, i, dayLog, ctx, multiplier, date, session.sessionId)).join('')}
  </div>`;

  // Session feel + notes + status
  body += `<div class="card"><h2>Session</h2>
    <div class="field">
      <label>Session feel</label>
      <div class="pill-group" role="group" aria-label="Session feel" data-pill-group="sessionFeel">
        ${[1,2,3,4,5].map(v =>
          `<button type="button" class="pill ${(dayLog.sessionFeel ?? 3)===v?'active':''}" data-pill="sessionFeel" data-val="${v}" aria-pressed="${(dayLog.sessionFeel ?? 3)===v}">${v}</button>`
        ).join('')}
      </div>
    </div>
    <div class="field"><label>Notes</label>
      <textarea id="sessionNotes" placeholder="anything to remember">${esc(dayLog.sessionNotes || '')}</textarea></div>
    <div class="row">
      <button class="primary" id="markCompleted" style="flex:1">${dayLog.status === 'completed' ? '✓ Completed' : 'Mark completed'}</button>
      <button class="ghost" id="markPartial">Partial</button>
      <button class="ghost" id="markMissed">${dayLog.status === 'missed' ? '✗ Missed' : 'Missed'}</button>
    </div>
    ${retestBenchmarkSection(session, date)}</div>`;

  // Cooldown — collapsed
  if (cooldown.length) {
    const checkedCount = Object.values(dayLog?.cooldown || {}).filter(Boolean).length;
    body += `<div class="card" style="padding-top:6px;padding-bottom:6px"><details>
      <summary>Cooldown <span class="count">${checkedCount}/${cooldown.length}</span></summary>
      <ul class="checklist">${cooldown.map((t,i) =>
        `<li><label style="display:flex;gap:8px;cursor:pointer"><input type="checkbox" data-cooldown="${i}" ${dayLog?.cooldown?.[i]?'checked':''}> ${t}</label></li>`).join('')}</ul>
    </details></div>`;
  }

  root.innerHTML = body;
  wireDateNav(root);
  wireCycleComplete(root, activePlan);
  wireTopBanners(root, bannerEnv);
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
  if (ex.drills) return ''; // drillPickerHtml renders its own pill picker + focus panel
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
  const repsDefault  = ex.prescribedReps ?? ex.prescribedTarget?.value ?? '';
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
  if (vis.kg)   row += stepper(`ex-${i}-kg`,   n(kgValue),  'Added load · kg', 0.5, kgIsDefault, '—');
  if (vis.rpe)  row += stepper(`ex-${i}-rpe`,  n(rpeValue), ex.rpeRange ? `RPE · target ${ex.rpeRange[0]}–${ex.rpeRange[1]}` : 'RPE', 0.5, rpeIsDefault);
  if (vis.sets) row += stepper(`ex-${i}-sets`, n(setsValue), 'Sets', 1, setsIsDefault);
  if (vis.reps) row += stepper(`ex-${i}-reps`, n(repsValue), stepperCountLabel(ex), 1, repsIsDefault);
  row += '</div>';

  let suggestionBtn = '';
  // Hide the "tap to use" button when kg is already pre-filled with the suggestion —
  // it would be a no-op. Show it only when the user has a logged kg that differs.
  if (suggestion && suggestion.suggestedKg != null && !kgIsDefault && actual.kg != null && actual.kg !== suggestion.suggestedKg) {
    suggestionBtn = `<button class="suggest-btn" data-suggest-btn="${i}" data-suggest-kg="${suggestion.suggestedKg}">Suggested: ${suggestion.suggestedKg} kg → tap to use</button>`;
  }
  return suggestionBtn + row;
}

// Stepper label for the "count" input: capitalized unit from prescribedTarget
// (e.g. 'problems' → 'Problems'), 'min' → 'Minutes', else the generic 'Reps'.
function stepperCountLabel(ex) {
  const label = repsLabel(ex);
  if (label === 'min') return 'Minutes';
  if (label === 'reps') return 'Reps';
  return label.charAt(0).toUpperCase() + label.slice(1);
}

// Renders prescription facts as stacked rows instead of one "·"-joined
// line, so every exercise kind reads the same way. Pass ['Label', value]
// for a named fact (hang/rest/sets/RPE) or a bare string for a free-text
// clause split off ex.prescribed (climbing kinds have no per-field data
// to label, so those rows render without a label column).
function rxRowHtml(row) {
  if (Array.isArray(row)) {
    const [label, val] = row;
    return `<div class="rx-row"><span class="rx-label">${label}</span><span class="rx-val">${val}</span></div>`;
  }
  return `<div class="rx-row"><span class="rx-val">${row}</span></div>`;
}
function rxGridHtml(rows) {
  return `<div class="rx-grid">${rows.filter(Boolean).map(rxRowHtml).join('')}</div>`;
}
// Splits a program-authored ex.prescribed string on its ' · ' clause
// delimiter (used consistently across js/program.js) into separate rows.
function prescribedClauseRows(prescribed) {
  return (prescribed || '').split(' · ').filter(Boolean);
}

function stepper(id, value, label, step, isDefault = false, placeholder = '') {
  const wrapCls = isDefault ? 'stepper stepper-default' : 'stepper';
  const inputAttrs = isDefault ? ' data-default="1"' : '';
  return `<div>
    <div class="stepper-label">${label}</div>
    <div class="${wrapCls}">
      <button type="button" data-step="-" data-target="${id}" data-step-amount="${step}">−</button>
      <input type="number" id="${id}" inputmode="decimal" step="${step}" value="${value}" placeholder="${placeholder}"${inputAttrs}>
      <button type="button" data-step="+" data-target="${id}" data-step-amount="${step}">+</button>
    </div>
  </div>`;
}

// One-line summary under the accordion title: "2×5 · 62 kg suggested · RPE 8–9"
// (hangboard/pullup) or "4 problems · RPE 8–9" (climbing-kind, from prescribedTarget)
function accSub(ex, actual, suggestion) {
  const parts = [];
  if (ex.drills) {
    const chosen = ex.drills.find(d => d.key === actual.drill);
    parts.push(chosen ? `✓ ${chosen.name}` : 'pick a drill to focus on');
    return parts.join(' · ');
  } else if (ex.prescribedTarget) {
    const val = actual.reps ?? ex.prescribedTarget.value;
    parts.push(`${val} ${unitLabel(val, ex.prescribedTarget.unit)}`);
  } else {
    const sets = actual.sets ?? ex.prescribedSets;
    const reps = actual.reps ?? ex.prescribedReps;
    if (sets && reps) parts.push(`${sets}×${reps}`);
    else if (ex.sets) parts.push(ex.sets);
  }
  if (suggestion?.suggestedKg != null) {
    parts.push(suggestion.restSuggested ? 'rest suggested' : `${suggestion.suggestedKg} kg suggested`);
  } else if (suggestion?.restSuggested) {
    parts.push('rest suggested');
  } else if (ex.hang) {
    parts.push(ex.hang);
  } else if (!ex.prescribedTarget && ex.prescribed) {
    parts.push(ex.prescribed.length > 46 ? ex.prescribed.slice(0, 44) + '…' : ex.prescribed);
  }
  if (ex.rpeRange) parts.push(`RPE ${ex.rpeRange[0]}–${ex.rpeRange[1]}`);
  return parts.join(' · ');
}

// Crisp headline target for climbing-kind exercises (gym-ready spec §2):
// "Today's target → 4 problems", or on a deload/taper week with the original
// struck through: "Deload target → 4 sets 2 sets".
function targetCalloutHtml(ex) {
  if (!ex.prescribedTarget) return '';
  const { value, unit } = ex.prescribedTarget;
  const label = unitLabel(value, unit);
  // ADR-0015 readiness scaling runs last in the prescription pipeline, so it
  // owns the callout when present. Show the immediate pre-readiness value,
  // plus the original template when a ramp/cut also ran — without this, a
  // ramp that readiness cancels out renders as "30 ↑ from 30".
  if (ex.readinessScaledFrom) {
    const { value: rv, unit: ru } = ex.readinessScaledFrom;
    const base = ex.originalTarget || ex.rampedFrom;
    if (rv !== value || base) {
      const fromTxt = rv !== value ? `↓ from ${rv} ${unitLabel(rv, ru)}` : '';
      const baseTxt = base && base.value !== rv ? `${fromTxt ? ' · ' : ''}template ${base.value} ${unitLabel(base.value, base.unit)}` : '';
      return `<div class="callout"><span class="k">Readiness target</span><span class="v">${value} ${label} <span style="opacity:.6">${fromTxt}${baseTxt}</span></span></div>`;
    }
  }
  if (ex.originalTarget) {
    const { value: ov, unit: ou } = ex.originalTarget;
    return `<div class="callout deload-target"><span class="k">Deload target</span><span class="v"><s>${ov} ${unitLabel(ov, ou)}</s>${value} ${label}</span></div>`;
  }
  // ADR-0009 Base aerobic ramp — volume stepped up from the phase template.
  if (ex.rampedFrom) {
    const { value: rv, unit: ru } = ex.rampedFrom;
    return `<div class="callout"><span class="k">Ramped target</span><span class="v">${value} ${label} <span style="opacity:.6">↑ from ${rv} ${unitLabel(rv, ru)}</span></span></div>`;
  }
  return `<div class="callout"><span class="k">Today's target</span><span class="v">${value} ${label}</span></div>`;
}

// Glanceable execution cues (gym-ready spec §4 — hybrid how-to).
function howtoHtml(ex) {
  const text = howto(ex);
  if (!text) return '';
  return `<div class="howto"><b>How</b>${text}</div>`;
}

// Technique-drill picker (KG-A9 + addendum): a category-chip filter narrows a
// (possibly long) drill list to one category at a time, with a pill per drill
// in the active category and a "Focus" detail panel for whichever drill is
// selected (defaults to the first, so there's always something to read even
// before a tap). `slug` disambiguates DOM ids/data-attrs between the Tuesday
// exercise picker (slug = exercise index) and the warm-up embed (slug = 'warmup').
function categoryPillsHtml(drills, selectedKey, slug) {
  const selected = drills.find(d => d.key === selectedKey) || drills[0];
  const cats = DRILL_CATEGORIES.filter(c => drills.some(d => d.category === c.key));
  const activeCat = selected ? selected.category : cats[0]?.key;
  const chips = cats.map(c =>
    `<button type="button" class="chip ${c.key === activeCat ? 'active' : ''}" data-drill-chip="${c.key}" data-drill-slug="${slug}">${c.name}</button>`
  ).join('');
  const groups = cats.map(c => {
    const pills = drills.filter(d => d.category === c.key).map(d =>
      `<button type="button" class="pill ${d.key === selectedKey ? 'active' : ''}" data-drill-pill="${d.key}" data-drill-slug="${slug}" aria-pressed="${d.key === selectedKey}">${d.name}</button>`
    ).join('');
    return `<div class="pill-group drill-pills" role="group" aria-label="${c.name} drills" data-drill-cat-group="${c.key}" data-drill-slug="${slug}"${c.key === activeCat ? '' : ' style="display:none"'}>${pills}</div>`;
  }).join('');
  return `<div class="chip-row" role="tablist" aria-label="Drill category">${chips}</div>${groups}
    <div class="howto" id="drill-focus-${slug}"><b>Focus</b>${selected ? selected.focus : ''}</div>`;
}

function drillPickerHtml(i, ex, actual) {
  const selectedKey = actual.drill || ex.drills[0].key;
  return categoryPillsHtml(ex.drills, selectedKey, String(i));
}

// Thu/Sat warm-up embed — same category-chip/pill mechanism, but day-level
// (dayLog.warmupDrill) rather than tied to an exercise index.
function warmupDrillPickerHtml(drills, selectedKey) {
  if (!drills || !drills.length) return '';
  const key = selectedKey || drills[0].key;
  return `<div class="warmup-drill-embed">
    <div class="section-label" style="margin-bottom:8px">Optional: focus on a drill</div>
    ${categoryPillsHtml(drills, key, 'warmup')}
  </div>`;
}

function renderExercise(ex, i, dayLog, ctx, readinessMult, date, sessionId) {
  const stored = (dayLog.exercises || [])[i] || {};
  const actual = asActualObj(stored.actual);
  const notes = stored.notes || '';
  let prescribedStr = '';
  let suggestion = null;

  if (ex.kind === 'antagonist-block') {
    const items = ex.items.map(it => `<div class="item-row" style="padding:5.5px 0"><span class="item-name">${it.name}</span><span class="muted" style="text-align:right">${it.prescribed}</span></div>`).join('');
    return `<details class="acc" data-ex="${i}">
      <summary>
        <div>
          <div class="acc-title">${ex.name}</div>
          <div class="acc-sub">${ex.items.length} exercises</div>
        </div>
        <span class="acc-cv">＋</span>
      </summary>
      <div class="acc-body">
        ${items}
        ${notesField(i, notes, !!notes)}
      </div>
    </details>`;
  }

  if (ex.kind === 'hangboard' || ex.kind === 'pullup') {
    suggestion = Loads.resolveForDay({
      exercise: ex,
      exerciseIndex: i,
      sessionId,
      dateISO: date,
      days: Storage.listDays(),
      readinessMultiplier: readinessMult,
      // ADR-0014: an amber pain check-in holds the ADR-0009 progression.
      holdProgression: Monitoring.painCheckInSignal(dayLog.readiness?.pain)?.severity === 'amber',
    });
    const rangeStr = suggestion?.range ? `${suggestion.range[0]}–${suggestion.range[1]} kg` : '';
    // ADR-0013: a kg range needs bodyweight AND the kind's benchmark — resolve
    // returns null (never a silent added-only fallback) when either is unset.
    // Name exactly what's missing so the empty load field isn't a mystery
    // (the old hint only covered bodyweight, so a missing max-hang benchmark
    // left the field blank with no explanation). But a null loadPctRange (e.g.
    // 7/3 Repeaters — bodyweight-only, no % prescription exists) means there
    // was never a suggestion to compute, so don't blame the benchmarks for it.
    const hasLoadPct = !!(ex.loadPctRange || ex.pctRange);
    let loadHint = '';
    if (!suggestion && hasLoadPct) {
      const bm = Storage.get().benchmarks || {};
      const missing = [];
      if (bm.bodyweight == null) missing.push('bodyweight');
      if (ex.kind === 'hangboard' && bm.maxHang20mm == null) missing.push('max-hang (20 mm) benchmark');
      if (ex.kind === 'pullup' && bm.pullup1RM == null) missing.push('pull-up 1RM benchmark');
      const what = missing.length ? missing.join(' + ') : 'benchmarks';
      loadHint = `<div class="muted" style="margin:4px 0">Set your ${what} in Profile to see a suggested load.</div>`;
    }
    const sets = ex.sets || ex.reps || '';
    const rpe  = ex.rpeRange ? `RPE ${ex.rpeRange[0]}–${ex.rpeRange[1]}` : '';
    // Labeled rows instead of a single "·"-joined line — hang/rest/sets read
    // as distinct facts (work time vs. rest vs. rep scheme) rather than one
    // run-on sentence the athlete has to parse apart.
    prescribedStr = rxGridHtml([
      ex.hang && ['Work', ex.hang],
      sets && ['Sets', sets],
      ex.rest && ['Rest', ex.rest],
      rangeStr && ['Load', rangeStr],
      rpe && ['Target', rpe]
    ]) + loadHint;
  } else if (ex.drills) {
    prescribedStr = drillPickerHtml(i, ex, actual);
  } else if (ex.prescribedTarget) {
    const rpe = ex.rpeRange ? ['Target', `RPE ${ex.rpeRange[0]}–${ex.rpeRange[1]}`] : null;
    // ADR-0015: readiness-gating RPE cap note (Lighter day, climbing kinds
    // whose rpeRange tops out above 8.5 — campus/limit-boulder mainly).
    const capNote = ex.readinessCapNote ? `<div class="muted" style="margin:4px 0">⚠ ${ex.readinessCapNote}</div>` : '';
    prescribedStr = targetCalloutHtml(ex) + howtoHtml(ex) +
      `<div style="margin:0 0 6px">${rxGridHtml([...prescribedClauseRows(ex.prescribed), rpe])}</div>` + capNote;
  } else {
    const rpe = ex.rpeRange ? ['Target', `RPE ${ex.rpeRange[0]}–${ex.rpeRange[1]}`] : null;
    prescribedStr = rxGridHtml([...prescribedClauseRows(ex.prescribed), rpe]);
  }

  // Climbing-kind exercises and drill-choice exercises build their own
  // wrapping (target callout / pill picker + how-to); everything else still
  // gets the single .exercise-prescribe wrapper it always had.
  const prescribeBlock = (ex.prescribedTarget || ex.drills)
    ? prescribedStr
    : `<div class="exercise-prescribe" style="margin-top:0">${prescribedStr}</div>`;

  const openAttr = i === 0 ? ' open' : '';
  return `<details class="acc" data-ex="${i}"${openAttr}>
    <summary>
      <div>
        <div class="acc-title">${ex.name}</div>
        <div class="acc-sub">${accSub(ex, actual, suggestion)}</div>
      </div>
      <span class="acc-cv">＋</span>
    </summary>
    <div class="acc-body">
      ${prescribeBlock}
      ${exerciseInputs(i, ex, actual, suggestion)}
      ${notesField(i, notes, !!notes)}
    </div>
  </details>`;
}

function notesField(i, value, openByDefault) {
  if (openByDefault) {
    return `<textarea data-ex-notes="${i}" placeholder="notes" style="margin-top:8px">${esc(value)}</textarea>`;
  }
  return `<button type="button" class="notes-toggle" data-notes-toggle="${i}">+ note</button>
    <textarea data-ex-notes="${i}" placeholder="notes" style="margin-top:8px;display:none"></textarea>`;
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
      // Carry kind/optional/prescribedTarget onto the persisted exercise so
      // js/views/log.js's edit form (which reads only the stored day, never the
      // live Program session) can pick the right inputVisibility/repsLabel/drill
      // picker for a past day instead of falling back to generic sets+reps+rpe.
      // Drill options are NOT persisted here (KG-A9 addendum) — log.js resolves
      // them from the js/drills.js catalog instead, so a later drill-list edit
      // doesn't get frozen into every already-logged day. rpeRange (ADR-0014)
      // is carried too — the RPE-drift monitoring signal compares a logged
      // RPE against the target range that applied *that day*, which isn't
      // otherwise reconstructible once the phase has moved on.
      exercises: cur.exercises || session.exercises.map(ex => ({
        name: ex.name, kind: ex.kind, optional: ex.optional,
        prescribedTarget: ex.prescribedTarget, rpeRange: ex.rpeRange, prescribed: '', actual:{}, notes:''
      })),
      sessionNotes: cur.sessionNotes || '',
      warmup: cur.warmup || {},
      cooldown: cur.cooldown || {},
      warmupDrill: cur.warmupDrill
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
      group.querySelectorAll('.pill').forEach(s => { s.classList.remove('active'); s.setAttribute('aria-pressed', 'false'); });
      p.classList.add('active'); p.setAttribute('aria-pressed', 'true');

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
        const eff = Loads.resolveForDay({
          exercise: ex,
          exerciseIndex: i,
          sessionId: session.sessionId,
          dateISO: date,
          days: Storage.listDays(),
          readinessMultiplier: multiplier,
          holdProgression: Monitoring.painCheckInSignal(d.readiness?.pain)?.severity === 'amber',
        });
        if (eff && eff.suggestedKg != null) {
          btn.textContent = `Suggested: ${eff.suggestedKg} kg → tap to use`;
          btn.dataset.suggestKg = eff.suggestedKg;
          btn.style.display = '';
        } else {
          // Readiness dropped to a rest suggestion — hide the now-stale "Suggested" button
          // so the old kg isn't presented as a live recommendation.
          btn.style.display = 'none';
        }
      });
    });
  });

  // ===== Pain check-in (ADR-0014, distinct from generic soreness) =====
  function persistPain(patch) {
    const d = getOrInitDay();
    const r = { ...d.readiness, pain: { ...(d.readiness?.pain || {}), ...patch } };
    persist({ readiness: r });
  }
  root.querySelectorAll('button[data-pain-pill]').forEach(p => {
    p.addEventListener('click', () => {
      const group = root.querySelector('[data-pill-group="pain"]');
      group.querySelectorAll('.pill').forEach(s => { s.classList.remove('active'); s.setAttribute('aria-pressed', 'false'); });
      p.classList.add('active'); p.setAttribute('aria-pressed', 'true');
      persistPain({ value: parseInt(p.dataset.val, 10) });
    });
  });
  root.querySelector('[data-pain-worse]')?.addEventListener('change', (e) => {
    persistPain({ settledByMorning: !e.target.checked });
  });

  // ===== Technique-drill category chips (KG-A9 + addendum) =====
  // Chips only control which category's pill-group is visible — no persist.
  root.querySelectorAll('button[data-drill-chip]').forEach(btn => {
    btn.addEventListener('click', () => {
      const slug = btn.dataset.drillSlug;
      const cat = btn.dataset.drillChip;
      root.querySelectorAll(`button[data-drill-chip][data-drill-slug="${slug}"]`).forEach(b => {
        b.classList.toggle('active', b === btn);
      });
      root.querySelectorAll(`[data-drill-cat-group][data-drill-slug="${slug}"]`).forEach(g => {
        g.style.display = g.dataset.drillCatGroup === cat ? '' : 'none';
      });
    });
  });

  // ===== Technique-drill pills (closes KG-A9; warm-up embed is the addendum) =====
  // Picking a Tuesday-exercise drill both selects it and marks the exercise
  // done (no separate checkbox); picking a warm-up drill just records the
  // choice on the day (dayLog.warmupDrill) — it doesn't gate anything.
  root.querySelectorAll('button[data-drill-pill]').forEach(btn => {
    btn.addEventListener('click', () => {
      const slug = btn.dataset.drillSlug;
      const key = btn.dataset.drillPill;

      root.querySelectorAll(`button[data-drill-pill][data-drill-slug="${slug}"]`).forEach(b => {
        b.classList.remove('active'); b.setAttribute('aria-pressed', 'false');
      });
      btn.classList.add('active'); btn.setAttribute('aria-pressed', 'true');

      if (slug === 'warmup') {
        const drill = WARMUP_DRILLS.find(d => d.key === key);
        if (!drill) return;
        const focusEl = root.querySelector('#drill-focus-warmup');
        if (focusEl) focusEl.innerHTML = `<b>Focus</b>${drill.focus}`;
        persist({ warmupDrill: key });
        return;
      }

      const i = +slug;
      const ex = session.exercises[i];
      const drill = ex.drills.find(d => d.key === key);
      if (!drill) return;

      const focusEl = root.querySelector(`#drill-focus-${i}`);
      if (focusEl) focusEl.innerHTML = `<b>Focus</b>${drill.focus}`;
      const subEl = root.querySelector(`[data-ex="${i}"] .acc-sub`);
      if (subEl) subEl.textContent = `✓ ${drill.name}`;

      const d = getOrInitDay();
      const cur = d.exercises[i] || { name: ex.name };
      d.exercises[i] = { ...cur, actual: { ...asActualObj(cur.actual), drill: key, done: true } };
      persist({ exercises: d.exercises });
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
  // Missed lives here now that the Log tab is a read-only feed — the
  // Calendar's missed-dot depends on this status being settable somewhere.
  root.querySelector('#markMissed')?.addEventListener('click', () => {
    persist({ status: 'missed' });
    const btn = root.querySelector('#markMissed');
    if (btn) btn.textContent = '✗ Missed';
  });
  root.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-retest-benchmark]');
    if (!btn) return;
    const values = retestBenchmarkValues(session, getSelectedDate());
    if (!values) return;
    const { benchmarks } = Storage.get();
    // ADR-0014: the retest-save path appends a dated history snapshot
    // (feeding the retest-trajectory monitoring signal) rather than the
    // plain overwrite setGlobalBenchmarks does for ad-hoc Profile edits.
    Storage.saveRetestBenchmarks({
      bodyweight: benchmarks.bodyweight ?? null,
      maxHang20mm: values.maxHang20mm,
      // ADR-0012: a skipped optional pull-up (post-goal retest) must not
      // erase the last known pull-up benchmark with null.
      pullup1RM: values.pullup1RM != null ? values.pullup1RM : (benchmarks.pullup1RM ?? null)
    }, getSelectedDate());
    refreshRetestBenchmarkBox(true);
  });
}
