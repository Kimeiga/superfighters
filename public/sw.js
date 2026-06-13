const CACHE_NAME = 'superfighters-v1';
const SCOPE_URL = self.registration.scope;
const CORE_ASSETS = [
  '',
  'index.html',
  'manifest.webmanifest',
  'assets/empress.png',
  'assets/handgun.png',
  'assets/girl.png',
  'assets/fonts/fusion-pixel-12px-monospaced-latin.woff',
  'icons/icon.svg',
].map((assetPath) => new URL(assetPath, SCOPE_URL).toString());

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(CORE_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => (
      cached || fetch(event.request).then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        return response;
      })
    ))
  );
});
