import { Storage } from '../storage.js';
import { Sync } from '../sync.js';
import { flash } from '../ui.js';

export function renderSettings(root) {
  const { settings } = Storage.get();

  const bm = Storage.get().benchmarks;  let body = `<div class="card"><h2>Benchmarks</h2>
    <p class="muted" style="font-size:.85rem">Used across all plans to prescribe loads. Changes save automatically.</p>
    <div class="field"><label>Bodyweight (kg)</label>
      <input type="number" id="bm-bodyweight" step="0.5" min="30" max="200" value="${bm.bodyweight ?? ''}">
    </div>
    <div class="field"><label>Max hang 20mm (added kg, BW not included)</label>
      <input type="number" id="bm-maxHang20mm" step="1" min="-30" max="200" value="${bm.maxHang20mm ?? ''}">
    </div>
    <div class="field"><label>Pull-up 1RM (added kg)</label>
      <input type="number" id="bm-pullup1RM" step="1" min="-30" max="200" value="${bm.pullup1RM ?? ''}">
    </div>
  </div>

  <div class="card"><h2>Preferences</h2>
    <div class="field"><label>Units</label>
      <select id="setUnits">
        <option value="kg" ${settings.units==='kg'?'selected':''}>kg</option>
        <option value="lb" ${settings.units==='lb'?'selected':''}>lb</option>
      </select></div>
  </div>

  <div class="card"><h2>Sync</h2>
    <p class="muted">Status: <span id="syncStat">—</span></p>
    <p class="muted">Signed in: <span id="signedAs">${Sync.user()?.email || '— not signed in —'}</span></p>
    <div class="row">
      <button class="primary" id="signInBtn2">Sign in with Google</button>
      <button class="ghost" id="signOutBtn">Sign out</button>
      <button class="ghost" id="toggleLocal">${settings.localOnly?'Enable sync':'Use locally only'}</button>
    </div>
  </div>

  <div class="card"><h2>Data</h2>
    <div class="row">
      <button class="ghost" id="exportBtn">Export JSON</button>
      <button class="ghost" id="importBtn">Import JSON</button>
      <button class="danger" id="resetBtn">Reset all data</button>
    </div>
    <textarea id="ioArea" placeholder="Paste JSON here to import" style="margin-top:10px"></textarea>
  </div>`;

  root.innerHTML = body;
  document.getElementById('syncStat').textContent = document.getElementById('syncStatus').textContent;

  function saveBenchmarks() {
    Storage.setGlobalBenchmarks({
      bodyweight:  parseFloat(document.getElementById('bm-bodyweight').value) || null,
      maxHang20mm: parseFloat(document.getElementById('bm-maxHang20mm').value) || null,
      pullup1RM:   parseFloat(document.getElementById('bm-pullup1RM').value) || null,
    });
    flash('Saved');
  }
  ['bm-bodyweight', 'bm-maxHang20mm', 'bm-pullup1RM'].forEach(id => {
    document.getElementById(id).addEventListener('change', saveBenchmarks);
  });
  document.getElementById('setUnits').addEventListener('change', e => {
    Storage.setSettings({ units: e.target.value });
    flash('Saved');
  });
  document.getElementById('signInBtn2').onclick = async () => {
    try { await Sync.signIn(); renderSettings(root); }
    catch(e){ flash('Sign-in failed: ' + e.message); }
  };
  document.getElementById('signOutBtn').onclick = async () => { await Sync.signOut(); renderSettings(root); };
  document.getElementById('toggleLocal').onclick = () => {
    Sync.setLocalOnly(!settings.localOnly);
    renderSettings(root);
  };
  document.getElementById('exportBtn').onclick = () => {
    document.getElementById('ioArea').value = Storage.exportJson();
  };
  document.getElementById('importBtn').onclick = () => {
    const json = document.getElementById('ioArea').value.trim();
    if (!json) { flash('Paste JSON into the text area first.'); return; }
    let parsed;
    try { parsed = JSON.parse(json); } catch(e) { flash('Cannot parse: not valid JSON.'); return; }
    if (typeof parsed !== 'object' || Array.isArray(parsed) || !parsed.plans) {
      flash('Not a valid backup — expected an object with a "plans" key.'); return;
    }
    // S3: import REPLACES all local data wholesale; when signed in it also overwrites the
    // synced copy on the next upload. Make that destructive intent explicit before proceeding.
    if (!confirm('Import will REPLACE all current plans and data with this backup. '
      + 'If you are signed in, it will also overwrite your synced copy. Continue?')) return;
    try { Storage.importJson(json); flash('Imported.'); }
    catch(e) { flash('Import failed: ' + e.message); }
  };
  document.getElementById('resetBtn').onclick = () => {
    if (confirm('Reset all local data? This cannot be undone.')) { Storage.reset(); renderSettings(root); }
  };
}

