/* Himmel — service worker */
const CACHE = 'himmel-v26';
const WX_ICONS = ['clear-day','partly-cloudy-day','overcast-day','fog','fog-day',
  'drizzle','partly-cloudy-day-drizzle','rain','partly-cloudy-day-rain',
  'sleet','partly-cloudy-day-sleet','snow','partly-cloudy-day-snow',
  'thunderstorms','thunderstorms-day','thunderstorms-day-rain','thunderstorms-rain'
  ].map(n => `./vendor/icons/${n}.svg`);
const SHELL = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './vendor/leaflet.js',
  './vendor/leaflet.css',
  './manifest.webmanifest',
  './icon.svg',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-512.png',
  './apple-touch-icon.png',
  ...WX_ICONS
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Files whose content defines "a new version". The page pings us on open; we
// compare the live copies against the cache and, if any changed, refresh the
// whole shell and tell the page to reload — so a plain app.js/index.html/CSS
// deploy to main rolls out without ever bumping CACHE by hand.
const CRITICAL = ['./index.html', './app.js', './styles.css'];

async function checkForUpdate(){
  const cache = await caches.open(CACHE);
  let changed = false;
  for (const url of CRITICAL) {
    try {
      const net = await fetch(url, { cache: 'reload' }); // force network, skip HTTP cache
      if (!net || net.status !== 200) continue;
      const cached = await cache.match(url);
      const [fresh, old] = await Promise.all([
        net.clone().text(),
        cached ? cached.text() : Promise.resolve(null)
      ]);
      if (old === null || fresh !== old) changed = true;
      await cache.put(url, net.clone()); // keep the cache current either way
    } catch { /* offline → treat as unchanged */ }
  }
  if (!changed) return;
  // Something changed → also refresh the rest of the shell so the reload is consistent.
  await Promise.all(SHELL.filter(u => !CRITICAL.includes(u)).map(async u => {
    try { const r = await fetch(u, { cache: 'reload' }); if (r && r.status === 200) await cache.put(u, r.clone()); }
    catch { /* ignore */ }
  }));
  const clients = await self.clients.matchAll();
  clients.forEach(c => c.postMessage({ type: 'himmel-updated' }));
}

self.addEventListener('message', e => {
  if (e.data && e.data.type === 'himmel-check-update') e.waitUntil(checkForUpdate());
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Live data (weather, alerts, geocode, fonts files) → always network.
  const liveHosts = ['api.open-meteo.com', 'api.brightsky.dev', 'api.bigdatacloud.net'];
  if (liveHosts.includes(url.hostname)) return; // browser handles it

  // Same-origin shell → cache-first, refresh in background.
  if (url.origin === self.location.origin) {
    e.respondWith(
      caches.match(req).then(hit => {
        const net = fetch(req).then(res => {
          if (res && res.status === 200) {
            const copy = res.clone();
            caches.open(CACHE).then(c => c.put(req, copy));
          }
          return res;
        }).catch(() => hit);
        return hit || net;
      })
    );
    return;
  }

  // Google Fonts (CSS + woff2) → cache-first, fall back to network.
  if (url.hostname.endsWith('gstatic.com') || url.hostname.endsWith('googleapis.com')) {
    e.respondWith(
      caches.match(req).then(hit => hit || fetch(req).then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(req, copy));
        return res;
      }).catch(() => hit))
    );
  }
});
