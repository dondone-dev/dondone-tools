const CACHE = 'model-cache-v1'

// Cache model downloads from PaddleOCR's CDN (cache-first strategy)
const MODEL_HOSTS = ['paddle-model-ecology.bj.bcebos.com']

self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()))

self.addEventListener('fetch', (event) => {
  if (!MODEL_HOSTS.includes(new URL(event.request.url).hostname)) return

  event.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const cached = await cache.match(event.request)
      if (cached) return cached
      const response = await fetch(event.request)
      if (response.ok) cache.put(event.request, response.clone())
      return response
    }),
  )
})
