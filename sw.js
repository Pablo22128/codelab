importScripts('sw-manifest.js');
const CACHE = 'codelab-' + self.__VERSION;

self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    const c = await caches.open(CACHE), files = self.__FILES;
    for (let i = 0; i < files.length; i += 20) await Promise.all(files.slice(i, i + 20).map((f) => c.add(f).catch(() => {})));
    self.skipWaiting();
  })());
});
self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k.startsWith('codelab-') && k !== CACHE) await caches.delete(k);
    await self.clients.claim();
  })());
});
// Caché primero (rápido y offline); si falta, red y se guarda.
self.addEventListener('fetch', (e) => {
  const r = e.request, u = new URL(r.url);
  if (r.method !== 'GET' || u.origin !== location.origin) return;
  e.respondWith((async () => {
    const hit = await caches.match(r, { ignoreSearch: true });
    if (hit) return hit;
    try {
      const res = await fetch(r);
      if (res.ok) (await caches.open(CACHE)).put(r, res.clone());
      return res;
    } catch { return (await caches.match('./')) || Response.error(); }
  })());
});
