/* Himmel — service worker */
const CACHE = 'himmel-v9';
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
