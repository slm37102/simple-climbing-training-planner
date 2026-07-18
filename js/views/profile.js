// Profile view — ASCENT: identity + benchmarks (edit-in-place) + plans + settings rows.
// Merges the previous Settings and Plans views into one tab.
import { Storage } from '../storage.js';
import { Program } from '../program.js';
import { Loads } from '../loads.js';
import { Sync } from '../sync.js';
import { flash, escHtml } from '../ui.js';
import { localIso as toLocalISO, addDays, daysBetween, mondayDow } from '../dates.js';
import { openOnboarding } from './onboarding.js';
import { limiterReadout } from '../limiter.js';

const COLORS = ['#5FD4E8', '#F0607A', '#3FB6A8', '#E0A53C', '#6E8BF0', '#F07850'];

function planDateRange(plan) {
  const start = Program.effectiveStart(plan.settings);
  if (!start) return 'No dates set';
  const weeks = Program.cycleWeeksOf(plan.settings);
  const end = plan.settings.compDate || addDays(start, Program.cycleDays(weeks) - 1);
  return `${start} → ${end} · ${weeks}wk`;
}

function planProgressPct(plan) {
  const start = Program.effectiveStart(plan.settings);
  if (!start) return 0;
  const total = Program.cycleDays(Program.cycleWeeksOf(plan.settings));
  const idx = daysBetween(start, toLocalISO(new Date())) + 1;
  return Math.max(0, Math.min(100, Math.round((idx / total) * 100)));
}

// Suggested pull-up work load for the active plan's current phase (midpoint of the
// prescribed % range against the 1RM benchmark) — the Benchmarks card callout.
function suggestedPullupKg() {
  try {
    const plan = Storage.getActivePlan();
    const session = Program.build(plan, toLocalISO(new Date()), Storage.get().benchmarks);
    const pull = (session?.exercises || []).find(e => e.kind === 'pullup');
    if (!pull) return null;
    const base = Loads.prescribeLoadKg(pull, Storage.get().benchmarks);
    if (!base?.addedKgRange) return null;
    return Math.round((base.addedKgRange[0] + base.addedKgRange[1]) / 2);
  } catch (_) {
    return null;
  }
}

