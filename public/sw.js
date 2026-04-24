const CACHE_NAME = 'jos-v1'
const STATIC_ASSETS = [
  '/',
  '/index.html',
]

// Install — cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  )
  self.skipWaiting()
})

// Activate — clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  )
  self.clients.claim()
})

// Fetch — network first, cache fallback. Skip API calls.
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)

  // Never cache Supabase, Anthropic, or Stripe calls
  if (
    url.hostname.includes('supabase') ||
    url.hostname.includes('anthropic') ||
    url.hostname.includes('stripe')
  ) {
    return
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const clone = response.clone()
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone))
        return response
      })
      .catch(() => caches.match(event.request))
  )
})