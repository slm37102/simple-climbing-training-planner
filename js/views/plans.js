import { Storage } from '../storage.js';
import { Program } from '../program.js';
import { flash, escHtml } from '../ui.js';

const COLORS = ['#4f8cff', '#f43f5e', '#22c55e', '#f59e0b', '#a78bfa', '#fb923c'];

function toLocalISO(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function addDays(iso, n) {
  const d = new Date(iso + 'T00:00:00');
  d.setDate(d.getDate() + n);
  return toLocalISO(d);
}

function planDateRange(plan) {
  const start = Program.effectiveStart(plan.settings);
  if (!start) return 'No dates set';
  const weeks = Program.cycleWeeksOf(plan.settings);
  const end = plan.settings.compDate || addDays(start, Program.cycleDays(weeks) - 1);
  return `${start} → ${end} · ${weeks}wk`;
}


function numOrNull(id) {
  const el = document.getElementById(id);
  if (!el || el.value === '') return null;
  return parseFloat(el.value);
}

function strOrNull(id) {
  const el = document.getElementById(id);
  if (!el) return null;
  return el.value.trim() || null;
}

export function renderPlans(root) {
  let formState = { mode: null, editId: null };
  let pickerState = { startDate: null, compDate: null, startMonth: null, compMonth: null };

  function isoFirstOfMonth(isoOrNull) {
    const base = isoOrNull || toLocalISO(new Date());
    return base.slice(0, 7) + '-01';
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

    // Grid starts on Monday
    const dow    = new Date(year, month - 1, 1).getDay(); // 0=Sun … 6=Sat
    const offset = (dow === 0) ? 6 : dow - 1;
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

      cells += `<div class="${cls}" data-date="${iso}">${cursor.getDate()}</div>`;
      cursor.setDate(cursor.getDate() + 1);
    }

    container.innerHTML = `
      <div class="dp-nav">
        <button data-dp-nav="-1">◀</button>
        <span>${monthName} ${year}</span>
        <button data-dp-nav="1">▶</button>
      </div>
      <div class="dp-header">${headerHtml}</div>
      <div class="dp-grid">${cells}</div>`;

    container.querySelectorAll('[data-dp-nav]').forEach(btn => {
      btn.addEventListener('click', () => {
        const delta = parseInt(btn.dataset.dpNav, 10);
        const [y, m] = pickerState[monthKey].split('-').map(Number);
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

  function render() {
    const plans = Storage.listPlans();
    const activePlanId = Storage.getActivePlan()?.id;
    const canDelete = plans.length > 1;

    const sorted = [
      ...plans.filter(p => !p.archived),
      ...plans.filter(p => p.archived),
    ];

    function planCardHtml(plan) {
      const isActive = plan.id === activePlanId;
      const daysLogged = Object.keys(plan.days || {}).length;
      const activeBadge = isActive
        ? `<span class="badge" style="background:var(--good);color:#001">✓ Active</span> ` : '';
      const archivedBadge = plan.archived
        ? `<span class="badge" style="color:var(--muted)">archived</span> ` : '';

      return `<div class="card" style="border-left:3px solid ${plan.color}">
        <div class="row" style="margin-bottom:4px">
          <span style="width:10px;height:10px;border-radius:50%;background:${plan.color};flex-shrink:0;display:inline-block"></span>
          <strong style="flex:1;font-size:1rem">${escHtml(plan.name)}</strong>
          ${activeBadge}${archivedBadge}<span class="badge focus-${plan.focus}">${plan.focus}</span>
        </div>
        <div class="muted" style="margin-bottom:8px">${planDateRange(plan)} · ${daysLogged} day${daysLogged !== 1 ? 's' : ''} logged</div>
        <div class="row">
          ${!isActive ? `<button class="ghost" style="font-size:.8rem;padding:6px 10px" data-action="set-active" data-pid="${plan.id}">Set active</button>` : ''}
          <button class="ghost" style="font-size:.8rem;padding:6px 10px" data-action="edit" data-pid="${plan.id}">Edit</button>
          <button class="ghost" style="font-size:.8rem;padding:6px 10px" data-action="duplicate" data-pid="${plan.id}">Duplicate</button>
          ${plan.archived
            ? `<button class="ghost" style="font-size:.8rem;padding:6px 10px" data-action="unarchive" data-pid="${plan.id}">Unarchive</button>`
            : `<button class="ghost" style="font-size:.8rem;padding:6px 10px" data-action="archive" data-pid="${plan.id}">Archive</button>`}
          ${canDelete ? `<button class="danger" style="font-size:.8rem;padding:6px 10px" data-action="delete" data-pid="${plan.id}">Delete</button>` : ''}
        </div>
      </div>`;
    }

    function formHtml(existingPlan) {
      const p = existingPlan || {};
      const settings = p.settings || {};
      const focusVal = p.focus || 'hybrid';
      const colorVal = p.color || '#4f8cff';
      const anchorMode = settings.anchorMode || 'startDate';
      const cycleWeeksVal = Program.cycleWeeksOf(settings);

      const swatches = COLORS.map(c =>
        `<button type="button" class="color-swatch${c === colorVal ? ' swatch-sel' : ''}" data-color="${c}"
          style="width:28px;height:28px;border-radius:50%;background:${c};border:${c === colorVal ? '3px solid #fff' : '2px solid transparent'};padding:0;cursor:pointer"></button>`
      ).join('');

      return `<div class="card" id="pf-card">
        <h2>${existingPlan ? 'Edit plan' : 'New plan'}</h2>

        <div class="field">
          <label>Plan name</label>
          <input type="text" id="pf-name" value="${escHtml(p.name || '')}" placeholder="e.g. Spring season 2025" autocomplete="off">
        </div>

        <div class="field">
          <label>Focus</label>
          <div style="display:flex;flex-direction:column;gap:6px;margin-top:4px">
            ${[
              ['boulder', 'Boulder', 'Max strength, power, limit bouldering'],
              ['sport',   'Sport',   'Power-endurance, route mileage'],
              ['hybrid',  'Hybrid',  'Balanced — alternates weekly'],
            ].map(([val, lbl, desc]) => `
            <label style="display:flex;align-items:flex-start;gap:8px;padding:8px 12px;background:#0b1220;border:1px solid ${focusVal === val ? 'var(--accent)' : '#ffffff20'};border-radius:8px;cursor:pointer;margin:0">
              <input type="radio" name="pf-focus" value="${val}" ${focusVal === val ? 'checked' : ''} style="margin-top:3px;accent-color:var(--accent);width:auto;flex-shrink:0">
              <span>
                <span style="font-weight:600;color:var(--text);font-size:.9rem">${lbl}</span>
                <span class="muted" style="display:block;font-size:.78rem;margin-top:1px">${desc}</span>
              </span>
            </label>`).join('')}
          </div>
        </div>

        <div class="field">
          <label>Color</label>
          <div id="pf-colors" style="display:flex;gap:6px;flex-wrap:wrap;margin-top:4px">${swatches}</div>
        </div>

        <div class="field">
          <label for="pf-cycleWeeks">Cycle length (weeks)</label>
          <input type="number" id="pf-cycleWeeks" min="${Program.MIN_CYCLE_WEEKS}" max="${Program.MAX_CYCLE_WEEKS}" step="1" value="${cycleWeeksVal}">
          <div class="muted" id="pf-cycle-hint" style="font-size:.8rem;margin-top:4px"></div>
        </div>

        <div class="field">
          <label>Cycle anchor</label>
          <div class="radio-group" style="margin-bottom:8px">
            <label>
              <input type="radio" name="pf-anchor" value="startDate" ${anchorMode === 'startDate' ? 'checked' : ''}> Start on a date
            </label>
            <label>
              <input type="radio" name="pf-anchor" value="compDate" ${anchorMode === 'compDate' ? 'checked' : ''}> Peak on a comp date
            </label>
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
          <button class="primary" id="pf-save">${existingPlan ? 'Save changes' : 'Create plan'}</button>
          <button class="ghost" id="pf-cancel">Cancel</button>
        </div>
      </div>`;
    }

    let html = sorted.map(planCardHtml).join('');

    html += `<div class="row" style="padding:4px 0">
      <button class="primary" id="new-plan-btn">+ New plan</button>
    </div>`;

    if (formState.mode === 'add') {
      html += formHtml(null);
    } else if (formState.mode === 'edit' && formState.editId) {
      const ep = Storage.getPlan(formState.editId);
      if (ep) html += formHtml(ep);
    }

    root.innerHTML = html;
    wireListeners();
  }

  function currentCycleWeeks() {
    const el = document.getElementById('pf-cycleWeeks');
    if (el && el.value !== '') return Program.clampCycleWeeks(parseInt(el.value, 10));
    return Program.DEFAULT_CYCLE_WEEKS;
  }

  function wireListeners() {
    document.getElementById('new-plan-btn')?.addEventListener('click', () => {
      formState = { mode: 'add', editId: null };
      pickerState = { startDate: null, compDate: null,
        startMonth: isoFirstOfMonth(null), compMonth: isoFirstOfMonth(null) };
      render();
      document.getElementById('pf-card')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });

    root.querySelectorAll('[data-action]').forEach(btn => {
      btn.addEventListener('click', () => handleAction(btn.dataset.action, btn.dataset.pid));
    });

    const pfCard = document.getElementById('pf-card');
    if (!pfCard) return;

    // Color swatch selection
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

    // Focus radio border highlight
    pfCard.querySelectorAll('input[name="pf-focus"]').forEach(r => {
      r.addEventListener('change', () => {
        pfCard.querySelectorAll('input[name="pf-focus"]').forEach(rb => {
          rb.closest('label').style.borderColor = rb.checked ? 'var(--accent)' : '#ffffff20';
        });
      });
    });

    // Anchor mode toggle
    pfCard.querySelectorAll('input[name="pf-anchor"]').forEach(r => {
      r.addEventListener('change', () => {
        const mode = r.value;
        pfCard.querySelectorAll('[data-anchor-pane]').forEach(p => {
          p.style.display = p.dataset.anchorPane === mode ? '' : 'none';
        });
        refreshHints();
      });
    });

    // Cycle length input → re-render pickers (band span changes) + refresh hints
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

  function refreshHints() {
    const startHint = document.getElementById('pf-start-hint');
    const compHint  = document.getElementById('pf-comp-hint');
    const cycleHint = document.getElementById('pf-cycle-hint');
    const weeks = currentCycleWeeks();
    const span  = Program.cycleDays(weeks) - 1;
    const pattern = Program.buildPhasePattern(weeks);
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
      color:      document.querySelector('.color-swatch.swatch-sel')?.dataset.color || '#4f8cff',
      cycleWeeks: currentCycleWeeks(),
      anchorMode,
      startDate:  (anchorMode === 'startDate') ? (pickerState.startDate || null) : null,
      compDate:   (anchorMode === 'compDate')  ? (pickerState.compDate  || null) : null,
    };
  }

  function saveForm() {
    const { name, focus, color, cycleWeeks, anchorMode, startDate, compDate } = readForm();
    if (!name) { flash('Please enter a plan name.'); return; }

    if (formState.mode === 'add') {
      const newId = Storage.addPlan({ name, focus, color });
      Storage.setPlanSettings(newId, { anchorMode, startDate, compDate, cycleWeeks });
      flash('Plan created.');
    } else if (formState.mode === 'edit' && formState.editId) {
      Storage.updatePlan(formState.editId, { name, focus, color });
      Storage.setPlanSettings(formState.editId, { anchorMode, startDate, compDate, cycleWeeks });
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

  render();
}
