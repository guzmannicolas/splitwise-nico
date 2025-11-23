/* Service Worker for Push Notifications */

self.addEventListener('push', function (event) {
  try {
    const data = event.data ? event.data.json() : {}
    const title = data.title || 'Nueva notificación'
    const options = {
      body: data.body || '',
      icon: data.icon || '/favicon.ico',
      badge: data.badge || '/favicon.ico',
      data: {
        url: data.url || '/',
        ...data
      }
    }
    event.waitUntil(self.registration.showNotification(title, options))
  } catch (err) {
    console.error('SW push handler error', err)
  }
})

self.addEventListener('notificationclick', function (event) {
  event.notification.close()
  const url = event.notification.data && event.notification.data.url ? event.notification.data.url : '/'
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      for (const client of clientList) {
        if ('focus' in client) {
          // If the app is already open, focus it.
          return client.focus()
        }
      }
      // Otherwise, open a new window/tab
      if (clients.openWindow) {
        return clients.openWindow(url)
      }
    })
  )
})

self.addEventListener('install', function (event) {
  self.skipWaiting()
})

self.addEventListener('activate', function (event) {
  self.clients.claim()
})
