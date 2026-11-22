// Walker Crew Hours service worker — lets the app open with no signal.
// Bump VERSION whenever index.html changes so installed phones pick up the update.
const VERSION = 'crew-hours-v1.1.0';
const CORE = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png'
];
// Libraries used for QR posters / scanning — cached when reachable, never required to open the app.
const EXTRA = [
  'https://cdnjs.cloudflare.com/ajax/libs/qrcode-generator/1.4.4/qrcode.min.js',
  'https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.min.js'
];

self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const c = await caches.open(VERSION);
    await c.addAll(CORE);
    await Promise.all(EXTRA.map(u => fetch(u, { mode: 'no-cors' }).then(r => c.put(u, r)).catch(() => {})));
    self.skipWaiting();
  })());
});

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k !== VERSION) await caches.delete(k);
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // Never cache Firebase / Google sign-in traffic.
  if (/firestore|googleapis|firebase|gstatic\.com\/firebasejs|accounts\.google/.test(url.href)) return;

  // App page (including ?job=… QR links): try network first so updates land, fall back to the cached app.
  if (req.mode === 'navigate') {
    e.respondWith((async () => {
      try {
        const res = await fetch(req);
        if (res.ok) { const c = await caches.open(VERSION); c.put('./index.html', res.clone()); }
        return res;
      } catch (_) {
        return (await caches.match('./index.html')) || (await caches.match('./')) || Response.error();
      }
    })());
    return;
  }

  // Everything else: cache first, then network (and remember it).
  e.respondWith((async () => {
    const hit = await caches.match(req, { ignoreSearch: url.origin === location.origin });
    if (hit) return hit;
    try {
      const res = await fetch(req);
      if (res && (res.ok || res.type === 'opaque')) { const c = await caches.open(VERSION); c.put(req, res.clone()); }
      return res;
    } catch (_) { return Response.error(); }
  })());
});
