// Test harness for the in-browser smoke suite — registration, assertions,
// shared fixtures, and the runner. Case files live in tests/cases/*.js; each
// imports { test, … } from here and registers at module-eval time, and
// tests/index.html imports the case files (import order = display order)
// then calls runAll(). Still no framework, no CLI runner (see the `test`
// skill) — this file is the whole harness.
import { Storage } from '../js/storage.js';

export const tests = [];
export function test(name, fn) { tests.push({ name, fn }); }
export function assert(cond, msg) { if (!cond) throw new Error(msg || 'Assertion failed'); }
export function assertEq(actual, expected, msg) {
  const a = JSON.stringify(actual), b = JSON.stringify(expected);
  if (a !== b) throw new Error(`${msg || 'assertEq failed'}: expected ${b}, got ${a}`);
}

export function localIso(d) {
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

export function addIsoDays(iso, days) {
  const d = new Date(iso + 'T00:00:00');
  d.setDate(d.getDate() + days);
  return localIso(d);
}

export function resetStorage() {
  localStorage.clear();
  sessionStorage.clear();
  Storage.reset();
}

export async function runAll() {
  const results = document.getElementById('results');
  const summaryEl = document.getElementById('summary');
  results.innerHTML = '';
  summaryEl.className = 'summary';
  summaryEl.textContent = `Running ${tests.length} tests…`;
  let pass = 0, fail = 0;
  for (const t of tests) {
    const row = document.createElement('div');
    row.className = 'case';
    try {
      await t.fn();
      row.classList.add('pass');
      row.innerHTML = `<div class="name">✓ ${t.name}</div>`;
      pass++;
    } catch (e) {
      row.classList.add('fail');
      const msg = (e && (e.stack || e.message)) || String(e);
      row.innerHTML = `<div class="name">✗ ${t.name}</div><div class="err"></div>`;
      row.querySelector('.err').textContent = msg;
      fail++;
    }
    results.appendChild(row);
  }
  summaryEl.className = 'summary ' + (fail === 0 ? 'allpass' : 'anyfail');
  summaryEl.textContent = `${pass} passed, ${fail} failed (${tests.length} total)`;
}