export function renderProfile(root) {
  let benchEditing = false;
  let formState = { mode: null, editId: null }; // legacy inline edit form for existing plans
  let pickerState = { startDate: null, compDate: null, startMonth: null, compMonth: null };
  // Draft benchmark values while editing (committed on Done)
  let benchDraft = null;

  function isoFirstOfMonth(isoOrNull) {
    const base = isoOrNull || toLocalISO(new Date());
    return base.slice(0, 7) + '-01';
  }

  // ── Benchmarks card ─────────────────────────────────────────────────────
  function benchRow(field, name, unitLabel, step, min) {
    const v = benchDraft[field];
    if (!benchEditing) {
      return `<div class="bench-row">
        <div><div class="b-name">${name}</div><div class="b-unit">${unitLabel}</div></div>
        <div class="b-val">${v ?? '—'}<small> kg</small></div>
      </div>`;
    }
    return `<div class="bench-row">
      <div><div class="b-name">${name}</div><div class="b-unit">${unitLabel}</div></div>
      <div class="stepper" style="width:auto">
        <button type="button" data-bench-step="-" data-bench-field="${field}" data-step-amount="${step}" data-min="${min}">−</button>
        <input type="number" data-bench-input="${field}" value="${v ?? ''}" step="${step}" style="width:56px">
        <button type="button" data-bench-step="+" data-bench-field="${field}" data-step-amount="${step}">＋</button>
      </div>
    </div>`;
  }

  function benchmarksCardHtml() {
    const sugg = suggestedPullupKg();
    return `<div class="card">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:3px">
        <h2 style="margin:0">Benchmarks</h2>
        <button class="mini-btn ${benchEditing ? '' : 'ghost-mini'}" data-bench-toggle>${benchEditing ? 'Done' : 'Edit'}</button>
      </div>
      <p class="muted" style="margin:0 0 14px;font-size:.75rem">Drives every prescribed load. You'll usually only change these at a retest.</p>
      <div class="bench-rows">
        ${benchRow('maxHang20mm', 'Max-hang added load', 'kg · best 10s hang on 20mm', 1, -30)}
        ${benchRow('pullup1RM', '1RM weighted pull-up', 'kg · added weight', 1, -30)}
        ${benchRow('bodyweight', 'Bodyweight', 'kg', 0.5, 30)}
      </div>
      ${sugg != null ? `<div class="callout"><span class="k">→ Suggested pull-up work load</span><span class="v">+${sugg} kg</span></div>` : ''}
    </div>`;
  }

  // ── Limiter readout card (ADR-0011, closes KG-A1/KG-D2) ────────────────
  // Static, informational, target-grade-anchored — recomputes on any
  // benchmark change (including a retest save, since it just re-reads
  // Storage.get().benchmarks on every render). Changes no prescription.
  function limiterCardHtml() {
    const readout = limiterReadout(Storage.get().benchmarks);
    if (!readout) return '';
    const lineHtml = readout.lines.map(l => `<div class="bench-row" data-limiter-line="${l.key}"><div class="b-name" style="max-width:100%">${escHtml(l.text)}</div></div>`).join('');
    return `<div class="card" data-limiter-card>
      <h2 style="margin:0 0 3px">Likely limiter</h2>
      <p class="muted" style="margin:0 0 14px;font-size:.75rem">${escHtml(readout.caveat)}</p>
      <div class="bench-rows">${lineHtml}</div>
    </div>`;
  }

  // ── Plans card ──────────────────────────────────────────────────────────
  function plansCardHtml() {
    const plans = Storage.listPlans();
    const activePlanId = Storage.getActivePlan()?.id;
    const canDelete = plans.length > 1;
    const sorted = [...plans.filter(p => !p.archived), ...plans.filter(p => p.archived)];

    const items = sorted.map(plan => {
      const isActive = plan.id === activePlanId;
      const daysLogged = Object.keys(plan.days || {}).length;
      const pct = planProgressPct(plan);
      return `<div class="plan-card ${isActive ? 'active-plan' : ''} ${plan.archived ? 'archived-plan' : ''}" data-plan-open="${plan.id}">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:8px">
          <div style="min-width:0">
            <div class="pl-name"><span class="plan-dot" style="background:${plan.color}"></span> ${escHtml(plan.name)}</div>
            <div class="pl-sub">${planDateRange(plan)} · ${plan.focus} · ${daysLogged} day${daysLogged !== 1 ? 's' : ''} logged</div>
          </div>
          ${isActive ? '<span class="active-chip">Active</span>' : ''}
        </div>
        <div class="pl-track"><div class="pl-bar" style="width:${pct}%;background:${plan.color}"></div></div>
        <div class="row" style="margin-top:10px;gap:6px">
          ${!isActive ? `<button class="mini-btn ghost-mini" data-action="set-active" data-pid="${plan.id}">Set active</button>` : ''}
          <button class="mini-btn ghost-mini" data-action="edit" data-pid="${plan.id}">Edit</button>
          <button class="mini-btn ghost-mini" data-action="duplicate" data-pid="${plan.id}">Duplicate</button>
          ${plan.archived
            ? `<button class="mini-btn ghost-mini" data-action="unarchive" data-pid="${plan.id}">Unarchive</button>`
            : `<button class="mini-btn ghost-mini" data-action="archive" data-pid="${plan.id}">Archive</button>`}
          ${canDelete ? `<button class="mini-btn ghost-mini" style="color:var(--bad)" data-action="delete" data-pid="${plan.id}">Delete</button>` : ''}
        </div>
      </div>`;
    }).join('');

    return `<div class="card">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:13px">
        <h2 style="margin:0">Plans</h2>
        <button class="mini-btn" id="new-plan-btn">＋ New plan</button>
      </div>
      <div style="display:flex;flex-direction:column;gap:9px">${items}</div>
      <div id="plan-edit-slot"></div>
    </div>`;
  }

  // Legacy inline edit form (existing plans only — new plans go through the wizard)
  function editFormHtml(existingPlan) {
    const p = existingPlan || {};
    const settings = p.settings || {};
    const focusVal = p.focus || 'hybrid';
    const colorVal = p.color || COLORS[0];
    const anchorMode = settings.anchorMode || 'startDate';
    const cycleWeeksVal = Program.cycleWeeksOf(settings);

    const swatches = COLORS.map(c =>
      `<button type="button" class="color-swatch${c === colorVal ? ' swatch-sel' : ''}" data-color="${c}"
        style="background:${c};border:${c === colorVal ? '3px solid #fff' : '2px solid transparent'}"></button>`
    ).join('');

    return `<div class="plan-form" id="pf-card">
      <h2>Edit plan</h2>
      <div class="field">
        <label>Plan name</label>
        <input type="text" id="pf-name" value="${escHtml(p.name || '')}" placeholder="e.g. Spring season" autocomplete="off">
      </div>
      <div class="field">
        <label>Focus</label>
        <div class="focus-radio-group">
          ${[
            ['boulder', 'Boulder', 'Max strength, power, limit bouldering'],
            ['sport',   'Sport',   'Power-endurance, route mileage'],
            ['hybrid',  'Hybrid',  'Balanced — alternates weekly'],
          ].map(([val, lbl, desc]) => `
          <label class="focus-option">
            <input type="radio" name="pf-focus" value="${val}" ${focusVal === val ? 'checked' : ''}>
            <span class="focus-option-text">
              <span class="focus-option-label">${lbl}</span>
              <span class="focus-option-desc">${desc}</span>
            </span>
          </label>`).join('')}
        </div>
      </div>
      <div class="field">
        <label>Color</label>
        <div id="pf-colors" class="color-swatches">${swatches}</div>
      </div>
      <div class="field">
        <label for="pf-cycleWeeks">Cycle length (weeks)</label>
        <input type="number" id="pf-cycleWeeks" min="${Program.MIN_CYCLE_WEEKS}" max="${Program.MAX_CYCLE_WEEKS}" step="1" value="${cycleWeeksVal}">
        <div class="muted" id="pf-cycle-hint" style="font-size:.8rem;margin-top:4px"></div>
      </div>
      <div class="field">
        <label for="pf-peakType">Peaking for</label>
        <select id="pf-peakType">
          <option value="comp" ${(settings.peakType || 'comp') === 'comp' ? 'selected' : ''}>Comp — 1-wk taper + rest day before</option>
          <option value="trip" ${settings.peakType === 'trip' ? 'selected' : ''}>Trip — 2-wk taper</option>
          <option value="project" ${settings.peakType === 'project' ? 'selected' : ''}>Project — 2-wk rolling taper</option>
        </select>
      </div>
      <div class="field">
        <label>Cycle anchor</label>
        <div class="radio-group" style="margin-bottom:8px">
          <label><input type="radio" name="pf-anchor" value="startDate" ${anchorMode === 'startDate' ? 'checked' : ''}> Start on a date</label>
          <label><input type="radio" name="pf-anchor" value="compDate" ${anchorMode === 'compDate' ? 'checked' : ''}> Peak on a comp date</label>
        </div>
        <div data-anchor-pane="startDate" style="${anchorMode === 'startDate' ? '' : 'display:none'}">
          <label>Cycle start date <span class="muted">(Monday recommended)</span></label>
          <div id="pf-startDate-picker" style="margin-top:8px"></div>
          <div class="muted" id="pf-start-hint" style="font-size:.8rem;margin-top:4px"></div>
        </div>
        <div data-anchor-pane="compDate" style="${anchorMode === 'compDate' ? '' : 'display:none'}">
          <label>Competition / send date <span class="muted">(cycle ends here)</span></label>
          <div id="pf-compDate-picker" style="margin-top:8px"></div>
          <div class="muted" id="pf-comp-hint" style="font-size:.8rem;margin-top:4px"></div>
        </div>
      </div>
      <div class="row" style="margin-top:12px">
        <button class="primary" id="pf-save">Save changes</button>
        <button class="ghost" id="pf-cancel">Cancel</button>
      </div>
    </div>`;
  }

  // ── Settings rows ───────────────────────────────────────────────────────
  function settingsCardHtml() {
    const { settings } = Storage.get();
    const user = Sync.user();
    return `<div class="card" style="padding-top:2px;padding-bottom:2px">
      <div class="setting-row">
        <div><div class="s-name">Units</div><div class="s-sub">Weights shown in</div></div>
        <select id="setUnits" style="width:auto">
          <option value="kg" ${settings.units==='kg'?'selected':''}>kg</option>
          <option value="lb" ${settings.units==='lb'?'selected':''}>lb</option>
        </select>
      </div>
      <div class="setting-row">
        <div><div class="s-name">Sync</div><div class="s-sub" id="signedAs">${user?.email || 'Not signed in'}</div></div>
        <div class="setting-actions">
          ${user
            ? '<button class="mini-btn ghost-mini" id="signOutBtn">Sign out</button>'
            : '<button class="mini-btn" id="signInBtn2">Sign in</button>'}
          <button class="mini-btn ghost-mini" id="toggleLocal">${settings.localOnly ? 'Enable sync' : 'Local only'}</button>
        </div>
      </div>
      <div class="setting-row">
        <div><div class="s-name">Data</div><div class="s-sub">Backup &amp; restore as JSON</div></div>
        <div class="setting-actions">
          <button class="mini-btn ghost-mini" id="exportBtn">Export</button>
          <button class="mini-btn ghost-mini" id="importBtn">Import</button>
        </div>
      </div>
      <div class="setting-row" id="ioRow" style="display:none;flex-direction:column;align-items:stretch">
        <textarea id="ioArea" placeholder="Paste JSON here to import"></textarea>
        <button class="mini-btn" id="importConfirmBtn" style="margin-top:8px;align-self:flex-end">Import this backup</button>
      </div>
      <div class="setting-row">
        <div><div class="s-name" style="color:var(--bad)">Reset all data</div><div class="s-sub">Cannot be undone</div></div>
        <button class="mini-btn ghost-mini" style="color:var(--bad)" id="resetBtn">Reset</button>
      </div>
    </div>`;
  }

  function headHtml() {
    const user = Sync.user();
    const email = user?.email || '';
    const name = email ? email.split('@')[0] : 'Local athlete';
    const initials = (name.slice(0, 2) || 'CL').toUpperCase();
    const syncTxt = document.getElementById('syncStatus')?.textContent || '—';
    return `<div class="profile-head">
      <div class="avatar">${initials}</div>
      <div style="flex:1;min-width:0">
        <div class="p-name">${escHtml(name)}</div>
        <div class="p-sub">${escHtml(syncTxt)}</div>
      </div>
    </div>`;
  }

  // ── Date picker (shared with edit form) ─────────────────────────────────
  function currentCycleWeeks() {
    const el = document.getElementById('pf-cycleWeeks');
    if (el && el.value !== '') return Program.clampCycleWeeks(parseInt(el.value, 10));
    return Program.DEFAULT_CYCLE_WEEKS;
  }

  function renderDatePicker(containerId, opts) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const monthKey    = opts.mode === 'startDate' ? 'startMonth' : 'compMonth';
    const dateKey     = opts.mode === 'startDate' ? 'startDate'  : 'compDate';
    const monthISO    = pickerState[monthKey] || isoFirstOfMonth(null);
    const selectedISO = pickerState[dateKey];

    const year      = parseInt(monthISO.slice(0, 4), 10);
    const month     = parseInt(monthISO.slice(5, 7), 10); // 1-based
    const monthName = new Date(year, month - 1, 1).toLocaleString('default', { month: 'long' });
    const todayISO  = toLocalISO(new Date());

    const weeks = currentCycleWeeks();
    const span  = Program.cycleDays(weeks) - 1;

    let bandStart = null, bandEnd = null;
    if (selectedISO) {
      if (opts.mode === 'startDate') {
        bandStart = selectedISO;
        bandEnd   = addDays(selectedISO, span);
      } else {
        bandStart = Program.computeStartFromComp(selectedISO, weeks);
        bandEnd   = selectedISO;
      }
    }

    const offset = mondayDow(new Date(year, month - 1, 1));
    const cursor = new Date(year, month - 1, 1 - offset);

    const headerHtml = ['Mo','Tu','We','Th','Fr','Sa','Su'].map(h => `<div>${h}</div>`).join('');
    let cells = '';
    for (let i = 0; i < 42; i++) {
      const iso = toLocalISO(cursor);
      const isCurrentMonth = cursor.getMonth() === month - 1;
      const isSelected = iso === selectedISO;
      const isToday    = iso === todayISO;
      const inBand     = !isSelected && bandStart && bandEnd && iso >= bandStart && iso <= bandEnd;

      let cls = 'dp-cell';
      if (isSelected)      cls += ' dp-selected';
      else if (inBand)     cls += ' dp-in-band';
      if (isToday)         cls += ' dp-today';
      if (!isCurrentMonth) cls += ' dp-other-month';

      cells += `<button type="button" class="${cls}" data-date="${iso}">${cursor.getDate()}</button>`;
      cursor.setDate(cursor.getDate() + 1);
    }

    container.innerHTML = `
      <div class="dp-nav">
        <button data-dp-nav="-1">‹</button>
        <span>${monthName} ${year}</span>
        <button data-dp-nav="1">›</button>
      </div>
      <div class="dp-header">${headerHtml}</div>
      <div class="dp-grid">${cells}</div>`;

    container.querySelectorAll('[data-dp-nav]').forEach(btn => {
      btn.addEventListener('click', () => {
        const delta = parseInt(btn.dataset.dpNav, 10);
        const [y, m] = (pickerState[monthKey] || isoFirstOfMonth(null)).split('-').map(Number);
        let nm = m + delta, ny = y;
        if (nm > 12) { nm = 1; ny++; }
        if (nm < 1)  { nm = 12; ny--; }
        pickerState[monthKey] = `${ny}-${String(nm).padStart(2, '0')}-01`;
        renderDatePicker(containerId, opts);
      });
    });

    container.querySelectorAll('.dp-cell').forEach(cell => {
      cell.addEventListener('click', () => {
        pickerState[dateKey] = cell.dataset.date;
        renderDatePicker(containerId, opts);
        opts.onPick(cell.dataset.date);
      });
    });
  }

  function refreshHints() {
    const startHint = document.getElementById('pf-start-hint');
    const compHint  = document.getElementById('pf-comp-hint');
    const cycleHint = document.getElementById('pf-cycle-hint');
    const weeks = currentCycleWeeks();
    const span  = Program.cycleDays(weeks) - 1;
    const pattern = Program.buildPhasePattern(weeks, document.getElementById('pf-peakType')?.value);
    const phaseCounts = { base: 0, build: 0, peak: 0, taper: 0 };
    pattern.forEach(p => { phaseCounts[p.phase]++; });
    const isDouble = weeks > 20;

    if (cycleHint) {
      const parts = [`Base ${phaseCounts.base}wk · Build ${phaseCounts.build}wk · Peak ${phaseCounts.peak}wk · Taper ${phaseCounts.taper}wk`];
      if (isDouble) parts.push('double-block (Base→Build × 2 → Peak → Taper)');
      cycleHint.textContent = parts.join(' · ');
    }
    if (startHint) {
      const v = pickerState.startDate;
      startHint.textContent = v ? `Cycle: ${v} → ${addDays(v, span)} (${weeks} wk)` : '';
    }
    if (compHint) {
      const v = pickerState.compDate;
      if (v) {
        const start = Program.computeStartFromComp(v, weeks);
        const today = new Date(); today.setHours(0, 0, 0, 0);
        const diff  = Math.round((new Date(start + 'T00:00:00') - today) / 86400000);
        const warn  = diff < 0
          ? ` ⚠ cycle started ${-diff} day${diff === -1 ? '' : 's'} ago — early weeks already passed.` : '';
        compHint.textContent = `Cycle: ${start} → ${v} (${weeks} wk).${warn}`;
      } else {
        compHint.textContent = '';
      }
    }
  }

  function readForm() {
    const anchorMode = document.querySelector('input[name="pf-anchor"]:checked')?.value || 'startDate';
    return {
      name:       document.getElementById('pf-name')?.value.trim() || '',
      focus:      document.querySelector('input[name="pf-focus"]:checked')?.value || 'hybrid',
      color:      document.querySelector('.color-swatch.swatch-sel')?.dataset.color || COLORS[0],
      cycleWeeks: currentCycleWeeks(),
      peakType: document.getElementById('pf-peakType')?.value || 'comp',
      anchorMode,
      startDate:  (anchorMode === 'startDate') ? (pickerState.startDate || null) : null,
      compDate:   (anchorMode === 'compDate')  ? (pickerState.compDate  || null) : null,
    };
  }

  function saveForm() {
    const { name, focus, color, cycleWeeks, peakType, anchorMode, startDate, compDate } = readForm();
    if (!name) { flash('Please enter a plan name.'); return; }
    if (formState.mode === 'edit' && formState.editId) {
      Storage.updatePlan(formState.editId, { name, focus, color });
      Storage.setPlanSettings(formState.editId, { anchorMode, startDate, compDate, cycleWeeks, peakType });
      flash('Plan updated.');
    }
    formState = { mode: null, editId: null };
    render();
  }

  function handleAction(action, pid) {
    switch (action) {
      case 'set-active':
        Storage.setActivePlan(pid);
        flash('Active plan changed.');
        render();
        break;
      case 'edit': {
        formState = { mode: 'edit', editId: pid };
        const ep = Storage.getPlan(pid);
        const sDate = ep?.settings?.startDate || null;
        const cDate = ep?.settings?.compDate  || null;
        pickerState = {
          startDate:  sDate,
          compDate:   cDate,
          startMonth: isoFirstOfMonth(sDate),
          compMonth:  isoFirstOfMonth(cDate),
        };
        render();
        document.getElementById('pf-card')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        break;
      }
      case 'duplicate': {
        const src = Storage.getPlan(pid);
        Storage.duplicatePlan(pid, (src?.name || 'Plan') + ' (copy)');
        flash('Plan duplicated.');
        render();
        break;
      }
      case 'archive':
        Storage.archivePlan(pid);
        flash('Plan archived.');
        render();
        break;
      case 'unarchive':
        Storage.updatePlan(pid, { archived: false });
        flash('Plan unarchived.');
        render();
        break;
      case 'delete':
        if (confirm('Delete this plan? This cannot be undone.')) {
          try {
            Storage.deletePlan(pid);
            flash('Plan deleted.');
          } catch (e) {
            flash(e.message);
          }
          render();
        }
        break;
    }
  }

  // ── Wiring ──────────────────────────────────────────────────────────────
  function wire() {
    // Benchmarks
    document.querySelector('[data-bench-toggle]')?.addEventListener('click', () => {
      if (benchEditing) {
        // Commit
        Storage.setGlobalBenchmarks({
          bodyweight:  benchDraft.bodyweight ?? null,
          maxHang20mm: benchDraft.maxHang20mm ?? null,
          pullup1RM:   benchDraft.pullup1RM ?? null,
        });
        flash('Benchmarks saved');
        benchEditing = false;
      } else {
        benchEditing = true;
      }
      render();
    });
    root.querySelectorAll('[data-bench-step]').forEach(btn => {
      btn.addEventListener('click', () => {
        const field = btn.dataset.benchField;
        const amount = parseFloat(btn.dataset.stepAmount);
        const dir = btn.dataset.benchStep === '+' ? 1 : -1;
        const min = btn.dataset.min != null ? parseFloat(btn.dataset.min) : -Infinity;
        const next = Math.max(min, (Number(benchDraft[field]) || 0) + dir * amount);
        benchDraft[field] = next;
        const inp = root.querySelector(`[data-bench-input="${field}"]`);
        if (inp) inp.value = next;
      });
    });
    root.querySelectorAll('[data-bench-input]').forEach(inp => {
      inp.addEventListener('change', () => {
        const v = inp.value === '' ? null : parseFloat(inp.value);
        benchDraft[inp.dataset.benchInput] = Number.isFinite(v) ? v : null;
      });
    });

    // Plans
    document.getElementById('new-plan-btn')?.addEventListener('click', () => {
      openOnboarding({ onDone: () => render() });
    });
    root.querySelectorAll('[data-action]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        handleAction(btn.dataset.action, btn.dataset.pid);
      });
    });

    const pfCard = document.getElementById('pf-card');
    if (pfCard) {
      pfCard.querySelectorAll('.color-swatch').forEach(swatch => {
        swatch.addEventListener('click', () => {
          pfCard.querySelectorAll('.color-swatch').forEach(s => {
            s.classList.remove('swatch-sel');
            s.style.border = '2px solid transparent';
          });
          swatch.classList.add('swatch-sel');
          swatch.style.border = '3px solid #fff';
        });
      });
      pfCard.querySelectorAll('input[name="pf-anchor"]').forEach(r => {
        r.addEventListener('change', () => {
          const mode = r.value;
          pfCard.querySelectorAll('[data-anchor-pane]').forEach(p => {
            p.style.display = p.dataset.anchorPane === mode ? '' : 'none';
          });
          refreshHints();
        });
      });
      document.getElementById('pf-peakType')?.addEventListener('change', refreshHints);
      const cwInput = document.getElementById('pf-cycleWeeks');
      if (cwInput) {
        cwInput.addEventListener('input', () => {
          renderDatePicker('pf-startDate-picker', { mode: 'startDate', onPick() { refreshHints(); } });
          renderDatePicker('pf-compDate-picker',  { mode: 'compDate',  onPick() { refreshHints(); } });
          refreshHints();
        });
      }
      renderDatePicker('pf-startDate-picker', { mode: 'startDate', onPick() { refreshHints(); } });
      renderDatePicker('pf-compDate-picker',  { mode: 'compDate',  onPick() { refreshHints(); } });
      refreshHints();
      document.getElementById('pf-save')?.addEventListener('click', saveForm);
      document.getElementById('pf-cancel')?.addEventListener('click', () => {
        formState = { mode: null, editId: null };
        render();
      });
    }

    // Settings
    document.getElementById('setUnits')?.addEventListener('change', e => {
      Storage.setSettings({ units: e.target.value });
      flash('Saved');
    });
    document.getElementById('signInBtn2')?.addEventListener('click', async () => {
      try { await Sync.signIn(); render(); }
      catch (e) { flash('Sign-in failed: ' + e.message); }
    });
    document.getElementById('signOutBtn')?.addEventListener('click', async () => {
      await Sync.signOut(); render();
    });
    document.getElementById('toggleLocal')?.addEventListener('click', () => {
      Sync.setLocalOnly(!Storage.get().settings.localOnly);
      render();
    });
    document.getElementById('exportBtn')?.addEventListener('click', () => {
      const row = document.getElementById('ioRow');
      row.style.display = '';
      document.getElementById('ioArea').value = Storage.exportJson();
    });
    document.getElementById('importBtn')?.addEventListener('click', () => {
      const row = document.getElementById('ioRow');
      row.style.display = '';
      document.getElementById('ioArea').focus();
    });
    document.getElementById('importConfirmBtn')?.addEventListener('click', () => {
      const json = document.getElementById('ioArea').value.trim();
      if (!json) { flash('Paste JSON into the text area first.'); return; }
      let parsed;
      try { parsed = JSON.parse(json); } catch (e) { flash('Cannot parse: not valid JSON.'); return; }
      if (typeof parsed !== 'object' || Array.isArray(parsed) || !parsed.plans) {
        flash('Not a valid backup — expected an object with a "plans" key.'); return;
      }
      // S3: import REPLACES all local data wholesale; when signed in it also overwrites the
      // synced copy on the next upload. Make that destructive intent explicit before proceeding.
      if (!confirm('Import will REPLACE all current plans and data with this backup. '
        + 'If you are signed in, it will also overwrite your synced copy. Continue?')) return;
      try { Storage.importJson(json); flash('Imported.'); render(); }
      catch (e) { flash('Import failed: ' + e.message); }
    });
    document.getElementById('resetBtn')?.addEventListener('click', () => {
      if (confirm('Reset all local data? This cannot be undone.')) { Storage.reset(); render(); }
    });
  }

  function render() {
    if (!benchEditing || !benchDraft) {
      const bm = Storage.get().benchmarks;
      benchDraft = { bodyweight: bm.bodyweight, maxHang20mm: bm.maxHang20mm, pullup1RM: bm.pullup1RM };
    }
    let html = headHtml() + benchmarksCardHtml() + limiterCardHtml() + plansCardHtml() + settingsCardHtml();
    root.innerHTML = html;
    if (formState.mode === 'edit' && formState.editId) {
      const ep = Storage.getPlan(formState.editId);
      const slot = document.getElementById('plan-edit-slot');
      if (ep && slot) slot.innerHTML = editFormHtml(ep);
    }
    wire();
  }

  render();
}
