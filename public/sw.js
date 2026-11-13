const CACHE_PREFIX = 'field-tracker-';
const CACHE = 'field-tracker-v2';
const ASSETS = ['/', '/index.html', '/styles.css', '/app.js', '/manifest.json'];

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await cache.addAll(ASSETS);
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const oldCaches = (await caches.keys()).filter(
      key => key.startsWith(CACHE_PREFIX) && key !== CACHE
    );
    await Promise.all(oldCaches.map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== self.location.origin || url.pathname.startsWith('/api/')) {
    return;
  }

  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const cached = await cache.match(event.request);
    if (cached) return cached;

    try {
      const response = await fetch(event.request);
      if (event.request.mode === 'navigate' && !response.ok) {
        const appShell = await cache.match('/');
        if (appShell) return appShell;
      }
      if (response.ok && response.type !== 'opaque') {
        await cache.put(event.request, response.clone());
      }
      return response;
    } catch (error) {
      if (event.request.mode === 'navigate') {
        const appShell = await cache.match('/');
        if (appShell) return appShell;
      }
      throw error;
    }
  })());
});
