const CACHE_NAME = 'verso-prosa-biblioteca-v2-immersiva';
const APP_FILES = [
  './', './index.html', './style.css?v=2.0.0', './app.js', './manifest.json',
  './assets/brand/verso-emblema.svg', './assets/brand/verso-prosa-logo.svg',
  './assets/logo-livro-pena.png',
  './assets/icons/icon-192.png', './assets/icons/icon-512.png',
  './assets/icons/icon-192-maskable.png', './assets/icons/icon-512-maskable.png',
  './assets/icons/apple-touch-icon.png'
];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_FILES)));
  self.skipWaiting();
});
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key.startsWith('verso-prosa-') && key !== CACHE_NAME).map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});
self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  const shell = request.mode === 'navigate' || /\/(index\.html|app\.js|style\.css|manifest\.json|sw\.js)$/.test(url.pathname);
  if (shell) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      try {
        const fresh = await fetch(new Request(request, { cache: 'no-store' }));
        if (fresh && fresh.ok) await cache.put(request, fresh.clone());
        return fresh;
      } catch (error) {
        const cached = await cache.match(request) || await cache.match('./index.html');
        if (cached) return cached;
        throw error;
      }
    })());
    return;
  }
  event.respondWith((async () => {
    const cached = await caches.match(request);
    if (cached) return cached;
    const fresh = await fetch(request);
    if (fresh && fresh.ok) await (await caches.open(CACHE_NAME)).put(request, fresh.clone());
    return fresh;
  })());
});
