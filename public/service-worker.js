const IS_DEV = self.location.hostname === 'localhost' || self.location.hostname === '127.0.0.1';

const CACHE = 'healty-app-v1';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './logo-icon.png'
];

self.addEventListener('install', e => {
  if (IS_DEV) { self.skipWaiting(); return; }
  e.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  if (IS_DEV) {
    e.respondWith(fetch(e.request));
    return;
  }
  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request).catch(() => caches.match('./index.html')))
  );
});
