// Service Worker for PWA with Push Notifications
// Version: 1.0.3

const CACHE_NAME = 'splitwise-nico-v5';
const urlsToCache = [
  '/',
  '/dashboard',
  '/icon-192x192.png',
  '/icon-512x512.png',
];

// Install event - caches main assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker version 1.0.3...');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Caching app shell');
      return cache.addAll(urlsToCache);
    }).then(() => {
      console.log('[SW] Installation complete');
    })
  );
  // Activate SW immediately
  self.skipWaiting();
});

// Activate event - clears old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker version 1.0.3...');
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
    }).then(() => {
      console.log('[SW] Claiming clients...');
      return self.clients.claim();
    }).then(() => {
      console.log('[SW] Activation complete, clients claimed');
    })
  );
});

// Fetch event - Network First strategy with cache fallback
self.addEventListener('fetch', (event) => {
  // Only cache GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Clone the response to save in cache
        const responseToCache = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });
        return response;
      })
      .catch(() => {
        // If network fails, use cache
        return caches.match(event.request);
      })
  );
});

// Push event - receives push notifications
self.addEventListener('push', (event) => {
  console.log('[SW] Push notification received', event);

  let notificationData = {
    title: 'Splitwise Nico',
    body: 'You have a new notification',
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

// Notification click event - opens the app on click
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event);
  event.notification.close();

  // Determine the URL to open based on notification data
  let urlToOpen = '/dashboard';

  if (event.notification.data) {
    const { groupId, expenseId, type } = event.notification.data;

    if (type === 'new_expense' && groupId) {
      urlToOpen = `/groups/${groupId}`;
    } else if (type === 'settlement' && groupId) {
      urlToOpen = `/groups/${groupId}?tab=liquidaciones`;
    } else if (type === 'invitation' && groupId) {
      urlToOpen = `/groups/${groupId}`;
    }
  }

  // Open or focus the app window
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // If a window is already open, focus it
      for (const client of clientList) {
        if (client.url.includes(urlToOpen) && 'focus' in client) {
          return client.focus();
        }
      }
      // Otherwise, open a new window
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
        // This key must match NEXT_PUBLIC_VAPID_PUBLIC_KEY
        'BFAOGI2-BotCYSh5RExX5zprIYbyaA8JPCZfpWmUxU_NPDMKsQASqkpSRS8WT6CwWD7McwRmQurd8U1Esgt-uM0'
      )
    })
    .then((subscription) => {
      console.log('[SW] Resubscribed:', subscription);
      // Here you could send the new subscription to the server
    })
  );
});

// Helper: Converts VAPID key from base64 to Uint8Array
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
