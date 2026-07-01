const IS_DEV = self.location.hostname === 'localhost' || self.location.hostname === '127.0.0.1';

// __BUILD_TS__ is replaced at build time by the Vite plugin with a real timestamp.
// In dev (public/ served as-is) it stays as the literal string, which is fine because
// IS_DEV bypasses all caching anyway.
const CACHE = 'healty-app-__BUILD_TS__';

const ASSETS = [
  './manifest.json',
  './logo-icon.png',
];

self.addEventListener('install', e => {
  if (IS_DEV) { self.skipWaiting(); return; }
  e.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  // Delete every cache that isn't the current version
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  if (IS_DEV) {
    e.respondWith(fetch(e.request));
    return;
  }

  const { request } = e;

  // Navigation requests (HTML) → network-first so users always get the latest shell
  if (request.mode === 'navigate') {
    e.respondWith(
      fetch(request).catch(() => caches.match('./index.html'))
    );
    return;
  }

  // Static assets → cache-first
  e.respondWith(
    caches.match(request).then(cached => {
      if (cached) return cached;
      return fetch(request).then(response => {
        // Only cache same-origin successful responses
        if (!response || response.status !== 200 || response.type !== 'basic') return response;
        const clone = response.clone();
        caches.open(CACHE).then(cache => cache.put(request, clone));
        return response;
      });
    })
  );
});
