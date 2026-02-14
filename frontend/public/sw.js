// Service Worker para PWA con Push Notifications
// Version: 1.0.0

const CACHE_NAME = 'splitwise-nico-v1';
const urlsToCache = [
  '/',
  '/dashboard',
  '/icon-192x192.png',
  '/icon-512x512.png',
];

// Install event - cachea assets principales
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Caching app shell');
      return cache.addAll(urlsToCache);
    })
  );
  // Activa el SW inmediatamente
  self.skipWaiting();
});

// Activate event - limpia caches viejos
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  // Toma control de todas las páginas inmediatamente
  return self.clients.claim();
});

// Fetch event - estrategia Network First con fallback a cache
self.addEventListener('fetch', (event) => {
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Clona la respuesta para guardarla en cache
        const responseToCache = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });
        return response;
      })
      .catch(() => {
        // Si falla el network, usa cache
        return caches.match(event.request);
      })
  );
});

// Push event - recibe notificaciones push
self.addEventListener('push', (event) => {
  console.log('[SW] Push notification received', event);

  let notificationData = {
    title: 'Splitwise Nico',
    body: 'Tienes una nueva notificación',
    icon: '/icon-192x192.png',
    badge: '/icon-192x192.png',
    tag: 'default',
    data: {},
  };

  if (event.data) {
    try {
      notificationData = event.data.json();
    } catch (e) {
      console.error('[SW] Error parsing notification data:', e);
    }
  }

  const promiseChain = self.registration.showNotification(
    notificationData.title,
    {
      body: notificationData.body,
      icon: notificationData.icon,
      badge: notificationData.badge,
      tag: notificationData.tag,
      data: notificationData.data,
      requireInteraction: false,
      vibrate: [200, 100, 200],
    }
  );

  event.waitUntil(promiseChain);
});

// Notification click event - abre la app al hacer click
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event);
  event.notification.close();

  // Determina la URL a abrir según los datos de la notificación
  let urlToOpen = '/dashboard';
  
  if (event.notification.data) {
    const { groupId, expenseId, type } = event.notification.data;
    
    if (type === 'new_expense' && groupId) {
      urlToOpen = `/grupo/${groupId}`;
    } else if (type === 'settlement' && groupId) {
      urlToOpen = `/grupo/${groupId}?tab=liquidaciones`;
    } else if (type === 'invitation' && groupId) {
      urlToOpen = `/grupo/${groupId}`;
    }
  }

  // Abre o enfoca la ventana de la app
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Si ya hay una ventana abierta, enfócala
      for (const client of clientList) {
        if (client.url.includes(urlToOpen) && 'focus' in client) {
          return client.focus();
        }
      }
      // Si no, abre una nueva ventana
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

// Push subscription change event
self.addEventListener('pushsubscriptionchange', (event) => {
  console.log('[SW] Push subscription changed');
  
  event.waitUntil(
    self.registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(
        // Esta key debe coincidir con NEXT_PUBLIC_VAPID_PUBLIC_KEY
        'BNF1jHh1KzT_vq9uCheeFTY1jEpMML5YkeQTOZoeWzEBqgj0_07-lQaLqFO4CafPFNQrgvjMgaU1sfv0KbQ5eik'
      )
    })
    .then((subscription) => {
      console.log('[SW] Resubscribed:', subscription);
      // Aquí podrías enviar la nueva suscripción al servidor
    })
  );
});

// Helper: Convierte VAPID key de base64 a Uint8Array
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
