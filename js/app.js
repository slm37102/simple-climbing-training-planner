// Entry point: registers SW, wires nav, mounts views, gates on auth.
import { Storage } from './storage.js';
import { Program } from './program.js';
import { Loads } from './loads.js';
import { Warmup } from './warmup.js';
import { Sync } from './sync.js';
import { renderToday } from './views/today.js';
import { renderWeek } from './views/week.js';
import { renderCalendar } from './views/calendar.js';
import { renderBenchmarks } from './views/benchmarks.js';
import { renderLog } from './views/log.js';
import { renderSettings } from './views/settings.js';
import { renderPlans } from './views/plans.js';

const views = {
  today: renderToday,
  week: renderWeek,
  calendar: renderCalendar,
  cycle: renderCalendar,
  benchmarks: renderBenchmarks,
  log: renderLog,
  settings: renderSettings,
  plans: renderPlans,
};

const ctx = { Storage, Program, Loads, Warmup, Sync };

function navigate(name) {
  document.querySelectorAll('#tabs .tab').forEach(b => b.classList.toggle('active', b.dataset.view === name));
  const root = document.getElementById('view');
  root.innerHTML = '';
  (views[name] || renderToday)(root, ctx);
  location.hash = '#' + name;
}

function init() {
  Storage.init();
  document.querySelectorAll('#tabs .tab').forEach(b =>
    b.addEventListener('click', () => navigate(b.dataset.view))
  );
  window.addEventListener('hashchange', () => navigate((location.hash || '#today').slice(1)));

  // Auth gate: show if first run and sync available
  Sync.init({
    onStatus: s => {
      const el = document.getElementById('syncStatus');
      if (el) el.textContent = s;
    },
    onRemoteUpdate: () => {
      const currentView = (location.hash || '#today').slice(1);
      // Don't wipe the Plans form while user might be actively editing
      if (currentView !== 'plans') navigate(currentView);
    }
  }).then(({ needsAuthGate }) => {
    if (needsAuthGate) showAuthGate();
    else navigate((location.hash || '#today').slice(1));
  });

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(console.warn);
    // P3: reload the page when a new SW takes control so users get the fresh shell immediately.
    navigator.serviceWorker.addEventListener('controllerchange', () => location.reload());
  }
}

function showAuthGate() {
  const gate = document.getElementById('authGate');
  gate.classList.remove('hidden');
  document.getElementById('signInBtn').onclick = async () => {
    try {
      await Sync.signIn();
      gate.classList.add('hidden');
      navigate('today');
    } catch (e) {
      // User closing the popup is not an error worth alerting
      if (e.code !== 'auth/popup-closed-by-user' && e.code !== 'auth/cancelled-popup-request') {
        alert('Sign-in failed: ' + e.message);
      }
    }
  };
  document.getElementById('localOnlyBtn').onclick = () => {
    Sync.setLocalOnly(true);
    gate.classList.add('hidden');
    navigate('today');
  };
}

init();
