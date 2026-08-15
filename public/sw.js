self.addEventListener('push', event => {
  let data = {}
  try { data = event.data ? event.data.json() : {} } catch { data = { title: 'Mijn OG', body: event.data?.text() || '' } }
  const title = data.title || 'Mijn OG'
  const options = {
    body: data.body || 'Er is een nieuwe melding.',
    icon: '/og-logo.png',
    badge: '/og-logo.png',
    data: { url: data.url || '/' },
    tag: data.tag || undefined,
    renotify: Boolean(data.tag)
  }
  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', event => {
  event.notification.close()
  const target = new URL(event.notification.data?.url || '/', self.location.origin).href
  event.waitUntil((async () => {
    const clientsList = await clients.matchAll({ type: 'window', includeUncontrolled: true })
    for (const client of clientsList) {
      if ('focus' in client) {
        if ('navigate' in client) await client.navigate(target)
        return client.focus()
      }
    }
    if (clients.openWindow) return clients.openWindow(target)
  })())
})
