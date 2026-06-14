const CACHE_NAME = 'superfighters-v2';
const SCOPE_URL = self.registration.scope;
const SCOPE_ORIGIN = new URL(SCOPE_URL).origin;
const INDEX_URL = new URL('index.html', SCOPE_URL).toString();
const CORE_ASSETS = [
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

  const url = new URL(event.request.url);
  if (!['http:', 'https:'].includes(url.protocol)) {
    return;
  }
  if (url.origin !== SCOPE_ORIGIN || !url.href.startsWith(SCOPE_URL)) {
    return;
  }

  if (event.request.mode === 'navigate' || event.request.destination === 'document') {
    event.respondWith(networkFirst(event.request, INDEX_URL));
    return;
  }

  event.respondWith(networkFirst(event.request));
});

async function networkFirst(request, fallbackUrl = request.url) {
  try {
    const response = await fetch(request);
    if (!isUsableResponse(request, response)) {
      throw new Error(`Unexpected response for ${request.url}`);
    }
    const cache = await caches.open(CACHE_NAME);
    await cache.put(request, response.clone());
    return response;
  } catch (_error) {
    const cached = await caches.match(request);
    if (cached) {
      return cached;
    }
    if (fallbackUrl !== request.url) {
      const fallback = await caches.match(fallbackUrl);
      if (fallback) {
        return fallback;
      }
    }
    return Response.error();
  }
}

function isUsableResponse(request, response) {
  if (!response || !response.ok) {
    return false;
  }

  const contentType = response.headers.get('content-type') || '';
  if (request.destination === 'script') {
    return /javascript|ecmascript|wasm/i.test(contentType);
  }
  if (request.destination === 'style') {
    return /css/i.test(contentType);
  }
  if (request.destination === 'document') {
    return /html/i.test(contentType);
  }
  return true;
}
