// BuildPlaner Service-Worker: macht die App offline nutzbar (PWA).
// Strategie: App-Shell precachen; Navigationen network-first (frisch, wenn online;
// sonst gecachte index.html); eigene Assets stale-while-revalidate. Fremd-Hosts
// (z.B. Skill-Icons von db.irowiki.org) werden nicht abgefangen.

const CACHE = 'buildplaner-v1'
const SCOPE = self.registration.scope
const SHELL = [SCOPE, SCOPE + 'index.html']

self.addEventListener('install', (e) => {
  self.skipWaiting()
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL).catch(() => {})))
})

self.addEventListener('activate', (e) => {
  e.waitUntil(
    (async () => {
      const keys = await caches.keys()
      await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
      await self.clients.claim()
    })(),
  )
})

self.addEventListener('fetch', (e) => {
  const req = e.request
  if (req.method !== 'GET') return
  const url = new URL(req.url)
  if (url.origin !== self.location.origin) return // Fremd-Hosts normal durchlassen

  if (req.mode === 'navigate') {
    e.respondWith(
      (async () => {
        try {
          const net = await fetch(req)
          const c = await caches.open(CACHE)
          c.put(req, net.clone())
          return net
        } catch {
          return (
            (await caches.match(req)) ||
            (await caches.match(SCOPE + 'index.html')) ||
            (await caches.match(SCOPE)) ||
            Response.error()
          )
        }
      })(),
    )
    return
  }

  e.respondWith(
    (async () => {
      const cached = await caches.match(req)
      const fetching = fetch(req)
        .then((res) => {
          if (res && res.ok) {
            caches.open(CACHE).then((c) => c.put(req, res.clone()))
          }
          return res
        })
        .catch(() => null)
      return cached || (await fetching) || Response.error()
    })(),
  )
})
