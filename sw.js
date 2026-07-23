// sw.js — cache-first for the app shell so inspections work with no signal.
const CACHE = 'tsr-v2';

const SHELL = [
  './', './index.html', './styles.css', './manifest.webmanifest',
  './src/app/main.mjs', './src/app/ui.mjs', './src/app/state.mjs',
  './src/app/storage.mjs', './src/app/memory-store.mjs', './src/app/settings.mjs',
  './src/app/share.mjs', './src/app/photos.mjs',
  './src/app/screens/picker.mjs', './src/app/screens/header.mjs',
  './src/app/screens/checklist.mjs', './src/app/screens/review.mjs',
  './src/lib/marks.mjs', './src/lib/naming.mjs', './src/lib/dates.mjs',
  './src/lib/stamp.mjs', './src/lib/draw-glyphs.mjs',
  './vendor/pdf-lib.mjs',
  './fields/s2000-susie.json', './templates/s2000-susie.pdf',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys()
    .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request).then((hit) => hit ?? fetch(e.request).then((res) => {
      // Cache successful same-origin responses so later pages work offline too.
      if (res.ok && new URL(e.request.url).origin === location.origin) {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(e.request, copy));
      }
      return res;
    }).catch(() => caches.match('./index.html'))),
  );
});
