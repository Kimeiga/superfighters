const CACHE_PREFIX = 'superfighters-';

self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    retireServiceWorker()
  );
});

async function retireServiceWorker() {
  const keys = await caches.keys();
  await Promise.all(keys.filter((key) => key.startsWith(CACHE_PREFIX)).map((key) => caches.delete(key)));
  await self.clients.claim();
  await self.registration.unregister();
}
