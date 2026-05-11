// Service worker: cache-first shell, network-first for index.html, bypass Firestore/Auth.
const CACHE = 'climb-planner-v5';
const SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/styles.css',
  './js/app.js',
  './js/storage.js',
  './js/program.js',
  './js/loads.js',
  './js/warmup.js',
  './js/sync.js',
  './js/views/today.js',
  './js/views/week.js',
  './js/views/calendar.js',
  './js/views/benchmarks.js',
  './js/views/log.js',
  './js/views/settings.js',
  './js/views/plans.js',
  './firebase-config.js',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  // Bypass Firebase / Google APIs — SDK handles its own offline persistence
  if (/firestore\.googleapis\.com|identitytoolkit\.googleapis\.com|securetoken\.googleapis\.com|googleapis\.com\/identitytoolkit|gstatic\.com|googleapis\.com\/oauth2/.test(url.href)) {
    return; // default network handling
  }
  if (e.request.mode === 'navigate' || e.request.destination === 'document') {
    e.respondWith(
      fetch(e.request).then(r => { caches.open(CACHE).then(c => c.put(e.request, r.clone())); return r; })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }
  e.respondWith(caches.match(e.request).then(c => c || fetch(e.request)));
});
