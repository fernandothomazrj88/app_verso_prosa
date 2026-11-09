const CACHE_NAME = 'verso-prosa-app-v4';
const APP_FILES = ['./','./index.html','./style.css','./app.js','./manifest.json','./assets/logo-livro-pena.png','./assets/icons/icon-192.png','./assets/icons/icon-512.png','./assets/icons/icon-192-maskable.png','./assets/icons/icon-512-maskable.png','./assets/icons/apple-touch-icon.png'];
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE_NAME).then(cache=>cache.addAll(APP_FILES)));self.skipWaiting();});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('verso-prosa-')&&k!==CACHE_NAME).map(k=>caches.delete(k)))));self.clients.claim();});
self.addEventListener('fetch',event=>{
 const req=event.request;if(req.method!=='GET'||new URL(req.url).origin!==self.location.origin)return;
 event.respondWith((async()=>{const cached=await caches.match(req);if(cached)return cached;try{const res=await fetch(req);if(res.ok){const cache=await caches.open(CACHE_NAME);cache.put(req,res.clone());}return res;}catch(err){if(req.mode==='navigate')return caches.match('./index.html');throw err;}})());
});