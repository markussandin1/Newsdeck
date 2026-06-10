/* Newsdeck Service Worker — notiser (lokala + Web Push). */

self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

// Web Push (Fas 4c) — payload: { title, body, tag, url }
self.addEventListener('push', (event) => {
  let data = {}
  try {
    data = event.data ? event.data.json() : {}
  } catch {
    data = { title: 'Newsdeck', body: event.data ? event.data.text() : '' }
  }
  event.waitUntil(
    self.registration.showNotification(data.title || 'Newsdeck', {
      body: data.body || '',
      icon: '/newsdeck-icon.svg',
      badge: '/newsdeck-icon.svg',
      tag: data.tag || 'newsdeck-push',
      data: { url: data.url || '/' },
    })
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = (event.notification.data && event.notification.data.url) || '/'
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      // Föredra en flik som redan visar målet, sedan en synlig flik —
      // annars fokuseras en godtycklig bakgrundsflik vid flera öppna fönster.
      const focusable = clients.filter((c) => 'focus' in c)
      const existing =
        focusable.find((c) => c.url && new URL(c.url).pathname === url) ||
        focusable.find((c) => c.visibilityState === 'visible') ||
        focusable[0]
      if (existing) {
        if (new URL(existing.url).pathname !== url) {
          existing.navigate(url).catch(() => {})
        }
        return existing.focus()
      }
      return self.clients.openWindow(url)
    })
  )
})
