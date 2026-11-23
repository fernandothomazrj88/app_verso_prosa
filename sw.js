const CACHE_NAME = 'verso-prosa-home-v67';
const APP_FILES = [
  './',
  './index.html',
  './assets/profiles/lele-epoca.webp',
  './assets/profiles/fernando-epoca.webp',
  './assets/profiles/home-card-fernando-approved.png',
  './assets/profiles/home-card-leticia-approved.png',
  './manifest.json',
  './assets/brand/verso-emblema.svg',
  './assets/brand/verso-prosa-logo.svg',
  './assets/brand/verso-prosa-home-logo.png',
  './assets/brand/verso-prosa-home-emblem.png',
  './assets/login-emblem-approved-v6.png',
  './assets/icons/home-classic/3d-book-open.png',
  './assets/icons/home-classic/3d-book-add.png',
  './assets/icons/home-classic/3d-quill.png',
  './assets/icons/home-classic/3d-calendar.png',
  './assets/icons/home-classic/3d-home-arch.png',
  './assets/icons/home-classic/3d-bookshelf.png',
  './assets/icons/home-classic/3d-magnifier.png',
  './assets/icons/home-classic/3d-plus-medallion.png',
  './assets/icons/home-classic/3d-sliders.png',
  './assets/icons/home-classic/3d-profile.png',
  './assets/logo-livro-pena.png',
  './assets/logo-livro-pena-trim.png',
  './assets/ornaments/home-divider-ornate.svg',
  './assets/ornaments/home-parchment-real.webp',
  './assets/ornaments/home-header-sconce.svg',
  './assets/scenes/home-header-library.webp',
  './assets/ornaments/home-cover-placeholder.svg',
  './assets/ornaments/login-brand-divider.svg',
  './assets/ornaments/login-frame-classic.svg',
  './assets/icons/home-classic/book-open.svg',
  './assets/icons/home-classic/book-add.svg',
  './assets/icons/home-classic/quill.svg',
  './assets/icons/home-classic/calendar.svg',
  './assets/icons/home-classic/library-home.svg',
  './assets/icons/home-classic/magnifier.svg',
  './assets/icons/home-classic/sliders.svg',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png',
  './assets/icons/icon-192-maskable.png',
  './assets/icons/icon-512-maskable.png',
  './assets/icons/apple-touch-icon.png',
  './assets/scenes/login-approved-master.png',
  './assets/scenes/login-library-bg-v8.webp',
  './assets/scenes/entrance-room.webp',
  './assets/scenes/lamp-books.webp',
  './assets/scenes/typewriter-desk.webp',
  './assets/scenes/open-book.webp',
  './assets/scenes/discover-authors.webp',
  './assets/scenes/lamp-stack.webp',
  './assets/scenes/welcome-approved.webp',
  './assets/scenes/welcome-desktop-approved.webp',
  './assets/scenes/welcome-mobile-responsive-v27.webp',
  './assets/scenes/login-library-bg.webp',
  './assets/scenes/login-library-bg-v5.webp',
  './assets/login-emblem-gold-v5.png',
  './assets/scenes/login-bottom-approved-v6.webp',
  './style.css?v=home-v67',
  './modules/estante/estante.css?v=58',
  './modules/adicionar-livro/adicionar-livro.css?v=60',
  './app.js?v=modular-v60',
  './modules/module-loader.js?v=modular-v60',
  './modules/registry.json',
  './modules/home/index.html',
  './modules/estante/index.html',
  './modules/adicionar-livro/index.html',
  './modules/anotacoes/index.html',
  './modules/descobrir/index.html',
  './modules/atelie/index.html',
  './modules/planejamento/index.html',
  './modules/mais/index.html',
  './modules/detalhes-livro/index.html'
];

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(APP_FILES);
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys
      .filter(key => key.startsWith('verso-prosa-') && key !== CACHE_NAME)
      .map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  const isShell = request.mode === 'navigate' ||
    /\/(index\.html|app\.js|style\.css|manifest\.json|sw\.js|module-loader\.js|registry\.json)$/.test(url.pathname);

  if (isShell) {
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
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(request);
    if (cached) return cached;
    const fresh = await fetch(request);
    if (fresh && fresh.ok) await cache.put(request, fresh.clone());
    return fresh;
  })());
});
