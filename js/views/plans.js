import { Storage } from '../storage.js';
import { Program } from '../program.js';

const COLORS = ['#4f8cff', '#f43f5e', '#22c55e', '#f59e0b', '#a78bfa', '#fb923c'];

function addDays(iso, n) {
  const d = new Date(iso + 'T00:00:00');
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

function planDateRange(plan) {
  const start = Program.effectiveStart(plan.settings);
  if (!start) return 'No dates set';
  const end = plan.settings.compDate || addDays(start, 83);
  return `${start} → ${end}`;
}

function flash(msg) {
  const el = document.createElement('div');
  el.textContent = msg;
  el.style.cssText = 'position:fixed;bottom:20px;left:50%;transform:translateX(-50%);background:var(--accent);color:#001;padding:10px 18px;border-radius:8px;z-index:50;font-weight:600;box-shadow:0 4px 12px #0008';
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 1800);
}

function escHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
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
  // formState persists across re-renders within this view mount
  let formState = { mode: null, editId: null };

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
      const bm = p.benchmarks || {};
      const focusVal = p.focus || 'hybrid';
      const colorVal = p.color || '#4f8cff';
      const anchorMode = settings.anchorMode || 'startDate';
      const hasHangBm = existingPlan &&
        (existingPlan.benchmarks?.maxHang20mm != null || existingPlan.benchmarks?.pullup1RM != null);

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
            <div class="field" style="margin-bottom:4px">
              <label>Cycle start date <span class="muted">(Monday recommended)</span></label>
              <input type="date" id="pf-startDate" value="${settings.startDate || ''}">
            </div>
            <div class="muted" style="font-size:.78rem;margin-top:2px" id="pf-start-hint"></div>
          </div>
          <div data-anchor-pane="compDate" style="${anchorMode === 'compDate' ? '' : 'display:none'}">
            <div class="field" style="margin-bottom:4px">
              <label>Competition / send date <span class="muted">(cycle ends here)</span></label>
              <input type="date" id="pf-compDate" value="${settings.compDate || ''}">
            </div>
            <div class="muted" style="font-size:.78rem;margin-top:2px" id="pf-comp-hint"></div>
          </div>
        </div>

        <details>
          <summary>Benchmarks <span class="count">(optional)</span></summary>
          <div style="padding-top:8px">
            <div class="field">
              <label>Bodyweight (kg)</label>
              <input type="number" id="pf-bodyweight" step="0.5" inputmode="decimal" value="${bm.bodyweight ?? ''}">
            </div>
            <div class="field">
              <label>Max 10s hang on 20mm edge — added kg</label>
              <input type="number" id="pf-maxHang20mm" step="0.5" inputmode="decimal" value="${bm.maxHang20mm ?? ''}">
            </div>
            <div class="field">
              <label>1RM weighted pull-up — added kg</label>
              <input type="number" id="pf-pullup1RM" step="0.5" inputmode="decimal" value="${bm.pullup1RM ?? ''}">
            </div>
            <div class="field">
              <label>Sport redpoint grade</label>
              <input type="text" id="pf-sportGrade" value="${escHtml(bm.sportGrade ?? '')}" placeholder="e.g. 5.12a or 7a+">
            </div>
            <div class="field">
              <label>Max boulder grade</label>
              <input type="text" id="pf-boulderGrade" value="${escHtml(bm.boulderGrade ?? '')}" placeholder="e.g. V6">
            </div>
            <div class="field">
              <label>Dominant style</label>
              <select id="pf-dominantStyle">
                ${['crimp','pinch','sloper','pocket'].map(o =>
                  `<option ${(bm.dominantStyle || 'crimp') === o ? 'selected' : ''}>${o}</option>`
                ).join('')}
              </select>
            </div>
            <div class="field">
              <label>Dominant angle</label>
              <select id="pf-dominantAngle">
                ${['slab','vert','slight-overhang','steep','roof'].map(o =>
                  `<option ${(bm.dominantAngle || 'slight-overhang') === o ? 'selected' : ''}>${o}</option>`
                ).join('')}
              </select>
            </div>
            ${hasHangBm ? `<div class="field">
              <label style="display:flex;align-items:center;gap:6px;cursor:pointer;color:var(--text)">
                <input type="checkbox" id="pf-archive" style="width:auto;accent-color:var(--accent)">
                Archive previous benchmarks and set new
              </label>
            </div>` : ''}
          </div>
        </details>

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

  function wireListeners() {
    document.getElementById('new-plan-btn')?.addEventListener('click', () => {
      formState = { mode: 'add', editId: null };
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

    document.getElementById('pf-startDate')?.addEventListener('change', refreshHints);
    document.getElementById('pf-compDate')?.addEventListener('change', refreshHints);
    refreshHints();

    document.getElementById('pf-save')?.addEventListener('click', saveForm);
    document.getElementById('pf-cancel')?.addEventListener('click', () => {
      formState = { mode: null, editId: null };
      render();
    });
  }

  function refreshHints() {
    const mode = document.querySelector('input[name="pf-anchor"]:checked')?.value || 'startDate';
    const startHint = document.getElementById('pf-start-hint');
    const compHint  = document.getElementById('pf-comp-hint');

    if (startHint) {
      const v = document.getElementById('pf-startDate')?.value;
      startHint.textContent = v ? `Cycle: ${v} → ${addDays(v, 83)}` : '';
    }
    if (compHint) {
      const v = document.getElementById('pf-compDate')?.value;
      if (v) {
        const start = Program.computeStartFromComp(v);
        const today = new Date(); today.setHours(0, 0, 0, 0);
        const diff  = Math.round((new Date(start + 'T00:00:00') - today) / 86400000);
        const warn  = diff < 0
          ? ` ⚠ cycle started ${-diff} day${diff === -1 ? '' : 's'} ago — early weeks already passed.` : '';
        compHint.textContent = `Cycle: ${start} → ${v}.${warn}`;
      } else {
        compHint.textContent = '';
      }
    }
  }

  function readForm() {
    return {
      name:          document.getElementById('pf-name')?.value.trim() || '',
      focus:         document.querySelector('input[name="pf-focus"]:checked')?.value || 'hybrid',
      color:         document.querySelector('.color-swatch.swatch-sel')?.dataset.color || '#4f8cff',
      anchorMode:    document.querySelector('input[name="pf-anchor"]:checked')?.value || 'startDate',
      startDate:     (document.querySelector('input[name="pf-anchor"]:checked')?.value === 'startDate')
                       ? (document.getElementById('pf-startDate')?.value || null) : null,
      compDate:      (document.querySelector('input[name="pf-anchor"]:checked')?.value === 'compDate')
                       ? (document.getElementById('pf-compDate')?.value || null) : null,
      archiveChecked: document.getElementById('pf-archive')?.checked || false,
      benchmarks: {
        bodyweight:     numOrNull('pf-bodyweight'),
        maxHang20mm:    numOrNull('pf-maxHang20mm'),
        pullup1RM:      numOrNull('pf-pullup1RM'),
        sportGrade:     strOrNull('pf-sportGrade'),
        boulderGrade:   strOrNull('pf-boulderGrade'),
        dominantStyle:  document.getElementById('pf-dominantStyle')?.value  || 'crimp',
        dominantAngle:  document.getElementById('pf-dominantAngle')?.value  || 'slight-overhang',
      },
    };
  }

  function saveForm() {
    const { name, focus, color, anchorMode, startDate, compDate, archiveChecked, benchmarks } = readForm();
    if (!name) { flash('Please enter a plan name.'); return; }

    if (formState.mode === 'add') {
      const newId = Storage.addPlan({ name, focus, color });
      Storage.setPlanSettings(newId, { anchorMode, startDate, compDate });
      Storage.setPlanBenchmarks(newId, benchmarks);
      flash('Plan created.');
    } else if (formState.mode === 'edit' && formState.editId) {
      Storage.updatePlan(formState.editId, { name, focus, color });
      Storage.setPlanSettings(formState.editId, { anchorMode, startDate, compDate });
      Storage.setPlanBenchmarks(formState.editId, benchmarks, { archive: archiveChecked });
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
      case 'edit':
        formState = { mode: 'edit', editId: pid };
        render();
        document.getElementById('pf-card')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        break;
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
